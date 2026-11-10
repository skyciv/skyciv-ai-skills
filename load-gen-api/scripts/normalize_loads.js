#!/usr/bin/env node
/*
 * SkyCiv Load Generator helpers — plain Node (>=14), no dependencies.
 *
 *   node normalize_loads.js output.json          # print normalized wind/snow/seismic loads
 *   node normalize_loads.js --check input.json   # lint a request before sending it
 *   node normalize_loads.js --self-test          # run against ../sample-api/*
 *
 *   const { normalizeLoads, checkRequest, groupName } = require('./normalize_loads.js');
 *
 * normalizeLoads(response) accepts the raw API reply ({status,msg,data} or the full
 * {response:{...}} envelope) and returns:
 *   {
 *     ok, reason,               // ok: wind_pressure / snow / seismic came back; else reason 'site_only: …' / 'failed: …'
 *     status, errors, warnings, // passed through from the API
 *     report_link,
 *     units: { pressure, length, force },
 *     site: { wind_speed, wind_speed_unit, snow_load, snow_load_unit } | null,
 *     wind: { family, pressure_type,
 *             records:  [ {direction, case, internal, surface, zone, elevation, p} ],   // surface pressures
 *             cladding: [ {zone, area, elevation, p_min, p_max} ],                       // C&C envelope
 *             forces:   [ {direction, case, surface, location, component, F, e, unit} ], // non-building structures
 *             summary:  [ {key, label, info, value, unit} ],                             // AS 4055 table values
 *             mirror:   [ {direction, mirror_as} ],  // opposite wind the API omits: apply a mirrored pattern
 *             notes: [] },
 *     snow: { unit, balanced, balanced_key, unbalanced } | null,
 *     seismic: { unit, V, Ft, levels: [ {direction, level, elevation, weight, F} ], notes } | null
 *   }
 * Every wind `p` is a NET pressure (external - internal), positive TOWARD the surface,
 * in units.pressure. `case` follows the numbering of the SkyCiv report for that code.
 * `internal` is 'max' or 'min': the algebraically larger / smaller internal pressure.
 */
'use strict';

const num = v => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const arr = v => (v === undefined || v === null ? [] : [].concat(v));
// Value may be a number, numeric string, or an open-building {Cn, p} object.
const val = v => (v && typeof v === 'object' && !Array.isArray(v) ? num(v.p) : num(v));

function unwrap(resp) {
  let r = resp;
  if (r && r.response) r = r.response;
  if (Array.isArray(r)) r = r[r.length - 1]; // per-function list: last call is getLoads
  return r || {};
}

// ---------------------------------------------------------------- wind families

// Surfaces with one external pressure carry their case 1/2 values into cases 3/4 when any zone of that
// direction has a second one, so every direction × case is a complete load pattern.
function fillCases(out) {
  const key = r => [r.direction, r.surface, r.zone, r.elevation].join('|');
  const dirsWith4 = new Set(out.records.filter(r => r.case === 3).map(r => r.direction));
  const has3 = new Set(out.records.filter(r => r.case === 3).map(key));
  for (const r of out.records.slice())
    if (dirsWith4.has(r.direction) && r.case <= 2 && !has3.has(key(r))) out.records.push({ ...r, case: r.case + 2 });
}

// ASCE 7 / NSCP MWFRS: array of {dirn, surface, elevation|location, pos_GCpi, neg_GCpi}
function windAsce(pressures, out) {
  // qh*GCpi per direction = (neg - pos) / 2 on any wall with both values
  const qhGCpi = {};
  for (const e of pressures) {
    if (!e || !/wall/.test(e.surface)) continue;
    const pos = arr(e.pos_GCpi ?? e.pos_Cpi).map(val), neg = arr(e.neg_GCpi ?? e.neg_Cpi).map(val);
    if (pos.length && neg.length && pos[0] !== null && neg[0] !== null && qhGCpi[e.dirn] === undefined)
      qhGCpi[e.dirn] = (neg[0] - pos[0]) / 2;
  }
  for (const e of pressures) {
    if (!e) continue;
    const pos = arr(e.pos_GCpi ?? e.pos_Cpi).map(val), neg = arr(e.neg_GCpi ?? e.neg_Cpi).map(val);
    if (!pos.length && !neg.length) {
      out.notes.push(`${e.dirn} ${e.surface}: API returned no values (Load Generator bug fixed 2026-10-14; output from an older version) — do not treat as zero pressure; read it from report_link`);
      continue;
    }
    const isWall = /wall/.test(e.surface);
    const elev = arr(e.elevation);
    const q = qhGCpi[e.dirn];
    const n = Math.max(pos.length, neg.length);
    for (let i = 0; i < n; i++) {
      const zone = isWall ? (e.surface === 'windward_wall' ? (i < elev.length ? `level_${i + 1}` : 'h') : null) : `zone_${i + 1}`;
      const elevation = isWall ? (i < elev.length ? num(elev[i]) : (elev.length > 1 || e.surface !== 'windward_wall' ? num(elev[elev.length - 1]) : null)) : null;
      const base = { direction: e.dirn, surface: e.surface, zone, elevation };
      // No walls (open building): the two values are Cn cases A/B, not internal-pressure cases
      const internal = q === undefined ? [null, null] : ['max', 'min'];
      out.records.push({ ...base, case: 1, internal: internal[0], p: pos[i] ?? null });
      out.records.push({ ...base, case: 2, internal: internal[1], p: neg[i] ?? null });
      // Roofs with two governing external pressures get cases 3/4 (see SKILL.md load-case table)
      if (!isWall && q !== undefined && pos[i] !== null && neg[i] !== null) {
        const pe1 = pos[i] + q, pe2 = neg[i] - q;
        // tolerance covers wall values the API rounds to 3 decimals
        if (Math.abs(pe1 - pe2) > Math.max(0.005, 1e-4 * Math.abs(pe1))) {
          out.records[out.records.length - 1].p = pos[i] + 2 * q; // case 2 = first pe, -GCpi
          out.records.push({ ...base, case: 3, internal: 'max', p: neg[i] - 2 * q });
          out.records.push({ ...base, case: 4, internal: 'min', p: neg[i] });
        }
      }
    }
  }
  fillCases(out);
  if (pressures.some(e => e && e.dirn === 'along_B' && /roof/.test(e.surface)))
    out.notes.push('along_B roof `location` repeats along_L values (API bug): derive zone edges from h, not location');
}

