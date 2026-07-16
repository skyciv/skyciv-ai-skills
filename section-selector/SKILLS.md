# Section Selection Skill

You are a specialist in selecting the appropriate structural section from the SkyCiv section library to be used in the S3D model object.

You will likely be given information from a user with (a) country where the structure is being built and (b) the preferred material. You may also be given specific sections to use. The name will likely not perfectly match the nomenclature of the SkyCiv library.

You should then be very efficient at location the appropriate section from the SkyCiv database and injecting it into the S3D model JSON.

---

# Typical Section Format (for S3D Model)

You will mainly load in sections using this format:

```js
    "sections": {
        "1": {
            "load_section": ["American", "AISC", "W shapes", "W14x22"],
            "material_id": 1
        }
    }
```

The strings in the array come directly from the names in `section_tree.json`. 

# Common Section Types and their Use Cases

| Section type | Typical use | Shape description |
|---|---|---|
| Wide flange / I-beam (W, UB, IPE, HE, UB) | Beams, columns, moment frames | Doubly symmetric I-section; strong axis bending |
| HP / H-pile shapes | Bearing piles | Compact I with equal flange/web thickness |
| S / IPN beams | Legacy beams, crane runways | Tapered-flange I-section |
| Rectangular HSS / RHS / SHS | Columns, hollow frames, trusses | Rectangular or square hollow section |
| Round HSS / CHS / Pipe | Columns, bracing, exposed architectural members | Circular hollow section |
| Channels (C, MC, PFC, UPE) | Purlins, secondary beams, connection elements | Single-axis symmetry channel |
| Equal angles (L, EA) | Bracing, girts, connections | Equal-leg angle |
| Unequal angles (L, UA) | Eccentric bracing, connections | Unequal-leg angle |
| Tees (WT, T, UBT, UCT) | Chords of open-web trusses, connection tees | T-section cut from I-beam |
| Cold-formed C / Z / lipped | Light-framing studs, wall track, purlins, girts | Thin-walled open section |
| Sawn / glulam / LVL timber | Floor joists, rafters, posts | Rectangular solid or engineered wood |
| Aluminium I / channel / tube | Light-duty structures, architectural framing | As per steel shapes but aluminium alloy |

---

# Region → Standard Mapping

Choose the outermost two path components from the table below based on the project country:

| Country / region | `load_section` path start | Notes |
|---|---|---|
| United States | `["American", "AISC", ...]` | Standard steel database; also `"ADM"` for aluminium, `"NDS"` for timber |
| Australia | `["Australian", "Steel (300 Grade)", ...]` or `"Steel (250 Grade)"` | 300 grade is the default; DuraGal for RHS/SHS/channels |
| United Kingdom | `["British", "Steel", ...]` | UC/UB/CHS/RHS; `"Wood"` sub-library available |
| Canada | `["Canadian", "CISC", ...]` | W/HP/WWF shapes; `"CWC"` for timber |
| Europe / Germany / France etc. | `["European", "Steel", ...]` | IPE, HE, HL, HD, UPN, UPE, EN 10210 hollow sections |
| India | `["Indian", "Steel", ...]` | MB/MC/ISA/ISMC sections |
| China | `["China", "Steel", ...]` | H/I/channel/angle/CHS/RHS |
| New Zealand | `["New Zealand", "Structural Steel", ...]` | UB/UC/PFC/CHS/RHS/SHS |
| Mexico | `["Mexican", "Steel", ...]` | IPR, canal, ángulo sections |
| South Africa | `["South African", "Steel", ...]` | IPE/I/H/channels |

---

# Finding the Exact Section Name

The `load_section` array is always **four strings** in the exact order they appear in `section_tree.json`:

```
[  Region,  Standard/Publisher,  Category,  Section name  ]
```

Examples across common regions:

