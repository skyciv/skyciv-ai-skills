(function () {
  'use strict';

  const viewer = new SKYCIV.renderer({ container_selector: '#renderer-container' });

  let lastModel = null; // { s3d_model, layout }
  let lastApiRequest = null; // SkyCiv API request envelope (credentials redacted)

  const el = (id) => document.getElementById(id);

  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      const cfg = await res.json();
      const badge = el('credsBadge');
      if (cfg.hasCredentials) {
        badge.textContent = 'SkyCiv credentials configured';
        badge.classList.add('ok');
      } else {
        badge.textContent = 'No SkyCiv API key found in .env';
        badge.classList.add('bad');
      }
      el('speciesGradeField').textContent = `${cfg.species} ${cfg.grade}`;
      el('spacingField').textContent = `${cfg.spacingFt * 12} in o.c.`;
    } catch (e) {
      el('credsBadge').textContent = 'Could not reach server';
      el('credsBadge').classList.add('bad');
    }
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

  function renderMemberTable(ranked) {
    const tbody = document.querySelector('#memberTable tbody');
    tbody.innerHTML = '';
    ranked.forEach((r) => {
      const tr = document.createElement('tr');
      const ratio = r.utilizationRatio != null ? r.utilizationRatio.toFixed(3) : '-';
      const resultCell = r.quickDesignError
        ? `<span class="badge bad" title="${r.quickDesignError}">no result</span>`
        : `<span class="badge ${r.designCheck === 'PASS' ? 'ok' : 'bad'}">${r.designCheck || '-'}</span>`;
      const qdLink = r.openLink ? `<a href="${r.openLink}" target="_blank" rel="noopener noreferrer">Open</a>` : '-';
      tr.innerHTML = `
        <td>#${r.memberId}</td>
        <td>${r.role}</td>
        <td>${r.lengthFt.toFixed(1)}</td>
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
        <td>${r.role}</td>
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
    addLink('Analysis model (open in S3D)', modelLink && modelLink.view_link);
    addLink('Analysis model (public share link)', modelLink && modelLink.public_link);
    if (critical) {
      addLink(`Member #${critical.memberId} (${critical.role}) - NDS report`, critical.report);
      addLink(`Member #${critical.memberId} (${critical.role}) - open in Quick Design`, critical.openLink);
    }
    // Also surface reports for any other member that failed, in case it isn't the single worst ratio.
    (ranked || [])
      .filter((r) => r !== critical && r.designCheck === 'FAIL' && r.report)
      .slice(0, 4)
      .forEach((r) => addLink(`Member #${r.memberId} (${r.role}) - NDS report`, r.report));
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
        `S3D analysis ran and checked ${design.totalMembers} members, but the NDS Quick Design ` +
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

    el('criticalMemberLabel').textContent = critical
      ? `Member #${critical.memberId} (${critical.role}, L = ${critical.lengthFt.toFixed(1)} ft, ${critical.comboName || 'combo ' + critical.comboId})`
      : 'none identified';

    renderMemberTable(ranked);
    renderReactionTable(reactions);
    renderReportLinks(critical, ranked, modelLink);
  }

  // Step 1: pure local geometry generation - no SkyCiv API call, so this always
  // succeeds instantly and the JSON/download/CAD/renderer view never depend on the
  // SkyCiv API being reachable or credentials being valid.
  async function generateModelOnly() {
    const body = {
      spanFt: Number(el('spanFt').value),
      heightFt: Number(el('heightFt').value),
      trussType: el('trussType').value,
      sectionKey: el('sectionKey').value,
      deadPsf: Number(el('deadPsf').value),
      sheetingPsf: Number(el('sheetingPsf').value),
      snowPsf: Number(el('snowPsf').value),
      windPsf: Number(el('windPsf').value),
    };
    const res = await fetch('/api/model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || 'Failed to generate model');
    return payload; // { s3d_model, layout }
  }

  // Build the SkyCiv API request envelope locally from the model so it can be
  // downloaded before analysis is run (credentials are placeholder-only).
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

  async function handleGenerate() {
    setError('genError', null);
    setError('analyzeError', null);
    const btn = el('generateBtn');
    btn.disabled = true;
    btn.textContent = 'Generating model…';

    let model;
    try {
      model = await generateModelOnly();
      lastModel = model;
      lastApiRequest = buildApiRequest(model.s3d_model);
      console.log('Generated s3d_model (also available via "View analysis model (JSON)"):', model.s3d_model);

      el('viewModelBtn').disabled = false;
      el('downloadJsonBtn').disabled = false;
      el('downloadApiBtn').disabled = false;
      el('cadBtn').disabled = false;
      el('cadResult').classList.add('hidden');
      setError('cadError', null);

      try {
        renderModel(model.s3d_model);
        setError('rendererError', null);
      } catch (renderErr) {
        console.error('Renderer failed to draw the model:', renderErr);
        setError('rendererError', `Renderer failed to draw the model: ${renderErr.message}. Use "View analysis model (JSON)" to inspect the raw data.`);
      }
    } catch (e) {
      setError('genError', e.message);
      btn.disabled = false;
      btn.textContent = 'Generate & Analyze';
      return;
    }

    btn.textContent = 'Analyzing…';
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(model),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Analysis failed');
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

  // Checks every section size in the dropdown (against the current span/type/height/
  // loads) and picks the smallest one that passes every member, then re-runs the normal
  // generate & analyze flow with that section selected so the whole results panel
  // (reactions, CAD-ready state, links) reflects the recommended section.
  async function handleOptimize() {
    setError('optimizeError', null);
    const btn = el('optimizeBtn');
    btn.disabled = true;
    btn.textContent = 'Optimizing… (checking all sections)';
    el('optimizeResult').classList.add('hidden');

    try {
      const body = {
        spanFt: Number(el('spanFt').value),
        heightFt: Number(el('heightFt').value),
        trussType: el('trussType').value,
        deadPsf: Number(el('deadPsf').value),
        sheetingPsf: Number(el('sheetingPsf').value),
        snowPsf: Number(el('snowPsf').value),
        windPsf: Number(el('windPsf').value),
      };
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Optimization failed');

      const box = el('optimizeResult');
      box.innerHTML = '';
      const list = document.createElement('div');
      list.className = 'optimize-list';
      payload.results.forEach((r) => {
        const row = document.createElement('div');
        row.className = 'optimize-row' + (r.sectionKey === payload.recommended ? ' recommended' : '');
        const ratio = r.maxRatio != null ? r.maxRatio.toFixed(3) : 'n/a';
        const status = r.passes ? 'PASS' : (r.anyMissing ? 'no result' : 'FAIL');
        row.innerHTML = `<span>${r.label}${r.sectionKey === payload.recommended ? ' ★' : ''}</span><span>${ratio}</span><span class="badge ${r.passes ? 'ok' : 'bad'}">${status}</span>`;
        list.appendChild(row);
      });
      box.appendChild(list);
      box.classList.remove('hidden');

      if (payload.recommended) {
        el('sectionKey').value = payload.recommended;
        btn.textContent = `Recommended: ${payload.results.find((r) => r.sectionKey === payload.recommended)?.label} - running full analysis…`;
        await handleGenerate();
      } else {
        setError('optimizeError', 'No section could be checked successfully - see rows above.');
      }
    } catch (e) {
      setError('optimizeError', e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Optimize Section';
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
        body: JSON.stringify(lastModel),
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
    a.download = `truss-model-${el('spanFt').value}ft-span-${el('trussType').value}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadApiResponse() {
    if (!lastApiRequest) return;
    const blob = new Blob([JSON.stringify(lastApiRequest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truss-api-request-${el('spanFt').value}ft-span-${el('trussType').value}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  el('generateBtn').addEventListener('click', handleGenerate);
  el('optimizeBtn').addEventListener('click', handleOptimize);
  el('cadBtn').addEventListener('click', handleGenerateCad);
  el('viewModelBtn').addEventListener('click', handleViewModel);
  el('copyJsonBtn').addEventListener('click', handleCopyJson);
  el('downloadJsonBtn').addEventListener('click', handleDownloadJson);
  el('downloadApiBtn').addEventListener('click', handleDownloadApiResponse);
  el('closeModalBtn').addEventListener('click', () => el('modelModal').classList.add('hidden'));

  // Rebuild and re-render the model whenever any input changes, debounced so rapid
  // number-spinner clicks don't fire multiple requests.
  let inputDebounceTimer = null;
  function handleInputChange() {
    clearTimeout(inputDebounceTimer);
    inputDebounceTimer = setTimeout(async () => {
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
    }, 300);
  }
  ['spanFt', 'heightFt', 'trussType', 'sectionKey', 'deadPsf', 'sheetingPsf', 'snowPsf', 'windPsf']
    .forEach((id) => el(id).addEventListener('input', handleInputChange));

  // Pre-build the model on load so download/view buttons are available immediately.
  async function initModel() {
    try {
      const model = await generateModelOnly();
      lastModel = model;
      lastApiRequest = buildApiRequest(model.s3d_model);
      el('viewModelBtn').disabled = false;
      el('downloadJsonBtn').disabled = false;
      el('downloadApiBtn').disabled = false;
      el('cadBtn').disabled = false;
      try {
        renderModel(model.s3d_model);
        setError('rendererError', null);
      } catch (renderErr) {
        console.error('Renderer failed on initial load:', renderErr);
        setError('rendererError', `Renderer failed: ${renderErr.message}`);
      }
    } catch (e) {
      console.error('Initial model generation failed:', e);
    }
  }

  loadConfig();
  initModel();
})();
