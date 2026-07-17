'use strict';

// The CloudCAD API has no "generate a drawing from an existing S3D model" function -
// the documented `s3d` block on a CAD drawing only carries metadata the other way
// (CAD -> S3D). So this builds a simple elevation line drawing directly from the same
// node/member geometry used for the analysis model. The truss is already planar
// (z = 0 for every node), so every member is drawn - no front/back filtering needed.

const FT_TO_MM = 304.8;

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

// CloudCAD's canvas y-axis is up = negative (cloudcad-api/SKILLS.md "Coordinate
// System") - the opposite of this app's s3d_model y-axis (up = positive) - so every
// point drawn "upward" (increasing height) needs its y negated here.
function pt(x, y) {
  return { x: x * FT_TO_MM, y: -y * FT_TO_MM };
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

  return {
    settings: { canvasLengthUnits: 'mm' },
    attributeStyles: [ATTRIBUTE_STYLE],
    canvases: [
      {
        version: '2.0.0',
        schema: 'canvas-json-v2-optimized',
        name: 'Truss Elevation',
        drawing_type: 'Elevation',
        is_base: true,
        points: [], lines, polylines: [], dimensions, angleDimensions: [], radiusDimensions: [],
        leaderTexts: [], multiLeaderTexts: [], texts, tables: [], axes: [], constructionLines: [],
        revisionClouds: [], hatches: [], images: [], block_references: [], block_instances: [], layers: [],
        s3d: {},
      },
    ],
  };
}

module.exports = { buildCadData };
