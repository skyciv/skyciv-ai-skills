'use strict';

const { runBatch, buildOpenLink } = require('./quickDesignClient');

// `result_filter: ['member_forces']` on S3D.model.solve returns, per load combo:
//   data[comboId].member_forces[forceType][memberId][stationPercent] = value
// e.g. data["1"].member_forces.axial_force["7"]["50.0"] = 0.31
// forceType is one of: axial_force, shear_force_y, shear_force_z,
// bending_moment_y, bending_moment_z, torsion.
const FORCE_TYPE_KEYS = {
  N: 'axial_force',
  Vy: 'shear_force_y',
  Vz: 'shear_force_z',
  My: 'bending_moment_y',
  Mz: 'bending_moment_z',
  Mx: 'torsion',
};

function peakSigned(stationValues) {
  let peak = 0;
  if (!stationValues || typeof stationValues !== 'object') return peak;
  for (const v of Object.values(stationValues)) {
    if (typeof v === 'number' && Math.abs(v) > Math.abs(peak)) peak = v;
  }
  return peak;
}

function extractPeakForces(memberForces, memberId) {
  const peak = { N: 0, Vy: 0, Vz: 0, My: 0, Mz: 0, Mx: 0 };
  for (const [key, forceType] of Object.entries(FORCE_TYPE_KEYS)) {
    peak[key] = peakSigned(memberForces?.[forceType]?.[memberId] ?? memberForces?.[forceType]?.[String(memberId)]);
  }
  return peak;
}

function getComboData(solveFunctionResult, comboId) {
  const data = solveFunctionResult?.data ?? solveFunctionResult;
  return data?.[comboId] ?? data?.[String(comboId)] ?? {};
}

// Envelopes each force component independently across all combos (the worst-case value
// per component, not necessarily all from the same combo) - a standard simplification for
// a quick per-member check. `governingCombo` records which combo produced each component's
// peak, so the UI can show *a* representative governing combo per member.
function envelopeMemberForces(solveFunctionResult, comboIds, memberId) {
  const peak = { N: 0, Vy: 0, Vz: 0, My: 0, Mz: 0, Mx: 0 };
  const governingCombo = { N: null, Vy: null, Vz: null, My: null, Mz: null, Mx: null };
  for (const comboId of comboIds) {
    const memberForces = getComboData(solveFunctionResult, comboId).member_forces || {};
    const f = extractPeakForces(memberForces, memberId);
    for (const key of Object.keys(peak)) {
      if (Math.abs(f[key]) > Math.abs(peak[key])) {
        peak[key] = f[key];
        governingCombo[key] = comboId;
      }
    }
  }
  return { peak, governingCombo };
}

// The NDS calculator response has no single fixed "Utilization Ratio" key guaranteed -
// take the governing (largest) entry tagged `units: "utility"` instead of guessing a key.
//
// Deflection Utilization entries are only included when `includeDeflection` is true -
// that's only the case for members this app fed *real* computed ad_LL/ad_LT (actual
// deflection under load, see computeTopChordDeflections below). For members still on
// the fixed placeholder values (0.1in/0.12in - identical regardless of that member's
// real length/load/section), including their Deflection Utilization would let a
// meaningless constant silently dominate the governing ratio.
function extractGoverningUtilization(qdResultsObj, includeDeflection) {
  if (!qdResultsObj || typeof qdResultsObj !== 'object') return { ratio: null, label: null };
  let governing = null;
  for (const entry of Object.values(qdResultsObj)) {
    if (!entry || entry.units !== 'utility' || typeof entry.value !== 'number') continue;
    if (!includeDeflection && /deflection/i.test(entry.label || '')) continue;
    if (!governing || entry.value > governing.value) governing = entry;
  }
  return governing ? { ratio: governing.value, label: governing.label || null } : { ratio: null, label: null };
}

// `S3D.results.fetchMemberResult` with res_key:"displacement", type:"array" returns, per
// requested LC, an array of resultant deflection values at 5 stations (0/25/50/75/100%)
// along the member - already relative to the member's own chord (not global rigid-body
// displacement), confirmed against the live API. Takes the peak absolute value as the
// member's deflection under that load case.
function parseDeflection(fetchResult) {
  const stations = fetchResult?.data?.[0];
  if (!Array.isArray(stations)) return null;
  let peak = 0;
  for (const v of stations) {
    if (typeof v === 'number' && Math.abs(v) > peak) peak = Math.abs(v);
  }
  return peak;
}

// Builds { [memberId]: { adLL, adLT } } from the raw fetchMemberResult function results
// for the top-chord members - see index.js for why only the top chord (the only members
// actually carrying transverse load in this model) is fetched, and why 2 fetch calls per
// member (live-only combo, total-service combo) are appended to the main solve session
// rather than requested as their own session (each fetchMemberResult calls costs real
// server-side compute; batching avoids paying for an extra solve per call).
function buildDeflectionMap(topChordMemberIds, liveFetchResults, totalFetchResults) {
  const map = {};
  topChordMemberIds.forEach((memberId, i) => {
    const adLL = parseDeflection(liveFetchResults[i]);
    const adLT = parseDeflection(totalFetchResults[i]);
    if (adLL != null && adLT != null) map[memberId] = { adLL, adLT };
  });
  return map;
}

