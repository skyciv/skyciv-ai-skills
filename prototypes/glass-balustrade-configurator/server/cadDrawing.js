'use strict';

const fs = require('fs');
const path = require('path');

// Builds a simple elevation drawing (posts, glass panels, handrail + a handrail
// cross-section detail) directly from the same node/member geometry used for the
// analysis model - see prototypes/truss-designer/server/cadDrawing.js (this app's
// sibling prototype) for the two mistakes already made and fixed there, both avoided
// here too:
//   1. Geometry is drawn at TRUE SIZE (real mm), never rescaled to fit the page - only
//      *translated* into the page's safe zone (`centerInSafeZone`).
//   2. `settings.canvasLengthUnits` is display-only - it never reinterprets the stored
//      mm coordinates, only how dimension labels are shown.

const M_TO_MM = 1000;
const CAD_UNITS = 'm'; // display-only - never rescale coordinates for this.

const TITLE_BLOCK_ASSET_PATH = path.join(__dirname, '..', '..', '..', 'cloudcad-api', 'assets', 'Title-Block-Example.json');
const titleBlockAsset = JSON.parse(fs.readFileSync(TITLE_BLOCK_ASSET_PATH, 'utf8'));
const TITLE_BLOCK_REF = titleBlockAsset.blockReferences[0];
const TITLE_BLOCK_INSTANCE = titleBlockAsset.canvases[0].block_instances[0];
const PAGE_PDF_EXPORT = titleBlockAsset.pdfExport;

// Page frame represents 59400 x 42000 real-world mm (A2 landscape @ ~1:100) - see
// cloudcad-api/SKILLS.md's "Known limitations". A balustrade run is much smaller than
// that; it will sit with generous white space around it, which is correct at this
// template's scale, not a sizing bug.
const SAFE_ZONE = { minX: 69000, maxX: 114000, minY: -103000, maxY: -65000 };

// CloudCAD's canvas y-axis is up = negative (cloudcad-api/SKILLS.md "Coordinate
// System") - the opposite of this app's s3d_model y-axis (up = positive) - so every
// point drawn "upward" needs its y negated here.
function pt(xM, yM) {
  return { x: xM * M_TO_MM, y: -yM * M_TO_MM };
}

