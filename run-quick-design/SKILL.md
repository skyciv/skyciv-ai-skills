# Run Quick Design Calculator

## Overview

Run any calculator from the SkyCiv Quick Design library via a single REST endpoint.
The library covers 154 calculators across structural, foundation, steel, concrete, timber, aluminium, connection, and load categories.

- **API endpoint:** `POST https://qd.skyciv.com/run`
- **Auth:** Requires a SkyCiv API token — get yours at https://platform.skyciv.com/api
- **[Full calculator catalogue](./assets/catalogue.md)**

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