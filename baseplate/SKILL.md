# Base Plate Design Agent Skill

You are an agent that designs and checks steel column base plate connections — base
plate, anchor bolts, and welds against the supporting concrete foundation — via the
SkyCiv `standalone.baseplate` API. This skill covers the full `design_obj` input schema,
the response shape, and worked examples for every supported design code.

> **Prerequisite:** Always begin a session with `standalone.baseplate.start` as the first
> function (its own dedicated opener for this namespace, not `S3D.session.start` — see
> "Session Start" below). See the `skyciv-api-v3` skill for auth, options, and the shared
> request/response envelope every other API skill builds on.

> Current implementation notes (from the underlying calculator, not this skill):
> 1. Only a concentric column, base plate, and foundation layout is supported at the moment.
> 2. Only a symmetric anchor layout is supported at the moment.
> 3. The available anchor layout patterns depend on the selected column shape and design code (see "Anchor layout patterns" below).

---

## Session Start

```json
{
  "function": "standalone.baseplate.start",
  "arguments": { "keep_open": true }
}
```

Then submit the design directly as `standalone.baseplate.check`'s arguments — `design_obj`
*is* the arguments object, not nested under another key:

```json
{
  "function": "standalone.baseplate.check",
  "arguments": { "design_code": "American", "support_type": "fixed", "...": "..." }
}
```

If your app also builds/solves an S3D model (e.g. to get real reactions to feed in as
loads — see "Feeding S3D reactions into a base plate check" below), run that as a
**separate session** with its own `S3D.session.start`, the same way `load-gen-api`'s
`standalone.loads` namespace requires its own opener — don't assume different `standalone.*`
namespaces share a session opener with `S3D.model.*` or with each other unless confirmed.

---

## Supported design codes

| `design_code` value | Region | Standards used |
|---|---|---|
| `American` | United States | AISC 360 (steel), ACI 318 (concrete/anchors) |
| `Australian` | Australia/NZ | AS 4100:2020 (steel), AS 3600:2018 / AS 5216:2021 (concrete/anchors) |
| `Canadian` | Canada | CSA S16:19 (steel), CSA A23.3:19 (concrete/anchors) |
| `Europe` | Europe | EN 1993-1-8:2005 (steel), EN 1992-1-1:2004 / EN 1992-4:2018 (concrete/anchors) |

A worked, verified request/response pair for each code lives in
[`sample-api/`](./sample-api/) — `sample-api/<america|australia|canada|europe>/input.js`
(the full request envelope) and `sample-api/<country>/response.json` (the actual API
response) — use these as your starting templates rather than building a `design_obj`
from scratch.

---

## Top-level `design_obj`

| Key | Type | Description |
|---|---|---|
| `design_code` | `string` | `American`, `Australian`, `Canadian`, or `Europe`. |
| `support_type` | `string` | Column base support condition: `fixed` or `pinned`. A `pinned` base with axial-only load skips every anchor-tension/breakout check entirely (see "Response shape" below) — don't expect those keys back for a pinned, axial-only case. |
| `units_data` | `object` | Unit system and conversion factors — see below. |
| `project_details` | `object` | Project metadata (name, company, designer, notes). |
| `steel_parts` | `object` | Column, base plate, and concrete foundation geometry/material — see below. |
| `anchors` | `object` | Anchor bolt layout, dimensions, and material — see below. |
| `welds` | `object` | Weld geometry and material — see below. |
| `loads` | `array` | Load cases (axial, shear, moment) — see below. |
| `factors` | `object` | Resistance/reduction factors — **keys depend on `design_code`**, see below. |
| `detailing` | `object` | Optional detailing checks — see below. |
| `design_settings` | `object` | Design assumptions/analysis options — see below. **Only change these with review from a suitably qualified engineer**, they can materially change results. |
| `version` | `integer` | Input schema version. Use `2`. |

---

## `units_data`