// AS/NZS 1170.2 building: windward_pressure / leeward_pressure / sidewall_pressure / roof_pressures_all_direction
function windAs1170(p, out) {
  const cases = [[1, 'min', 'combined_min', 'min'], [2, 'max', 'combined_min', 'max'],
                 [3, 'min', 'combined_max', 'min'], [4, 'max', 'combined_max', 'max']];
  const thetas = Object.keys(p.windward_pressure || p.roof_pressures_all_direction || p.roof_pressures || {});
  for (const t of thetas) {
    const walls = [['windward_wall', p.windward_pressure], ['leeward_wall', p.leeward_pressure], ['side_wall', p.sidewall_pressure]];
    const roofDir = (p.roof_pressures_all_direction || {})[t] || (!p.windward_pressure ? (p.roof_pressures || {})[t] : null) || {};
    const roofHasMax = Object.values(roofDir).some(list => arr(list).some(e => e && e.combined_max));
    for (const [surface, src] of walls) {
      arr(src && src[t]).forEach((e, i) => {
        if (!e) return;
        for (const [c, internal] of cases) {
          if (c > 2 && !roofHasMax) continue;
          out.records.push({ direction: t, case: c, internal, surface, zone: surface === 'side_wall' ? `zone_${i + 1}` : surface === 'windward_wall' ? `level_${i + 1}` : null, elevation: null, p: num(e[internal] && e[internal].combined) });
        }
      });
    }
    for (const [kind, list] of Object.entries(roofDir)) {
      arr(list).forEach((e, i) => {
        if (!e) return;
        const surface = `roof_${kind}`;
        const zone = e.location ? String(e.location) : `zone_${i + 1}`;
        if (e.combined_min || e.combined_max) {
          for (const [c, internal, cpe, ip] of cases) {
            if (!e[cpe]) continue;
            out.records.push({ direction: t, case: c, internal, surface, zone, elevation: null, p: num(e[cpe][ip] && e[cpe][ip].combined) });
          }
        } else { // open roofs: net pressure coefficient, no internal pressure
          if (e.min) out.records.push({ direction: t, case: 1, internal: null, surface, zone, elevation: null, p: num(e.min.pe) });
          if (e.max) out.records.push({ direction: t, case: 2, internal: null, surface, zone, elevation: null, p: num(e.max.pe) });
        }
      });
    }
  }
}

// NBCC: {"0": [...], "90": [...]} entries with p_net {min,max}
function windNbcc(p, out) {
  for (const [t, list] of Object.entries(p)) {
    for (const e of arr(list)) {
      if (!e || !e.p_net) continue;
      const base = { direction: t, surface: e.surface || 'zone', zone: e.zone ?? e.location ?? null, elevation: num(e.elevation) };
      out.records.push({ ...base, case: 1, internal: 'max', p: num(e.p_net.min) });
      out.records.push({ ...base, case: 2, internal: 'min', p: num(e.p_net.max) });
    }
  }
}

// EN 1991 / SANS 10160: {"0": [...], "90": [...], "180": [...]} entries with we, wi_max, wi_min.
// Roof entries carry we / we_wi_* as arrays (one item per Cpe; two for roofs with a +/- Cpe):
// item k gives cases 2k+1 (with wi_max) and 2k+2 (with wi_min).
function windEn1991(p, out) {
  for (const [t, list] of Object.entries(p)) {
    for (const e of arr(list)) {
      if (!e) continue;
      const base = { direction: t, surface: e.surface, zone: e.zone, elevation: num(e.elevation) };
      const wes = arr(e.we).map(num), lo = arr(e.we_wi_min).map(num), hi = arr(e.we_wi_max).map(num);
      const n = Math.max(wes.length, lo.length, 1);
      for (let k = 0; k < n; k++) {
        const we = wes[k] ?? null;
        out.records.push({ ...base, case: 2 * k + 1, internal: 'max', p: we === null ? lo[k] ?? null : we - num(e.wi_max) });
        out.records.push({ ...base, case: 2 * k + 2, internal: 'min', p: we === null ? hi[k] ?? null : we - num(e.wi_min) });
      }
    }
  }
  fillCases(out);
}

// Free / open roofs keyed by angle (CFE Viento "pitched"/canopy): {θ: [{location, min, max}]}.
// Net pressure (no internal), positive toward the top surface (pushes the roof down).
function windOpenRoof(p, out) {
  for (const [t, list] of Object.entries(p)) {
    arr(list).forEach((e, i) => {
      if (!e) return;
      const base = { direction: t, internal: null, surface: 'roof', zone: e.location != null ? String(e.location) : `zone_${i + 1}`, elevation: null };
      out.records.push({ ...base, case: 1, p: num(e.min) });
      out.records.push({ ...base, case: 2, p: num(e.max) });
    });
  }
}

// CTE DB SE: pressures.pressures = [{description: "Presión"|"Succión", elevation, cpe, cpi, qb, ce, qe}].
// qe = qb·ce·(cpe − cpi) is already net, in kN/m² (see units fix in normalizeWind).
function windCte(p, out) {
  for (const e of arr(p.pressures)) {
    if (!e) continue;
    const press = /^presi/i.test(e.description || '');
    out.records.push({ direction: '0', case: 1, internal: null, surface: press ? 'windward' : 'leeward', zone: e.description || null, elevation: num(e.elevation), p: num(e.qe) });
  }
}

// AS/NZS 1170.2 ground-mounted solar: {"0deg": {upwind|downwind: {windward|leeward: {edge|inner: {pressure, cpn}}}}}
// Net pressure on the panel, AS/NZS 1170.2 sign: positive toward the top (sun-facing) surface.
function windSolarAs(p, out) {
  for (const [key, rows] of Object.entries(p)) {
    const m = /^(\d+)deg$/.exec(key);
    if (!m || !rows) continue;
    for (const [row, halves] of Object.entries(rows)) for (const [half, zones] of Object.entries(halves || {}))
      for (const [zone, z] of Object.entries(zones || {}))
        if (z) out.records.push({ direction: m[1], case: 1, internal: null, surface: `${row}_row`, zone: `${half}_${zone}`, elevation: null, p: num(z.pressure) });
  }
}

// IS 875: flat array of {direction, zone, elevation, Cpi, pnet}
function windIs875(p, out) {
  const seen = new Set();
  for (const e of p) {
    if (!e) continue;
    const key = [e.direction, e.zone, e.elevation, e.level, e.Cpi].join('|');
    if (seen.has(key)) continue; // the API repeats identical rows
    seen.add(key);
    const cpi = num(e.Cpi);
    out.records.push({ direction: String(e.direction), case: cpi >= 0 ? 1 : 2, internal: cpi >= 0 ? 'max' : 'min', surface: e.surface || 'zone', zone: e.zone, elevation: num(e.elevation), p: num(e.pnet) });
  }
}

