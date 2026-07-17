# Draftsperson Agent Skill (CAD API)

You are an agent that creates and manages SkyCiv CloudCAD drawings via the SkyCiv API. This skill covers the full CAD JSON schema and the `cloudcad.model` and `cloudcad.file` API namespaces.

> **Prerequisite:** Always begin a session with `S3D.session.start` as the first function. See the `skyciv-core` skill for auth, options, and the request/response envelope.

---

## CAD Data Format Overview

A CAD model is a JSON object with this top-level structure:

```json
{
  "settings": { ... },        // global display/snap/unit settings
  "s3d": { ... },             // optional: structural 3D export mapping
  "attributeStyles": [ ... ], // dimension/text/leader/axis sizing styles
  "blockReferences": [ ... ], // block DEFINITIONS (reusable groups, e.g. title blocks) - see "Blocks" below
  "pdfExport": { ... },       // optional: printed page setup (paper size, page frame) - see "Pages" below
  "canvases": [ ... ]         // array of drawing sheets
}
```

This object is passed to `cloudcad.model.create` as `cad_data`.

> **`blockReferences` is camelCase and top-level**, not `block_references` nested inside a
> canvas — a real, verified correction to this schema (confirmed against the live API and
> a genuine platform-exported file, see "Blocks" below). If you've seen `block_references`
> referenced elsewhere as a per-canvas snake_case field, that's stale.

---

## `settings`

Controls display, units, snapping, and colors. All fields optional — defaults applied for any omitted values.

| Key | Type | Description |
|---|---|---|
| `canvasLengthUnits` | `string` | `"mm"`, `"cm"`, `"m"`, `"ft"`, `"in"` |
| `gridSize` | `string` | Grid spacing value |
| `snapToGrid` | `bool` | Snap to grid |
| `snapToPoint` | `bool` | Snap to existing points |
| `snapToLineEnds` | `bool` | Snap to line endpoints |
| `snapToLineMid` | `bool` | Snap to line midpoints |
| `snapToAlign` | `bool` | Alignment guide snapping |
| `snapToAxis` | `bool` | Axis snapping |
| `showGrid` | `bool` | Show background grid |
| `showAxis` | `bool` | Show axis lines |
| `showVertices` | `bool` | Show vertex markers |
| `showCreatedDimensions` | `bool` | Show user-created dimensions |
| `showSelectionDimensions` | `bool` | Show dimensions on selection |
| `canvasBackgroundColor` | `string` | Hex background color |
| `lineColor` | `string` | Default line color |
| `pointColor` | `string` | Default point color |
| `dimensionsColor` | `string` | Dimension label color |
| `selectionColor` | `string` | Selected item color |
| `highlightColor` | `string` | Hover/highlight color |
| `dimensionTextSize` | `string` | Font size for dimension labels |
| `globalDimsScale` | `string` | Global dimension display scale |
| `globalTextScale` | `string` | Global text display scale |
| `arcSegments` | `string` | Segment count for arc rendering |
| `circleSegments` | `string` | Segment count for circle rendering |

---

## `attributeStyles`

**Always include this field.** Defines named styles for all annotation sizing: dimensions, text, leader texts, and axes. Elements reference a style by `attributeStyleId`. Without a style, annotations render at tiny default sizes that may not suit your drawing scale.

Define at least one style (conventionally `"id": "as-default"`) and reference it on every annotation element.

