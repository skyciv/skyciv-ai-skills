# S3D Agent Skill

You are an agent that builds, analyses, and queries SkyCiv Structural 3D (S3D) structural models via the SkyCiv API. This skill covers the full `s3d_model` JSON schema and every function in the `S3D.model`, `S3D.results`, `S3D.file`, and `S3D.SB` namespaces, plus the `S3D.design` member/RC design checks.

> **Designing members? Use `S3D.design.member.check` first.** If the design code is in the [supported list](#supported-member-design_code-values), design the members in the solved model with `S3D.design.member.check`, not with a [`run-quick-design`](../run-quick-design/SKILL.md) calculator. Only use Quick Design when Member Design can't do the job. See [S3D.design Functions](#s3ddesign-functions).

> **Prerequisite:** Always begin a session with `S3D.session.start` as the first function. See [`skyciv-api-v3`](../skyciv-api-v3/SKILL.md) for auth, options, and the request/response envelope.

---

## The `s3d_model` Object

The `s3d_model` is the JSON representation of a structural model. It is passed to `S3D.model.set`.

```json
{
  "settings": { ... },
  "nodes": { ... },
  "members": { ... },
  "plates": { ... },
  "meshed_plates": { ... },
  "sections": { ... },
  "materials": { ... },
  "supports": { ... },
  "settlements": { ... },
  "point_loads": { ... },
  "moments": { ... },
  "distributed_loads": { ... },
  "pressures": { ... },
  "area_loads": { ... },
  "member_prestress_loads": { ... },
  "thermal_loads": { ... },
  "self_weight": { ... },
  "load_combinations": { ... },
  "load_cases": { ... },
  "load_combination_settings": { ... },
  "nodal_masses": { ... },
  "spectral_loads": { ... },
  "moving_loads": { ... },
  "suppress": { ... },
  "groups": { ... },
  "gridlines_and_elevations": [ ... ]
}
```

All objects use **integer-keyed dictionaries** (e.g. `"1": { ... }`, `"2": { ... }`), **except** `gridlines_and_elevations`, which is a plain array.

> **Tip:** To inspect a model as JSON, open it in [SkyCiv S3D](https://platform.skyciv.com/structural) and use File → Export → SkyCiv File (JSON for API). To test JSON, use File → Import → SkyCiv File (JSON for API).

---

### `settings`

| Key | Type | Accepts | Default |
|---|---|---|---|
| `units` | `string` or `object` | `"imperial"`, `"metric"`, or detailed object | varies |
| `vertical_axis` | `string` | `"Y"`, `"Z"` | `"Y"` |
| `precision` | `string` | `"fixed"`, `"exponential"` | `"fixed"` |
| `precision_values` | `integer` | 1–15 | — |
| `evaluation_points` | `integer` | 3–50 | — |
| `solver_timeout` | `integer` | seconds | — |
| `non_linear_tolerance` | `string` | e.g. `"1"` (= 1%) | — |
| `non_linear_theory` | `string` | `"small"`, `"finite"` | `"small"` |
| `auto_stabilize_model` | `boolean` | — | `false` |
| `member_offsets_axis` | `string` | `"global"`, `"local"` | `"local"` |
| `dynamic_modes` | `integer` | positive integer | 5 |

**Detailed units object:**
```json
{
  "units": {
    "length": "m",
    "section_length": "mm",
    "material_strength": "mpa",
    "density": "kg/m3",
    "force": "kn",
    "moment": "kn-m",
    "pressure": "kpa",
    "mass": "kg",
    "translation": "mm",
    "stress": "mpa"
  }
}
```

Imperial defaults: `ft`, `in`, `ksi`, `lb/ft3`, `kip`, `kip-ft`, `ksf`, `kip`, `in`, `ksi`.

---

### `nodes`

```json
{
  "nodes": {
    "1": { "x": 0, "y": 0, "z": 0 },
    "2": { "x": 5, "y": 0, "z": 0 }
  }
}
```

---

### `members`

| Key | Type | Description |
|---|---|---|
| `type` | `string` | `"normal"` (default), `"normal_continuous"`, `"cable"`, `"tension"`, `"compression"`, `"rigid"` — see below |
| `node_A` | `integer` | Start node ID |
| `node_B` | `integer` | End node ID |
| `section_id` | `integer` | Section ID. `null` when `type` = `"rigid"`. |
| `rotation_angle` | `float` | Rotation about member axis in degrees (−180 to 180). Ignored for `"cable"`/`"rigid"`. |
| `fixity_A` / `fixity_B` | `string` | 6-character [restraint code](#restraint-codes). Ignored (forced `"FFFRRR"`) for `"cable"`; still applies for `"rigid"` and controls which forces/moments transfer through the link. |
| `stiffness_A_Ry` / `stiffness_A_Rz` | `number` or `string` | Rotational release stiffness (partial fixity) about the local y/z axis at node A. Only applies where the corresponding `fixity_A` character is `'S'` (spring/semi-rigid) rather than `F` or `R`. Enter the actual stiffness (number > 0) or a percentage string like `"80%"`. |
| `stiffness_B_Ry` / `stiffness_B_Rz` | `number` or `string` | Rotational release stiffness (partial fixity) about the local y/z axis at node B. Only applies where the corresponding `fixity_B` character is `'S'` (spring/semi-rigid) rather than `F` or `R`. Enter the actual stiffness (number > 0) or a percentage string like `"80%"`. |
| `offset_Ax/Ay/Az` | `float` | Local offsets at node A. Ignored for `"cable"`/`"rigid"`. |
| `offset_Bx/By/Bz` | `float` | Local offsets at node B. Ignored for `"cable"`/`"rigid"`. |
| `local_axis_y` | `[float]` | Global vector `[X,Y,Z]` for local y-axis |
| `local_axis_z` | `[float]` | Global vector `[X,Y,Z]` for local z-axis |
| `disable_non_linear_effects` | `string` (optional) | `"yes"`, `"no"` (default) — excludes this member from non-linear/P-delta effects |
| `design_params` | `object` (optional) | Member Design inputs for this member, e.g. `{"global_buckling_bracing": "top", "minor_axis_bracing": true}` for `ASNZS_4600-2018`. See [Minor axis bracing](#minor-axis-bracing-asnzs_4600-2018-only) |

**`type` values:**
- `cable` — tension-only, no bending stiffness, true catenary sag. Triggers a non-linear analysis. Forces `rotation_angle`→`0`, `fixity_A`/`fixity_B`→`FFFRRR`, offsets→`0`.
- `tension` / `compression` — linear, single-direction-only axial member (no sag). `fixity`/`offset`/`rotation_angle` behave as `normal`. Prefer this over `cable` unless true sag matters — it's simpler and doesn't force a non-linear solve.
- `rigid` — infinitely stiff link, `section_id: null`, offsets/`rotation_angle` ignored, `fixity_A`/`fixity_B` still control force/moment transfer.

```json
{
  "members": {
    "1": {
      "node_A": 1,
      "node_B": 2,
      "section_id": 1,
      "rotation_angle": 0,
      "fixity_A": "FFFFFF",
      "fixity_B": "FFFFFF",
      "offset_Ax": "0", "offset_Ay": "0", "offset_Az": "0",
      "offset_Bx": "0", "offset_By": "0", "offset_Bz": "0"
    },
    "2": {
      "type": "tension",
      "node_A": 3,
      "node_B": 4,
      "section_id": 2,
      "fixity_A": "FFFRRR",
      "fixity_B": "FFFRRR"
    },
    "3": {
      "type": "rigid",
      "node_A": 5,
      "node_B": 6,
      "section_id": null,
      "fixity_A": "FFFFFF",
      "fixity_B": "FFFRRR"
    }
  }
}
```

---

### `plates`

| Key | Type | Description |
|---|---|---|
| `nodes` | `[integer]` | Node IDs forming the plate (min 3, sequential order) |
| `thickness` | `float` | Plate thickness (section_length units) |
| `material_id` | `integer` | Material ID |
| `rotZ` | `float` | Rotation about local Z in degrees (default `0`) |
| `type` | `string` | `"auto"` — considers shear deformation automatically |
| `diaphragm` | `string` | `"no"` or `"rigid"` |
| `diaphragm_internal_nodes` | `[integer]` or `null` | Internal node IDs included in a rigid diaphragm for this plate; `null` if not applicable |
| `diaphragm_fixity` | `string` or `null` | Fixity/restraint applied to the diaphragm; `null` if not applicable |
| `drilling_stiffness_factor` | `float` | Factor applied to the plate's drilling (rotational) stiffness about its normal axis |
| `state` | `string` | `"stress"` or `"strain"` |

---

### `meshed_plates`

Manually defined mesh elements (usually auto-generated by `S3D.model.mesh`).

| Key | Description |
|---|---|
| `node_A/B/C/D` | Corner node IDs. `node_D: null` for triangular elements |
| `parent_plate` | ID of the parent plate |

---

### `sections`

Sections can be defined four ways:

**1. Library section** (recommended for standard shapes):
```json
{
  "sections": {
    "1": {
      "load_section": ["American", "AISC", "W shapes", "W14x22"],
      "material_id": 1
    }
  }
}
```

**2. Custom section from My Sections:**
```json
{ "1": { "load_custom": ["Folder1", "my-section-name"] } }
```

**3. Numeric properties only** (no design/stress support):
```json
{
  "1": {
    "name": "MySection",
    "area": 6500,
    "Iy": 16000000,
    "Iz": 50000000,
    "J": 250000,
    "material_id": 1,
    "shear_area_z": 500,
    "shear_area_y": 800
  }
}
```

**4. Template shape:**
```json
{
  "1": {
    "material_id": 1,
    "info": {
      "shape": "ibeam",
      "dimensions": { "h": 200, "b": 100, "tf": 10, "tw": 6 }
    }
  }
}
```
Available template shapes: `rectangle`, `hollow rectangle`, `circle`, `hollow circle`, `ibeam`/`i`, `tbeam`/`tee`/`t`, `lbeam`/`angle`/`l`, `channel`/`c`, `lipped channel`, `zshape`/`z`, `lipped zshape`, `lipped angle`, `lipped channel box`.

---

### `materials`

| Key | Type | Description |
|---|---|---|
| `name` | `string` | Material name |
| `density` | `float` | Density |
| `elasticity_modulus` | `float` | Young's modulus |
| `poissons_ratio` | `float` | Poisson's ratio |
| `yield_strength` | `float` | Yield strength |
| `ultimate_strength` | `float` | Ultimate strength |
| `class` | `string` | `"steel"`, `"aluminium"`, `"concrete"`, `"wood"`, `"masonry"`, `"other"` |
| `thermal_expansion_coefficient` | `float` | Coefficient of thermal expansion |
| `shear_modulus` | `float` | Shear modulus |
| `elasticity_modulus_x` / `elasticity_modulus_y` | `float` | Orthotropic moduli of elasticity in the local x/y directions |
| `shear_modulus_xy` / `shear_modulus_xz` / `shear_modulus_yz` | `float` | Orthotropic shear moduli |
| `poissons_ratio_xy` | `float` | Orthotropic Poisson's ratio in the xy plane |

---

### `supports`

**1. Node support** (one node at a time):

| Key | Description |
|---|---|
| `node` | Node ID |
| `restraint_code` | 6-char [restraint code](#restraint-codes) |
| `direction_code` | Optional 6-char [direction code](#direction-codes) — refines which global direction(s) each restrained DOF acts in |
| `tx/ty/tz/rx/ry/rz` | Spring stiffness values (used when restraint char = `S`) |

**2. Line support** — applies the same restraint along a straight line of nodes in one
entry instead of one `node` entry per point:

| Key | Description |
|---|---|
| `type` | `"line"` |
| `nodes` | Comma-separated node IDs defining the line (e.g. its two end nodes), as a string — e.g. `"1,3"` |
| `restraint_code` | 6-char [restraint code](#restraint-codes) |
| `direction_code` | Optional 6-char [direction code](#direction-codes) — refines which global direction(s) each restrained DOF acts in |
| `tx/ty/tz/rx/ry/rz` | Spring stiffness values (used when restraint char = `S`) |

`direction_code` is available on **both** support forms above, not just line supports —
see [Direction Codes](#direction-codes) for the format.

**Non-linear spring stiffness** (optional): instead of a constant `tx/ty/tz/rx/ry/rz` value, a support can define `non_linear_spring_stiffness` — an object keyed by direction (`tx`, `ty`, `tz`, `rx`, `ry`, `rz`), where each entry is `{ "stiffness_dependency": "<quantity>", "relationship": { "symmetric": <bool>, "values": [[dependency_value, stiffness_value], ...] } }`. `stiffness_dependency` is the quantity the stiffness varies with (e.g. `"reaction_fx"`, `"reaction_mx"`, `"displacement_rx"`); `values` is a piecewise `[x, y]` curve; `symmetric: true` mirrors the curve for negative dependency values.

```json
{
  "supports": {
    "1": {
      "type": "line",
      "nodes": "1,3",
      "direction_code": "BBBBBB",
      "tx": 0,
      "ty": 0,
      "tz": 0,
      "rx": 0,
      "ry": 0,
      "rz": 0,
      "restraint_code": "FFFFFR"
    }
  }
}
```

---

### `point_loads`

| Key | Description |
|---|---|
| `type` | `"n"` (nodal) or `"m"` (member) |
| `node` | Node ID (when `type = "n"`) |
| `member` | Member ID (when `type = "m"`) |
| `position` | Position along member as % (0–100, when `type = "m"`) |
| `x_mag/y_mag/z_mag` | Load magnitudes |
| `load_group` | Load group name (string) |

---

### `moments`

Same structure as `point_loads` — `x_mag/y_mag/z_mag` represent moment magnitudes about each axis.

---

### `distributed_loads`

| Key | Description |
|---|---|
| `member` | Member ID |
| `x/y/z_mag_A` | Load magnitude at start (position A) |
| `x/y/z_mag_B` | Load magnitude at end (position B) |
| `position_A/B` | Start/end positions as percentage (0–100) |
| `load_group` | Load group name |
| `axes` | `"global"`, `"global_projected"`, or `"local"` |

---

### `pressures`

Applied to plates.

| Key | Description |
|---|---|
| `plate_id` | Plate ID |
| `x/y/z_mag` | Pressure magnitude |
| `axes` | `"global"`, `"global_projected"`, `"local"` |
| `load_group` | Load group name |

---

### `area_loads`

| Key | Description |
|---|---|
| `type` | `"one_way"`, `"two_way"`, `"general_one_way"`, `"column_wind_load"`, `"open_structure"`, `"non_rectangular"` |
| `nodes` | Node IDs defining the area (3 or 4). Array of integers, except for `general_one_way` which uses a comma-separated string. |
| `mag` | Load magnitude. Not used for `general_one_way` — use `mags` instead. |
| `mags` | Comma-separated magnitude(s). Required for `column_wind_load` (paired with `elevations`) and `general_one_way` (a single value for uniform, or `n` values paired with `n + 1` values in `intervals` for a stepped/tapered load) |
| `column_direction` | Span direction as `"nodeA,nodeB"`. Relevant for `one_way`, `column_wind_load`, `general_one_way` |
| `loaded_members_axis` | `"all"` or `"major"`. Relevant for `open_structure` and `general_one_way` |
| `intervals` | `general_one_way` only — comma-separated step-interval distances, `n + 1` values matching `n` values in `mags`. Blank = uniform load |
| `excluded_member_ids` | `general_one_way` only — comma-separated member IDs to exclude from carrying the load |
| `exclude_internal_members` | `general_one_way` only — `"off"`, `"angled"`, or `"all"`: auto-excludes internal members not aligned to the span |
| `cantilever_extensions` | `general_one_way` only — `"left,right"` offsets extending the load polygon along the span to pick up cantilevered members |
| `direction` | `"X"`, `"Y"`, `"Z"`, or projected variants |
| `LG` | Load group |

> **Prefer `general_one_way`** over plain `one_way` — it's the most robust one-way option: non-rectangular spans, stepped/tapered magnitudes, and finer control over which members carry the load.

---

### `self_weight`

Simple form — a single flat object. It is placed in load group `SW1` automatically (verified
live), so every combination still scales it by its `SW1` factor:

```json
{
  "self_weight": {
    "enabled": true,
    "x": 0,
    "y": -1,
    "z": 0
  }
}
```

Integer-keyed form — use it to name the group explicitly. An entry without `load_group` also
defaults to `SW1`:

```json
{
  "self_weight": {
    "1": { "enabled": true, "x": 0, "y": -1, "z": 0, "load_group": "SW1" }
  }
}
```

**Simplified format** — a `direction`/`factor` pair instead of `x`/`y`/`z`, equivalent to the simple form above:

```json
{
  "self_weight": {
    "direction": "Y",
    "factor": -1,
    "LG": "SW"
  }
}
```

> See the [`load-combinations`](../load-combinations/SKILL.md) skill for how this ties into
> `load_combinations` factors. The real trap is the other way round: a combination **without**
> an `SW1` key silently applies no self-weight.

---

### `load_combinations`

```json
{
  "load_combinations": {
    "1": {
      "name": "1.2D + 1.6L",
      "criteria": "strength",
      "Dead": 1.2,
      "Live": 1.6,
      "SW1": 1.2
    }
  }
}
```

`criteria` is optional: `"strength"`, `"serviceability"`, or `"other"`. Load group names used as keys (e.g. `"Dead"`, `"SW1"`) — values are load factors.

> **Building code-correct combinations?** See the [`load-combinations`](../load-combinations/SKILL.md)
> skill for how `load_combinations`, `load_cases`, and `load_combination_settings` fit together,
> the generator's factor tables for ASCE 7-22 LRFD/ASD, AS/NZS 1170.0, NBCC 2020, EN 1990 and
> IS 800, and how to call the combination generator and convert its output.

---

### `load_cases`

Maps load groups to standard load type categories for a named design code. This tells the solver how to classify each load group when auto-generating code-based load combinations.

```json
{
  "load_cases": {
    "DESIGN-CODE-NAME": {
      "LOAD_GROUP_NAME": "LOAD_TYPE"
    }
  }
}
```

The key is the design code identifier. Each nested key is a load group name from your model; the value is the code-defined load type for that group.

**ASCE 7-22 (LRFD):**
```json
{
  "load_cases": {
    "ASCE-7-2022-LRFD": {
      "D1": "D",
      "SW1": "D",
      "L1": "L",
      "S1": "S",
      "W1": "W"
    }
  }
}
```

**AS 1170.0-2002:**
```json
{
  "load_cases": {
    "AS-1170.0-2002": {
      "SDL": "G",
      "SW1": "G",
      "Q": "Qdd",
      "W_East": "Wu",
      "W_North": "Wu",
      "W_South": "Wu",
      "W_West": "Wu"
    }
  }
}
```

**EN 1990-2002:**
```json
{
  "load_cases": {
    "EN-1990-2002": {
      "G1": "G",
      "SW1": "G",
      "Qa1": "Qa",
      "S1": "Sl",
      "Wx-": "W",
      "Wx+": "W",
      "Wy-": "W",
      "Wy+": "W"
    }
  }
}
```

> Multiple load groups can map to the same load type (e.g. several wind direction groups all mapped to `"W"`). Multiple design codes can coexist in the same `load_cases` object.
>
> Values must be the code's short symbols as shown. The `"Dead: dead"` style shows every group as Dead in the S3D UI. The UI reads the entry for `load_combination_settings.code`, and falls back to `ASCE-7-2022-LRFD` when that isn't set. Each symbol also adds a `type: "load_case"` result to the solve output. All verified live.

---

### `load_combination_settings`

Settings controlling automatic generation of code-based load combinations from `load_cases`.

| Key | Description |
|---|---|
| `country` | Country associated with the selected design code |
| `code` | Design code (and version) used to auto-generate combinations, e.g. `"AS-1170.0-2002"` |
| `criteria` | Which combination criteria to generate, e.g. `"All"` |
| `filters` | UI filter selections used when generating combinations |
| `load_case_order` | Display/generation order of load group names |
| `patterns` | Load pattern and ratio settings (simultaneous vs alternate, main/alternate ratios) |
| `load_case_mappings` | Maps short load group codes to full descriptive load case names |
| `load_case_sub_groups` | Sub-group assignments (`{"name", "sub_group"}`) controlling which load groups combine together |

> `country` and `code` are **not** just metadata: they choose the standard the S3D UI's Load Group & Cases manager uses to read `load_cases`. Set them for any code other than `ASCE-7-2022-LRFD`. See the [`load-combinations`](../load-combinations/SKILL.md) skill for how this fits together with `load_combinations` and `load_cases`.

---

### `member_prestress_loads`

Applies a prestress force to a member.

```json
{
  "member_prestress_loads": {
    "1": {
      "load_group": "LG",
      "member_id": 1,
      "prestress_magnitude": 100
    }
  }
}
```

| Key | Description |
|---|---|
| `load_group` | The load group to which this prestress load belongs |
| `member_id` | The ID of the member the prestress load is applied to |
| `prestress_magnitude` | The magnitude of the prestress force applied to the member |

---

### `thermal_loads`

Applies a temperature change to a member or plate.

```json
{
  "thermal_loads": {
    "1": {
      "element_type": "member",
      "element_id": 13,
      "thermal_load": 30,
      "load_group": "TL"
    }
  }
}
```

| Key | Description |
|---|---|
| `element_type` | `"member"` or `"plate"` |
| `element_id` | The ID of the member or plate this thermal load is applied to |
| `thermal_load` | The temperature change applied by this thermal load |
| `load_group` | The load group to which this load belongs |

---

### `nodal_masses`

Applies additional translational and rotational mass to a node, e.g. for use in dynamic frequency or response spectrum analysis.

| Key | Description |
|---|---|
| `node_id` | The ID of the node the mass is applied to |
| `tx_mass` / `ty_mass` / `tz_mass` | Translational mass in the global x/y/z axes |
| `rx_mass` / `ry_mass` / `rz_mass` | Rotational mass about the global x/y/z axes |
| `source` | Indicates how the nodal mass was generated, e.g. `"User Defined"` |

---

### `spectral_loads`

Defines response spectrum loads used in dynamic response spectrum analysis.

| Key | Description |
|---|---|
| `input_method` | `1` if generated via user input, `2` if by design code |
| `design_code` | The selected design code if generated via design code (`"EN8"`, `"ASCE"`, `""`, or `null`) |
| `design_data` | Design-code-specific inputs used to generate the spectrum |
| `xy_data` | Values for the response spectrum XY plot: `[{ "x": period, "y": spectral_value }, ...]` |
| `load_dir` | `"X"`, `"Y"`, `"Z"`, or `"XZ"` |
| `load_angle` | Angle of the load if `"XZ"` was chosen for direction |
| `load_factor` | Factor multiplier for the load |
| `load_combo_method` | `"CQC"`, `"ABS"`, `"SRSS"`, or `"Linear"` |
| `load_damping_ratio` | Damping ratio for this load |
| `save_sign` | `"yes"` or `"no"` — whether to preserve the sign of results when combining modal responses |
| `LG` | The load group this load belongs to |

---

### `moving_loads`

Defines vehicle/moving loads for bridge/traffic-line style analysis.

| Key | Description |
|---|---|
| `traffic_lines` | Traffic lines defining the paths along which vehicle loads travel across members |
| `vehicle_loads` | Vehicle load definitions (axle spacings, weights, etc.) applied to traffic lines |
| `cases` | Generated moving load cases combining vehicle loads with traffic lines |

---

### `suppress`

Tracks which model elements are suppressed (hidden from analysis) per named suppression set, plus the currently active set. Array should include element IDs you wish to suppress.

```json
{
  "suppress": {
    "All On": { "members": [], "plates": [], "supports": [], "moments": [], "distributed_loads": [], "point_loads": [], "area_loads": [], "pressures": [], "load_combinations": [] },
    "User Defined": { "members": [], "plates": [], "supports": [], "moments": [], "distributed_loads": [], "point_loads": [], "area_loads": [], "pressures": [], "load_combinations": [] },
    "current_case": "User Defined"
  }
}
```

Each named set (e.g. `"All On"`, `"User Defined"`) holds arrays of suppressed IDs per element collection. `current_case` names the currently active set.

---

### `groups`

```json
{
  "groups": {
    "1": {
      "name": "Columns",
      "ids": [1, 2, 3],
      "type": "elements"
    }
  }
}
```

`type` accepts: `"elements"`, `"nodes"`, `"supports"`, `"plates"`, `"groups"`.

---

### `gridlines_and_elevations`

Optional, purely visual/organisational — doesn't affect analysis, but enables per-level platform features (e.g. isolating a floor). An **array** (not an integer-keyed dictionary) of elevation/story objects:

```json
{
  "gridlines_and_elevations": [
    {
      "name": "Base",
      "elevation": 0,
      "axis": "y",
      "is_draw": true,
      "beams": [],
      "columns": [
        { "section_id": 1, "x": 0, "z": -10, "s3d_id": 1 }
      ],
      "plates": [],
      "points": [],
      "gridlines": [
        {
          "grid_id": "1",
          "start_x": 0, "start_z": -10,
          "end_x": 0, "end_z": 10,
          "vector_x": 0, "vector_z": 1,
          "grid_label": "start",
          "startpt": [0, -12],
          "endpt": [0, 12]
        }
      ]
    }
  ]
}
```

- `axis` should match [`settings.vertical_axis`](#settings).
- `columns[].s3d_id` is the ID of the matching column in `members`/`nodes`; `columns[].section_id` is the ID in `sections`.
- `beams`, `plates`, `points` are reserved (mirror `columns` structurally) — not yet documented, leave as `[]`.
- `gridlines[].grid_id` is the label text printed on the gridline; `grid_label` (`"start"` or `"end"`) controls which end it's printed at.
- `startpt`/`endpt` extend slightly past `start_x/start_z`/`end_x/end_z` to leave room for the label — not the structural extents.

---

## Restraint Codes

A 6-character string. First 3 = translational DOF (local X, Y, Z). Last 3 = rotational DOF (local X, Y, Z).

| Character | Meaning |
|---|---|
| `F` | Fixed |
| `R` | Released (free) |
| `S` | Spring |

Examples:
- `"FFFFFF"` — fully fixed (pin/fixed support)
- `"FFFRRR"` — pinned (fixed translation, free rotation)
- `"FFFFFR"` — fixed except rotation about local Z

---

## Direction Codes

An optional 6-character string on a `supports` entry (either form), format `XYZxyz` —
`X/Y/Z` = translational DOF, `x/y/z` = rotational DOF, **all in GLOBAL axes** (unlike
`restraint_code`, which is local). It refines *which* global direction a restrained DOF
acts in — only takes effect on a DOF whose `restraint_code` character is not `R`
(released).

| Character | Meaning |
|---|---|
| `B` | Restrains both axis directions |
| `P` | Restrains the positive axis direction only |
| `N` | Restrains the negative axis direction only |

Example: `"BNBBBB"` restrains both directions on every DOF except the global
Y-translation, which is only restrained in the negative direction.

---

## S3D.model Functions

### `S3D.model.set`

Sets the structural model for the session.

```json
{
  "function": "S3D.model.set",
  "arguments": { "s3d_model": { /* model object */ } }
}
```

### `S3D.model.get`

Returns the current `s3d_model` object. Requires `S3D.model.set` earlier in session.

```json
{ "function": "S3D.model.get" }
```

### `S3D.model.repair`

Fixes common model issues before solving. Requires `S3D.model.set`.

| Check | Description |
|---|---|
| `unused_nodes` | Remove floating/disconnected nodes |
| `large_structure` | Detect unit-system issues (extreme slenderness) |
| `merge_nodes` | Merge near-coincident nodes |
| `zero_members` | Remove zero-length members |
| `continuous_to_normal_members` | Split members with intermediate nodes |
| `intersect_members` | Connect crossing members |
| `default_section` | Add a default section to members with none |
| `force_plate_mesh` | Allow analysis without pre-meshed plates |

```json
{
  "function": "S3D.model.repair",
  "arguments": {
    "checks": ["unused_nodes", "merge_nodes", "intersect_members"]
  }
}
```

Omit `checks` to run all repairs.

### `S3D.model.solve`

Runs structural analysis. Requires `S3D.model.set`.

| Key | Type | Default | Description |
|---|---|---|---|
| `analysis_type` | `string` | `"linear"` | `"linear"`, `"nonlinear"`, `"buckling"`, `"dynamic"`, `"response_spectrum"` |
| `repair_model` | `boolean` | `false` | Run repair before solving |
| `return_data` | `boolean` | `true` | Include solve data in response |
| `format` | `string` | `"json"` | `"json"`, `"csv"`, `"summary"`, `"s3d"` |
| `lc_filter` | `[string]` | all | `"envelope"`, `"envelope_abs_max"`, `"load_case"`, `"load_group"`, `"load_combo"`, or specific LC names like `"LC1"` |
| `result_filter` | `[string]` | all | `"reactions"`, `"member_forces"`, `"member_stresses"`, `"member_peak_results"`, `"member_discontinuities"`, `"member_displacements"`, `"plate_forces"`, `"plate_stresses"`, `"plate_element_forces"`, `"plate_element_stresses"`, `"plate_peak_results"`, `"buckling"`, `"dynamic_frequency"` |
| `include_nodal_displacements` | `boolean` | `false` | Include nodal displacements per load combo |

```json
{
  "function": "S3D.model.solve",
  "arguments": {
    "analysis_type": "linear",
    "repair_model": true,
    "lc_filter": ["envelope_abs_max"],
    "result_filter": ["member_peak_results", "reactions"]
  }
}
```

> **Tip:** Use `result_filter` and `lc_filter` to minimise response size if there is a lot of data. Otherwise, if you need all load combos to properly analyse and design, leave this option out. For prototyping, it's probably a good idea to leave it out. 

Results are returned as a dictionary keyed by load combination index.

### `S3D.model.mesh`

Meshes plates. Requires `S3D.model.set`.

| Key | Type | Default | Description |
|---|---|---|---|
| `method` | `string` | `"frontal_quads"` | `"frontal_quads"`, `"frontal"`, `"adapt"`, `"packing_parallelograms"`, `"delaunay"` |
| `granularity` | `integer` | `1` | 1 (coarse) to 5 (fine) |
| `plate_ids` | `[integer]` | all plates | Specific plates to mesh |

### `S3D.model.takeScreenshot`

Returns base64 PNG screenshots.

| Key | Type | Description |
|---|---|---|
| `views` | `[string]` | `"iso"`, `"front"`, `"side"`, `"top"`, `"custom"` |
| `is_renderer` | `boolean` | Use 3D renderer (`true`) or wireframe (`false`) |
| `wireframe_settings` | `object` | `show_nodes`, `show_loads`, `show_plates`, `projection` |
| `zoom_factor` | `float` | −50 to 50 |
| `scale` | `float` | 0 to 5 |

### `S3D.model.surfaceSpringSupports`

Simulates surface spring supports on a plate.

```json
{
  "function": "S3D.model.surfaceSpringSupports",
  "arguments": {
    "subgrade_modulus": 3,
    "spring_type": "linear",
    "plate_ids": [1]
  }
}
```

`spring_type`: `"linear"`, `"compression"`, `"tension"`.

### `S3D.model.script`

Run custom JavaScript against the S3D model. Useful for complex topology operations.

```json
{
  "function": "S3D.model.script",
  "arguments": {
    "script": "var id = S3D.structure.nodes.add({x:10, y:0, z:0}); API_RETURN_DATA = {new_node: id};"
  }
}
```

Write to `API_RETURN_DATA` to return data. Available S3D functions include `S3D.structure.nodes.add`, `S3D.structure.members.add`, `S3D.structure.supports.add`, `S3D.structure.members.intersect`, `S3D.UI.update`.

### `S3D.model.getLocalAxisVectors`

Returns local axis vectors `{x, y, z}` for each member.

---

## S3D.results Functions

> **Full results object schema lives in [`analysis-results`](../analysis-results/SKILL.md).** This
> section only covers the function signatures; see that skill for the complete per-load-combination
> shape (reactions, per-station member/plate results, min/max summaries) and its gotchas, plus how
> to read results from inside an S3D App instead of the API.

### `S3D.results.get`

Fetches analysis results after solving. Same filter options as `S3D.model.solve`.

```json
{
  "function": "S3D.results.get",
  "arguments": {
    "result_filter": ["member_peak_results"],
    "lc_filter": ["envelope_abs_max"]
  }
}
```

### `S3D.results.set`

Set results from an external source for further processing.

```json
{
  "function": "S3D.results.set",
  "arguments": { "analysis_results": { /* results object */ } }
}
```

### `S3D.results.fetchMemberResult`

Get detailed results for a specific member.

| Key | Type | Description |
|---|---|---|
| `member_id` | `integer` | Member ID (`null` = all members) |
| `LC` | `[integer]` | Load combination IDs (empty = all) |
| `res_key` | `string` | `"bmd_z"`, `"bmd_y"`, `"axial"`, `"sfd_y"`, `"sfd_z"`, `"top_bending_stress_z"`, `"displacement"`, `"displacement_x/y/z"` |
| `type` | `string` | `"array"`, `"x,y"` (with x positions), `"image"` (base64 plot) |

```json
{
  "function": "S3D.results.fetchMemberResult",
  "arguments": {
    "member_id": 1,
    "LC": [1],
    "res_key": "bmd_z",
    "type": "x,y"
  }
}
```

### `S3D.results.getAnalysisReport`

Generate a PDF or TXT analysis report. Requires `S3D.model.set` and `S3D.model.solve`.

```json
{
  "function": "S3D.results.getAnalysisReport",
  "arguments": {
    "job_name": "My Project",
    "file_type": "pdf",
    "load_combinations": [1, 2, "Envelope Absolute Max"],
    "sections": {
      "title_page": true,
      "nodal_reactions": true,
      "member_forces": true,
      "member_displacements": true
    }
  }
}
```

Returns `view_link` and `download_link` URLs.

> **Don't call this by default in an analyze/results pipeline.** Generating a full
> report re-solves the model and renders every requested section (member forces,
> displacements, reactions, ...) across every load combination - slow (can take 60-90s+
> on even a modest model, and commonly times out), and it produces a downloadable PDF
> most apps never actually surface anywhere in their UI. Only call it when the user
> explicitly asks for a downloadable/viewable report, ideally behind its own button
> (like a CAD-drawing generation step), not bundled into the main solve+results call.

### `S3D.results.getDynamicFreq`

Returns dynamic/frequency analysis results.

```json
{
  "function": "S3D.results.getDynamicFreq",
  "arguments": {
    "result_filter": ["modes", "mass_participation_percentage"]
  }
}
```

---

## S3D.file Functions

### `S3D.file.save`

Save the current model to cloud storage. Requires `S3D.model.set`.

```json
{
  "function": "S3D.file.save",
  "arguments": {
    "name": "my-model",
    "path": "projects/analysis/",
    "public_share": true
  }
}
```

Returns a URL to open the file in S3D, and optionally a `public_link`.

### `S3D.file.open`

Load a model from cloud storage (sets it for the session).

```json
{
  "function": "S3D.file.open",
  "arguments": {
    "name": "my-model",
    "path": "projects/analysis/",
    "load_results": false
  }
}
```

Use `uid` instead of `name`/`path` if the file UID is known.

### `S3D.file.share`

Share a model file with other SkyCiv users.

```json
{
  "function": "S3D.file.share",
  "arguments": {
    "name": "my-model",
    "path": "projects/",
    "share_with": ["colleague@example.com"]
  }
}
```

### `S3D.file.getFileDirectory`

List files/folders in cloud storage.

```json
{
  "function": "S3D.file.getFileDirectory",
  "arguments": {
    "path": "projects/",
    "full_list_flat": true
  }
}
```

### `S3D.file.restoreVersion`

Roll back to a prior version.

```json
{
  "function": "S3D.file.restoreVersion",
  "arguments": { "rollback_versions": 1 }
}
```

---

## S3D.SB (Section Builder) Functions

### `S3D.SB.getLibraryTree`

List available sections in the section library.

```json
{
  "function": "S3D.SB.getLibraryTree",
  "arguments": {
    "section_map": ["American", "AISC", "W shapes"]
  }
}
```

### `S3D.SB.loadLibraryShape`

Load a specific section from the library into the session.

### `S3D.SB.buildCustomShape`

Build a custom section from points or a line-with-thickness.

```json
{
  "function": "S3D.SB.buildCustomShape",
  "arguments": {
    "units": "mm",
    "type": "points",
    "points": [
      [0, 0, 0], [100, 0, 0], [100, 200, 0], [0, 200, 0]
    ],
    "run_solve": true,
    "material_id": 1
  }
}
```

`type: "line"` takes an open polyline + `thickness` to create thin-walled sections.

### `S3D.SB.solve`

Calculate section properties for the currently loaded section.

```json
{ "function": "S3D.SB.solve" }
```

### `S3D.SB.submit`

Submit the current section into the structural model.

```json
{
  "function": "S3D.SB.submit",
  "arguments": { "section_id": 1 }
}
```

### `S3D.SB.runGSD`

General Section Designer — FEA-based RC section capacity check.

| Key | Description |
|---|---|
| `design_code` | `"ACI"`, `"AS 3600"`, `"BS"`, `"CSA"`, `"EN"`, `"IS 456"`, `"NSCP 2015"` |
| `concrete_class` | e.g. `"C5000"` (ACI) or `"N32"` (AS) |
| `steel_grade` | e.g. `"Grade 60"` (ACI) |
| `reinforcement` | Array of `{z, y, diam}` |
| `loads` | Array of `{N, M_z, M_y}` |

---

## S3D.design Functions

Design checks for the model in the current session. Requires `S3D.model.set` earlier in the session. If the model hasn't been solved yet, the API may call `S3D.model.solve` for you. That uses an extra credit, and the response says so.

### Member Design vs Quick Design: which to use

**Scope:** this preference applies to **steel, cold-formed steel and timber only**. **Concrete is the opposite: always use the Quick Design concrete calculators**, never `S3D.design.rc.check` (see [below](#s3ddesignrcgetinput--s3ddesignrccheck)).

**Rule:** if the member's material and design code appear in the [supported `design_code` list](#supported-member-design_code-values), **use `S3D.design.member.check`**. Use a [`run-quick-design`](../run-quick-design/SKILL.md) calculator only when one of the exceptions below applies.

**Why Member Design wins:** it works on the whole solved model, not on one member and one set of loads typed in by hand. It automatically:
- runs **every load combination** in the model and reports the worst one per member,
- works out **effective lengths and bracing/restraints** from the model's connectivity (continuous members, intermediate nodes, connecting members),
- handles **member grouping** (continuous members designed as one physical member),
- gives one HTML/PDF report for the whole structure.

A Quick Design calculator needs all of these extracted and passed in by hand: forces from one combination, effective lengths, and restraint assumptions. Each one is a place to make a mistake. Quick Design calculators are still accurate and well tested. They are just the second choice whenever Member Design covers the same code.

**Use Quick Design instead when:**
- the code or material isn't in the list. Examples: all aluminium (AS/NZS 1664, ADM, CSA S157, EN 1999), CSA O86, EN 1995, NZS 1720, and any steel/timber code not listed.
- the member is **concrete** (beams, columns, slabs, walls, footings). Always use the Quick Design concrete calculators. See the [catalogue](../run-quick-design/assets/catalogue.md) Concrete and Foundation sections.
- the user explicitly asks for an **edition** that only Quick Design has, e.g. AISC 360-22. Member Design covers AISC 360-16/360-10 and CSA S16-24/S16-14. If the user just says "AISC" or "CSA S16" without an edition, use Member Design (`CSA_S16-24` for CSA S16, the current edition) and say which edition you used.
- it isn't a member check. Examples: connections, bolt/weld groups, base plates, lifting lugs, plates, footings, purlin-specific calcs, scaffolding, loads.
- there is no S3D model. It's a one-off hand check of a single member with known forces.
- you're writing a Quick Design calc pack's `s3d_integration.js`. That workflow is Quick Design by definition. See [`build-quick-design-calculator`](../build-quick-design-calculator/references/s3d-integration.md).

| Quick Design calculator | Use this Member Design `design_code` instead |
|---|---|
| `2015-as4100-i-beam-capacity-calculator` (AS 4100:2020) | `AS_4100-2020` |
| `2017-eu-i-beam-capacity-calculator` (EN 1993-1-1) | `EN_1993-1-1-2005` |
| `2002-steel-i-beam-capacity-calculator`, `2006-aisc-angle-…`, `2007-aisc-c-beam-…` (AISC 360-16) | `AISC_360-16_LRFD` / `AISC_360-16_ASD` |
| `2018-aisc-i-beam-capacity-calculator` (AISC 360-22) | `AISC_360-16_LRFD` / `_ASD`, unless the user requires the 360-22 edition |
| `2021-nz-steel-calculator` (NZS 3404:1997) | `NZS_3404-1997` |
| `2012-csa-i-beam` (CSA S16-14) | `CSA_S16-14` |
| `2022-csa-steel-calculator` (CSA S16-24) | `CSA_S16-24` |
| `2304-as4600-cfs-design-calculator` (AS/NZS 4600:2018) | `ASNZS_4600-2018` (or `AS_4600-2018`) |
| `2305-aisi-cfs-design-calculator` (AISI S100-16) | `AISI_S100-16_LRFD` / `_ASD` / `_LSD` |
| `4005-as1720-wood-beam-calculator` (AS 1720.1:2010) | `AS_1720-2010` |
| `4003-nds-wood-beam-calculator` (NDS 2018) | `NDS_2018_LRFD` / `NDS_2018_ASD` |

### `S3D.design.member.check`

Runs member design checks on every member of the model. Returns capacities, utility ratios, the governing load combination, and report links.

| Key | Type | Required | Description |
|---|---|---|---|
| `design_code` | `string` | yes | One of the [supported values](#supported-member-design_code-values) |
| `design_obj` | `object` | no | Design settings: section/material/effective-length overrides, deflection limits, etc. Get one from `S3D.design.member.getInput`, edit it, and pass it back. Leave it out to use the defaults the model implies. |
| `exclude_results` | `[string]` | no | Result keys to leave out of the response to keep it small, e.g. `["capacity"]` |

```json
{
  "function": "S3D.design.member.check",
  "arguments": { "design_code": "AS_4100-2020" }
}
```

The response `data` contains `capacity` (tension, compression, moments, shears per member), `ratio` (axial, moment, shear, combined, slenderness, displacement, and the worst load combination per member), `grouping`, `summary` (passed/failed members and the critical failure), and HTML/PDF report links. Show the engineer the critical utility ratio and the report link, not just pass/fail.

For `CSA_S16-24`, `design_obj.input.settings.report_mode` sets the member report detail: `"detailed"` (default, step-by-step formulas) or `"table"` (key values in tables, shorter reports).

### `S3D.design.member.getInput`

Returns the default `design_obj` for a `design_code`, built from the current model. Use it when you need to change design settings before calling `S3D.design.member.check`.

| Key | Type | Required | Description |
|---|---|---|---|
| `design_code` | `string` | yes | One of the [supported values](#supported-member-design_code-values) |

#### Minor axis bracing (`ASNZS_4600-2018` only)

Cold-formed purlins/girts continuously braced by sheeting can be set as **braced about their minor axis**: M<sub>y</sub> from the analysis is taken as 0 in every strength combination, and the checks use the **geometric axes** (not principal) properties. Only Z and Lipped Z results change beyond M<sub>y</sub>; symmetric sections (C, Lipped C, Hat, boxes) have the same properties about both. Other codes ignore it.

There are three ways to set it. Member Design uses the first one it finds: `design_obj` passed to `check`, else the model's `design_input` for the code, else the defaults built from the model (the only case where `design_params` is read).

| Way | Where | Use when |
|---|---|---|
| 1. `design_obj` | `check` argument | You're already doing `getInput` → edit → `check` |
| 2. `design_params` | each member in `s3d_model.members` | Building the model and you want the defaults plus bracing, with no `getInput` round trip |
| 3. `design_input` | `s3d_model` root | The design settings should be saved with the model (`S3D.file.save`) and open in the UI |

**1. `design_obj`:** find the member's `restraint_id` in `design_obj.input.design_members`, then on **every** position of `design_obj.input.restraints["<restraint_id>"]` set:

| Key | Type | Values | Notes |
|---|---|---|---|
| `minor_axis_bracing` | `boolean` | `true` / `false` (default `false`) | Member-wide: read from the **first** position and applied to all, so set it on every position. Applies to **every** member sharing that `restraint_id`. |
| `global_buckling_bracing` | `string` | `"unbraced"` (default), `"top"`, `"bottom"`, `"both"` | Must be `top`/`bottom`/`both` on the first position and on every intermediate position that starts a segment (`LB` not starting with `"RR"`), or `minor_axis_bracing` is **silently reset to `false`** (no error). The last position doesn't start a segment. |

```js
for (const m of design_obj.input.design_members) {
  if (!idsToBrace.includes(m.id)) continue;
  for (const pos of Object.values(design_obj.input.restraints[m.restraint_id])) {
    pos.global_buckling_bracing = "top";   // sheeting on the top flange
    pos.minor_axis_bracing = true;
  }
}
// then S3D.design.member.check { design_code: "ASNZS_4600-2018", design_obj }
```

**2. `design_params` on the member** (in `S3D.model.set`):

```json
"members": {
  "1": { "node_A": 1, "node_B": 2, "section_id": 1, "fixity_A": "FFFFFF", "fixity_B": "FFFFFF",
         "design_params": { "global_buckling_bracing": "top", "minor_axis_bracing": true } }
}
```

`global_buckling_bracing` goes on every restraint position but the last, `minor_axis_bracing` on all. Gotchas: `minor_axis_bracing` is **ignored** unless `global_buckling_bracing` is `top`/`bottom`/`both` (missing or `"unbraced"` → not braced); any other string is an error. It's only read when the defaults are built: ignored if you pass a `design_obj` or the model has a `design_input` for the code, and for members grouped into a physical member. Each member gets its own restraint ID here, so nothing is shared.

**3. `design_input` on the model:** `s3d_model.design_input["ASNZS_4600-2018"]` holds the same object as `design_obj.input` (`design_members`, `restraints`, …), so set the restraint keys exactly as in way 1. Easiest: `getInput`, edit, then put `design_obj.input` there before `S3D.model.set`/`S3D.file.save`.

To confirm it applied, the member's report shows M<sub>y</sub> as "-" in the loads table and says the minor axis bending checks weren't needed. Design messages `w110`–`w113` on a Z/Lipped Z member mean it **was** applied but a geometric axes DSM factor (`*_g`) was missing and the principal axes value was used.

### `S3D.design.member.optimize`

Goes through the section library to find the lightest section that meets the utility limit.

| Key | Type | Required | Description |
|---|---|---|---|
| `design_code` | `string` | yes | One of the [supported values](#supported-member-design_code-values) |
| `simplified` | `boolean` | no | `true` returns the best result only; `false` returns every iteration |
| `settings` | `object` | no | `max_ur`, `optimize_by` (array of ids), `section_height` `{min, max}`, `section_width` `{min, max}` |

### Supported member `design_code` values

| Material | `design_code` values |
|---|---|
| Steel (hot-rolled) | `AISC_360-16_LRFD`, `AISC_360-16_ASD`, `AISC_360-10_LRFD`, `AISC_360-10_ASD`, `AS_4100-2020`, `AS_4100-1998`, `EN_1993-1-1-2005`, `CSA_S16-24`, `CSA_S16-14`, `NZS_3404-1997`, `BS_5950-1-2000`, `IS_800-2007_LSM`, `IS_800-1984_WSM` |
| Cold-formed steel | `AISI_S100-16_LRFD`, `AISI_S100-16_ASD`, `AISI_S100-16_LSD`, `AISI_S100-12_LRFD`, `AISI_S100-12_ASD`, `ASNZS_4600-2018`, `AS_4600-2018`, `AS_4600-2005`, `EN1993-1-3-2006` |
| Timber | `NDS_2018_LRFD`, `NDS_2018_ASD`, `AS_1720-2010` |

Copy these strings exactly. Note `EN_1993-1-1-2005` has an underscore but `EN1993-1-3-2006` doesn't. The live docs are the source of truth: https://skyciv.com/api/v3/docs/S3D.design

### `S3D.design.rc.getInput` / `S3D.design.rc.check`

> **Don't use these for concrete design.** SkyCiv's RC member design is not currently recommended. Design concrete members with the [`run-quick-design`](../run-quick-design/SKILL.md) concrete calculators (see the Concrete section of the [catalogue](../run-quick-design/assets/catalogue.md)), even when the code below is supported. Only call `S3D.design.rc.*` if the user explicitly asks for it by name.

Reinforced concrete member design for the model. `design_code`: `ACI_318`, `AS_3600`, `EN_2`, `CSA_A23`, `BS_8110`. `rc.check` returns flexure, crack width, shear, and deflection ratios per member, with pass/fail and HTML/PDF report links.

---

## Full Workflow Example

```json
{
  "auth": { "username": "user@example.com", "key": "YOUR_KEY" },
  "options": { "validate_input": true },
  "functions": [
    { "function": "S3D.session.start", "arguments": { "keep_open": false } },
    {
      "function": "S3D.model.set",
      "arguments": {
        "s3d_model": {
          "settings": { "units": "metric", "vertical_axis": "Y" },
          "nodes": {
            "1": { "x": 0, "y": 0, "z": 0 },
            "2": { "x": 5, "y": 0, "z": 0 }
          },
          "members": {
            "1": {
              "node_A": 1, "node_B": 2, "section_id": 1,
              "rotation_angle": 0,
              "fixity_A": "FFFFFF", "fixity_B": "FFFFFF",
              "offset_Ax": 0, "offset_Ay": 0, "offset_Az": 0,
              "offset_Bx": 0, "offset_By": 0, "offset_Bz": 0
            }
          },
          "sections": {
            "1": { "load_section": ["Australian", "Steel (300 Grade)", "Universal beams", "310 UB 32.0"], "material_id": 1 }
          },
          "materials": {
            "1": { "name": "Steel", "density": 7850, "elasticity_modulus": 200000, "poissons_ratio": 0.27, "yield_strength": 350, "ultimate_strength": 470, "class": "steel" }
          },
          "supports": {
            "1": { "node": 1, "restraint_code": "FFFFFF", "tx": 0, "ty": 0, "tz": 0, "rx": 0, "ry": 0, "rz": 0 },
            "2": { "node": 2, "restraint_code": "FFFFRR", "tx": 0, "ty": 0, "tz": 0, "rx": 0, "ry": 0, "rz": 0 }
          },
          "distributed_loads": {
            "1": { "member": 1, "y_mag_A": -10, "y_mag_B": -10, "x_mag_A": 0, "z_mag_A": 0, "x_mag_B": 0, "z_mag_B": 0, "position_A": 0, "position_B": 100, "load_group": "LL", "axes": "global" }
          },
          "load_combinations": {
            "1": { "name": "LC1", "LL": 1.5 }
          },
          "plates": {}, "meshed_plates": {}, "settlements": {},
          "point_loads": {}, "moments": {}, "pressures": {},
          "area_loads": {}, "self_weight": {}, "groups": {}
        }
      }
    },
    {
      "function": "S3D.model.solve",
      "arguments": {
        "analysis_type": "linear",
        "repair_model": true,
        "result_filter": ["member_peak_results", "reactions"]
      }
    }
  ]
}
```

## Structural Engineering Rules
Since you are a Structural Engineer, it's very important to consider proper engineering judgement when utilising this skill:

- Member fixities should be based on proper engineering decisions. For example, if the connections are shear connections, the member end fixities should be pinned
- Wind loads are only ever applied to the face of a structure (never internal columns etc..). You may want to include wind loads from different directions (of course only one should be on per time in the load_combinations)
- Wind loads are normally applied as distributed loads on columns
- Orientation of members should be aligned to each other in a way that makes sense. For examples, columns that continue through a floor should have the same orientation above and below. Example 2: beams that connect through another beam, should have the same orientation on both sides. Example 3: beams meeting at an apex of a portal frame should be aligned
- Single members should not be split at intersections. Rather, they should use type == "continuous" and have nodes at the intersection where other members connect to it. Our design software is capable of handling long span continuos members and will appropriately assign the restraints and connectivity of all members connecting to it via a shared node.
- Where possible, you should use area loads where you can (square, closed shapes works best). It simplifies the loading. Use the type general_one_way. An area load needs members on every edge of its panel: on faces modelled as plates, or on an irregular plan (setbacks, re-entrant corners, missing corner columns), S3D ignores it without an error, so use distributed loads there. In an S3D App, check every area load you add with `S3D.area_loads.checkAll()` and switch to distributed loads if any fail (see the "Area loads" section of [`s3d-apps`](../s3d-apps/SKILL.md)).