// CFE Viento: {pz: {θ: {surface: {min,max} | [{min,max}] | {min:{min,max}, max:{min,max}}}}, pe, pi}
function windCfe(p, out) {
  for (const [t, surfs] of Object.entries(p.pz || {})) {
    const roofHasMax = Object.values(surfs).some(v => v && v.min && typeof v.min === 'object');
    for (const [surface, v] of Object.entries(surfs)) {
      arr(v).forEach((e, i) => {
        if (!e) return;
        const zone = Array.isArray(v) ? `zone_${i + 1}` : null;
        if (typeof e.min === 'object' && e.min !== null) { // two Cpe × two internal
          [[1, 'min', 'min', 'min'], [2, 'max', 'min', 'max'], [3, 'min', 'max', 'min'], [4, 'max', 'max', 'max']]
            .forEach(([c, internal, cpe, ip]) => e[cpe] && out.records.push({ direction: t, case: c, internal, surface, zone, elevation: null, p: num(e[cpe][ip]) }));
        } else {
          [[1, 'min'], [2, 'max'], [3, 'min'], [4, 'max']].forEach(([c, internal]) => {
            if (c > 2 && !roofHasMax) return;
            out.records.push({ direction: t, case: c, internal, surface, zone, elevation: null, p: num(e[internal]) });
          });
        }
      });
    }
  }
}

// C&C: [{zone, area, elevation, p:{min,max}}] (ASCE/NSCP) or [{ZONE: {combined:{min,max}}}] (AS/NZS)
function cladding(list, out) {
  for (const e of arr(list)) {
    if (!e) continue;
    if (e.p && typeof e.p === 'object') {
      out.cladding.push({ zone: e.zone, area: num(e.area), elevation: num(e.elevation), level: e.level ?? null, p_min: num(e.p.min), p_max: num(e.p.max) });
    } else {
      for (const [zone, z] of Object.entries(e)) {
        if (!z || !z.combined) continue;
        const vals = [z.combined.min, z.combined.max].map(c => num(c && c.combined)).filter(x => x !== null);
        out.cladding.push({ zone, area: null, elevation: null, level: z.location ?? null, p_min: Math.min(...vals), p_max: Math.max(...vals) });
      }
    }
  }
}

// Non-building structures: wind_pressure.forces → [{direction, case, surface, location, component, F, e, unit}]
// component: 'along' (along-wind, horizontal), 'vertical' (+ = uplift, rooftop Fv), 'normal' (normal to a panel),
// 'moment' (overturning / hinge moment, ASCE ground solar Mc).
function normalizeForces(wp, out) {
  const f = wp.forces, unit0 = wp.force_unit || null;
  const add = (o, rec) => { const F = num(rec.F); if (F !== null) out.forces.push({ direction: null, case: null, surface: null, location: null, component: 'along', e: null, unit: unit0, ...rec, F }); };
  const entry = (e, dirKey, i) => {
    if (e === null || e === undefined) return;
    if (typeof e !== 'object') return add(null, { direction: dirKey, F: e });
    const unit = e.force_unit || unit0;
    const base = { direction: dirKey ?? (e.direction || e.dirn || null), case: e.case ?? null, surface: e.surface || (e.zone != null ? `zone_${e.zone}` : null), location: e.location ?? null, e: num(e.e), unit };
    if (e.Fv !== undefined || e.Fh !== undefined) { // ASCE rooftop equipment
      add(null, { ...base, surface: 'equipment', component: 'along', F: e.Fh });
      add(null, { ...base, surface: 'equipment', component: 'vertical', F: e.Fv });
    } else if (e.Fn_max !== undefined || e.Fn_min !== undefined) { // ASCE ground solar
      add(null, { ...base, case: 'max', component: 'normal', F: e.Fn_max });
      add(null, { ...base, case: 'min', component: 'normal', F: e.Fn_min });
    } else if (Array.isArray(e.magnitude)) { // truss tower: force per level
      e.magnitude.forEach((m, k) => add(null, { ...base, location: m && typeof m === 'object' ? m.elevation ?? m.level ?? k : k, F: m && typeof m === 'object' ? m.F ?? m.force ?? m.value : m }));
    } else add(null, { ...base, F: e.F ?? e.magnitude });
  };
  if (Array.isArray(f)) f.forEach((e, i) => entry(e, null, i));
  else if (f && typeof f === 'object') for (const [k, v] of Object.entries(f)) arr(v).forEach((e, i) => entry(e, k, i));
  for (const m of arr(wp.moment)) { // ASCE ground solar
    if (!m) continue;
    for (const [c, key] of [['max', 'Mc_max'], ['min', 'Mc_min']])
      if (num(m[key]) !== null) out.forces.push({ direction: null, case: c, surface: `zone_${m.zone}`, location: null, component: 'moment', e: null, unit: m.force_unit || null, F: num(m[key]) });
  }
  if (f && !out.forces.length) out.notes.push('`wind_pressure.forces` has a shape this script does not know: read it directly');
}

// ASCE 7-16/22 circular bin / tank: forces.wall {F, Mo, Cf, F_minimum}, pressure.roof.zoneN {pos, neg} (MWFRS, ±GCpi),
// wall_cladding_pressures [{angle, p:{pos,neg}}] (C&C round the shell, angle from the windward meridian),
// roof_cladding_pressures [{zone, area, GCp, p:{pos,neg}}]. Axisymmetric, so direction is 'any'.
function windCircularBin(wp, out) {
  const w = wp.forces && wp.forces.wall, unit = wp.force_unit || null;
  if (w) {
    const F = num(w.F), Fmin = num(w.F_minimum);
    out.forces.push({ direction: 'any', case: null, surface: 'wall', location: 'resultant', component: 'along', e: null, unit, F: Fmin !== null && Fmin > F ? Fmin : F });
    if (num(w.Mo) !== null) out.forces.push({ direction: 'any', case: null, surface: 'wall', location: 'base', component: 'moment', e: null, unit: unit && `${unit}-${(wp.elevation_or_location_unit || '').trim()}`, F: num(w.Mo) });
    if (Fmin !== null && Fmin > F) out.notes.push(`Wall: minimum force ${Fmin} governs over calculated ${F} (Mo is for the calculated F — scale it)`);
  }
  const roof = (wp.pressure && wp.pressure.roof) || {};
  for (const [z, v] of Object.entries(roof)) {
    const zone = z.replace(/^zone(\d+)$/, 'zone_$1');
    out.records.push({ direction: 'any', case: 1, internal: 'max', surface: 'roof', zone, elevation: null, p: num(v && v.pos) });
    out.records.push({ direction: 'any', case: 2, internal: 'min', surface: 'roof', zone, elevation: null, p: num(v && v.neg) });
  }
  const env = new Map(); // C&C envelope per zone (+ area)
  const addCc = (zone, area, p) => {
    const vals = [num(p && p.pos), num(p && p.neg)].filter(x => x !== null);
    if (!vals.length) return;
    const k = `${zone}|${area}`, e = env.get(k) || { zone, area, elevation: null, level: null, p_min: Infinity, p_max: -Infinity };
    e.p_min = Math.min(e.p_min, ...vals); e.p_max = Math.max(e.p_max, ...vals); env.set(k, e);
  };
  for (const e of arr(wp.wall_cladding_pressures)) if (e) addCc(`wall_${e.angle}deg`, null, e.p);
  for (const e of arr(wp.roof_cladding_pressures)) if (e) addCc(`roof_zone_${e.zone}`, num(e.area), e.p);
  out.cladding.push(...env.values());
}

