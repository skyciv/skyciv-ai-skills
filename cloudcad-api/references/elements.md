# CloudCAD element reference

The field-level schema for every `cad_data` element. Units and coordinates follow the rules in
`SKILL.md`: coordinates are real mm, y is negative going up, and `canvasLengthUnits` only affects
labels. Tags used below:

- **[verified]**: rendered live through `cloudcad.model.create` and inspected (2026-09-22).
- **[export]**: seen in a real platform export (`assets/all-elements.json`) but not rendered in isolation.

`id` is optional on every element and auto-generated when omitted. Supply your own UUIDs only if
something else refers to the element: a layer's `items`, a block's `blockId`, or your own later
edits. A real export also puts an integer `z` on most elements. That is a stacking index the
platform assigns, so omit it.

## `settings`

Every field is optional. The ones worth setting:

| Key | Type | Description |
|---|---|---|
| `canvasLengthUnits` | `string` | `"mm"`, `"cm"`, `"m"`, `"ft"`, `"in"`. **Label display only** [verified] |
| `displayColorByLayers` | `bool` | Elements take their layer's colour. Layer colour and thickness applied in tests even when this was omitted [verified] |
| `showGrid`, `showAxis`, `showVertices`, `showCreatedDimensions`, `showSelectionDimensions`, `showUnitsInDimensions`, `showPdfFrames` | `bool` | Editor display toggles |
| `snapToGrid`, `snapToPoint`, `snapToLineEnds`, `snapToLineMid`, `snapToAlign`, `snapToAxis` | `bool` | Editor snapping (irrelevant to API output) |
| `gridSize`, `globalDimsScale`, `globalTextScale`, `arcSegments`, `circleSegments` | `string` (numeric) | Stored as strings in exports |
| `canvasBackgroundColor`, `lineColor`, `pointColor`, `dimensionsColor`, `selectionColor`, `highlightColor` | `string` hex | Colours |

## `attributeStyles`

Each entry is `{ "id", "name", "settings": {...} }`. Elements that accept `attributeStyleId`:
`dimensions`, `angleDimensions`, `radiusDimensions`, `leaderTexts`, `multiLeaderTexts`, `texts`,
`axes`, `tables`. A missing or unknown id falls back silently to the built-in style
[verified]. Size every length setting as *printed mm × plot scale*, as described in `SKILL.md`
"Sizing".

| Setting | Type | Notes |
|---|---|---|
| `linearArrowShape`, `angleArrowShape`, `radiusArrowShape`, `leaderArrowShape` | `string` | `"arrow"`, `"dot"`, `"architectural"`, `"none"` |
| `linearArrowLength`/`Width`, `angleArrowLength`/`Width`, `radiusArrowLength`/`Width`, `leaderArrowLength`/`Width` | mm | Arrowhead size |
| `dimensionTextSize`, `angleDimensionTextSize`, `radiusDimensionTextSize`, `leaderTextSize` | mm | Label height |
| `linearExtLineStartOffset`, `linearExtLineEndOffset`, `linearTextOffset`, `linearTextHorizontalOffset` | mm | Extension line / label offsets |
| `linearTextHorizontalPosition` | `string` | `"center"` |
| `angleTextOffset` | mm | Label distance from the arc |
| `angleTextOrientation` | `string` | `"horizontal"` |
| `radiusTextOffset`, `leaderTextOffsetHorizontal`, `leaderTextOffsetVertical` | mm | Label offsets |
| `axisExtension`, `axisCircleDiameter`, `axisTextSize` | mm | Gridline overrun, bubble size, label size |
| `axisDashLength`, `axisDashGap` | mm | Dash-dot pattern of **axes only** (not ordinary lines, which use `lineType`) |
| `tableFontSize` | mm | Table text |
| `textSizeInput` | number | Default text size factor. **Not** a length; don't scale it |
| `textSizeOverride` | `bool` | Whether the style's text size overrides each text's own `size` |
| `fontFamily` | `string` | `"monospace"` |
| `{linear,angle,radius}Prefix` / `Suffix` | `string` | Label text around the value. Radius labels get an automatic `R` [verified] |
| `{linear,angle,radius}Precision`, `…DecimalSep`, `…RoundOff` | number / string | Label number format [export] |
| `{linear,angle,radius}ToleranceType`, `…ToleranceUpper`, `…ToleranceLower` | string / number | Tolerance display, `"none"` default [export] |
| `linearShowUnits`, `radiusShowUnits` | `"yes"`/`"no"` | Unit suffix on the label [export] |
| `angleUnitFormat`, `angleAltUnits` | `string` | `"decimal"`, `"none"` seen [export]. Other values unconfirmed |

