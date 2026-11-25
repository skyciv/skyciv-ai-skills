---
name: cloudcad-api
description: "Use when generating or saving a 2D engineering drawing through the SkyCiv CloudCAD API — building the cad_data JSON for cloudcad.model.create and saving it with cloudcad.file.save. Covers canvases, lines, polylines (circles/arcs), linear/angle/radius dimensions, leader and multi-leader text, text, tables, axes/gridlines, construction lines, revision clouds, hatches, images, layers, blocks (blockReferences/block_instances), attributeStyles sizing, pdfExport pages and the default A2 page + title block, units (canvasLengthUnits) and the y-negative-up coordinate system. Trigger even without the word SkyCiv or CAD, e.g. 'draft a plan/elevation/section of this', 'produce a drawing sheet with a title block', 'dimension this truss', 'turn this S3D model into a drawing', 'add a revision cloud', 'export a drawing from my app'. Not for 3D structural models or analysis (use s3d-api), not for 3D visualisation (use renderer), and not for reading a floor-plan image (use schema-agent)."
---

# CloudCAD API — 2D drawings

Build a CloudCAD drawing as a JSON object (`cad_data`), send it with `cloudcad.model.create`, then
store it with `cloudcad.file.save`. This skill covers the `cad_data` schema and the
`cloudcad.model` / `cloudcad.file` namespaces.

> **Prerequisite:** auth, `options` and the `{ auth, options, functions }` envelope are in
> [`skyciv-api-v3`](../skyciv-api-v3/SKILL.md). **No `S3D.session.start` is needed.**
> `cloudcad.model.create` opens its own CloudCAD session (verified: without it, create returns
> *"CloudCAD session successfully created."* and a following `save` works). Adding
> `S3D.session.start` first does no harm but adds about 6 s.

**Units:** every coordinate and every length setting is **real-world millimetres**, whatever
`settings.canvasLengthUnits` says. That setting (`"mm"`, `"cm"`, `"m"`, `"ft"`, `"in"`) only
changes how dimension **labels** are displayed. Verified: a 7315.2 mm line with
`canvasLengthUnits: "ft"` is labelled `24.0 ft`.

## Workflow

1. **Draw at true size, in mm, with y negative going up** (see Coordinates). Never scale geometry
   to fit a page.
2. **Pick a plot scale and size the `attributeStyles` for it.** Every length-valued style setting
   is *printed mm × scale*, e.g. `dimensionTextSize: 378` at 1:100 prints at 3.78 mm (see Sizing).
3. **Wrap the drawing in the default page + title block**, unless the user asked for bare
   geometry. Translate the content into the template's safe zone; do not scale it. See
   [`references/pages-and-title-blocks.md`](references/pages-and-title-blocks.md).
4. **Lint, then send** `cloudcad.model.create` + `cloudcad.file.save` in one request.
   `create` accepts **anything** and returns `status: 0`, even `{}` or `{"canvases": "nope"}`, so a
   `status: 0` proves nothing. Run the linter (Bundled tools) and look at a render (Verifying).
5. Give the user the `data` URL returned by `save`.

In Node, `scripts/cad_helpers.js` does steps 2–4: `emptyCanvas`, `text`, `hatch`,
`rectCloud`/`revisionCloud`, `attributeStyle(plotScale)`,
`wrapInTitleBlock({ canvas, plotScale })` and `lint(cad_data)`. Opt-in structural data uses
`s3dMember`, `s3dSupport`, `s3dColumn`, `s3dPlate` and `s3dRoot`.

## `cad_data` structure

```json
{
  "settings": { "canvasLengthUnits": "mm" },
  "attributeStyles": [ { "id": "as-default", "name": "Default", "settings": { } } ],
  "blockReferences": [ ],
  "pdfExport": { "pdfPages": [ ] },
  "s3d": { },
  "canvases": [ { "name": "Plan", "lines": [ ], "dimensions": [ ], "texts": [ ] } ]
}
```

| Key | Required | What it is |
|---|---|---|
| `canvases` | **yes** | Array of drawing sheets. Each canvas holds the element arrays: `points`, `lines`, `polylines`, `dimensions`, `angleDimensions`, `radiusDimensions`, `leaderTexts`, `multiLeaderTexts`, `texts`, `tables`, `axes`, `constructionLines`, `revisionClouds`, `hatches`, `images`, `block_instances`, `layers`. |
| `attributeStyles` | effectively yes | Named sizing styles for annotations; elements point to one with `attributeStyleId`. |
| `settings` | no | Display/snap/colour settings, plus `canvasLengthUnits`. Every field is optional. |
| `blockReferences` | no | Block **definitions**: top-level and camelCase. Canvases only place them, via `block_instances`. |
| `pdfExport` | no | Printed page frames. |
| `s3d` | no | **Opt-in.** Settings for turning the drawing into an S3D model. The structural data itself goes on each element (`lines[].s3d`, `points[].s3d`, `hatches[].s3d`). See [`references/s3d-mapping.md`](references/s3d-mapping.md). |