function normalizeWind(wp) {
  const out = { family: null, pressure_type: wp.pressure_type || null, records: [], cladding: [], forces: [], summary: [], mirror: [], notes: [] };
  if (wp.mwfrs || wp.components_cladding) { // structure_type "mwfrs_cladding"
    const m = normalizeWind({ ...wp.mwfrs, pressure_unit: wp.pressure_unit });
    Object.assign(out, { family: m.family, records: m.records, mirror: m.mirror, notes: m.notes });
    cladding(wp.components_cladding && wp.components_cladding.pressures, out);
    return out;
  }
  if (wp.pressure_type === 'circular-bin' && (wp.pressure || wp.wall_cladding_pressures)) {
    out.family = 'circular_bin'; windCircularBin(wp, out);
    out.records = out.records.filter(r => r.p !== null);
    return out;
  }
  const p = wp.pressures;
  if (wp.forces) normalizeForces(wp, out);
  if (p === null || p === undefined) {
    out.family = out.forces.length ? 'forces' : 'none';
    return out;
  }
  const lists = Object.values(p).filter(Array.isArray);
  if (Array.isArray(p) && p.some(e => e && e.dirn)) { out.family = 'asce'; windAsce(p, out); }
  else if (Array.isArray(p) && p.some(e => e && e.p && typeof e.p === 'object')) { out.family = 'cladding'; cladding(p, out); }
  else if (Array.isArray(p) && p.some(e => e && e.pnet !== undefined)) { out.family = 'is875'; windIs875(p, out); }
  else if (Array.isArray(p) && p.some(e => e && Object.values(e).some(z => z && z.combined))) { out.family = 'cladding'; cladding(p, out); }
  else if (p.windward_pressure || p.roof_pressures_all_direction || (p.roof_pressures && !p.pz)) { out.family = 'as1170'; windAs1170(p, out); }
  else if (p.pz) { out.family = 'cfe'; windCfe(p, out); }
  else if (lists.some(l => l.some(e => e && e.p_net))) { out.family = 'nbcc'; windNbcc(p, out); }
  else if (lists.some(l => l.some(e => e && e.we !== undefined))) { out.family = 'en1991'; windEn1991(p, out); }
  else if (lists.some(l => l.some(e => e && e.location !== undefined && (e.min !== undefined || e.max !== undefined)))) { out.family = 'open_roof'; windOpenRoof(p, out); }
  else if (Array.isArray(p.pressures) && p.pressures.some(e => e && e.qe !== undefined)) { out.family = 'cte'; windCte(p, out); }
  else if (Object.keys(p).some(k => /^\d+deg$/.test(k))) { out.family = 'solar_panel'; windSolarAs(p, out); }
  else if (p['Wind Class']) { // AS 4055: deemed-to-comply table values, no directions or zones
    out.family = 'as4055';
    for (const [key, v] of Object.entries(p)) {
      if (!v || v.units === 'heading') continue;
      const vals = arr(v.value).map(num).filter(x => x !== null);
      out.summary.push({ key, label: v.label || key, info: v.info || null, value: vals.length ? vals : v.value, unit: v.units || null });
    }
    out.notes.push('AS 4055 gives a wind class and one general pressure pair per element (roof / wall, ULS and SLS), uplift and racking — no directions, zones or load cases, so there are no `records` to apply per face. Use `summary` for simple member checks or run as1170 for a frame model');
  } else {
    out.family = 'unsupported';
    out.notes.push('Pressure shape not normalized: read `wind_pressure.pressures` directly — see SKILL.md "Reading Other Outputs"');
  }
  out.records = out.records.filter(r => r.p !== null);
  // Opposite wind directions the API does not return: build them as mirrored load patterns
  const dirs = new Set(out.records.map(r => r.direction));
  for (const d of dirs) {
    if (d === 'along_L' || d === 'along_B') out.mirror.push({ direction: d, mirror_as: `${d}_neg` });
    else if (/^\d+$/.test(d) && +d < 180 && !dirs.has(String(+d + 180))) out.mirror.push({ direction: d, mirror_as: String(+d + 180) });
  }
  return out;
}

// ---------------------------------------------------------------- snow / seismic

function normalizeSnow(sp) {
  if (!sp || typeof sp !== 'object') return null;
  const b = sp.balance_case || {};
  const key = ['ps', 'pf', 'S', 's', 'sd'].find(k => num(b[k]) !== null) || null; // ASCE sloped ps, NBCC S
  return { unit: sp.pressure_unit || null, balanced: key ? num(b[key]) : null, balanced_key: key, balance_case: b, unbalanced: sp.unbalance_case || null, report_link: sp.report_link || null };
}

function normalizeSeismic(sf) {
  if (!sf || !sf.forces) return null;
  const f = sf.forces;
  const levels = [], notes = [];
  const add = (direction, list) => arr(list).forEach(e => e && levels.push({ direction, level: e.level ?? null, elevation: num(e.elevation), weight: num(e.weight), F: num(e.Fx ?? e.Fi ?? e.F) }));
  // NBCC / NSCP concentrated top force Ft: make sure it ends up in the top level's F exactly once
  const topForce = (direction, V, Ft) => {
    if (!(Ft > 0) || V === null) return;
    const ls = levels.filter(l => l.direction === direction && l.F !== null);
    if (!ls.length) return;
    const sum = ls.reduce((a, l) => a + l.F, 0), tol = 0.01 * Math.abs(V);
    if (Math.abs(sum + Ft - V) < tol) {
      ls.reduce((a, l) => (l.elevation > a.elevation ? l : a)).F += Ft;
      notes.push(`Ft = ${Ft} added to the top level (${direction}); storey F now sum to V`);
    } else if (Math.abs(sum - V) >= tol) notes.push(`Storey forces (${direction}) sum to ${sum}, not V = ${V} (Ft = ${Ft}): check the report`);
  };
  let V = num(f.V);
  if (f.vertical_distribution_forces) { add('both', f.vertical_distribution_forces); topForce('both', V, num(f.Ft)); } // same in X and Z
  for (const d of ['x_direction', 'z_direction', 'y_direction']) {
    if (f[d]) { add(d[0], f[d].vertical_distribution_forces); topForce(d[0], num(f[d].V), num(f[d].Ft)); if (V === null) V = num(f[d].V); }
  }
  return { unit: sf.force_unit || null, V, Ft: num(f.Ft), levels, notes };
}

