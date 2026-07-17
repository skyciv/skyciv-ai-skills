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
// Deflection Utilization entries are excluded: this app doesn't compute each member's
// actual deflection under load (that needs a further S3D.results.fetchMemberResult call
// per member), so `ad_LL`/`ad_LT` are sent as fixed placeholder values - identical for
// every member and every section size. Including them let a meaningless constant (it
// happened to be the largest number for every candidate) silently dominate the
// governing ratio and made every section size look equally (in)efficient. This means
// this app checks NDS *strength* (bending/shear/tension/compression/combined), not
// deflection serviceability - a real limitation, documented in the assumptions panel.
function extractGoverningUtilization(qdResultsObj) {
  if (!qdResultsObj || typeof qdResultsObj !== 'object') return { ratio: null, label: null };
  let governing = null;
  for (const entry of Object.values(qdResultsObj)) {
    if (!entry || entry.units !== 'utility' || typeof entry.value !== 'number') continue;
    if (/deflection/i.test(entry.label || '')) continue;
    if (!governing || entry.value > governing.value) governing = entry;
  }
  return governing ? { ratio: governing.value, label: governing.label || null } : { ratio: null, label: null };
}

// Checks EVERY member (no pre-screening) - the user wants proof every member was
// actually checked, and a small truss (typically 15-30 members) makes this cheap enough
// to do directly in one Quick Design batch call.
async function findAllMemberDesigns({ solveFunctionResult, comboIds, s3dModel, layout }) {
  const memberIds = Object.keys(s3dModel.members);
  const { b, d } = layout.section;

  const envelopes = memberIds.map((memberId) => ({
    memberId,
    ...envelopeMemberForces(solveFunctionResult, comboIds, memberId),
    meta: layout.memberMeta[memberId],
  }));

  const demands = envelopes.map((e) => ({
    b, d,
    L: Math.max(e.meta.lengthFt, 0.5),
    Nc: e.peak.N < 0 ? Math.abs(e.peak.N) : 0,
    Nt: e.peak.N > 0 ? e.peak.N : 0,
    Mz: Math.abs(e.peak.Mz),
    Vz: Math.abs(e.peak.Vz),
  }));

  const qdResults = await runBatch(demands);

  const ranked = envelopes.map((e, i) => {
    const qd = qdResults[i]?.data ?? qdResults[i];
    const { ratio, label } = extractGoverningUtilization(qd?.results);
    const check = ratio == null ? null : (ratio <= 1.0 ? 'PASS' : 'FAIL');
    const comboId = e.governingCombo.Mz ?? e.governingCombo.N ?? comboIds[0];
    return {
      memberId: e.memberId,
      role: e.meta.role,
      lengthFt: e.meta.lengthFt,
      comboId,
      comboName: layout.comboNames[comboId] || `Combo ${comboId}`,
      demand: demands[i],
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
  extractPeakForces,
  envelopeMemberForces,
  extractGoverningUtilization,
};
