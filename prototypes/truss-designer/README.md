# Truss Designer

A local test app that models, analyzes, NDS design-checks, visualizes and drafts a
Warren / Fink / Howe / Pratt timber roof truss, built entirely on the SkyCiv API skills
in this repo (`skyciv-api-v3`, `s3d-api`, `run-quick-design`, `cloudcad-api`, `renderer`).

## What it does

Given a span, height, truss type, a single timber section size (2x4 / 2x6 / 2x8 / 4x4),
and dead / sheeting / snow / wind (uplift) loads:

1. Generates a symmetric pitched `s3d_model` (bottom chord, sloped top chord to a
   mid-span apex, and a Warren/Fink/Howe/Pratt web pattern) in Douglas Fir-Larch No.2
   throughout, sourced from the `American > NDS > Sawn Lumber` section library.
2. Factors dead, sheeting, snow and wind (uplift) loads into 5 hand-derived ASCE 7-22
   §2.3.1 LRFD strength combinations for a roof with no floor live load, plus 2
   unfactored service-level combos (total load, live/snow-only) used only for deflection.
3. Solves it via `S3D.model.solve`.
4. Checks **every** member (no pre-screening) against the
   **`4003-nds-wood-beam-calculator`** Quick Design calculator (NDS 2018), using the
   worst-case (enveloped) axial/bending/shear demand per member across the 5 strength
   combinations. Top-chord members additionally get a real deflection check, using each
   member's actual computed deflection (via `S3D.results.fetchMemberResult`) under the 2
   service combos. Reports the governing utilization ratio, a pass/fail table for every
   member (each with an "Open in Quick Design" link), and the two real support reactions.
5. Visualizes the model client-side with `SKYCIV.renderer`.
6. On request, drafts a truss elevation CAD drawing via `cloudcad.model.create` +
   `cloudcad.file.save` (generated directly from the same node/member geometry, since
   CloudCAD has no automatic S3D→CAD converter - see `server/cadDrawing.js`). The
   drawing is placed on an A2-landscape page with a title block by default, per
   `cloudcad-api/SKILLS.md`'s "Pages & Title Blocks" template - the truss is uniformly
   scaled and centered into a conservative "keep clear" zone alongside the title block.
7. "Optimize Section" re-checks every section size in the dropdown (in parallel) against
   the current span/type/height/loads and recommends the smallest (by area) that passes
   every member, then re-runs the full analysis with that section selected -
   `POST /api/optimize` in `server/index.js`.

See the "Modeling assumptions" panel in the app (or `server/trussModel.js`) for the
exact panel/web layout, fixity, out-of-plane bracing, and load-derivation rules used to
turn span/height/type/loads into a full 3D model.

## Setup

```bash
cd prototypes/truss-designer
npm install
cp .env.example .env
# edit .env: SKYCIV_USERNAME, SKYCIV_API_KEY, SKYCIV_QD_TOKEN
npm start
```

Then open http://localhost:4100.

- `SKYCIV_API_KEY` — from https://platform.skyciv.com/api, used for the `skyciv-api-v3`
  envelope (S3D solve + CloudCAD).
- `SKYCIV_QD_TOKEN` — API token from the same page, used for Quick Design. If you only
  have one key, it's reused for both.

## Notes / caveats

- The renderer is free for personal/individual use provided the SkyCiv logo stays
  visible; commercial/client-facing deployment requires a SkyCiv license agreement.
- Species/grade (Douglas Fir-Larch No.2) and truss spacing (24 in o.c.) are fixed app
  defaults, not form inputs - see the "Modeling assumptions" panel to change your
  mental model of what's being checked, or edit `server/quickDesignClient.js` /
  `server/trussModel.js` directly to change them.
- The Warren/Fink/Howe/Pratt web patterns are practical parametric approximations of
  each type's characteristic bracing layout for a small pitched roof truss, not a
  textbook truss-catalogue lookup - see the comments in `server/trussModel.js`.
- Utilization is computed from each member's worst-case force *component* enveloped
  independently across the 5 load combinations (not necessarily all from one single
  combo) - a standard simplification for a quick per-member check, not a full
  combo-by-combo interaction check.
- Deflection serviceability ("Deflection Utilization..." in the calculator's results) is
  only checked for **top-chord** members - the only ones carrying transverse load in
  this model - using each one's real computed deflection under the 2 unfactored service
  combos (`S3D.results.fetchMemberResult`, one extra API call per member per combo, ~1s
  each). Bottom-chord and web members still get fixed `ad_LL`/`ad_LT` placeholders and
  have their Deflection Utilization excluded from the governing ratio, since a placeholder
  identical across every member/section would otherwise silently dominate it - see
  `extractGoverningUtilization` and `buildDeflectionMap` in `server/designCheck.js`.
  `/api/optimize`'s fast section-size scan deliberately skips this (strength only, for
  speed) - the full analysis that follows it is the authoritative check.
- The live `4003-nds-wood-beam-calculator` API needs a two-step call this repo's own
  documented `sample_input.json` doesn't show: a single-row `adjust_factor_asd`/
  `adjust_factor_lrfd` table (as in that sample) fails on every input with a generic
  "error in calculating adjustment factors". The real flow is `adjust_factor_only: true`
  first to get the full 7-row factor table, then a second call with that table attached
  - see `server/quickDesignClient.js`.
- The CAD drawing's title block is `cloudcad-api/assets/Title-Block-Example.json`,
  loaded directly from that skill at runtime (not duplicated here) - a real,
  platform-exported A2-landscape page + title block. The truss is fit into a
  conservative "keep clear" zone next to it (`SAFE_ZONE` in `server/cadDrawing.js`) -
  this zone is an estimate derived from analyzing the title block's coordinates, not a
  visually-verified boundary (no tool available here can render/screenshot the CAD
  viewer) - see `cloudcad-api/SKILLS.md`'s "Known limitations" for the same caveat.
  Visually check a generated drawing to confirm nothing overlaps the title block.

## Updates

- CAD drawing was initially upside down - updated the prototype and skills
- Renderer was not full screen initially
- API was running slow, removed the getAnalysisReport function as it's not widely used and updated the skill to prevent this in future prototypes
- Requested it return the analysis model link, updated in the skill too
- Deflection was missing from the critical utility ratio - now computed for real (top chord only) instead of excluded
- CAD drawing now defaults to a full A2-landscape page with a title block (per the updated cloudcad-api skill), instead of bare geometry