| Key | Type | Description |
|---|---|---|
| `first_init` | `boolean` | Whether this is the first initialization of the model. |
| `units` | `string` | `metric` or `imperial`. |
| `units_length` | `string` | `mm` or `in`. |
| `axial_f_units` | `string` | `kN` or `kips`. |
| `units_strength` | `string` | Concrete strength unit: `MPa` or `psi`. |
| `units_strength_steel` | `string` | Steel strength unit: `MPa` or `ksi`. |
| `bending_f_units` | `string` | `kN-m` or `kip-ft`. |
| `length_factor` / `strength_factor` / `strength_factor_steel` | `number` | Scale factors for unit conversion. |
| `to_mm` / `to_in` / `kNm_Kipft` / `kN_Kip` | `number` | Conversion factors. |

For a metric request, these are always `1` except `strength_factor`/`strength_factor_steel`
(`0.00689476`/`6.89476` — MPa-per-psi conversion constants, present even in metric
requests). For an imperial request (see the American sample doesn't use one, but the
pattern is) `length_factor` becomes `25.4` (mm-per-inch). Copy the values from the sample
matching your target unit system rather than deriving them.

---

## `project_details`

| Key | Type | Description |
|---|---|---|
| `project_units` | `string` | `metric` or `imperial`. |
| `company` / `designer` / `project_name` / `project_id` / `project_notes` / `client` | `string` | Project metadata, all optional (empty string if unused). |

---

## `steel_parts.data`

| Key | Type | Description |
|---|---|---|
| `custom-column-fy` / `custom-column-fu` | `number` | Column yield/ultimate strength — used only when `steel-column-material` is `Custom`. |
| `custom-bp-fy` / `custom-bp-fu` | `number` | Base plate yield/ultimate strength (same `Custom`-only caveat). |
| `custom-conc-fc` | `number` | Concrete compressive strength (used when foundation material is `Custom`). |
| `use-cracked-concrete` | `boolean` | Whether cracked-concrete behavior is assumed. |
| `steel-column-shape` | `string` | `i-shape`, `pipe`, or `rectangular`. |
| `steel-column-database` | `string` | Section database name — **must match the database name shown in SkyCiv Section Builder** (see `section-selector` skill). For `Europe`, both European and British databases are usable. |
| `steel-column-profile` | `string` | Section/profile name — must match the profile name shown in Section Builder. |
| `steel-column-material` | `string` | Column steel grade — see materials list below. |
| `steel-column-height` | `number` | Column height — only used in the `Europe` workflow. |
| `steel-baseplate-width` / `-height` / `-thickness` | `number` | Base plate geometry. |
| `steel-baseplate-material` | `string` | Base plate grade — see materials list below. |
| `steel-baseplate-grouting-thickness` | `number` | Grout thickness. |
| `grout-material-selected` | `string` | `Europe`/Canadian workflow only: `less-than-30` (grout < 30 MPa) or `greater-than-30`. |
| `steel-foundation-material` | `string` | Foundation/concrete grade — see materials list below. |
| `steel-foundation-width` / `-height` / `-thickness` | `number` | Foundation geometry. |

### Column / base plate materials by design code

- **American**: `A36`, `A53 grB`, `A500 grB`, `A500 grC`, `A501 grA`, `A501 grB`, `A529 gr50`, `A529 gr55`, `A709 gr36`, `A1043 gr36`, `A1043 gr50`, `A1085 grA`, `A572 gr42/50/55/60/65`, `A618 grI/II/III`, `A709 gr50/50S/50W`, `A913 gr50/60/65/70`, `A992`, `A1065 gr50/50W`, `A242 gr42/46/50`, `A588`, `A847`, `Custom` (column). Base plate list is similar but distinct — see the full lists in `cad.md`-style detail below if the exact grade matters, or just copy from the matching country sample.
- **Australian**: I-shape `AS/NZS 3679.1 Gr. 350/300`; welded `AS/NZS 3679.2 Gr. 400/350/300`; HSS `AS/NZS 1163 Gr. C450/C350/C250`; all plus `Custom`.
- **Europe**: `S235`, `S275`, `S355`, `S460`, `S275N`, `S355N`, `S420N`, `S460N`, `S275M`, `S355M`, `S420M`, `S460M`, `Custom`.
- **Canadian**: `230G`, `350G`, `400G`, `260W`, `300W`, `350W`, `380W`, `400W`, `480W`, `550W`, `260WT`…`550WT`, `350R`, `350A`…`550A`, `350AT`…`550AT`, `700Q`, `700QT`, `Custom`.

