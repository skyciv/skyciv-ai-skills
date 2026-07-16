# Load Combinations Skill

How to define **load cases and load combinations** on an `s3d_model` so a SkyCiv S3D solve
produces code-correct results, and how to generate the full enumerated set for any major
region/design code.

> **Prerequisite:** This skill describes objects that live inside the `s3d_model` consumed by
> `S3D.model.set` / `S3D.model.solve`. See [`s3d-api`](../s3d-api/SKILLS.md) for the full model
> schema and the solve/session flow, and [`skyciv-api-v3`](../skyciv-api-v3/SKILLS.md) for auth
> and the request envelope. For *deriving the loads themselves* (wind/snow/seismic pressures),
> see [`load-gen-api`](../load-gen-api/SKILLS.md).

---

## How the pieces fit together

A combination is a set of **factors applied to load groups**. Every load in the model
(`distributed_loads`, `point_loads`, `moments`, `pressures`, `area_loads`, `self_weight`, …)
carries a `load_group` string. A `load_combinations` entry then lists a factor for each
load group. The solver multiplies each group's loads by its factor and sums them.

```
loads (each tagged load_group: "Live", "Wind", …)
        │
        ▼
load_combinations["2"] = { "SW1": 1.2, "Live": 1.0, "Wind": 1.0 }   ← factors per group
        │
        ▼
S3D.model.solve  →  results keyed by combination id
```

Four related objects, from smallest to largest scope:

| Object | Required? | Purpose |
|---|---|---|
| `load_combinations` | **Yes**, to get combination results | The factored combinations the solver runs. |
| `load_cases` | Recommended | Maps your load-group names to a design code's case symbols (e.g. `"Live" → "Qdd"`). Doesn't affect `S3D.model.solve` or `S3D.results.getAnalysisReport` (both render group names verbatim regardless — verified against the live API), **but** if you skip it, the SkyCiv S3D platform UI shows every load group as case type "Dead" when the model is opened/imported there, since it has no other way to classify them. Set it whenever the model will be viewed in that UI. |
| `load_combination_settings` | Optional | Records how the set was generated (country, code, criteria, patterns, filters). Metadata for regenerating/round-tripping; the solver does not need it. |
| `permanent_load_groups` | Optional | Flat array of the load-group names the generator varied when building the set — i.e. every group used in `load_combinations` *except* the self-weight group. Metadata only, same purpose as `load_combination_settings`; the solver does not read it. |

**Minimum viable for correct numbers:** tag every load with a `load_group`, add `self_weight`
(usually group `SW1`), and define `load_combinations` — `S3D.model.solve` and
`S3D.results.getAnalysisReport` need nothing more. **Also set `load_cases`** unless you're certain
the model will never be opened in the SkyCiv S3D platform UI — see the warning above.

---

## `load_combinations`

Integer-keyed dictionary. Each entry is `name` + optional `criteria` + one key **per load
group** whose value is the factor.

```json
{
  "load_combinations": {
    "1": { "name": "1.2D + 1.6L",        "criteria": "strength",       "SW1": 1.2, "Live": 1.6, "Wind": 0 },
    "2": { "name": "1.2D + 1.0W + 1.0L", "criteria": "strength",       "SW1": 1.2, "Live": 1.0, "Wind": 1.0 },
    "3": { "name": "0.9D + 1.0W",        "criteria": "strength",       "SW1": 0.9, "Live": 0,   "Wind": 1.0 },
    "4": { "name": "1.0D (service)",     "criteria": "serviceability", "SW1": 1.0, "Live": 0,   "Wind": 0 }
  }
}
```

| Key | Type | Notes |
|---|---|---|
| `name` | string | Human-readable label shown in results/reports. Free text. |
| `criteria` | string | Optional: `"strength"`, `"serviceability"`, or `"other"`. Used to group results and pick which combos design checks read. |
| *load group name* | number | One key per load group (`"SW1"`, `"Dead"`, `"Live"`, `"Wind"`, `"Snow"`, `"Seismic"`, …). Value = load factor. A group omitted or set to `0` contributes nothing. |

- **Factors are dimensionless.** The underlying load magnitudes carry the units set by
  `s3d_model.settings.units` (`"metric"` or `"imperial"`). Combinations never change units.
- Self-weight is its own group (conventionally `SW1`) enabled via `self_weight` — see below.
- Keys must exactly match the `load_group` strings used on the loads, or the factor applies to
  nothing.

### Linking loads to groups

Every load object references a group by name. Self-weight is enabled per group:

```json
{
  "distributed_loads": {
    "1": { "member": 21, "y_mag_A": -0.0183, "y_mag_B": -0.0183, "position_A": 0, "position_B": 100, "axes": "global", "load_group": "Live" }
  },
  "self_weight": {
    "1": { "enabled": true, "x": 0, "y": -1, "z": 0, "load_group": "SW1" }
  }
}
```

