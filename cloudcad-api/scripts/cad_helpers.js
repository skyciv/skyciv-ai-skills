'use strict';
// CloudCAD helpers for building `cad_data` for cloudcad.model.create.
// Node >= 14, no dependencies. Every rule enforced here was verified against the live API
// (see cloudcad-api/SKILL.md "Gotchas").
//
//   const cad = require('./cad_helpers');
//   const canvas = cad.emptyCanvas('Ground Floor');
//   canvas.lines.push(...);
//   const cad_data = cad.wrapInTitleBlock({ canvas });   // A2 page + title block, content translated into the safe zone
//   const problems = cad.lint(cad_data);                 // [] when clean
//
// CLI:  node cad_helpers.js lint <cad_data.json | full-request.json>

const fs = require('fs');
const path = require('path');

const ARRAY_KEYS = [
  'points', 'lines', 'polylines', 'dimensions', 'angleDimensions', 'radiusDimensions',
  'leaderTexts', 'multiLeaderTexts', 'texts', 'tables', 'axes', 'constructionLines',
  'revisionClouds', 'hatches', 'images', 'block_instances', 'layers',
];
const TEXT_POSITIONS = ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-center',
  'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'];
const STYLED_KEYS = ['dimensions', 'angleDimensions', 'radiusDimensions', 'leaderTexts',
  'multiLeaderTexts', 'texts', 'axes', 'tables'];

// Style values tuned for plot scale 1:100 (the bundled A2 template). Every length is canvas mm,
// i.e. printed mm x plot scale: dimensionTextSize 378 prints at 3.78 mm on the sheet.
const BASE_STYLE_1_100 = {
  linearArrowShape: 'arrow', linearArrowLength: 216, linearArrowWidth: 216,
  linearExtLineStartOffset: 0, linearExtLineEndOffset: 0, linearTextOffset: 0,
  linearTextHorizontalOffset: 0, linearTextHorizontalPosition: 'center', dimensionTextSize: 378,
  angleArrowShape: 'arrow', angleArrowLength: 216, angleArrowWidth: 216, angleDimensionTextSize: 378,
  angleTextOffset: 600, angleTextOrientation: 'horizontal',
  radiusArrowShape: 'arrow', radiusArrowLength: 216, radiusArrowWidth: 216,
  radiusDimensionTextSize: 378, radiusTextOffset: 0,
  leaderArrowShape: 'arrow', leaderArrowLength: 216, leaderArrowWidth: 216, leaderTextSize: 378,
  leaderTextOffsetHorizontal: 0, leaderTextOffsetVertical: 0,
  axisExtension: 5000, axisCircleDiameter: 1080, axisTextSize: 324, axisDashLength: 216, axisDashGap: 108,
  textSizeInput: 14, textSizeOverride: false, fontFamily: 'monospace', tableFontSize: 400,
};
// Settings that are NOT lengths and must not be multiplied when rescaling a style.
const UNSCALED = new Set(['textSizeInput']);

/** An attributeStyles entry sized for the given plot scale (100 = 1:100, 50 = 1:50 ...). */
function attributeStyle(plotScale = 100, id = 'as-default') {
  const k = plotScale / 100;
  const settings = {};
  for (const [key, v] of Object.entries(BASE_STYLE_1_100)) {
    settings[key] = typeof v === 'number' && !UNSCALED.has(key) ? Math.round(v * k * 100) / 100 : v;
  }
  return { id, name: `Style 1:${plotScale}`, settings };
}

/** A canvas with every element array present. */
function emptyCanvas(name = 'Canvas 1', extra = {}) {
  const c = { version: '2.0.0', schema: 'canvas-json-v2-optimized', name, drawing_type: 'Plan', is_base: true };
  for (const k of ARRAY_KEYS) c[k] = [];
  return Object.assign(c, extra);
}

/**
 * Text element with the fields the platform needs (textPosition, light colour, left alignment).
 * `size` is in paper units and only applies with sizeOverride: true (Nov 2026 release). For text
 * in the title-block strip, pass size × plotScale: the PDF export skips the scale there.
 */
function text(x, y, str, opts = {}) {
  return Object.assign({
    position: { x, y }, text: str, size: 3.5, sizeOverride: true, color: '#ffffff', backgroundColor: '#000000',
    backgroundColorOpacity: 0, alignment: 'left', textPosition: 'middle-center', rotation: 0,
    bold: false, italic: false, attributeStyleId: 'as-default',
  }, opts);
}

