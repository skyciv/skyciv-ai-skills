'use strict';

require('dotenv').config();
const path = require('path');
const express = require('express');

const { buildTrussModel, TRUSS_TYPES, SECTION_SIZES, SPACING_FT } = require('./trussModel');
const { runSession, SkyCivError } = require('./skycivClient');
const { findAllMemberDesigns, getReactionSummary, buildDeflectionMap } = require('./designCheck');
const { buildCadData } = require('./cadDrawing');
const { SPECIES, GRADE } = require('./quickDesignClient');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/config', (req, res) => {
  res.json({
    trussTypes: TRUSS_TYPES,
    sectionSizes: Object.fromEntries(Object.entries(SECTION_SIZES).map(([k, v]) => [k, v.label])),
    species: SPECIES,
    grade: GRADE,
    spacingFt: SPACING_FT,
    hasCredentials: Boolean(process.env.SKYCIV_API_KEY && process.env.SKYCIV_USERNAME),
    hasQuickDesignToken: Boolean(process.env.SKYCIV_QD_TOKEN || process.env.SKYCIV_API_KEY),
  });
});

// Pure local geometry generation - no SkyCiv API call, so it always succeeds instantly
// regardless of credentials/network, and the JSON is available even if analysis fails.
app.post('/api/model', (req, res) => {
  try {
    const { spanFt, heightFt, trussType, sectionKey, deadPsf, sheetingPsf, snowPsf, windPsf } = req.body;
    const { s3d_model, layout } = buildTrussModel({
      spanFt: Number(spanFt),
      heightFt: Number(heightFt),
      trussType,
      sectionKey,
      deadPsf: Number(deadPsf),
      sheetingPsf: Number(sheetingPsf),
      snowPsf: Number(snowPsf),
      windPsf: Number(windPsf),
    });
    res.json({ s3d_model, layout });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { s3d_model, layout } = req.body;
    if (!s3d_model || !layout) throw new Error('s3d_model and layout are required - generate a model first.');

    // Strength envelope must only use the factored ASCE 7-22 LRFD combos - the two
    // unfactored "Service: ..." combos in the model exist purely to drive the real
    // deflection check below and must never be mixed into the strength check.
    const strengthComboIds = layout.strengthComboIds;
    const { live: liveComboId, total: totalComboId } = layout.serviceComboIds;

    // Real per-member deflection (see designCheck.js's extractGoverningUtilization
    // comment) needs each top-chord member's actual deflected shape under the two
    // service-level combos - one S3D.results.fetchMemberResult call per member per
    // combo. This only covers the top chord (the only members carrying transverse load
    // in this model - the bottom chord and webs have no meaningful transverse
    // deflection), and is appended to this same session rather than a separate one, so
    // it doesn't pay for a second solve. This is real API cost (confirmed against the
    // live API: concurrent sessions do NOT parallelize this well - it's cheaper to
    // batch it all into one session than to split it into concurrent ones).
    const deflectionFetchCalls = layout.topChordMemberIds.flatMap((memberId) => [
      { function: 'S3D.results.fetchMemberResult', arguments: { member_id: Number(memberId), LC: [Number(liveComboId)], res_key: 'displacement', type: 'array' } },
      { function: 'S3D.results.fetchMemberResult', arguments: { member_id: Number(memberId), LC: [Number(totalComboId)], res_key: 'displacement', type: 'array' } },
    ]);

    // Session 1: set + solve + save-for-a-link + top-chord deflection fetches (must succeed)
    const modelFileName = `truss-${Date.now()}`;
    const solveFunctions = [
      { function: 'S3D.model.set', arguments: { s3d_model } },
      {
        function: 'S3D.model.solve',
        arguments: {
          analysis_type: 'linear',
          repair_model: true,
          result_filter: ['member_forces', 'reactions'],
          lc_filter: ['load_combo'],
        },
      },
      { function: 'S3D.file.save', arguments: { name: modelFileName, path: 'truss-designer/', public_share: true } },
      ...deflectionFetchCalls,
    ];
    const solveEnvelope = await runSession(solveFunctions);

    // functions[0] = session.start, [1] = model.set, [2] = model.solve, [3] = file.save,
    // [4..] = deflection fetches (live, total, live, total, ... per top-chord member)
    const solveResult = solveEnvelope.functions[2];
    const saveResult = solveEnvelope.functions[3];
    const isUrl = (v) => typeof v === 'string' && /^https?:\/\//.test(v);
    const modelLink = {
      view_link: isUrl(saveResult?.data) ? saveResult.data : null,
      public_link: isUrl(saveResult?.public_link) ? saveResult.public_link : null,
    };

    const deflectionResults = solveEnvelope.functions.slice(4);
    const liveFetchResults = layout.topChordMemberIds.map((_, i) => deflectionResults[i * 2]);
    const totalFetchResults = layout.topChordMemberIds.map((_, i) => deflectionResults[i * 2 + 1]);
    const deflectionByMember = buildDeflectionMap(layout.topChordMemberIds, liveFetchResults, totalFetchResults);

    const design = await findAllMemberDesigns({ solveFunctionResult: solveResult, comboIds: strengthComboIds, s3dModel: s3d_model, layout, deflectionByMember });
    const reactions = getReactionSummary({ solveFunctionResult: solveResult, comboIds: strengthComboIds, s3dModel: s3d_model, layout });

    res.json({
      solve: solveResult,
      modelLink,
      design,
      reactions,
      _apiRequest: {
        auth: { username: 'YOUR_USERNAME', key: 'YOUR_API_KEY' },
        options: { validate_input: false },
        functions: [
          { function: 'S3D.session.start', arguments: { keep_open: true } },
          ...solveFunctions,
        ],
      },
    });
  } catch (err) {
    console.error(err);
    const status = err instanceof SkyCivError ? 502 : 400;
    res.status(status).json({ error: err.message, envelope: err.envelope ?? null });
  }
});