---

## `load_cases` (recommended, not just cosmetic)

Maps each load group to the design code's load-case symbol.

```json
{
  "load_cases": {
    "AS-1170.0-2002": { "SW1": "G", "Live": "Qdd", "Wind": "Wu" }
  }
}
```

The full symbol→description dictionary (e.g. `"G" → "Dead"`, `"Qdd" → "Live - Distributed,
Floors, Domestic"`, `"Wu" → "Wind - Ultimate"`) lives under
`load_combination_settings.load_case_mappings` — see the assets below for complete ones per code.

> **Don't skip this one.** Unlike `load_combination_settings` and `permanent_load_groups`, which
> are genuinely inert metadata, `load_cases` is what lets every downstream consumer *other* than
> the raw solve know what type each group actually is. Verified against the live API: a model
> with load groups `"Live"` and `"Wind"` but no `load_cases` entry for them solves correctly and
> `S3D.results.getAnalysisReport` still names each group correctly in every table and combination
> formula — `S3D.model.get` on that same model echoes `load_cases` back as a plain `{}`, not some
> inferred mapping. The gap shows up one layer up: when that model is opened in the SkyCiv S3D
> platform UI, its Load Cases manager has nothing to classify the groups by and defaults every
> unmapped one to **"Dead"** — so a `"Live"` or `"Wind"` group displays as case type Dead there,
> even though the numbers behind it are correct. Populate `load_cases` for every group whenever
> the model might be opened/edited in that UI, not only when you want a code-labelled report.

---

## Load group naming conventions

Group names are **your choice** — the solver only cares that a load's `load_group` string
matches a key in `load_combinations`. The four worked assets below follow patterns worth
reusing, since they mirror how the real combination generator names things:

- **Numbered suffixes for multiple instances of one case type** — `"D1"`, `"L1"`, `"S1"`,
  `"W1"` — so a second, independently-varying live-load pattern would be `"L2"`, a second snow
  case `"S2"`, etc. Single-instance models can drop the suffix (the Australia asset just uses
  `"Live"`, `"Wind"`).
- **Split dead-load groups** — `"D1"` (or `"G1"`) for user-defined superimposed dead loads
  (finishes, cladding, services — modelled as ordinary `distributed_loads`/`point_loads`) kept
  **separate** from `"SW1"` (the `self_weight` object's own group, auto-computed from member/
  plate volume × density). Both almost always carry the *same* factor within a combination (see
  the US/Canada assets: every combo sets `D1` and `SW1` to an identical value) — they're split
  so you can re-derive/override self-weight independently of applied dead loads, not because
  they're factored differently.
- **Directional wind groups** — `"Wx+"`, `"Wx-"`, `"Wy+"`, `"Wy-"` (Eurocode asset) for wind
  acting in each horizontal direction as a separate load group, so a combination can include
  only the direction(s) relevant to it. Simpler models can use a single `"Wind"` group instead
  (Australia/US/Canada assets) when direction isn't modelled separately.

---

## Full worked examples (assets) — prefer these over hand-built factors

Four of the five regions the generator supports have a complete, **real generator output**
asset in `assets/`. Each is a ready-to-copy `load_combinations` (+ `load_cases` +
`load_combination_settings` + `permanent_load_groups`) fragment — copying and adapting group
names/factors is far more reliable than hand-deriving them from a code summary, so start here
before falling back to the generator call.

| Asset | Region / Code | Combos | Criteria | Group names used |
|---|---|---|---|---|
| [`as-nzs-1170-australia.json`](./assets/as-nzs-1170-australia.json) | Australia — AS/NZS 1170.0:2002 | 17 | strength + serviceability | `SW1`, `Live`, `Wind` |
| [`asce7-22-lrfd.json`](./assets/asce7-22-lrfd.json) | United States — ASCE 7-22 LRFD | 18 | strength | `D1`, `SW1`, `L1`, `S1`, `W1` |
| [`nbcc-2020.json`](./assets/nbcc-2020.json) | Canada — NBCC 2020 | 30 | strength + serviceability | `D1`, `SW1`, `L1`, `S1`, `W1` |
| [`eurocode.json`](./assets/eurocode.json) | Europe — EN 1990:2002 | 85 | strength + serviceability | `G1`, `SW1`, `Qa1`, `S1`, `Wx-`, `Wx+`, `Wy-`, `Wy+` |

The Australia asset additionally includes `distributed_loads` showing loads tagged with
`load_group`, so it's the one to read first to see the whole chain (load → group → combo) in one
file. The other three are combination-set fragments only — you still need to tag your own model's
loads with matching group names (see "Load group naming conventions" above).

No asset is shipped yet for **India (IS 875 / IS 800 LSM)** — use the generator call below, or
the approximate strength set as a starting point: `1.5(D + L)`, `1.2(D + L + W)`, `1.5(D + W)`,
`0.9D + 1.5W` (confirm against the governing edition before use).