```json
"attributeStyles": [
  {
    "id": "as-default",
    "name": "Default Style",
    "settings": {
      "linearArrowShape": "arrow",
      "linearArrowLength": 216,
      "linearArrowWidth": 216,
      "linearExtLineStartOffset": 0,
      "linearExtLineEndOffset": 0,
      "linearTextOffset": 0,
      "linearTextHorizontalOffset": 0,
      "linearTextHorizontalPosition": "center",
      "dimensionTextSize": 378,
      "angleArrowShape": "arrow",
      "angleArrowLength": 216,
      "angleArrowWidth": 216,
      "angleDimensionTextSize": 378,
      "angleTextOffset": 600,
      "angleTextOrientation": "horizontal",
      "radiusArrowShape": "arrow",
      "radiusArrowLength": 216,
      "radiusArrowWidth": 216,
      "radiusDimensionTextSize": 378,
      "radiusTextOffset": 0,
      "leaderArrowShape": "arrow",
      "leaderArrowLength": 216,
      "leaderArrowWidth": 216,
      "leaderTextSize": 378,
      "leaderTextOffsetHorizontal": 0,
      "leaderTextOffsetVertical": 0,
      "axisExtension": 5000,
      "axisCircleDiameter": 1080,
      "axisTextSize": 324,
      "axisDashLength": 216,
      "axisDashGap": 108,
      "textSizeInput": 14,
      "textSizeOverride": false,
      "fontFamily": "monospace",
      "tableFontSize": 400
    }
  }
]
```

All length values are in **mm** and should scale with your drawing. The values above are suitable for a building-scale drawing (rooms in the thousands of mm). For small drawings (e.g. cross-sections at ~100 mm), divide all length values by ~10.

`linearArrowShape` / `angleArrowShape` / `radiusArrowShape` / `leaderArrowShape`: `"arrow"`, `"dot"`, `"architectural"`, `"none"`.

Elements that accept `"attributeStyleId"`: `dimensions`, `angleDimensions`, `radiusDimensions`, `leaderTexts`, `multiLeaderTexts`, `texts`, `axes`, `tables`.

---

## `s3d` (Structural 3D Mapping)

Optional. Use when the CAD drawing maps to a structural model.

```json
{
  "s3d": {
    "settings": {
      "units": "mm",
      "tolerance": 0.0001,
      "connect_floors_by_columns": false,
      "connect_floors_section_id": null,
      "remove_duplicate_members": true,
      "supports_only_base": true,
      "ignore_unassigned_sections": false
    },
    "sections": {},
    "elevations": [
      { "canvas_id": 0, "elevation": 0 }
    ]
  }
}
```

---

## `canvases`

An array of canvas (drawing sheet) objects. Each canvas is a self-contained drawing.

```json
{
  "version": "2.0.0",
  "schema": "canvas-json-v2-optimized",
  "name": "Canvas 1",
  "drawing_type": "Plan",
  "is_base": true,
  "points": [],
  "lines": [],
  "polylines": [],
  "dimensions": [],
  "angleDimensions": [],
  "radiusDimensions": [],
  "leaderTexts": [],
  "multiLeaderTexts": [],
  "texts": [],
  "tables": [],
  "axes": [],
  "constructionLines": [],
  "revisionClouds": [],
  "hatches": [],
  "images": [],
  "block_instances": [],
  "layers": [],
  "s3d": {}
}
```

