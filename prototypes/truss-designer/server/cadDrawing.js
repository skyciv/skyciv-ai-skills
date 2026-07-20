'use strict';

const fs = require('fs');
const path = require('path');

// The CloudCAD API has no "generate a drawing from an existing S3D model" function -
// the documented `s3d` block on a CAD drawing only carries metadata the other way
// (CAD -> S3D). So this builds a simple elevation line drawing directly from the same
// node/member geometry used for the analysis model. The truss is already planar
// (z = 0 for every node), so every member is drawn - no front/back filtering needed.
//
// Per cloudcad-api/SKILLS.md's "Pages & Title Blocks" section (default behavior unless
// told otherwise): every drawing is wrapped in that skill's ready-made A2-landscape
// page + title block template, reused directly from the skill's own asset rather than
// duplicated here, so there's one source of truth for it.
//
// IMPORTANT - two mistakes already made and fixed here, do not repeat either:
//
// 1. Model geometry is drawn at TRUE SIZE (real mm), never rescaled to fit the page.
//    CAD model coordinates are the actual measurement; CloudCAD reports a dimension's
//    value as the true distance between its two points, so scaling geometry to
//    force-fit a page also silently corrupts every dimension label (a 24 ft span once
//    rendered its dimension as "40000mm" instead of the true 7315.2mm). Only *position*
//    (translate) is adjusted - see `centerInSafeZone` below.
//
// 2. `settings.canvasLengthUnits` does NOT reinterpret what the stored x/y numbers mean
//    - raw coordinates are always real mm internally regardless of this setting; it only
//    controls how dimension *labels* are displayed/converted for reading. Pre-dividing
//    every coordinate by 304.8 (to "convert to feet") while ALSO setting
//    canvasLengthUnits to "ft" double-converts: the geometry becomes 304.8x too small,
//    then its already-wrong tiny value gets converted again for display (a 24 ft span
//    became 24mm internally, then displayed as "0.08 ft" - exactly 24/304.8). Never
//    rescale coordinates for a unit change - only flip this settings key.

const FT_TO_MM = 304.8;
const CAD_UNITS = 'ft'; // display-only - see note 2 above; never rescale coordinates for this.

const TITLE_BLOCK_ASSET_PATH = path.join(__dirname, '..', '..', '..', 'cloudcad-api', 'assets', 'Title-Block-Example.json');
const titleBlockAsset = JSON.parse(fs.readFileSync(TITLE_BLOCK_ASSET_PATH, 'utf8'));
const TITLE_BLOCK_REF = titleBlockAsset.blockReferences[0];
const TITLE_BLOCK_INSTANCE = titleBlockAsset.canvases[0].block_instances[0];
const PAGE_PDF_EXPORT = titleBlockAsset.pdfExport;

// Reused verbatim from the title-block asset's own `attributeStyles[0]` - tuned for
// true-size (real mm) geometry at this page's plot scale (dimensionTextSize:378 matches
// the skill's own "Building (rooms), 3000-10000mm" bracket, which covers most truss
// spans). Do not rescale this for a display-unit change - see note 2 above.
const ATTRIBUTE_STYLE = {
  id: 'as-default',
  name: 'Default Style',
  settings: {
    linearArrowShape: 'arrow', linearArrowLength: 216, linearArrowWidth: 216,
    linearExtLineStartOffset: 0, linearExtLineEndOffset: 0,
    linearTextOffset: 0, linearTextHorizontalOffset: 0, linearTextHorizontalPosition: 'center',
    dimensionTextSize: 378,
    angleArrowShape: 'arrow', angleArrowLength: 216, angleArrowWidth: 216,
    angleDimensionTextSize: 378, angleTextOffset: 600, angleTextOrientation: 'horizontal',
    radiusArrowShape: 'arrow', radiusArrowLength: 216, radiusArrowWidth: 216,
    radiusDimensionTextSize: 378, radiusTextOffset: 0,
    leaderArrowShape: 'arrow', leaderArrowLength: 216, leaderArrowWidth: 216,
    leaderTextSize: 378, leaderTextOffsetHorizontal: 0, leaderTextOffsetVertical: 0,
    axisExtension: 5000, axisCircleDiameter: 1080, axisTextSize: 324,
    axisDashLength: 216, axisDashGap: 108,
    textSizeInput: 14, textSizeOverride: false, fontFamily: 'monospace', tableFontSize: 400,
  },
};

