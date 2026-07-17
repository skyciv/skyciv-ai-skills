'use strict';

// Geometry, loads and load combinations for a symmetric pitched ("common") timber roof
// truss: a horizontal bottom chord, a top chord sloping up from each support to a single
// apex at mid-span, and one of four characteristic web (bracing) patterns between them.
//
// These are practical parametric approximations of each truss type's characteristic web
// layout for small pitched roof trusses - not a textbook truss-catalogue lookup:
// - Warren: diagonals only (no verticals), alternating direction bay-to-bay.
// - Pratt: a vertical at every interior panel point + one diagonal per bay sloping
//   toward mid-span (tension diagonals under gravity load).
// - Howe: the same verticals + diagonals sloping away from mid-span (mirror of Pratt).
// - Fink: a king-post vertical at mid-span + a dense "W" web (every interior bottom
//   panel point diagonally braced to both adjacent top-chord nodes).
//
// The two end bays (nearest each support) never need a web member: the top and bottom
// chords already meet at a shared node there (the heel joint), so that bay is an
// inherently triangulated corner, not a 4-sided panel.

const TRUSS_TYPES = ['warren', 'fink', 'howe', 'pratt'];

const SECTION_SIZES = {
  '2x4': { label: '2x4', b: 2, d: 4, load_section: ['American', 'NDS', 'Sawn Lumber', '2 x 4'] },
  '2x6': { label: '2x6', b: 2, d: 6, load_section: ['American', 'NDS', 'Sawn Lumber', '2 x 6'] },
  '2x8': { label: '2x8', b: 2, d: 8, load_section: ['American', 'NDS', 'Sawn Lumber', '2 x 8'] },
  '4x4': { label: '4x4', b: 4, d: 4, load_section: ['American', 'NDS', 'Sawn Lumber', '4 x 4'] },
};

// Indicative properties only (linear-elastic FE stiffness + self-weight) - the actual
// strength check is the NDS Quick Design calculator (server/quickDesignClient.js), which
// looks up real NDS Table 4A allowable stresses for the species/grade itself.
const MATERIAL = {
  name: 'Douglas Fir-Larch No.2 (indicative FE properties)',
  density_pcf: 32,
  E_ksi: 1600,
  poissons_ratio: 0.3,
};

const SPACING_FT = 2; // truss spacing, 24 in o.c. - converts psf (plan area) to plf per truss
const TARGET_PANEL_FT = 4; // target bottom-chord panel width

function computePanelCount(spanFt) {
  let n = Math.round(spanFt / TARGET_PANEL_FT / 2) * 2;
  if (n < 4) n = 4;
  if (n > 10) n = 10;
  return n;
}

function topChordY(i, n, heightFt) {
  const half = n / 2;
  return i <= half ? (heightFt * i) / half : (heightFt * (n - i)) / half;
}