Note: `attributeStyles` and `blockReferences` are **top-level** fields on the root object
(alongside `settings` and `canvases`), not inside each canvas — a canvas only places
blocks via `block_instances`, it doesn't define them. (A stray empty `"block_references":
[]` on a canvas is harmless if present, but does nothing — it's not where block
definitions actually live.)

`drawing_type`: `"Plan"`, `"Elevation"`, etc.  
All array fields must be present (use `[]` if empty).

---

## Canvas Element Types

### Points

```json
{ "x": 100, "y": 200, "id": "uuid" }
```

`id` is optional — auto-generated if omitted.

---

### Lines

A straight segment between two points.

```json
{
  "p1": { "x": 0, "y": 0 },
  "p2": { "x": 1000, "y": 0 },
  "id": "uuid",
  "groupId": "uuid"
}
```

> To form a closed polygon, give multiple lines the same `groupId` and ensure their endpoints connect.

---

### Polylines

#### Circle

```json
{
  "type": "circle",
  "center": { "x": 0, "y": 0 },
  "radius": 500,
  "radiusPoint": { "x": 500, "y": 0 },
  "segments": 100,
  "id": "uuid"
}
```

#### Arc

Defined by start, end, and a control point on the arc.

```json
{
  "type": "arc",
  "points": [
    { "x": 0,   "y": 0 },
    { "x": 100, "y": 100 },
    { "x": 50,  "y": 80 }
  ],
  "segments": 100,
  "id": "uuid"
}
```

---

### Dimensions (Linear)

```json
{
  "p1": { "x": 0, "y": 0 },
  "p2": { "x": 1000, "y": 0 },
  "offsetPoint": { "x": 500, "y": 200 },
  "id": "uuid",
  "projectionType": "horizontal",
  "attributeStyleId": "as-default"
}
```

`projectionType`: `"vertical"`, `"horizontal"`, or omit for auto.  
Always include `attributeStyleId` so arrow and text sizes are correct.

---

### Leader Texts

An arrow pointing from a location to a text label.

```json
{
  "startPoint": { "x": 0,   "y": 0 },
  "endPoint":   { "x": 200, "y": 100 },
  "text": "Column C1",
  "id": "uuid",
  "attributeStyleId": "as-default"
}
```

---

### Multi-Leader Texts

Text annotation with multiple arrow leaders.

```json
{
  "anchorPoint": { "x": 0, "y": 0 },
  "arrowPoints": [
    { "x": -100, "y": -50 },
    { "x":  100, "y":  50 }
  ],
  "text": "Structural Note",
  "id": "uuid",
  "attributeStyleId": "as-default"
}
```

---

### Texts

```json
{
  "position": { "x": 100, "y": 200 },
  "text": "My Label",
  "size": 14,
  "color": "#ffffff",
  "backgroundColor": "#000000",
  "backgroundColorOpacity": 0,
  "alignment": "center",
  "textPosition": "middle-center",
  "bold": false,
  "italic": false,
  "id": "uuid",
  "attributeStyleId": "as-default"
}
```

`alignment`: `"left"`, `"center"`, `"right"`.  
`textPosition` (**required** — omitting it will crash selection): `"top-left"`, `"top-center"`, `"top-right"`, `"middle-left"`, `"middle-center"`, `"middle-right"`, `"bottom-left"`, `"bottom-center"`, `"bottom-right"`. Default to `"middle-center"`.  
`backgroundColorOpacity`: `0` = transparent, `1` = opaque.  
`size` is in pixels — use `14` for body text, `20–28` for headings. The `attributeStyleId` can override this if `textSizeOverride` is enabled on the style.

> **CRITICAL — text color:** The canvas background is dark. **Always set `color` to a light value** (`"#ffffff"` for headings, `"#e2e8f0"` for body, `"#94a3b8"` for secondary labels). **Never use `"#333333"`, `"#222222"`, `"#000000"`, or any other dark/black color** — dark text is invisible on the dark canvas and cannot be read by the user.

---

### Tables

```json
{
  "id": "uuid",
  "attributeStyleId": "as-default",
  "position": { "x": 0, "y": 0 },
  "rows": [
    ["Header 1", "Header 2", "Header 3"],
    ["Cell 1",   "Cell 2",   "Cell 3"]
  ],
  "opts": {
    "first_row_header": true,
    "alignment": "center",
    "text_color": "#ffffff",
    "bg_color": "#000000",
    "header_background_color": "#4a5568",
    "font_size": 15,
    "width": 2000,
    "height": 800,
    "row_height": 200
  }
}
```

---

### Axes (Gridlines)

A labeled reference axis/gridline between two points.

```json
{
  "p1": { "x": 0, "y": -5000 },
  "p2": { "x": 0, "y":  5000 },
  "label": "A",
  "id": "uuid",
  "attributeStyleId": "as-default"
}
```

---

### Construction Lines

Infinite reference lines defined by a point and angle.

```json
{
  "point": { "x": 0, "y": 0 },
  "angle": 90,
  "id": "uuid",
  "isHidden": false
}
```

`angle` is in degrees.

---

### Revision Clouds

#### Rectangular

```json
{
  "id": "uuid",
  "minX": 0, "minY": 0,
  "maxX": 1000, "maxY": 500,
  "arcRadius": 500,
  "segments": 10,
  "arcs": []
}
```

#### Circular

```json
{
  "id": "uuid",
  "minX": 0, "minY": 0,
  "maxX": 1000, "maxY": 1000,
  "arcRadius": 500,
  "segments": 10,
  "center": { "x": 500, "y": 500 },
  "radius": 500,
  "arcs": []
}
```

> Provide the bounding box and `arcRadius`; the renderer computes the `arcs` array automatically. Pass `arcs: []` when creating programmatically.

---

### Hatches

A filled region defined by one or more closed loops. Each loop is an array of segments.

```json
{
  "id": "uuid",
  "type": "hatch",
  "color": "#5a5995",
  "opacity": 0.5,
  "loops": [
    {
      "segments": [
        { "type": "line", "start": { "x": 0,   "y": 0   }, "end": { "x": 100, "y": 0   } },
        { "type": "line", "start": { "x": 100, "y": 0   }, "end": { "x": 100, "y": 100 } },
        { "type": "line", "start": { "x": 100, "y": 100 }, "end": { "x": 0,   "y": 0   } }
      ]
    }
  ]
}
```

Segment types: `"line"` or `"arc"`. Loops must be closed (last segment endpoint = first segment start point).

---

## Blocks

Reusable drawing element groups — used for anything you place more than once (a repeated
detail, a north-point symbol, or a **title block**, see "Pages & Title Blocks" below).

### Block References (Definitions)

**Top-level, camelCase, sibling of `canvases`** — `cad_data.blockReferences`, an array.
This is a real correction to this schema: block *definitions* do not live inside a
canvas. Canvases only *place* an already-defined block via `block_instances` (below).
Verified against the live API and a genuine platform-exported project file.

```json
{
  "id": "block-def-uuid",
  "name": "Detail A",
  "basePoint": { "x": 0, "y": 0 },
  "items": [
    { "type": "line",            "data": { "p1": { "x": 0, "y": 0 }, "p2": { "x": 100, "y": 100 } } },
    { "type": "arc",             "data": { "type": "arc", "points": [ ... ], "segments": 100 } },
    { "type": "dimension",       "data": { "p1": { ... }, "p2": { ... }, "offsetPoint": { ... } } },
    { "type": "multiLeaderText", "data": { "anchorPoint": { ... }, "arrowPoints": [ ... ], "text": "Note" } },
    { "type": "hatch",           "data": { "color": "#5a5995", "opacity": 0.5, "loops": [ ... ] } },
    { "type": "point",           "data": { "x": 10, "y": 20 } },
    { "type": "text",            "data": { "position": { "x": 0, "y": 0 }, "text": "Label", "size": 14, "color": "#ffffff", "textPosition": "middle-center", "backgroundColorOpacity": 0 } },
    { "type": "leaderText",      "data": { "startPoint": { ... }, "endPoint": { ... }, "text": "Note" } }
  ]
}
```

Supported item types inside blocks: `point`, `line`, `arc`, `dimension`, `multiLeaderText`,
`hatch`, `text`, `leaderText` (the last two confirmed from a real title-block asset, not
previously documented here).

`basePoint` is the anchor: it's the point *in the block's own local geometry* that gets
mapped onto `position` when the block is instanced (see the transform below) — it is
**not** necessarily the block's bounding-box corner. In practice, set it to whatever
point in your block's geometry makes the most sense as an insertion handle (e.g. its
centroid, or a specific corner).

### Block Instances

Place a block on a canvas.

```json
{
  "id": "instance-uuid",
  "blockId": "block-def-uuid",
  "position": { "x": 0, "y": 0 },
  "rotation": 0,
  "scale": { "x": 1, "y": 1 }
}
```

**Placement transform** (rotation = 0): every point `local` in the block definition's
`items` maps to world/canvas space as:

```
world.x = instance.position.x + instance.scale.x * (local.x - blockRef.basePoint.x)
world.y = instance.position.y + instance.scale.y * (local.y - blockRef.basePoint.y)
```

(With `rotation != 0`, apply a standard 2D rotation about `basePoint` before scaling and
translating — not covered by the simple formula above.)

---

## Layers

Assign elements to layers for color, visibility, and line-type control.

```json
{
  "id": "layer-uuid",
  "name": "Structural",
  "color": "#9ef5af",
  "visible": true,
  "locked": false,
  "lineThickness": 2,
  "lineType": "solid",
  "patternScale": 1,
  "items": [
    { "type": "line",   "id": "line-uuid" },
    { "type": "circle", "id": "polyline-uuid" }
  ]
}
```

`lineType`: `"solid"`, `"dashed"`, etc.

---

## `pdfExport` (Pages)

**Top-level, sibling of `canvases`** — `cad_data.pdfExport`. Defines the physical
printed page(s) for the drawing: a rectangle in canvas units overlaid on the canvas,
plus paper metadata. Previously undocumented; confirmed against a real platform-exported
project.

```json
{
  "pdfPages": [
    {
      "frame": {
        "start": { "x": 67000, "y": -105000 },
        "end":   { "x": 126400, "y": -63000 }
      },
      "orientation": "landscape",
      "format": "A2",
      "printPage": true,
      "offset": { "top": 0, "right": 0, "bottom": 0, "left": 0 },
      "scale": 100,
      "canvasIndex": 0
    }
  ]
}
```

| Key | Type | Description |
|---|---|---|
| `frame.start` / `frame.end` | `{x,y}` | The page's rectangle in canvas units (respects `settings.canvasLengthUnits`) — this **is** the page; `format`/`orientation` are descriptive labels and must be kept consistent with it, not the other way round. |
| `orientation` | `string` | `"landscape"`, `"portrait"` |
| `format` | `string` | Paper size label, e.g. `"A0"`–`"A4"` |
| `printPage` | `boolean` | Whether this page is included in a PDF export |
| `offset` | `{top,right,bottom,left}` | Print margins |
| `scale` | `number` | Print scale, percent |
| `canvasIndex` | `integer` | Which `canvases[]` entry this page belongs to (for multi-canvas documents) |

Compute the frame size from the paper format in mm, e.g. A2 landscape = 594mm × 420mm →
`594 * 100 = 59400` units wide, `420 * 100 = 42000` units tall (the example above uses
that exact size). A `savedSettings` sibling key may also appear alongside `pdfPages` —
that's UI dialog state (last-used format/margins in the CAD editor), safe to omit when
creating a drawing programmatically.

---

## Pages & Title Blocks — Default Template

> **Do this by default.** Unless the user asks for bare geometry only (or explicitly
> says they don't want a title block/page), every CAD drawing you generate should be
> wrapped in this page + title block template. It's easy for a user to strip back out
> afterward — delete the `blockReferences`, `pdfExport`, and the title-block
> `block_instances` entry — so default to including it rather than asking first.

To produce a drawing that looks like a finished, ready-to-print sheet (a page border +
title block, not just bare geometry), reuse the ready-made template at
[`assets/Title-Block-Example.json`](./assets/Title-Block-Example.json) rather than
building one from scratch — it's a real, working A2-landscape page + title block
exported from the platform. Copy these three pieces verbatim into your new `cad_data`:

1. **`pdfExport`** — the A2-landscape page frame (see above).
2. **`blockReferences[0]`** — the title block's own definition (border lines, the info
   table, labels like "Project Title:", "Project Address:", "STATUS:"). Keep its `id`.
3. **The canvas's `block_instances[0]`** — places that block at
   `position: {x: 96700, y: -86048}`, `scale: {x: 2, y: 2}`, `rotation: 0`, referencing
   the `blockId` from step 2.

Then add your own drawing content (lines, dimensions, texts) to the canvas, scaled and
translated to sit inside the page frame without overlapping the title block. To fit
arbitrary drawing content into the page automatically:

```
1. Compute the new content's bounding box: [contentMinX, contentMaxX] x [contentMinY, contentMaxY]
2. Define a safe drawing rectangle inside the page frame, clear of the title block
   (see "Known limitations" below for this template specifically)