| Description | `load_section` array |
|---|---|
| US wide-flange beam | `["American", "AISC", "W shapes", "W18x35"]` |
| US wide-flange column | `["American", "AISC", "W shapes", "W12x96"]` |
| US rectangular HSS | `["American", "AISC", "Rectangular HSS", "HSS6x4x1/4"]` |
| US round HSS | `["American", "AISC", "Round HSS", "HSS4.000x0.237"]` |
| US standard pipe | `["American", "AISC", "Pipe", "Pipe3Std"]` |
| US equal angle | `["American", "AISC", "Equal angles", "L4x4x1/2"]` |
| US C channel | `["American", "AISC", "American standard channels", "C8x11.5"]` |
| Australian UB beam | `["Australian", "Steel (300 Grade)", "Universal beams", "310 UB 32.0"]` |
| Australian UC column | `["Australian", "Steel (300 Grade)", "Universal columns", "150 UC 23.4"]` |
| Australian RHS | `["Australian", "Steel (300 Grade)", "RHS (Grade 350)", "100x50x3 RHS"]` |
| Australian CHS | `["Australian", "Steel (300 Grade)", "CHS (Grade 350)", "88.9x3.2 CHS"]` |
| British UB beam | `["British", "Steel", "Universal beams", "254x102 UB 22"]` |
| British UC column | `["British", "Steel", "Universal columns", "203x203 UC 46"]` |
| European IPE beam | `["European", "Steel", "IPE beams", "IPE 200"]` |
| European HE column | `["European", "Steel", "Wide flange HE HL beams", "HE 200 B"]` |
| European SHS | `["European", "Steel", "EN 10210-2 SHS", "SHS100x100x5.0"]` |
| Canadian W shape | `["Canadian", "CISC", "W: Wide Flange", "W200x42"]` |

> **Exact string match required.** Copy names character-for-character from `section_tree.json`.
> A mismatched space, capitalisation, or unit suffix will silently fail to load.

---

# Injecting into the S3D Model

## Sections object

Each section entry needs a `material_id` that must already exist in the model's `materials` object.

```json
"sections": {
    "1": { "load_section": ["American", "AISC", "W shapes", "W18x35"], "material_id": 1 },
    "2": { "load_section": ["American", "AISC", "Rectangular HSS", "HSS6x4x1/4"], "material_id": 1 }
}
```

## Matching material class to section library

| Section library | Expected material `class` |
|---|---|
| AISC, CISC, British Steel, European Steel, Australian Steel, etc. | `"steel"` |
| ADM (American), Australian Aluminium, NZ Aluminium | `"aluminium"` |
| NDS, CWC, British Wood, Australian Timber, etc. | `"wood"` |

When using `load_section`, the material properties (E, Fy, density) still come from the `materials` entry — the section library only supplies the **geometric** properties (A, Iz, Iy, J, etc.). Always define matching material properties alongside.

## Typical material entries (imperial)

```json
"materials": {
    "1": {
        "name": "Steel A992",
        "density": 490,
        "elasticity_modulus": 29000,
        "poissons_ratio": 0.3,
        "yield_strength": 50,
        "ultimate_strength": 65,
        "class": "steel"
    }
}
```

## Typical material entries (metric)

```json
"materials": {
    "1": {
        "name": "Steel 350 Grade",
        "density": 7850,
        "elasticity_modulus": 200000,
        "poissons_ratio": 0.3,
        "yield_strength": 350,
        "ultimate_strength": 480,
        "class": "steel"
    }
}
```

---

# Concrete Sections

Concrete sections have no entry in the section library — always define them as **template shapes** using the `info` object. Do **not** use `load_section` for concrete.

## Template shape format

```json
"sections": {
    "1": {
        "material_id": 1,
        "info": {
            "shape": "rectangle",
            "dimensions": { "b": 400, "h": 600 }
        }
    }
}
```

S3D computes all geometric properties (A, Iz, Iy, J, shear areas) automatically from the dimensions. All dimension values are in the model's `section_length` units (default `mm` for metric, `in` for imperial).

## Supported shapes and their dimension keys

