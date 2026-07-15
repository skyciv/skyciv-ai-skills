# Load Generator Agent Skill

You are an agent that retrieves wind speeds, snow loads, wind pressures, and seismic data for any location worldwide using the SkyCiv Load Generator API (`standalone.loads` namespace). This skill covers all functions, parameters, and design codes.

> **Prerequisite:** Always begin a session with `S3D.session.start` as the first function. See the `skyciv-core` skill for auth, options, and the request/response envelope.

---

## Session Start

Use `standalone.loads.start` instead of `S3D.session.start` when running load-generator-only sessions:

```json
{
  "function": "standalone.loads.start",
  "arguments": { "keep_open": false }
}
```

Alternatively, `S3D.session.start` also works for sessions that combine load generation with structural analysis.

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
    },
    "api_version": 2
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
    "site_analysis": { /* optional */ },
    "api_version": 2
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
| `wind_direction` | `string` | Wind direction (towards): `N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW` |

### Design code specific — `site_data`

| Key | Design Code | Options |
|---|---|---|
| `risk_category` | ASCE 7 | `I`, `II`, `III`, `IV` |
| `site_class` | ASCE 7-16 | `A`, `B`, `C`, `D`, `D-default`, `E` |
| `site_class` | ASCE 7-22 | `A`, `B`, `BC`, `C`, `CD`, `D`, `DE`, `E` |
| `site_class` | NBCC 2020 | `A`, `B`, `C`, `D`, `E` |
| `exposure` | ASCE 7 / NSCP 2015 | `B`, `C`, `D` (required for topography) |
| `ari` | AS/NZS 1170 | Annual Recurrence Interval in years: `1`, `5`, `10`, `20`, `25`, `50`, `100`, `200`, `500`, `1000`, `2000`, `5000`, `10000` |
| `sls_and_uls` | AS/NZS 1170 | Object: `{ country, design_working_life, importance_level }` — or `false` when using `ari` |
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
| `wind_direction` | All | Wind direction for topographic analysis |
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

### Wind parameters (`building_data.wind_parameters`)

| Key | Description |
|---|---|
| `structure_type` | `"mwfrs"` (Main Wind Force Resisting System) or `"cladding"` (Components & Cladding) |
| `enclosure` | `"enclosed"`, `"partially-enclosed"`, `"partially-open"`, `"open"` |
| `wind_blockage` | ASCE 7/CFE/AS: `"clear"` or `"obstructed"` — AS/NZS 1170: `"empty"` or `"blocked"` |
| `gust_effect_factor_override` | ASCE 7-10/16 and NSCP 2015: user-defined Gust Effect Factor |

Set `wind_parameters: false` to skip wind load calculation.

### Building dimensions (`building_data.building_dimensions`)

| Key | Description |
|---|---|
| `length` | Building length |
| `width` | Building width |
| `mean_roof_height` | Mean roof height |
| `height` | Wall height (used when `mean_roof_height` not the primary height input) |
| `roof_angle` | Roof pitch angle in degrees |

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

```json
{
  "site_data": {
    "country": "...", "lat": 0.0, "lng": 0.0,
    "elevation": 0.0, "formatted_address": "..."
  },
  "wind_data": {
    "wind_speed": 115,
    "wind_speed_unit": "mph"
  },
  "snow_data": {
    "snow_load": 25
  },
  "topography": {
    "topo_factor": 1.0,
    "terrain_type": "Flat",
    "elevation_image_base64": "..."
  },
  "wind_pressure": {
    "pressure_type": "building",
    "pressure_unit": "psf",
    "elevation_or_location_unit": "ft",
    "pressures": [
      {
        "dirn": "along_L",
        "surface": "windward_wall",
        "elevation": [15, 30, 45],
        "pos_Cpi": [18.5, 20.1, 21.4],
        "neg_Cpi": [28.3, 30.7, 32.5]
      },
      {
        "dirn": "along_L",
        "surface": "leeward_wall",
        "pos_Cpi": -12.5,
        "neg_Cpi": -3.1
      },
      {
        "surface": "roof",
        "zone": "F",
        "pos_Cpi": 10.2,
        "neg_Cpi": -38.5
      }
    ]
  },
  "snow_pressure": null,
  "seismic_results": { ... }
}
```

- `wind_pressure.pressures` — array of pressure objects, one per surface/zone combination
- `pos_Cpi` — pressure with positive internal pressure coefficient
- `neg_Cpi` — pressure with negative internal pressure coefficient
- Values can be scalars (one elevation) or arrays (multiple elevations)

---

## Other Parameters

| Parameter | Description |
|---|---|
| `api_version` | Default `2.1`. Pass `2` for the previous version. |
| `report` | Set `false` to skip report generation and reduce response time. |

---

## Full Examples

### ASCE 7-16 Wind + Snow

```json
{
  "auth": { "username": "user@example.com", "key": "YOUR_KEY" },
  "options": { "validate_input": true },
  "functions": [
    { "function": "S3D.session.start", "arguments": { "keep_open": false } },
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
        },
        "api_version": 2
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
      "wind_parameters": { "structure_type": "building", "enclosure": "enclosed" },
      "snow_parameters": false
    }
  }
}
```

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
| `loads.getLoads_asce722_solar_panel_ground` | `getLoads` | `asce7-22` | `solar_panel` — ground-mounted |
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
- **Start from a template:** Check the Sample API Templates table above for a matching design code + structure type before writing a request by hand.