/**
 * Hatch from a closed polygon [{x,y},...]. Segments use start/end - p1/p2-only segments make
 * cloudcad.model.create hang until it times out.
 */
function hatch(polygon, opts = {}) {
  const segments = polygon.map((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    return { type: 'line', start: { x: a.x, y: a.y }, end: { x: b.x, y: b.y } };
  });
  return Object.assign({ type: 'hatch', color: '#5a5995', opacity: 0.5, loops: [{ segments }] }, opts);
}

/**
 * Revision cloud around a closed polygon (or a rectangle via rectCloud). The platform does NOT
 * generate the scallops: a cloud with `arcs: []` is accepted but draws nothing. This builds the
 * arcs the way the CAD editor does - each edge split into chords of ~2*arcRadius, each arc a
 * [start, end, control] triple bulging outward by arcRadius.
 */
function revisionCloud(polygon, { arcRadius = 500, shapeMode = 'freehand', segments = 10 } = {}) {
  let area = 0;
  polygon.forEach((a, i) => { const b = polygon[(i + 1) % polygon.length]; area += a.x * b.y - b.x * a.y; });
  const outward = area > 0 ? 1 : -1; // sign that points the bulge away from the interior
  const arcs = [];
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.round(len / (2 * arcRadius)));
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    const nx = uy * outward, ny = -ux * outward;
    for (let j = 0; j < n; j++) {
      const s = { x: a.x + (b.x - a.x) * j / n, y: a.y + (b.y - a.y) * j / n };
      const e = { x: a.x + (b.x - a.x) * (j + 1) / n, y: a.y + (b.y - a.y) * (j + 1) / n };
      const m = { x: (s.x + e.x) / 2 + nx * arcRadius, y: (s.y + e.y) / 2 + ny * arcRadius };
      arcs.push({ type: 'arc', points: [s, e, m], segments });
    }
  });
  const xs = polygon.map((p) => p.x), ys = polygon.map((p) => p.y);
  return {
    shapeMode, minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys),
    arcRadius, segments, polygonPoints: polygon.map((p) => ({ x: p.x, y: p.y })), arcs,
  };
}

function rectCloud(minX, minY, maxX, maxY, opts = {}) {
  return revisionCloud([{ x: minX, y: minY }, { x: maxX, y: minY }, { x: maxX, y: maxY }, { x: minX, y: maxY }],
    Object.assign({ shapeMode: 'rectangle' }, opts));
}

// ---- structural (s3d) data: OPT-IN ONLY - add it only when the user asks for the drawing to
// carry S3D members/supports/plates. Shapes match what the editor's right-click "Assign ..."
// actions write (verified: they survive create + save and convert in the editor).

/** lines[].s3d = { member: s3dMember() }  - a member from p1 to p2. `section` is an s3d.sections id (1 = editor default). */
function s3dMember(overrides = {}) {
  return Object.assign({
    section: 1, type: 'normal_continuous', rotation_angle: 0, mirror: 'no', disable_non_linear_effects: 'no',
    fixity_A: 'FFFFFF', fixity_B: 'FFFFFF', offset_Ax: '0', offset_Ay: '0', offset_Az: '0',
    offset_Bx: '0', offset_By: '0', offset_Bz: '0',
  }, overrides);
}
/** points[].s3d = { column: s3dColumn() } - a column projected to the next floor (multi-canvas only). */
const s3dColumn = (overrides = {}) => s3dMember(overrides);
/** points[].s3d = { support: s3dSupport('FFFRRR') } - restraint order Tx Ty Tz Rx Ry Rz. */
function s3dSupport(restraint_code = 'FFFFFF', overrides = {}) {
  return Object.assign({ restraint_code }, overrides);
}
/** hatches[].s3d = s3dPlate() (flat), or lines[].s3d = { plate: s3dPlate() } for a wall. thickness in mm. */
function s3dPlate(overrides = {}) {
  return Object.assign({
    material_id: 1, thickness: 200, membrane_thickness: null, bending_thickness: null, shear_thickness: null,
    rotZ: 0, structure_type: 'plate', type: 'auto', diaphragm: 'no', offset: 0, state: 'stress',
    drilling_stiffness_factor: 1,
  }, overrides);
}
/** Root cad_data.s3d block. normal_axis is required by the editor's converter. */
function s3dRoot({ settings = {}, sections = {}, materials = {}, elevations = [{ canvas_id: 0, elevation: 0 }] } = {}) {
  return {
    settings: Object.assign({
      units: 'mm', tolerance: 0.0001, normal_axis: 'Y', column_projection_direction: 'down',
      connect_floors_by_columns: false, connect_floors_section_id: null, remove_duplicate_members: true,
      supports_only_base: true, ignore_unassigned_sections: false,
      structural_defaults: { defaultLineSectionId: 1, defaultColumnSectionId: 1, defaultSupportFixity: 'FFFFFF',
        defaultPlateMaterialId: 1, defaultPlateThickness: 200 },
    }, settings),
    sections, materials, elevations,
  };
}