// NSCP 2015 wind: Load Generator computes qz = 0.613·Kz·Kzt·Kd·V² with V still in kph (seen 2026-11-10),
// so every pressure is 3.6² = 12.96× too high. Flag it rather than silently rescale.
function checkNscpSpeed(d, wp, wind) {
  const par = wp && (wp.wind_parameters || wp.api_wind_parameters);
  const q = par && arr(par.qz)[0];
  const unit = d.wind_data && d.wind_data.wind_speed_unit;
  if (!q || !/kph|km/i.test(unit || '')) return;
  const V = num(q.V ?? par.V), ratio = num(q.qz) / (0.613 * num(q.Kz) * num(q.Kzt) * num(q.Kd) * V * V);
  if (Math.abs(ratio - 1) < 0.02) wind.notes.push(`BUG: qz was computed with V = ${V} kph used as m/s, so every pressure is ${(3.6 ** 2).toFixed(2)}× too high. Do not apply these values; report it to SkyCiv, or divide by 12.96 only with the engineer's agreement`);
}

// ---------------------------------------------------------------- main

function normalizeLoads(resp) {
  const r = unwrap(resp);
  const d = r.data || r;
  const wp = d.wind_pressure || null;
  const wind = wp ? normalizeWind(wp) : null;
  const snow = normalizeSnow(d.snow_pressure);
  const seismic = normalizeSeismic(d.seismic_forces);
  let pressureUnit = wp ? wp.pressure_unit || null : null;
  if (wind && wind.family === 'cte') { // API labels CTE "pa" but the values are kN/m² (results.js overwrites the calc's own unit)
    pressureUnit = 'kPa';
    wind.notes.push('CTE: values are kN/m² (the calc reports kPa); the API label "pa" is wrong — units.pressure corrected to kPa');
  }
  if (wind) checkNscpSpeed(d, wp, wind);
  const ok = !!(wp || snow || seismic);
  const site = d.wind_data || d.snow_data ? {
    wind_speed: num(d.wind_data && d.wind_data.wind_speed), wind_speed_unit: (d.wind_data && d.wind_data.wind_speed_unit) || null,
    snow_load: num(d.snow_data && d.snow_data.snow_load), snow_load_unit: (d.snow_data && d.snow_data.snow_load_unit) || null,
  } : null;
  const reason = ok ? null
    : r.status === 0 && site ? 'site_only: no building_data (or no wind/snow/seismic parameters) was sent, so only site values came back — see `site`'
    : `failed: ${r.msg || 'no wind_pressure / snow_pressure / seismic_forces in the reply'}`;
  return {
    ok, reason,
    status: r.status ?? null,
    msg: r.msg || '',
    errors: r.errors || [],
    warnings: r.warnings || [],
    report_link: (wp && wp.report_link) || (d.snow_pressure && d.snow_pressure.report_link) || null,
    units: {
      pressure: pressureUnit,
      length: wp ? (wp.elevation_or_location_unit || '').trim() || null : null,
      force: seismic ? seismic.unit : null, // wind.forces[] carry their own unit
    },
    site, wind, snow, seismic,
  };
}

// Load group name to use in S3D, e.g. W_along_L_case1, W_0_case3
// Mirrored pattern (wind.mirror): groupName(rec, m.mirror_as) → W_270_case1 / W_along_L_neg_case1
const groupName = (rec, direction = rec.direction) => `W_${direction}_case${rec.case}`;

// ---------------------------------------------------------------- request lint

