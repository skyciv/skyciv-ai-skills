---
name: build-quick-design-calculator
description: "Use when building, editing or debugging a SkyCiv Quick Design calculator — the config.json / calculate.js / ui.js / docs.md / s3d_integration.js 'calc pack' uploaded to the SkyCiv Build Your Own Calculator builder. Covers the config.json input-form schema (number, dropdown, section, table, canvas, div elements, visible_variables show/hide logic, settings), the calculate.js contract and its server-side globals (REPORT, ReportHelpers, SVGCreator, SectionProps, Database, requireUtil, callQDCalculator, logger, warn, ERROR), the results object and PASS/FAIL utility boxes, report and MathJax formula writing, automatic metric/imperial conversion, SVG graphics in ui.js, and batch S3D integration. Trigger even without the words 'Quick Design' — e.g. 'build my own engineering calculator', 'make a web calculator for this design check', 'my calc pack report won't render', 'add an input to the config', 'my formula prints NaN'. NOT for calling an existing published calculator by UID over REST — that is run-quick-design."
metadata:
  argument-hint: "What to build or fix, e.g. 'a purlin check calculator' or 'formula() prints NaN'"
  builder: https://platform.skyciv.com/quick-design?uid=build
  docs: https://skyciv.com/api/v3/docs/quick-design/
---

# Build a Quick Design Calculator

SkyCiv **Quick Design** turns a small bundle of files — a **calc pack** — into a hosted calculation
tool. SkyCiv generates the UI from your `config.json`, runs `calculate.js` on its servers, and
handles reporting, units, PDF export, batch runs and (optionally) Structural 3D integration.