// ---- geometry walking (translate only - never scale model geometry) ----

const POINT_KEYS = ['p1', 'p2', 'offsetPoint', 'center', 'radiusPoint', 'intersection', 'p', 'startPoint',
  'endPoint', 'anchorPoint', 'position', 'point', 'start', 'end'];
const POINT_ARRAYS = ['points', 'arrowPoints', 'polygonPoints'];

function forEachPoint(el, fn) {
  if (!el || typeof el !== 'object') return;
  for (const k of POINT_KEYS) if (el[k] && typeof el[k].x === 'number') fn(el[k]);
  for (const k of POINT_ARRAYS) if (Array.isArray(el[k])) el[k].forEach((p) => p && typeof p.x === 'number' && fn(p));
  for (const k of ['l1', 'l2']) if (el[k]) forEachPoint(el[k], fn);
  if (Array.isArray(el.loops)) el.loops.forEach((l) => (l.segments || []).forEach((s) => forEachPoint(s, fn)));
  if (Array.isArray(el.arcs)) el.arcs.forEach((a) => forEachPoint(a, fn));
}

/** Bounding box of every drawable point on a canvas (images contribute x/y..x+width,y+height). */
function bbox(canvas) {
  const b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  const add = (p) => { b.minX = Math.min(b.minX, p.x); b.maxX = Math.max(b.maxX, p.x); b.minY = Math.min(b.minY, p.y); b.maxY = Math.max(b.maxY, p.y); };
  for (const k of ARRAY_KEYS) {
    if (k === 'block_instances' || k === 'layers') continue;
    for (const el of canvas[k] || []) {
      if (k === 'points') add(el);
      else if (k === 'images') { add({ x: el.x, y: el.y }); add({ x: el.x + el.width, y: el.y + el.height }); }
      else if (k === 'revisionClouds') { add({ x: el.minX, y: el.minY }); add({ x: el.maxX, y: el.maxY }); }
      else forEachPoint(el, add);
    }
  }
  return b;
}

/** Translate every element on a canvas by (dx, dy) in place. */
function translate(canvas, dx, dy) {
  const mv = (p) => { p.x += dx; p.y += dy; };
  for (const k of ARRAY_KEYS) {
    if (k === 'layers') continue;
    for (const el of canvas[k] || []) {
      if (k === 'points') mv(el);
      else if (k === 'images') { el.x += dx; el.y += dy; }
      else if (k === 'block_instances') mv(el.position);
      else {
        forEachPoint(el, mv);
        if (k === 'revisionClouds') { el.minX += dx; el.maxX += dx; el.minY += dy; el.maxY += dy; }
      }
    }
  }
  return canvas;
}

let TEMPLATE;
function loadTemplate() {
  if (!TEMPLATE) TEMPLATE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'title-block-a2.json'), 'utf8'));
  return JSON.parse(JSON.stringify(TEMPLATE));
}

/**
 * Wrap a true-size canvas in the A2 page + title block at the given plot scale (default 1:100, the
 * template's native scale). Content is translated (never scaled) so its bounding box is centred in
 * the chosen zone. For another plot scale the PAGE shrinks/grows around the content - the frame,
 * title block, zones and attributeStyle are all multiplied by plotScale/100, so the printed sheet
 * looks identical and the geometry stays true size. Throws if the content does not fit: that is a
 * plot-scale problem, not a reason to shrink the geometry.
 * Pass `s3d` (e.g. s3dRoot()) only for a structural drawing; without it no root s3d block is emitted.
 */