const CODES = ['asce7-10', 'asce7-16', 'asce7-22', 'as1170', 'as4055', 'en1991', 'nbcc2015', 'nbcc2020', 'is875', 'nscp2015', 'cfe-viento', 'cfe-viento-2020', 'cte-db-se', 'sans10160'];
const ROOFS = ['gable', 'monoslope', 'hip', 'pitched', 'troughed', 'open-monoslope', 'skillion'];
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function checkRequest(req) {
  const issues = [];
  const err = (code, field, message) => issues.push({ level: 'error', code, field, message });
  const warn = (code, field, message) => issues.push({ level: 'warning', code, field, message });
  let a = req;
  if (Array.isArray(req)) req = { functions: req }; // bare functions list
  if (req && Array.isArray(req.functions)) {
    const fns = req.functions.map(f => f.function);
    if (fns[0] !== 'standalone.loads.start') err('SESSION', 'functions[0]', 'First function must be standalone.loads.start (S3D.session.start breaks standalone.loads.* calls)');
    if (fns.includes('S3D.session.start')) err('SESSION', 'functions', 'Do not mix S3D.session.start with standalone.loads.* in one request — use two requests');
    const g = req.functions.find(f => /standalone\.loads\.(getLoads|getSiteData)/.test(f.function));
    if (!g) { err('MISSING_FIELD', 'functions', 'No standalone.loads.getLoads / getSiteData call'); return issues; }
    a = g.arguments || {};
  }
  const sd = a.site_data || {}, bd = a.building_data || {};
  const code = sd.design_code;
  if (!code) err('MISSING_FIELD', 'site_data.design_code', 'design_code is required');
  else if (code === 'asce7') err('INVALID_ENUM', 'site_data.design_code', 'Use a versioned ASCE value: asce7-10, asce7-16 or asce7-22');
  else if (!CODES.includes(code)) err('INVALID_ENUM', 'site_data.design_code', `Unknown design_code "${code}"; expected one of ${CODES.join(', ')}`);
  if (code === 'cfe-viento-2020') warn('UNVERIFIED', 'site_data.design_code', 'cfe-viento-2020 is listed for Mexico but only site data is wired in the Load Generator; getLoads results are not handled — use cfe-viento');
  if (code === 'sans10160') warn('UNVERIFIED', 'site_data.design_code', 'sans10160 getLoads failed with "Error on server calcs" in every test (2026-11-10); check status and msg');
  if (bd && bd.design_code && code && bd.design_code !== code) err('INCOMPATIBLE_COMBO', 'building_data.design_code', `building_data.design_code (${bd.design_code}) must equal site_data.design_code (${code})`);
  if (!sd.project_address && !(num(sd.lat) !== null && num(sd.lng) !== null)) err('MISSING_FIELD', 'site_data.project_address', 'Give project_address, or both lat and lng');
  if (sd.wind_direction !== undefined) warn('WRONG_PLACE', 'site_data.wind_direction', 'wind_direction belongs in site_data.topography.wind_direction');
  const wd = sd.topography && sd.topography.wind_direction;
  if (wd !== undefined && !DIRS.includes(wd) && code !== 'en1991') warn('INVALID_ENUM', 'site_data.topography.wind_direction', `Expected one of ${DIRS.join(', ')}`);
  if (code === 'as1170' && sd.ari === undefined && sd.sls_and_uls === undefined) err('MISSING_FIELD', 'site_data.sls_and_uls', 'as1170 needs ari or sls_and_uls (the call fails with "sls_and_uls is not defined")');
  for (const k of ['wind_speed_override', 'snow_load_override', 'hourly_wind_pressure_override']) {
    if (sd[k] !== undefined && sd[k] !== null && sd[k] !== '' && sd[k] !== false) warn('USER_OVERRIDE', `site_data.${k}`, `${k} replaces the API map value — keep it only if the user supplied it`);
  }
  if (/^nbcc/.test(code || '') && String(a.api_version) === '2') err('INVALID_VALUE', 'api_version', 'NBCC getLoads times out on api_version 2 — omit api_version');
  if (!a.building_data || typeof a.building_data !== 'object') {
    if (req && Array.isArray(req.functions) && req.functions.some(f => /getLoads/.test(f.function))) warn('SITE_ONLY', 'building_data', 'No building_data: getLoads returns site values only (wind speed, snow load), no pressures or forces');
    return issues;
  }
  const structure = bd.structure || 'building';
  // Structure names / aliases / codes as matched in check_valid.js, api_functions.js and results.js
  const STRUCTURES = {
    building: null, freestandingwall: ['asce7-10', 'asce7-16', 'asce7-22', 'as1170', 'nbcc2015', 'nbcc2020', 'en1991'],
    'truss-tower': ['asce7-10', 'asce7-16'], signboard: ['en1991'], solar_panel: ['asce7-16', 'asce7-22', 'as1170'],
    pole: ['en1991', 'as1170'], 'rooftop-equipment': ['asce7-16', 'asce7-22'], 'open-frames': ['asce7-16', 'asce7-22'],
    'circular-bin': ['asce7-16', 'asce7-22', 'as1170'],
  };
  const ALIAS = { freestanding_wall: 'freestandingwall', trusstower: 'truss-tower', truss_tower: 'truss-tower', 'solar-panel': 'solar_panel', circular_bin: 'circular-bin' };
  const NEAR = { rooftop_equipment: 'rooftop-equipment', open_frames: 'open-frames' };
  const canon = ALIAS[structure] || structure;
  if (NEAR[structure]) err('INVALID_ENUM', 'building_data.structure', `"${structure}" is not recognised by the wind calculation (no wind_pressure) — send "${NEAR[structure]}"`);
  else if (!(canon in STRUCTURES)) err('INVALID_ENUM', 'building_data.structure', `Unknown structure "${structure}"; expected one of ${Object.keys(STRUCTURES).join(', ')}`);
  else if (STRUCTURES[canon] && code && !STRUCTURES[canon].includes(code)) err('INCOMPATIBLE_COMBO', 'building_data.structure', `${canon} wind is only available for ${STRUCTURES[canon].join(', ')}, not ${code}`);
  else if (canon !== 'building' && bd.wind_parameters !== false) {
    const dk = `${canon.replace(/-/g, '_').replace('truss_tower', 'trusstower')}_dimensions`;
    if (!bd[dk]) warn('MISSING_FIELD', `building_data.${dk}`, `${canon} reads its geometry from ${dk} — copy the sample-api template`);
  }
  if (bd.roof_profile === 'flat') err('INVALID_ENUM', 'building_data.roof_profile', 'There is no "flat" profile: send "gable" with building_dimensions.roof_angle 0');
  else if (bd.roof_profile && !ROOFS.includes(bd.roof_profile)) err('INVALID_ENUM', 'building_data.roof_profile', `Expected one of ${ROOFS.join(', ')}`);
  const wpar = bd.wind_parameters;
  if (wpar && typeof wpar === 'object' && structure === 'building') {
    const st = wpar.structure_type;
    const asceLike = /^asce|^nscp/.test(code || '');
    const open = ['pitched', 'troughed', 'open-monoslope'].includes(bd.roof_profile);
    // Allowed values per check_valid.js checkPairingOfRoofEnclosureStructure (enclosed / open roof)
    const ALLOWED = {
      'asce7-16': [['mwfrs', 'cladding', 'mwfrs_cladding'], null], 'asce7-22': [['mwfrs', 'cladding', 'mwfrs_cladding'], null],
      'asce7-10': [['mwfrs', 'cladding'], null], nscp2015: [['mwfrs', 'cladding'], null],
      nbcc2015: [['mwfrs', 'cladding'], null], nbcc2020: [['mwfrs', 'cladding'], null],
      as1170: [['building', 'cladding'], ['free_roof']], is875: [['building', 'cladding'], null],
      en1991: [['building'], ['free_roof']], 'cte-db-se': [['building'], ['free_roof']], sans10160: [['building'], ['free_roof']],
      'cfe-viento': [['building'], ['free_roof']],
    }[code];
    if (ALLOWED && bd.roof_profile && ROOFS.includes(bd.roof_profile)) {
      const list = (open && ALLOWED[1]) || ALLOWED[0];
      const defaults = { as1170: 'building', en1991: 'building', 'cte-db-se': 'building', sans10160: 'building' };
      const sent = st === 'free-roof' ? 'free_roof' : st;
      const eff = sent ?? (code === 'cfe-viento' ? list[0] : defaults[code] || list[0]);
      if (!list.includes(eff)) err('INVALID_VALUE', 'building_data.wind_parameters.structure_type',
        `${code} ${open ? 'open' : 'enclosed'} roof (${bd.roof_profile}) takes ${list.map(x => `"${x}"`).join(' / ')}, not ${sent === undefined ? `the default "${eff}" — send it explicitly` : `"${st}"`} (fails "structure_type is not applicable to roof_profile defined", no wind_pressure)`);
    }
    if (!wpar.structure_level && code !== 'as4055') warn('DEFAULT_APPLIED', 'building_data.wind_parameters.structure_level', 'Omitted: API uses a single level at 3 m. Send one {floor_level, floor_elevation} per floor to get a pressure profile');
    if (asceLike && !wpar.enclosure) warn('DEFAULT_APPLIED', 'building_data.wind_parameters.enclosure', 'Set enclosure explicitly (enclosed / partially-enclosed / partially-open / open)');
    if (asceLike && wpar.enclosure && open !== (wpar.enclosure === 'open')) err('INCOMPATIBLE_COMBO', 'building_data.wind_parameters.enclosure', `roof_profile "${bd.roof_profile}" needs enclosure ${open ? '"open"' : 'enclosed / partially-enclosed / partially-open'}`);
  }
  const dim = bd.building_dimensions || {};
  // NBCC validates eave_height / ground_to_top on every building call, even seismic-only (wind_parameters: false)
  if (structure === 'building' && /^nbcc/.test(code || ''))
    for (const k of ['eave_height', 'ground_to_top']) if (dim[k] === undefined) err('MISSING_FIELD', `building_data.building_dimensions.${k}`, `NBCC needs ${k} (even without wind: "${k} is not defined")`);
  if (structure === 'building' && wpar !== false) {
    if (/^nbcc/.test(code || '')) {
      if (num(dim.reference_height) !== null && num(dim.reference_height) < 6) err('OUT_OF_RANGE', 'building_data.building_dimensions.reference_height', 'NBCC reference_height must be >= 6 m (else no pressures)');
    } else if (code === 'as4055') {
      for (const k of ['length', 'width', 'roof_angle', 'ground_to_top']) if (dim[k] === undefined) err('MISSING_FIELD', `building_data.building_dimensions.${k}`, `AS 4055 needs ${k}`);
    } else {
      for (const k of ['length', 'width', 'roof_angle']) if (dim[k] === undefined) err('MISSING_FIELD', `building_data.building_dimensions.${k}`, `${k} is required`);
      // height key differs by code: ASCE/AS mean_roof_height, EN/CTE ground_to_top, IS 875 reference_height
      if (!['mean_roof_height', 'ground_to_top', 'reference_height', 'height'].some(k => dim[k] !== undefined))
        err('MISSING_FIELD', 'building_data.building_dimensions.mean_roof_height', 'Give the building height (mean_roof_height for ASCE/AS/NSCP; ground_to_top for EN 1991/CTE; reference_height for IS 875) — copy the sample-api template for this code');
    }
  }
  return issues;
}