// Checks EVERY member (no pre-screening) - the user wants proof every member was
// actually checked, and a small truss (typically 15-30 members) makes this cheap enough
// to do directly in one Quick Design batch call.
async function findAllMemberDesigns({ solveFunctionResult, comboIds, s3dModel, layout, deflectionByMember }) {
  const memberIds = Object.keys(s3dModel.members);
  const { b, d } = layout.section;

  const envelopes = memberIds.map((memberId) => ({
    memberId,
    ...envelopeMemberForces(solveFunctionResult, comboIds, memberId),
    meta: layout.memberMeta[memberId],
  }));

  const demands = envelopes.map((e) => {
    const deflection = deflectionByMember?.[e.memberId];
    return {
      b, d,
      L: Math.max(e.meta.lengthFt, 0.5),
      Nc: e.peak.N < 0 ? Math.abs(e.peak.N) : 0,
      Nt: e.peak.N > 0 ? e.peak.N : 0,
      Mz: Math.abs(e.peak.Mz),
      Vz: Math.abs(e.peak.Vz),
      adLL: deflection?.adLL,
      adLT: deflection?.adLT,
      hasRealDeflection: Boolean(deflection),
    };
  });

  const qdResults = await runBatch(demands);

  const ranked = envelopes.map((e, i) => {
    const qd = qdResults[i]?.data ?? qdResults[i];
    const { ratio, label } = extractGoverningUtilization(qd?.results, demands[i].hasRealDeflection);
    const check = ratio == null ? null : (ratio <= 1.0 ? 'PASS' : 'FAIL');
    const comboId = e.governingCombo.Mz ?? e.governingCombo.N ?? comboIds[0];
    return {
      memberId: e.memberId,
      role: e.meta.role,
      lengthFt: e.meta.lengthFt,
      comboId,
      comboName: layout.comboNames[comboId] || `Combo ${comboId}`,
      demand: demands[i],
      hasRealDeflection: demands[i].hasRealDeflection,
      utilizationRatio: ratio,
      governingCheck: label,
      designCheck: check,
      report: qd?.report ?? null,
      openLink: buildOpenLink(demands[i]),
      quickDesignResults: qd?.results ?? null,
      quickDesignError: ratio == null ? (qdResults[i]?.msg || 'No result returned for this member') : null,
    };
  });

  ranked.sort((a, b2) => (b2.utilizationRatio ?? -1) - (a.utilizationRatio ?? -1));

  return {
    critical: ranked[0] || null,
    ranked,
    totalMembers: memberIds.length,
    comboIds,
  };
}

// Reactions have no per-station breakdown (a support is a single point). Confirmed
// against the live API: data[comboId].reactions is keyed by NODE ID first, each holding
// a flat { Fx, Fy, Fz, Mx, My, Mz } object - the opposite nesting from member_forces
// (which is keyed by force-type first). Every node has an entry here, not just the two
// real bearings, because every node also has a support entry for out-of-plane bracing.
function envelopeReactionsAtNode(solveFunctionResult, comboIds, nodeId) {
  const peak = {};
  const governingCombo = {};
  for (const comboId of comboIds) {
    const reactions = getComboData(solveFunctionResult, comboId).reactions || {};
    const atNode = reactions[nodeId] ?? reactions[String(nodeId)];
    if (!atNode || typeof atNode !== 'object') continue;
    for (const [reactionType, value] of Object.entries(atNode)) {
      if (typeof value !== 'number') continue;
      if (!(reactionType in peak) || Math.abs(value) > Math.abs(peak[reactionType])) {
        peak[reactionType] = value;
        governingCombo[reactionType] = comboId;
      }
    }
  }
  return { peak, governingCombo };
}

// Only reports the two real bearings (layout.supportRole 'pin'/'roller'), not the
// synthetic out-of-plane bracing restraints added at every other node.
function getReactionSummary({ solveFunctionResult, comboIds, s3dModel, layout }) {
  const rows = [];
  for (const [supportId, role] of Object.entries(layout.supportRole)) {
    if (role !== 'pin' && role !== 'roller') continue;
    const support = s3dModel.supports[supportId];
    const { peak, governingCombo } = envelopeReactionsAtNode(solveFunctionResult, comboIds, support.node);
    rows.push({
      supportId,
      role,
      nodeId: support.node,
      reactions: peak,
      governingCombo: governingCombo.Fy ?? governingCombo.Fx ?? Object.values(governingCombo)[0] ?? comboIds[0],
    });
  }
  return rows;
}

module.exports = {
  findAllMemberDesigns,
  getReactionSummary,
  buildDeflectionMap,
  extractPeakForces,
  envelopeMemberForces,
  extractGoverningUtilization,
};
