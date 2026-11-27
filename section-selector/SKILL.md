---
name: section-selector
description: "Use when an S3D model needs real section geometry: map a country, material and member role (or a loosely written section name such as 'W14x22', '310UC96.8', 'IPE 300', '90x45 MGP10') to the exact load_section path in the SkyCiv section library (section_tree.json), pick a matching material entry, or build a concrete or custom section as a template shape with its dimension keys. Trigger whenever sections are being chosen or written into an s3d_model, e.g. 'use Australian UBs for the rafters', 'what's the SkyCiv name for a 200PFC', 'add a 300x600 concrete beam section', 'load_section isn't found'. load_section is an exact string match, so never guess a path. Not for the rest of the model schema (use s3d-api) or for picking sections inside an S3D App UI (use s3d-apps and SB.library.getTree)."
---

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

The strings in the array come directly from the names in `section_tree.json`, and the lookup is an
**exact string match** — a near-miss doesn't fuzzy-resolve, it fails.

> **Building an S3D App or left-menu panel?** Don't ship `section_tree.json` and don't make the
> user type the path. `SB.library.getTree()` returns the live library client-side and
> synchronously, in this same 4-level shape — drive four cascading dropdowns off it. See
> "Choosing sections" in [`s3d-apps`](../s3d-apps/SKILL.md). Server-side, the equivalent is the
> `S3D.SB.getLibraryTree` API function in [`s3d-api`](../s3d-api/SKILL.md). `section_tree.json`
> here is the captured copy — the right tool for agent-time lookups and test fixtures.


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
            "dimensions": { "h": 600, "b": 400 }
        }
    }
}
```

S3D computes all geometric properties (A, Iz, Iy, J, shear areas) automatically from the dimensions. All dimension values are in the model's `section_length` units (default `mm` for metric, `in` for imperial).

> **Inside S3D (an S3D App or in-app script):** S3D builds the section on the server, so the resolved properties only exist in a callback: `S3D.API.API2S3D(apiModel, null, callback)` or `S3D.structure.set(model, null, true, callback)`. Never read `area`/`Iz` from a synchronous return. The same applies to `load_section` paths. See `s3d-apps/references/resolving-sections.md`.

## Supported shapes and their dimension keys

Dimension keys are **case-sensitive** and must match exactly. A wrong key (for example `d`
instead of `D` for a circle) does not resolve, and the section comes back without properties.
`r` is the corner or root radius; use `0` for none.

| `shape` string (aliases) | `dimensions` keys | Typical use |
|---|---|---|
| `"rectangle"` | `h` (depth), `b` (width) | Concrete beams, rectangular columns |
| `"hollow rectangle"` | `h` (depth), `b` (width), `t` (thickness), `r` (radius) | Box sections, hollow piers |
| `"circle"` | `D` (diameter, **capital D**) | Circular columns, piles |
| `"hollow circle"` | `D` (diameter, **capital D**), `t` (thickness) | Hollow circular columns, pipes |
| `"ibeam"` (`"ishape"`, `"i"`) | `TFw` (top flange width), `TFt` (top flange thickness), `BFw` (bottom flange width), `BFt` (bottom flange thickness), `h` (total height), `Wt` (web thickness), `r` (radius) | Precast I-girders |
| `"tbeam"` (`"teeshape"`, `"tshape"`, `"tee"`, `"t"`) | `TFw` (top width), `TFt` (top thickness), `h` (total height), `Wt` (web thickness), `r` (radius) | T-beams |
| `"lbeam"` (`"angle"`, `"l"`) | `BFw` (bottom width), `BFt` (bottom thickness), `h` (total height), `LFt` (left thickness), `r` (radius) | L-beams, angles |
| `"channel"` (`"c"`) | `h` (total height), `TFw` (top width), `TFt` (top thickness), `BFw` (bottom width), `BFt` (bottom thickness), `Wt` (web thickness), `r` (radius) | Channels |
| `"lipped channel"` | `h`, `TFw`, `TFt`, `BFw`, `BFt`, `Wt`, `d` (lip depth), `r` | Cold-formed lipped channels |
| `"zshape"` (`"z"`, `"zsection"`) | `h` (total height), `TFw` (top width), `BFw` (bottom width), `t` (thickness), `r` (radius) | Z sections |
| `"lipped zshape"` (`"lipped z"`, `"zsectionLipped"`) | `h`, `TFw`, `BFw`, `t`, `gamma` (lip bend angle), `d` (lip length), `r` | Cold-formed lipped Z purlins |
| `"lipped angle"` | `h` (total height), `BFw` (bottom width), `t` (thickness), `d` (lip depth), `r` (radius) | Cold-formed lipped angles |
| `"lipped channel box"` | `h` (depth), `b2` (width 2), `b` (width), `t` (thickness), `d` (lip depth), `r` (radius) | Cold-formed box sections |

> **Convention:** `h` is the overall depth in the plane of bending. If the member bends about its strong axis, `h` should be the deeper dimension.
>
> Steel sections that are stocked in the library (W, UB, SHS, RHS, CHS, …) should still use `load_section`. Use the template shapes for concrete, and for steel or cold-formed sizes the library doesn't stock.

## Worked examples (metric, mm)

```json
"sections": {
    "1": {
        "material_id": 1,
        "info": { "shape": "rectangle", "dimensions": { "b": 300, "h": 600 } }
    },
    "2": {
        "material_id": 1,
        "info": { "shape": "circle", "dimensions": { "D": 500 } }
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
        "info": { "shape": "circle", "dimensions": { "D": 18 } }
    }
}
```

## Concrete material properties

Pair each section with a material whose `class` is `"concrete"`. `elasticity_modulus` depends
on the design code as well as the grade, so take it from the table for the user's code.
`yield_strength` and `ultimate_strength` are set to the characteristic strength (fck or f'c).
`poissons_ratio` is 0.2. Density is 2500 kg/m³ for reinforced concrete.

**Eurocode, EN 1992-1-1 (MPa).** The grade is cylinder / cube strength, so C30/37 has fck = 30.

| Grade | fck (MPa) | Ecm (MPa) |
|---|---|---|
| C20/25 | 20 | 30 000 |
| C25/30 | 25 | 31 000 |
| C30/37 | 30 | 33 000 |
| C35/45 | 35 | 34 000 |
| C40/50 | 40 | 35 000 |
| C45/55 | 45 | 36 000 |
| C50/60 | 50 | 37 000 |

**Australia, AS 3600 (MPa).**

| Grade | f'c (MPa) | Ec (MPa) |
|---|---|---|
| N25 | 25 | 26 700 |
| N32 | 32 | 30 100 |
| N40 | 40 | 32 800 |
| N50 | 50 | 34 800 |
| 65 MPa | 65 | 37 400 |

**US, ACI 318, metric (MPa).** Ec = 4700√f'c.

| f'c (MPa) | Ec (MPa) |
|---|---|
| 25 | 23 500 |
| 30 | 25 700 |
| 35 | 27 800 |
| 40 | 29 700 |

```json
"materials": {
    "1": {
        "name": "Concrete C30/37 (EN 1992)",
        "density": 2500,
        "elasticity_modulus": 33000,
        "poissons_ratio": 0.2,
        "yield_strength": 30,
        "ultimate_strength": 30,
        "class": "concrete"
    }
}
```

**Imperial (ksi, lb/ft³):**

| Grade | f'c (psi) | Ec = 57000√f'c (ksi) | density (lb/ft³) |
|---|---|---|---|
| 3000 psi | 3000 | 3122 | 150 |
| 4000 psi | 4000 | 3605 | 150 |
| 5000 psi | 5000 | 4031 | 150 |

The 150 lb/ft³ density is for reinforced concrete; plain concrete is about 145.

```json
"materials": {
    "1": {
        "name": "Concrete 4000 psi",
        "density": 150,
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
- **Concrete columns:** `"rectangle"` for square/rectangular; `"circle"` (key `D`) for circular; keep the smallest dimension ≥ 300 mm (12 in).
- **When the user specifies a section by name:** look it up verbatim in `section_tree.json` — don't guess the category.
- **When the user specifies only depth (e.g. "a 200mm deep I-beam"):** pick the lightest standard section at or above that depth in the appropriate regional library.