## Points

`{ "x": 100, "y": -200 }` [export]

## Lines [verified]

```json
{ "p1": { "x": 0, "y": 0 }, "p2": { "x": 1000, "y": 0 }, "groupId": "g1", "lineType": "dashed" }
```

- `groupId` (optional): give the segments of one closed outline the same value.
- `lineType` (optional): `"solid"`, `"dashed"`, `"dashdotdot"`. Set on the line itself it overrides
  the layer's line type [verified for `"dashed"`].

## Polylines (circles and arcs)

```json
{ "type": "circle", "center": { "x": 0, "y": 0 }, "radius": 500, "radiusPoint": { "x": 500, "y": 0 }, "segments": 100 }
{ "type": "arc", "points": [ { "x": 0, "y": 0 }, { "x": 100, "y": 100 }, { "x": 50, "y": 80 } ], "segments": 100 }
```

Circle [verified]. Arc [export]: `points` is `[start, end, a point on the arc between them]`.

## Linear dimensions [verified]

![Linear dimension anatomy](../assets/images/dimension-linear.svg)

```json
{ "p1": { "x": 0, "y": 0 }, "p2": { "x": 6000, "y": 0 }, "offsetPoint": { "x": 3000, "y": 800 },
  "projectionType": "horizontal", "attributeStyleId": "as-default" }
```

| Field | Meaning |
|---|---|
| `p1`, `p2` | The two measured points |
| `offsetPoint` | Where the dimension line and label sit. Positive y is **below** on screen |
| `projectionType` | **Omit** for an aligned, true-length dimension (a diagonal is measured along its length). `"horizontal"` / `"vertical"` measure that projection only. Other strings (e.g. `"aligned"`) are **not** aligned: one rendered as a vertical projection |

The label is computed from the geometry and shows the unit (`6000.0 mm`, or `24.0 ft` if the canvas unit is ft).

## Angle dimensions [verified]

![Angle dimension anatomy](../assets/images/dimension-angle.svg)

```json
{ "l1": { "p1": { "x": -5980, "y": -2400 }, "p2": { "x": -7260, "y": -680 } },
  "l2": { "p1": { "x": -8360, "y": -2400 }, "p2": { "x": -5980, "y": -2400 } },
  "intersection": { "x": -5980, "y": -2400 }, "p": { "x": -5760, "y": -1060 },
  "attributeStyleId": "as-default" }
```

That example renders `53.3°`.

- `l1`, `l2`: the two lines. One endpoint of each must equal `intersection`.
- `p`: where the arc and label go. **Its distance from `intersection` sets the arc radius**, and
  the extension ticks run out to that radius, not to the lines' own endpoints. To land a tick on
  a real point, make `p`'s distance equal that point's distance from the vertex.
- **Sweep direction follows `l1`'s direction.** Reversing `l1` (same line, opposite way) swept
  the supplement (`180° − θ`) in a real generator.
- Anchor at least one ray on real geometry. If you need a virtual vertex, project back along the
  true slope from a real point.

## Radius dimensions [verified]

```json
{ "center": { "x": 0, "y": 0 }, "radius": 2000, "offsetPoint": { "x": 2500, "y": -2500 }, "attributeStyleId": "as-default" }
```