> The American, Australian, and Canadian lists above are shared between column and base
> plate material dropdowns; full base-plate-specific grade lists (which differ slightly,
> e.g. American base plates also allow `A283 grC/grD`, `A1066 gr50-80`, `A514 gr90/100`,
> `A709 grHPS 50W/70W/100W`, `A852`) are the authoritative source if you need an exact
> match — when unsure, copy the grade used in the matching `sample-api/<country>/input.js`.

### Foundation (concrete) materials by design code

- **American (metric)**: `20.68`, `27.68`, `31.03`, `34.47`, `41.36`, `Custom` (MPa equivalents of 3000-6000 psi).
- **American (imperial)**: `3000`, `4000`, `4500`, `5000`, `6000`, `Custom` (psi).
- **Australian**: `N20`, `N25`, `N32`, `N40`, `N50`, `N65`, `N80`, `N100`, `S28`, `S65`, `Custom`.
- **Europe**: `C12/15` … `C90/105` (standard EN 1992 grades), `Custom`.
- **Canadian (metric)**: `20.68`, `27.68`, `31.03`, `34.47`, `41.36`, `Custom`.

---

## `anchors.data`

| Key | Type | Description |
|---|---|---|
| `custom-anchor-fy` / `custom-anchor-fu` | `number` | Custom anchor yield/ultimate strength (used when `anchor-prop-material` is `Custom`). |
| `anchor-pattern` | `string` | Layout pattern — availability depends on `steel-column-shape`, see below. |
| `anchor-prop-diam` | `string` | Anchor diameter — see list below. |
| `anchor-prop-material` | `string` | Anchor material grade — see list below. |
| `anchor-thread-included` | `string` | Thread-inclusion option (`American`/`Canadian` workflows). |
| `anchor-web-bending` | `string` | `web-bending` or `flange-bending` — for I-section columns with anchors near the web. Not used for `Europe`. |
| `use-welded-plate-washers` | `boolean` | Whether welded plate washers are used (`American`/`Australian`/`Canadian`). |
| `anchor-plate-washer-thickness` | `number` | Washer thickness, relevant only when the above is `true`. |
| `anchor-prop-length` | `number` | Anchor embedment length. |
| `anchor-hole-clearance` | `string` | `Europe` only: `no-clearance`, `compliant`, or `large`. |
| `anchor-prop-ending` | `string` | End geometry — see accepted values by code below. |
| `anchor-prop-side-dim` | `number` | Embedded plate side dimension/diameter (`rectangle`/`circular` ending only). |
| `anchor-prop-thk-dim` | `number` | Embedded plate thickness (same case). |
| `hook-direction` | `string` | e.g. `inward` — only when `anchor-prop-ending` is `hook`. |
| `anchor-prop-hook-length` | `number` | Hook extension length — only when `anchor-prop-ending` is `hook`. |
| `anchor-numbers` | `number` | Anchors per side for the selected pattern. |
| `anchor-numbers-z` / `-y` | `number` | Anchor count in Z/Y direction (patterns like `All Sides`). |
| `anchor-spacing-z` / `-y` | `number` | Anchor spacing in Z/Y direction. |
| `anchor-edge-distance-z` / `-y` | `number` | Anchor distance from the base plate edge, Z/Y direction. |
| `line-anchor-edge-distance-z` / `-y` | `number` | Edge distance for line anchors (`All Sides`-type patterns). |

### Anchor layout patterns by column shape

| `steel-column-shape` | Available `anchor-pattern` values |
|---|---|
| `i-shape` | `Four Corners`, `Flange Only`, `Web Only` |
| `rectangular` | `Four Corners`, `Top/Bottom Only`, `Left/Right Only`, `All Sides` |
| `pipe` | `Four Corners` |

### Anchor diameters, materials, and end types by design code