function buildTrussModel({ spanFt, heightFt, trussType, sectionKey, deadPsf, sheetingPsf, snowPsf, windPsf }) {
  if (!(spanFt > 0) || !(heightFt > 0)) {
    throw new Error('spanFt and heightFt must be positive numbers');
  }
  if (!TRUSS_TYPES.includes(trussType)) {
    throw new Error(`Unknown trussType "${trussType}", expected one of ${TRUSS_TYPES.join(', ')}`);
  }
  const section = SECTION_SIZES[sectionKey];
  if (!section) {
    throw new Error(`Unknown sectionKey "${sectionKey}", expected one of ${Object.keys(SECTION_SIZES).join(', ')}`);
  }
  for (const [label, val] of Object.entries({ deadPsf, sheetingPsf, snowPsf, windPsf })) {
    if (!(val >= 0)) throw new Error(`${label} must be a non-negative number`);
  }

  const n = computePanelCount(spanFt);
  const dx = spanFt / n;

  const nodes = {};
  let nextNodeId = 1;
  const bottomNodeId = new Array(n + 1);
  const topNodeId = new Array(n + 1);

  for (let i = 0; i <= n; i++) {
    const id = nextNodeId++;
    bottomNodeId[i] = id;
    nodes[id] = { x: i * dx, y: 0, z: 0 };
  }
  topNodeId[0] = bottomNodeId[0]; // heel joint - top & bottom chord share this node
  topNodeId[n] = bottomNodeId[n];
  for (let i = 1; i < n; i++) {
    const id = nextNodeId++;
    topNodeId[i] = id;
    nodes[id] = { x: i * dx, y: topChordY(i, n, heightFt), z: 0 };
  }

  const members = {};
  let nextMemberId = 1;
  const memberMeta = {}; // memberId -> { role, lengthFt }
  const topChordMemberIds = [];

  function addMember(nodeA, nodeB, role, fixity) {
    const id = nextMemberId++;
    members[id] = { node_A: nodeA, node_B: nodeB, section_id: 1, fixity_A: fixity, fixity_B: fixity };
    const a = nodes[nodeA];
    const b = nodes[nodeB];
    const lengthFt = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
    memberMeta[id] = { role, lengthFt };
    return id;
  }

  for (let i = 0; i < n; i++) {
    addMember(bottomNodeId[i], bottomNodeId[i + 1], 'bottom_chord', 'FFFFFF');
  }
  for (let i = 0; i < n; i++) {
    const id = addMember(topNodeId[i], topNodeId[i + 1], 'top_chord', 'FFFFFF');
    topChordMemberIds.push(id);
  }

  const WEB_FIXITY = 'FFFRRR'; // pinned - releases all rotations, matches truss web practice
  const half = n / 2;

  if (trussType === 'warren') {
    for (let k = 1; k <= n - 2; k++) {
      if (k % 2 === 1) addMember(bottomNodeId[k], topNodeId[k + 1], 'web', WEB_FIXITY);
      else addMember(bottomNodeId[k + 1], topNodeId[k], 'web', WEB_FIXITY);
    }
  } else if (trussType === 'pratt' || trussType === 'howe') {
    for (let i = 1; i <= n - 1; i++) {
      addMember(bottomNodeId[i], topNodeId[i], 'web', WEB_FIXITY);
    }
    for (let k = 1; k <= n - 2; k++) {
      const bayMid = k + 0.5;
      const towardCenter = bayMid < half
        ? [bottomNodeId[k], topNodeId[k + 1]]
        : [bottomNodeId[k + 1], topNodeId[k]];
      const awayFromCenter = bayMid < half
        ? [bottomNodeId[k + 1], topNodeId[k]]
        : [bottomNodeId[k], topNodeId[k + 1]];
      const [a, b] = trussType === 'pratt' ? towardCenter : awayFromCenter;
      addMember(a, b, 'web', WEB_FIXITY);
    }
  } else if (trussType === 'fink') {
    addMember(bottomNodeId[half], topNodeId[half], 'web', WEB_FIXITY); // king post
    for (let i = 1; i <= n - 1; i++) {
      addMember(bottomNodeId[i], topNodeId[i - 1], 'web', WEB_FIXITY);
      addMember(bottomNodeId[i], topNodeId[i + 1], 'web', WEB_FIXITY);
    }
  }

  // Supports: pin at the left heel, roller at the right heel. Every other node
  // (including top-chord panel points) gets an out-of-plane restraint only
  // (tz, rx, ry) - this truss is modeled as a single planar line at z=0, and this
  // represents the continuous purlin/sheathing bracing that prevents it buckling or
  // rotating out of its own plane, standard practice for analyzing one truss line in a
  // 3D solver. Restraint code order is tx,ty,tz,rx,ry,rz (F = restrained, R = free).
  const supports = {};
  let nextSupportId = 1;
  const supportRole = {};
  function addSupport(node, restraint_code, role) {
    const id = nextSupportId++;
    supports[id] = { node, restraint_code };
    supportRole[id] = role;
    return id;
  }
  addSupport(bottomNodeId[0], 'FFFFFR', 'pin');
  addSupport(bottomNodeId[n], 'RFFFFR', 'roller');
  for (const id of Object.keys(nodes)) {
    const nodeId = Number(id);
    if (nodeId === bottomNodeId[0] || nodeId === bottomNodeId[n]) continue;
    addSupport(nodeId, 'RRFFFR', 'bracing');
  }

  // Loads: self-weight is automatic (SW1). Dead + sheeting -> D1, snow -> S1, wind
  // (uplift) -> W1, applied as a uniform distributed load on every top-chord member.
  // Inputs are psf (pounds per sq ft) of horizontal plan area (standard roof-load
  // convention), converted to a kip/ft line load along the sloped member via
  // load_kipf = (psf / 1000) * spacing_ft * cos(slope), where
  // cos(slope) = horizontal_run / sloped_length. The /1000 matters: this app's
  // imperial s3d_model uses kip for force (confirmed against the live API - omitting
  // it made every reaction and member force ~1000x too large).
  const LB_TO_KIP = 1 / 1000;
  const distributed_loads = {};
  let nextLoadId = 1;
  function addTopChordLoad(memberId, kipf, direction, group) {
    if (kipf <= 0) return;
    distributed_loads[nextLoadId++] = {
      member: memberId,
      x_mag_A: 0, y_mag_A: direction * kipf, z_mag_A: 0,
      x_mag_B: 0, y_mag_B: direction * kipf, z_mag_B: 0,
      position_A: 0, position_B: 100,
      axes: 'global',
      load_group: group,
    };
  }
  for (const memberId of topChordMemberIds) {
    const { node_A, node_B } = members[memberId];
    const a = nodes[node_A];
    const b = nodes[node_B];
    const lengthFt = memberMeta[memberId].lengthFt;
    const cosTheta = Math.abs(a.x - b.x) / lengthFt;
    const deadKipf = (deadPsf + sheetingPsf) * LB_TO_KIP * SPACING_FT * cosTheta;
    const snowKipf = snowPsf * LB_TO_KIP * SPACING_FT * cosTheta;
    const windKipf = windPsf * LB_TO_KIP * SPACING_FT * cosTheta;
    addTopChordLoad(memberId, deadKipf, -1, 'D1');
    addTopChordLoad(memberId, snowKipf, -1, 'S1');
    addTopChordLoad(memberId, windKipf, +1, 'W1'); // uplift/suction, acts upward
  }

  // ASCE 7-22 Section 2.3.1 basic LRFD combinations with floor live load L = 0 (this is
  // a roof-only truss - no floor live load group exists in this model), hand-derived
  // rather than copied from load-combinations/assets/asce7-22-lrfd.json, which is built
  // for a generic D/L/S/W set and doesn't cleanly give an S-as-primary-variable 1.6 case
  // when L = 0.
  const load_combinations = {
    1: { name: '1.4D + 1.4SW', criteria: 'strength', D1: 1.4, SW1: 1.4, S1: 0, W1: 0 },
    2: { name: '1.2D + 1.2SW + 1.6S', criteria: 'strength', D1: 1.2, SW1: 1.2, S1: 1.6, W1: 0 },
    3: { name: '1.2D + 1.2SW + 1.6S + 0.5W', criteria: 'strength', D1: 1.2, SW1: 1.2, S1: 1.6, W1: 0.5 },
    4: { name: '1.2D + 1.2SW + 1.0W + 0.5S', criteria: 'strength', D1: 1.2, SW1: 1.2, S1: 0.5, W1: 1.0 },
    5: { name: '0.9D + 0.9SW + 1.0W (uplift)', criteria: 'strength', D1: 0.9, SW1: 0.9, S1: 0, W1: 1.0 },
    // Unfactored (service-level) combos, for deflection checks only - NDS deflection
    // limits (L/360 live, L/240 total, etc.) apply to actual service loads, not factored
    // LRFD strength demand, so these must never be included in the strength envelope.
    6: { name: 'Service: D + SW + S (total)', criteria: 'service', D1: 1.0, SW1: 1.0, S1: 1.0, W1: 0 },
    7: { name: 'Service: S only (live)', criteria: 'service', D1: 0, SW1: 0, S1: 1.0, W1: 0 },
  };
  const load_cases = {
    'ASCE-7-22-LRFD': { D1: 'Dead: dead', SW1: 'Dead: dead', S1: 'Snow: snow', W1: 'Wind: wind' },
  };
  const strengthComboIds = ['1', '2', '3', '4', '5'];
  const serviceComboIds = { total: '6', live: '7' };

  const s3d_model = {
    settings: { units: 'imperial' },
    nodes,
    members,
    sections: { 1: { load_section: section.load_section, material_id: 1 } },
    materials: {
      1: {
        name: MATERIAL.name,
        density: MATERIAL.density_pcf,
        elasticity_modulus: MATERIAL.E_ksi,
        poissons_ratio: MATERIAL.poissons_ratio,
        class: 'wood',
      },
    },
    supports,
    self_weight: { 1: { enabled: true, x: 0, y: -1, z: 0, load_group: 'SW1' } },
    distributed_loads,
    load_combinations,
    load_cases,
  };

  return {
    s3d_model,
    layout: {
      n, dx, spanFt, heightFt, trussType,
      sectionKey, section,
      spacingFt: SPACING_FT,
      memberMeta,
      topChordMemberIds,
      supportRole,
      loads: { deadPsf, sheetingPsf, snowPsf, windPsf },
      comboNames: Object.fromEntries(Object.entries(load_combinations).map(([id, c]) => [id, c.name])),
      strengthComboIds,
      serviceComboIds,
    },
  };
}

module.exports = {
  buildTrussModel,
  computePanelCount,
  TRUSS_TYPES,
  SECTION_SIZES,
  MATERIAL,
  SPACING_FT,
};
