---
name: load-gen-api
description: "Use when getting design wind speeds, wind pressures, snow loads or seismic forces for a site and building from the SkyCiv Load Generator API (standalone.loads: getLoads, getSiteData, getCountryDesignCodes) — building the request, fixing a request that returns errors or no wind_pressure, parsing the per-code results (ASCE 7-10/16/22, AS/NZS 1170, AS 4055, EN 1991, NBCC 2015/2020, IS 875, NSCP 2015, CFE Viento, CTE DB SE, SANS 10160) into load cases, or applying those wind/snow/seismic loads to a SkyCiv S3D model (s3d_model pressures, area_loads, distributed_loads, point_loads) via the API or an S3D App. Trigger even without the word SkyCiv, e.g. 'wind load for this address', 'what's the snow load in Denver', 'apply wind pressures to my frame', 'seismic base shear', 'Load Generator API returns status 1'. Not for factoring loads into combinations (use load-combinations) or solving the model (use s3d-api)."
metadata:
  argument-hint: "Site address + design code + building, e.g. 'ASCE 7-22 wind on a 30x20 m gable shed in Denver, apply to model'"
---

# Load Generator Agent Skill

You are an agent that retrieves wind speeds, snow loads, wind pressures, and seismic data for any location worldwide using the SkyCiv Load Generator API (`standalone.loads` namespace). This skill covers all functions, parameters, and design codes.

> **Prerequisite:** Always begin a session with `standalone.loads.start` as the first function (see "Session Start" below — `S3D.session.start` does not work here, despite what you may see suggested elsewhere). See [`skyciv-api-v3`](../skyciv-api-v3/SKILL.md) for auth, options, and the request/response envelope.

> **Calling this from inside an S3D App / left-menu panel?** Get `auth` from the signed-in user
> with **`SKYCIV_UTILS.currentUser.getApiAuth()`** (returns `{username, key}`) — never prompt the
> user for an API key or cache one in `localStorage` from in-app code. See the "Authentication"
> section of [`s3d-apps`](../s3d-apps/SKILL.md). The credential-collection UI described in the
> root `CLAUDE.md` is for **standalone** prototypes only, where there's no signed-in session to
> read from.

---

## Agent Workflow (build → check → call → fix → normalize → apply)

Follow these steps in order. Steps 2 and 4 repeat until the call returns loads.