| Design code | Diameters | Materials | End types |
|---|---|---|---|
| American | metric `10,12,16,20,22,24,27,30,33,36` or imperial `3/8,1/2,5/8,3/4,7/8,1,1-1/8,1-1/4,1-3/8,1-1/2` | `A307`, `A325`, `A490`, `A36`, `A193 Gr.B7 (105/95/75)`, `A354 Gr.BC/BD (various)`, `A449 Gr.92/81/58`, `A572 Gr.42-65`, `A588 Gr.42/46/50`, `F1554 Gr.36/55/105`, `Custom` | `straight`, `rectangle`, `circular`, `hook` |
| Australian | `M10,M12,M16,M20,M22,M24,M27,M30,M36,M39,M42,M48,M52` | `4.6`, `8.8`, `HR8.8`, `HR10.9`, `Custom` | `straight`, `rectangle`, `circular` (no hook) |
| Europe | `M6,M8,M10,M12,M16,M20,M24,M27,M30,M36,M39,M42,M45,M52` | `4.6`, `4.8`, `5.6`, `6.8`, `8.8`, `10.8`, `12.9`, `Custom` | `straight`, `rectangle`, `circular` (no hook) |
| Canadian | `12,16,20,22,24,27,30,36` (metric-style) | `ASTM F1554 G36/G55/G105`, `ASTM A193`, `Custom` | `straight`, `rectangle`, `circular`, `hook` |

---

## `welds.data`

| Key | Type | Description |
|---|---|---|
| `box-weld-size` | `number` | Weld size for hollow-section (pipe/rectangular) column welds. |
| `input_table_col_weld_size` | `array` | Per-element weld size table for I-shaped columns — see format below. |
| `custom-weld-fexx` | `number` | Custom weld electrode strength (used when `welds-column-mat` is `Custom`). |
| `use_welds_for_comp` | `string` (`"true"`/`"false"`) | If `"true"`, compression transfers through the welds only rather than direct column-to-plate bearing. |
| `as-weld-category` | `string` | `Australian` only: `sp` (Structural Purpose, default) or `gp` (General Purpose) — see AS 4100:2020 Cl. 9.6.1.3. |
| `weld-type` | `string` | `fillet` or `cjp`. |
| `weld-setback` | `number` | Setback distance for clearance near I-shape fillet radii. |
| `welds-column-mat` | `string` | Weld electrode grade — see list below. |

### `input_table_col_weld_size` row format

Each row is `[rowId, elementName, weldSide, weldSize]`, e.g.:

```json
[
  [1, "Top Flange", "Both", 9],
  [2, "Bottom Flange", "Both", 9],
  [3, "Web", "Both", 9]
]
```

`elementName` is typically `Top Flange`, `Bottom Flange`, or `Web`; `weldSide` should be
`Both`. American/Canadian workflows expect a uniform weld size across all three rows.

### Weld electrode grades by design code

- American: `E60xx`…`E120xx`, `Custom`
- Australian: `430`, `490`, `550`, `620`, `690`, `760`, `830`, `Custom`
- Europe: `E35`, `E38`, `E42`, `E46`, `E50`, `Custom`
- Canadian: `E43XX`, `E49XX(-X)`, `E55XX-X`, `E62XX-X`, `E69XX-X`, `E76XX-X`, `E83XX-X`, `Custom`

---

## `loads`

An array of load cases:

| Key | Type | Description |
|---|---|---|
| `lc` | `string` | Load case label. |
| `Nx` | `string` | Axial force — **positive = compression, negative = tension**. Units follow `axial_f_units`. |
| `Mz` | `string` | Strong-axis moment. Units follow `bending_f_units`. |
| `My` | `string` | Weak-axis moment — reserved for future support, not currently used. |
| `Vz` | `string` | Weak-axis shear. Units follow `axial_f_units`. |
| `Vy` | `string` | Strong-axis shear. Units follow `axial_f_units`. |
| `moment_label` | `string` | Which calculation case to use — leave `""` to auto-determine from the given load values. |

> All load values are **strings**, not numbers (e.g. `"Mz": "10"`), matching every sample file — pass numeric values as strings.

---

## `factors`

Resistance/reduction factors — **the required keys depend on `design_code`**. Copy the
full block from the matching country's sample rather than assembling it key-by-key; the
tables below are for reference/tuning specific values.

