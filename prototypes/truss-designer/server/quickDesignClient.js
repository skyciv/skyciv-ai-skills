'use strict';

const RUN_URL = 'https://qd.skyciv.com/run';
const BATCH_URL = 'https://qd.skyciv.com/runBatch';
const UID = '4003-nds-wood-beam-calculator';

// Douglas Fir-Larch No.2 is the default framing grade this app checks every member
// against - not exposed as a form input (the user only asked for span/type/height/
// section as inputs), just documented in the "Modeling assumptions" panel.
const SPECIES = 'DOUGLAS FIR-LARCH';
const GRADE = 'No.2';
const METHOD = 'LRFD';
const TABLE_NO = 'Table 4A';

function getCreds() {
  const auth = process.env.SKYCIV_USERNAME;
  const key = process.env.SKYCIV_QD_TOKEN || process.env.SKYCIV_API_KEY;
  if (!auth || !key) {
    throw new Error('Missing SKYCIV_USERNAME / SKYCIV_QD_TOKEN - set them in .env before calling Quick Design.');
  }
  return { auth, key };
}

// Fields shared by every call for a given member (geometry + species/grade - the demand
// forces and the adjustment-factor mode/table are the only things that vary call-to-call).
//
// ad_LL/ad_LT (actual live-load/long-term deflection, inches) default to a fixed
// placeholder - this is only correct when the caller supplies real computed values
// (see designCheck.js's `hasRealDeflection`); for members without real deflection data
// these stay as a placeholder and the resulting Deflection Utilization entries must be
// excluded from any governing-ratio search, since they're identical for every such
// member regardless of its actual length/load/section.
function baseFields({ b, d, L, adLL, adLT }) {
  return {
    method: METHOD,
    table_no: TABLE_NO,
    species: SPECIES,
    grade: GRADE,
    size: '2in & wider',
    laminations: 1,
    Cr_app: false,
    Ci_app: false,
    b, d,
    // Unbraced length = member length (webs pinned, chords braced only at panel
    // points by this model); Le uses the schema's own documented conservative
    // default (2.06 x L) rather than a bespoke bracing analysis.
    L, Le: 2.06 * L,
    kz: 1, ky: 1,
    mc: 19, temp: 70, msc: 'Dry',
    df_LL: 360, df_LT: 180, ad_LL: adLL ?? 0.1, ad_LT: adLT ?? 0.12,
    lambda_c: 50, lambda_b: 50,
    bp: 'Sagging',
    uid: UID,
    current_unit_system: 'imperial',
    project_details: {},
  };
}

// Step 1 input: adjust_factor_only requests just the computed NDS adjustment-factor
// table for this species/grade/size/length - the demand forces are irrelevant here
// (zeroed) since this call never runs the actual member check.
function buildStep1Input(demand) {
  return {
    ...baseFields(demand),
    adjust_factor_only: true,
    auto_adjust: true,
    Nc: 0, Nt: 0, Mz: 0, My: 0, Vz: 0, Vy: 0,
  };
}

// Step 2 input: the real design check. Passing `auto_adjust: true` alone (with either
// no adjust_factor_* array, or the single-row placeholder shown in this calculator's
// own sample_input.json) reliably fails on the live API with a generic "error in
// calculating adjustment factors" for every member/species/grade combination tested -
// the live calculator actually needs a *complete* 7-row table (one row per NDS
// property: E, Emin, Fb, Ft, Fv, Fc, Fcp), which only step 1's response provides
// (`data.results.adjust_factors.adjust_factor_obj.adjust_factor_map_obj`). This is a
// genuine gap in this repo's documented example, not a request-shape mistake -
// confirmed by replaying that exact sample_input.json against the live API and getting
// the same failure.
function buildStep2Input(demand, adjustFactorRows) {
  const input = {
    ...baseFields(demand),
    adjust_factor_only: false,
    Nc: demand.Nc, Nt: demand.Nt, Mz: demand.Mz, My: 0, Vz: demand.Vz, Vy: 0,
  };
  if (adjustFactorRows) {
    input.auto_adjust = false;
    input.adjust_factor_lrfd = adjustFactorRows;
  } else {
    // Step 1 failed for this member - fall back to auto_adjust and accept the likely
    // failure rather than skipping the call and losing index alignment in the batch.
    input.auto_adjust = true;
  }
  return input;
}

function rowsFromStep1Result(qdResult) {
  const map = qdResult?.data?.results?.adjust_factors?.adjust_factor_obj?.adjust_factor_map_obj;
  if (!map) return null;
  return Object.entries(map).map(([item_name, factors]) => ({ item_name, ...factors }));
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

// Runs the two-step flow (adjustment factors, then the real check) for every member in
// one pair of batch calls.
async function runBatch(memberDemands) {
  if (!memberDemands.length) return [];
  const step1Results = await runRawBatch(memberDemands.map(buildStep1Input));
  const step2Inputs = memberDemands.map((demand, i) => buildStep2Input(demand, rowsFromStep1Result(step1Results[i])));
  return runRawBatch(step2Inputs);
}

// "Open in Quick Design" link, prefilled with this member's core geometry/demand so the
// user can inspect or re-run the check interactively on platform.skyciv.com - see
// run-quick-design/SKILLS.md's documented `?uid=...&field=value...` pattern. Deliberately
// omits the adjust_factor_* table (too large for a URL and the platform UI computes its
// own when `auto_adjust` is left on).
function buildOpenLink(demand) {
  const input = { ...baseFields(demand), Nc: demand.Nc, Nt: demand.Nt, Mz: demand.Mz, My: 0, Vz: demand.Vz, Vy: 0 };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(input)) {
    if (k === 'uid' || k === 'project_details') continue;
    params.set(k, v);
  }
  return `https://platform.skyciv.com/quick-design?uid=${UID}&${params.toString()}`;
}

module.exports = { runBatch, buildOpenLink, UID, SPECIES, GRADE, METHOD };
