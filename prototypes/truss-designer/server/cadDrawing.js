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

const FT_TO_MM = 304.8;

const TITLE_BLOCK_ASSET_PATH = path.join(__dirname, '..', '..', '..', 'cloudcad-api', 'assets', 'Title-Block-Example.json');
const titleBlockAsset = JSON.parse(fs.readFileSync(TITLE_BLOCK_ASSET_PATH, 'utf8'));
const TITLE_BLOCK_REF = titleBlockAsset.blockReferences[0];
const TITLE_BLOCK_INSTANCE = titleBlockAsset.canvases[0].block_instances[0];
const PAGE_PDF_EXPORT = titleBlockAsset.pdfExport;

// Conservative "keep clear" zone for this A2-landscape template, derived by analyzing
// the title block's own coordinate data (not visually verified against the rendered
// page - see cloudcad-api/SKILLS.md's "Known limitations"). The title block's info
// table occupies roughly the right half of the page, so new content is confined to the
// left portion.
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
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

// Uniformly scales + translates every coordinate (never distorting the truss's real
// proportions) so the whole drawing's bounding box is centered inside SAFE_ZONE.
// Returns the scale factor actually used, so callers can size text/dimensions to match.
function fitToSafeZone(lines, dimensions, texts) {
  const bbox = boundingBox(collectPoints(lines, dimensions, texts));
  const safeWidth = SAFE_ZONE.maxX - SAFE_ZONE.minX;
  const safeHeight = SAFE_ZONE.maxY - SAFE_ZONE.minY;
  const scale = Math.min(safeWidth / bbox.width, safeHeight / bbox.height);
  const rawCx = (bbox.minX + bbox.maxX) / 2;
  const rawCy = (bbox.minY + bbox.maxY) / 2;
  const safeCx = (SAFE_ZONE.minX + SAFE_ZONE.maxX) / 2;
  const safeCy = (SAFE_ZONE.minY + SAFE_ZONE.maxY) / 2;
  const tf = (p) => ({ x: safeCx + (p.x - rawCx) * scale, y: safeCy + (p.y - rawCy) * scale });

  lines.forEach((l) => { l.p1 = tf(l.p1); l.p2 = tf(l.p2); });
  dimensions.forEach((d) => { d.p1 = tf(d.p1); d.p2 = tf(d.p2); d.offsetPoint = tf(d.offsetPoint); });
  texts.forEach((t) => { t.position = tf(t.position); });

  return { scale, finalWidth: bbox.width * scale, finalHeight: bbox.height * scale };
}

// Per cloudcad-api/SKILLS.md's sizing guidance: mm-based annotation sizes
// (dimensionTextSize, arrow lengths) must scale with the drawing's final size on the
// page, unlike pixel-based text `size` fields (texts[].size), which stay fixed.
function buildAttributeStyle(referenceSize) {
  const dimensionTextSize = Math.max(50, Math.round(referenceSize / 60));
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
      angleDimensionTextSize: dimensionTextSize, angleTextOffset: 600, angleTextOrientation: 'horizontal',
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

  const { finalWidth, finalHeight } = fitToSafeZone(lines, dimensions, texts);

  return {
    settings: { canvasLengthUnits: 'mm' },
    attributeStyles: [buildAttributeStyle(Math.max(finalWidth, finalHeight))],
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