Verified minimum: `{"canvases":[{"lines":[...]}]}` renders. Missing element arrays,
`version`/`schema`/`drawing_type`/`is_base` are all optional. Real platform exports omit
`drawing_type` and `is_base`. Including every array as `[]` is still the safe default
(`emptyCanvas()` does this), because the editor expects them.

**Field-by-field schema for every element type** (`settings` keys, style keys, lines, polylines,
the three dimension types, leaders, text, tables, axes, construction lines, revision clouds,
hatches, images, layers, blocks): read
[`references/elements.md`](references/elements.md) before writing an element type you haven't
written in this session.

## Minimal working example

Verified live: this renders a 6 m × 4 m rectangle with a dimension and a label, then saves it.

```json
{
  "auth": { "username": "user@example.com", "key": "YOUR_KEY" },
  "functions": [
    { "function": "cloudcad.model.create", "arguments": { "cad_data": {
      "settings": { "canvasLengthUnits": "mm" },
      "attributeStyles": [ { "id": "as-default", "name": "Default", "settings": {
        "dimensionTextSize": 378, "linearArrowShape": "arrow", "linearArrowLength": 216, "linearArrowWidth": 216,
        "leaderTextSize": 378, "leaderArrowLength": 216, "leaderArrowWidth": 216,
        "axisTextSize": 324, "axisCircleDiameter": 1080, "axisDashLength": 216, "axisDashGap": 108,
        "textSizeInput": 14, "textSizeOverride": false, "fontFamily": "monospace", "tableFontSize": 400 } } ],
      "canvases": [ {
        "name": "Ground Floor",
        "lines": [
          { "p1": { "x": 0, "y": 0 },        "p2": { "x": 6000, "y": 0 } },
          { "p1": { "x": 6000, "y": 0 },     "p2": { "x": 6000, "y": -4000 } },
          { "p1": { "x": 6000, "y": -4000 }, "p2": { "x": 0, "y": -4000 } },
          { "p1": { "x": 0, "y": -4000 },    "p2": { "x": 0, "y": 0 } }
        ],
        "dimensions": [ { "p1": { "x": 0, "y": 0 }, "p2": { "x": 6000, "y": 0 },
          "offsetPoint": { "x": 3000, "y": 800 }, "projectionType": "horizontal", "attributeStyleId": "as-default" } ],
        "texts": [ { "position": { "x": 3000, "y": -2000 }, "text": "GROUND FLOOR", "size": 5, "sizeOverride": true,
          "color": "#ffffff", "alignment": "center", "textPosition": "middle-center", "attributeStyleId": "as-default" } ]
      } ]
    } } },
    { "function": "cloudcad.file.save", "arguments": { "name": "ground-floor", "path": "projects/cad/" } }
  ]
}
```

## Functions

| Function | Arguments | Returns (verified) |
|---|---|---|
| `cloudcad.model.create` | `cad_data` (object) | `{status: 0, msg: "CloudCAD session successfully created.", data: ""}`, plus a new `session_id`. The docs' msg text is out of date. |
| `cloudcad.file.save` | `name`, `path` (strings); `public_share`, `return_uid_url` (booleans) | `data` is always `https://platform.skyciv.com/cad?u=<uid>`. **No `public_link` is returned, whatever `public_share` / `return_uid_url` are set to.** |
| `cloudcad.file.open` | `name` + `path`, or `uid` | `{status: 0, msg: "", data: ""}`, **even for a file that doesn't exist**, and nothing appears in the session. Don't build on it (see Gotchas). |
| `cloudcad.export.pdf` | none (exports the model just created, using its `pdfExport.pdfPages`) | `data.download_link`: a temporary `https://solver.skyciv.com/temp/<id>.pdf`. Verified 2026-11-25 (MT Solar uses `create` + `export.pdf` in one request). |

There is no `cloudcad.model.get`/`set` function: the API can't read a drawing's JSON back. Calling
one returns `"The function '...' could not be found"`. DXF export is not available.

## Coordinates

- 2D only. **`y` is negative going up the screen/sheet.** To draw something upward, subtract from y.
  Mapping an S3D model (y up) needs `y_cad = -y_model`.
- No origin boundary; negative coordinates are fine.
- Rotation units differ by element, and every one of these was verified by render:

| Field | Unit | Positive direction on screen |
|---|---|---|
| `texts[].rotation`, `images[].rotation` | degrees | clockwise |
| `block_instances[].rotation` | **radians** (`90` renders at 90 rad ≈ 116.6°) | clockwise |
| `constructionLines[].angle` | degrees | counter-clockwise (30 rises to the right) |

