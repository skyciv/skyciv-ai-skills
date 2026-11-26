---
name: connection
description: "Use when designing or checking a steel connection through the SkyCiv API with SkyCiv Connection Design — beam-to-column and beam-to-girder shear connections (single/double angle, single/double plate …) and vertical/horizontal brace connections (gusset plates, angles): bolt groups, welds, plates, angles, coped beams and detailing limits. Covers standalone.connection.start and standalone.connection.check, the connection JSON exported from the UI (modal_data, assembly, fixtures, loads) and how to read results_array (demand, capacity, ratio, header rows, detailing items), for AISC 360-16 / 360-22 (ASD, LRFD) and AS 4100:2020. Trigger even without the word SkyCiv, e.g. 'check this shear tab', 'design a gusset plate for this brace', 'will this double angle connection work', 'feed these end forces into a connection check'. Not for column base plates / anchor bolts (use baseplate) or for solving the frame (use s3d-api)."
---

# Connection Design

Check a steel connection (bolts, welds, plates, angles, gussets and the connected members) with the
SkyCiv `standalone.connection` API, which drives [SkyCiv Connection Design](https://platform.skyciv.com/design/connection).

> **Prerequisite:** open the session with **`standalone.connection.start`**, not `S3D.session.start`
> (a check outside a connection session returns *"Session has not been started. Please call
> standalone.connection.start first."*). Auth, `options` and the `{ auth, options, functions }`
> envelope are in [`skyciv-api-v3`](../skyciv-api-v3/SKILL.md). For base plates use
> [`baseplate`](../baseplate/SKILL.md).

## Workflow

1. **Get a connection JSON for the right configuration.** The file's structure depends on the
   connection type and `config`: which members, connectors, bolt groups and welds exist. Don't build
   one from scratch. In order of preference:
   - the user's own file: set the connection up in Connection Design and click **Download JSON
     File** (Project tab, or **File > Download JSON File**);
   - the closest file in [Worked examples](#worked-examples), if the `modal_data.config` and code match.

   If neither matches the connection the user wants, **ask them to export one from the UI**. Don't
   adapt a file of a different `config`.
2. Change only values: sections, materials, plate/angle sizes, bolt grade/diameter/arrangement,
   weld sizes, loads. Keep every key, including ones that look like UI state.
3. Send `standalone.connection.start` then `standalone.connection.check` in one request. The
   connection JSON **is** the `arguments` object. Don't nest it under another key.
4. Check `response.status`. On `1`, read `errors` (see [Errors](#errors)) and fix the input.
5. Scan `results_array` for the governing `ratio` (see [Reading the response](#reading-the-response)).

```json
"functions": [
  { "function": "standalone.connection.start", "arguments": { "keep_open": true } },
  { "function": "standalone.connection.check", "arguments": { "modal_data": { "...": "..." }, "assembly": { "...": "..." }, "fixtures": { "...": "..." }, "loads": { "...": "..." }, "project_details": {}, "analysis": {}, "data_version": 3 } }
]
```

A check takes **about 10–20 s** and uses **one API credit**, even when it fails on input errors.

## Gotchas

- **`value` is the capacity** in `results_array`. There is no `capacity` key on a check. (Inside
  `detailing_items` it *is* called `capacity`.)
- **Header rows have strings, not numbers.** Multi-part configurations (bracing) put rows like
  `{ "name": "Upper Brace Connection to Gusset Plate", "value": "header", "demand": "header", "ratio": "header" }`
  between groups of checks. Filter on `typeof ratio === 'number'` before taking a max.
- **There is no pass/fail field.** Compare each `ratio` with `loads.utility_ratio_limit` (normally `1`).
- **`ratio: 1` on a *Connection Detailing Limitations* row is at the limit, which still passes.**
  The row's ratio is its worst `detailing_items` entry. Look in `detailing_items` for the rule that sets it.
- **Changing only `<member>_section` is enough.** Verified: changing `beam_section` from `W12x14` to
  `W18x50` without touching `beam_dims` moved the beam-web bearing capacity by exactly the web-thickness
  ratio (20.7 → 36.8 kip). Geometry is re-read from the library by name, which must match exactly.
- **Load values are strings**, and one field can hold several comma-separated values: `"49,-49"`
  checks the brace in both tension and compression (verified: tension and compression checks both
  ran at 49 kip).
- **Not every bad input is reported.** A blank bolt `diameter` was not listed in `errors` (only the
  blank section was). Confirm a changed value actually moved the capacity you expected.
- **Interaction checks are unitless.** They have no `demand_units` / `capacity_units`.
- **AISC edition:** `aisc_edition` is the edition the solver actually ran (`"360-22"`, `"360-16"`).
  If it differs from `modal_data.code`, `api_warnings` says so. Report it.
- **Report URLs are temporary** (`solver.skyciv.com/temp/...`).
- **Strip `screenshot` before logging a failure.** `status: 1` responses carry a base64 PNG of the UI.

## Input: the connection JSON

Top-level keys. All are required.

| Key | Type | Description |
|---|---|---|
| `modal_data` | `object` | Connection type, code and units, as chosen on the starter. See below. |
| `assembly` | `object` | Members, their sections/materials, and the connectors in `connections`. |
| `fixtures` | `object` | Bolt groups (`bolts`) and welds (`welds`), in the order of `assy`. |
| `loads` | `object` | `loads_arr` (load cases) and `utility_ratio_limit`. |
| `project_details` | `object` | Report strings: `company`, `designer`, `client`, `name`, `id`, `notes`. |
| `analysis` | `object` | `{}` in every export. |
| `data_version` | `integer` | `3`. Keep the exported value. |

### `modal_data`

| Key | Type | Values seen |
|---|---|---|
| `code` | `string` | `"AISC 360-16 ASD"`, `"AISC 360-16 LRFD"`, `"AISC 360-22 LRFD"`, `"AS 4100:2020"`. Copy the exact string from an export. |
| `category` | `string` | `"i-to-i"`, `"bracing"` |
| `type` | `string` | `"shear"`, `"vertical_brace"`, `"horizontal_brace"` |
| `config` / `config_label` | `string` | e.g. `"double-plate-assembly"` / `"Double Plate"`, `"single-angle-assembly"`, `"upper-vertical-brace-double-angle-assembly"`, `"horizontal-brace-with-column-single-angle-assembly"` |
| `orientation` | `string` | `"BCF"`, `"BCW"`, `"BBW"`, `"NA"` |
| `parent_member` | `string` | `"column"` or `"girder"` |
| `unit_system` | `string` | `"English / Imperial"` or `"SI / Metric"` |

### Units

`modal_data.unit_system` sets the units for every input and result value:

| Quantity | `English / Imperial` | `SI / Metric` |
|---|---|---|
| Length | in | mm |
| Force | kip | kN |
| Moment | kip-ft (`kip*ft` in results) | kN-m |
| Stress (`fy`, `fu`, `E`) | ksi | MPa |

### `assembly`

Every member slot is present: `beam`, `left_beam`, `right_beam`, `column`, `lower_column`,
`upper_column`, `girder`, `brace`, `lower_brace`, `upper_brace`, `left_brace`, `right_brace`.
Unused slots are `""` / `{}`.

| Key | Type | Description |
|---|---|---|
| `<member>_section` | `string` | Library name, e.g. `"W18x50"`, `"460 UB 82.1"`, `"L4x4x1/2"`. Find names with [`section-selector`](../section-selector/SKILL.md). |
| `<member>_material` | `object` | `name` (`"A992"`, `"A36"`, `"AS/NZS 3679.1 Gr.300"` …), `E`, and `fy` / `fu` (AISC). |
| `<member>_dims` | `object` | Section geometry (re-read from the section name) plus member options: `clearance`; coping `top_coping_length` / `_depth`, `bottom_coping_length` / `_depth`; braces `brace_slope`, `unbraced_length`, `double_angle`, `equal_legs`, `switch_legs`, `TOS`. Some numbers are strings (`"clearance": "0.5"`). Keep them as exported. |
| `connections` | `array` | Connectors. Plate (`connector: "plate"`): `b`, `h`, `thk`; gussets use `b1`, `h1`, `o1`, `b2`, `h2`, `o2`. Angle (`connector: "section"`): `angle_section`, `length`, `equal_legs`, `switch_legs`, `dims`, `points`. Both: `name`, `material`, `fy`, `fu`. |

### `fixtures`

| Key | Type | Description |
|---|---|---|
| `assy` | `array` | Bolt group and weld names for this `config`, in order. |
| `bolts` | `array` | One entry per `assy` item (`{}` where the item is a weld): `name`, `material` (`"A325N"`, `"A325-SC(A)"`, `"A490N"`, `"A490-SC(A)"`, `"8.8/S"` …), `diameter` (`"3/4 in"`, `"1 in"`, `"M20 mm"`), `arrangement` (`"rows x columns"`, e.g. `"4x1"`), `edge`, `row` (row spacing), `column`, `gage`, `Lev` / `Leh`, `hole_type_member` / `hole_type_connector` (`"STD"`, `"OVS"`, `"HSSL"`, `"Nominal"` …), `fnv` / `fnt`, `dims`. |
| `welds` | `array` | One entry per `assy` item (`{}` where the item is a bolt group): `name`, `material` (`"E70XX"`), `fnw`, `size`, `field_weld` (`"YES"` / `"NO"`), `sides`, and config-specific keys (`length`, `plate1_weld_size` …). |
| `bolt_geometry`, `weld_laps`, `active_*`, `tab_is_active` | — | Lookup tables / UI state. Keep them as exported. |

### `loads`

| Key | Type | Description |
|---|---|---|
| `utility_ratio_limit` | `number` | Pass/fail ratio limit (`1`). |
| `loads_arr` | `array` | Cases: `id`, `type` (`"DL"`), and **string** forces. `fx`, `fy`, `fz`, `mx`, `my`, `mz` are the beam end forces (`fy` = beam end shear, `fx` = beam axial in the samples). Member forces: `brace_axial`, `upper_brace_axial`, `lower_brace_axial`, `left_brace_axial`, `right_brace_axial`, `column_axial`, `column_moment`, `branch_axial`, `branch2_axial`, `chord_axial`, `chord_moment`. Only the forces that apply to the `config` are used. |

Give design-level forces: factored for LRFD / AS 4100, service-level combinations for ASD.

## Reading the response

`response.data`:

| Key | Description |
|---|---|
| `results_array` | Every check (below). |
| `report_links` | `html_view_link`, `html_download_link`, `pdf_download_link`, and `no_drawing.{html,pdf}_download_link`. |
| `summary_report_links` | Same, for the summary report. |
| `svg_drawings` | Array of SVG strings (detailing drawings). Large: 10–60 KB each. |
| `aisc_edition` | AISC only: edition the solver ran. |
| `api_warnings` | Present only when there's something to note (e.g. edition mismatch). |

Check items: `name`, `demand`, `value` (capacity), `ratio`, `con_id`, `demand_units`,
`capacity_units`, and on detailing rows `detailing_items[]` (`name`, `limit_type` `min`/`max`, `limit`,
`actual`, `units`, `demand`, `capacity`, `ratio`). The set and names of checks depend on code, `config`
and which loads are non-zero. AISC names start "Design …" (LRFD) or "Allowable …" (ASD). Never look up
a fixed name. Scan:

```js
const rows = res.response.data.results_array;
let section = '';
const checks = [];
for (const r of rows) {
  if (r.ratio === 'header') { section = r.name; continue; }
  checks.push({ section, ...r, capacity: r.value });
}
const limit = 1; // loads.utility_ratio_limit
const governing = checks.reduce((a, c) => (!a || c.ratio > a.ratio ? c : a), null);
const passes = checks.every(c => c.ratio <= limit);
```

## Errors

On `status: 1`, `errors` holds the reason:

| `errors` | Cause |
|---|---|
| `["modal_data.code is missing."]` (also `type`, `config`, `unit_system`, or a missing `assembly` / `fixtures` / `loads`) | The file's shape is wrong. Nothing was loaded. Verified. |
| `["Beam: Section"]`, `["Fixture 2: Bolt Diameter"]` | `"<group>: <field>"`: the same fields the UI's *Invalid Input* alert lists. Verified for a blank `beam_section`. |
| server message, sometimes with `response` | The solver job failed. |

`warnings` such as "the connection data is still loading" are not failures. The check runs anyway.

## Feeding S3D results into a connection check

1. Solve the frame in [`s3d-api`](../s3d-api/SKILL.md) (its own session, a separate request) and
   read member end forces as described in [`analysis-results`](../analysis-results/SKILL.md).
2. For each design combination, take the supported member's end forces at the connection and write
   one `loads_arr` entry: beam end shear → `fy`, beam axial → `fx`, brace axial → the matching
   `*_brace_axial`. Convert to the file's units, and keep the values as strings.
3. **Confirm the sign before trusting it.** The S3D local-axis convention is not mapped to these fields
   in this skill. When the sign of an axial force is uncertain, send both (`"49,-49"`).
4. Use [`section-selector`](../section-selector/SKILL.md) for exact section names, and hand the
   results to [`qa-engineer`](../qa-engineer/SKILL.md) for review.

## Worked examples

Request/response pairs verified against the live API on 2026-11-10 (the SVG drawings in the
responses are trimmed). Each `input.json` is the `arguments` object.

| Code | Type / config | Governing check | Files |
|---|---|---|---|
| AISC 360-22 LRFD | `shear` / `double-plate-assembly`, W12x14 to W18x35 girder, `fy = 12` kip | Detailing at beam side 1.000; strength 0.938 (required weld to develop plate) | [`input.json`](sample-api/aisc360-22_lrfd_shear_double_plate/input.json), [`response.json`](sample-api/aisc360-22_lrfd_shear_double_plate/response.json) |
| AISC 360-22 LRFD | `vertical_brace` / `upper-vertical-brace-double-angle-assembly`, `upper_brace_axial = "49,-49"`, `fx = "132,-132"`, `fy = 38` | Detailing 1.000; strength 0.974 (double angle shear at support) | [`input.json`](sample-api/aisc360-22_lrfd_vbrace_double_angle/input.json), [`response.json`](sample-api/aisc360-22_lrfd_vbrace_double_angle/response.json) |
| AISC 360-16 ASD | `horizontal_brace` / `horizontal-brace-with-column-single-angle-assembly`, `brace_axial = "34,-34"` | 0.877 (gusset buckling) | [`input.json`](sample-api/aisc360-16_asd_hbrace_single_angle/input.json), [`response.json`](sample-api/aisc360-16_asd_hbrace_single_angle/response.json) |
| AS 4100:2020 | `shear` / `single-angle-assembly`, 460 UB 82.1 to 310 UC 158 flange, `fy = 150` kN | 0.933 (detailing); strength 0.579 (angle shear) | [`input.json`](sample-api/as4100-2020_shear_single_angle/input.json), [`response.json`](sample-api/as4100-2020_shear_single_angle/response.json) |