### American (`AISC`/`ACI`)

| Key | Default | Reference |
|---|---|---|
| `concrete_bearing_factor` | `0.65` | AISC/LRFD |
| `steel_bearing_factor` | `0.75` | AISC/LRFD |
| `steel_flexure_factor` | `0.90` | AISC/LRFD |
| `weld_factor` | `0.75` | AISC/LRFD |
| `steel_tension_factor` | `0.90` | AISC/LRFD |
| `steel_shear_rupture_factor` | `0.75` | AISC/LRFD |
| `anchor_tension_factor` | `0.75` | ACI |
| `anchor_shear_factor` | `0.65` | ACI |
| `anchor_bolts_factor` | `0.75` | AISC/LRFD |
| `concrete_tension_factor` | `0.7` | ACI |
| `concrete_shear_factor` | `0.65` | ACI |
| `concrete_normal_weight_factor` | `1` | ACI |

### Australian (`AS 4100`/`AS 3600`/`AS 5216`)

| Key | Default | Reference |
|---|---|---|
| `concrete_compression_factor` | `0.60` | AS 3600:2018 |
| `steel_bending_factor` | `0.90` | AS 4100:2020 |
| `steel_tension_factor` | `0.90` | AS 4100:2020 |
| `steel_shear_factor` | `0.90` | AS 4100:2020 |
| `weld_factor` | `0.80` | AS 4100:2020 |
| `bolt_in_tension_factor` | `0.80` | AS 5216:2021 |
| `concrete_failure_factor` | `0.6667` | AS 5216:2021 |
| `prying_factor` | `1` | AS 5216:2021 |
| `custom_lever_arm` | `0` | AS 5216:2021 Cl. 4.2.2.4 — `0` = auto-calculate |
| `k7_factor` | `"ductile"` | AS 5216:2021 Cl. 7.2.2.2 — `ductile` ($k_7{=}1.0$) or `non-ductile` ($k_7{=}0.8$) |
| `restraint_factor` | `"no-restraint"` | AS 5216:2021 Cl. 4.2.2.4 — `no-restraint` or `full-restraint` |

### Canadian (`CSA S16`/`CSA A23.3`)

| Key | Default | Reference |
|---|---|---|
| `concrete_factor` | `0.65` | CSA A23.3:19 |
| `steel_factor` | `0.90` | CSA S16:19 |
| `steel_ultimate_factor` | `0.75` | CSA S16:19 |
| `weld_factor` | `0.67` | CSA S16:19 |
| `anchor_rod_factor` | `0.85` | CSA A23.3:19 |
| `anchor_rod_s16_factor` | `0.67` | CSA S16:19 |
| `concrete_normal_weight_factor` | `1` | CSA A23.3:19 |
| `anchors_in_tension_factor` | `0.8` | CSA A23.3:19 — auto-updates with `r_factor_steel` unless `custom` |
| `anchors_in_shear_factor` | `0.75` | CSA A23.3:19 — same auto-update behavior |
| `anchors_in_concrete_failures_factor_tension`/`_shear` | `1` | CSA A23.3:19 — auto-updates with `r_factor_concrete` unless `custom` |
| `r_factor_steel` | `"ductile"` | `ductile`, `brittle`, or `custom` |
| `r_factor_concrete` | `"condition_b"` | `condition_a`, `condition_b`, or `custom` |

### Europe (`EN 1993`/`EN 1992`)