3. scale = min(safeWidth / contentWidth, safeHeight / contentHeight)   // uniform, never distort
4. Translate + scale every coordinate in your content so its bounding-box center
   lands on the safe rectangle's center
```

**For this exact template (A2 landscape)**, analysis of the title block's own geometry
shows its info table (the actual text fields) occupies roughly the **right half** of the
page, spanning most of its height — not just a bottom strip. As a conservative starting
default, treat the **left ~45,000 units of page width** (roughly `x: 69000` to `x:
114000`, `y: -103000` to `-65000`, leaving margins) as the safe zone for new drawing
content, and keep the title block itself untouched on the right.

### Known limitations — read before assuming this "just works"

- **This safe-zone rectangle is an approximation**, derived by analyzing the block's
  coordinate data, not by visually rendering the drawing (no tool available here can
  render/screenshot the CAD viewer). It's a reasonable starting default, not a
  pixel-verified boundary. **The first time you use this pattern on a new project, open
  the returned `view_link` and visually confirm nothing overlaps the title block** before
  trusting it for unattended/repeated use.
- **Only cleanly reusable at A2 landscape, or other ISO 'A' landscape sizes via uniform
  rescaling** (A0/A1/A3/A4 landscape all share the same √2:1 aspect ratio as A2, so
  scaling `pdfExport.frame`, the block's `position`, and its `scale` by the same factor
  keeps everything proportional). **Portrait orientation, or non-ISO sizes (e.g. ANSI
  D/E), are not trivially derived from this template** — the title block's artwork
  (line lengths, text positions) is fixed, hand-drafted geometry, not a parametric
  layout, so a different aspect ratio needs its own template rather than a stretch of
  this one (stretching non-uniformly will visibly distort the border and text).
- **Rotated placement isn't covered** by the simple placement formula above — this
  template uses `rotation: 0`.

---

## cloudcad.model Functions

### `cloudcad.model.create`

Creates a new CAD model from a `cad_data` object. **Must be called before `cloudcad.file.save`.**

```json
{
  "function": "cloudcad.model.create",
  "arguments": {
    "cad_data": {
      "settings": { "canvasLengthUnits": "mm" },
      "canvases": [
        {
          "version": "2.0.0",
          "schema": "canvas-json-v2-optimized",
          "name": "Floor Plan",
          "drawing_type": "Plan",
          "is_base": true,
          "points": [],
          "lines": [
            { "p1": { "x": 0, "y": 0 }, "p2": { "x": 5000, "y": 0 } }
          ],
          "polylines": [],
          "dimensions": [],
          "angleDimensions": [],
          "radiusDimensions": [],
          "leaderTexts": [],
          "multiLeaderTexts": [],
          "texts": [],
          "tables": [],
          "axes": [],
          "constructionLines": [],
          "revisionClouds": [],
          "hatches": [],
          "images": [],
          "block_instances": [],
          "layers": []
        }
      ]
    }
  }
}
```

**Response:**
```json
{ "status": 0, "msg": "CAD model was successfully created.", "data": "" }
```

---

## cloudcad.file Functions

### `cloudcad.file.save`

Save the current CAD model to cloud storage. **Requires `cloudcad.model.create` earlier in the session.**

| Key | Type | Description |
|---|---|---|
| `name` | `string` | File name |
| `path` | `string` | Cloud storage path |
| `public_share` | `boolean` | Also return a public view-only link |
| `return_uid_url` | `boolean` | Return a UID-based URL (`?u=`) instead of name/path URL |

```json
{
  "function": "cloudcad.file.save",
  "arguments": {
    "name": "floor-plan-v1",
    "path": "projects/cad/",
    "public_share": true
  }
}
```

**Response:**
```json
{
  "status": 0,
  "msg": "CAD model was successfully saved ...",
  "data": "https://platform.skyciv.com/cad?preload_name=floor-plan-v1&preload_path=projects/cad/",
  "public_link": "https://platform.skyciv.com/cad-viewer?project_id=..."
}
```

### `cloudcad.file.open`

Load a CAD model from cloud storage.

| Key | Type | Description |
|---|---|---|
| `name` | `string` | File name |
| `path` | `string` | Cloud storage path |
| `uid` | `string` | File UID (alternative to `name`/`path`) |

```json
{
  "function": "cloudcad.file.open",
  "arguments": {
    "name": "floor-plan-v1",
    "path": "projects/cad/"
  }
}
```

**Response:**
```json
{ "status": 0, "msg": "File Loaded: CAD model 'floor-plan-v1' is set." }
```

---

## Full Example — Create and Save a CAD Drawing

```json
{
  "auth": { "username": "user@example.com", "key": "YOUR_KEY" },
  "options": { "validate_input": true },
  "functions": [
    {
      "function": "S3D.session.start",
      "arguments": { "keep_open": false }
    },
    {
      "function": "cloudcad.model.create",
      "arguments": {
        "cad_data": {
          "settings": { "canvasLengthUnits": "mm" },
          "attributeStyles": [
            {
              "id": "as-default",
              "name": "Default Style",
              "settings": {
                "linearArrowShape": "arrow",
                "linearArrowLength": 216, "linearArrowWidth": 216,
                "linearExtLineStartOffset": 0, "linearExtLineEndOffset": 0,
                "linearTextOffset": 0, "linearTextHorizontalOffset": 0,
                "linearTextHorizontalPosition": "center",
                "dimensionTextSize": 378,
                "angleArrowShape": "arrow",
                "angleArrowLength": 216, "angleArrowWidth": 216,
                "angleDimensionTextSize": 378,
                "angleTextOffset": 600, "angleTextOrientation": "horizontal",
                "radiusArrowShape": "arrow",
                "radiusArrowLength": 216, "radiusArrowWidth": 216,
                "radiusDimensionTextSize": 378, "radiusTextOffset": 0,
                "leaderArrowShape": "arrow",
                "leaderArrowLength": 216, "leaderArrowWidth": 216,
                "leaderTextSize": 378,
                "leaderTextOffsetHorizontal": 0, "leaderTextOffsetVertical": 0,
                "axisExtension": 5000, "axisCircleDiameter": 1080,
                "axisTextSize": 324, "axisDashLength": 216, "axisDashGap": 108,
                "textSizeInput": 14, "textSizeOverride": false,
                "fontFamily": "monospace", "tableFontSize": 400
              }
            }
          ],
          "canvases": [
            {
              "version": "2.0.0",
              "schema": "canvas-json-v2-optimized",
              "name": "Ground Floor Plan",
              "drawing_type": "Plan",
              "is_base": true,
              "points": [],
              "lines": [
                { "p1": { "x": 0,    "y": 0    }, "p2": { "x": 6000, "y": 0    }, "groupId": "g1" },
                { "p1": { "x": 6000, "y": 0    }, "p2": { "x": 6000, "y": 4000 }, "groupId": "g1" },
                { "p1": { "x": 6000, "y": 4000 }, "p2": { "x": 0,    "y": 4000 }, "groupId": "g1" },
                { "p1": { "x": 0,    "y": 4000 }, "p2": { "x": 0,    "y": 0    }, "groupId": "g1" }
              ],
              "polylines": [],
              "dimensions": [
                {
                  "p1": { "x": 0, "y": 0 },
                  "p2": { "x": 6000, "y": 0 },
                  "offsetPoint": { "x": 3000, "y": -500 },
                  "attributeStyleId": "as-default"
                }
              ],
              "angleDimensions": [], "radiusDimensions": [],
              "leaderTexts": [], "multiLeaderTexts": [],
              "texts": [
                {
                  "position": { "x": 3000, "y": 2000 },
                  "text": "GROUND FLOOR",
                  "size": 20,
                  "color": "#ffffff",
                  "alignment": "center",
                  "textPosition": "middle-center",
                  "bold": true,
                  "italic": false,
                  "backgroundColor": "#000000",
                  "backgroundColorOpacity": 0,
                  "attributeStyleId": "as-default"
                }
              ],
              "tables": [], "axes": [], "constructionLines": [],
              "revisionClouds": [], "hatches": [], "images": [],
              "block_instances": [], "layers": []
            }
          ]
        }
      }
    },
    {
      "function": "cloudcad.file.save",
      "arguments": {
        "name": "ground-floor-plan",
        "path": "projects/building-a/",
        "public_share": true
      }
    }
  ]
}
```

---

## Coordinate System

- All coordinates are 2D: `x` (horizontal) and `y` (vertical) on the canvas.
- `y` is up as negative! So you need to reverse the direction if you're trying to build something upwards
- Units are controlled by `settings.canvasLengthUnits`.
- There is no Z axis on a single canvas; elevation is represented by using multiple canvases at different elevations (configured in `s3d.elevations`).
- Coordinates can be any number including negative — the canvas has no fixed origin boundary.

## Key Patterns

**Closed polygon from lines:** Share the same `groupId` across connected line segments.

**Reusable details:** Define once in the top-level `blockReferences`, place many times via `block_instances` with different `position`, `rotation`, and `scale`.

**Organised drawings:** Assign elements to `layers` by referencing their `type` and `id`. Enable `displayColorByLayers` in settings to inherit layer colors.

**Opening a previously saved drawing for editing:** Use `cloudcad.file.open` to load it into the session, modify via API, then `cloudcad.file.save` with the same name/path to overwrite.

## Sizing, Units and Scaling

**Always define `attributeStyles` and reference `"attributeStyleId": "as-default"` on every annotation element** (dimensions, texts, leader texts, axes). Without this, annotation sizes default to values designed for a different drawing scale and will look wrong.

Scale all length values in the attribute style to match the drawing size:

| Drawing scale | Typical geometry size | `dimensionTextSize` | `linearArrowLength` | `textSizeInput` |
|---|---|---|---|---|
| Cross-section | 50–300 mm | 10 | 6 | 14 |
| Structural detail | 200–2000 mm | 50 | 30 | 14 |
| Building (rooms) | 3000–10000 mm | 378 | 216 | 14 |
| Large building / site | 10000–50000 mm | 500 | 300 | 14 |

**For any drawing larger than 5000 mm, compute the text size proportionally instead of guessing from the table:**

```
dimensionTextSize = Math.round(Math.max(buildingWidth, buildingHeight) / 60)
linearArrowLength = Math.round(dimensionTextSize * 0.6)
linearArrowWidth  = linearArrowLength
```

Examples: 10 000 mm building → 167 mm text, 30 000 mm → 500 mm text, 50 000 mm → 833 mm text.  
Apply the same formula to `angleDimensionTextSize`, `radiusDimensionTextSize`, `leaderTextSize`, and `axisTextSize`.

`textSizeInput` is in pixels and does **not** scale with geometry — keep it at `14` for body text, `20–28` for headings regardless of drawing scale.

**`textPosition` is required on every text element.** Omitting it causes a crash when the user tries to select items. Default to `"middle-center"`.

