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
| `cte-db-se` | CTE DB SE-AE (Spain) | Wind |

Use `standalone.loads.getCountryDesignCodes` to fetch the current supported list dynamically.

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

| Value | Notes |
|---|---|
| `"building"` | Default — enclosed/partially-enclosed/open buildings |
| `"freestanding_wall"` | ASCE 7 and AS/NZS 1170 only |
| `"truss_tower"` | ASCE 7 only |
| `"rooftop_equipment"` | ASCE 7-16/22 only |
| `"solar_panel"` | ASCE 7 and AS/NZS 1170 only |
| `"signboard"` | EN 1991 only |
| `"pole"` | EN 1991 only |
| `"open_frames"` | ASCE 7-16/22 only |
| `"circular-bin"` | ASCE 7 and AS/NZS 1170 only |

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

### Wind parameters (`building_data.wind_parameters`)

> ⚠️ **`structure_type` is code-specific — getting it wrong returns a response with no
> `wind_pressure` at all.** Confirmed against the live API: sending ASCE's `"mwfrs"` on an
> `as1170` request fails with `"structure_type is not applicable to roof_profile defined"`,
> and the response still carries `site_data`/`wind_data`/`topography` — just no pressures.

Note `wind_parameters.structure_type` is **not** the same field as
[`building_data.structure`](#structure-types-building_datastructure) above — `structure` picks the
*kind of structure* (building / freestanding wall / solar panel / …), `structure_type` picks *how
the wind pressure is resolved on it*, and its legal values depend on the design code.

| Key | Description |
|---|---|
| `structure_type` | **ASCE 7 / NSCP, `structure: "building"`:** `"mwfrs"` (Main Wind Force Resisting System) or `"cladding"` (Components & Cladding). **AS/NZS 1170, EN 1991, IS 875, CFE:** `"building"`. **Non-building ASCE structures** take their own code-suffixed value (e.g. `"freestandingwall-asce7-16"`) — copy it from the matching `sample-api/` template |
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
| `roof_angle` | Roof pitch angle in degrees. `0` for a flat roof, with `roof_profile: "gable"` |
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

`structure_system` options: `"steel-mrf"`, `"concrete-mrf"`, `"steel-eccentrically-braced"`, `"steel-buckling-restrained"`, `"others"`.

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
- **Roof, flat (< 10°) or wind along the ridge (`along_B`)**: `roof_windward` and `roof_leeward`
  are the same zone table, by distance from the windward edge: 0–h/2, h/2–h, h–2h, > 2h, only as
  many as the building is deep. `location` holds the zone ends, but **the `along_B` entries repeat
  the `along_L` locations** (an API bug), so take the zone edges from h, not from `location`.
- **Only the governing roof Cp per internal sign.** Figure 27.3-1 gives two Cp per roof zone
  (e.g. −1.02 and −0.18); the report shows both rows, but the response keeps, for each internal
  sign, only the larger-magnitude result (`pressure_roof_absmax` in the API). The external
  pressure behind each value is pe = pos + qh·GCpi = neg − qh·GCpi. When those agree there is one
  external pressure; when they differ, the response carries two.
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

**Judge the call on whether `data.wind_pressure` came back, not on `status`** — treat a missing
`wind_pressure` as the failure and surface `msg` verbatim to the user, and treat `status: 1`
*with* pressures as a warning to display alongside the results. Branching on `status !== 0` alone
throws away good results; ignoring `msg` entirely hides the one line that says which field was
wrong.

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
| `loads.getLoads_asce` | `getLoads` | `asce7-16` | `building` — baseline wind + snow |
| `loads.getLoads_asce_wind_only` | `getLoads` | `asce7-10` | `snow_parameters: false` — wind only |
| `loads.getLoads_asce716_seismic` | `getLoads` | `asce7-16` | `building` — with seismic parameters |
| `loads.getLoads_asce716_seismic_userdefined_params` | `getLoads` | `asce7-16` | `building` — user-defined seismic overrides (`site_seismic_data`) |
| `loads.getLoads_asce716_rooftop_equipment` | `getLoads` | `asce7-16` | `rooftop-equipment` |
| `loads.getLoads_asce722_rooftop_equipment` | `getLoads` | `asce7-22` | `rooftop-equipment` |
| `loads.getLoads_asce722_solar_panel_ground` | `getLoads` | `asce7-22` | `solar_panel` — ground-mounted, with `damping_ratio` |
| `loads.getLoads_asce_open_solar_panel` | `getLoads` | `asce7-16` | `building` — open solar panel roof mount |
| `loads.getLoads_asce_freestandingwall` | `getLoads` | `asce7-16` | `freestandingwall` |
| `loads.getLoads_as1170` | `getLoads` | `as1170` | `building` — AS/NZS 1170 wind + snow |
| `loads.getLoads_nzs1170_seismic_bothdir` | `getLoads` | `as1170` | `building` — NZS 1170.5 seismic, both directions |
| `loads.getLoads_en1991_uk` | `getLoads` | `en1991` | `building` — UK terrain/topography params |
| `loads.getLoads_en1991_germany` | `getLoads` | `en1991` | `building` — Germany terrain/topography params |
| `loads.getLoads_en1991_signboard` | `getLoads` | `en1991` | `signboard` |
| `loads.getLoads_cfe_viento_gable` | `getLoads` | `cfe-viento` | `building` — gable roof |
| `loads.getLoads_cfe_viento_pitched` | `getLoads` | `cfe-viento` | `building` — pitched/open roof |
| `loads.getLoads_is875` | `getLoads` | `is875` | `building` |
| `loads.getLoads_nbcc` | `getLoads` | `nbcc2015` | `building` |
| `loads.getLoads_nbcc2020_seismic` | `getLoads` | `nbcc2020` | `building` — with seismic parameters |
| `loads.getLoads_nscp2015` | `getLoads` | `nscp2015` | `building` — wind + snow + seismic |
| `loads.getSiteData_as1170` | `getSiteData` | `as1170` | Site data only, no building geometry |
| `loads.getSiteData_asce716` | `getSiteData` | `asce7-16` | Site data only |
| `loads.getSiteData_en1991_uk` | `getSiteData` | `en1991` | Site data only — UK |
| `loads.getSiteData_en1991_germany` | `getSiteData` | `en1991` | Site data only — Germany |
| `loads.getSiteData_en1991_france` | `getSiteData` | `en1991` | Site data only — France |
| `loads.getSiteData_en1991_belgium` | `getSiteData` | `en1991` | Site data only — Belgium |

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
- **Check `wind_pressure`, not `status`:** `status: 1` is used for non-fatal "default value will be used" warnings as well as real failures — see [`status: 1` is a warning, not necessarily a failure](#status-1-is-a-warning-not-necessarily-a-failure).