function collectPoints(lines, dimensions, texts, circles) {
  const points = [];
  for (const l of lines) points.push(l.p1, l.p2);
  for (const d of dimensions) points.push(d.p1, d.p2, d.offsetPoint);
  for (const t of texts) points.push(t.position);
  for (const c of circles) points.push(c.center);
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
function centerInSafeZone(lines, dimensions, texts, circles) {
  const bbox = boundingBox(collectPoints(lines, dimensions, texts, circles));
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
  circles.forEach((c) => { c.center = tf(c.center); c.radiusPoint = tf(c.radiusPoint); });
}

function rectLines(x1M, y1M, x2M, y2M) {
  const groupId = `rect-${x1M}-${y1M}`;
  return [
    { p1: pt(x1M, y1M), p2: pt(x2M, y1M), groupId },
    { p1: pt(x2M, y1M), p2: pt(x2M, y2M), groupId },
    { p1: pt(x2M, y2M), p2: pt(x1M, y2M), groupId },
    { p1: pt(x1M, y2M), p2: pt(x1M, y1M), groupId },
  ];
}

function buildAttributeStyle(totalWidthMm, totalHeightMm) {
  const maxDim = Math.max(totalWidthMm, totalHeightMm, 2000);
  const dimensionTextSize = Math.max(50, Math.round(maxDim / 60));
  const linearArrowLength = Math.round(dimensionTextSize * 0.6);
  return {
    id: 'as-default',
    name: 'Default Style',
    settings: {
      linearArrowShape: 'arrow', linearArrowLength, linearArrowWidth: linearArrowLength,
      linearExtLineStartOffset: 0, linearExtLineEndOffset: 0,
      linearTextOffset: 0, linearTextHorizontalOffset: 0, linearTextHorizontalPosition: 'center',
      dimensionTextSize,
      angleArrowShape: 'arrow', angleArrowLength: linearArrowLength, angleArrowWidth: linearArrowLength,
      angleDimensionTextSize: dimensionTextSize, angleTextOffset: dimensionTextSize, angleTextOrientation: 'horizontal',
      radiusArrowShape: 'arrow', radiusArrowLength: linearArrowLength, radiusArrowWidth: linearArrowLength,
      radiusDimensionTextSize: dimensionTextSize, radiusTextOffset: 0,
      leaderArrowShape: 'arrow', leaderArrowLength: linearArrowLength, leaderArrowWidth: linearArrowLength,
      leaderTextSize: dimensionTextSize, leaderTextOffsetHorizontal: 0, leaderTextOffsetVertical: 0,
      axisExtension: 5000, axisCircleDiameter: 1080, axisTextSize: dimensionTextSize,
      axisDashLength: 216, axisDashGap: 108,
      textSizeInput: 14, textSizeOverride: false, fontFamily: 'monospace', tableFontSize: 400,
    },
  };
}

function buildCadData({ layout, title }) {
  const { postCount, spacingM, handrailHeightM, glassHeightM, postSection, handrailSection, runLengthM } = layout;

  const lines = [];
  for (let i = 0; i < postCount; i++) {
    const xM = i * spacingM;
    const halfWidthM = postSection.D / 2 / M_TO_MM;
    lines.push(...rectLines(xM - halfWidthM, 0, xM + halfWidthM, handrailHeightM));
  }
  for (let i = 0; i < postCount - 1; i++) {
    const x1M = i * spacingM;
    const x2M = (i + 1) * spacingM;
    lines.push(...rectLines(x1M, 0, x2M, glassHeightM));
  }
  // Handrail centerline across all post tops.
  lines.push({ p1: pt(0, handrailHeightM), p2: pt(runLengthM, handrailHeightM), groupId: 'handrail' });

  const dimensions = [];
  for (let i = 0; i < postCount - 1; i++) {
    const x1M = i * spacingM;
    const x2M = (i + 1) * spacingM;
    dimensions.push({
      p1: pt(x1M, 0), p2: pt(x2M, 0),
      offsetPoint: pt((x1M + x2M) / 2, -0.3),
      projectionType: 'horizontal',
      attributeStyleId: 'as-default',
    });
  }
  dimensions.push({
    p1: pt(0, 0), p2: pt(0, handrailHeightM),
    offsetPoint: pt(-0.5, handrailHeightM / 2),
    projectionType: 'vertical',
    attributeStyleId: 'as-default',
  });
  dimensions.push({
    p1: pt(0, 0), p2: pt(0, glassHeightM),
    offsetPoint: pt(-1.0, glassHeightM / 2),
    projectionType: 'vertical',
    attributeStyleId: 'as-default',
  });

  const circleCenterM = { x: runLengthM + 1.2, y: handrailHeightM };
  const handrailRadiusMm = handrailSection.D / 2;
  const circles = [
    {
      type: 'circle',
      center: pt(circleCenterM.x, circleCenterM.y),
      radius: handrailRadiusMm,
      radiusPoint: pt(circleCenterM.x + handrailRadiusMm / M_TO_MM, circleCenterM.y),
      segments: 60,
    },
  ];

  const texts = [
    {
      position: pt(runLengthM / 2, handrailHeightM + 0.4),
      text: title || 'Glass Balustrade - Elevation',
      size: 24, color: '#ffffff', backgroundColorOpacity: 0,
      alignment: 'center', textPosition: 'middle-center', bold: true,
      attributeStyleId: 'as-default',
    },
    {
      position: pt(runLengthM / 2, handrailHeightM + 0.22),
      text: `Run ${runLengthM.toFixed(2)} m | ${postCount} posts @ ${(spacingM * 1000).toFixed(0)} mm | Post ${postSection.name} (${layout.postType}) | Handrail ${handrailSection.name} CHS | AS/NZS 1664`,
      size: 14, color: '#e2e8f0', backgroundColorOpacity: 0,
      alignment: 'center', textPosition: 'middle-center',
      attributeStyleId: 'as-default',
    },
    {
      position: pt(circleCenterM.x, circleCenterM.y + handrailRadiusMm / M_TO_MM + 0.15),
      text: `Handrail ${handrailSection.name}`,
      size: 12, color: '#e2e8f0', backgroundColorOpacity: 0,
      alignment: 'center', textPosition: 'middle-center',
      attributeStyleId: 'as-default',
    },
  ];

  const totalWidthMm = (runLengthM + 3) * M_TO_MM;
  const totalHeightMm = (handrailHeightM + 1) * M_TO_MM;
  const attributeStyle = buildAttributeStyle(totalWidthMm, totalHeightMm);

  centerInSafeZone(lines, dimensions, texts, circles);

  return {
    settings: { canvasLengthUnits: CAD_UNITS },
    attributeStyles: [attributeStyle],
    blockReferences: [TITLE_BLOCK_REF],
    pdfExport: PAGE_PDF_EXPORT,
    canvases: [
      {
        version: '2.0.0',
        schema: 'canvas-json-v2-optimized',
        name: 'Balustrade Elevation',
        drawing_type: 'Elevation',
        is_base: true,
        points: [], lines, polylines: circles, dimensions, angleDimensions: [], radiusDimensions: [],
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