1. **Build from a template.** Pick the [`sample-api/`](#sample-api-templates) folder matching the design code + structure, copy its `input.json`, swap in the user's address, dimensions and levels. Units follow `project_details.units` (`"metric"` = m, Pa/kPa, kN; `"imperial"` = ft, psf, kip). Ask the user for any missing key input (risk/importance category, exposure/terrain, enclosure, floor levels) before calling — don't guess them. Site values (wind speed, ground snow load, NBCC hourly wind pressure) always come from the API's map lookup for the address/`lat`+`lng`; never supply your own. Send `wind_speed_override`, `snow_load_override` or `hourly_wind_pressure_override` only when the user gives that value.
2. **Lint before sending:** `node scripts/normalize_loads.js --check input.json` (or `checkRequest(req)` from the same file). It catches the mistakes in [Gotchas](#gotchas) that otherwise come back as a silent missing `wind_pressure`. Fix every `error`; read every `warning`.
3. **Call** `standalone.loads.start` then `standalone.loads.getLoads` in one request. Set `"report": false` while iterating (faster); turn it back on for the final call so you have `report_link`.
4. **Fix loop.** If `data.wind_pressure` (or the snow/seismic block you asked for) is missing:
   - Read `errors[]` — each has `code`, `field` (the input path) and, for `INVALID_ENUM`, `expected`. Fix exactly that field per the [error code table](#errors-and-warnings). Never parse `msg` when `errors[]` exists.
   - `DEFAULT_APPLIED` entries in `warnings[]` are not failures, but check each default is acceptable (e.g. a missing `structure_level` gives a single 3 m station).
   - Change one thing per retry, resend, and stop after 3 failed attempts on the same field — show the user `msg` verbatim and ask.
   - `SERVER_ERROR` / timeouts: retry once, then report; don't mutate inputs to chase a server fault.
5. **Normalize the result:** `node scripts/normalize_loads.js output.json` → one flat list of `{direction, case, internal, surface, zone, elevation, p}` for every code, `wind.forces` for non-building structures, `wind.mirror` (opposite directions you must build yourself), plus `snow` and `seismic` blocks. See [Normalized results](#normalized-results-scriptsnormalize_loadsjs). Read `wind.notes` — it names API gaps and known bugs (a surface returned without values, the NSCP speed-unit bug, the CTE unit label) you must not ignore. `ok: false` comes with a `reason` (`site_only` or `failed: …`).
6. **Show the engineer** the key numbers (design wind speed, qh/qp, governing pressures, ps, V) and the `report_link`, then [apply to S3D](#applying-loads-to-an-s3d-model) if asked: one load group per direction × case, then factor with [`load-combinations`](../load-combinations/SKILL.md).

---

## Gotchas

Each of these has burned a real agent run. The lint in step 2 checks the ones marked ✓.

- ✓ **Session opener:** `standalone.loads.start`, never `S3D.session.start` (the second call fails with a generic "unknown reason").
- ✓ **`design_code` is versioned for ASCE** (`asce7-16`, not `asce7`) and must match in `site_data` and `building_data`.
- ✓ **`structure_type` is code- and roof-specific** — see the [allowed-values table](#wind-parameters-building_datawind_parameters). Enclosed roofs: ASCE 7-16/22 `mwfrs` / `cladding` / `mwfrs_cladding`; ASCE 7-10, NSCP, NBCC `mwfrs` / `cladding`; AS/NZS 1170, IS 875 `building` / `cladding`; EN 1991, CTE, SANS, CFE `building`. Open roofs (`pitched`, `troughed`, `open-monoslope`) on AS/NZS, EN, CTE, SANS and CFE take **`free_roof`**. A value not in the list fails validation (`"structure_type is not applicable to roof_profile defined"`): site data comes back, **no `wind_pressure`**.
- ✓ **Site data comes from the API, not from you.** Leave `wind_speed_override`, `snow_load_override` and `hourly_wind_pressure_override` out unless the user states the value; never fill them from memory, a code map or an estimate. The lint warns `USER_OVERRIDE` on each one present.
- ✓ **No `"flat"` roof profile** — send `gable` with `roof_angle: 0`.
- **Wind only — flat roof = `roof_angle` < 7° on `asce7-10`, `asce7-16`, `asce7-22`, `nscp2015`, `nbcc2015`, `nbcc2020`.** For wind loads, treat such a `gable`, `hip` or `monoslope` roof as flat (flat-roof wind zones and coefficients when reading or applying wind results), but send it as is: keep the user's `roof_profile` and actual `roof_angle`, never rewrite them to `gable`/`0`. Snow and seismic don't use this rule. See [Roof profiles](#roof-profiles-building_dataroof_profile).
- ✓ **Open roof profiles (`pitched`, `troughed`, `open-monoslope`) need `enclosure: "open"`** on ASCE, and vice versa.
- ✓ **AS/NZS 1170 needs `ari` or `sls_and_uls`**; neither = hard fail.
- ✓ **NBCC:** `eave_height` and `ground_to_top` required — also for seismic-only calls (`wind_parameters: false`), which fail with `"eave_height is not defined"` on the default `api_version` 2.1; `reference_height` ≥ 6 m; never `api_version: 2` (wind times out).
- ✓ **Height key differs by code:** `mean_roof_height` (ASCE, AS, NSCP), `ground_to_top` (EN 1991, CTE, NBCC, AS 4055), `reference_height` (IS 875). Copy the template.
- ✓ **`wind_direction` lives in `site_data.topography`**, not `site_data`.
- ✓ **Send `structure_level`** (one `{floor_level, floor_elevation}` per floor) or you get one 3 m windward station.
- **Judge success by the data block, not `status`.** `status: 1` also means "defaults applied"; a response with `wind_pressure` is usable.
- **Older outputs have an ASCE / NSCP `windward_wall` entry with no values** (only `dirn`/`surface`). Cause: before Load Generator commit `63f988e` (2026-10-14) the windward result was stored under the wrong key and dropped from the JSON; fixed since, and verified live on 2026-11-10 (`loads.getLoads_asce` re-run: windward returns one value per level plus h). The `loads.getLoads_asce716_seismic` sample still predates the fix. If a live reply still shows it, the normalizer reports it in `wind.notes` — never apply zero; read the windward pressures from `report_link`.
- **ASCE `along_B` roof `location` repeats `along_L`** (API bug) — take zone edges from h.
- **`length` is the dimension parallel to the first wind direction**, not "the longer side". Decide which model axis it runs along before calling, and keep that mapping when applying loads back.
- **Non-building structures (pole, freestanding wall, signboard, rooftop equipment, ASCE ground solar) return `wind_pressure.forces`, not surface `pressures`.** The normalizer turns them into `wind.forces`; apply them per [Applying loads, step 7](#applying-loads-to-an-s3d-model).
- **AS 4055 returns a wind class (N1–N6/C1–C4) and one general pressure pair per element** (roof / wall, ULS and SLS, uplift, racking) — no directions or zones, so nothing to map face by face onto a frame. The normalizer puts them in `wind.summary`.
- **NSCP 2015 wind pressures (MWFRS and C&C) are 12.96× too high** (~11.6 kPa on a 4.5 m windward wall, ~33 kPa C&C). Cause, from `wind_parameters.qz` in the reply: qz = 0.613·Kz·Kzt·Kd·V² is evaluated with V in **kph** (e.g. 275) as if it were m/s, so every pressure is 3.6² too large. Seen in local engine runs on 2026-11-10; the normalizer flags it in `wind.notes`. Don't apply NSCP wind until SkyCiv fixes it, and tell the engineer.
- **CTE DB SE values are kN/m², labelled `"pa"`.** `results.js` overwrites the calc's own `kPa` with the code's base unit without converting. The normalizer corrects `units.pressure` to `kPa`.
- **`sans10160` (South Africa) fails.** It is listed in `getCountryDesignCodes` and validated, but `getLoads` returned `"Error on server calcs"` for both a gable and a monoslope EN-style request (2026-11-10). The shape, from `results.js`, is EN 1991's (`{θ: [{surface, zone, cpe, we, we_wi_min, we_wi_max, w_net}]}`) and the normalizer reads it as `en1991`, but no successful run exists yet.
- **`cfe-viento-2020` is listed for Mexico but `getLoads` isn't wired for it** (only site data in `api_functions.js`; no branch in `check_valid.js` or `results.js`). Use `cfe-viento`.
- **`loads.getLoads_asce_wind_only` sends `building_data: null`** — it returns site wind speed only, no pressures. It is not a wind-pressure template.

---

## Session Start

Always open the session with `standalone.loads.start`, even in an app that also builds/solves an S3D model elsewhere:

```json
{
  "function": "standalone.loads.start",
  "arguments": { "keep_open": false }
}
```

> **`S3D.session.start` does NOT work as the opener for `standalone.loads.*` calls** — this contradicts earlier guidance in this skill and in `CLAUDE.md` claiming it does. Confirmed directly against the live API: a call shaped `[{S3D.session.start}, {standalone.loads.getLoads}]` returns `session.start` succeeding but `standalone.loads.getLoads` failing with a generic `"The function 'standalone.loads.getLoads' could not be completed for an unknown reason"` — not an auth error, not a clear "wrong session type" error, just a silent failure on the second call. The exact same request with `standalone.loads.start` as the opener instead succeeds. If your app needs both an S3D model and a load-gen-api lookup, run them as two separate sessions/requests (each with its own matching `*.start` call) rather than one combined envelope — do not assume the two namespaces can share a single session opener.

---

## Supported Design Codes

| `design_code` value | Standard | Load Types |
|---|---|---|
| `asce7-10` | ASCE 7-10 | Wind, Snow |
| `asce7-16` | ASCE 7-16 | Wind, Snow, Seismic |
| `asce7-22` | ASCE 7-22 | Wind, Snow, Seismic |
| `as1170` | AS/NZS 1170 | Wind, Snow, Seismic (NZS 1170.5) |
| `en1991` | Eurocode EN 1991 | Wind, Snow |
| `nbcc2015` | NBCC 2015 | Wind, Snow |
| `nbcc2020` | NBCC 2020 | Wind, Snow |
| `is875` | IS 875 | Wind |
| `nscp2015` | NSCP 2015 | Wind, Snow, Seismic |
| `cfe-viento` | CFE Viento (Mexico) | Wind |
| `cfe-viento-2020` | CFE Viento 2020 (Mexico) | Listed for Mexico; `getLoads` not wired — use `cfe-viento` |
| `cte-db-se` | CTE DB SE-AE (Spain) | Wind, Snow. `getCountryDesignCodes` lists it by display name `"CTE DB SE-AE"` |
| `sans10160` | SANS 10160-3 (South Africa) | Wind — EN 1991-style request and output; **`getLoads` failed in every test** (see [Gotchas](#gotchas)) |
| `as4055` | AS 4055 (Australian residential, Quick Design) | Wind only — see [AS 4055](#as-4055-design_code-as4055--australian-residential-wind-only) |

Use `standalone.loads.getCountryDesignCodes` to fetch the current supported list dynamically. This table matches `calculations/data_functions/getCountryDesignCodes.js` in the Load Generator as of 2026-11-10.

---

## `standalone.loads.getCountryDesignCodes`

Returns all supported design codes grouped by country and load type.

```json
{
  "function": "standalone.loads.getCountryDesignCodes",
  "arguments": {}
}
```

Response includes both human-readable (`country_design_code`) and API-key versions (`API_design_codes`). Always use the `API_design_codes` values in your requests.

---

## `standalone.loads.getSiteData`

Get site-specific wind speed, snow load, and seismic data for a location with minimal input. Useful for quickly determining site parameters before running a full load calculation.

```json
{
  "function": "standalone.loads.getSiteData",
  "arguments": {
    "site_data": {
      "design_code": "asce7-16",
      "project_address": "Chicago, Illinois",
      "risk_category": "II"
    }
  }
}
```

**Response structure:**
```json
{
  "site_data": { "country": "United States", "lat": 41.878, "lng": -87.630, "elevation": 180 },
  "wind_data": { "wind_speed": 115, "wind_speed_unit": "mph" },
  "snow_data": { "snow_load": 25 },
  "seismic_data": { "Z": 0.4, "seismic_zone": 4, "nearest_fault": "...", "D": 18.9 },
  "topography": {}
}
```

---

## `standalone.loads.getLoads`

The main function. Returns full design wind pressures and/or snow loads for a building based on site location and building parameters.

```json
{
  "function": "standalone.loads.getLoads",
  "arguments": {
    "project_details": {
      "name": "Project Name",
      "id": "PROJ-001",
      "company": "SkyCiv",
      "designer": "Engineer Name",
      "units": "imperial"
    },
    "site_data": { /* see site_data below */ },
    "building_data": { /* see building_data below */ },
    "site_analysis": { /* optional */ }
  }
}
```

---

## `site_data` Object

Defines the location and design code parameters.

### Common properties (all design codes)

| Key | Type | Description |
|---|---|---|
| `design_code` | `string` | API design code value (see table above) |
| `project_address` | `string` | Site address — uses Google Maps to geocode. Provide this OR `lat`/`lng`. |
| `lat` | `float` | Latitude (e.g. `41.8781` for Chicago) |
| `lng` | `float` | Longitude (e.g. `-87.6298` for Chicago) |
| `wind_direction` | `string` | Goes in `site_data.topography` (see below), not here. The direction the wind comes **from**: `N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW` |

### Design code specific — `site_data`

| Key | Design Code | Options |
|---|---|---|
| `risk_category` | ASCE 7 | `I`, `II`, `III`, `IV` |
| `site_class` | ASCE 7-16 | `A`, `B`, `C`, `D`, `D-default`, `E` |
| `site_class` | ASCE 7-22 | `A`, `B`, `BC`, `C`, `CD`, `D`, `DE`, `E` |
| `site_class` | NBCC 2020 | `A`, `B`, `C`, `D`, `E` |
| `exposure` | ASCE 7 / NSCP 2015 | `B`, `C`, `D` (required for topography) |
| `ari` | AS/NZS 1170 | Annual Recurrence Interval in years: `1`, `5`, `10`, `20`, `25`, `50`, `100`, `200`, `500`, `1000`, `2000`, `5000`, `10000`. When given, it is used and `sls_and_uls` is ignored |
| `sls_and_uls` | AS/NZS 1170 | Object: `{ country, design_working_life, importance_level }` — or `false` when using `ari`. **One of `ari` or `sls_and_uls` is required:** with neither, the call fails (`sls_and_uls is not defined`) instead of defaulting. `sls_and_uls: false` (or `true`) without `ari` uses Australia, importance level 2, 50 years |
| `sls_and_uls.country` | AS/NZS 1170 | `"australia"` or `"new_zealand"` |
| `sls_and_uls.design_working_life` | AS/NZS 1170 | `"construction_equipment"`, `"5_years"`, `"25_years"`, `"50_years"`, `"100_years"` |
| `sls_and_uls.importance_level` | AS/NZS 1170 | `"1"` through `"5"` |
| `wind_region` | AS/NZS 1170 | `A0`–`A5`, `B1`, `B2`, `C`, `D`, `NZ1`–`NZ4` (optional override) |
| `recurrence_interval` or `ari` | NBCC | `"10_years"`, `"50_years"` |
| `importance_level` | NBCC | `"low"`, `"normal"`, `"high"`, `"post_disaster"` |
| `limit_state` | NBCC | `"SLS"`, `"ULS"` |
| `importance_category` | IS 875 | `I`, `II`, `III`, `IV` |
| `structure_class_is875` | IS 875 | `I`, `II`, `III`, `IV` |
| `occupancy_category` | NSCP 2015 | `I`, `II`, `III`, `IV`, `V` |
| `return_period` | CFE Viento | `"10-anos"`, `"50-anos"`, `"200-anos"` |
| `barometric_pressure` | CFE Viento | Default `760` mm Hg |
| `ambient_temperature` | CFE Viento | Default `25` °C |

### `site_data.topography` sub-object

| Key | Design Code | Description |
|---|---|---|
| `wind_direction` | All | The direction the wind comes **from** for the topographic analysis; the response echoes it as `topography.wind_source_direction`. **AS/NZS 1170:** it also sets the building orientation when `building_orthogonal_axis_orientation` is blank. See [AS/NZS 1170 building orientation](#asnzs-1170-building-orientation-and-wind-angle-θ) |
| `topo_image` | All | `true` to return a base64 elevation image |
| `country` | All | Country name |
| `terrain_category` | AS/NZS 1170 | `CAT1`, `CAT2`, `CAT2.5`, `CAT3`, `CAT4` |
| `terrain_category` | EN 1991 (UK/Ireland) | `0`, `I`, `II`, `III`, `IV` |
| `terrain_category` | IS 875 / CFE Viento | `1`, `2`, `3`, `4` |
| `season_month` | EN 1991 | For Belgium, France, UK, Ireland |
| `distance_inside_town` | EN 1991 (UK/Ireland) | Default `20` m |
| `distance_from_shore` | EN 1991 (UK/Ireland) | Default `100` m |
| `displacement_height` | EN 1991 (UK/Ireland) | Default `0` |
| `snow_region` | AS/NZS 1170 | AU: `AN`, `AC`, `AS`, `AT` — NZ: `N1`–`N5` |
| `snow_terrain_class` | AS/NZS 1170 | `1`, `2`, `3` |
| `snow_area_classification` | AS/NZS 1170 / NBCC | `"alpine"`, `"sub-alpine"` (AS) or `"rural"`, `"exposed-north-treeline"` (NBCC) |

### User-defined overrides (optional)

By default the API looks up site wind speed, snow load and NBCC hourly wind pressure from its maps for the given location — rely on those. Set an override only when the user supplies the value; it replaces the map value in the calc.

| Key | Applicable codes |
|---|---|
| `wind_speed_override` | ASCE 7, AS/NZS 1170, EN 1991, IS 875, NSCP 2015 |
| `hourly_wind_pressure_override` | NBCC |
| `snow_load_override` | ASCE 7, AS/NZS 1170, EN 1991, NBCC |
| `min_roof_snow_load` | ASCE 7 |

### Seismic parameters inside `site_data` — ASCE 7-16 / ASCE 7-22

```json
{
  "site_class": "D",
  "site_seismic_data": {
    "sd1": 0.96,
    "s1": 0.54,
    "sds": 0.55,
    "tl": 8
  }
}
```

---

## `building_data` Object

Defines the structure geometry and load calculation parameters.

### Structure types (`building_data.structure`)

Values and aliases are matched as exact strings in the Load Generator's `check_valid.js`, `api_functions.js` and `results.js`. Use the value in the first column, which is what the samples send.

| Send | Also accepted | Codes (`getLoads` wind) | Dimensions object | Sample |
|---|---|---|---|---|
| `"building"` | — (the default when `structure` is omitted) | all | `building_dimensions` | most |
| `"freestandingwall"` | `"freestanding_wall"` | `asce7-10`, `asce7-16`, `asce7-22`, `as1170`, `nbcc2015`, `nbcc2020`, `en1991` | `freestandingwall_dimensions` | `asce_freestandingwall`, `as1170_freestandingwall` |
| `"truss-tower"` | `"trusstower"`, `"truss_tower"` | `asce7-10`, `asce7-16` (not 7-22) | `trusstower_dimensions` | none |
| `"signboard"` | — | `en1991` | `signboard_dimensions` | `en1991_signboard` |
| `"solar_panel"` | `"solar-panel"` | `asce7-16`, `asce7-22`, `as1170` | `solar_panel_dimensions` (+ `building_parameters` for roof-mounted) | `asce722_solar_panel_ground`, `as1170_solar_panel_ground` |
| `"pole"` | — | `en1991`, `as1170` | `pole_dimensions` | `en1991_pole`, `as1170_pole` |
| `"rooftop-equipment"` | **none** — `"rooftop_equipment"` is only recognised by the seismic check, not by the wind path | `asce7-16`, `asce7-22` | `rooftop_equipment_dimensions` | `asce716_rooftop_equipment`, `asce722_rooftop_equipment` |
| `"open-frames"` | **none** (`"open_frames"` is not recognised) | `asce7-16`, `asce7-22` | `open_frames_dimensions` | none |
| `"circular-bin"` | `"circular_bin"` | `asce7-16`, `asce7-22`, `as1170` | `circular_bin_dimensions` | `asce722_circular_bin` |

A supported structure on another code fails validation with e.g. `"Freestanding wall wind calcs not yet supported for this code."` (the pole check reuses the signboard message). `open-frames`, `circular-bin` and any **unrecognised name** (a typo, `rooftop_equipment`, `open_frames`) have no validation branch, so nothing catches a bad value up front. From the code, an unrecognised name falls through every `results.js` branch and comes back without `wind_pressure` (not run).

### Roof profiles (`building_data.roof_profile`)

| Value | Enclosure |
|---|---|
| `"gable"` | `enclosed`, `partially-enclosed`, `partially-open` |
| `"monoslope"` | `enclosed`, `partially-enclosed`, `partially-open` |
| `"hip"` | `enclosed`, `partially-enclosed`, `partially-open` |
| `"pitched"` | `open` |
| `"troughed"` | `open` |
| `"open-monoslope"` | `open` |

> **There is no `"flat"` roof profile.** For a flat roof, send `roof_profile: "gable"` with
> `building_dimensions.roof_angle: 0` and `mean_roof_height` equal to the wall height. Confirmed
> against the live API for an `as1170` building: it returns the full set of wall and roof
> pressures. Any value not in the table above is not a roof profile.
>
> **Low-slope roofs, wind only, on `asce7-10`, `asce7-16`, `asce7-22`, `nscp2015`, `nbcc2015`, `nbcc2020`:** a roof with `roof_angle` below 7° is a flat roof for the wind calc (not snow or seismic). Keep its
> `roof_profile` (`gable`, `hip`, `monoslope`) and `roof_angle` as given — don't convert it.

### Wind parameters (`building_data.wind_parameters`)

> ⚠️ **`structure_type` is code-specific — getting it wrong returns a response with no
> `wind_pressure` at all.** Confirmed against the live API: sending ASCE's `"mwfrs"` on an
> `as1170` request fails with `"structure_type is not applicable to roof_profile defined"`,
> and the response still carries `site_data`/`wind_data`/`topography` — just no pressures.

Note `wind_parameters.structure_type` is **not** the same field as
[`building_data.structure`](#structure-types-building_datastructure) above — `structure` picks the
*kind of structure* (building / freestanding wall / solar panel / …), `structure_type` picks *how
the wind pressure is resolved on it*, and its legal values depend on the design code.

**Allowed `structure_type` for `structure: "building"`** (from `check_valid.js` `checkPairingOfRoofEnclosureStructure`, which runs on every call with `wind_parameters`; every `sample-api/` input matches it):

| `design_code` | Enclosed roof (`gable`, `hip`, `monoslope`) | Open roof (`pitched`, `troughed`, `open-monoslope`) | Omitted → |
|---|---|---|---|
| `asce7-16`, `asce7-22` | `mwfrs`, `cladding`, `mwfrs_cladding` | same (with `enclosure: "open"`) | `mwfrs` |
| `asce7-10`, `nscp2015` | `mwfrs`, `cladding` (no `mwfrs_cladding`) | same (with `enclosure: "open"`) | `mwfrs` |
| `nbcc2015`, `nbcc2020` | `mwfrs`, `cladding` | same | `mwfrs` |
| `as1170` | `building`, `cladding` | `free_roof` | `building` (so an open roof must send `free_roof`) |
| `is875` | `building`, `cladding` | same | `building` |
| `en1991`, `cte-db-se`, `sans10160` | `building` | `free_roof` | `building` (so an open roof must send `free_roof`) |
| `cfe-viento` | `building` | `free_roof` | `building`, or `free_roof` for an open profile |
| `as4055` | `building`, `cladding` (own validator) | — | `building` |

`free-roof` is accepted as an alias of `free_roof`. Not allowed anywhere: `"building"` on ASCE / NSCP / NBCC, `"mwfrs"` on AS/NZS / EN / IS / CFE / CTE (it is listed in some engine branches but rejected by the validator).

| Key | Description |
|---|---|
| `structure_type` | Per code and roof profile — see the table above. `"mwfrs"` = Main Wind Force Resisting System, `"cladding"` = Components & Cladding, `"free_roof"` = open/free roof (AS/NZS, EN, CTE, SANS, CFE). **Non-building ASCE structures** take their own code-suffixed value (e.g. `"freestandingwall-asce7-16"`) — copy it from the matching `sample-api/` template |
| `enclosure` | ASCE 7 / NSCP: `"enclosed"`, `"partially-enclosed"`, `"partially-open"`, `"open"` |
| `structure_level` | Array of `{ floor_level, floor_elevation }` — **the elevations the windward-wall pressure is reported at**. Omit it and the API warns (`"wind_parameters.structure_level is not defined. Default value ({"floor_level":"2","floor_elevation":3}) will be used"`) and you get a single 3m station instead of a profile up your actual structure |
| `wind_blockage` | ASCE 7/CFE/AS: `"clear"` or `"obstructed"` — AS/NZS 1170: `"empty"` or `"blocked"` |
| `building_orthogonal_axis_orientation` | AS/NZS 1170: the building's orientation to True North, in degrees as a string (e.g. `"90"`). Wind angle θ = 0 comes from this bearing. Blank or omitted, the API uses the bearing of `topography.wind_direction`. See [AS/NZS 1170 building orientation](#asnzs-1170-building-orientation-and-wind-angle-θ) |
| `gust_effect_factor_override` | ASCE 7-10/16 and NSCP 2015: user-defined Gust Effect Factor |
| `lowest_natural_frequency`, `damping_ratio`, `effective_area` | ASCE 7-22 ground-mounted solar panels only — see [Solar panel — ASCE 7-22 ground-mounted](#solar-panel--asce-7-22-ground-mounted) |

**AS/NZS 1170 also expects** these, each of which warns and silently defaults if omitted:
`elevated_building` (bool), `wall_condition` (e.g. `"5"`), `action_combination_case` (e.g. `"1"`),
`wall_type` (e.g. `"impermeable"`), `ratio_of_opening_to_total_area` (e.g. `"0"`). Copy
[`sample-api/loads.getLoads_as1170/input.json`](./sample-api/loads.getLoads_as1170/input.json)
rather than assembling `wind_parameters` by hand.

Also note `design_code` takes the **versioned** ASCE value (`asce7-10` / `asce7-16` / `asce7-22`) —
there is no bare `"asce7"`. `as1170` is unversioned.

Set `wind_parameters: false` to skip wind load calculation.

### Building dimensions (`building_data.building_dimensions`)

| Key | Description |
|---|---|
| `length` | Building length L: the dimension **parallel to the wind** in the first direction (ASCE `along_L`, AS/NZS θ = 0, NBCC 0°), not simply the longer side. NBCC's report calls it **B** |
| `width` | Building width B: the dimension across the wind in that direction (the windward wall's width). NBCC's report calls it **L** |
| `mean_roof_height` | Mean roof height |
| `height` | Wall height (used when `mean_roof_height` not the primary height input) |
| `roof_angle` | Roof pitch angle in degrees. `0` for a flat roof, with `roof_profile: "gable"`. For wind on `asce7-10`, `asce7-16`, `asce7-22`, `nscp2015`, `nbcc2015`, `nbcc2020`, any angle < 7° counts as flat — send the real angle and profile |
| `reference_height` | NBCC: reference height for the wind exposure factor. **At least 6 m**: a lower value returns site data but no pressures, with `msg` "reference_height should be greater than or equal to 6" |
| `eave_height` | NBCC: eave height. **Required** for NBCC wind, with `ground_to_top` ("eave_height is not defined" without it) |
| `ground_to_top` | NBCC: ground to the top of the building. **Required** for NBCC wind |

> **L and B follow the wind, for every code except NBCC.** L is parallel to the wind in the first
> direction and B across it; the second direction (ASCE `along_B`, AS/NZS θ = 90) swaps them. The
> results depend on it: leeward Cp uses L/B, roof zones run along the wind, and the windward wall
> area is h × B. So when the building comes from a model, decide which plan axis L runs along and
> send the model's extents along and across it; mapping the results back onto the model needs the
> same axis. NBCC swaps the names only: `length` is still parallel to the 0° wind, but its report
> labels it B ("wind along B") and `width` L. For a pitched gable roof, NBCC's 0° is wind across
> the ridge, so `length` is the dimension perpendicular to the ridge. See
> [NBCC wind pressures](#nbcc-wind-pressures).

### Snow parameters (`building_data.snow_parameters`)

Set `snow_parameters: false` to skip snow load calculation. Otherwise provide snow-relevant keys per design code.

### Seismic parameters (`building_data.seismic_parameters`)

#### ASCE 7-16

```json
{
  "seismic_parameters": {
    "structure_height": 21,
    "R": 8.5,
    "structure_system": "concrete-mrf",
    "Ct": 0.016,
    "x": 0.75,
    "redundancy_factor": 1.0,
    "weights": [
      { "level": "2F", "elevation": "33", "weight": "1200" },
      { "level": "Roof", "elevation": "66", "weight": "800" }
    ]
  }
}
```

`structure_system` options: `"steel-mrf"`, `"concrete-mrf"`, `"steel-eccentrically-braced"`, `"steel-buckling-restrained"`, `"others"`. Any other value requires numeric `Ct` and `x`.

ASCE 7-16/22 validation: `site_data.risk_category` must be `I`–`IV`; `sds`, `sd1`, `tl`, `R`, `structure_height` > 0; `s1` ≥ 0; each weight ≥ 0 with elevation > 0. Solver input errors come back as `"Invalid seismic input: ..."`.

ASCE 7-16 non-building `seismic_parameters` (site values `sd1`/`s1`/`sds`/`tl` come from the map or `site_seismic_data`):
- Ground solar (`panel_type: "ground"`): `R`, `W`, `T` required, all > 0.
- Rooftop solar and `rooftop_equipment`: `Wp` required (> 0). Optional `Rp` (1–12), `ap` (1–2.5), `Ip` (1–1.5); defaults 1.5 / 2.5 / 1.5.

#### NZS 1170.5

```json
{
  "seismic_parameters": {
    "return_period": 2000,
    "site_subsoil_class": "C",
    "T1": "0.67",
    "Sp": 1,
    "mu": 1,
    "weights": [
      { "level": "2", "elevation": "7", "weight": "1000" }
    ]
  }
}
```

#### NSCP 2015

```json
{
  "seismic_parameters": {
    "structure_height": "7",
    "R": "8.5",
    "Ca": "0.440",
    "Cv": "0.640",
    "structure_system": "concrete-mrf",
    "weights": [
      { "level": "2", "elevation": "3.7", "weight": "500" },
      { "level": "3", "elevation": "7",   "weight": "370" }
    ]
  }
}
```

#### NBCC 2015 / NBCC 2020

```json
{
  "seismic_parameters": {
    "structure_height": "12",
    "Ro": "1.0",
    "Rd": "4.0",
    "structure_system": "steel-mrf",
    "Ta": "0.548",
    "weights": [
      { "level": "2", "elevation": "3", "weight": "400" },
      { "level": "Roof", "elevation": "12", "weight": "280" }
    ]
  }
}
```

Site values `site_class`, `probability`, `Sa-0-2`, `Sa-0-5`, `Sa-1-0`, `Sa-2-0`, `Sa-5-0`, `Sa-10-0`, `PGA`, `PGV` are resolved per key: `seismic_parameters` first, then `site_data` (`site_class`, `probability`, `site_seismic_data.<key>`), then the map's `data.seismic_data["<probability>%/50"]` for the site. NBCC 2015 always uses `probability: "2"`. A key missing from all three returns `seismic_parameters.<key> is not defined.` (`status: 1`).

### Freestanding wall dimensions

```json
{
  "freestandingwall_dimensions": {
    "ground_to_top": 5,
    "wall_width": 10,
    "wall_height": 4,
    "ratio_of_solid_area_to_gross": 0.8,
    "length_of_return_corner": 1.5
  }
}
```

### Circular bin / tank dimensions

```json
{
  "circular_bin_dimensions": {
    "D": 10,
    "H": 15,
    "C": 1.5,
    "Z": 9,
    "configuration": "isolated",
    "roof_pitch_angle": 15
  }
}
```

Working ASCE 7-22 request: `sample-api/loads.getLoads_asce722_circular_bin` (two 100 ft × 60 ft tanks, imperial, so `D`/`H`/`Z`/`C` in ft). It also sends `number_of_tanks`, `wind_parameters.structure_type: "circular-bin"`, `surface_type` (e.g. `"moderately-smooth"`), `enclosure`, `roof_cladding_area` and `gust_effect_factor_override`. In that output the wall overturning moment `Mo` equals `F × Z` (116,764 lb × 6.5 ft); what `Z` and `C` stand for is not confirmed here, so take them from the Load Generator UI or report. The sample's top-level `user_input: { Kd: 1 }` is **ignored**: the engine only reads overrides from `wind_parameters`, and the reply still uses Kd = 0.85. Its `api_version: 3` has no branch of its own and behaves like 2.x.

### Solar panel — ASCE 7-22 ground-mounted

Ground-mounted panels under `asce7-22` take a **damping ratio** alongside the natural frequency (added in
Load Generator v6.9.0, Oct 2026). Template:
[`sample-api/loads.getLoads_asce722_solar_panel_ground/`](./sample-api/loads.getLoads_asce722_solar_panel_ground/input.json).

| Key | Value / description |
|---|---|
| `structure` | `"solar_panel"` |
| `panel_type` | `"ground"` |
| `wind_parameters.structure_type` | `"solar_panel"` |
| `wind_parameters.lowest_natural_frequency` | Lowest natural frequency of the panel structure, in **Hz** |
| `wind_parameters.damping_ratio` | Damping ratio of the panel structure as a **fraction of critical damping** (e.g. `"0.05"` = 5%), not a percentage |
| `wind_parameters.effective_area` | Effective wind area of the component |
| `solar_panel_dimensions` | Panel geometry object: `Lc`, `omega`, `h`, `Wg`, `sp`, `S`, `S_L`, `S_T`. Definitions are in the Load Generator UI; copy the values' shape from the template |
| `snow_parameters` | `false` |
| `building_parameters` | `false` |

```json
"building_data": {
  "design_code": "asce7-22",
  "structure": "solar_panel",
  "panel_type": "ground",
  "wind_parameters": {
    "structure_type": "solar_panel",
    "lowest_natural_frequency": "1.0",
    "damping_ratio": "0.05",
    "effective_area": "23"
  },
  "snow_parameters": false,
  "solar_panel_dimensions": {
    "Lc": "12", "omega": "24", "h": "6", "Wg": "90",
    "sp": "0.1", "S": "23", "S_L": "3", "S_T": "12"
  },
  "building_parameters": false
}
```

Units follow `project_details.units` (the template is `"imperial"`). Roof-mounted (open) solar panels are a
different request: `structure: "building"` — see `loads.getLoads_asce_open_solar_panel`.

---

## AS 4055 (`design_code: "as4055"`) — Australian residential, wind only

Small houses only. Snow and seismic are always off (`snow_parameters` / `seismic_parameters` are forced to `false`). Only `structure: "building"` is accepted — any other structure returns a validation error. Inputs are **metric** (m, degrees). No numeric wind speed: the map server returns the AS 4055 wind region; `wind_speed_override` is ignored.

**`site_data`**

| Key | Required | Options / default |
|---|---|---|
| `design_code` | Y | `"as4055"` |
| `project_address` or `lat` + `lng` | Y | |
| `topography.wind_direction` | N | `N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW` — direction used for map topography (default `N`) |
| `topography.country` | N | Default `"Australia"` (AS 4055 is Australia only) |
| `topography.terrain_category` | N | `CAT1`, `CAT1.5`, `CAT2`, `CAT2.5`, `CAT3`, `CAT3.5`, `CAT4`. Default `CAT2`. `building_data.wind_parameters.terrain_category` wins if both given |
| `topography.type_of_obstruction` | N | `"Flat"`, `"Hill"`, `"Escarpment"` — else from map |
| `topography.H` | N | Hill/escarpment height (m) — else from map |
| `topography.slope_deg` | N | Hill slope (degrees) — else `atan(map slope)`, or `atan(H / 2Lu)`; `0` for Flat |
| `topography.hill_zone` | N | `"Top-Third Zone"`, `"Mid-Third Zone"`, `"Lower-Third Zone"` — else from site elevation vs. foot + H/3, foot + 2H/3 |
| `distance_from_coastline` | N | km — else map `min_dist_from_aus_shoreline` (used for regions C/D) |
| `sls_and_uls`, `ari` | N | Accepted and ignored |

Each topography field is independent: a user value wins, missing fields come from the map. If the map reports a hill/escarpment without a height, topography falls back to `Flat`.

**`building_data`**

| Key | Required | Options / default |
|---|---|---|
| `design_code` | Y | `"as4055"` |
| `structure` | N | `"building"` (default) |
| `roof_profile` | Y | `gable`, `hip`, `skillion` |
| `building_dimensions.length` | Y | m |
| `building_dimensions.width` | Y | m, `0`–`16` |
| `building_dimensions.roof_angle` | Y | degrees, `0`–`35` |
| `building_dimensions.ground_to_top` | Y | Ridge height, m, `0`–`8.5` |
| `building_dimensions.roof_material` | N | `"tile"`, `"sheet-metal"` (default) |
| `building_dimensions.number_of_storeys` | N | `"one"` (default), `"two"` — `1`/`2`/`"1"`/`"2"` also accepted |
| `wind_parameters.structure_type` | N | `"building"` (default), `"cladding"` — legacy `"as4055-building"` / `"as4055-cladding"` accepted |
| `wind_parameters.wind_region` | N | `A`, `B1`, `B2`, `C`, `D` — else from map |
| `wind_parameters.terrain_category` | N | Same options as `site_data.topography.terrain_category` |
| `wind_parameters.shielding_class` | N | `"NS"` (default), `"PS"`, `"FS"` |

**Response:** `wind_pressure.pressures` is the AS 4055 Quick Design result passed through as a flat dictionary of `{ label: { value, units } }` (e.g. `"Wind Class": { "value": "N2" }`). `pressure_type` is `"building"` or `"components_and_cladding"`; `pressure_unit` is `kpa`.

```json
"site_data": { "design_code": "as4055", "project_address": "Sydney NSW, Australia", "topography": { "wind_direction": "N", "terrain_category": "CAT2" } },
"building_data": {
  "design_code": "as4055", "structure": "building", "roof_profile": "gable",
  "building_dimensions": { "length": 15, "width": 10, "roof_angle": 20, "ground_to_top": 6, "roof_material": "sheet-metal", "number_of_storeys": "one" },
  "wind_parameters": { "structure_type": "building", "shielding_class": "NS" },
  "snow_parameters": false, "seismic_parameters": false
}
```

---

## `site_analysis` Object (Optional)

Run wind calculations for all 8 directions and find the governing direction. Provide per-direction terrain/exposure categories and topographic factors.

### ASCE 7 / NSCP 2015

```json
{
  "site_analysis": {
    "terrain_category_all_directions": {
      "N": "B", "NE": "B", "E": "B", "SE": "C",
      "S": "C", "SW": "C", "W": "C", "NW": "D"
    },
    "topo_factor_all_direction": {
      "N": 1, "NE": 1, "E": 1, "SE": 1,
      "S": 1, "SW": 1, "W": 1, "NW": 1
    }
  }
}
```

### AS/NZS 1170.2

```json
{
  "site_analysis": {
    "terrain_category_all_directions": {
      "N": "CAT1", "NE": "CAT1", "E": "CAT2.5", "SE": "CAT2.5",
      "S": "CAT4", "SW": "CAT2.5", "W": "CAT2.5", "NW": "CAT1"
    },
    "topo_factor_all_direction":       { "N": 1, "NE": 1, "E": 1, "SE": 1, "S": 1, "SW": 1, "W": 1, "NW": 1 },
    "lee_multiplier_all_direction":    { "N": 1, "NE": 1, "E": 1, "SE": 1, "S": 1, "SW": 1, "W": 1, "NW": 1 },
    "hillshape_multiplier_all_direction": { "N": 1, "NE": 1, "E": 1, "SE": 1, "S": 1, "SW": 1, "W": 1, "NW": 1 }
  }
}
```

---

## `project_details` Object (Optional)

Used in generated reports.

| Key | Description |
|---|---|
| `name` | Project name |
| `id` | Project ID |
| `company` | Company name |
| `designer` | Designer name |
| `client` | Client name |
| `notes` | Notes |
| `units` | `"imperial"` or `"metric"` (ASCE 7 only) |
| `pressure_unit` | Output pressure unit (AS/NZS 1170 only) |

---

## Automatic Terrain Detection (`automatic_terrain`)

Set `"automatic_terrain": true` at the top level of `arguments` to detect the terrain / exposure category for every wind direction from building footprint data (OpenStreetMap via Overpass + Microsoft Global ML Building Footprints) — the same data and rules as the Load Generator UI button "Detect Building Footprints".

- **Codes:** `asce7-10`, `asce7-16`, `asce7-22`, `nscp2015`, `en1991`, `sans10160`, `as1170`, `as4055`, `nbcc2015`, `nbcc2020`.
- **Detection wins** over `site_analysis.terrain_category_all_direction` and, for the selected `site_data.topography.wind_direction`, over `site_data.topography` terrain/exposure (same as the UI "Adopt Data" button). NBCC: the site terrain only takes `A`/`B`; `intermediate` is carried by the upwind length.
- **Extras adopted per code:** AS/NZS 1170.2 shielding multiplier per direction; NBCC upwind length of rough terrain; EN 1991 UK/Ireland distance inside town (Town directions).
- **AS 4055** is single-direction: the governing direction (largest Mz,cat × Ms — the most severe site wind) sets `wind_parameters.terrain_category` and `shielding_class`. No map image is rendered for AS 4055 (its report has no map section).
- **Report:** with `automatic_terrain: true`, `report` defaults to `true` and the report includes a map image of the terrain sectors and buildings. Pass `"report": false` to skip the report and the image.
- **Coverage:** Microsoft footprints are used where the Microsoft dataset has height-coverage tiles for the site; elsewhere OpenStreetMap only (a warning is returned).
- **Failure never fails the request:** the user-supplied terrain is used and a warning is returned.

Response adds:

```json
"terrain_detection": {
  "terrain_category_all_direction": { "N": "CAT2.5", "NE": "CAT3", "...": "..." },
  "notes": "Terrain categories were auto-detected from OpenStreetMap (Overpass) and Microsoft Building Footprint ML data.",
  "warnings": [],
  "image": "data:image/png;base64,...",
  "governing_direction": "E"
}
```

`governing_direction` is AS 4055 only; `image` is `null` when the report is off. Template: `sample-api/loads.getLoads_as1170_automatic_terrain`.

---

## Response Structure

The envelope is the same for every code; `wind_pressure.pressures` is not. ASCE 7 / NSCP return a
flat array (below and [ASCE 7 / NSCP wind pressures](#asce-7--nscp-wind-pressures)); AS/NZS 1170
returns an object keyed by wind angle ([AS/NZS 1170 wind pressures](#asnzs-1170-wind-pressures));
NBCC returns an object keyed by direction (`"0"`, `"90"`) whose entries carry `p` and
`p_net: { min, max }`, per zone for a low building and per surface for a taller one
([NBCC wind pressures](#nbcc-wind-pressures)). Check the real payload in
[`sample-api/`](./sample-api/) for the code you're targeting before writing the parser.

```json
{
  "site_data": { "country": "...", "lat": 0.0, "lng": 0.0, "elevation": 0.0, "formatted_address": "..." },
  "wind_data": { "wind_speed": 108, "wind_speed_unit": "mph" },
  "snow_data": { "snow_load": 25 },
  "topography": { "topo_factor": 1.0, "terrain_type": "Flat", "wind_source_direction": "N" },
  "wind_pressure": {
    "pressure_type": "MWFRS",
    "pressure_unit": "psf",
    "elevation_or_location_unit": "ft",
    "report_link": "https://solver.skyciv.com/temp/view_report_..._wind.php",
    "pressures": [
      { "dirn": "along_L", "surface": "windward_wall", "elevation": [4.27, 8.53, 12.8],
        "pos_GCpi": [7.137, 7.137, 7.137, 7.137], "neg_GCpi": [12.275, 12.275, 12.275, 12.275] },
      { "dirn": "along_L", "surface": "leeward_wall", "elevation": 12.8, "pos_GCpi": ["-7.510"], "neg_GCpi": ["-2.371"] },
      { "dirn": "along_L", "surface": "sidewall", "elevation": 12.8, "pos_GCpi": ["-11.062"], "neg_GCpi": ["-5.923"] },
      { "dirn": "along_L", "surface": "roof_windward", "location": [6.4, 12.8, 19.69],
        "pos_GCpi": [-14.945, -12.760, -9.363], "neg_GCpi": [-9.807, -7.622, -4.225] },
      { "dirn": "along_L", "surface": "roof_leeward", "location": [6.4, 12.8, 19.69], "pos_GCpi": [...], "neg_GCpi": [...] },
      { "dirn": "along_B", "surface": "windward_wall", ... }, ...
    ]
  },
  "snow_pressure": null,
  "seismic_results": { ... }
}
```

(ASCE 7-16, flat roof, L = 19.69 ft, B = 13.45 ft, h = 12.8 ft, enclosed — the values of the
report the example is taken from.)

### ASCE 7 / NSCP wind pressures

MWFRS of enclosed and partially enclosed buildings (`pressure_type: "MWFRS"`). Every value is a
**net** pressure p = q·G·Cp − qh·(GCpi) in `pressure_unit`, positive toward the surface.

- **`dirn`**: `along_L` is wind blowing parallel to the building length (the report's "Wind
  along L", windward wall of width B); `along_B` parallel to the width. There is no orientation
  input and no separate 180° / 270°: each applies either way along its axis.
- **`pos_GCpi` / `neg_GCpi`**: the same surface with +GCpi and with −GCpi (the report's
  `pe − +pi` and `pe − −pi` columns). The internal pressure qh·GCpi is half the difference
  between a wall's two values, e.g. (12.275 − 7.137) / 2 = 2.569 psf.
- **Values may be numbers or numeric strings** (leeward and side wall come as `["-7.510"]`).
  Parse them.
- **`windward_wall`**: one value per `structure_level` (`elevation`, in the order sent), **plus one
  more** at the mean roof height h.
- **`leeward_wall` / `sidewall`**: one value for the whole wall (`elevation` is the top level).
  The side wall has a single Cp, not zones.
- **Roof, wind across the ridge (`along_L`, roof angle ≥ 10°)**: `roof_windward` and
  `roof_leeward` hold one value each, for the windward and leeward slopes; `location` is
  `[h + L + B]`, a "whole roof" marker, not a distance.
- **Roof, angle < 10° (includes flat, < 7°) or wind along the ridge (`along_B`)**: `roof_windward` and `roof_leeward`
  are the same zone table, by distance from the windward edge: 0–h/2, h/2–h, h–2h, > 2h, only as
  many as the building is deep. `location` holds the zone ends, but **the `along_B` entries repeat
  the `along_L` locations** (an API bug), so take the zone edges from h, not from `location`.
- **Only the governing roof Cp per internal sign.** Figure 27.3-1 gives two Cp per roof zone
  (e.g. −1.02 and −0.18); the report shows both rows, but the response keeps, for each internal
  sign, only the larger-magnitude result (`pressure_roof_absmax` in the API). The external
  pressure behind each value is pe = pos + qh·GCpi = neg − qh·GCpi. When those agree there is one
  external pressure; when they differ, the response carries two.
- **Hip roofs** add `roof_side` per direction: the hip-end zones, `location` = zone ends from the
  windward edge (0.5h, h, 2h, clipped to the roof length along the wind, which ends the list).
  `roof_windward` / `roof_leeward` are then one value each in both directions.
- **Open buildings** (`enclosure: "open"`) return roof values as `{ "Cn", "p" }` objects (cases A
  and B), and no walls.
- **Not in the response:** the MWFRS load cases of Figure 27.3-8 (75% partial and torsional
  loading). Add them yourself where the building needs them.

**Load cases.** Each external pressure with each internal pressure, numbered as the report lays
them out (one row per external pressure, +GCpi then −GCpi):

| Case | External pressure | Internal | Value |
|---|---|---|---|
| 1 | first (pe = pos + qh·GCpi) | +GCpi | `pos_GCpi` |
| 2 | first | −GCpi | `pos_GCpi` + 2·qh·GCpi |
| 3 | second (pe = neg − qh·GCpi), only if it differs | +GCpi | `neg_GCpi` − 2·qh·GCpi |
| 4 | second | −GCpi | `neg_GCpi` |

With one external pressure (the usual case, walls always) there are two cases: case 1 =
`pos_GCpi`, case 2 = `neg_GCpi`. Name groups after the report: `Along_L_case1`, `Along_L_case2`,
`Along_B_case1`, … The walls' along-wind force (windward − leeward) is the same in every case and
matches the report's base shear V_wall (2.5214 kip along L in the example).

### NBCC wind pressures

MWFRS, static procedure (`nbcc2015`, `nbcc2020`). `pressures` is keyed by direction, `"0"` and
`"90"`, in `pressure_unit` (kPa) and `elevation_or_location_unit` (m), positive toward the surface.
Verified against the live API and the reports on 2026-11-08 (Toronto, 6 × 4.1 m plan at 3.9 m and
23.4 m high; 12 × 8.2 m at 2.6 m).

- **Directions.** `"0"` is wind parallel to the request's `length`, which the report calls
  **B** ("Net Wind Pressure - Wind along B"); `"90"` is parallel to `width`, the report's **L**
  (`wind_parameters.B` echoes `length`, `wind_parameters.L` echoes `width`). For a gable, 0° is
  wind across the ridge. Each applies either way along its axis.
- **`p_net.min` / `p_net.max`**: `p − (+pi)` and `p − (−pi)`, the report's "Net pressure (min.)"
  and "(max.)" columns, with `pi_max` / `pi_min` (e.g. 0 and −0.119 kPa for Cpi 0 / −0.15) in
  `wind_parameters`. There is one external pressure `p` per zone, so there are two load cases per
  direction: case 1 = `p_net.min`, case 2 = `p_net.max`. Name them after the report:
  `Along_B_case1`, `Along_B_case2`, `Along_L_case1`, `Along_L_case2`.

**Low building** (H ≤ 20 m and H < the least plan dimension; Section 4.1.7.6, Figure 4.1.7.6.-A).
Each entry has a `zone` and the combined `CpCg`, all at the reference height (`elevation`, at
least 6 m for Ce). `Z` (top level and in `wind_parameters`) is the end-zone width z, the lesser of
10% of the least plan dimension and 40% of H, but not less than 4% of it or 1 m. Entries carry no
distances; the zones are:

| `"0"`: Load Case A, wind across the ridge | `"90"`: Load Case B, wind along the ridge |
|---|---|
| 1 windward wall, 4 leeward wall | 5 windward (gable) wall, 6 leeward (gable) wall |
| 2 windward roof half (to the ridge), 3 leeward half | 1 and 4 the side walls; 2 and 3 the roof halves next to them |
| 1E–4E: the same surfaces over an end strip **y = max(2z, 6 m)** wide, at one end | 1E–4E: side walls and roof over the first y from the windward end; 5E / 6E: the gable walls over a strip z wide at the zone-1 corner |
| Side (gable) walls: no pressure in Case A | |

The end zones sit at one corner, the reference windward corner of the figure, on the zone 1 side.
NBCC requires each corner to be taken in turn as the windward corner, so a full set is 4 corners
× 2 load cases (8 load patterns) per internal pressure; the report shows one corner. NBCC also
allows y to be the distance from the end to the first interior frame, for framed buildings.

**Taller building** (Section 4.1.7.5, H > 20 m or H ≥ the least plan dimension). Each entry has a
`surface`, `Cp`, `Ce` and `Cg`: `Windward Wall` once per `structure_level` (`level`, `elevation`,
Ce at that height), `Leeward Wall` at h/2, `Sidewall` and `Roof` at h, the roof twice, with
`location` `"[mathin] x ≤ H [mathin]"` and `"[mathin] x > H [mathin]"` (distance from the windward
edge). NBCC's partial-loading cases for torsion are not in the response.

### AS/NZS 1170 wind pressures

`data.wind_pressure.pressures` for `design_code: "as1170"`, building structures. Every value is a
pressure in `wind_pressure.pressure_unit` (`"pa"` in the metric sample), positive acting **toward**
the surface and negative away from it (suction). Distances are in `elevation_or_location_unit`.
Taken from [`sample-api/loads.getLoads_as1170/output.json`](./sample-api/loads.getLoads_as1170/output.json).

```json
"pressures": {
  "windward_pressure": { "0": [ { "min": { "pe": 392.9, "pi": -175.5, "combined": 568.4 },
                                  "max": { "pe": 392.9, "pi": 0, "combined": 392.9 },
                                  "cpe": 0.8, "cshp": 0.64, "Vz": 31.99, "Ka": 1, "Kce": 0.8, ... }, ... ],
                         "90": [...], "180": [...], "270": [...] },
  "leeward_pressure":  { "0": { "min": {...}, "max": {...}, "cpe": -0.3, ... }, ... },
  "sidewall_pressure": { "0": [ 4 zones ], ... },
  "roof_pressures":    { "upwind": [...], "downwind": [...] },
  "roof_pressures_all_direction": {
    "0":  { "upwind": [ { "cpe": { "min": -1.18, "max": -0.56 },
                          "combined_min": { "min": { "pe": -828.4, "pi": -175.5, "combined": -652.9 },
                                            "max": { "pe": -828.4, "pi": 0, "combined": -828.4 } },
                          "combined_max": { "min": {...}, "max": {...} }, ... } ],
            "downwind": [ { "cpe": { "min": -0.66 }, "combined_min": {...} } ] },
    "90": { "crosswind": [ 5 zones ] }, "180": {...}, "270": {...}
  },
  "internal_pressures": { "0": { "min": { "pressure": -175.5, "cpi": -0.2 }, "max": { "pressure": 0, "cpi": 0 } }, ... },
  "api_wind_parameters": { "V_des_theta": { "0": 38.24, ... }, "V_sit_beta_all_direction": { "N": 34.2, ... }, "Md_all_direction": {...}, ... }
}
```

- **Keys `"0"`, `"90"`, `"180"`, `"270"` are the building wind angle θ, not compass bearings.** See
  [AS/NZS 1170 building orientation](#asnzs-1170-building-orientation-and-wind-angle-θ).
- **`min` / `max` are the minimum and maximum internal pressure** (`internal_pressures[θ]`), not
  the smaller and larger result. `pe` is the external pressure, `pi` the internal one, and
  `combined` the net pressure `pe − pi` to design with.
- **Roof entries have two external pressures as well:** `combined_min` uses Cpe min (`cpe.min`,
  the `min` / `cshp_min` value) and `combined_max` uses Cpe max. Each holds the same `min` / `max`
  internal pair, so the net roof pressure is e.g. `combined_min.max.combined`. Some entries
  (e.g. a pitched roof's downwind slope) have only `cpe.min` and so only `combined_min`.
- Use `roof_pressures_all_direction[θ]`. `roof_pressures` is one roof per kind (`upwind` /
  `downwind` from θ = 0, `crosswind` from θ = 90) and can't tell θ = 0 from 180 or 90 from 270.
- **The entries carry no heights or distances.** They are, in order:
  - `windward_pressure[θ]`: one entry per `wind_parameters.structure_level`, in the order sent
    (each one at that level's `floor_elevation`). One entry when no levels were sent.
  - `sidewall_pressure[θ]`: 4 zones by distance from the windward edge, h = mean roof height:
    0–h, h–2h, 2h–3h, > 3h. All 4 are returned even when the building is shorter than 3h.
  - roof `crosswind`: 5 zones from the windward edge: 0–0.5h, 0.5h–h, h–2h, 2h–3h, > 3h. The
    report gives a flat roof (`roof_profile: "gable"`, `roof_angle: 0`) the same 5 zones at every
    θ; which key they come under at θ = 0/180 isn't confirmed, so check the payload.
  - roof `upwind` / `downwind` with one entry each: the upwind and downwind slopes of a pitched
    roof with the wind across the ridge.
  - `leeward_pressure[θ]`: one value for the whole wall.

**Load cases.** Each roof Cpe with each internal pressure, numbered as the report lays them out
(one row per Cpe, internal min then max):

| Case | Roof Cpe | Internal pressure | Walls | Roof |
|---|---|---|---|---|
| 1 | min | min | `min.combined` | `combined_min.min.combined` |
| 2 | min | max | `max.combined` | `combined_min.max.combined` |
| 3 | max | min | `min.combined` | `combined_max.min.combined` |
| 4 | max | max | `max.combined` | `combined_max.max.combined` |

A wind angle whose roof entries have no `combined_max` (one Cpe) has cases 1 and 2 only.
Internal pressure acts on every surface at once, so a case uses the same `min` or `max` for the
walls and the roof. The walls have a single Cpe, so only the internal pressure changes them
between cases. Apply each case as its own load group, named so it can be matched to the report,
e.g. `Wind_0_Case1_East` (θ, case, compass direction the wind comes from). The along-wind force
is the same in all four cases of a θ: internal pressure cancels across opposite walls.

### AS/NZS 1170 building orientation and wind angle θ

- θ is measured clockwise from the building's orthogonal axis. **θ = 0 blows along the building
  length** (`building_dimensions.length`) **and hits Wall 1**; θ = 90 along the width onto Wall 2,
  and so on (the report's Wall 1–4 diagram).
- The wind at θ comes from the compass bearing **orientation + θ** (clockwise from True North).
  The report states it as "Orientation of Building Length, L, with respect to True North".
- The orientation is `wind_parameters.building_orthogonal_axis_orientation`. Left blank, the API
  uses the bearing of `site_data.topography.wind_direction`: every saved test run with a blank
  orientation and `"W"` came back as 270°, and with `"E"` as 90°. None of those runs shows whether
  an explicit orientation overrides `wind_direction`, so set both to the same bearing.
- That decides which direction multiplier, terrain category and topography each θ uses, so set it
  from the real building. To match a model, take the bearing of the model axis the building
  length runs along.
- **Check the response against it:** `api_wind_parameters.V_des_theta[θ]` is the largest of
  `V_sit_beta_all_direction` over the three 45° sectors around orientation + θ (minimum 30 m/s).
  If that doesn't hold for the orientation you sent, the API used a different one, and the compass
  directions you'd give the loads are wrong.

### Errors and warnings

Every response has `status` (`0` = OK, `1` = failed) and `msg` (human-readable text). When `msg` is non-empty, two structured arrays are added next to it:

```json
{
  "status": 1,
  "msg": "site_data.risk_category should be one of I, II, III, IV. \n",
  "errors": [{
    "code": "INVALID_ENUM",
    "field": "site_data.risk_category",
    "message": "site_data.risk_category should be one of I, II, III, IV.",
    "hint": "Set the field to one of the expected values.",
    "expected": ["I", "II", "III", "IV"]
  }],
  "warnings": [{
    "code": "DEFAULT_APPLIED",
    "field": "wind_parameters.wind_blockage",
    "default": "clear",
    "message": "wind_parameters.wind_blockage is not defined. Default value (clear) will be used."
  }]
}
```

- `errors` is only filled when `status` is `1`. Fix every entry, then resend.
- `warnings` do not block the run. `DEFAULT_APPLIED` means a default was used; send the field explicitly if the default is wrong.
- `field` is the input path when known (may be relative to `site_data` / `building_data`, e.g. `wind_parameters.x` → `building_data.wind_parameters.x`), else `null`.

| `code` | Meaning | Fix |
|---|---|---|
| `MISSING_FIELD` | Required field absent | Add `field` |
| `INVALID_TYPE` | Wrong type (number, integer, array, object) | Change value type |
| `OUT_OF_RANGE` | Number outside allowed range | Use value in stated range |
| `INVALID_ENUM` | Value not in allowed list | Use one of `expected` |
| `INVALID_VALUE` | Value not recognised | Check allowed values for this design code |
| `INCOMPATIBLE_COMBO` | Two fields conflict (e.g. `enclosure` vs `roof_profile`) | Change one of them |
| `UNSUPPORTED_FOR_CODE` | Structure type not supported by `site_data.design_code` | Change code or structure |
| `SITE_DATA_UNAVAILABLE` | Map lookup unsupported at this location | Ask the user for the value, then set the override in `field` (e.g. `site_data.wind_speed_override`); never invent one |
| `SOLVER_INPUT_ERROR` | Solver rejected the input (`"Invalid <wind/snow/seismic> input: ..."`) | Fix the input named in `message` |
| `SERVER_ERROR` | Internal failure, not input-related | Retry later / contact support@skyciv.com |
| `INPUT_ERROR` | Unclassified | Read `message` |

### `status: 1` is a warning, not necessarily a failure

The envelope's `status` is `1` both for hard failures **and** for "field not defined, default used"
warnings — and in the warning case the response still carries a perfectly usable payload. A single
`msg` string concatenates every warning, so one bad field's message sits next to several harmless
defaulting notices:

```
"wind_parameters.structure_level is not defined. Default value (...) will be used.
 topography.country is not defined. Default value (Australia) will be used.
 structure_type is not applicable to roof_profile defined"
```

The structured arrays split this for you: every "Default value (...) will be used" line is a `DEFAULT_APPLIED` entry in `warnings`, and with `status: 1` every other line is an entry in `errors` (see [Errors and warnings](#errors-and-warnings)). Show `errors` first — they name the field to fix.

**Judge the call on whether `data.wind_pressure` came back, not on `status`** — treat a missing
`wind_pressure` as the failure and surface `msg` verbatim to the user, and treat `status: 1`
*with* pressures as a warning to display alongside the results. Branching on `status !== 0` alone
throws away good results; ignoring `msg` entirely hides the one line that says which field was
wrong.

---

## Normalized Results (`scripts/normalize_loads.js`)

Plain Node, no dependencies. Use it instead of writing a per-code parser; the per-code sections above explain what it does.

```bash
node scripts/normalize_loads.js output.json          # normalized JSON to stdout
node scripts/normalize_loads.js --check input.json   # lint request; exit 1 on errors
node scripts/normalize_loads.js --self-test          # run against every sample-api/ pair
```

```js
const { normalizeLoads, checkRequest, groupName } = require('./scripts/normalize_loads.js');
const r = normalizeLoads(apiReply);   // {status,msg,data} or the full {response:{...}} envelope
```

| Field | Meaning |
|---|---|
| `ok` | `true` when any of `wind_pressure` / `snow_pressure` / `seismic_forces` came back |
| `errors`, `warnings`, `status`, `msg` | Passed through from the API |
| `report_link` | Viewable calculation report (show it to the engineer) |
| `units` | `{ pressure, length, force }` exactly as the API labels them (`psf`, `pa`, `kPa`, `ft`, `m`, `kip`, `kN`) |
| `ok`, `reason` | `ok: false` always has a `reason`: `site_only: …` (no `building_data` — e.g. `getSiteData`, `loads.getLoads_asce_wind_only`) or `failed: <msg>` |
| `site` | `{ wind_speed, wind_speed_unit, snow_load, snow_load_unit }` from `wind_data` / `snow_data` |
| `wind.family` | Which parser ran: `asce` (ASCE 7 + NSCP MWFRS), `as1170`, `nbcc`, `en1991` (also SANS 10160), `is875`, `cfe`, `open_roof` (CFE pitched / canopy), `cte`, `solar_panel` (AS/NZS ground solar), `circular_bin` (ASCE tanks), `cladding` (C&C only), `forces` (non-building structures), `as4055`, `none` (nothing came back), `unsupported` (read `pressures` directly) |
| `wind.records[]` | `{ direction, case, internal, surface, zone, elevation, p }` — see below |
| `wind.cladding[]` | C&C: `{ zone, area, elevation, level, p_min, p_max }` (envelope per zone; design cladding/fixings with these, don't apply them to the frame) |
| `wind.forces[]` | Non-building resultants: `{ direction, case, surface, location, component, F, e, unit }` — see below |
| `wind.summary[]` | AS 4055 only: `{ key, label, info, value, unit }`, e.g. `ult_2` "All Roof Zones" `[0.6, -0.95]` kPa |
| `wind.mirror[]` | `{ direction, mirror_as }` for every direction whose opposite the API did not return — build a mirrored pattern (Applying loads, step 1) |
| `wind.notes[]` | API gaps and known bugs found in this reply — read every one |
| `snow` | `{ unit, balanced, balanced_key, balance_case, unbalanced }`. `balanced` is ASCE `ps` (sloped roof, falls back to `pf`) or NBCC `S` |
| `seismic` | `{ unit, V, Ft, levels: [{ direction, level, elevation, weight, F }], notes }`. `direction` is `x` / `z` (NZS 1170.5, both directions) or `both` (ASCE / NSCP / NBCC: same storey forces in each plan direction). A non-zero NBCC / NSCP top force `Ft` is added to the top level's `F` when the API left it out (the storey forces then sum to `V`); `notes` says so |

**`wind.records`:**

| Key | Meaning |
|---|---|
| `direction` | Code's own key: `along_L` / `along_B` (ASCE, NSCP), `"0"` `"90"` `"180"` `"270"` (AS/NZS θ, EN, CFE, IS, NBCC). `along_L` / `"0"` = wind parallel to `building_dimensions.length` |
| `case` | Load case number as the SkyCiv report numbers it (1–2, or 1–4 when a roof zone has two governing external pressures). Every surface of a direction is present in every case, so **one direction + one case = one complete load pattern** |
| `internal` | `max` / `min`: the algebraically larger / smaller internal pressure used. `null` for open buildings (cases are Cn A/B) |
| `surface` | `windward_wall`, `leeward_wall`, `sidewall`/`side_wall`, `roof_windward`, `roof_leeward`, `roof_upwind`, `roof_downwind`, `roof_crosswind`, `roof_side` (hip), or the code's label (`Windward Wall`, `Roof`, `windward`, …) |
| `zone` | `level_N` (windward wall, Nth `structure_level`), `h` (windward wall at mean roof height), `zone_N` (Nth zone from the windward edge — distances per code in the sections above), or the code's zone letter (EN `D`…`I`, IS `A`…`H`, NBCC `1`…`6E`) |
| `elevation` | Height the value was computed at, in `units.length`, when the API gives one |
| `p` | **Net** design pressure (external − internal), in `units.pressure`, **positive toward the surface** (pushes on it), negative away (suction / uplift) |

`groupName(rec)` returns the load group name to use in S3D: `W_<direction>_case<case>`, e.g. `W_along_L_case1`, `W_90_case3`. For a mirrored pattern pass the `mirror_as`: `groupName(rec, "270")` → `W_270_case1`, `groupName(rec, "along_L_neg")` → `W_along_L_neg_case1`.

EN 1991 roof zones with two external coefficients (e.g. Cpe +0.14 / −1.14 at low pitch) come back as arrays: the first Cpe gives cases 1–2, the second cases 3–4, and every other surface of that direction is repeated into cases 3–4 so each direction × case is still a complete pattern.

**`wind.forces`:**

| Key | Meaning |
|---|---|
| `direction` | API key (`"0"`, `"45"`, `"90"` for AS freestanding wall / ASCE rooftop equipment); `null` when the API gives none (pole, signboard, ASCE freestanding wall, ground solar) — the force then acts along whichever wind direction you are checking, so apply it once per plan direction |
| `case` | ASCE freestanding wall `A` / `B` / `C`; ground solar `max` / `min`; else `null` |
| `surface`, `location` | Where it acts: `pole` at `height/2`, `signboard` at `center+eccentricity` (eccentricity in `wind_pressure.parameters.eccentricity`), freestanding wall bands (`"0 to s"`, `"14 m to 28 m"`), `e = 10.000 ft` |
| `component` | `along` (horizontal, in the wind direction), `vertical` (rooftop equipment `Fv`, **+ = uplift**), `normal` (ground solar `Fn`, normal to the panel), `moment` (ground solar `Mc`, about the panel hinge) |
| `F` | Force (or moment) in `unit` (`N`, `kN`, `lb`, `lb-ft` — per record; it varies by code and structure) |
| `e` | AS freestanding wall: horizontal eccentricity of `F` from the wall centre, in `units.length` |

---

## Reading Other Outputs

Shapes not covered above (all verified against the `sample-api/` outputs). The normalizer handles every row marked ✓.

| Code / structure | `wind_pressure.pressures` shape | Notes |
|---|---|---|
| ✓ EN 1991 building | `{ "0": [...], "90": [...], "180": [...] }`, entries `{ surface, zone, elevation, qp_z, cpe, we, wi_max, wi_min, we_wi_min, we_wi_max }` | Net = `we − wi`. `we_wi_min` = `we − wi_max`, **not** "with minimum internal". Roof zones `F`…`I` (`F_up`/`F_low` at 90°) |
| ✓ IS 875 building | Flat array `{ direction, zone, elevation, level, Cpe, Cpi, pd, pnet }` | One row per `Cpi` (±0.2); rows repeat — dedupe. Zones `A`…`H` per IS 875-3 tables |
| ✓ CFE Viento gable | `{ pz: {θ: {windward, leeward, sidewall[4], roof_windward, roof_leeward \| flat_roof}}, pe, pi }` | `pz` = net; its `min`/`max` = with `pi.min`/`pi.max`. Two-Cpe roofs nest `{min:{min,max}, max:{min,max}}` (outer = Cpe) |
| ✓ ASCE / NSCP C&C | Array `{ zone, area, elevation, level, p: {min, max} }` | `area` = effective wind area. Also inside `components_cladding.pressures` when `structure_type: "mwfrs_cladding"` (with `mwfrs.pressures` beside it) |
| ✓ AS/NZS 1170 C&C | Array of `{ <zone e.g. WA1, SA1, RA2>: { pressure, cpe, Kl, location, combined: {min, max} } }` | `combined.min/max.combined` = net with min/max internal |
| ✓ AS/NZS 1170 open roof | `roof_pressures: {θ: [{ location: "Upwind"\|"Downwind", cpn, min:{pe}, max:{pe} }]}` | Net pressure coefficient `cpn`; no internal pressure |
| ✓ ASCE open roof | ASCE array; `along_B` values are `[{ Cn, p }]` objects | Cases are Cn A / B, not ±GCpi |
| ✓ Freestanding wall, pole, signboard, rooftop equipment, ASCE ground solar | `pressures` null; use `wind_pressure.forces` | AS freestanding: `forces[θ] = [{ F, force_unit, e, Cpn, location }]` (θ `0`, `45`, `90`; F at eccentricity `e`, or per band along the wall at 90°). ASCE freestanding: `[{ case: "A"\|"B"\|"C", location, p, As, F }]`. Pole: `[{ surface: "pole", location: "height/2", magnitude }]`. EN signboard: signboard at `center+eccentricity` plus pole at `height/2`. Rooftop equipment: `{θ: { Fh, Fv, force_unit }}`. ASCE ground solar: `[{ zone, Fn_max, Fn_min }]` plus `wind_pressure.moment[{ zone, Mc_max, Mc_min }]`. Truss tower (from `results.js`, no sample): `[{ dirn: "normal"\|"diagonal", magnitude: force per level }]` |
| ✓ ASCE 7-16/22 circular bin / tank | No `pressures`. `forces: { wall: { F, Mo, Cf, F_minimum } }`, `pressure: { roof: { zone1: { pos, neg }, zone2 } }`, `wall_cladding_pressures[{ angle, GCp_alpha, p: { pos, neg } }]`, `roof_cladding_pressures[{ zone, area, GCp, p: { pos, neg } }]`, `summary[]`, `force_unit` | Axisymmetric (`direction: "any"`). Roof `pos`/`neg` = net with +GCpi / −GCpi (cases 1/2). `wall_cladding_pressures` give the pressure round the shell by angle from the windward meridian (0° windward, suction from 45°); the normalizer puts them and the roof C&C in `wind.cladding` (`wall_30deg`, `roof_zone_3`). The governing of `F` and `F_minimum` is taken as the wall force. AS/NZS 1170 tanks use `pressures`/`forces`/`summary` from a different calc, with no sample |
| ✓ AS/NZS ground solar | `{ "0deg": { upwind: { windward: { edge, inner }, leeward: {...} }, downwind: {...} }, "180deg": {...} }`, each `{ pressure, cpn }` | Net pressure on the panel, AS/NZS 1170.2 sign (+ toward the top face). Normalized as `surface: upwind_row`, `zone: windward_edge` |
| ✓ CFE Viento pitched / free roof | `{ "0": [{ location: "Barlovento"\|"Sotavento", min, max }], "90": [{ location: "0 to h"…, min, max }] }` | Net (no internal pressure); Barlovento = windward half, Sotavento = leeward half. `case 1` = `min`, `case 2` = `max` |
| ✓ CTE DB SE | `{ pressures: [{ description: "Presión"\|"Succión", elevation, cpe, ce, qb, qe, cpi }], pression, succion, qb, vb }` | `qe` = qb·ce·(cpe − cpi), net, in **kN/m²** although `pressure_unit` says `"pa"` (`results.js` overwrites the calc's `kPa` label). One direction only (`"0"`); Presión = windward face, Succión = leeward face |
| ✓ AS 4055 | Flat `{ key: { label, value, units, info } }` (e.g. `"Wind Class": { value: "N2" }`, `ult_2`: `{ label: "All Roof Zones", value: ["0.60","-0.95"], units: "kPa" }`) | Classification plus one general ULS/SLS pressure pair per element, uplift and racking. **No directions or zones, so there are no per-face loads to apply to a frame model**; `wind.summary` holds them |
| ✓ SANS 10160 (from `results.js`, no successful run) | As EN 1991 building; `cpe`, `we`, `we_wi_*`, `w_net` may be arrays | Read as `en1991` |

**Snow (`data.snow_pressure`):** `{ pressure_type: "snow", pressure_unit, parameters, balance_case, unbalance_case, report_link }`. ASCE `balance_case = { pf, ps, pm, pr }` — apply `ps` (sloped-roof snow, on horizontal projection), check `pm` (minimum) governs low-slope roofs. `unbalance_case[]` entries carry `snow_load_case` (e.g. `symmetric_gable`), `balanced_snow_load[]` and `unbalanced_snow_load[]` per roof segment. NBCC `balance_case = { S }` and multi-level-roof `unbalance_case[]` with `p1_unbalanced`…`p3_unbalanced`, `xd`. Not returned for EN 1991 / AS/NZS 1170 building samples — those give the site value in `snow_data` only.

**Seismic (`data.seismic_forces`):** `{ input_parameters, forces, force_unit }`.

| Code | `forces` | Storey force key |
|---|---|---|
| ASCE 7-16/22 | `{ V, Cs, T, k, seismic_design_category, vertical_distribution_forces[], diaphragm_forces[], response_spectrum_data[] }` | `Fx` (with `Cvx`, `wh`, `k`) |
| NSCP 2015 | `{ V, T, Ta, Ct, V_min, V_max, Ft, vertical_distribution_forces[], response_spectrum_data[] }` | `Fx` (each entry also repeats `Ft`, the top force) |
| NBCC 2015/2020 | `{ V, V_min, V_max, Ft, S_Ta, S_0_2`…`S_10_0, Mv, J, Ie, vertical_distribution_forces[], overturning_moment_forces[], design_spectrum_data[] }` | `Fx` (each entry repeats `Ft`); `overturning_moment_forces[]` gives `Mx` and `Jx` per level, base last |
| NZS 1170.5 | `{ Ch_T[], x_direction: { V, Cd_T[], vertical_distribution_forces[] }, z_direction: {...} }` | `Fi` |

`data.seismic_data` is the **site** hazard (ASCE `ss`, `s1`, `sds`, `sd1`…, NBCC `Sa(T)` per probability, NSCP `Z`, `Na`, `Nv`), returned even when no forces are computed. Accidental torsion and vertical seismic are not in the response.

---

## Applying Loads to an S3D Model

Same rules for the API ([`s3d-api`](../s3d-api/SKILL.md): write into `s3d_model`, then `S3D.model.set` / solve) and in-app ([`s3d-apps`](../s3d-apps/SKILL.md): `S3D.structure.loads.*.add(...)`, credentials from `SKYCIV_UTILS.currentUser.getApiAuth()`, load-gen call in its own `standalone.loads.start` request). Run the Load Generator first, normalize, then:

1. **Fix the axis mapping before calling.** Choose the model plan axis `building_dimensions.length` runs along (S3D's vertical axis is `Y` by default, so plan axes are `X` and `Z`). Record it, e.g. `length ∥ X`. Then:

   | Load-gen direction | Wind blows along model |
   |---|---|
   | ASCE `along_L`, AS/EN/CFE/IS/NBCC `"0"` | the `length` axis (`+X` here) |
   | ASCE `along_B`, `"90"` | the `width` axis (`+Z` here) |
   | AS/EN `"180"`, AS `"270"` | `−X`, `−Z` (explicit in the reply) |

   **Mirrored directions.** Wind from the opposite side must be checked too. Where the API leaves it out, `wind.mirror` lists it: reflect that direction's pattern through the building centre (windward ↔ leeward faces, zone order measured from the new windward edge, side-wall zones keep their distance from the windward edge) and name it `groupName(rec, m.mirror_as)`.

   | Code (samples checked) | API returns | Build yourself |
   |---|---|---|
   | ASCE 7-10/16/22, NSCP (`along_L`, `along_B`) | one pattern per axis | `along_L_neg`, `along_B_neg`. For a **monoslope** roof the high and low eaves differ: the reverse wind is not a true mirror — rerun with `length`/`width` swapped or read the report |
   | AS/NZS 1170 (`0`, `90`, `180`, `270`) | all four | nothing |
   | EN 1991 monoslope (`0`, `90`, `180`) | 0, 90, 180 | `270` (mirror of 90) |
   | NBCC, IS 875, CFE (`0`, `90`) | two | `180`, `270` |
   | CTE DB SE (`0`) | one | `180` |
   | Non-building `forces` | per structure | apply in each plan direction both ways (`direction: null` forces have no orientation) |

   For AS/NZS 1170 also check the compass bearing from [building orientation](#asnzs-1170-building-orientation-and-wind-angle-θ).

   **Extra load cases the API does not generate.** These come from the code, not the response; the normalizer's cases are internal-pressure / Cpe cases only.

   | Code | What to add | Source |
   |---|---|---|
   | ASCE 7-10/16/22 Directional (MWFRS, `along_L`/`along_B`) | Fig. 27.3-8 (7-10: Fig. 27.4-8). Case 1 = the API patterns. Case 2 = 0.75 × windward + leeward wall pressures (P<sub>W</sub>, P<sub>L</sub>) of one axis, plus torsion M<sub>T</sub> = 0.75 (P<sub>W</sub> + P<sub>L</sub>) B<sub>x</sub> e<sub>x</sub>, e<sub>x</sub> = ±0.15 B<sub>x</sub>. Case 3 = 0.75 × both axes at once. Case 4 = 0.563 × both axes plus both torsions. Buildings meeting Appendix D (D1.1) need only Cases 1 and 3. Fig. 27.3-8 is written for the wall pressures; ask the engineer how to treat roof and side walls in Cases 2–4 | ASCE 7 §27.3.5 |
   | NSCP 2015 MWFRS | Same as ASCE 7-10 (NSCP 207 follows it) | NSCP 2015 §207B |
   | NBCC 2015/2020, low building | The API's `"0"`/`"90"` already hold Load Cases A and B (zones 1–4 / 1E–4E and 1–6 / 1E–6E); take every corner in turn — see [NBCC wind pressures](#nbcc-wind-pressures) | NBCC Commentary I |
   | NBCC 2015/2020, other buildings (static procedure) | The API returns full loads per axis only. Partial and torsional loading cases are required by the code — build them from the full-load patterns per the code; factors are not encoded here | NBCC 4.1.7.3, Commentary I |
   | AS/NZS 1170.2, EN 1991, IS 875, CFE, CTE | No extra cases in the response. Torsion / asymmetric loading rules exist in each code (e.g. AS/NZS 1170.2 eccentricity, EN 1991-1-4 §7.1.2) — ask the engineer whether they apply | — |

   Torsion in S3D: apply M<sub>T</sub> per storey band as a couple of equal and opposite point loads on the two faces parallel to the wind (or as a moment about Y at the diaphragm centre when the model has a rigid diaphragm), in the same load group as its 0.75 / 0.563 pressures.

2. **Turn `p` into a force direction with one rule:** load vector = `p × n_in`, where `n_in` is the unit normal of the face pointing **into** the building (windward wall facing −X: `n_in = +X`; flat roof: `n_in = −Y`; sloped roof: the negated outward normal of that roof plane, i.e. pointing down into the building). This gets every sign right: windward wall `p > 0` pushes downwind, leeward `p < 0` pulls downwind, side walls `p < 0` pull outward, roof `p < 0` lifts.

3. **Pick the S3D load object by what the model has:**

   | Model has | Use | How |
   |---|---|---|
   | Plates on the faces | `pressures` | One per plate, `axes: "global"`, `x/y/z_mag = p × n_in` components. Avoid `"local"` unless you have checked each plate's normal |
   | Frame only, wall columns | `area_loads` `type: "column_wind_load"` | `nodes` = the wall's 4 corners, `mags` = windward `level_N` values bottom-up with matching `elevations`, `direction` = wind axis, `column_direction` = vertical edge |
   | Frame only, roof / single-value walls | `area_loads` `type: "general_one_way"` | `mags` per zone with `intervals` at the zone edges (from h, see per-code zone tables), span `column_direction` along the rafters/purlins, `direction` the axis of `p × n_in` (`Y` for flat roofs) |
   | Frame only, no area-load support in your path | `distributed_loads` | `w = p × tributary width` on each face column/rafter, `axes: "global"` |

   Wind goes on the **faces only** — never on interior members. A windward value at `level_N` acts from the level below up to that elevation (stepped; using the upper value over the band is conservative).

   Area loads only for a plain rectangular frame (no face plates, the same plan on every storey, a column at each corner); otherwise `distributed_loads`. In an S3D App, call `S3D.area_loads.checkAll()` after adding them: if any you added are in its `issues`, remove all of them and apply the wind as `distributed_loads` instead of repairing them (see the "Area loads" section of [`s3d-apps`](../s3d-apps/SKILL.md)).

4. **Units:** convert `units.pressure` to the model's pressure unit (`settings.units`): metric S3D default `kpa` ← `pa` / 1000; imperial `ksf` ← `psf` / 1000. Lengths: `units.length` vs model (`m`, `ft`). Never mix — S3D cannot mix imperial and metric.

5. **Load groups and cases:** one group per direction × case (`groupName(rec)`, plus `_neg` mirrors) so each combination carries exactly one wind pattern. Map every group to the code's wind symbol in `load_cases` (`W` ASCE / NBCC / EN, `Wu` AS/NZS 1170) and build combos per [`load-combinations`](../load-combinations/SKILL.md) — never put two wind groups in one combination.

6. **Snow:** `area_loads` on the roof, magnitude `snow.balanced` acting `−Y` on the **horizontal projection** (use the projected direction variant), group `S`. Unbalanced cases (`snow.unbalanced`) as separate groups with `general_one_way` `mags`/`intervals` per segment.

7. **Non-building structures (`wind.forces`):** each record is a resultant, so apply it as a `point_loads` entry (or spread it as `distributed_loads` over the members it acts on), one group per `direction` × `case`:

   | Structure | Where | How |
   |---|---|---|
   | Pole (`surface: pole`, `location: height/2`) | Mid-height of the pole | Point load `F` along the wind, or `F / height` as a uniform `distributed_loads` up the pole (same base shear, same base moment F·h/2) |
   | EN signboard | Board `F` at the board centre shifted by `parameters.eccentricity` along the board; pole `F` at pole mid-height | Board force eccentric by e → also apply torsion `F·e` about the pole axis (or apply `F` at the offset point if the board is modelled) |
   | AS freestanding wall | θ `0`: at the wall centre (`e = 0`); θ `45`: at eccentricity `e` from the centre; θ `90`: per band in `location` (distance from the windward end) | Point load at the band / eccentric position, or a pressure `F / (band length × wall height)` on the wall plates |
   | ASCE freestanding wall | Case `A` at the centre (`e = 0`), case `B` at `location` `e = …` from the centre, case `C` per band (`0 to s`, `s to 2s`, … from the windward end; force from `p × As`) | Three separate groups (`A`, `B`, `C`) |
   | Rooftop equipment | `Fh` horizontal at the equipment centroid, `Fv` upward | `Fh` for `"0"` and `"90"`, each both ways; `Fv` acts with each |
   | ASCE circular bin / tank | Wall `F` horizontal at the resultant height (base moment `Mo` in the reply), roof zone pressures (`records`) on the roof plates, both from any wind direction | Model shell: apply `wall_cladding_pressures` round the circumference instead (C&C values; check with the engineer that they suit the shell design). Stick model: point load `F` at `Mo / F` above the base |
   | ASCE ground solar | `Fn` normal to the panel per zone (`max` = toward the top face); `Mc` hinge moment | Pressure `Fn / zone area` on the panel plates, or point loads on the purlin nodes; separate `max` / `min` groups |

   Units: `F` is in the record's own `unit` (it differs per structure: `N`, `kN`, `lb`); convert to the model's force unit.

8. **Seismic:** for each `seismic.levels[]` entry, split `F` over the nodes at that `elevation` (equally, or by tributary mass), as `point_loads` in the plan direction: groups `E_X` and `E_Z` (for `direction: "both"` the same forces go in each). Add accidental torsion yourself if the code requires it.

9. **Record what you did** in the app/report: Load Generator inputs, `report_link`, axis mapping, unit conversion and the group → (direction, case) table, so the engineer can trace every applied load back to the report.

Minimal `s3d_model` fragment (metric model, `length ∥ X`, windward wall at x = 0 as plate 1, ASCE `along_L` case 1, `p = 633.2 Pa`):

```json
{
  "pressures": {
    "1": { "plate_id": 1, "x_mag": 0.6332, "y_mag": 0, "z_mag": 0, "axes": "global", "load_group": "W_along_L_case1" }
  },
  "load_cases": { "ASCE-7-2022-LRFD": { "W_along_L_case1": "W" } }
}
```

`load_cases` is keyed by the combination code id (`ASCE-7-2022-LRFD`, …) — take it from [`load-combinations`](../load-combinations/SKILL.md). In an S3D App, frame loads go through `S3D.structure.loads.area_loads.add({ type, nodes, mags, direction, LG })`, `distributed_loads.add(...)` and `point_loads.add(...)` (signatures in [`s3d-apps`](../s3d-apps/SKILL.md)); `s3d-apps` lists no `add` for plate `pressures`, so write those through the model JSON.

---

## Other Parameters

| Parameter | Description |
|---|---|
| `api_version` | Default `2.1`; leave it out. `2` (the previous version) returns the same output as 2.1 for AS/NZS 1170, ASCE 7, NSCP and EN 1991, but NBCC `getLoads` never returns on `2`: it fails with "getLoads timed out" (confirmed against the live API). |
| `report` | Set `false` to skip report generation and reduce response time. |

**Getting the viewable report link:** with `report` left at its default (or explicitly `true`), `getLoads`'s response includes a viewable report URL at `data.wind_pressure.report_link` (confirmed directly against the live API — not shown in this skill's own response-structure examples above). Always surface this link in any UI built on this skill, the same way an S3D model link or a Quick Design PDF report link is surfaced — the engineer needs to be able to open and review the underlying wind load calculation, not just consume the numeric outputs. Don't gate it behind an extra click/step; show it as soon as it's available.

---

## Full Examples

### ASCE 7-16 Wind + Snow

```json
{
  "auth": { "username": "user@example.com", "key": "YOUR_KEY" },
  "options": { "validate_input": true },
  "functions": [
    { "function": "standalone.loads.start", "arguments": { "keep_open": false } },
    {
      "function": "standalone.loads.getLoads",
      "arguments": {
        "project_details": { "name": "Chicago Office", "units": "imperial" },
        "site_data": {
          "design_code": "asce7-16",
          "project_address": "Wacker Avenue, Chicago",
          "risk_category": "II",
          "topography": {
            "wind_direction": "N",
            "exposure": "B",
            "country": "United States",
            "topo_image": false
          }
        },
        "building_data": {
          "design_code": "asce7-16",
          "structure": "building",
          "roof_profile": "gable",
          "building_dimensions": {
            "length": 60,
            "width": 40,
            "mean_roof_height": 30,
            "roof_angle": 18.4
          },
          "wind_parameters": {
            "structure_type": "mwfrs",
            "enclosure": "enclosed"
          },
          "snow_parameters": {}
        }
      }
    }
  ]
}
```

### AS/NZS 1170.2 Wind (Australia)

```json
{
  "function": "standalone.loads.getLoads",
  "arguments": {
    "site_data": {
      "design_code": "as1170",
      "project_address": "Sydney, NSW",
      "sls_and_uls": {
        "country": "australia",
        "design_working_life": "50_years",
        "importance_level": "2"
      },
      "topography": {
        "wind_direction": "E",
        "terrain_category": "CAT2",
        "country": "Australia",
        "topo_image": false
      }
    },
    "building_data": {
      "design_code": "as1170",
      "structure": "building",
      "roof_profile": "gable",
      "building_dimensions": {
        "length": 20, "width": 15,
        "mean_roof_height": 6, "roof_angle": 15
      },
      "wind_parameters": {
        "structure_type": "building",
        "elevated_building": false,
        "wall_condition": "5",
        "action_combination_case": "1",
        "wall_type": "impermeable",
        "ratio_of_opening_to_total_area": "0",
        "structure_level": [
          { "floor_level": "2", "floor_elevation": 3 },
          { "floor_level": "roof", "floor_elevation": 6 }
        ]
      },
      "snow_parameters": false
    }
  }
}
```

Note AS/NZS takes `structure_type: "building"` (**not** ASCE's `"mwfrs"` — that returns no
`wind_pressure` at all) and has no `enclosure`; enclosure is expressed via `wall_type` /
`ratio_of_opening_to_total_area` instead. The AS-only `wind_parameters` keys above warn and default
if omitted; `sls_and_uls` does not: leave out both it and `ari` and the call fails.

### EN 1991 (UK)

```json
{
  "function": "standalone.loads.getLoads",
  "arguments": {
    "site_data": {
      "design_code": "en1991",
      "project_address": "Buckingham Palace, London",
      "topography": {
        "wind_direction": "30",
        "country": "United Kingdom",
        "season_month": "Long-term",
        "terrain_category": "III",
        "distance_inside_town": 20,
        "distance_from_shore": 100,
        "displacement_height": 0,
        "topo_image": false
      }
    },
    "building_data": {
      "design_code": "en1991",
      "structure": "building",
      "roof_profile": "gable",
      "building_dimensions": {
        "length": 30, "width": 20,
        "mean_roof_height": 10, "roof_angle": 20
      },
      "wind_parameters": { "structure_type": "building", "enclosure": "enclosed" },
      "snow_parameters": {}
    }
  }
}
```

---

## Sample API Templates

`load-gen-api/sample-api/<folder>/` holds real `input.json` / `output.json` pairs for `getLoads` and `getSiteData` calls, one per design-code + structure-type combo. **Prefer copying the matching template over hand-building a request from scratch** — check `output.json` too, it shows the exact response shape (units, field names, nesting) that code/structure combo returns.

| Folder | Function | Design Code | Structure / Scenario |
|---|---|---|---|
| `loads.getLoads_asce` | `getLoads` | `asce7-16` | `building` (hip) — baseline wind + snow; output re-run live 2026-11-10, includes hip-end `roof_side` zones |
| `loads.getLoads_asce_wind_only` | `getLoads` | `asce7-10` | `building_data: null` — site wind speed only, **no pressures** (normalizer: `ok: false`, `reason: site_only`) |
| `loads.getLoads_asce716_seismic` | `getLoads` | `asce7-16` | `building` (hip) — wind + snow + seismic `vertical_distribution_forces` (output predates the windward fix, see Gotchas) |
| `loads.getLoads_asce716_seismic_userdefined_params` | `getLoads` | `asce7-16` | `building` — user-defined site seismic values (`site_class` + `site_seismic_data` in `site_data`); output re-run 2026-11-10 (local engine), `input_parameters` show the user's `SDS`/`SD1`/`S1`/`TL` were used. The old `status: 1` output was stale |
| `loads.getLoads_asce716_rooftop_equipment` | `getLoads` | `asce7-16` | `rooftop-equipment` |
| `loads.getLoads_asce722_rooftop_equipment` | `getLoads` | `asce7-22` | `rooftop-equipment` |
| `loads.getLoads_asce722_solar_panel_ground` | `getLoads` | `asce7-22` | `solar_panel` — ground-mounted, with `damping_ratio` |
| `loads.getLoads_asce_open_solar_panel` | `getLoads` | `asce7-16` | `building` — open solar panel roof mount |
| `loads.getLoads_asce_freestandingwall` | `getLoads` | `asce7-16` | `freestandingwall` |
| `loads.getLoads_as1170` | `getLoads` | `as1170` | `building` — AS/NZS 1170 wind + snow |
| `loads.getLoads_as1170_nz` | `getLoads` | `as1170` | `building` gable — **New Zealand** wind (Wellington, region NZ3); same output shape as Australia (local engine run 2026-11-10) |
| `loads.getLoads_asce710_gable` | `getLoads` | `asce7-10` | `building` gable — ASCE 7-10 MWFRS; same shape as 7-16 (local engine run 2026-11-10) |
| `loads.getLoads_nscp2015_mwfrs` | `getLoads` | `nscp2015` | `building` gable — NSCP MWFRS (`structure_type: "mwfrs"`); **pressures 12.96× too high** (kph bug, see Gotchas) (local engine run 2026-11-10) |
| `loads.getLoads_nbcc2015_tall` | `getLoads` | `nbcc2015` | `building` 24 m flat roof — taller-building (not low-building) output: windward per level, leeward, side wall, roof x ≤ H / x > H (local engine run 2026-11-10) |
| `loads.getLoads_nzs1170_seismic_bothdir` | `getLoads` | `as1170` | `building` — NZS 1170.5 seismic, both directions |
| `loads.getLoads_as1170_automatic_terrain` | `getLoads` | `as1170` | `building` — `automatic_terrain: true` (output: local engine run 2026-11-10) |
| `loads.getLoads_as4055` | `getLoads` | `as4055` | `building` — AS 4055 residential: wind class + general roof/wall/uplift/racking pressures, no per-face loads (`wind.summary`) |
| `loads.getLoads_en1991_uk` | `getLoads` | `en1991` | `building` — UK terrain/topography params |
| `loads.getLoads_en1991_germany` | `getLoads` | `en1991` | `building` — Germany terrain/topography params |
| `loads.getLoads_en1991_signboard` | `getLoads` | `en1991` | `signboard` |
| `loads.getLoads_cfe_viento_gable` | `getLoads` | `cfe-viento` | `building` — gable roof |
| `loads.getLoads_cfe_viento_pitched` | `getLoads` | `cfe-viento` | `building` — pitched/open roof |
| `loads.getLoads_is875` | `getLoads` | `is875` | `building` |
| `loads.getLoads_nbcc` | `getLoads` | `nbcc2015` | `building` |
| `loads.getLoads_nbcc2020_seismic` | `getLoads` | `nbcc2020` | `building` — seismic; `site_class`/`probability`/`Sa-*` given in `site_data`, backfilled into `seismic_parameters`. Input re-run 2026-11-10 without `api_version: 2` (needed `eave_height`/`ground_to_top` added); forces unchanged |
| `loads.getLoads_nscp2015` | `getLoads` | `nscp2015` | `building` — C&C wind (`structure_type: "cladding"`) |
| `loads.getLoads_nscp2015_seismic` | `getLoads` | `nscp2015` | `building` — C&C wind + seismic `vertical_distribution_forces` |
| `loads.getLoads_asce722_gable_mwfrs_cladding` | `getLoads` | `asce7-22` | `building` gable — `structure_type: "mwfrs_cladding"`: `mwfrs` + `components_cladding` in one call |
| `loads.getLoads_asce716_open_pitched` | `getLoads` | `asce7-16` | `building` — open pitched roof (`enclosure: "open"`, Cn A/B values) |
| `loads.getLoads_as1170_cladding` | `getLoads` | `as1170` | `building` gable — C&C (`structure_type: "cladding"`) |
| `loads.getLoads_as1170_open_monoslope` | `getLoads` | `as1170` | `building` — open monoslope (free roof, `cpn`) |
| `loads.getLoads_asce722_circular_bin` | `getLoads` | `asce7-22` | `circular-bin` — two isolated tanks (imperial): wall force + base moment, roof MWFRS zones, wall/roof C&C. Added by the user from `api-load-gen-v2/api_test_files/sample-api/loads.getLoads_asce7_tank` (auth scrubbed) |
| `loads.getLoads_as1170_freestandingwall` | `getLoads` | `as1170` | `freestandingwall` — returns `forces` per θ |
| `loads.getLoads_as1170_pole` | `getLoads` | `as1170` | `pole` — returns `forces` |
| `loads.getLoads_as1170_solar_panel_ground` | `getLoads` | `as1170` | `solar_panel` ground-mounted |
| `loads.getLoads_en1991_pole` | `getLoads` | `en1991` | `pole` — returns `forces` |
| `loads.getLoads_cte_db_se_open_monoslope` | `getLoads` | `cte-db-se` | `building` — open monoslope (Spain) |
| `loads.getSiteData_as1170` | `getSiteData` | `as1170` | Site data only, no building geometry |
| `loads.getSiteData_asce716` | `getSiteData` | `asce7-16` | Site data only |
| `loads.getSiteData_en1991_uk` | `getSiteData` | `en1991` | Site data only — UK |
| `loads.getSiteData_en1991_germany` | `getSiteData` | `en1991` | Site data only — Germany |
| `loads.getSiteData_en1991_france` | `getSiteData` | `en1991` | Site data only — France |
| `loads.getSiteData_en1991_belgium` | `getSiteData` | `en1991` | Site data only — Belgium |

Samples marked as failed runs or with known API gaps are kept for their input shape and error messages. "Local engine run" outputs came from `node init.js <folder>` in `api-load-gen-v2` (its working tree as of 2026-11-10, calling the live map and calc servers), not from `api.skyciv.com`. No `sans10160` sample: both attempts failed with `"Error on server calcs"`. `node scripts/normalize_loads.js --self-test` normalizes every output and lints every input in this folder.

**Workflow:** match the user's design code + structure type to a row above, read that folder's `input.json` as the request skeleton, swap in the user's actual site/building values, and cross-check `output.json` to know what result fields to expect back.

---

## Key Tips

- **Address vs coordinates:** Use `project_address` for simplicity. Use `lat`/`lng` for precision or when the address is ambiguous.
- **Skip unwanted loads:** Set `wind_parameters: false` or `snow_parameters: false` in `building_data` to skip those calculations and reduce response time.
- **Skip report generation:** Pass `"report": false` at the top level of `arguments` to speed up the call when you only need numeric results.
- **Discover available sections:** Run `standalone.loads.getCountryDesignCodes` first if you're unsure which `design_code` to use for a given country.
- **Topographic factor:** Set `topo_image: true` in `site_data.topography` to receive a base64 PNG of the site elevation profile.
- **All-direction analysis:** Use `site_analysis` to run all 8 wind directions in one call and get the governing direction automatically.
- **Start from a template:** Check the Sample API Templates table above for a matching design code + structure type before writing a request by hand. The parameter tables in this skill are a reference for what each key *means* — the `sample-api/` inputs are the authority on which keys a given design code actually wants. `wind_parameters` in particular differs enough between codes that assembling it from the table alone will produce a request that comes back with no pressures.
- **AS/NZS 1170 results:** read [AS/NZS 1170 wind pressures](#asnzs-1170-wind-pressures) before parsing them. The keys are building wind angles, `min`/`max` are internal pressures, and there are up to four load cases per angle, not two.
- **ASCE 7 / NSCP results:** read [ASCE 7 / NSCP wind pressures](#asce-7--nscp-wind-pressures). `pos_GCpi`/`neg_GCpi` are already net pressures for ±GCpi, the roof keeps only the governing Cp, and the `along_B` roof locations are wrong.
- **Read `errors` / `warnings`:** every response with a non-empty `msg` also carries structured `errors[]` and `warnings[]` (`code`, `field`, `message`, `hint`; `expected` for `INVALID_ENUM`). Fix by `field` instead of parsing `msg` — see [Errors and warnings](#errors-and-warnings).
- **Check `wind_pressure`, not `status`:** `status: 1` is used for non-fatal "default value will be used" warnings as well as real failures — see [`status: 1` is a warning, not necessarily a failure](#status-1-is-a-warning-not-necessarily-a-failure).
