'use strict';

const { POST_TYPES, HANDRAIL_SECTION, FE_MATERIAL, findSection } = require('./sectionCatalogue');

// AS/NZS 1170.0 strength load combinations, hand-derived in the same style as
// load-combinations/assets/as-nzs-1170-australia.json (which uses this exact G/Q/W
// factor set for Australia) rather than calling the 7000-load-combination-generator
// calculator (its Australia `standard_input` options aren't enumerated in the static
// schema). Only strength combos are modeled - see plan assumption #6: no serviceability
// combos, since only the AS1664 strength check + reactions were requested.
//
// Qcb_line (handrail line load) and Qcb_point (post-top point load) are the two
// non-concurrent AS 1170.1 barrier load cases (§3.6) - kept as separate load groups so
// each gets its own combo and the design check envelopes the worse of the two
// automatically, rather than (incorrectly) summing them.
//
// W_out / W_in are the same wind pressure magnitude applied in opposite directions
// (pressure pushing in vs. suction pulling out) - see windLoads.js.
function buildLoadCombinations() {
  const load_combinations = {
    1: { name: '1: 1.35G', criteria: 'strength', SW1: 1.35, Qcb_line: 0, Qcb_point: 0, W_out: 0, W_in: 0 },
    2: { name: '2: 1.2G + 1.5Qcb (line)', criteria: 'strength', SW1: 1.2, Qcb_line: 1.5, Qcb_point: 0, W_out: 0, W_in: 0 },
    3: { name: '3: 1.2G + 1.5Qcb (point)', criteria: 'strength', SW1: 1.2, Qcb_line: 0, Qcb_point: 1.5, W_out: 0, W_in: 0 },
    4: { name: '4: 1.2G + Wu (outward)', criteria: 'strength', SW1: 1.2, Qcb_line: 0, Qcb_point: 0, W_out: 1.0, W_in: 0 },
    5: { name: '5: 1.2G + Wu (inward)', criteria: 'strength', SW1: 1.2, Qcb_line: 0, Qcb_point: 0, W_out: 0, W_in: 1.0 },
    6: { name: '6: 0.9G + Wu (outward)', criteria: 'strength', SW1: 0.9, Qcb_line: 0, Qcb_point: 0, W_out: 1.0, W_in: 0 },
    7: { name: '7: 0.9G + Wu (inward)', criteria: 'strength', SW1: 0.9, Qcb_line: 0, Qcb_point: 0, W_out: 0, W_in: 1.0 },
    8: { name: '8: 1.2G + Wu (outward) + 0.4Qcb (line)', criteria: 'strength', SW1: 1.2, Qcb_line: 0.4, Qcb_point: 0, W_out: 1.0, W_in: 0 },
    9: { name: '9: 1.2G + Wu (inward) + 0.4Qcb (line)', criteria: 'strength', SW1: 1.2, Qcb_line: 0.4, Qcb_point: 0, W_out: 0, W_in: 1.0 },
  };
  const load_cases = {
    'AS-1170.0-2002': {
      SW1: 'Dead: dead',
      Qcb_line: 'Live: live',
      Qcb_point: 'Live: live',
      W_out: 'Wind: wind',
      W_in: 'Wind: wind',
    },
  };
  return { load_combinations, load_cases, strengthComboIds: Object.keys(load_combinations) };
}