| Key | Default | Reference |
|---|---|---|
| `concrete_factor` | `1.5` | EN 1992-1-1:2004 Table 2.1N |
| `bending_factor` | `1.0` | EN 1993-1-8:2005 Table 2.1 |
| `anchor_shear_factor` | `1.5` | EN 1992-4:2018 Table 4.1 |
| `weld_factor` | `1.25` | EN 1993-1-8:2005 Table 2.1 |
| `custom_lever_arm` | `0` | EN 1992-4:2018 Cl. 6.2.2.3(3) — `0` = auto-calculate |
| `concrete_alpha_factor` | `1.5` | SCI P358 p.241 |
| `concrete_beta_factor` | `0.66667` | EN 1993-1-8:2005 Cl. 6.2.5(7) |
| `concrete_alpha_cc_factor` | `1.0` | EN 1992-1-1:2004 Cl. 3.1.6 |
| `concrete_theta_factor` | `90` | User assumption — max $180°$ |
| `exposure_class` | `"xc4"` | `x0`, `xc1`, `xc2_xc3`, `xc4`, `xd1_xs1`, `xd2_xs2`, `xd3_xs3` |
| `structural_class` | `"s4"` | `s1`…`s6` |
| `countersunk` | `"no"` | `yes`/`no` |
| `cut_threads` | `"no"` | EN 1090 compliance, `yes`/`no` |
| `k7_factor` | `"ductile"` | Same as Australian |
| `k8_factor` | `2` | EN 1992-4:2018 Cl. 7.2.2.4(2) — pryout factor |
| `restraint_factor` | `"no-restraint"` | Same as Australian |
| `design_situation` | `"permanent"` | `permanent`/`accidental` — changes default `concrete_factor` |
| `elastic_modulus_steel` | `210000` | MPa |
| `elastic_modulus_concrete` | `33000` | MPa |
| `rotational_stiffness_lower`/`_upper` | `2`/`30` | Multiplier on $EI/L$ |

---

## `detailing`

Boolean flags for optional detailing checks:

| Key | Description |
|---|---|
| `weld_size` | Weld size vs. code min/max. |
| `anchor_clearance` | Sufficient clearance for washers/nut tightening near welds/geometry. |
| `bp_edge_distance` | Minimum anchor-to-plate-edge distance. |
| `embed_plate` | Embedded plate width/diameter ≥ 4× anchor diameter (`rectangle`/`circular` ending only). |
| `concrete_splitting` | Minimum anchor spacing/cover to reduce splitting risk (not applied for `Australian`). |
| `min_anchors` | Recommends at least 4 anchors total. |

## `design_settings`

**Only change these with review/approval from a suitably qualified engineer** — they can materially change results.

| Key | Description |
|---|---|
| `neglect_concrete_breakout_for_tension`/`_shear` | Skip the concrete breakout check — only valid when separately-checked reinforcement handles load transfer. |
| `neglect_concrete_pryout` | Skip pryout check for slender anchors ($h_{ef} > 12d$) when `true`. |
| `distribute_shear_to_all` | `true` = distribute shear to all anchors (code-based); `false` = only edge-closest anchors (more conservative). American/Canadian mainly. |
| `simplified_approach_shear` | American: simplified ACI grout-pad approach vs. combined shear+axial stress. Canadian: CSA A23.3 method ignoring grout pad thickness plus a shear-strength reduction. |
| `consider_both_directions` | Canadian: check both directions relative to applied moment vs. parallel-only. |
| `include_embedded_head_radius` | Australian/Canadian: include embedded head/plate radius capacity by projecting the breakout surface further. |
| `use_sci_for_welds` | Europe: `true` = SCI P398 approach for moment-loaded welds; `false` = Eurocode 3 approach. |

---

## Response shape

```json
{
  "response": {
    "data": {
      "Weld Capacity": { "demand": 0.104, "capacity": 1.375, "ratio": 0.076, "units_on_UI": "force_per_unit_length", "lc_number": 1 },
      "Concrete Bearing Capacity": { "demand": 22.851, "capacity": 22.851, "ratio": 1, "units_on_UI": "stress", "lc_number": 1 },
      "...": "one entry per applicable check - see below",
      "version": "v2",
      "file_name": "New File",
      "reports": {
        "html_view_link": "https://solver.skyciv.com/temp/view_report_....php",
        "html_download_link": "https://solver.skyciv.com/temp/download_html_report_....php",
        "pdf_download_link": "https://solver.skyciv.com/temp/download_report_....php"
      }
    },
    "msg": "Base plate design complete, returning results",
    "status": 0
  },
  "functions": [ "...same shape repeated per-function, session.start result first..." ]
}
```