### Quick reference — typical base cases per region

Each asset's full set is much larger (serviceability, snow variants, uplift cases, etc.) — these
are just the combinations most models will actually be governed by, taken directly from the
assets above (using the US asset's `D1`/`SW1`/`L1`/`S1`/`W1` naming; substitute your own group
names as needed):

| Region | Base gravity | Base gravity + wind | Wind uplift (reduced dead) |
|---|---|---|---|
| US (ASCE 7-22) | `1.2D1 + 1.2SW1 + 1.6L1` | `1.2D1 + 1.2SW1 + 1.0L1 + 1.0W1` | `0.9D1 + 0.9SW1 + 1.0W1` |
| Canada (NBCC 2020) | `1.25D1 + 1.25SW1 + 1.5L1` | `1.25D1 + 1.25SW1 + 0.5L1 + 1.4W1` | `0.9D1 + 0.9SW1 + 1.4W1` |
| Europe (EN 1990) | `1.1G1 + 1.1SW1 + 1.5Qa1` | `1.1G1 + 1.1SW1 + 1.5Qa1 + 0.9(Wx-/Wx+/Wy-/Wy+)` | `0.9G1 + 0.9SW1 + 1.5(Wx-/Wx+/Wy-/Wy+)` |
| Australia (AS/NZS 1170) | `1.2SW1 + 1.5Live` | `1.2SW1 + Wind + ψ_c·Live` | `0.9SW1 + Wind` |
| India (IS 875 / 800)* | `1.5(D + L)` | `1.2(D + L + W)` | `0.9D + 1.5W` |

\* No asset yet — hand-derived, confirm before use.

---

## Generating the complete set — Load Combination Generator (optional)

For the exhaustive, code-authoritative set (all criteria, notional/pattern cases, filters), call
the **`7000-load-combination-generator`** Quick Design calculator via
[`run-quick-design`](../run-quick-design/SKILLS.md). Use this when the representative sets above
aren't sufficient (e.g. serviceability + pattern loading for a specific standard edition).

```js
// POST https://qd.skyciv.com/run  — see run-quick-design for auth/token details
{
  "payload": JSON.stringify({
    "uid": "7000-load-combination-generator",
    "auth": "you@example.com",
    "key": "YOUR_API_TOKEN",
    "input": {
      "region_input": "united-states",      // australia | united-states | europe | canada | india
      "standard_input": "Please Select",     // standard within the region
      "criteria_input": "All",                // All | strength | serviceability
      "combination_naming_input": "ID",       // ID | ID + Criteria | ID + Factor + Symbol | ID + Factor + Name | Schema Row + Increment
      "remove_unnecessary": true,             // drop combos where all factors resolve to 0
      "load_case_table": [
        { "col1": "D", "col2": 1, "col3": "simultaneous", "col4": 1, "col5": 0.5, "col6": "auto" }
      ],
      "current_unit_system": "metric"
    }
  })
}
```

`load_case_table` columns: `col1` load case symbol, `col2` quantity, `col3` pattern
(`simultaneous | independent | mirror | paired | sweep | checker`), `col4` main ratio,
`col5` alternate ratio, `col6` load-group naming (`"auto"` or explicit).

> **Caveats:**
> - The generator's **output** is a Quick Design result object (PDF + `results`), **not** the
>   `load_combinations` object the solver consumes. You must transform its output into the
>   `load_combinations` / `load_cases` shape documented above before setting it on the model.
>   The `sample_output.json` shipped in `run-quick-design/assets/7000-load-combination-generator/`
>   is a **generic placeholder**, not the real generator output — treat the live API as source of
>   truth for its response shape.
> - Because of that transform step and the extra round-trip, prefer the inline examples/asset
>   above for the common cases; reach for the generator only for the full enumerated set.

---

## Key tips

- **Every load needs a `load_group`** — an unlabelled load won't be picked up by any factor. This
  includes `self_weight`: without `load_group` there too, its factor (e.g. `"SW1": 1.2`) has
  nothing to match and self-weight silently isn't scaled by any combination.
- **Match group keys exactly** between loads and `load_combinations` (case-sensitive).
- **Factors are unitless**; magnitudes follow `settings.units`. Combinations never rescale units.
- **Set `criteria`** so downstream design checks (e.g. `run-quick-design` steel/concrete checks)
  can read strength combos and serviceability combos separately.
- **Set `load_cases` for every group** if the model may ever be opened in the SkyCiv S3D platform
  UI — otherwise every group displays there as case type "Dead" (see the warning above).
- **Solve reads combos by id** — after `S3D.model.solve`, results are keyed by combination id;
  use `lc_filter: ["load_combo"]` to return combination (not raw load-case) results.
