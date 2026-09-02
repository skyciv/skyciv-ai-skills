# Analysis Results Skill

How to fetch, read, and interpret **S3D structural analysis results** — the object returned once
a model has been solved — whether you're calling the SkyCiv API or building a client-side S3D App
that reads results from an already-open session.

> **Prerequisite:** A model must be solved before results exist. Over the API, that's
> [`S3D.model.solve`](../s3d-api/SKILL.md#s3dmodelsolve) (see [`s3d-api`](../s3d-api/SKILL.md)).
> Inside an S3D App, the user solves via the S3D UI itself — see
> [`s3d-apps`](../s3d-apps/SKILL.md) for the app runtime this skill's client-side functions run in.

---

## Two ways to get results — same object, different calls

| Context | Call sequence | Notes |
|---|---|---|
| **Server API** | `S3D.model.set` → `S3D.model.solve` (or `S3D.model.solve` then `S3D.results.get`) | Returns the [analysis results object](#the-analysis-results-object) directly, already in API format. |
| **S3D App / UI** (client-side, inside an open S3D session) | `S3D.solver.isSolved()` → `S3D.results.get()` / `S3D.results.getAll(true, cb)` → **`S3D.API.output.S3D2API(...)`** | `S3D.results.*` return S3D's internal/legacy format, **not** the API shape. Always pipe through `S3D.API.output.S3D2API` to get the same object documented below. |

**Do not skip the conversion step in an App.** `S3D.results.get()` / `getAll()` alone return a
different, older internal shape — if your app was built to read the documented results schema
(the one below, matching the API), reading `S3D.results.getAll()`'s raw output directly will look
similar but have different/missing keys and silently produce wrong values. Always wrap it:

```js
S3D.API.output.S3D2API(S3D.results.getAll(true))
```

### Checking solve status first

```js
if (!S3D.solver.isSolved()) {
  // Nothing to fetch yet — prompt the user to solve, or solve programmatically first.
} else {
  // S3D.results.get() is the current load combination only, and always instantly available.
  const currentComboResults = S3D.API.output.S3D2API(S3D.results.get());

  // S3D.results.getAll(true, cb) returns every load combination, but may take a moment to
  // download — do the real work inside the callback, not immediately after the call.
  S3D.results.getAll(true, function () {
    const allResults = S3D.API.output.S3D2API(S3D.results.getAll(true));
  });
}
```

`S3D.results.getAll`'s first argument (`downloadAll`) controls whether results are actually
(re-)downloaded — pass `true` unless you specifically want only what's already been downloaded,
to avoid excessive re-downloading.

### Reading solve messages/warnings

`S3D.solver.getLastSolveInfo()` returns the same info/warning messages shown in the S3D solve
dialog — general messages plus per-load-group/load-case/load-combination breakdowns and a
severity-bucketed warnings list:

```json
{
  "msg": "Solved Successfully!",
  "info": ["Linear Static Analysis Completed"],
  "info_categorised": { "general": ["Linear Static Analysis Completed"], "load_groups": {}, "load_cases": {}, "load_combinations": {} },
  "warnings": [],
  "warnings_categorised": {
    "general": { "minor": [], "moderate": [], "severe": [] },
    "load_groups": {}, "load_cases": {}, "load_combinations": {}
  },
  "err_code": 0
}
```

Surface `msg` and any non-empty `warnings`/`warnings_categorised` buckets in your UI before
presenting numeric results — a warning (e.g. a mechanism, an unstable member) means the results
may not be trustworthy even though a solve technically completed. `err_code !== 0` means the solve
failed outright.

---

## The analysis results object

Whichever path you used above, you get an object keyed by **load combination id** — a string,
matching the id used in the model's `load_combinations` (or an auto-numbered id for individual
load cases/groups/envelopes). IDs are **not necessarily sequential or starting at 1**
(e.g. `1, 2, 8, 9, 10, 11, 12, 13, 14, 15` is a normal set — gaps are expected, matching whichever
`load_combinations`/`load_cases`/`load_groups` ids and auto-generated envelope ids exist on that
solve). A full worked example (10 load combinations, 16 members, 20 plates) is at
[`assets/example1-api-format.json`](./assets/example1-api-format.json) — read it directly when you
need real numbers to pattern-match against rather than guessing shapes.

```json
{
  "1": { "name": "...", "type": "...", /* ... */ },
  "2": { /* ... */ }
}
```

### Per-combination entry

| Key | Type | Description |
|---|---|---|
| `name` | string | Display name. **The only reliable way to distinguish envelope sub-types** — see the `type` gotcha below. |
| `type` | string | `user_defined` (a combo from `load_combinations`), `load_case`, `load_group` (e.g. self-weight `SW1` solved alone), or `envelope`. |
| `reactions` | object | Support reactions — node id → `{Fx, Fy, Fz, Mx, My, Mz}`. Only nodes that actually have a support appear as keys. |
| `member_displacements`, `member_forces`, `member_stresses` | object | Raw per-station member results. Tier 1 of 3 — see below. |
| `member_lengths`, `member_stations`, `member_discontinuities` | object | Supporting per-member data — see below. |
| `member_minimums`, `member_maximums` | object | Per-member min/max summaries. Tier 2 of 3. |
| `member_peak_results` | object | Global min/max across every member. Tier 3 of 3. |
| `plate_displacements`, `plate_forces`, `plate_stresses` | object | Raw per corner-node plate results. Tier 1 of 3. |
| `plate_element_forces`, `plate_element_stresses` | object | Same as above, per meshed element. Empty `{}` unless the plate has been meshed (`S3D.model.mesh`). |
| `plate_minimums`, `plate_maximums` | object | Per-plate min/max summaries. Tier 2 of 3. |
| `plate_peak_results` | object | Global min/max across every plate. Tier 3 of 3. |
| `buckling` | string \| object | `"disabled"` unless the solve used `analysis_type: "buckling"`. |

> **Dynamic/response-spectrum results are separate.** Modes, frequencies, and mass participation
> live in [`S3D.results.getDynamicFreq`](../s3d-api/SKILL.md#s3dresultsgetdynamicfreq), not in this
> per-combination object.

> **Units are never embedded in results.** Every number follows the model's
> `s3d_model.settings.units` (see [`s3d-api`](../s3d-api/SKILL.md#settings)) — read that once per
> model rather than assuming mm/kN/MPa.

### Member results — three tiers, same pattern every time

1. **Raw per-station** (`member_displacements` / `member_forces` / `member_stresses`): result key →
   member id → station position (string, 0–100% of the member's length, rounded to 1 decimal) →
   value. Station count matches `settings.evaluation_points` (default 25).
2. **Per-member min/max** (`member_minimums` / `member_maximums`): result key → member id → a
   single scalar — the min/max of that quantity anywhere along that one member.
3. **Global min/max** (`member_peak_results`): result key → `{ "min": ..., "max": ... }` — the
   extremes across **every** member in the combination (no member id, no station).

```json title="Same axial_force, all three tiers, member 1 of assets/example1-api-format.json"
member_forces.axial_force["1"]["0.0"]   // -0.001           (station-level)
member_minimums.axial_force["1"]        // -0.00139328      (per-member min)
member_peak_results.axial_force         // {"min": -0.00267385, "max": 0.427625}   (global)
```

| Object | Keys |
|---|---|
| `member_displacements` | `displacement_x/y/z`, `displacement_sum`, `displacement_local_x/y/z`, `displacement_local_sum`, `rotation_x/y/z`, `rotation_local_x/y/z` |
| `member_forces` | `axial_force`, `shear_force_y`, `shear_force_z`, `bending_moment_y`, `bending_moment_z`, `torsion` |
| `member_stresses` | `axial_stress`, `top_bending_stress_z/y`, `btm_bending_stress_z/y`, `shear_stress_z/y`, `shear_stress_total`, `torsion_stress`, `max_combined_normal_stress`, `min_combined_normal_stress` |
| `member_minimums` / `member_maximums` (extra keys beyond the above three) | `displacement_relative`, `displacement_relative_local_x/y/z`, `displacement_relative_2`, `displacement_relative_local_x/y/z_2`, `displacement_span_ratio`, `displacement_span_ratio_2` — relative-to-chord deflection and span/deflection ratio, e.g. for span/250 serviceability checks. |

Supporting per-member data (not results, but needed to interpret them):

| Key | Shape | Description |
|---|---|---|
| `member_lengths` | member id → float | Member length. |
| `member_stations` | member id → `[float]` | The exact station positions (0–100%) the raw results are evaluated at. |
| `member_discontinuities` | member id → integer | Count of internal discontinuity points detected along the member (e.g. from a mid-span point load) — a count, not an array of positions. |

### Plate results — the same three tiers

1. **Raw per corner-node** (`plate_displacements` / `plate_forces` / `plate_stresses`): result key →
   plate id → an array of values, one per corner node in the plate's `nodes` order (3 entries
   triangular, 4 quad).
2. **Per-plate min/max** (`plate_minimums` / `plate_maximums`): result key → plate id → single scalar.
3. **Global min/max** (`plate_peak_results`): result key → `{ "min": ..., "max": ... }` across every plate.

```json title="Same stress_von_mises_top, plate 1"
plate_stresses.stress_von_mises_top["1"]   // [0.357414, 0.363112, 0.790236, 0.482214]
plate_minimums.stress_von_mises_top["1"]   // 0.357414
plate_peak_results.displacement_x          // {"min": -0.00747437, "max": -0.00738231}
```

| Object | Keys |
|---|---|
| `plate_displacements` | `displacement_x/y/z`, `displacement_sum` |
| `plate_forces` | `force_x/y/xy/xz/yz`, `moment_x/y/xy` |
| `plate_stresses` | `stress_xx/yy/xy`, `stress_major_principal`, `stress_minor_principal`, `stress_von_mises`, `stress_max_shear` — each suffixed `_top` and `_btm` |

`plate_element_forces` / `plate_element_stresses` mirror `plate_forces` / `plate_stresses` but
keyed per meshed element instead of per corner node.

---

## Gotchas (verified against `assets/example1-api-format.json`)

- **`type: "envelope"` doesn't tell you which envelope.** `Envelope Min`, `Envelope Max`, and
  `Envelope Absolute Max` all report `type: "envelope"` — use `name` to distinguish them. This also
  means the `lc_filter: ["envelope_abs_max"]` option on `S3D.model.solve` / `S3D.results.get`
  selects by a filter keyword that does **not** match the `type` field you get back — filter by
  keyword going in, read `name` coming out.
- **User-defined combinations report `type: "user_defined"`**, not `"load_combo"` — despite
  `lc_filter` accepting `"load_combo"` as a filter keyword. Same filter-in/name-or-type-out
  mismatch as above.
- **`member_discontinuities` is a count, not a results array** — despite sitting alongside
  per-station result objects, `member_discontinuities["<id>"]` is a single integer (how many
  discontinuity points were detected along that member), not a station-keyed object.
- **`plate_element_forces`/`plate_element_stresses` are commonly empty (`{}`)** — they only
  populate once the model's plates have been meshed (`S3D.model.mesh`); an unmeshed model (like
  the reference asset) reports plate results only at corner nodes.
- **Reactions only list supported nodes.** Don't iterate a model's full node list expecting a
  reaction entry for each — nodes without a support are simply absent as keys.
- **Station keys are rounded strings, not the raw floats in `member_stations`.** `member_stations`
  gives full-precision positions (e.g. `4.166666702`); the matching key in `member_forces` etc. is
  that same position rounded to 1 decimal as a string (`"4.2"`). Don't try to match on float
  equality — read the key set directly, or round your own lookup the same way.

---

## Downstream use

- Pass this object straight to [`S3D.results.set`](../s3d-api/SKILL.md#s3dresultsset) to load
  results computed elsewhere (a different solve, a cached run) back into a session for reporting.
- [`run-quick-design`](../run-quick-design/SKILL.md) member/connection checks consume the peak
  forces/stresses from here (typically `member_peak_results` or `member_maximums` per member) as
  their design-load inputs.
- [`qa-engineer`](../qa-engineer/SKILL.md) reviews should cross-check `S3D.solver.getLastSolveInfo()`
  warnings alongside the numeric peaks here before signing off a result set.
- For a downloadable report instead of raw data, see
  [`S3D.results.getAnalysisReport`](../s3d-api/SKILL.md#s3dresultsgetanalysisreport) — a separate,
  much slower call; don't bundle it into a normal analyze/results pipeline (see the caution in
  `s3d-api`).