function wrapInTitleBlock({ canvas, plotScale = 100, settings = { canvasLengthUnits: 'mm' }, zone = 'safe_zone', extraStyles = [], s3d }) {
  const t = loadTemplate();
  const k = plotScale / t.plot_scale;
  const page = t.pdfExport.pdfPages[0];
  const o = page.frame.start; // scale the template about the page's start corner
  const sc = (p) => ({ x: o.x + (p.x - o.x) * k, y: o.y + (p.y - o.y) * k });
  const z0 = t.zones[zone];
  if (!z0) throw new Error(`unknown zone "${zone}" - use one of ${Object.keys(t.zones).join(', ')}`);
  const lo = sc({ x: z0.minX, y: z0.minY }), hi = sc({ x: z0.maxX, y: z0.maxY });
  const z = { minX: lo.x, minY: lo.y, maxX: hi.x, maxY: hi.y };
  const b = bbox(canvas);
  if (b.minX === Infinity) throw new Error('canvas has no geometry to place');
  const w = b.maxX - b.minX, h = b.maxY - b.minY;
  if (w > z.maxX - z.minX || h > z.maxY - z.minY) {
    throw new Error(`content is ${Math.round(w)} x ${Math.round(h)} mm but the ${zone} at 1:${plotScale} is ` +
      `${Math.round(z.maxX - z.minX)} x ${Math.round(z.maxY - z.minY)} mm. Use a coarser plot scale (larger number), ` +
      'or zone "safe_zone_wide" - never scale the geometry.');
  }
  translate(canvas, (z.minX + z.maxX) / 2 - (b.minX + b.maxX) / 2, (z.minY + z.maxY) / 2 - (b.minY + b.maxY) / 2);
  const inst = t.block_instance;
  inst.position = sc(inst.position);
  inst.scale = { x: inst.scale.x * k, y: inst.scale.y * k };
  canvas.block_instances.push(inst);
  page.frame = { start: sc(page.frame.start), end: sc(page.frame.end) };
  page.scale = plotScale;
  const out = {
    settings,
    attributeStyles: [plotScale === t.plot_scale ? t.attributeStyles[0] : attributeStyle(plotScale), ...extraStyles],
    blockReferences: t.blockReferences,
    pdfExport: t.pdfExport,
    canvases: [canvas],
  };
  if (s3d) out.s3d = s3d;
  return out;
}

// ---- lint: catches the silent failures cloudcad.model.create will not report ----

function isDark(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return false;
  const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 90;
}

