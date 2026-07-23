(function () {
  'use strict';

  const viewer = new SKYCIV.renderer({ container_selector: '#renderer-container' });

  let lastModel = null; // { s3d_model, layout }
  let lastApiRequest = null; // SkyCiv API request envelope (credentials redacted)
  let lastWind = null; // last /api/wind response ({ pressurePa, windRegion, ... })
  let config = null; // /api/config payload

  const el = (id) => document.getElementById(id);

  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      config = await res.json();
      const badge = el('credsBadge');
      if (config.hasCredentials) {
        badge.textContent = 'SkyCiv credentials configured';
        badge.classList.add('ok');
      } else {
        badge.textContent = 'No SkyCiv API key found in .env';
        badge.classList.add('bad');
      }

      const postTypeSelect = el('postType');
      postTypeSelect.innerHTML = '';
      Object.entries(config.postTypes).forEach(([key, val]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = val.label;
        postTypeSelect.appendChild(opt);
      });
      populatePostSections();

      const classSelect = el('classification');
      classSelect.innerHTML = '';
      config.classifications.forEach((key) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = config.balustradeLoadTable[key].label;
        if (key === 'C2') opt.selected = true;
        classSelect.appendChild(opt);
      });
      applyClassificationDefaults();

      const terrainSelect = el('terrainCategory');
      terrainSelect.innerHTML = '';
      config.terrainCategories.forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (cat === 'CAT2') opt.selected = true;
        terrainSelect.appendChild(opt);
      });

      const importanceSelect = el('importanceLevel');
      importanceSelect.innerHTML = '';
      config.importanceLevels.forEach((lvl) => {
        const opt = document.createElement('option');
        opt.value = lvl.value;
        opt.textContent = lvl.label;
        if (lvl.value === '2') opt.selected = true;
        importanceSelect.appendChild(opt);
      });

      el('handrailSectionField').textContent = `${config.handrailSection.name} CHS`;
      el('alloyField').textContent = `${config.alloy} ${config.temper}`;
    } catch (e) {
      el('credsBadge').textContent = 'Could not reach server';
      el('credsBadge').classList.add('bad');
    }
  }

  function populatePostSections() {
    const postType = el('postType').value;
    const sectionSelect = el('postSectionName');
    sectionSelect.innerHTML = '';
    const sections = config.postTypes[postType]?.sections || [];
    sections.forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sectionSelect.appendChild(opt);
    });
  }

  function applyClassificationDefaults() {
    const key = el('classification').value;
    const entry = config?.balustradeLoadTable?.[key];
    if (!entry) return;
    el('lineLoadKn').value = entry.lineLoadKn;
    el('pointLoadKn').value = entry.pointLoadKn;
  }

  function setError(id, message) {
    const box = el(id);
    if (!message) {
      box.classList.add('hidden');
      box.textContent = '';
      return;
    }
    box.textContent = message;
    box.classList.remove('hidden');
  }

  // s3d_model load keys (point_loads, distributed_loads, area_loads, moments,
  // settlements, pressures) are ID-keyed OBJECTS ({"1": {...}}), not arrays - confirmed
  // against s3d-api/SKILLS.md's own worked examples. An Array.isArray() check here is
  // always false for a real model, so it silently never turns loads display on -
  // check for a non-empty object (or array, just in case) instead.
  function hasLoads(s3d_model) {
    if (!s3d_model) return false;
    const loadKeys = ['point_loads', 'distributed_loads', 'area_loads', 'moments', 'pressures', 'settlements'];
    return loadKeys.some((k) => {
      const v = s3d_model[k];
      if (!v || typeof v !== 'object') return false;
      return Array.isArray(v) ? v.some((x) => x != null) : Object.keys(v).length > 0;
    });
  }

  function renderModel(s3d_model) {
    viewer.model.set(s3d_model);
    viewer.model.buildStructure();
    if (hasLoads(s3d_model)) {
      // Loads visibility lives under a nested `visibility` sub-object, not top-level
      // settings keys - confirmed working. refresh() (not render()) is required to
      // actually apply it (a full rebuild+re-render), per renderer/SKILLS.md.
      const settings = viewer.settings.get();
      settings.visibility.loads = true;
      settings.visibility.load_labels = true;
      viewer.settings.set(settings);
      viewer.refresh();
    } else {
      viewer.render();
    }
  }

  function gatherModelInputs() {
    return {
      runLengthM: Number(el('runLengthM').value),
      spacingMmTarget: Number(el('spacingMmTarget').value),
      handrailHeightMm: Number(el('handrailHeightMm').value),
      glassHeightMm: Number(el('glassHeightMm').value),
      postType: el('postType').value,
      postSectionName: el('postSectionName').value,
      classification: el('classification').value,
      lineLoadKn: Number(el('lineLoadKn').value),
      pointLoadKn: Number(el('pointLoadKn').value),
      pressurePa: lastWind ? lastWind.pressurePa : 0,
    };
  }

  function gatherWindInputs() {
    return {
      address: el('address').value,
      buildingHeightM: Number(el('buildingHeightM').value),
      buildingLengthM: Number(el('buildingLengthM').value),
      buildingWidthM: Number(el('buildingWidthM').value),
      elevationM: Number(el('elevationM').value),
      importanceLevel: el('importanceLevel').value,
      terrainCategory: el('terrainCategory').value,
    };
  }

  // Pure local geometry generation - no SkyCiv API call, so this always succeeds
  // instantly and the JSON/download/CAD/renderer view never depend on the SkyCiv API
  // being reachable or credentials being valid.
  async function generateModelOnly() {
    const res = await fetch('/api/model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gatherModelInputs()),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Failed to generate model');
    return payload; // { s3d_model, layout }
  }

  function buildApiRequest(s3d_model) {
    return {
      auth: { username: 'YOUR_USERNAME', key: 'YOUR_API_KEY' },
      options: { validate_input: false },
      functions: [
        { function: 'S3D.session.start', arguments: { keep_open: true } },
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
      ],
    };
  }

  async function refreshModelPreview() {
    try {
      const model = await generateModelOnly();
      lastModel = model;
      lastApiRequest = buildApiRequest(model.s3d_model);
      el('viewModelBtn').disabled = false;
      el('downloadJsonBtn').disabled = false;
      el('downloadApiBtn').disabled = false;
      el('cadBtn').disabled = false;
      renderModel(model.s3d_model);
      setError('rendererError', null);
      setError('genError', null);
    } catch (e) {
      setError('rendererError', e.message);
    }
    return lastModel;
  }

  async function handleResolveWind() {
    setError('windError', null);
    const btn = el('resolveWindBtn');
    btn.disabled = true;
    btn.textContent = 'Resolving wind load…';
    try {
      const res = await fetch('/api/wind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gatherWindInputs()),
      });
      const payload = await res.json();
      if (!res.ok) {
        // Log the full envelope (includes the raw SkyCiv API response) - the error
        // banner only shows the message text, but the full response is often needed
        // to tell an auth/credentials failure apart from a request-shape bug.
        console.error('Wind load lookup failed - full server response:', payload);
        throw new Error(payload.error || 'Wind load lookup failed');
      }
      lastWind = payload;

      const box = el('windSummary');
      const speed = payload.windSpeed && typeof payload.windSpeed === 'object'
        ? `${payload.windSpeed.ultimate ?? payload.windSpeed.ultimate_NCC ?? '-'} m/s (ultimate)`
        : `${payload.windSpeed ?? '-'} m/s`;
      const reportRow = payload.reportLink
        ? `<div class="wind-report-link"><a href="${payload.reportLink}" target="_blank" rel="noopener noreferrer">Open AS 1170.2 Wind Load Report</a></div>`
        : '';
      box.innerHTML = `
        <div><span>Wind region</span><strong>${payload.windRegion ?? '-'}</strong></div>
        <div><span>Terrain category</span><strong>${payload.terrainCategory ?? '-'}</strong></div>
        <div><span>Design wind speed</span><strong>${speed}</strong></div>
        <div><span>Governing direction</span><strong>${payload.governingDirection ?? '-'}°</strong></div>
        <div><span>Design pressure</span><strong>${payload.pressurePa.toFixed(0)} Pa</strong></div>
        ${reportRow}
      `;
      box.classList.remove('hidden');

      await refreshModelPreview();
    } catch (e) {
      setError('windError', e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Resolve Wind Load';
    }
  }

  function renderPostTable(ranked) {
    const tbody = document.querySelector('#postTable tbody');
    tbody.innerHTML = '';
    ranked.forEach((r) => {
      const tr = document.createElement('tr');
      const ratio = r.utilizationRatio != null ? r.utilizationRatio.toFixed(3) : '-';
      const resultCell = r.quickDesignError
        ? `<span class="badge bad" title="${r.quickDesignError}">no result</span>`
        : `<span class="badge ${r.designCheck === 'PASS' ? 'ok' : 'bad'}">${r.designCheck || '-'}</span>`;
      const qdLink = r.openLink ? `<a href="${r.openLink}" target="_blank" rel="noopener noreferrer">Open</a>` : '-';
      tr.innerHTML = `
        <td>Post ${r.postIndex + 1}</td>
        <td>${r.section}</td>
        <td>${r.comboName || '-'}</td>
        <td>${ratio}</td>
        <td>${resultCell}</td>
        <td>${qdLink}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderReactionTable(reactions) {
    const tbody = document.querySelector('#reactionTable tbody');
    tbody.innerHTML = '';
    (reactions || []).forEach((r) => {
      const tr = document.createElement('tr');
      const forces = Object.entries(r.reactions || {})
        .map(([k, v]) => `${k}: ${v.toFixed(2)}`)
        .join(', ');
      tr.innerHTML = `
        <td>Post ${r.postIndex + 1}</td>
        <td>#${r.nodeId}</td>
        <td>${r.governingCombo ?? '-'}</td>
        <td>${forces || '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderReportLinks(critical, ranked, modelLink) {
    const ul = el('reportLinks');
    ul.innerHTML = '';
    const addLink = (label, href) => {
      if (!href) return;
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = label;
      li.appendChild(a);
      ul.appendChild(li);
    };
    // Always shown alongside the model/QD report links, same transparency principle -
    // the engineer needs to be able to open and review every underlying calc, not just
    // the final ratio. Present whenever wind has been resolved, independent of whether
    // this particular analyze run used it.
    addLink('AS 1170.2 Wind Load Report', lastWind && lastWind.reportLink);
    addLink('Analysis model (open in S3D)', modelLink && modelLink.view_link);
    addLink('Analysis model (public share link)', modelLink && modelLink.public_link);
    if (critical) {
      addLink(`Post ${critical.postIndex + 1} - AS/NZS 1664 report`, critical.report);
      addLink(`Post ${critical.postIndex + 1} - open in Quick Design`, critical.openLink);
    }
    (ranked || [])
      .filter((r) => r !== critical && r.designCheck === 'FAIL' && r.report)
      .slice(0, 4)
      .forEach((r) => addLink(`Post ${r.postIndex + 1} - AS/NZS 1664 report`, r.report));
    if (!ul.children.length) {
      ul.innerHTML = '<li>No reports available.</li>';
    }
  }

  function renderResults(payload) {
    const { design, reactions, modelLink } = payload;
    const critical = design.critical;
    const ranked = design.ranked || [];

    el('resultsEmpty').classList.add('hidden');
    el('resultsBody').classList.remove('hidden');

    const failedCount = ranked.filter((r) => r.quickDesignError).length;
    if (failedCount > 0) {
      el('designWarning').textContent =
        `S3D analysis ran and checked ${design.totalPosts} posts, but the AS/NZS 1664 Quick Design ` +
        `check did not return a result for ${failedCount} of them. See the "Check" column for details.`;
      el('designWarning').classList.remove('hidden');
    } else {
      el('designWarning').classList.add('hidden');
    }

    const ratio = critical && critical.utilizationRatio != null ? critical.utilizationRatio : null;
    el('ratioNumber').textContent = ratio != null ? ratio.toFixed(3) : 'N/A';

    const badge = el('ratioBadge');
    badge.classList.remove('ok', 'bad');
    const fill = el('ratioFill');
    fill.classList.remove('bad');
    if (ratio != null) {
      const pass = ratio <= 1.0;
      badge.textContent = pass ? 'PASS' : 'FAIL';
      badge.classList.add(pass ? 'ok' : 'bad');
      fill.style.width = `${Math.min(ratio, 1.5) / 1.5 * 100}%`;
      if (!pass) fill.classList.add('bad');
    } else {
      badge.textContent = 'N/A';
    }

    el('criticalPostLabel').textContent = critical
      ? `Post ${critical.postIndex + 1} (${critical.section}, ${critical.comboName || 'combo ' + critical.comboId})`
      : 'none identified';

    renderPostTable(ranked);
    renderReactionTable(reactions);
    renderReportLinks(critical, ranked, modelLink);
  }

  async function handleGenerate() {
    setError('genError', null);
    setError('analyzeError', null);
    const btn = el('generateBtn');
    btn.disabled = true;
    btn.textContent = 'Generating model…';

    let model;
    try {
      model = await refreshModelPreview();
      if (!model) throw new Error('Failed to generate model');
      console.log('Generated s3d_model (also available via "View analysis model (JSON)"):', model.s3d_model);
      el('cadResult').classList.add('hidden');
      setError('cadError', null);
    } catch (e) {
      setError('genError', e.message);
      btn.disabled = false;
      btn.textContent = 'Generate & Analyze';
      return;
    }

    if (!lastWind) {
      // Advisory only - this does NOT block the analyze call below (wind pressure
      // simply defaults to 0 via gatherModelInputs() if unresolved). Worded to make
      // that explicit, since an earlier version of this message read like a hard
      // requirement even though the code never actually gated on it.
      setError('genError', 'Wind load not resolved yet - proceeding with 0 Pa wind pressure. Click "Resolve Wind Load" first if you want wind included in this analysis.');
    }

    btn.textContent = 'Analyzing…';
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(model),
      });
      const payload = await res.json();
      if (!res.ok) {
        console.error('Analysis failed - full server response:', payload);
        throw new Error(payload.error || 'Analysis failed');
      }
      lastApiRequest = payload._apiRequest ?? lastApiRequest;
      el('downloadApiBtn').disabled = false;
      renderResults(payload);
      if (payload.solve && payload.solve.data) {
        const lcKeys = Object.keys(payload.solve.data);
        if (lcKeys.length > 0) {
          try { viewer.results.set(payload.solve.data[lcKeys[0]][0]); } catch (e) {}
        }
      }
    } catch (e) {
      setError('analyzeError', e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generate & Analyze';
    }
  }

  async function handleGenerateCad() {
    if (!lastModel) return;
    setError('cadError', null);
    const btn = el('cadBtn');
    btn.disabled = true;
    btn.textContent = 'Generating CAD drawing…';

    try {
      const res = await fetch('/api/cad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: lastModel.layout }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to generate CAD drawing');

      const box = el('cadResult');
      box.innerHTML = '';
      const addLink = (label, href) => {
        if (!href) return;
        const a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = label;
        box.appendChild(a);
      };
      addLink('Open CAD drawing', payload.view_link);
      addLink('Public share link', payload.public_link);
      box.classList.remove('hidden');
    } catch (e) {
      setError('cadError', e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generate CAD Drawing';
    }
  }

  function handleViewModel() {
    if (!lastModel) return;
    el('modelJson').textContent = JSON.stringify(lastModel.s3d_model, null, 2);
    el('modelModal').classList.remove('hidden');
  }

  async function handleCopyJson() {
    if (!lastModel) return;
    const text = JSON.stringify(lastModel.s3d_model, null, 2);
    const btn = el('copyJsonBtn');
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied!';
    } catch (e) {
      btn.textContent = 'Copy failed - select manually';
    } finally {
      setTimeout(() => { btn.textContent = 'Copy JSON'; }, 1500);
    }
  }

  function handleDownloadJson() {
    if (!lastModel) return;
    const blob = new Blob([JSON.stringify(lastModel.s3d_model, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balustrade-model-${el('runLengthM').value}m-run.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadApiResponse() {
    if (!lastApiRequest) return;
    const blob = new Blob([JSON.stringify(lastApiRequest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balustrade-api-request-${el('runLengthM').value}m-run.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  el('generateBtn').addEventListener('click', handleGenerate);
  el('resolveWindBtn').addEventListener('click', handleResolveWind);
  el('cadBtn').addEventListener('click', handleGenerateCad);
  el('viewModelBtn').addEventListener('click', handleViewModel);
  el('copyJsonBtn').addEventListener('click', handleCopyJson);
  el('downloadJsonBtn').addEventListener('click', handleDownloadJson);
  el('downloadApiBtn').addEventListener('click', handleDownloadApiResponse);
  el('closeModalBtn').addEventListener('click', () => el('modelModal').classList.add('hidden'));

  el('postType').addEventListener('change', () => { populatePostSections(); refreshModelPreview(); });
  el('classification').addEventListener('change', () => { applyClassificationDefaults(); refreshModelPreview(); });

  // Rebuild and re-render the model whenever any geometry/load input changes, debounced
  // so rapid number-spinner clicks don't fire multiple requests. Site/wind inputs are
  // NOT included here - resolving wind is its own explicit step (Resolve Wind Load).
  let inputDebounceTimer = null;
  function handleInputChange() {
    clearTimeout(inputDebounceTimer);
    inputDebounceTimer = setTimeout(refreshModelPreview, 300);
  }
  ['runLengthM', 'spacingMmTarget', 'handrailHeightMm', 'glassHeightMm', 'postSectionName', 'lineLoadKn', 'pointLoadKn']
    .forEach((id) => el(id).addEventListener('input', handleInputChange));

  async function init() {
    await loadConfig();
    await refreshModelPreview();
  }

  init();
})();