// Checks every section size in the dropdown for the given span/type/height/loads and
// recommends the smallest (by cross-sectional area) that passes every member - runs
// each candidate's solve + NDS batch concurrently (independent SkyCiv sessions) so the
// wall-clock cost stays close to that of a single /api/analyze call, not N of them.
//
// Strength only - deliberately does NOT fetch real per-member deflection (unlike
// /api/analyze), since that costs ~1 extra API round-trip per top-chord member and
// would multiply across every candidate section here. The full /api/analyze call that
// automatically follows a recommendation is the authoritative check, including
// deflection - if the recommended section turns out to fail deflection there, that
// will show up immediately in the results panel.
app.post('/api/optimize', async (req, res) => {
  try {
    const { spanFt, heightFt, trussType, deadPsf, sheetingPsf, snowPsf, windPsf } = req.body;
    const inputs = {
      spanFt: Number(spanFt),
      heightFt: Number(heightFt),
      trussType,
      deadPsf: Number(deadPsf),
      sheetingPsf: Number(sheetingPsf),
      snowPsf: Number(snowPsf),
      windPsf: Number(windPsf),
    };

    const sectionKeys = Object.keys(SECTION_SIZES).sort(
      (a, b) => SECTION_SIZES[a].b * SECTION_SIZES[a].d - SECTION_SIZES[b].b * SECTION_SIZES[b].d
    );

    const results = await Promise.all(sectionKeys.map(async (sectionKey) => {
      try {
        const { s3d_model, layout } = buildTrussModel({ ...inputs, sectionKey });
        const comboIds = layout.strengthComboIds;
        const solveEnvelope = await runSession([
          { function: 'S3D.model.set', arguments: { s3d_model } },
          {
            function: 'S3D.model.solve',
            arguments: { analysis_type: 'linear', repair_model: true, result_filter: ['member_forces'], lc_filter: ['load_combo'] },
          },
        ]);
        const solveResult = solveEnvelope.functions[2];
        const design = await findAllMemberDesigns({ solveFunctionResult: solveResult, comboIds, s3dModel: s3d_model, layout });
        const ratios = design.ranked.map((r) => r.utilizationRatio).filter((v) => v != null);
        const anyMissing = design.ranked.some((r) => r.quickDesignError);
        const maxRatio = ratios.length ? Math.max(...ratios) : null;
        return {
          sectionKey,
          label: SECTION_SIZES[sectionKey].label,
          area: SECTION_SIZES[sectionKey].b * SECTION_SIZES[sectionKey].d,
          maxRatio,
          passes: !anyMissing && maxRatio != null && maxRatio <= 1.0,
          anyMissing,
          totalMembers: design.totalMembers,
        };
      } catch (err) {
        return { sectionKey, label: SECTION_SIZES[sectionKey].label, area: SECTION_SIZES[sectionKey].b * SECTION_SIZES[sectionKey].d, maxRatio: null, passes: false, anyMissing: true, error: err.message };
      }
    }));

    const passing = results.filter((r) => r.passes).sort((a, b) => a.area - b.area);
    const recommended = passing.length
      ? passing[0].sectionKey
      : [...results].filter((r) => r.maxRatio != null).sort((a, b) => a.maxRatio - b.maxRatio)[0]?.sectionKey ?? null;

    res.json({ results, recommended, allPass: passing.length === results.length });
  } catch (err) {
    console.error(err);
    const status = err instanceof SkyCivError ? 502 : 400;
    res.status(status).json({ error: err.message, envelope: err.envelope ?? null });
  }
});

app.post('/api/cad', async (req, res) => {
  try {
    const { s3d_model, layout } = req.body;
    if (!s3d_model || !layout) throw new Error('s3d_model and layout are required - generate a model first.');

    const cad_data = buildCadData({ s3d_model, layout });
    const fileName = `truss-${Date.now()}`;

    const envelope = await runSession([
      { function: 'cloudcad.model.create', arguments: { cad_data } },
      { function: 'cloudcad.file.save', arguments: { name: fileName, path: 'truss-designer/', public_share: true } },
    ]);

    const saveResult = envelope.functions[2];
    const isUrl = (v) => typeof v === 'string' && /^https?:\/\//.test(v);
    res.json({
      view_link: isUrl(saveResult?.data) ? saveResult.data : null,
      public_link: isUrl(saveResult?.public_link) ? saveResult.public_link : null,
    });
  } catch (err) {
    console.error(err);
    const status = err instanceof SkyCivError ? 502 : 400;
    res.status(status).json({ error: err.message, envelope: err.envelope ?? null });
  }
});

const port = process.env.PORT || 4100;
app.listen(port, () => {
  console.log(`Truss Designer running at http://localhost:${port}`);
});
