# Glass Balustrade Configurator

A local test app that models, analyzes, AS/NZS 1664 design-checks, visualizes and drafts
a glass balustrade (aluminium posts + glass infill panels + a CHS top handrail, fixed
into concrete), built entirely on the SkyCiv API skills in this repo (`skyciv-api-v3`,
`s3d-api`, `load-gen-api`, `load-combinations`, `run-quick-design`, `cloudcad-api`,
`renderer`).

## What it does

Given handrail height, target post spacing, a total run length, glass height, a post
type/size (RHS/SHS/CHS from the Australian Aluminium section library), an occupancy
classification, and a site/building description for the wind load lookup:

1. Generates a parametric `s3d_model`: evenly-spaced fixed-base aluminium posts
   (cantilevers into the concrete slab) connected by a continuous CHS handrail chord,
   sourced from the `Australian > Aluminium` section library (`section-selector`).
2. Resolves an AS 1170.2 windward wall design pressure at the balustrade's elevation via
   `load-gen-api`'s `standalone.loads.getLoads` (`design_code: "as1170"`), given the
   building's height/dimensions, site address, terrain category and importance level -
   the worst of the 4 principal directions, applied both outward and inward on the posts
   (pressure + suction) as a UDL over the glass-height tributary region of each post.
3. Applies AS 1170.1-style balustrade/barrier imposed loads (a horizontal line load along
   the handrail, and a separate non-concurrent point load at each post top) based on the
   selected occupancy classification (A, B, C1-C5) - see "Notes / caveats" below, these
   are indicative defaults and fully editable in the UI.
4. Factors dead + imposed + wind into 9 hand-derived AS/NZS 1170.0 strength combinations
   (in the same G/Q/W factor style as `load-combinations/assets/as-nzs-1170-australia.json`).
5. Solves it via `S3D.model.solve`.
6. Checks **every post** (no pre-screening; the handrail itself isn't checked, only
   posts, per spec) against the **`2601-aluminium-design`** Quick Design calculator
   (AS/NZS 1664), using the worst-case (enveloped) axial/bending/shear demand per post
   across the 9 strength combinations and a fixed-base cantilever effective-length factor
   (`kz = ky = 2.0`). Reports the governing utilization ratio + combo, a pass/fail table
   for every post (each with an "Open in Quick Design" link and PDF report), and the
   governing reaction at every post base.
7. Visualizes the model client-side with `SKYCIV.renderer`.
8. On request, drafts a balustrade elevation CAD drawing (posts, glass panels, handrail
   centerline + a handrail cross-section detail, with post-spacing/handrail-height/
   glass-height dimensions) via `cloudcad.model.create` + `cloudcad.file.save`, on an
   A2-landscape page with a title block, drawn at true size and only translated (never
   scaled) into a safe zone - see `server/cadDrawing.js`.

See the "Modeling assumptions" panel in the app (or `server/balustradeModel.js`) for the
exact geometry, fixity and load-derivation rules used to turn the inputs into a full 3D
model.

## Setup

```bash
cd prototypes/glass-balustrade-configurator
npm install
cp .env.example .env
# edit .env: SKYCIV_USERNAME, SKYCIV_API_KEY, SKYCIV_QD_TOKEN
npm start
```

Then open http://localhost:4200.

- `SKYCIV_API_KEY` — from https://platform.skyciv.com/api, used for the `skyciv-api-v3`
  envelope (S3D solve, the AS 1170.2 wind lookup, and CloudCAD).
- `SKYCIV_QD_TOKEN` — API token from the same page, used for Quick Design. If you only
  have one key, it's reused for both.

## Notes / caveats

- **AS 1170.1 balustrade/barrier loads are indicative defaults, not sourced from a live
  calculator or skill** - no barrier/balustrade load table exists anywhere in
  `run-quick-design` or `load-combinations` (confirmed by grep). `server/balustradeLoadTable.js`
  ships a small built-in lookup (escalating from ~0.3-0.5 kN/m for domestic/office
  classifications up to 3.0 kN/m for crowd-loaded assembly areas), editable in the UI
  once a classification is picked. **Verify against the current AS 1170.1 edition for
  your specific classification before relying on these for a real design.**
- **Posts are modeled as fixed-base cantilevers** into the concrete slab (rigid base,
  `FFFFFF`) - standard for post-and-glass systems. No footing/anchor/concrete design
  check is performed - only the post AS/NZS 1664 member check was in scope.
- **Glass is a non-structural load path only.** Wind pressure on its tributary area
  (post spacing × glass height) is transferred to the two adjacent posts as a UDL; the
  glass itself is not modeled or checked (AS 1288 glass design is out of scope).
- **Wind design pressure is a simplification**: the worst of the 4 principal-direction
  windward wall pressures at the balustrade's elevation, independent of the balustrade's
  actual orientation relative to the building footprint, applied both outward and inward.
  A full free-standing-barrier wind analysis (AS 1170.2 hoardings/free-standing walls, if
  applicable to your project) is not implemented.