Draws an arrow from the circle toward `offsetPoint` with an `R…` label. The circle itself is a
separate `polylines` entry.

## Leader texts [verified]

```json
{ "startPoint": { "x": 1000, "y": 0 }, "endPoint": { "x": 3000, "y": -2000 }, "text": "LEADER", "attributeStyleId": "as-default" }
```

`startPoint` is the **arrow tip**; `endPoint` is where the text sits.

## Multi-leader texts [verified]

```json
{ "anchorPoint": { "x": 7000, "y": -3000 }, "arrowPoints": [ { "x": 6000, "y": 0 }, { "x": 9000, "y": 0 } ],
  "text": "MULTI", "attributeStyleId": "as-default" }
```

The text sits at `anchorPoint`, with one arrow to each entry of `arrowPoints`.

## Texts [verified]

```json
{ "position": { "x": 100, "y": -200 }, "text": "My Label", "size": 3.5, "sizeOverride": true, "color": "#ffffff",
  "backgroundColor": "#000000", "backgroundColorOpacity": 0, "alignment": "left",
  "textPosition": "middle-center", "rotation": 0, "bold": false, "italic": false,
  "attributeStyleId": "as-default" }
```

| Field | Meaning |
|---|---|
| `position` | Anchor point; the text is vertically centred on it |
| `size` | **Paper units** since the Nov 2026 release: the editor draws it at `size × plot scale` mm (`3.5` ≈ 3.5 mm printed). Ignored unless `sizeOverride` is `true`. In the **PDF export**, drawing-area text prints at a fixed ~7 mm regardless, and title-block text needs `size × plot scale` (see SKILL.md Sizing). The old "16 mm of character width per unit" rule no longer applies |
| `sizeOverride` | **Always `true`.** Without it, a text with an `attributeStyleId` takes the style's `textSizeInput` instead of its own `size` |
| `sizeUnits` | Omit. `"model"` makes `size` plain canvas mm (tiny on a sheet) |
| `color` | **Always set a light colour.** Omitted, it renders near-black (invisible on the dark canvas) |
| `alignment` | `"left"` (text starts at x), `"center"` (centred on x), `"right"` (ends at x). Behaves like an ordinary anchor in the editor and the PDF, so don't also pre-shift `position` (the PDF font is proportional Helvetica, so a monospace width estimate lands off-centre) |
| font | Plain texts always print in **Helvetica** in the PDF; `fontFamily`, `font` and `attrOverrides.fontFamily` are ignored (verified 2026-11-25) |
| `textPosition` | **Always include it** (`top-left` … `bottom-right`, default `"middle-center"`). Omitting it didn't change the render, but it's reported to crash the editor when the text is selected |
| `rotation` | Degrees, **clockwise** on screen |
| `backgroundColorOpacity` | `0` transparent … `1` opaque |

A real export also carries `boxWidth`, `boxHeight`, `boxMinHeight`, `start_pos`, `end_pos`,
`totalWidth` and `totalHeight`. The platform derives these, so omit them.

## Tables [verified]

```json
{ "position": { "x": 0, "y": 0 }, "title": "SCHEDULE", "attributeStyleId": "as-default",
  "rows": [ ["Size", "Qty"], ["A1", "150"] ],
  "opts": { "first_row_header": true, "alignment": "center", "text_color": "#ffffff", "bg_color": "#000000",
            "header_background_color": "#4a5568", "font_size": 15, "width": 3000, "height": 1000, "row_height": 500 } }
```

`title` (optional) is a caption above the table [export]. `opts.width`, `height` and `row_height`
are in mm.

## Axes (gridlines) [verified]

![Axis dash-dot pattern](../assets/images/axis-dashdot.svg)

```json
{ "p1": { "x": 0, "y": -5000 }, "p2": { "x": 0, "y": 5000 }, "label": "A", "attributeStyleId": "as-default" }
```

Axes always render dash-dot, using the style's `axisDashLength` and `axisDashGap`, with a label
bubble.

## Construction lines [verified]