function buildBalustradeModel(inputs) {
  const {
    runLengthM, spacingMmTarget, handrailHeightMm, glassHeightMm,
    postType, postSectionName,
    lineLoadKn, pointLoadKn,
    pressurePa,
  } = inputs;

  if (!(runLengthM > 0)) throw new Error('runLengthM must be a positive number');
  if (!(spacingMmTarget > 0)) throw new Error('spacingMmTarget must be a positive number');
  if (!(handrailHeightMm > 0)) throw new Error('handrailHeightMm must be a positive number');
  if (!(glassHeightMm > 0) || glassHeightMm > handrailHeightMm) {
    throw new Error('glassHeightMm must be a positive number not exceeding handrailHeightMm');
  }
  if (!POST_TYPES[postType]) throw new Error(`Unknown postType "${postType}", expected one of ${Object.keys(POST_TYPES).join(', ')}`);
  if (!(lineLoadKn >= 0) || !(pointLoadKn >= 0)) throw new Error('lineLoadKn and pointLoadKn must be non-negative numbers');
  const pressure = pressurePa > 0 ? pressurePa : 0;

  const postSection = findSection(postType, postSectionName);

  const runLengthMm = runLengthM * 1000;
  const bayCount = Math.max(1, Math.ceil(runLengthMm / spacingMmTarget));
  const postCount = bayCount + 1;
  const actualSpacingMm = runLengthMm / bayCount;
  const spacingM = actualSpacingMm / 1000;
  const handrailHeightM = handrailHeightMm / 1000;
  const glassHeightM = glassHeightMm / 1000;

  const nodes = {};
  let nextNodeId = 1;
  const baseNodeId = new Array(postCount);
  const topNodeId = new Array(postCount);
  for (let i = 0; i < postCount; i++) {
    const x = i * spacingM;
    baseNodeId[i] = nextNodeId++;
    nodes[baseNodeId[i]] = { x, y: 0, z: 0 };
    topNodeId[i] = nextNodeId++;
    nodes[topNodeId[i]] = { x, y: handrailHeightM, z: 0 };
  }

  const members = {};
  let nextMemberId = 1;
  const memberMeta = {}; // memberId -> { role, postIndex? }
  const postMemberIds = [];
  const handrailMemberIds = [];

  function addMember(nodeA, nodeB, sectionId, fixity, role, extra) {
    const id = nextMemberId++;
    members[id] = { node_A: nodeA, node_B: nodeB, section_id: sectionId, fixity_A: fixity, fixity_B: fixity };
    memberMeta[id] = { role, ...extra };
    return id;
  }

  for (let i = 0; i < postCount; i++) {
    // Fixed-base cantilever post (plan assumption #2) - moment-fixed into the concrete slab.
    const id = addMember(baseNodeId[i], topNodeId[i], 1, 'FFFFFF', 'post', { postIndex: i, heightM: handrailHeightM });
    postMemberIds.push(id);
  }
  for (let i = 0; i < postCount - 1; i++) {
    const id = addMember(topNodeId[i], topNodeId[i + 1], 2, 'FFFFFF', 'handrail', { spanM: spacingM });
    handrailMemberIds.push(id);
  }

  const supports = {};
  let nextSupportId = 1;
  for (let i = 0; i < postCount; i++) {
    supports[nextSupportId++] = { node: baseNodeId[i], restraint_code: 'FFFFFF' };
  }

  const distributed_loads = {};
  let nextLoadId = 1;
  function addDistributedLoad(memberId, zMag, posA, posB, group) {
    if (zMag === 0) return;
    distributed_loads[nextLoadId++] = {
      member: memberId,
      x_mag_A: 0, y_mag_A: 0, z_mag_A: zMag,
      x_mag_B: 0, y_mag_B: 0, z_mag_B: zMag,
      position_A: posA, position_B: posB,
      axes: 'global',
      load_group: group,
    };
  }

  // Balustrade line load (AS 1170.1 §3.6, non-concurrent with the point load below) -
  // applied along the full length of every handrail member.
  for (const memberId of handrailMemberIds) {
    addDistributedLoad(memberId, lineLoadKn, 0, 100, 'Qcb_line');
  }

  // Balustrade point load - modeled as a short (5% of post height, at the very top)
  // distributed load on each post rather than a separate nodal-load object, so it stays
  // in the same distributed_loads structure as everything else.
  for (const memberId of postMemberIds) {
    addDistributedLoad(memberId, pointLoadKn / (0.05 * handrailHeightM), 95, 100, 'Qcb_point');
  }

  // Wind pressure on the glass, transferred to the two adjacent posts as a UDL over the
  // glass-height tributary region (plan assumption #3/#4). Tributary width = half the
  // sum of adjacent bay widths - interior posts share two panels, end posts only one.
  const glassPercent = (glassHeightM / handrailHeightM) * 100;
  for (let i = 0; i < postCount; i++) {
    const isEnd = i === 0 || i === postCount - 1;
    const tributaryM = isEnd ? spacingM / 2 : spacingM;
    const windKnPerM = (pressure * tributaryM) / 1000; // Pa * m -> N/m, /1000 -> kN/m
    const memberId = postMemberIds[i];
    addDistributedLoad(memberId, windKnPerM, 0, glassPercent, 'W_out');
    addDistributedLoad(memberId, -windKnPerM, 0, glassPercent, 'W_in');
  }

  const { load_combinations, load_cases, strengthComboIds } = buildLoadCombinations();

  const s3d_model = {
    settings: { units: 'metric' },
    nodes,
    members,
    sections: {
      1: { load_section: ['Australian', 'Aluminium', postSection.category, postSection.name], material_id: 1 },
      2: { load_section: ['Australian', 'Aluminium', HANDRAIL_SECTION.category, HANDRAIL_SECTION.name], material_id: 1 },
    },
    materials: { 1: { ...FE_MATERIAL } },
    supports,
    self_weight: { 1: { enabled: true, x: 0, y: -1, z: 0, load_group: 'SW1' } },
    distributed_loads,
    load_combinations,
    load_cases,
  };

  return {
    s3d_model,
    layout: {
      postCount,
      bayCount,
      spacingM,
      actualSpacingMm,
      runLengthM,
      handrailHeightM,
      glassHeightM,
      postType,
      postSection,
      handrailSection: HANDRAIL_SECTION,
      lineLoadKn,
      pointLoadKn,
      pressurePa: pressure,
      baseNodeId,
      topNodeId,
      postMemberIds,
      handrailMemberIds,
      memberMeta,
      comboNames: Object.fromEntries(Object.entries(load_combinations).map(([id, c]) => [id, c.name])),
      strengthComboIds,
    },
  };
}

module.exports = { buildBalustradeModel };
