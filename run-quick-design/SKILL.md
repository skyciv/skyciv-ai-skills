# Run Quick Design Calculator

## Overview

Run any calculator from the SkyCiv Quick Design library via a single REST endpoint.
The library covers 154 calculators across structural, foundation, steel, concrete, timber, aluminium, connection, and load categories.

- **API endpoint:** `POST https://qd.skyciv.com/run`
- **Auth:** Requires a SkyCiv API token — get yours at https://platform.skyciv.com/api
- **[Full calculator catalogue](./assets/catalogue.md)**
- **Writing or editing a calc pack** (including `s3d_integration.js` so it runs inside S3D against every member of a solved model)? That's authoring, not calling: see [`build-quick-design-calculator`](../build-quick-design-calculator/SKILL.md) and its [S3D integration guide](../build-quick-design-calculator/references/s3d-integration.md).

---

## Before you pick a member design calculator: check S3D Member Design first

> **Preferred method:** to design members of an S3D model (steel, cold-formed steel, timber), use [`S3D.design.member.check`](../s3d-api/SKILL.md#s3ddesign-functions) when it supports that code. Don't use the Quick Design member calculator for the same code. For example, for AS/NZS 4600 use `S3D.design.member.check` with `design_code: "ASNZS_4600-2018"`, not `2304-as4600-cfs-design-calculator`.

**Why:** Member Design runs on the whole solved model. It handles every load combination, effective lengths, bracing/restraints, and member grouping automatically, and usually gives a better design result. A Quick Design calculator only sees the forces and lengths you pass in by hand. Quick Design calculators are still accurate and are the right tool when Member Design doesn't cover the job.

**Decide like this:**
1. Is it a **member** check (beam/column/brace) on an **S3D model**, and is the code in the [Member Design list](../s3d-api/SKILL.md#supported-member-design_code-values)? → use **`S3D.design.member.check`**. This applies to steel, cold-formed steel and timber only.
2. Otherwise, use a Quick Design calculator. That covers:
   - **all concrete design** (beams, columns, slabs, walls, footings). Always use the Quick Design concrete calculators here, never `S3D.design.rc.check`;
   - codes Member Design doesn't have: all aluminium, CSA O86, EN 1995, NZS 1720;
   - an edition the user explicitly requires that only Quick Design has (e.g. AISC 360-22);
   - connections, base plates, plates, lugs, purlins, foundations, and loads;
   - a single hand check with no model;
   - building an S3D calc pack (see [`build-quick-design-calculator`](../build-quick-design-calculator/references/s3d-integration.md)).

The Quick Design calc → Member Design `design_code` mapping is in [`s3d-api`](../s3d-api/SKILL.md#member-design-vs-quick-design-which-to-use).

---

## How to call

```js
const axios = require('axios');

axios.post('https://qd.skyciv.com/run', {
    payload: JSON.stringify({
        uid: "8004-as3600-strip-footing-design", // calculator UID from the catalogue
        auth: "you@example.com",                  // authenticated email address
        key: "YOUR_API_TOKEN",                    // from https://platform.skyciv.com/api
        pdf_report: true,                         // set false to skip PDF generation
        input: {
            // Input object matching the calculator's schema.json
            // See sample_input.json for a ready-to-use example
        }
    })
})
.then(response => console.log(response.data))
.catch(error => console.error(error));
```

### Request payload fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `uid` | string | yes | Calculator unique identifier (see [catalogue](./assets/catalogue.md)) |
| `auth` | string | yes | Authenticated user email address |
| `key` | string | yes | API token from https://platform.skyciv.com/api |
| `pdf_report` | boolean | no | Generate a PDF report (default: `false`) |
| `input` | object | yes | Input parameters — see each calculator's `schema.json` |

### Table inputs

Some inputs are tables: `"type": "array"` in `schema.json`, with each row's fields under `items.properties`. Footing load tables (`loading_table`), load combination tables (`lc_table`) and reinforcement tables are the common ones. Pass them as an array of row objects, exactly as `sample_input.json` shows:

```json
"loading_table": [
  { "name": "Dead", "case": "G", "N": 120, "Mx": 0, "Mz": 4.5, "Vx": 0, "Vz": 1.2 },
  { "name": "Live", "case": "Q", "N": 45,  "Mx": 0, "Mz": 1.8, "Vx": 0, "Vz": 0 }
]
```

- **Row fields:** use the names in `items.properties`. A field left out of a row takes that field's `default`, so give every field that matters.
- **Types:** keep each field's schema type. Some numeric-looking fields are strings (every factor in `lc_table`, e.g. `"g_factor": "1.35"`); send those as strings.
- **Enums:** values such as `case` must be one of the listed symbols (`G`, `Q`, `W`, `S`, `E`).
- **Whole table:** a table you send replaces the sample's table completely. Send every row you need, not only the changed ones.

---

## Response format

```json
{
  "status": 0,
  "data": {
    "report": "https://pdf.skyciv.com/...  (PDF link, valid for 1 hour)",
    "results": {
      "Utilization Ratio": {
        "value": 0.85,
        "info": "Ratio of demand to capacity",
        "units": "utility",
        "label": "Utilization Ratio"
      },
      "Design Check": {
        "value": "PASS",
        "units": "custom_box",
        "label": "Design Check",
        "color": "#21BA45"
      },
      "Footing Width": {
        "value": 1200,
        "info": "Calculated footing width",
        "units": "mm",
        "label": "Footing Width"
      }
    }
  },
  "log": "",
  "warnings": [],
  "msg": "Design Calc ran successfully"
}
```

### Status codes

| `status` | Meaning |
|-----------|---------|
| `0` | Success |
| `1` | Error — check `msg` and `log` for details |

### Result `units` field meanings

| `units` value | Meaning |
|----------------|---------|
| `"heading"` | Section heading — no `value` field |
| `"utility"` | Utilization ratio — pass if `value ≤ 1.0` |
| `"utility_boolean"` | Boolean pass/fail — `0` = pass, `1` = fail |
| `"custom_box"` | Pass/fail text — `value` is `"PASS"` or `"FAIL"` |
| any other string | Physical unit (e.g. `"mm"`, `"kN"`, `"MPa"`, `"kPa"`) |

---

## Troubleshooting

**A call fails with `status: 1`, a generic `msg` like `"Failed to run."`, and an `err` like `"Cannot read properties of undefined (reading 'length')"` (or similar low-level JS error), even though every field matches the calculator's `schema.json`:**
This is not a always request-shape bug — it could mean one of your *values* falls outside what that calculator's underlying material/section/species database actually has data for, and the backend crashes on the missing lookup instead of returning a clear validation error. Material/alloy/species/grade `enum`s in `schema.json` are frequently stubs (e.g. `2601-aluminium-design`'s `alloy` enum shows only `[1100]` as if that were the only option) — the live calculator accepts a much broader real set, but only specific (material, temper/grade) *pairs* have actual data rows, and there is no way to know which pairs are valid from the schema alone. Confirmed directly against the live API for `2601-aluminium-design`: `alloy: 6063, temper: "T5"` (a common architectural aluminium alloy/temper) crashes every call this way, while `alloy: 6061, temper: "T6"` and `alloy: 5052, temper: "H32"` both work. If you hit this, bisect by reverting to the calculator's own `sample_input.json` (known-good) and changing one field at a time against the live API until you find which value is unsupported — don't assume it's a bug in your request construction.

**`sample_output.json` often doesn't reflect the calculator's real result keys:** some of these files are generic placeholder boilerplate (e.g. a "Design Summary" heading + one generic "Utilization Ratio" + one "Example Dimension" — the exact same three entries appear verbatim across multiple unrelated calculators' `sample_output.json`), not an actual captured response for that specific calculator. Treat `schema.json`/`sample_input.json` as authoritative for input field names/units; only trust `sample_output.json`'s result *key names* if they look calculator-specific (not this generic pattern) — otherwise expect the real `results` object to have different, calculator-specific keys, and code defensively (e.g. scan for `units: "utility"` entries rather than a fixed key name — see `extractGoverningUtilization`-style logic in the prototype apps under `prototypes/`).

**Some result entries carry `"paid_only": true`:** this has been observed on `2601-aluminium-design`'s combined-action checks (e.g. "Combined Tension + Bending", "Combined Bending and Shear"). A value is still present, but on a free/trial account it may not reflect a genuinely computed result. If you're scanning for the governing (largest) `units: "utility"` value across all entries, be aware a `paid_only` entry could be silently governing the result on an account that hasn't verified it actually computes real values for that entry.

## Per-calculator assets

Each calculator folder under `assets/<uid>/` contains:

| File | Description |
|------|-------------|
| `schema.json` | JSON Schema for the `input` object |
| `sample_input.json` | Ready-to-use example input |
| `sample_output.json` | Example API response |

Browse the [full catalogue](./assets/catalogue.md) to find the right calculator.

---

## Regenerating this skill

```bash
node skills/compile.js            # all calculators
node skills/compile.js --public   # public calculators only
```

# How to Batch Call a single calculator

If you need to run a single calculator multiple times with different inputs, you can use the `runBatch` endpoint.

This is more efficient than calling the `run` endpoint multiple times, and should be used if you need to optimise a run. For example, if you are trying to find the optimal depth, you can batchRun the same calculator with different depths, and find the optimal depth that way:

```js

//BATCH RUN
let how_many_to_test = 50;
let input_batch = [
    {
        // Input object matching the calculator's schema.json
        // See sample_input.json for a ready-to-use example
    },
    {
        // Input object matching the calculator's schema.json
        // See sample_input.json for a ready-to-use example
    },
]

fetch('https://qd.skyciv.com/runBatch', {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        payload: JSON.stringify({
            uid: "2015-as4100-i-beam-capacity-calculator",
            auth: "SKYCIV_USERNAME_HERE",
            key: "SKYCIV_KEY_HERE",
            input_arr: input_batch,
            pdf_report: true,
        })
    })
})
.then(response => response.json())
.then(data => {
    console.log(data);
});

```

The result object will come back as an array of results, with the same order as the input batch. So if you send in 50 inputs, you will get back an array of 50 results, which you can then iterate through to find the optimal depth.

# How to open a file you've just created

You can also allow the user to open the file by appending the parameters after the URL. For example:

https://platform.skyciv.com/quick-design?uid=3027-au-concrete-column&member_label=C1&shape=rectangular&D=400&W=300&cover=30&size_bars=20&n_bars_z=4&n_bars_y=4&reinforcement_class_long=N&size_shear_bars=8&n_shear_bars_y=2&n_shear_bars_z=2&s=150&reinforcement_class_shear=N&L=3000&k_y=1&k_z=1&f_c=40&f_y=500&V_y=100&V_z=50&N=1350&G=500&Q=500&second_order=first&braced_or_unbraced=ZY&M_z_top=100&M_z_bot=50&M_y_top=50&M_y_bot=-50&member_label=C1&shape=rectangular&D=401&W=301&cover=30&size_bars=20&n_bars_z=4&n_bars_y=4&reinforcement_class_long=N&size_shear_bars=8&n_shear_bars_y=2&n_shear_bars_z=2&s=150&reinforcement_class_shear=N&L=3000&k_y=1&k_z=1&f_c=40&f_y=500&V_y=100&V_z=50&N=1350&G=500&Q=500&second_order=first&braced_or_unbraced=ZY&M_z_top=100&M_z_bot=50&M_y_top=50&M_y_bot=-50

So it would be helpful if you provide these links after you run the calculation, so the user can open these designs up.

## Table inputs in a link

Table inputs (see [Table inputs](#table-inputs)) go in the link too: the table's JSON array, URL-encoded, as the value of its key. For example, this `loading_table`:

```json
[{"name":"Dead","case":"G","N":120,"Mz":4.5},{"name":"Live","case":"Q","N":45,"Mz":1.8}]
```

goes in the link as:

```
&loading_table=%5B%7B%22name%22%3A%22Dead%22%2C%22case%22%3A%22G%22%2C%22N%22%3A120%2C%22Mz%22%3A4.5%7D%2C%7B%22name%22%3A%22Live%22%2C%22case%22%3A%22Q%22%2C%22N%22%3A45%2C%22Mz%22%3A1.8%7D%5D
```

- Encode with `encodeURIComponent(JSON.stringify(table))`, or let `URLSearchParams` do it.
- Every table input works this way, e.g. `lc_table` and `btm_reinforcement_table`. Rows follow the same rules as in an API run.
- Give each table key once. A table left out of the link opens with the calculator's own default table.
- Keep links a reasonable length: a footing's load and combination tables fit easily, but don't put large arrays in a link.

Minimal example, an AS 3600 pad footing with its loads:

```js
const url = new URL('https://platform.skyciv.com/quick-design');
url.searchParams.set('uid', '8000-as3600-pad-footing-design');
url.searchParams.set('footing_width', 1000);
url.searchParams.set('footing_length', 1000);
url.searchParams.set('footing_height', 300);
url.searchParams.set('loading_table', JSON.stringify([
  { name: 'Dead', case: 'G', N: 120, Mx: 0, Mz: 4.5, Vx: 0, Vz: 1.2 },
  { name: 'Live', case: 'Q', N: 45,  Mx: 0, Mz: 1.8, Vx: 0, Vz: 0 },
]));
// url.toString() is the link to give the user
```

# Footing loads from an analysis model

When the loads for a footing calculator come from a solved S3D model (see [`analysis-results`](../analysis-results/SKILL.md)), build `loading_table` from the support's **unfactored reactions per load case**, not from load combinations. The calculator applies its own factors through `lc_table`.

1. **One row per load type.** Map each load group to a calculator `case` using the model's load type mapping (`load_cases[<code>]`, see [`load-combinations`](../load-combinations/SKILL.md)): dead and self-weight → `G`, live and roof live → `Q`, wind → `W`, snow → `S`, earthquake → `E`. Add up the reactions of groups that map to the same case, so self-weight (`SW1`) and a dead load group together make one `G` row. If a group's type isn't clear from the mapping or its name, ask.
2. **Axes.** `N` is the vertical force, positive in compression (pushing down on the footing); `x` and `z` are the two plan axes. With S3D's default Y-up axis: `N` = reaction `Fy`, `Vx` = `Fx`, `Vz` = `Fz`, `Mx` = `Mx`, `Mz` = `Mz`. If the model is Z-up (`settings.vertical_axis: "Z"`), `N` = `Fz` and the plan axes are X and Y. Check the sign of `N` against gravity in the model: a support pushing up on the structure is compression in the footing. There is no input for a moment about the vertical axis; say so if it is significant.
3. **Units.** The calculator does not convert. The metric footing calculators take `N`, `Vx`, `Vz` in kN and `Mx`, `Mz` in kNm (check each field's `description`); convert from the model's units.
4. **Combinations.** Keep the calculator's own `lc_table` when its factors match the code and the load types in use, and say so. Otherwise send a full `lc_table`: one row per combination, every factor as a string, and `"0.0"` for each load type a combination leaves out.
5. **Column size.** `col_width` and `col_length` come from the section of the member on the support node. If a beam or brace sits on the support rather than a column, say what you assumed.