```json
{ "point": { "x": 0, "y": 0 }, "angle": 30, "isHidden": false, "lineType": "dashdotdot" }
```

An infinite line through `point`. `angle` is in degrees, **counter-clockwise** on screen (30 rises to
the right), which is the opposite sense to text rotation. `lineType` is optional [export].

## Revision clouds [verified]

![Revision cloud fields](../assets/images/revision-clouds.svg)

**Supply the `arcs` array yourself.** A cloud with `arcs: []` or no `arcs` is accepted and draws
nothing. Use `rectCloud()` / `revisionCloud()` from `scripts/cad_helpers.js`, which reproduces the
editor's layout.

```json
{ "shapeMode": "rectangle", "minX": 0, "minY": -3000, "maxX": 4000, "maxY": 0, "arcRadius": 500, "segments": 10,
  "polygonPoints": [ { "x": 0, "y": -3000 }, { "x": 4000, "y": -3000 }, { "x": 4000, "y": 0 }, { "x": 0, "y": 0 } ],
  "arcs": [ { "type": "arc", "points": [ { "x": 0, "y": -3000 }, { "x": 1000, "y": -3000 }, { "x": 500, "y": -3500 } ], "segments": 10 } ] }
```

| Field | Meaning |
|---|---|
| `shapeMode` | `"rectangle"`, `"circle"` (adds `center`, `radius`), `"freehand"` |
| `minX` … `maxY` | Bounding box |
| `polygonPoints` | The outline (rectangle and freehand) |
| `arcRadius` | Scallop size: each edge is split into chords of about `2 × arcRadius` |
| `arcs` | The scallops, drawn in order. Each is `[start, end, control]`, with the control point `arcRadius` outward from the chord midpoint; the arcs chain end-to-start and close |

## Hatches [verified]

```json
{ "type": "hatch", "color": "#5a5995", "opacity": 0.5, "pattern": "stone", "patternScale": 17,
  "loops": [ { "segments": [
    { "type": "line", "start": { "x": 0, "y": 0 },       "end": { "x": 4000, "y": 0 } },
    { "type": "line", "start": { "x": 4000, "y": 0 },     "end": { "x": 4000, "y": -3000 } },
    { "type": "line", "start": { "x": 4000, "y": -3000 }, "end": { "x": 0, "y": 0 } } ] } ] }
```

- **Segments must use `start`/`end`.** `p1`/`p2`-only segments make `create` time out.
- Loops must close (the last `end` equals the first `start`). Segment types are `"line"` and
  `"arc"` [export].
- `pattern` (e.g. `"stone"`, which renders as brick coursing) and `patternScale` are optional.
  Omit them for a solid fill.

## Images [verified]

```json
{ "src": "data:image/png;base64,iVBO...", "x": 0, "y": 0, "width": 3000, "height": 3000,
  "rotation": 0, "opacity": 1, "isPdf": false }
```

- `x`/`y` is the **top-left** corner. The image extends right and toward **+y** (down the screen).
  `width`/`height` are in mm.
- `rotation` is in degrees, clockwise.
- Images are canvas-level only: **an `image` item inside a block definition does not render**.
- Exports also show `isRenderer`/`s3dRender` (embedded S3D render) and `pdfName`/`pdfPage`
  (a PDF page). `isPdf: false` with the rest omitted is enough for a raster image.

## Layers [verified]

```json
{ "id": "layer-1", "name": "Structural", "color": "#ff0000", "visible": true, "locked": false,
  "lineThickness": 2, "lineType": "dashed", "patternScale": 1,
  "items": [ { "type": "line", "id": "line-uuid" } ] }
```

`items` refers to elements by `type` + `id`, so those elements need explicit `id`s. The layer's
colour, thickness and `lineType` apply to its items. `lineType`: `"solid"`, `"dashed"`,
`"dashdotdot"`.

## Blocks

For definitions (`blockReferences`), instances (`block_instances`) and the placement transform,
see `pages-and-title-blocks.md`.
