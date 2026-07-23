---
name: renderer
description: Renderer Agent — embeds the SkyCiv 3D Renderer (SKYCIV.renderer) client-side to visualize S3D structural models and analysis results in the browser
---

# Renderer Agent

You are an agent that incorporates the SkyCiv 3D Renderer into web-based solutions. Unlike the `S3D.*` API namespaces (server-side, called via HTTP), the renderer is a **client-side JavaScript library** that runs in the user's browser to visualize an `s3d_model` and its analysis results in interactive 3D.

Use this skill whenever a solution needs to **show** a structural model or its results — a viewer page, a results dashboard, an embedded model preview, or an automated screenshot/report pipeline.

> **Relationship to the API:** The renderer does not solve or store models — it only displays them. Get the `s3d_model` and `analysis_results` from the `S3D.*` API (see the `s3d-api` skill: `S3D.model.get`, `S3D.file.open`, `S3D.results.get`) and pass them into the renderer, or build/edit the `s3d_model` object directly client-side.

---

## Setup

Include the renderer script and a container element with a defined size (the renderer sizes itself to its container, so the container must not be `0×0`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="https://api.skyciv.com/dist/v3/javascript/skyciv-renderer-dist.js"></script>
</head>
<body>
  <div id="renderer-container" style="width: 100%; height: 500px; position: relative;"></div>
  <script src="/path/to/initRenderer.js"></script>
</body>
</html>
```

Pin a specific version instead of the latest `skyciv-renderer-dist.js` for production stability if a versioned build is available.

---

## Initialization

```javascript
const viewer = new SKYCIV.renderer({
  container_selector: '#renderer-container',
});

const s3d_model = {}; // from S3D.model.get / S3D.file.open, or built directly
viewer.model.set(s3d_model);
viewer.model.buildStructure();
viewer.render();
```

Nothing is drawn until `viewer.render()` is called — always call it after `model.set` + `buildStructure`, and again after any subsequent update.

> **Open question, not yet verified**: a live UI that regenerates and re-renders the model repeatedly (debounced input-driven preview) has been observed to intermittently show a stale/unchanged view after the first render, and separately, passing a second (callback) argument to `model.set()` was tried as a fix and instead broke rendering entirely (nothing displayed at all) - so that is confirmed **not** the right fix and must not be reintroduced. The root cause of the original staleness symptom is still unconfirmed - do not assume `model.set()` is asynchronous or accepts a callback until this is verified against the live library (e.g. by inspecting `skyciv-renderer-dist.js` directly or testing in an actual browser). If you hit this symptom, treat it as unsolved and investigate fresh rather than reapplying either of the patterns above.

---

## Core Viewer Methods

| Method | Purpose |
|---|---|
| `setMode(mode)` | Switch display mode: `'model'` or `'results'` |
| `setView(view, custom_position, zoom)` | Set camera angle (e.g. `'top'`, `'front'`, `'iso'`, or a custom position) |
| `render(callback, dont_call_model_update)` | Draw/refresh the current state to the canvas |
| `refresh()` | Full rebuild and re-render (use after major structural changes) |
| `clear()` | Remove all rendered content from the viewer |
| `resize()` | Recompute canvas size — call after the container element's size changes (e.g. layout/resize events, or when creating multiple instances) |

---

## `viewer.model` — Loading and Building the Model

### `viewer.model.set(s3d_model, callback)`

Loads or updates the model. Accepts the same `s3d_model` JSON object used by the `S3D.*` API (see the `s3d-api` skill for the full schema).

### `viewer.model.buildStructure(run_update)`

Converts the loaded model into the internal format the renderer draws. **Required after every `model.set()`** before calling `render()`. Pass `run_update: true` to trigger a subsequent render pass automatically.

### `viewer.model.get()`

Returns the currently loaded `s3d_model`. Useful for reading back and mutating settings in place:

```javascript
const s3d_model = viewer.model.get();
s3d_model.settings.vertical_axis = "Z";
viewer.model.set(s3d_model);
viewer.model.buildStructure();
viewer.render();
```

---

## `viewer.results` — Visualizing Analysis Results

### `viewer.results.set(analysis_results, callback)`

Applies solved results to the model. `analysis_results` is the object returned by `S3D.results.get` / `S3D.model.solve`, indexed by load combination — pass a single load combination's results (e.g. `analysis_results[1][0]`).

### `viewer.results.setSettings(settings_object)`

| Key | Type | Description |
|---|---|---|
| `deformation_scale` | `float` | Deformation exaggeration, roughly `0`–`5` |
| `members` | `boolean` | Show member force/stress contours |
| `plates` | `boolean` | Show plate contours |
| `plate_elements` | `boolean` | Show individual meshed plate elements |
| `current_result_key` | `string` | Active result type, e.g. `"displacement"` |

### `viewer.results.deformedStructure()` / `viewer.results.runDeformationAnimation(settings_object)`

`deformedStructure()` renders a static deformed shape at the current scale. `runDeformationAnimation()` animates the transition, accepting the same settings shape as `setSettings`.

### Full results workflow

```javascript
function setResults() {
  viewer.results.set(analysis_results[1][0]);
  viewer.setMode('results');
  viewer.results.setSettings({
    deformation_scale: 3,
    members: false,
    plates: false,
    current_result_key: 'displacement',
  });
  viewer.results.deformedStructure();
  viewer.render();
}
```

---

## `viewer.screenshot` — Exporting Images

| Method | Purpose |
|---|---|
| `screenshot.get({axis, background, callback})` | Returns base64 PNG data via callback — use for embedding in reports or sending to a server |
| `screenshot.save({axis, background, filename})` | Triggers a browser download of the screenshot |

`axis` toggles axis display; `background` sets a custom background color for the export.

---

## `viewer.mouse` — Interactivity

| Method | Purpose |
|---|---|
| `enable()` | Activate click/hover interaction on the canvas |
| `selectObject(type, id)` | Programmatically highlight an element — `type` is `'node'`, `'member'`, or `'plate'` |
| `getSelectedObjects(type)` | Retrieve currently selected element(s), optionally filtered by `type` |
| `setOnObjectClickFunction(callback)` | Register a callback fired when the user clicks an element in the viewer |

```javascript
viewer.mouse.enable();
viewer.mouse.setOnObjectClickFunction(function (obj) {
  console.log('Clicked:', obj.type, obj.id);
});
```

---

## `viewer.settings` — Display Configuration

`viewer.settings.set(object)` / `viewer.settings.get()` control 40+ display properties: display mode, projection, element visibility, colors, opacity/transparency, lighting, and shadows.

```javascript
const settingsObject = viewer.settings.get();
settingsObject.opacity = 0.5;
settingsObject.colors = false;
viewer.render();
```

> **Tip:** Mutate the object returned by `settings.get()` in place, then call `render()` — there is no need to re-pass the whole object to `settings.set()` unless replacing it wholesale.
>
> **Confirmed exception — element visibility (e.g. loads):** these settings live under a nested `visibility` sub-object (`settings.visibility.loads`, `settings.visibility.load_labels`, presumably other element-visibility toggles too — verify each one, don't assume), not flat top-level keys. Applying a change to them needs an explicit `viewer.settings.set(settings)` call **and** `viewer.refresh()` afterward (a full rebuild+re-render) — plain `render()` after mutating in place was tried first and did not apply the change. See "Default display behaviour" below for the corrected, confirmed-working pattern.

---

## Multiple Renderer Instances

Each `new SKYCIV.renderer(...)` targets one container and is fully independent — use this for side-by-side model/results views, before/after comparisons, or a dashboard with several models:

```javascript
const viewer_1 = new SKYCIV.renderer({ container_selector: '#renderer-container-1' });
viewer_1.model.set(s3d_model_1);
viewer_1.model.buildStructure();
viewer_1.render();

const viewer_2 = new SKYCIV.renderer({ container_selector: '#renderer-container-2' });
viewer_2.model.set(s3d_model_2);
viewer_2.model.buildStructure();
viewer_2.render();

// Call resize() on each after any layout change (e.g. panel resize, tab switch)
viewer_1.resize();
viewer_2.resize();
```

---

## Integrating with the S3D API

The typical pattern for a solution that both solves and displays a model:

1. Build/solve the model server-side via the `S3D.*` API (`S3D.model.set`, `S3D.model.solve`) — see the `s3d-api` skill.
2. Return the `s3d_model` and `analysis_results` to the browser (e.g. via `response_data_only` or your own backend endpoint).
3. Client-side: `viewer.model.set(s3d_model)` → `viewer.model.buildStructure()` → `viewer.render()`.
4. To show results: `viewer.results.set(analysis_results[...])` → `viewer.setMode('results')` → `viewer.render()`.
5. Optionally capture a screenshot (`viewer.screenshot.get`) to embed in a generated report instead of re-solving/re-rendering server-side.

---

## Terms of Use

Individual/personal use of the renderer is free provided the SkyCiv logo is retained in the viewer. **Commercial deployment (embedding in a product or client-facing app) requires a licensed agreement with SkyCiv** — flag this to the user before building a commercial integration.

## Default display behaviour

Apply these two patterns by default whenever a prototype builds/solves a model.

### Turn on loads automatically

After `buildStructure()`, check whether the model has any load objects and — if so — enable load display and load labels before `render()`:

> **Load keys are ID-keyed objects, not arrays.** `point_loads`, `distributed_loads`, `area_loads`, `moments`, `pressures`, `settlements` etc. are all shaped `{"1": {...}, "2": {...}}` in a real `s3d_model` (see `s3d-api/SKILLS.md`'s own worked examples) — never a JS array. An `Array.isArray(s3d_model[k])` check is therefore always `false` against a real model, so a `hasLoads()` built that way silently never detects any loads and this whole block becomes a no-op — confirmed as a real bug in two of this repo's own prototype apps, which had exactly this code and still required manually clicking the renderer's own "Loads" toggle. Check for a non-empty object, not `Array.isArray`.

```javascript
function hasLoads(s3d_model) {
  if (!s3d_model) return false;
  const loadKeys = ['point_loads', 'distributed_loads', 'area_loads', 'moments', 'pressures', 'settlements'];
  return loadKeys.some((k) => {
    const v = s3d_model[k];
    if (!v || typeof v !== 'object') return false;
    return Array.isArray(v) ? v.some((x) => x != null) : Object.keys(v).length > 0;
  });
}

viewer.model.set(s3d_model);
viewer.model.buildStructure();
if (hasLoads(s3d_model)) {
  // Loads visibility lives under a nested `visibility` sub-object, not top-level
  // settings keys. refresh() (not render()) is required to actually apply it - see the
  // "Confirmed exception" note under "viewer.settings" above.
  const settings = viewer.settings.get();
  settings.visibility.loads = true;
  settings.visibility.load_labels = true;
  viewer.settings.set(settings);
  viewer.refresh();
} else {
  viewer.render();
}
```

### Pre-load analysis results

After a solve completes, seed the renderer with the first available load combination's results so the user can switch into results view without a re-solve. Do **not** call `viewer.setMode('results')` here — just load the data:

```javascript
// payload.solve.data is the object returned by S3D.model.solve
if (payload.solve && payload.solve.data) {
  const lcKeys = Object.keys(payload.solve.data);
  if (lcKeys.length > 0) {
    try { viewer.results.set(payload.solve.data[lcKeys[0]][0]); } catch (e) {}
  }
}
```

Both patterns are implemented in the prototype apps (`prototypes/*/public/app.js`) as reference.

---

## Recommendations
 - It looks better when the background of the renderer is transparent. Don't put a css background on the renderer container
 - It's very handy to be able to download the JSON of what you're displaying, so you can simply import the model direct into S3D if needed. So good idea to have a Download Model button over the renderer. Since you can generate this model client side, you don't need to run the API to provide this JSON. i.e. allow the user to download this JSON anytime, regardless of whether the API has been run or not
 - When building a UI that dynamically builds a model, remember to update the renderer in real-time. It creates a better user experience
 - When using the Renderer, if the space is available on the UI make this a big part of the screen (i.e. go full height if possible)