> **Prerequisite / boundary:** this skill is for **authoring** a calculator. The pack is uploaded as a
> folder at [platform.skyciv.com/quick-design?uid=build](https://platform.skyciv.com/quick-design?uid=build)
> (*Build Your Own Calculator* → *Upload Code*). No API key, session or `{ auth, options, functions }`
> envelope is involved — [`skyciv-api-v3`](../skyciv-api-v3/SKILL.md) does not apply. To **call an
> already-published** calculator by UID over REST, use [`run-quick-design`](../run-quick-design/SKILL.md).

---

## Calc pack layout

| Path | Purpose |
|---|---|
| `config.json` | **Required.** Metadata + every input variable; the UI form is generated from it. A minimal pack is just this plus `calculate.js`. |
| `calculate.js` | **Required.** Server-side logic: takes the input JSON, writes the report, returns `{ report, results }`. |
| `ui.js` | Client-side; draws into the `canvas`/`div` elements declared in the config. |
| `docs.md` | Documentation tab — overview, assumptions, changelog. |
| `s3d_integration.js` | Puts the calculator in Structural 3D, batch-running over model members. |
| `renderer.js` | Adds a SkyCiv 3D Renderer panel. |
| `utils/*.js` | Shared modules via `requireUtil('name.js')`. Must use `module.exports`. |
| `json/*.json`, `csv/*.csv` | Lookup data via `requireJSON()` / `requireCSV()`. |
| `images/*` | Served from the pack; reference as `/name.png`. |
| `metric/` or `imperial/` | **Manual** dual-unit packs only — see [Units](#units). |
| `test_files/Test N/` | Builder regression tests: `input.json` + `expected_return.json`. |
| `unit_tests/**/*.test.js` | Local Jest tests over `utils/`; not uploaded. |

## Build workflow

1. **Nail the inputs first.** Each `input_variables` key is both a form field and a destructured
   variable in `calculate.js` — that key is the contract between the two files. If a required
   engineering input is missing (site data, design code, material grade), ask rather than inventing
   a default.
2. **Write `calculate.js`** — destructure, compute, report as you go, return `{ report, results }`.
   Then add `ui.js`, `docs.md`, and `test_files/Test N/` pairs plus Jest tests over `utils/`.
3. **Upload and run as a Draft**, reading the log panel for `logger()` output. Add
   `s3d_integration.js` last, if it should batch-run over an S3D model.

---

## `config.json`

```json
{ "meta": { }, "input_variables": { }, "settings": { } }
```

### `meta`

Required: `name`, `short_description`, `long_description`, `tags` (comma-separated), `access`
(`"public"` / `"private"` — keep private until published), and `contact` (only its `email` is
mandatory; also takes `name`, `role`, `company`, `logo`, `custom_header_html`). Optional:
`default_unit_system` (`"metric"` / `"imperial"`, enables **automatic** conversion — see
[Units](#units)) and `s3d_integrated`. The templates also carry `category: "analysis"`, which isn't
in the published meta table — safe to include, don't rely on it.

### `settings` (optional, top level)

Report-level switches — `report_heading`, `include_input_table`, `split_input_table_by_headings`,
`include_summary_table`, `include_marketing`, `disable_batch_run`, `beta_calculation`,
`show_analysis_loader`, and `skip_rounding` (turn on while QA'ing, so values match a hand calc).
Full list in `quick-design-config.md`.

### `input_variables` elements

Order in the JSON = order on the form. Each key is the variable name passed to `calculate.js`.

| `type` | Notes |
|---|---|
| `number` | `units`, `symbol` (MathJax), `default`, `min`, `max`, `step`, `integer`, `nullable`, `class`. |
| `text`, `checkbox` | `default`. |
| `dropdown`, `radio` | `options: [{ name, value, selected }]`; dropdown also `multiple`, `nullable`. |
| `section` | Section-library dropdown: `country`, `library`, `shape` (string or array), `shape_label_append`, `custom_option`, `default`. |
| `s3d_section` | S3D only — passes the model's section object through. |
| `table` | Spreadsheet popup: `table.columns[]` with `cell_type` `input_text`/`dropdown`/`checkbox`, plus `min_rows`, `max_rows`, `default_data`, `pagination`. |
| `button` | Needs an `id` to bind to in `ui.js`. |
| `heading`, `subheading` | `collapsed: true` starts folded. |
| `image` | `src` (URL or `/name.png`), `width`, `qd_center`. |
| `canvas`, `div` | Empty graphic target with an `id`; `div` + `qd_center: true` is the usual choice for SVG. |
| `message_banner` | Banner you write into from `ui.js`. |

Modifier keys on any input: `hidden`, `hidden_all`, `disabled`, `s3d_only`, `hide_in_s3d`,
`disable_in_s3d`, `exclude_from_input_table`, `highlight_row`, `hide_units_label`, `batch_skip`,
`display_units`, `label_table`, `info_table`, and `combine_with` (+ `combined_label`,
`combined_tooltip`) to pair two fields on one row. Validation against another input: `greater_than`,
`less_than`, `greater_than_or_equal`, `less_than_or_equal`, `equal_to`.

### Show/hide logic

`visible_variables` on a `dropdown`, `checkbox` or `radio` drives the rest of the form. Keys are the
option `value`; for checkboxes they are literally `checked` / `unchecked`.

```json
"calculate_deflection": {
  "type": "checkbox", "label": "Calculate Deflection", "default": false,
  "visible_variables": {
    "checked":   [["show", "E"], ["show", "I_z"]],
    "unchecked": [["hide", "E"], ["hide", "I_z"]]
  }
}
```

Targets: `"all"`, an input key, or a CSS class (`".circular-input"`, matching an input's `class`).

### Minimal complete config

```json
{
  "meta": {
    "name": "Simply Supported Beam", "short_description": "UDL beam actions.",
    "long_description": "Peak reaction and moment for a UDL on a simple span.",
    "tags": "beam, analysis", "access": "private", "default_unit_system": "metric",
    "contact": { "name": "SkyCiv", "email": "support@skyciv.com" }
  },
  "input_variables": {
    "ui_div":   { "type": "div", "id": "ui-div", "qd_center": true },
    "geometry": { "type": "heading", "label": "Geometry" },
    "L": { "type": "number", "label": "Span", "symbol": "L", "units": "m", "default": 6 },
    "w": { "type": "number", "label": "UDL", "symbol": "w", "units": "kN/m", "default": 2 }
  }
}
```

---

## `calculate.js`

The matching logic file — destructure the same keys, compute, report, return:

```js
module.exports = async function (input_json) {   // async only if you await
    let { L, w } = input_json;                   // keys come from input_variables
    ReportHelpers.printInputSummary();

    const M = ReportHelpers.formula({
        formula: "M = w * Math.pow(L, 2) / 8",
        variables: { w, L: { value: L, unit: "m" } },
        units: "kN-m", dec_places: 2, intermediate_result: true, reference: "Statics"
    });

    return {
        report: REPORT,
        results: {
            actions: { label: "Design Actions", units: "heading" },
            M:  { label: "Peak Moment", value: M, units: "kN-m" },
            ur: { label: "Bending Utility", value: M / 120, units: "utility" }
        }
    };
};
```

`input_json` also carries a platform-injected `project_details` object (company, name, designer,
id, client, notes) — ignore it unless the report needs it.

### Server-side globals

| Global | Use |
|---|---|
| `REPORT` | `REPORT.block.new(title, size)` / `.addCalculation()` / `.addResult()` / `.finish()`, `REPORT.section.break()`. |
| `ReportHelpers` | High-level report writing — see [Reporting](#reporting). |
| `PrettyPrint.pretty_print` | `.print()`, `.prettyResults(value, units, sig_figs)`, `.numberWithCommas()`. |
| `SVGCreator` | Build an SVG string and print it into the report. |
| `SectionProps` | `ISectionProperties(d, b, t_f, t_w, r, region)` etc → A, Cy/Cz, I, Z, S, J, Iw, shear areas. `region`: `AS` (default), `EN`, `US`, `CA`. |
| `Database` | `await Database.getSection(JSON.stringify([country, library, shape, name]), unit_system)`, `.getShapesList()`, `await Database.getMaterial([...])`. |
| `config_json` | Your own config, e.g. `config_json['L']['units']`. |
| `requireJSON` / `requireUtil` / `requireCSV` | Load from `json/`, `utils/`, `csv/`; nested paths work. Parse CSV with `CSV.csvToJSON()` / `CSV.csvToNestedJSON()`. |
| `callQDCalculator` | `await callQDCalculator(uid, input_obj)` — chain another published calculator. |
| `state` | Shared mutable object, readable/writable from any `utils/` module. |
| `logger` / `logVariables` | `logger("E = " + E)`, `logVariables({shape, alloy, Mz})` → builder log panel. |
| `warn` / `ERROR` | `warn(msg, add_block_to_report, reference)`; `return ERROR(msg, title)` to fail cleanly. |

### Output object

`{ report: REPORT, results: {...} }`, optionally plus `s3d_model` (offers an "open in S3D" link),
`summary_report_settings`, and `settings` (`note_style`, `show_log`, `show_feedback`). Each result
accepts `label`, `value`, `units`, `results_label`, `info`, `note`, `hidden`, `paid_only`,
`standout`, `round`, `integer`, `hide_in_s3d`, `s3d_symbol`/`s3d_info`, `batch_symbol`/`batch_info`.
Special `units` values change the rendering:

| `units` | Renders as |
|---|---|
| `"utility"` | PASS/FAIL box: `< 0.95` green PASS, `0.95–1.0` orange WARN, `>= 1` red FAIL. |
| `"utility_status"` | The value with an adjacent PASS/FAIL tag. |
| `"utility_boolean"` | PASS when `value = 1`, FAIL when `0`. No warn state. |
| `"heading"` | Group heading in the results panel (`label` only, no `value`). |
| `"custom_box"` | Free text — add `"color": "#289DCC"`; `"warning_box"` is the pre-styled variant. |
| `"error"`, `"price"`, `"price_euro"` | Error box; currency values. |

Brand colors: red `#DB2828`, green `#21BA45`, orange `#F2711C`.

---

## Reporting

All write into the global `REPORT`. Signatures and screenshots: `quick-design-reporting.md`.

- **Structure** — `heading(text, size, ref)`, `pageBreak()`, `subBreak()`, `padding()`, and
  `customFullBlock({ title, content })` (build `content` from the `*HTML()` variants).
- **Maths** — `formula({ formula, variables, units, dec_places, intermediate_result, reference,
  compact, print_result_as_utility, expected_result })` is the workhorse: it evaluates the
  expression, prints equation → substitution → result, and **returns the number**.
  `printMathjax(expr, left, right)` covers what `formula()` can't (braces, `min`/`max`, `\\sqrt`).
  `round(value, dp)` is NaN-safe and returns a number. `convert(value, from, to)` converts units.
- **Text and results** — `print(left, body, right)` (HTML, `[math]…[math]`, `**bold**`),
  `lineResult(label, symbol, value, ref, result)`, `printStatus(ratio, use_existing_block)` /
  `printCustomStatus(text, use_block, color)` for PASS/FAIL chips, `messageBox()`, `list()`.
- **Data and graphics** — `quickTable(rows, options)` with `merge_left`/`merge_up`, `widths`,
  `text_aligns`, `cell_backgrounds` (+ `tableColorCritical()` / `tableColorUtility()`);
  `drawGraph({...})` for SFD/BMD-style plots (nested sub-array = step change); `image({ src })`.
- **Summary report** — `addKeyImage()` and `addIntermediateResults()`, configured via
  `summary_report_settings` in the output object.

---

## Units

**Automatic (preferred).** Set `meta.default_unit_system` to `"metric"` or `"imperial"`. The platform
converts inputs, results and report units — including `mm^2` / `mm^3` superscripts — and
`calculate.js` always receives the declared base system. Per-input overrides: `convert_to`,
`converted_default`, `converted_step`. Use these exact unit strings, or conversion silently fails:

| Quantity | Metric | Imperial |
|---|---|---|
| Length | `mm`, `cm`, `m` | `in`, `in`, `ft` |
| Force | `kN` | `kip` |
| Moment | `kN-m` | `kip-ft` |
| Stress / pressure | `Pa`, `kPa`, `MPa` | `psi`, `psi`, `ksi` |

**Manual.** Omit `default_unit_system` and add a `metric/` or `imperial/` folder with its own
`config.json` + `calculate.js`; `json/` and `utils/` are shared, `ui.js`/`docs.md`/`renderer.js` may
be either. Only worth it when the two systems need different logic or reporting.

---

## `ui.js` — live graphics and dynamic form control

Re-run client-side on every input change. Two equivalent ways to read the form, both current:

```js
var input  = SKYCIV_DESIGN.generateInput(true);   // converted to the base unit system
var labels = SKYCIV_DESIGN.generateInput(false);  // raw, as displayed — for dimension text
// equivalent, and what the shipped templates use:
// var input = SKYCIV_DESIGN.designConfig.getInput();
```

For dual-unit calculators compute from the converted values, label with the displayed ones, and
branch on `SKYCIV_DESIGN.units.getCurrentUnitSystem() == 'imperial'`.

Draw with `SVGCreator` into a `div` whose `id` matches the config: `initialize({ total_height,
total_width, center })` → `addRect`/`addLine`/`addCircle`/`addText`/`dimLineDrawer` → `endSVG()` →
`getSVGHtml()` into `innerHTML`. Size everything off `jQuery('#ui-div').width()` so it scales;
`assets/example-project/ui.js` is a complete worked load diagram to copy. For loads, bolts, axes,
concrete sections and steel profiles, see the SVG and section docs in the reference table.

`SKYCIV_DESIGN.ui.helpers.*` drives the form — `setInputValues(obj)`, `showInput`/`hideInput`/
`setInputDisabled`, `updateDropdownValues`, `updateMin`/`updateMax`/`updateStep`, `updateLabel`/
`updateTooltip`/`updateImage`, table column/cell enable-disable, async `getSection`/`getMaterial`/
`getSectionTree`/`getMaterialTree`, and `wasInputChanged(key)` so you redraw only what changed.
Full list: `quick-design-ui-helpers.md`.

---

## `s3d_integration.js` — batch-run over a Structural 3D model

`module.exports = function (s3d_model, analysis_results) { ... }` returns an **array of input
objects**; each entry is run through `calculate.js` as one batch row. Throw if
`!analysis_results` (model not solved) or if no members qualify — that message is what the user sees.

Iterate `s3d_model.elements` (**not** `.members` — this file uses the UI model format) and convert
every value with `UnitHelpers.convert(value, s3d_model.settings.units.<quantity>, "<target>")`, since
model units vary. Force helpers: `StructureHelpers.getDesignForces(analysis_results)` (worst +/− per
member per action with the governing load combination), `.getMemberLength(model, id, offsets)`, and
`.ezDesignForces(analysis, model, action_list, include_lc)` (max/min/abs_max per action — express
when `include_lc = false`, per-station per-combination when `true`). Result keys `s3d_symbol` /
`s3d_info` control the S3D results table.

Test by saving a Draft and running `S3D.quick_design.import("my-uid")` in the S3D console. Full
worked aluminium integration: `quick-design-s3d.md`.

---

## Testing

**Platform regression tests** — `test_files/Test 1/`, `Test 2/`, … each holding `input.json` (a full
input JSON as the calculator receives it, including `project_details`) and `expected_return.json`
(the expected `results` object). The builder replays these against the pack. Add a case per branch —
each dropdown option, each `visible_variables` path — and regenerate expectations whenever the
results object changes.

**Jest unit tests** — move the maths into `utils/*.js` with `module.exports`, then
`npm install --save-dev jest`, add `"test": "jest"` to `package.json`, and write `*.test.js` under
`unit_tests/`. Cover boundaries, sign changes, division by zero and very large/small inputs.
Passing tests prove the code, not the engineering.

---

## Gotchas

- **`^` is XOR in JavaScript, not a power operator.** It silently produces garbage both in
  `ReportHelpers.formula()` strings and in plain JS. Use `Math.pow(x, n)` (or `**` outside `formula()`).
- **Never `throw new Error` in `calculate.js`** — `return ERROR(msg, title)` instead. The opposite
  applies in `s3d_integration.js`, where `throw new Error(...)` *is* how you report an unsolved model
  or no eligible members.
- **`ReportHelpers.formula()` can't handle `{}`** and must **not** be wrapped in `[math][math]` tags;
  either stops it evaluating. Use `printMathjax()` or `REPORT.block.addCalculation()`.
- **Escape backslashes in MathJax strings** — `'\\frac{a}{b}'`, not `'\frac{a}{b}'`. QD's MathJax
  renders `/` as `\\`, so follow `quick-design-reporting.md`, not upstream MathJax docs.
- **`ui.js` must use `var` at top level** — `let`/`const` throw console errors because the file is
  re-executed on every input change. They're fine inside functions.
- **Rebind buttons defensively** — `jQuery("#reset").unbind("click").click(...)`, or handlers stack up.
- **Setting a dropdown from `ui.js` re-triggers `ui.js`** — set `window.SKIP_UI_UPDATE = true`
  around the update, or it loops.
- **`s3d_integration.js` uses the UI model format** — `s3d_model.elements`, not `s3d_model.members`.
  The most common integration bug.
- **Unit strings are matched literally** — `"kN-m"` converts, `"kNm"` / `"kn-m"` / `"kN.m"` do not.
  Same for `mm^4`-style superscripts.
- **`calculate.js` must be `async`** if you `await` anything (`Database.*`, `callQDCalculator`).
  Forgetting yields `undefined` / `[object Promise]` results rather than an error.
- **A `canvas`/`div` `id` in `config.json` must match `getElementById` in `ui.js`**, and must exist
  in `input_variables`, or the graphic never appears.
- **`calculate.js` runs on SkyCiv's servers** — no browser console. `logger()` and
  `logVariables({...})` write to the builder's log panel; use them liberally.
- **`assets/example-project/` sample outputs are off by 1000** on `Peak_Moment` (9000 vs 9 kN-m for
  w = 2 kN/m, L = 6 m) and label moments `kNm`, not `kN-m`. Use it as a structural template only.

---

## Reference documentation

Bundled under `assets/documentation/`. Load one only when you reach that step.

| Load when… | File (`assets/documentation/…`) |
|---|---|
| Any `config.json` field | `quick-design-config.md` |
| `calculate.js` — output object, PrettyPrint, errors, logging | `quick-design-calculate.md` |
| Report formatting — blocks, formulas, tables, graphs, status, summary | `quick-design-reporting.md` |
| Metric/imperial or a dual-unit pack | `quick-design-units.md` |
| `ui.js`, or driving the form from it | `quick-design-ui.md`, `quick-design-ui-helpers.md` |
| SVG — basics, then loads/bolts/axes/concrete sections | `quick-design-svg.md`, `quick-design-svg-extended.md` |
| A steel section profile, or properties of a custom shape | `quick-design-sections.md`, `quick-design-section-props.md` |
| Sections or materials from the SkyCiv database | `quick-design-sb-integration.md` |
| Structural 3D integration, or the 3D renderer | `quick-design-s3d.md`, `quick-design-renderer.md` |
| `requireUtil` / `requireJSON` / `requireCSV` | `quick-design-advanced.md` |
| Chaining a published calculator, or batch-run columns | `quick-design-integrating-qds.md`, `quick-design-batch.md` |
| Jest unit tests, or a chart | `quick-design-unit-testing.md`, `quick-design-chartjs.md`, `quick-design-plotlyjs.md` |
| The overall file map or publishing info | `quick-design.md` |

Starter code: `assets/project-template/` (skeleton) and `assets/example-project/` (complete beam
calculator with `test_files/` examples).

## Cross-links

- [`run-quick-design`](../run-quick-design/SKILL.md) — call a published calculator by UID over REST.
- [`s3d-api`](../s3d-api/SKILL.md) — `s3d_model` schema, for `s3d_integration.js` and for returning `s3d_model`.
- [`analysis-results`](../analysis-results/SKILL.md) — the `analysis_results` object's shape.
- [`section-selector`](../section-selector/SKILL.md) — `country`/`library`/`shape` for a `section` input.
- [`renderer`](../renderer/SKILL.md) — the viewer used by `renderer.js`.