- **Terrain category (CAT1-CAT4) must be supplied** - `load-gen-api` does not auto-derive
  it from the site address; defaults to CAT2 in the UI.
- **Only AS/NZS 1170.0 strength combinations are modeled** - no serviceability/deflection
  combos or checks, since only the AS 1664 strength check + reactions were requested.
- **Post effective-length factor `kz = ky = 2.0`** (standard fixed-base/free-top
  cantilever coefficient), unbraced length = post height - see `server/designCheck.js`.
- **Handrail section and post/handrail alloy-temper are fixed app defaults**, not form
  inputs (only post type/size were requested as inputs) - shown read-only in the UI.
  Alloy/temper is **6061-T6** (the standard structural aluminium alloy), confirmed
  against the live `2601-aluminium-design` calculator to return real results. An earlier
  version used 6063-T5 (a common architectural/window-framing alloy) - that pair has no
  data in the live calculator and crashed every call with a generic
  `"Cannot read properties of undefined (reading 'length')"` error rather than a clear
  validation message; see `server/sectionCatalogue.js`'s comment on `ALLOY`/`TEMPER` and
  `run-quick-design/SKILLS.md`'s "Troubleshooting" section (updated after this was found)
  before changing either value.
- **Some AS/NZS 1664 combined-action results are flagged `paid_only: true`** by the live
  calculator (e.g. "Combined Tension + Bending", "Combined Bending and Shear") - a value
  is still returned, but verify your account plan actually computes real values for these
  before trusting them as the governing utilization ratio, particularly on a free/trial
  account.
- Utilization is computed from each post's worst-case force *component* enveloped
  independently across the 9 load combinations (not necessarily all from one single
  combo) - a standard simplification for a quick per-member check, not a full
  combo-by-combo interaction check.
- Number of posts evenly divides the run length so actual spacing never exceeds the
  target spacing entered.
- The renderer is free for personal/individual use provided the SkyCiv logo stays
  visible; commercial/client-facing deployment requires a SkyCiv license agreement.
- The CAD drawing's title block is `cloudcad-api/assets/Title-Block-Example.json`,
  loaded directly from that skill at runtime (not duplicated here, and not rescaled).
  `settings.canvasLengthUnits` is `"m"` for display only - every coordinate stays in
  true real mm internally; only translation (never scaling) is used to fit the drawing
  into its safe zone - see `prototypes/truss-designer/README.md`'s "Notes / caveats" for
  the two mistakes already made (and fixed) there that this app avoids from the outset.

## Updates

- Wind lookup (`/api/wind`) failed with a genuine credentials-rejection error on first
  live run - root cause was a stale/incomplete key in `.env`, not a code bug; resolved
  by re-copying a fresh key from https://platform.skyciv.com/api.
- After fixing credentials, the wind lookup still failed with a generic
  `"could not be completed for an unknown reason"` error from `standalone.loads.getLoads`.
  Root cause, found by bisecting against the skill's own working sample payload:
  `windLoads.js` used `roof_profile: "flat"` (not a valid enum value - real options are
  `gable`/`monoslope`/`hip`/`pitched`/`troughed`/`open-monoslope`) and
  `structure_level[].floor_level: "balustrade"` (the working pattern uses numeric-string
  tags like `"2"` or `"roof"`). Fixed both; also added `site_image`/`topo_image: false`
  to match the documented sample's shape.
- Even after those fixes, the same generic error persisted. Root cause: `windLoads.js`
  (via `skycivClient.runSession`) opened the session with `S3D.session.start`, but
  `standalone.loads.getLoads` needs `standalone.loads.start` specifically - confirmed by
  testing both openers directly against the live API with an otherwise-identical payload.
  `S3D.session.start` is NOT a valid "combined session" opener for this namespace, despite
  `load-gen-api/SKILLS.md` and the root `CLAUDE.md` both previously claiming it was (fixed
  in both, plus `skycivClient.js`'s `runSession` now takes an explicit `sessionFunction`
  option so callers can specify the right one).
- With wind lookup fixed, the AS/NZS 1664 post check (`2601-aluminium-design`) then failed
  every post with `"Cannot read properties of undefined (reading 'length')"`. Root cause,
  found by bisecting against that calculator's own `sample_input.json`: the app's default
  alloy/temper (6063-T5) has no data row in the live calculator - swapped to 6061-T6
  (confirmed working, and arguably the more appropriate structural alloy anyway). Fixed in
  `server/sectionCatalogue.js`; see `run-quick-design/SKILLS.md`'s new "Troubleshooting"
  section for the general pattern (schema enums are often incomplete stubs; unsupported
  material/temper pairs crash rather than fail validation cleanly).
- All four issues above were found and fixed by testing directly against the live API
  (real credentials, real requests) rather than by reasoning from the skill docs alone -
  worth doing for any future load-gen-api or run-quick-design integration in this repo,
  since several of the underlying docs were themselves wrong or incomplete.