| `shape` string | Required `dimensions` keys | Typical concrete use |
|---|---|---|
| `"rectangle"` | `b` (width), `h` (height) | Beams, rectangular columns, slabs on grade |
| `"circle"` | `d` (diameter) | Circular columns, piles |
| `"hollow rectangle"` | `b`, `h`, `t` (wall thickness) | Hollow rectangular piers (box sections) |
| `"hollow circle"` | `d`, `t` (wall thickness) | Hollow circular columns |
| `"ibeam"` | `h`, `b`, `tf` (flange thickness), `tw` (web thickness) | Precast I-girders, T-beams (approximate) |
| `"tbeam"` | `h`, `b`, `tf`, `tw` | T-beams, L-beams (precast or cast-in-place) |

> **Convention:** `b` = width (horizontal), `h` = overall height (vertical, in the plane of bending). If the beam bends about its strong axis, `h` should be the deeper dimension.

## Worked examples (metric, mm)

```json
"sections": {
    "1": {
        "material_id": 1,
        "info": { "shape": "rectangle", "dimensions": { "b": 300, "h": 600 } }
    },
    "2": {
        "material_id": 1,
        "info": { "shape": "circle", "dimensions": { "d": 500 } }
    },
    "3": {
        "material_id": 1,
        "info": { "shape": "rectangle", "dimensions": { "b": 500, "h": 500 } }
    }
}
```

## Worked examples (imperial, in)

```json
"sections": {
    "1": {
        "material_id": 1,
        "info": { "shape": "rectangle", "dimensions": { "b": 12, "h": 24 } }
    },
    "2": {
        "material_id": 1,
        "info": { "shape": "circle", "dimensions": { "d": 18 } }
    }
}
```

## Concrete material properties

Pair each section with a material whose `class` is `"concrete"`. Use `elasticity_modulus` consistent with the design code and grade.

**Metric (MPa, kg/m³):**

| Grade | f'c (MPa) | Ec ≈ 4700√f'c (MPa) | density (kg/m³) |
|---|---|---|---|
| C25 / 25 MPa | 25 | 23 500 | 2400 |
| C32 / 32 MPa | 32 | 26 600 | 2400 |
| C40 / 40 MPa | 40 | 29 700 | 2400 |
| C50 / 50 MPa | 50 | 33 200 | 2400 |

```json
"materials": {
    "1": {
        "name": "Concrete 32 MPa",
        "density": 2400,
        "elasticity_modulus": 26600,
        "poissons_ratio": 0.2,
        "yield_strength": 32,
        "ultimate_strength": 32,
        "class": "concrete"
    }
}
```

**Imperial (ksi, lb/ft³):**

| Grade | f'c (psi) | Ec ≈ 57000√f'c (psi) = … (ksi) | density (lb/ft³) |
|---|---|---|---|
| 3000 psi | 3000 | 3122 | 145 |
| 4000 psi | 4000 | 3605 | 145 |
| 5000 psi | 5000 | 4031 | 145 |

```json
"materials": {
    "1": {
        "name": "Concrete 4000 psi",
        "density": 145,
        "elasticity_modulus": 3605,
        "poissons_ratio": 0.2,
        "yield_strength": 4,
        "ultimate_strength": 4,
        "class": "concrete"
    }
}
```

---

# Design Guidance — Selecting the Right Section

- **Columns under axial + bending:** prefer W/UC/HD wide-flange shapes or square HSS — doubly symmetric, efficient for combined loading.
- **Primary beams (strong-axis bending):** W/UB/IPE I-sections — maximise Iz.
- **Bracing diagonals:** round or square HSS, angles, or rods — compact, symmetric, efficient in tension/compression.
- **Purlins / girts (secondary, single-span):** cold-formed C or Z; for heavier loads use PFC/MC channels.
- **Truss chords:** W or WT tees; for lighter trusses use angles (back-to-back or single).
- **Concrete beams:** `"rectangle"` template, b = width, h = depth; deeper is stronger in bending.
- **Concrete columns:** `"rectangle"` for square/rectangular; `"circle"` for circular; size both dimensions ≥ 300 mm (12 in) as a minimum.
- **When the user specifies a section by name:** look it up verbatim in `section_tree.json` — don't guess the category.
- **When the user specifies only depth (e.g. "a 200mm deep I-beam"):** pick the lightest standard section at or above that depth in the appropriate regional library.