function lint(cadData) {
  const out = [];
  const d = cadData && cadData.functions ? (cadData.functions.find((f) => f.function === 'cloudcad.model.create') || {}).arguments.cad_data : cadData;
  if (!d || !Array.isArray(d.canvases) || !d.canvases.length) return ['cad_data.canvases must be a non-empty array (create accepts anything and returns status 0, so nothing else will tell you)'];
  const styles = new Set((d.attributeStyles || []).map((s) => s.id));
  const blocks = new Map((d.blockReferences || []).map((b) => [b.id, b]));
  if (!styles.size) out.push('no attributeStyles - annotations fall back to the built-in style (grey text, default sizes)');
  if (d.block_references) out.push('root "block_references" is not read - block definitions go in camelCase "blockReferences"');
  d.canvases.forEach((c, ci) => {
    const at = (k, i) => `canvases[${ci}].${k}[${i}]`;
    for (const k of STYLED_KEYS) (c[k] || []).forEach((el, i) => {
      if (!el.attributeStyleId) out.push(`${at(k, i)}: no attributeStyleId`);
      else if (!styles.has(el.attributeStyleId)) out.push(`${at(k, i)}: attributeStyleId "${el.attributeStyleId}" is not defined in attributeStyles (silently falls back)`);
    });
    (c.texts || []).forEach((t, i) => {
      if (!TEXT_POSITIONS.includes(t.textPosition)) out.push(`${at('texts', i)}: textPosition missing/invalid (selecting it in the editor crashes)`);
      if (!t.color) out.push(`${at('texts', i)}: no color - defaults to near-black, invisible on the dark canvas`);
      else if (isDark(t.color)) out.push(`${at('texts', i)}: color ${t.color} is dark - unreadable on the dark canvas`);
    });
    (c.dimensions || []).forEach((dm, i) => {
      if (dm.projectionType !== undefined && !['horizontal', 'vertical'].includes(dm.projectionType)) out.push(`${at('dimensions', i)}: projectionType "${dm.projectionType}" is not a value - omit it for an aligned (true-length) dimension`);
    });
    (c.hatches || []).forEach((h, i) => (h.loops || []).forEach((l, li) => (l.segments || []).forEach((s, si) => {
      if (!s.start || !s.end) out.push(`${at('hatches', i)}.loops[${li}].segments[${si}]: needs start/end (p1/p2-only segments hang create until timeout)`);
    })));
    (c.revisionClouds || []).forEach((r, i) => {
      if (!Array.isArray(r.arcs) || !r.arcs.length) out.push(`${at('revisionClouds', i)}: empty arcs - the cloud will not draw; build it with revisionCloud()/rectCloud()`);
    });
    (c.block_instances || []).forEach((bi, i) => {
      if (!blocks.has(bi.blockId)) out.push(`${at('block_instances', i)}: blockId "${bi.blockId}" not in blockReferences`);
      if (Math.abs(bi.rotation || 0) > 2 * Math.PI + 1e-9) out.push(`${at('block_instances', i)}: rotation ${bi.rotation} looks like degrees - block rotation is radians`);
    });
    for (const k of ARRAY_KEYS) if (c[k] !== undefined && !Array.isArray(c[k])) out.push(`canvases[${ci}].${k} must be an array`);
  });
  // structural data: only checked when present (it is opt-in)
  const S3D_KEYS = { points: ['support', 'column'], lines: ['member', 'plate'] };
  let structural = false;
  d.canvases.forEach((c, ci) => {
    for (const [k, allowed] of Object.entries(S3D_KEYS)) (c[k] || []).forEach((el, i) => {
      if (!el.s3d || typeof el.s3d !== 'object' || !Object.keys(el.s3d).length) return;
      structural = true;
      const bad = Object.keys(el.s3d).filter((x) => !allowed.includes(x));
      if (bad.length) out.push(`canvases[${ci}].${k}[${i}].s3d: unknown key(s) ${bad.join(', ')} - a ${k.slice(0, -1)} takes { ${allowed.join(' / ')}: {...} }`);
      const sup = el.s3d.support;
      if (sup && !/^[FRS]{6}$/.test(sup.restraint_code || '')) out.push(`canvases[${ci}].${k}[${i}].s3d.support: restraint_code must be 6 chars of F/R, e.g. "FFFRRR"`);
    });
    (c.hatches || []).forEach((h, i) => {
      if (!h.s3d) return;
      structural = true;
      if (h.s3d.structure_type !== 'plate') out.push(`canvases[${ci}].hatches[${i}].s3d: must be a flat plate object with structure_type "plate" (not wrapped in { plate })`);
    });
  });
  if (structural && !(d.s3d && d.s3d.settings && ['X', 'Y', 'Z'].includes(d.s3d.settings.normal_axis))) out.push('elements carry s3d data but root s3d.settings.normal_axis is missing - the editor cannot convert it; add s3d: s3dRoot()');
  for (const [id, b] of blocks) (b.items || []).forEach((it, i) => {
    if (it.type === 'image') out.push(`blockReferences["${id}"].items[${i}]: image items inside a block do not render - put the image on the canvas "images" array`);
  });
  return out;
}

module.exports = { attributeStyle, emptyCanvas, text, hatch, revisionCloud, rectCloud, bbox, translate, wrapInTitleBlock, lint, loadTemplate,
  s3dMember, s3dColumn, s3dSupport, s3dPlate, s3dRoot };

if (require.main === module) {
  const [cmd, file] = process.argv.slice(2);
  if (cmd !== 'lint' || !file) { console.error('usage: node cad_helpers.js lint <cad_data.json>'); process.exit(2); }
  const problems = lint(JSON.parse(fs.readFileSync(file, 'utf8')));
  problems.forEach((p) => console.log('WARN ', p));
  console.log(problems.length ? `${problems.length} problem(s)` : 'OK - no problems found');
  process.exit(problems.length ? 1 : 0);
}