## Sizing: one rule

Pick the plot scale `S` (100 for 1:100). Every **length-valued** style setting is
`printed mm × S`:

| Style setting | Printed size | At 1:100 | At 1:50 |
|---|---|---|---|
| `dimensionTextSize`, `angle/radiusDimensionTextSize`, `leaderTextSize` | 3.78 mm | 378 | 189 |
| `linearArrowLength` / `Width` (and angle/radius/leader) | 2.16 mm | 216 | 108 |
| `axisCircleDiameter` / `axisTextSize` | 10.8 / 3.24 mm | 1080 / 324 | 540 / 162 |
| `axisDashLength` / `axisDashGap` | 2.16 / 1.08 mm | 216 / 108 | 108 / 54 |
| `tableFontSize` | 4 mm | 400 | 200 |

`attributeStyle(S)` in the helper builds this. Don't scale `textSizeInput`, which is not a length.
When a generator switches plot scale, it rescales the **style** (and any page furniture) by the
same factor and leaves the geometry at true size.

**Plain `texts` changed in the Nov 2026 CloudCAD release** (verified 2026-11-25 against the
editor code and real `cloudcad.export.pdf` output):

- **Always set `sizeOverride: true`.** Without it, a text with an `attributeStyleId` ignores its
  own `size` and takes the style's `textSizeInput` (default 14), so every label comes out the same.
- `size` is now in **paper units**: the editor draws it at `size × plot scale` mm (`size: 3.5` at
  1:100 → 350 mm on the canvas → 3.5 mm printed). Don't scale it by the plot scale yourself.
- **The PDF export doesn't match the editor**, which looks like a CloudCAD bug, reported:
  - Texts inside the drawing area print at a **fixed ~7 mm (19.84 pt) whatever `size` is**
    (0.5 → 12 all identical, at 1:50, 1:100 and 1:200).
  - Texts placed in the **title-block strip** honour `size` but **without** the plot-scale
    multiplier, so `size` there is canvas mm (`2.28` at 1:50 printed at 0.13 pt, invisible).
    Multiply title-block text sizes by the plot scale.
  - Plain texts always print in **Helvetica**. `fontFamily`, `font`, `attrOverrides.fontFamily`
    and the style's `fontFamily` are ignored. Dimension and leader labels still print in Courier.
- `sizeUnits: "model"` makes `size` plain canvas mm (24 → 24 mm), which is tiny on a sheet.
- `alignment: "center"` / `"right"` anchor correctly in both the editor and the PDF. Use them
  rather than shifting `position` by an estimated text width: the PDF font is proportional, so
  width estimates for monospace now land off-centre.

Older payloads that sent `size: 14` with no `sizeOverride` (the previous advice here) now render
every text at the style's size.

## Verifying a drawing (you can't open the viewer)

Best: append `{"function": "cloudcad.export.pdf"}` after `create` and read the PDF at
`data.download_link`. That is what the end user gets, and it differs from the editor for text (see
Sizing). Extract text positions and sizes from it (e.g. PyMuPDF `page.get_text("dict")`) to check
labels are present, inside the border and centred, rather than trusting a glance.

Also undocumented, but useful when you only need the editor view: when any call in a request **fails**, the response's top-level
`response.screenshot` holds an 800×600 base64 PNG of the headless CloudCAD editor, showing the
model built so far. To see your drawing, append a deliberately unknown call after `create`, such as
`{"function": "cloudcad.model.get", "arguments": {}}`, then decode `response.screenshot`. It costs
one credit and the view is not always zoomed to your content. This is a **debugging aid** for
checking a new generator's output, not something to leave in production code.

## Gotchas

All of these were verified against the live API on 2026-09-22.

- **`create` never validates.** Empty, garbage or broken `cad_data` returns `status: 0`, and
  `validate_input` has no effect on it. Lint the payload and check a render.
- **Never scale geometry to fit a page.** Dimensions measure the real distance between their
  points, so scaling corrupts every label: a 24 ft span once read `40000mm`. Translate only. If
  the drawing doesn't fit, change the plot scale or sheet.
- **Never pre-convert coordinates for `canvasLengthUnits`.** Dividing coordinates by 304.8 *and*
  setting `"ft"` converts twice (24 ft became `0.08 ft`).
- **Hatch segments need `start`/`end`.** Segments with only `p1`/`p2` make `create` hang until
  it times out (about 43 s, reproduced twice). Real exports carry both field pairs.
- **Revision clouds need a precomputed `arcs` array.** With `arcs: []`, or no `arcs`, the cloud is
  accepted but draws **nothing**. The platform doesn't generate the scallops. Build them with
  `rectCloud()` / `revisionCloud()`.