// This template's page frame represents 59400 x 42000 real-world mm at its declared
// plot scale (594mm x 420mm A2 paper x scale:100) - i.e. drawn at true size, only
// objects up to ~59 m x 42 m actually fill the sheet. A single truss (max supported
// span 80 ft = 24384mm) is much smaller than that and will appear small within the
// safe zone below, with generous surrounding white space - correct at this scale, not a
// sizing bug. For a truss-appropriate "zoomed in" scale, use a title-block/page template
// built for a finer scale (e.g. 1:20 instead of this one's ~1:100) - see
// cloudcad-api/SKILLS.md's "Known limitations".
const SAFE_ZONE = { minX: 69000, maxX: 114000, minY: -103000, maxY: -65000 };

// CloudCAD's canvas y-axis is up = negative (cloudcad-api/SKILLS.md "Coordinate
// System") - the opposite of this app's s3d_model y-axis (up = positive) - so every
// point drawn "upward" (increasing height) needs its y negated here.
function pt(x, y) {
  return { x: x * FT_TO_MM, y: -y * FT_TO_MM };
}

function collectPoints(lines, dimensions, texts) {
  const points = [];
  for (const l of lines) points.push(l.p1, l.p2);
  for (const d of dimensions) points.push(d.p1, d.p2, d.offsetPoint);
  for (const t of texts) points.push(t.position);
  return points;
}

function boundingBox(points) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

// Translates (never scales) every coordinate so the drawing's true-size bounding box is
// centered inside SAFE_ZONE - preserves every real dimension exactly.
function centerInSafeZone(lines, dimensions, texts) {
  const bbox = boundingBox(collectPoints(lines, dimensions, texts));
  const rawCx = (bbox.minX + bbox.maxX) / 2;
  const rawCy = (bbox.minY + bbox.maxY) / 2;
  const safeCx = (SAFE_ZONE.minX + SAFE_ZONE.maxX) / 2;
  const safeCy = (SAFE_ZONE.minY + SAFE_ZONE.maxY) / 2;
  const dx = safeCx - rawCx;
  const dy = safeCy - rawCy;
  const tf = (p) => ({ x: p.x + dx, y: p.y + dy });

  lines.forEach((l) => { l.p1 = tf(l.p1); l.p2 = tf(l.p2); });
  dimensions.forEach((d) => { d.p1 = tf(d.p1); d.p2 = tf(d.p2); d.offsetPoint = tf(d.offsetPoint); });
  texts.forEach((t) => { t.position = tf(t.position); });
}

function buildCadData({ s3d_model, layout, title }) {
  const nodes = s3d_model.nodes;
  const lines = Object.values(s3d_model.members).map((member) => ({
    p1: pt(nodes[member.node_A].x, nodes[member.node_A].y),
    p2: pt(nodes[member.node_B].x, nodes[member.node_B].y),
  }));

  const { spanFt, heightFt } = layout;

  const dimensions = [
    {
      p1: pt(0, 0), p2: pt(spanFt, 0),
      offsetPoint: pt(spanFt / 2, -3),
      projectionType: 'horizontal',
      attributeStyleId: 'as-default',
    },
    {
      p1: pt(0, 0), p2: pt(0, heightFt),
      offsetPoint: pt(-3, heightFt / 2),
      projectionType: 'vertical',
      attributeStyleId: 'as-default',
    },
  ];

  const texts = [
    {
      position: pt(spanFt / 2, heightFt + 4),
      text: title || `${layout.trussType[0].toUpperCase()}${layout.trussType.slice(1)} Truss - Elevation`,
      size: 24, color: '#ffffff', backgroundColorOpacity: 0,
      alignment: 'center', textPosition: 'middle-center', bold: true,
      attributeStyleId: 'as-default',
    },
    {
      position: pt(spanFt / 2, heightFt + 2.2),
      text: `Span ${spanFt} ft | Height ${heightFt} ft | ${layout.section.label} | Douglas Fir-Larch No.2 | ASCE 7-22 LRFD`,
      size: 14, color: '#e2e8f0', backgroundColorOpacity: 0,
      alignment: 'center', textPosition: 'middle-center',
      attributeStyleId: 'as-default',
    },
  ];

  centerInSafeZone(lines, dimensions, texts);

  return {
    settings: { canvasLengthUnits: CAD_UNITS },
    attributeStyles: [ATTRIBUTE_STYLE],
    blockReferences: [TITLE_BLOCK_REF],
    pdfExport: PAGE_PDF_EXPORT,
    canvases: [
      {
        version: '2.0.0',
        schema: 'canvas-json-v2-optimized',
        name: 'Truss Elevation',
        drawing_type: 'Elevation',
        is_base: true,
        points: [], lines, polylines: [], dimensions, angleDimensions: [], radiusDimensions: [],
        leaderTexts: [], multiLeaderTexts: [], texts, tables: [], axes: [], constructionLines: [],
        revisionClouds: [], hatches: [], images: [],
        block_instances: [TITLE_BLOCK_INSTANCE],
        layers: [],
        s3d: {},
      },
    ],
  };
}

module.exports = { buildCadData };