**There is no single top-level pass/fail or governing-ratio field.** Every named check
(`"Weld Capacity"`, `"Concrete Bearing Capacity"`, etc.) is its own key in `data`, each an
object with `demand`/`capacity`/`ratio`/`units_on_UI`/`lc_number`. To find the governing
check, scan every key in `data` whose value is an object with a numeric `ratio` — skip
`version`, `file_name`, `reports`, and (Europe only) `rotational_stiffness` — and take the
max, the same "don't guess a fixed key name" pattern used for Quick Design calculator
results in `run-quick-design/SKILL.md`.

**The exact set of check keys returned is dynamic** — it depends on `design_code`,
`support_type`, and the actual load values, not a fixed list:
- A `fixed` support with a real moment (e.g. American/Canadian samples, `Mz: "10"`)
  returns the full set: `Weld Capacity`, `Column Bearing Capacity`, `Concrete Bearing
  Capacity`, `Base Plate Yield Capacity (Bearing Interface)` / `(Tension Interface)`,
  `Anchor Rod Tensile Capacity`, `Concrete Breakout Capacity (Tension Load)`, `Anchor
  Pullout Capacity`, `Embed Plate Flexural Capacity`, `Concrete Side-Face Blowout
  Capacity (Y-Direction)` / `(Z-Direction)`.
- A `pinned` support with **axial-only** load (e.g. Australian/Europe samples, `Mz: "0"`,
  `Nx: "100"`) skips every anchor-tension/breakout-related check entirely — only
  `Concrete Bearing Capacity`-family and `Weld Capacity` checks appear, since there's no
  uplift/tension demand on the anchors to check.
- `Europe` uniquely combines bearing + plate yield into one key, `"Concrete Bearing
  Capacity and Base Plate Yield Capacity (Compression Load)"`, and adds a top-level
  `rotational_stiffness: { stiffness_array, upper_bound_array, lower_bound_array,
  remarks_array }` (per-load-case arrays, `"N/A"` when not computed — e.g. for a pinned base).

`units_on_UI` is a category label (`force`, `stress`, `length`, `force_per_unit_length`),
not a literal unit string — it tells you what *kind* of quantity `demand`/`capacity`
represent, in whatever units your `units_data` selected.

`reports.html_view_link` / `html_download_link` / `pdf_download_link` are temporary URLs
(matching the pattern used elsewhere in this repo for Quick Design/S3D report links) —
don't assume they're permanent, fetch/share them promptly.

---

## Minimal working example

The smallest useful request — American code, pinned base, axial-only, no anchors/welds
governing:

