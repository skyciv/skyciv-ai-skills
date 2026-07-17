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
   §2.3.1 LRFD combinations for a roof with no floor live load.
3. Solves it via `S3D.model.solve` and pulls a full analysis report via
   `S3D.results.getAnalysisReport`.
4. Checks **every** member (no pre-screening) against the
   **`4003-nds-wood-beam-calculator`** Quick Design calculator (NDS 2018), using the
   worst-case (enveloped) axial/bending/shear demand per member across all 5
   combinations, and reports the governing utilization ratio, a pass/fail table for
   every member (each with an "Open in Quick Design" link), and the two real support
   reactions.
5. Visualizes the model client-side with `SKYCIV.renderer`.
6. On request, drafts a truss elevation CAD drawing via `cloudcad.model.create` +
   `cloudcad.file.save` (generated directly from the same node/member geometry, since
   CloudCAD has no automatic S3D→CAD converter - see `server/cadDrawing.js`).
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
- Only NDS *strength* checks (bending, shear, tension, compression, combined) govern the
  reported utilization ratio - deflection serviceability ("Deflection Utilization..." in
  the calculator's own results) is deliberately excluded. Computing it correctly needs
  each member's actual deflection under load (a further `S3D.results.fetchMemberResult`
  call per member, not implemented here); the calculator's `ad_LL`/`ad_LT` inputs are
  fixed placeholders, so that entry is identical for every member and every section size
  and would otherwise silently dominate the governing ratio - see the comment on
  `extractGoverningUtilization` in `server/designCheck.js`.
- The live `4003-nds-wood-beam-calculator` API needs a two-step call this repo's own
  documented `sample_input.json` doesn't show: a single-row `adjust_factor_asd`/
  `adjust_factor_lrfd` table (as in that sample) fails on every input with a generic
  "error in calculating adjustment factors". The real flow is `adjust_factor_only: true`
  first to get the full 7-row factor table, then a second call with that table attached
  - see `server/quickDesignClient.js`.