// ---------------------------------------------------------------- CLI / self-test

function selfTest() {
  const fs = require('fs'), path = require('path'), assert = require('assert');
  const dir = path.join(__dirname, '..', 'sample-api');
  let n = 0;
  for (const f of fs.readdirSync(dir).sort()) {
    const o = path.join(dir, f, 'output.json'), i = path.join(dir, f, 'input.json');
    if (fs.existsSync(i)) {
      const iss = checkRequest(JSON.parse(fs.readFileSync(i, 'utf8')));
      const errs = iss.filter(x => x.level === 'error');
      console.log(`${errs.length ? 'LINT' : 'ok  '} ${f} input: ${errs.length} error(s)${errs.length ? ' — ' + errs.map(e => e.field).join(', ') : ''}`);
    }
    if (!fs.existsSync(o)) continue;
    const res = normalizeLoads(JSON.parse(fs.readFileSync(o, 'utf8')));
    const w = res.wind;
    assert(!w || w.records.every(r => Number.isFinite(r.p)), `${f}: non-numeric p`);
    assert(!w || w.forces.every(r => Number.isFinite(r.F)), `${f}: non-numeric F`);
    if (/getLoads/.test(f)) { // every getLoads sample must give something applicable, or say why not
      const got = (w && (w.records.length || w.cladding.length || w.forces.length || w.summary.length)) || (res.seismic && res.seismic.levels.length) || (res.snow && res.snow.balanced !== null);
      assert(got || res.reason, `${f}: nothing normalized and no reason`);
      assert(!w || !['unsupported', 'none'].includes(w.family), `${f}: wind family ${w && w.family}`);
    }
    console.log(`     ${f} output: ${res.ok ? '' : 'NOT OK (' + res.reason + ') '}wind=${w ? `${w.family}:${w.records.length}+${w.cladding.length}cc+${w.forces.length}F${w.summary.length ? '+' + w.summary.length + 'S' : ''}${w.mirror.length ? ' mirror ' + w.mirror.map(m => m.mirror_as).join(',') : ''}` : '-'} snow=${res.snow ? res.snow.balanced_key : '-'} seismic=${res.seismic ? res.seismic.levels.length + ' levels' : '-'}`);
    n++;
  }
  // Spot checks against hand-read values in the sample outputs
  const load = f => normalizeLoads(JSON.parse(fs.readFileSync(path.join(dir, f, 'output.json'), 'utf8')));
  const find = (res, q) => res.wind.records.find(r => Object.entries(q).every(([k, v]) => r[k] === v));
  const as = load('loads.getLoads_as1170');
  assert.strictEqual(as.wind.family, 'as1170');
  assert(Math.abs(find(as, { direction: '0', surface: 'windward_wall', case: 1 }).p - 568.4) < 1, 'as1170 windward case 1');
  const en = load('loads.getLoads_en1991_uk');
  const enw = find(en, { direction: '0', surface: 'Windward Wall', case: 1 });
  assert(Math.abs(enw.p - 199.3715) < 0.01, 'en1991 case 1 = we - wi_max');
  const cfe = load('loads.getLoads_cfe_viento_gable');
  assert.strictEqual(find(cfe, { direction: '0', surface: 'windward', case: 1 }).p, 1840.5755);
  assert.strictEqual(find(cfe, { direction: '0', surface: 'roof_windward', case: 1 }).p, -1803.764);
  const nbcc = load('loads.getLoads_nbcc');
  assert.strictEqual(nbcc.wind.family, 'nbcc');
  const nz = load('loads.getLoads_nzs1170_seismic_bothdir');
  assert.strictEqual(nz.seismic.levels.filter(l => l.direction === 'x')[0].F, 73.703905);
  const asce = load('loads.getLoads_asce716_seismic');
  assert.strictEqual(asce.seismic.levels[0].F, 4.256);
  // New families (2026-11-10)
  const findF = (res, q) => res.wind.forces.find(r => Object.entries(q).every(([k, v]) => r[k] === v));
  const tank = load('loads.getLoads_asce722_circular_bin');
  assert.strictEqual(tank.wind.family, 'circular_bin');
  assert.strictEqual(findF(tank, { surface: 'wall', component: 'along' }).F, 116764.22);
  assert.strictEqual(find(tank, { surface: 'roof', zone: 'zone_1', case: 1 }).p, -32.110637);
  const cc0 = tank.wind.cladding.find(c => c.zone === 'wall_0deg');
  assert.deepStrictEqual([cc0.p_min, cc0.p_max], [30.61712, 44.058782]);
  const cp = load('loads.getLoads_cfe_viento_pitched');
  assert.strictEqual(cp.wind.family, 'open_roof');
  assert.strictEqual(find(cp, { direction: '0', zone: 'Barlovento', case: 2 }).p, 736.2302);
  const cte = load('loads.getLoads_cte_db_se_open_monoslope');
  assert.strictEqual(cte.wind.family, 'cte'); assert.strictEqual(cte.units.pressure, 'kPa');
  assert.strictEqual(find(cte, { surface: 'windward' }).p, 1.7082813);
  const sol = load('loads.getLoads_as1170_solar_panel_ground');
  assert(Math.abs(find(sol, { direction: '0', surface: 'upwind_row', zone: 'windward_edge' }).p - 1385.528) < 0.01, 'as solar');
  assert.strictEqual(find(sol, { direction: '180', surface: 'downwind_row', zone: 'leeward_inner' }).p < 0, true);
  assert.strictEqual(findF(load('loads.getLoads_as1170_freestandingwall'), { direction: '45' }).e, 2);
  assert.strictEqual(findF(load('loads.getLoads_asce_freestandingwall'), { case: 'C', location: '0 to s' }).F, 4630.1568);
  assert.strictEqual(findF(load('loads.getLoads_en1991_signboard'), { surface: 'signboard' }).F, 281304.58);
  assert.strictEqual(findF(load('loads.getLoads_en1991_pole'), { surface: 'pole' }).location, 'height/2');
  assert.strictEqual(findF(load('loads.getLoads_asce716_rooftop_equipment'), { direction: '0', component: 'vertical' }).F, 345.89007);
  assert(Math.abs(findF(load('loads.getLoads_asce722_solar_panel_ground'), { surface: 'zone_1', case: 'max', component: 'normal' }).F - 1257.644) < 0.01, 'asce ground solar Fn');
  assert.deepStrictEqual(load('loads.getLoads_as4055').wind.summary.find(x => x.key === 'ult_2').value, [0.6, -0.95]);
  const de = load('loads.getLoads_en1991_germany'); // roof F has Cpe +0.14 / -1.14: cases 3/4 from the second
  assert.strictEqual(find(de, { direction: '0', zone: 'F', case: 3 }).p, -1566.969);
  assert(find(de, { direction: '0', surface: 'Windward Wall', case: 3 }), 'walls carried into case 3');
  assert.deepStrictEqual(en.wind.mirror, [{ direction: '90', mirror_as: '270' }]);
  assert.deepStrictEqual(as.wind.mirror, []);
  assert.deepStrictEqual(load('loads.getLoads_asce').wind.mirror.map(m => m.mirror_as), ['along_L_neg', 'along_B_neg']);
  assert(load('loads.getLoads_nscp2015_mwfrs').wind.notes.some(x => /kph/.test(x)), 'nscp kph bug flagged');
  assert(/^site_only/.test(load('loads.getLoads_asce_wind_only').reason));
  const nb = load('loads.getLoads_nbcc2020_seismic').seismic;
  assert(Math.abs(nb.levels.reduce((a, l) => a + l.F, 0) - nb.V) < 0.01 * nb.V, 'nbcc storey forces sum to V');
  // structure names (2026-11-10)
  const sn = (code, structure) => checkRequest({ site_data: { design_code: code, project_address: 'x' }, building_data: { design_code: code, structure, wind_parameters: false } })
    .filter(x => x.field === 'building_data.structure' && x.level === 'error').length > 0;
  for (const [c, n, bad] of [['asce7-16', 'rooftop_equipment', true], ['asce7-16', 'rooftop-equipment', false], ['asce7-22', 'open_frames', true],
    ['nbcc2020', 'freestanding_wall', false], ['asce7-22', 'truss_tower', true], ['en1991', 'pole', false], ['asce7-16', 'pole', true], ['as1170', 'circular_bin', false], ['as1170', 'shed', true]])
    assert.strictEqual(sn(c, n), bad, `structure lint ${c} ${n}`);
  // structure_type allow-list (check_valid.js)
  const st = (code, roof_profile, structure_type) => checkRequest({ site_data: { design_code: code, project_address: 'x', sls_and_uls: true },
    building_data: { design_code: code, structure: 'building', roof_profile, building_dimensions: { length: 1, width: 1, roof_angle: 0, mean_roof_height: 6, ground_to_top: 6, eave_height: 6, reference_height: 6 },
      wind_parameters: { structure_type, structure_level: [], enclosure: ['pitched', 'troughed', 'open-monoslope'].includes(roof_profile) ? 'open' : 'enclosed' } } })
    .some(x => x.field === 'building_data.wind_parameters.structure_type' && x.level === 'error');
  for (const [c, r, t, bad] of [['asce7-16', 'gable', 'building', true], ['asce7-10', 'gable', 'mwfrs_cladding', true], ['asce7-22', 'gable', 'mwfrs_cladding', false],
    ['nbcc2020', 'gable', 'building', true], ['is875', 'gable', 'mwfrs', true], ['is875', 'gable', 'cladding', false], ['as1170', 'open-monoslope', 'building', true],
    ['as1170', 'open-monoslope', 'free_roof', false], ['en1991', 'pitched', undefined, true], ['en1991', 'gable', 'cladding', true], ['cfe-viento', 'pitched', undefined, false],
    ['cte-db-se', 'open-monoslope', 'free-roof', false]])
    assert.strictEqual(st(c, r, t), bad, `structure_type lint ${c} ${r} ${t}`);
  assert(checkRequest({ functions: [{ function: 'S3D.session.start' }, { function: 'standalone.loads.getLoads', arguments: { site_data: { design_code: 'asce7', project_address: 'x' }, building_data: { roof_profile: 'flat' } } }] }).filter(x => x.level === 'error').length >= 3, 'lint catches session/code/roof');
  console.log(`\nself-test passed (${n} outputs normalized)`);
}

if (require.main === module) {
  const fs = require('fs');
  const [flag, file] = process.argv.slice(2);
  if (flag === '--self-test') selfTest();
  else if (flag === '--check' && file) {
    const iss = checkRequest(JSON.parse(fs.readFileSync(file, 'utf8')));
    console.log(JSON.stringify(iss, null, 2));
    process.exit(iss.some(i => i.level === 'error') ? 1 : 0);
  } else if (flag && fs.existsSync(flag)) console.log(JSON.stringify(normalizeLoads(JSON.parse(fs.readFileSync(flag, 'utf8'))), null, 2));
  else { console.error('usage: normalize_loads.js <output.json> | --check <input.json> | --self-test'); process.exit(2); }
}

module.exports = { normalizeLoads, checkRequest, groupName };
