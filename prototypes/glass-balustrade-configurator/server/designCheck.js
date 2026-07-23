'use strict';

const { runBatch, buildOpenLink } = require('./quickDesignClient');

// `result_filter: ['member_forces']` on S3D.model.solve returns, per load combo:
//   data[comboId].member_forces[forceType][memberId][stationPercent] = value
// forceType is one of: axial_force, shear_force_y, shear_force_z,
// bending_moment_y, bending_moment_z, torsion. Model units are metric (kN/kN.m),
// matching the 2601-aluminium-design calculator's Nc/Nt (kN) and Mz/My (kNm) inputs
// directly - no unit conversion factor needed here (unlike an imperial model).
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

// Envelopes each force component independently across all strength combos (worst-case
// value per component, not necessarily all from the same combo) - a standard
// simplification for a quick per-member check. `governingCombo` records which combo
// produced each component's peak.
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

// The AS/NZS 1664 calculator response has no single fixed "Utilization Ratio" key
// guaranteed - take the governing (largest) entry tagged `units: "utility"` instead of
// guessing a key (same approach as this app's NDS-based sibling prototype).
function extractGoverningUtilization(qdResultsObj) {
  if (!qdResultsObj || typeof qdResultsObj !== 'object') return { ratio: null, label: null };
  let governing = null;
  for (const entry of Object.values(qdResultsObj)) {
    if (!entry || entry.units !== 'utility' || typeof entry.value !== 'number') continue;
    if (!governing || entry.value > governing.value) governing = entry;
  }
  return governing ? { ratio: governing.value, label: governing.label || null } : { ratio: null, label: null };
}

// Checks EVERY post (no pre-screening) - the user wants proof every post was actually
// checked, and a typical balustrade run (a handful of posts) makes this cheap enough to
// do directly in one Quick Design batch call. The handrail itself is not checked - only
// the posts, per the request.
async function findAllPostDesigns({ solveFunctionResult, comboIds, layout }) {
  const { postMemberIds, postSection, handrailHeightM } = layout;
  const LbMm = handrailHeightM * 1000;
  // AS 1664 effective-length factor for a fixed-base, free-top cantilever post
  // (plan assumption #5) - applied about both the major (z) and minor (y) axes.
  const CANTILEVER_K = 2.0;

  const envelopes = postMemberIds.map((memberId, i) => ({
    memberId,
    postIndex: i,
    ...envelopeMemberForces(solveFunctionResult, comboIds, memberId),
  }));

  const demands = envelopes.map((e) => ({
    label: `Post ${e.postIndex + 1}`,
    postIndex: e.postIndex,
    shape: postSection.shape,
    D: postSection.D,
    B: postSection.B,
    t_f: postSection.t,
    t_w: postSection.t,
    Lb: LbMm,
    Lz: LbMm,
    Ly: LbMm,
    kz: CANTILEVER_K,
    ky: CANTILEVER_K,
    Mz: Math.abs(e.peak.Mz),
    My: Math.abs(e.peak.My),
    Vy: Math.abs(e.peak.Vy),
    Vz: Math.abs(e.peak.Vz),
    Nc: e.peak.N < 0 ? Math.abs(e.peak.N) : 0,
    Nt: e.peak.N > 0 ? e.peak.N : 0,
  }));

  const qdResults = await runBatch(demands);

  const ranked = envelopes.map((e, i) => {
    const qd = qdResults[i]?.data ?? qdResults[i];
    const { ratio, label } = extractGoverningUtilization(qd?.results);
    const check = ratio == null ? null : (ratio <= 1.0 ? 'PASS' : 'FAIL');
    const comboId = e.governingCombo.Mz ?? e.governingCombo.N ?? comboIds[0];
    return {
      postIndex: e.postIndex,
      memberId: e.memberId,
      section: postSection.name,
      comboId,
      comboName: layout.comboNames[comboId] || `Combo ${comboId}`,
      demand: demands[i],
      utilizationRatio: ratio,
      governingCheck: label,
      designCheck: check,
      report: qd?.report ?? null,
      openLink: buildOpenLink(demands[i]),
      quickDesignResults: qd?.results ?? null,
      quickDesignError: ratio == null ? (qdResults[i]?.msg || 'No result returned for this post') : null,
    };
  });

  ranked.sort((a, b) => (b.utilizationRatio ?? -1) - (a.utilizationRatio ?? -1));

  return {
    critical: ranked[0] || null,
    ranked,
    totalPosts: postMemberIds.length,
    comboIds,
  };
}

// Reactions have no per-station breakdown (a support is a single point).
// data[comboId].reactions is keyed by NODE ID first, each holding a flat
// { Fx, Fy, Fz, Mx, My, Mz } object - the opposite nesting from member_forces.
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

// Every post base is a real fixed support in this model (no synthetic bracing supports
// to filter, unlike the truss prototype) - reports all of them.
function getReactionSummary({ solveFunctionResult, comboIds, layout }) {
  const { baseNodeId } = layout;
  return baseNodeId.map((nodeId, i) => {
    const { peak, governingCombo } = envelopeReactionsAtNode(solveFunctionResult, comboIds, nodeId);
    return {
      postIndex: i,
      nodeId,
      reactions: peak,
      governingCombo: governingCombo.Fz ?? governingCombo.Mz ?? Object.values(governingCombo)[0] ?? comboIds[0],
    };
  });
}

module.exports = {
  findAllPostDesigns,
  getReactionSummary,
  extractPeakForces,
  envelopeMemberForces,
  extractGoverningUtilization,
};
