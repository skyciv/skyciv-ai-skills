'use strict';

const BATCH_URL = 'https://qd.skyciv.com/runBatch';
const UID = '2601-aluminium-design';

const { ALLOY, TEMPER, CUSTOM_MATERIAL_FALLBACK } = require('./sectionCatalogue');

function getCreds() {
  const auth = process.env.SKYCIV_USERNAME;
  const key = process.env.SKYCIV_QD_TOKEN || process.env.SKYCIV_API_KEY;
  if (!auth || !key) {
    throw new Error('Missing SKYCIV_USERNAME / SKYCIV_QD_TOKEN - set them in .env before calling Quick Design.');
  }
  return { auth, key };
}

// AS/NZS 1664 Aluminium Member Design is a single-step combined-actions check (unlike
// the NDS timber calculator this app's sibling prototype uses) - no adjust-factor
// pre-call dance is needed, just one call per post with its geometry + factored demand.
//
// `custom_material` defaults false, using the live alloy/temper enum directly - verified
// against the live API that 6061/T6 (sectionCatalogue.js's ALLOY/TEMPER) returns real
// results. If you change ALLOY/TEMPER to a pair the live calculator doesn't have data
// for, every call fails with a generic "Cannot read properties of undefined (reading
// 'length')" error rather than a clear "invalid alloy" message - verify any new pair
// against the live API first (see the comment on ALLOY in sectionCatalogue.js). Flip
// USE_CUSTOM_MATERIAL to true to bypass the alloy/temper database entirely via
// sectionCatalogue.js's CUSTOM_MATERIAL_FALLBACK (approximate properties - verify
// before trusting results).
const USE_CUSTOM_MATERIAL = false;

function buildInput(demand) {
  const base = {
    member_label: demand.label,
    shape: demand.shape,
    section: 'custom',
    custom_material: USE_CUSTOM_MATERIAL,
    welded: 'Not Welded', // posts are extruded sections, not welded fabrications
    product: 'Sheet, plate',
    D: demand.D,
    B: demand.B,
    legs_y: 2,
    legs_z: 2,
    t_f: demand.t_f,
    t_w: demand.t_w,
    La: 10,
    Lb: demand.Lb,
    Lz: demand.Lz,
    Ly: demand.Ly,
    kz: demand.kz,
    ky: demand.ky,
    Mz: demand.Mz,
    My: demand.My,
    Vy: demand.Vy,
    Vz: demand.Vz,
    Nc: demand.Nc,
    Nt: demand.Nt,
    uid: UID,
    current_unit_system: 'metric',
    project_details: {},
  };
  if (USE_CUSTOM_MATERIAL) {
    base.custom_material_properties = [CUSTOM_MATERIAL_FALLBACK];
  } else {
    base.alloy = ALLOY;
    base.temper = TEMPER;
  }
  return base;
}

async function runRawBatch(inputArr) {
  if (!inputArr.length) return [];
  const { auth, key } = getCreds();
  const res = await fetch(BATCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload: JSON.stringify({ uid: UID, auth, key, input_arr: inputArr, pdf_report: true }) }),
  });
  const json = await res.json();
  if (!res.ok || json?.status !== 0) {
    throw new Error(json?.msg || `Quick Design batch request failed (HTTP ${res.status})`);
  }
  const results = json.data?.results;
  if (!Array.isArray(results)) {
    throw new Error('Quick Design batch response did not contain a results array');
  }
  return results; // array, same order/length as inputArr
}

async function runBatch(postDemands) {
  if (!postDemands.length) return [];
  return runRawBatch(postDemands.map(buildInput));
}

// "Open in Quick Design" link, prefilled with this post's core geometry/demand so the
// user can inspect or re-run the check interactively on platform.skyciv.com - see
// run-quick-design/SKILLS.md's documented `?uid=...&field=value...` pattern.
function buildOpenLink(demand) {
  const input = buildInput(demand);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(input)) {
    if (k === 'uid' || k === 'project_details' || k === 'custom_material_properties') continue;
    params.set(k, v);
  }
  return `https://platform.skyciv.com/quick-design?uid=${UID}&${params.toString()}`;
}

module.exports = { runBatch, buildOpenLink, UID, ALLOY, TEMPER };