- **Linear dimensions:** omit `projectionType` to get an **aligned, true-length** dimension (a
  3-4-5 diagonal reads `5000.0 mm`). `"horizontal"` / `"vertical"` give that projection (the same
  diagonal reads 3000 / 4000). Any other value, including `"aligned"`, is treated as a projection
  rather than aligned.
- **Text needs a light `color`.** The canvas is dark, and a text with no `color` renders near-black
  and invisible. Use `#ffffff` / `#e2e8f0` / `#94a3b8`. PDF output colours are unverified.
- **`textPosition` on every text.** Rendering works without it, but the editor is reported to
  crash when the user selects such a text. `alignment` anchors the text at `position` as you'd
  expect (`center` centres it on x, `right` ends it at x), so don't also pre-shift `position`.
  Re-verified in PDF exports on 2026-11-25.
- **Text needs `sizeOverride: true`**, or its `size` is replaced by the style's `textSizeInput`.
  In the PDF, drawing-area text prints at a fixed ~7 mm, and title-block text needs `size × plot
  scale`. See Sizing.
- **`window.alert` from the host app freezes browser automation.** When driving an app that calls
  CloudCAD (e.g. clicking its Export button), invalid inputs can raise an `alert()`, which blocks
  the page. Stub `window.alert` first if you're testing many input combinations.
- **Missing or unknown `attributeStyleId` fails silently.** The element falls back to the built-in
  style (grey labels, default sizes).
- **Images don't render inside a block definition.** Tables, axes, text, linear and radius
  dimensions do. Put
  logos on the canvas `images` array. An image's `x`/`y` is its top-left corner and it extends
  toward **+y** (down the screen).
- **`cloudcad.file.open` gives no signal.** It returns `status: 0` for files that don't exist and
  loads nothing observable, so "open → edit → save" doesn't work. To change a drawing, regenerate
  the full `cad_data`, then `create` + `save` it with the same `name`/`path`.
- **Structural (`s3d`) data is opt-in, and it lives on the elements.** Leave it out unless the user
  explicitly asks for the drawing to carry S3D data. When they do, the root `s3d` block alone does
  nothing: a line only becomes a member if it carries `s3d: { member: {...} }`. The same goes
  for supports on `points` and plates on `hatches`. `wrapInTitleBlock` drops the root block unless
  you pass `s3d`. Per-element `s3d` survives `create` + `save` (verified 2026-09-25). Shapes and
  helpers are in [`references/s3d-mapping.md`](references/s3d-mapping.md).
- **Don't paste the asset JSON into a prompt.** `assets/title-block-a2.json` is about 50 KB and the
  two example exports are about 125 KB each. Load them in code (`fs.readFileSync`) and copy the
  pieces.

## Bundled tools and assets

| File | Load / run when |
|---|---|
| [`references/elements.md`](references/elements.md) | Writing any element type: field tables, verified behaviour, `settings` and style keys. |
| [`references/pages-and-title-blocks.md`](references/pages-and-title-blocks.md) | Adding a page frame or title block, placing blocks, or computing where content goes on the sheet. |
| [`references/s3d-mapping.md`](references/s3d-mapping.md) | Drawing from an S3D model, launching CAD from inside the SkyCiv platform, or, **only when asked**, attaching structural `s3d` data (members, supports, plates). |
| `scripts/cad_helpers.js` | Building `cad_data` in Node. Also `node scripts/cad_helpers.js lint <file.json>` to lint any payload (a bare `cad_data` or a full request) before sending it. |
| `assets/title-block-a2.json` | The default A2 1:100 page + title block, with measured `zones`. Load it in code. |
| `assets/all-elements.json` | A real platform export containing one of almost every element. Grep it for a field's real shape; don't read it whole. |
| `assets/Title-Block-Example.json` | The original export `title-block-a2.json` was derived from. Kept because the prototypes load it by path. |
| `assets/images/dimension-linear.svg`, `assets/images/dimension-angle.svg`, `assets/images/axis-dashdot.svg`, `assets/images/revision-clouds.svg`, `assets/images/block-transform.svg` | Anatomy diagrams embedded in the reference files. |

## Related skills

- [`skyciv-api-v3`](../skyciv-api-v3/SKILL.md): auth, envelope, `options`.
- [`s3d-api`](../s3d-api/SKILL.md): the `s3d_model` whose nodes/members you'd draw.
- [`s3d-apps`](../s3d-apps/SKILL.md): in-app code, where `SKYCIV_UTILS.exportToCad(cad_data)` opens a drawing directly.
- [`schema-agent`](../schema-agent/SKILL.md): reading a floor plan before drawing it.
- [`renderer`](../renderer/SKILL.md): 3D visualisation (not 2D drawings).