```json
{
  "design_code": "American",
  "support_type": "pinned",
  "units_data": {
    "first_init": true, "units": "metric", "units_length": "mm", "axial_f_units": "kN",
    "units_strength": "MPa", "units_strength_steel": "MPa", "bending_f_units": "kN-m",
    "length_factor": 1, "strength_factor": 0.00689476, "strength_factor_steel": 6.89476,
    "to_mm": 1, "to_in": 1, "kNm_Kipft": 1, "kN_Kip": 1
  },
  "project_details": { "project_units": "metric", "company": "", "designer": "", "project_name": "", "project_id": "", "project_notes": "", "client": "" },
  "steel_parts": {
    "data": {
      "custom-column-fy": 240, "custom-column-fu": 400, "custom-bp-fy": 240, "custom-bp-fu": 400,
      "custom-conc-fc": 20, "use-cracked-concrete": true,
      "steel-column-shape": "pipe", "steel-column-database": "Pipe", "steel-column-profile": "PIPE 6 STD",
      "steel-column-material": "A53 grB",
      "steel-baseplate-width": 300, "steel-baseplate-height": 300, "steel-baseplate-thickness": 20,
      "steel-baseplate-material": "A36", "steel-baseplate-grouting-thickness": 0,
      "steel-foundation-material": "20.68", "steel-foundation-width": 450, "steel-foundation-height": 450, "steel-foundation-thickness": 380
    }
  },
  "anchors": {
    "data": {
      "custom-anchor-fy": 240, "custom-anchor-fu": 400,
      "anchor-pattern": "Four Corners", "anchor-prop-diam": "16", "anchor-prop-material": "F1554 Gr.36",
      "anchor-thread-included": "included", "anchor-web-bending": "web-bending",
      "use-welded-plate-washers": false, "anchor-plate-washer-thickness": 0,
      "anchor-prop-length": 250, "anchor-prop-ending": "straight",
      "anchor-numbers": 1, "anchor-numbers-z": 2, "anchor-numbers-y": 2,
      "anchor-spacing-z": 200, "anchor-spacing-y": 200,
      "anchor-edge-distance-z": 50, "anchor-edge-distance-y": 50,
      "line-anchor-edge-distance-z": 50, "line-anchor-edge-distance-y": 50
    }
  },
  "welds": {
    "data": {
      "box-weld-size": 8, "input_table_col_weld_size": [],
      "custom-weld-fexx": 482, "use_welds_for_comp": "false",
      "weld-type": "fillet", "weld-setback": 0, "welds-column-mat": "E70xx"
    }
  },
  "loads": [ { "lc": "1", "Mz": "0", "My": "0", "Nx": "100", "Vz": "0", "Vy": "0", "moment_label": "" } ],
  "factors": {
    "concrete_bearing_factor": 0.65, "steel_bearing_factor": 0.75, "steel_flexure_factor": 0.9,
    "weld_factor": 0.75, "steel_tension_factor": 0.9, "steel_shear_rupture_factor": 0.75,
    "anchor_tension_factor": 0.75, "anchor_shear_factor": 0.65, "anchor_bolts_factor": 0.75,
    "concrete_tension_factor": 0.7, "concrete_shear_factor": 0.65, "concrete_normal_weight_factor": 1
  },
  "detailing": { "weld_size": true, "anchor_clearance": true, "bp_edge_distance": true, "embed_plate": true, "concrete_splitting": true, "min_anchors": true },
  "design_settings": {
    "neglect_concrete_breakout_for_tension": false, "neglect_concrete_breakout_for_shear": false,
    "neglect_concrete_pryout": true, "distribute_shear_to_all": true, "simplified_approach_shear": true,
    "consider_both_directions": false, "include_embedded_head_radius": false, "use_sci_for_welds": false
  },
  "version": 2
}
```

For a `fixed` base with real moment (the case that exercises anchor tension/breakout
checks), or for the other three design codes, start from
`sample-api/<country>/input.js` instead — they're verified working requests, not
hand-assembled.

---

## Feeding S3D reactions into a base plate check

A natural pipeline: build/solve a column in `s3d-api`, pull its base reactions via
`S3D.model.solve`'s `reactions` result filter (see `s3d-api/SKILL.md`), then map them
directly into a `loads` entry — `Nx` from the vertical reaction, `Mz`/`My` from the
moment reactions, `Vz`/`Vy` from the horizontal shears. Run this as its own session
(`standalone.baseplate.start`), not appended to the S3D session — see "Session Start"
above. Use `section-selector` to resolve `steel-column-database`/`steel-column-profile`
to a real section name if you're starting from a nominal size rather than a library pick.

---

## Worked examples

Full request/response pairs for all four design codes are in [`sample-api/`](./sample-api/):

| Code | Support | Load case | Files |
|---|---|---|---|
| American | fixed | `Mz=10 kN-m` (moment-governed, full check set) | [`sample-api/america/input.js`](./sample-api/america/input.js), [`response.json`](./sample-api/america/response.json) |
| Australian | pinned | `Nx=100 kN` (axial-only, reduced check set) | [`sample-api/australia/input.js`](./sample-api/australia/input.js), [`response.json`](./sample-api/australia/response.json) |
| Canadian | fixed | `Mz=10 kN-m` (moment-governed, full check set) | [`sample-api/canada/input.js`](./sample-api/canada/input.js), [`response.json`](./sample-api/canada/response.json) |
| Europe | pinned | `Nx=100 kN` (axial-only, reduced check set + `rotational_stiffness`) | [`sample-api/europe/input.js`](./sample-api/europe/input.js), [`response.json`](./sample-api/europe/response.json) |

Each `input.js` is the full request envelope (`auth`/`functions`, including
`standalone.baseplate.start` + `standalone.baseplate.check`) as a JS snippet — copy the
`design_obj` literal, not the file verbatim, into your own request.
