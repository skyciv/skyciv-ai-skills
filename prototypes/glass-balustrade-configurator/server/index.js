'use strict';

require('dotenv').config();
const path = require('path');
const express = require('express');

const { buildBalustradeModel } = require('./balustradeModel');
const { getWindPressure } = require('./windLoads');
const { runSession, SkyCivError } = require('./skycivClient');
const { findAllPostDesigns, getReactionSummary } = require('./designCheck');
const { buildCadData } = require('./cadDrawing');
const { POST_TYPES, HANDRAIL_SECTION } = require('./sectionCatalogue');
const { CLASSIFICATIONS, BALUSTRADE_LOAD_TABLE, getBalustradeLoad } = require('./balustradeLoadTable');
const { ALLOY, TEMPER } = require('./quickDesignClient');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const TERRAIN_CATEGORIES = ['CAT1', 'CAT2', 'CAT2.5', 'CAT3', 'CAT4'];
const IMPORTANCE_LEVELS = [
  { value: '1', label: '1 - Low consequence of failure' },
  { value: '2', label: '2 - Normal structures' },
  { value: '3', label: '3 - Structures with high occupancy' },
  { value: '4', label: '4 - Post-disaster / essential' },
];

app.get('/api/config', (req, res) => {
  res.json({
    postTypes: Object.fromEntries(Object.entries(POST_TYPES).map(([k, v]) => [k, {
      label: v.label,
      sections: v.sections.map((s) => s.name),
    }])),
    handrailSection: HANDRAIL_SECTION,
    classifications: CLASSIFICATIONS,
    balustradeLoadTable: BALUSTRADE_LOAD_TABLE,
    terrainCategories: TERRAIN_CATEGORIES,
    importanceLevels: IMPORTANCE_LEVELS,
    alloy: ALLOY,
    temper: TEMPER,
    hasCredentials: Boolean(process.env.SKYCIV_API_KEY && process.env.SKYCIV_USERNAME),
    hasQuickDesignToken: Boolean(process.env.SKYCIV_QD_TOKEN || process.env.SKYCIV_API_KEY),
  });
});

function parseModelInputs(body) {
  const {
    runLengthM, spacingMmTarget, handrailHeightMm, glassHeightMm,
    postType, postSectionName, classification, lineLoadKn, pointLoadKn, pressurePa,
  } = body;
  const load = classification ? getBalustradeLoad(classification) : null;
  return {
    runLengthM: Number(runLengthM),
    spacingMmTarget: Number(spacingMmTarget),
    handrailHeightMm: Number(handrailHeightMm),
    glassHeightMm: Number(glassHeightMm),
    postType,
    postSectionName,
    // The occupancy-classification table only supplies the *default* - the UI always
    // sends the (possibly user-edited) lineLoadKn/pointLoadKn values explicitly.
    lineLoadKn: lineLoadKn != null ? Number(lineLoadKn) : load?.lineLoadKn ?? 0,
    pointLoadKn: pointLoadKn != null ? Number(pointLoadKn) : load?.pointLoadKn ?? 0,
    pressurePa: pressurePa != null ? Number(pressurePa) : 0,
  };
}

// Pure local geometry generation - no SkyCiv API call, so it always succeeds instantly
// regardless of credentials/network, and the JSON is available even if analysis fails.
app.post('/api/model', (req, res) => {
  try {
    const { s3d_model, layout } = buildBalustradeModel(parseModelInputs(req.body));
    res.json({ s3d_model, layout });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Resolves AS 1170.2 wind pressure at the balustrade's elevation - kept as its own
// endpoint (rather than folded into /api/analyze) so the UI can show the resolved
// site/wind data before running the full solve+design-check, per CLAUDE.md's "show
// partial results along the way" transparency note.
app.post('/api/wind', async (req, res) => {
  try {
    const { address, buildingHeightM, buildingLengthM, buildingWidthM, elevationM, importanceLevel, terrainCategory } = req.body;
    const wind = await getWindPressure({
      address,
      buildingHeightM: Number(buildingHeightM),
      buildingLengthM: Number(buildingLengthM),
      buildingWidthM: Number(buildingWidthM),
      elevationM: Number(elevationM),
      importanceLevel,
      terrainCategory,
    });
    res.json(wind);
  } catch (err) {
    console.error(err);
    const status = err instanceof SkyCivError ? 502 : 400;
    res.status(status).json({ error: err.message, envelope: err.envelope ?? null });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { s3d_model, layout } = req.body;
    if (!s3d_model || !layout) throw new Error('s3d_model and layout are required - generate a model first.');

    const strengthComboIds = layout.strengthComboIds;

    const modelFileName = `balustrade-${Date.now()}`;
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
      { function: 'S3D.file.save', arguments: { name: modelFileName, path: 'glass-balustrade-configurator/', public_share: true } },
    ];
    const solveEnvelope = await runSession(solveFunctions);

    // functions[0] = session.start, [1] = model.set, [2] = model.solve, [3] = file.save
    const solveResult = solveEnvelope.functions[2];
    const saveResult = solveEnvelope.functions[3];
    const isUrl = (v) => typeof v === 'string' && /^https?:\/\//.test(v);
    const modelLink = {
      view_link: isUrl(saveResult?.data) ? saveResult.data : null,
      public_link: isUrl(saveResult?.public_link) ? saveResult.public_link : null,
    };

    const design = await findAllPostDesigns({ solveFunctionResult: solveResult, comboIds: strengthComboIds, layout });
    const reactions = getReactionSummary({ solveFunctionResult: solveResult, comboIds: strengthComboIds, layout });

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

app.post('/api/cad', async (req, res) => {
  try {
    const { layout } = req.body;
    if (!layout) throw new Error('layout is required - generate a model first.');

    const cad_data = buildCadData({ layout });
    const fileName = `balustrade-${Date.now()}`;

    const envelope = await runSession([
      { function: 'cloudcad.model.create', arguments: { cad_data } },
      { function: 'cloudcad.file.save', arguments: { name: fileName, path: 'glass-balustrade-configurator/', public_share: true } },
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

const port = process.env.PORT || 4200;
app.listen(port, () => {
  console.log(`Glass Balustrade Configurator running at http://localhost:${port}`);
});
