---
name: s3d-apps
description: S3D Apps Builder — build custom embedded mini-apps (client-side JS/HTML) that run inside the SkyCiv Structural 3D (S3D) web application, reading/writing the live model and interacting with the 3D viewport and element selection
---

# S3D Apps Agent

You are an agent that builds **SkyCiv Apps** — custom, embeddable mini-apps that run *inside* the SkyCiv Structural 3D (S3D) web application. Unlike the `S3D.*` HTTP API (server-side, called over the network — see `skyciv-api-v3` / `s3d-api`), a SkyCiv App is client-side JavaScript + HTML that executes in the user's browser, inside an already-open S3D session, with direct synchronous access to the live model and viewport.

> **Relationship to other skills:**
> - The `s3d_model` object an app reads and writes is the **same schema** documented in full in the `s3d-api` skill (nodes, members, plates, sections, materials, supports, loads, load_combinations, settings, etc.). This skill does not repeat that schema — cross-reference `s3d-api` for field-level detail on any object you're building.
> - No auth/session calls are needed here — the app runs inside a session the user already has open. `skyciv-api-v3`'s auth/session/envelope material does not apply.
> - This is distinct from the `renderer` skill: `renderer` embeds a **standalone, external** 3D viewer in your own web page (fed by data fetched over the API). This skill builds a mini-app that lives **inside** the S3D application itself, using the model that's already loaded there.

---

## What is a SkyCiv App?

A SkyCiv App is a draggable window registered inside S3D that renders your own HTML/CSS/JS and can read or mutate the currently open model, react to what the user has selected in the 3D view, and show notifications — all without any network calls. Good use cases:

- **Bulk actions on the model** — e.g. auto-apply design loads to all beams, or only to currently selected members.
- **Parametric generators** — e.g. a balustrade/stair/truss builder that turns a few inputs (and a couple of selected nodes) into generated nodes, members, plates, and loads.
- **Model checks/automation** — scan the model for issues and highlight the offending elements.
- **Custom overlays** — screenshot or annotate the current view for a report.

> **Where should this UI actually live? Read this before scaffolding a floating window.**
> Everything above and below describes the floating **App window**
> (`SKYCIV_APPS.create`) — but this skill covers a second hosting mechanism,
> **`S3D.UI.leftMenu`** (see "Hosting inside the Left Menu" below), and for most of the
> use cases in the list above, the left menu is the **preferred** choice, not just an
> alternative.
>
> Default to the left menu for anything that's a **general feature meant to feel like a
> native part of S3D for every user** — a parametric generator (a truss builder, a
> balustrade/stair builder, ...), a bulk-load/model-check tool, anything you'd expect to
> see as a first-party S3D panel. It gets far more usable width for real form UI than a
> floating window, doesn't add another draggable icon/window for the user to manage, and
> reads as integrated rather than bolted-on. A truss generator is exactly this case: it's
> broadly useful to any S3D user modeling a roof, so it belongs in the left menu, not in
> its own floating window.
>
> Reach for the floating **App window** instead only when you specifically want a small,
> movable tool the user keeps open *alongside* other panels while they work elsewhere in
> the model (e.g. a persistent unit converter, a live readout), or for a one-off
> personal/experimental utility that isn't meant to feel like a shipped S3D feature.
>
> The model read-modify-write pattern, selection helpers, and notifications below work
> **identically** regardless of which one hosts your UI — only the container and its
> open/close mechanics differ.

---

## Runtime environment

The host page already provides these globals — **do not declare or import them**:

| Global | Purpose |
|---|---|
| `jQuery` (`$`) | DOM manipulation inside your app's `content` HTML |
| `SKYCIV_APPS` | Namespace you register your app into (`SKYCIV_APPS.create(config)`) |
| `S3D` | Model read/write (`S3D.structure.*`), graphics/selection (`S3D.graphics.*`), left menu (`S3D.UI.leftMenu.*`) |
| `SKYCIV` | Platform utilities, e.g. notifications (`SKYCIV.utils.alert.sideNotify`) |
| `SKYCIV_UTILS` | Signed-in user utilities — **`SKYCIV_UTILS.currentUser.getApiAuth()`** returns `{username, key}` for API calls (see "Authentication" below) |
| `SB` | Section Builder — **`SB.library.getTree()`** returns the whole section database, client-side and synchronous (see "Choosing sections" below) |

Semantic UI (CSS **and** its jQuery modules) is loaded on the page too — see the next section.

---

## UI: build it out of Semantic UI components (not hand-rolled HTML/CSS)

> **This is a hard requirement, not a style preference.** S3D's entire interface is Semantic
> UI. An app built from bare `<input>` / `<select>` / custom-CSS `<div>`s looks obviously
> bolted-on next to it, even if it functions perfectly.
>
> **This applies to every control, not just buttons** — inputs, dropdowns, checkboxes,
> radios, tabs, tables, messages, labels, dividers and headers all have a Semantic
> equivalent, and you should use it. (Reaching only for `ui button primary` and leaving the
> form fields bare is the single most common way this gets missed.)

**❌ Don't** hand-roll controls and style them yourself:

```html
<style>.my-field label{display:block;font-weight:600;} .my-field input{...}</style>
<div class="my-field"><label>Span (m)</label><input type="number" id="span"></div>
<select id="truss-type"><option>Warren</option></select>
```

**✅ Do** use the Semantic component for each control:

```html
<div class="ui form">
  <div class="two fields">
    <div class="field">
      <label>Span</label>
      <div class="ui right labeled input">
        <input type="number" id="span" value="10">
        <div class="ui basic label">m</div>
      </div>
    </div>
    <div class="field">
      <label>Truss type</label>
      <select class="ui dropdown" id="truss-type"><option value="warren">Warren</option></select>
    </div>
  </div>
</div>
```

### Component cheatsheet

| Need | Semantic markup |
|---|---|
| Form wrapper | `<div class="ui form">` |
| One field | `<div class="field"><label>…</label>…</div>` |
| Fields side by side | `<div class="two fields">` / `three fields` / `four fields` |
| Text/number input | `<div class="ui input"><input type="number"></div>` |
| Input with a unit suffix | `<div class="ui right labeled input"><input><div class="ui basic label">m</div></div>` |
| Dropdown | `<select class="ui dropdown">` (see module init below) |
| Section picker | 4 cascading `<select class="ui mini dropdown">` fed by `SB.library.getTree()` — **never** free-text `load_section` parts, see "Choosing sections" |
| Checkbox / radio | `<div class="ui checkbox"><input type="checkbox"><label>…</label></div>` (`ui radio checkbox` for radios) |
| Primary action | `<button class="ui primary button">` — full width: `ui primary fluid button` |
| Secondary action | `<button class="ui button">` |
| In-progress button | add `loading disabled` classes, remove when done |
| Callout / note | `<div class="ui info message">`, `warning`, `negative`, `positive` (add `tiny` in narrow panels) |
| Results table | `<table class="ui celled compact small table">` |
| Tabs | `<div class="ui top attached tabular menu"><a class="item active" data-tab="x">…</a></div>` + `<div class="ui bottom attached segment">` |
| Status chip | `<span class="ui tiny blue label">ULS</span>` |
| Grouping / spacing | `<div class="ui segment">`, `<div class="ui divider">`, `<h5 class="ui header">` |
| Icons | `<i class="file alternate outline icon"></i>` |

### Optional module init

The markup above is styled by Semantic's CSS on its own. Calling the jQuery modules upgrades
`<select>` to Semantic's richer widget and makes checkboxes animate — guard it so the plain
controls still work if a module isn't present in a given build:

```javascript
try {
    if ($.fn && typeof $.fn.dropdown === 'function') $panel.find('select.ui.dropdown').dropdown();
    if ($.fn && typeof $.fn.checkbox === 'function') $panel.find('.ui.checkbox').checkbox();
} catch (err) { /* native controls still work */ }
```

The underlying `<select>`/`<input>` element stays the source of truth either way, so
`$('#truss-type').val()` reads correctly whether or not the module initialised, and a native
`change` event still fires.

### What custom CSS is still fine

Only what Semantic genuinely doesn't cover — e.g. showing/hiding your own tab panes, or a
density tweak for a narrow left-menu panel. If you find yourself writing rules for label
weight, input borders, button colours or table borders, you're re-implementing Semantic.
Keep every class you *do* add uniquely prefixed (see the styling note in "App scaffold").

---

## Authentication: never ask the user for API credentials

An app runs **inside a session the user is already signed in to**. If your app needs to call a
SkyCiv HTTP API (e.g. `standalone.loads.*` from [`load-gen-api`](../load-gen-api/SKILL.md),
or a `run-quick-design` calculator) read the credentials straight from the session:

```javascript
const auth = SKYCIV_UTILS.currentUser.getApiAuth();
// → { username: "example@skyciv.com", key: "ExAmPlE" }

fetch('https://api.skyciv.com/v3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        auth,                                   // straight from the signed-in user
        options: { validate_input: true },
        functions: [ /* … */ ],
    }),
});
```

> **Do not** build a settings modal, an API-key input, or a `localStorage` credential cache in
> an S3D App or left-menu panel. The root `CLAUDE.md` "collect credentials in the UI" tip is
> for **standalone prototypes** that run outside the platform and have no signed-in user to
> read from — it does not apply here, and asking an already-signed-in user to go fetch their
> own API key is a bug, not a feature.

Guard it defensively (it returns nothing useful if somehow called outside a signed-in
session) and tell the user via `sideNotify` rather than falling back to a prompt.

---

## Choosing sections: `SB.library.getTree()`, never a typed-in path

A member's section is set with a 4-part `load_section` path — `[region, standard, category,
section name]` — and the lookup is an **exact string match** against SkyCiv's section library.
A typo, a stale name, or a category that doesn't exist under the chosen standard produces a
section the solver can't resolve.

So **never ask the user to type a `load_section` path**. The whole library is already on the
page: `SB.library.getTree()` returns it synchronously — no API call, no auth, no await — as a
4-level nested object mirroring the path exactly:

```javascript
SB.library.getTree()
// {
//   "Australian": {
//     "Steel (300 Grade)": {
//       "Universal beams":   { "150 UB 14.0": "", "180 UB 16.1": "", … },
//       "Universal columns": { "100 UC 14.8": "", "150 UC 23.4": "", … },
//       …
//     },
//     "Timber (GluLam)": { … },
//     …
//   },
//   "American": { "AISC": { "W shapes": { "W12x26": "", … }, … }, … },
//   …
// }
```

Every branch is exactly 4 levels deep, and the leaf is an object whose **keys** are the section
names (the values are empty strings — ignore them). Walk it to drive **four cascading Semantic
dropdowns**, each level populated from the level selected above it:

❌ **Wrong** — four text boxes the user has to spell correctly:

```javascript
'<input type="text" placeholder="Region" /><input type="text" placeholder="Standard" />' +
'<input type="text" placeholder="Category" /><input type="text" placeholder="Section name" />'
```

✅ **Right** — pick from what the library actually contains:

```javascript
const LEVELS = ['Region', 'Standard', 'Category', 'Section'];

// Options available directly below a partial path, e.g. levelOptions(['Australian']).
function levelOptions(tree, path) {
    let node = tree;
    for (const key of path) {
        if (!node || typeof node !== 'object') return [];
        node = node[key];
    }
    return node && typeof node === 'object' ? Object.keys(node) : [];
}

// Snap a desired default onto what the library really has, substituting the first
// available option at any level that doesn't exist.
function resolvePath(tree, wanted) {
    const path = [];
    for (let i = 0; i < 4; i++) {
        const options = levelOptions(tree, path);
        if (!options.length) break;
        path.push(options.includes(wanted[i]) ? wanted[i] : options[0]);
    }
    return path;
}

function renderSectionPicker(prefix, label, wanted) {
    const tree = SB.library.getTree();
    const path = resolvePath(tree, wanted);
    const selects = path.map((value, i) => {
        const opts = levelOptions(tree, path.slice(0, i))
            .map(o => `<option value="${o}"${o === value ? ' selected' : ''}>${o}</option>`).join('');
        return `<div class="field"><select class="ui mini dropdown" id="${prefix}-${i}"
                    data-section="${prefix}" data-level="${i}" title="${LEVELS[i]}">${opts}</select></div>`;
    });
    // Two rows of two - four dropdowns across is unreadable in a left-menu panel.
    return `<div class="field"><label>${label}</label>
        <div class="two fields">${selects[0]}${selects[1]}</div>
        <div class="two fields">${selects[2]}${selects[3]}</div></div>`;
}

// Repopulate everything below whichever level changed, keeping a choice that is
// still valid under the new parent.
$root.on('change', 'select[data-section]', function () {
    const prefix = $(this).attr('data-section');
    const changed = parseInt($(this).attr('data-level'), 10);
    const tree = SB.library.getTree();
    const path = [];
    for (let i = 0; i <= changed; i++) path.push($root.find(`#${prefix}-${i}`).val());

    for (let lvl = changed + 1; lvl < 4; lvl++) {
        const options = levelOptions(tree, path);
        const $sel = $root.find(`#${prefix}-${lvl}`);
        const value = options.includes($sel.val()) ? $sel.val() : options[0];
        setSelectOptions($sel, options, value);
        path.push(value);
    }
});
```

Then read the path back the same way you read any other field:

```javascript
const load_section = [0, 1, 2, 3].map(i => $root.find(`#${prefix}-${i}`).val());
model.sections[id] = { load_section, material_id: matId };
```

**Two gotchas:**

- **Semantic's dropdown module builds its menu once at init** and won't re-read a `<select>`
  whose `<option>`s you replaced. After repopulating, push the new values into the module —
  and fall back silently to the plain select when the module isn't there:

  ```javascript
  function setSelectOptions($sel, options, selected) {
      $sel.html(options.map(o => `<option value="${o}">${o}</option>`).join('')).val(selected);
      const $module = $sel.parents('.ui.dropdown').first();   // Semantic wraps the <select>
      if ($module.length && typeof $.fn.dropdown === 'function') {
          $module.dropdown('setup menu', {
              values: options.map(o => ({ name: o, value: o, selected: o === selected })),
          });
          $module.dropdown('set selected', selected);
      }
  }
  ```

- **Don't hardcode a default path and trust it.** Run defaults through `resolvePath()` — library
  contents vary between builds, and a default that silently doesn't resolve is worse than one
  that snaps to a real section.

> Server-side equivalent: the `S3D.SB.getLibraryTree` API function in
> [`s3d-api`](../s3d-api/SKILL.md), and the [`section-selector`](../section-selector/SKILL.md)
> skill, which ships a captured `section_tree.json` of the same shape — handy as a test fixture
> when you can't reach a live `SB`.

---

## App scaffold

Every app is a single config object passed to `new SKYCIV_APPS.create(config)`, wrapped in `jQuery(document).ready(...)`:

| Key | Type | Notes |
|---|---|---|
| `id` | string | Must be unique among all apps. Used as `SKYCIV_APPS.<id>` and in inline `onclick` handlers. |
| `name` | string | Display name shown in the app's title bar. |
| `width` / `height` | string | CSS size, e.g. `'600px'`. |
| `icon_img` / `icon_img_square` | string (URL) | Icons shown in the app launcher. |
| `draggable` | boolean | Whether the window can be dragged. |
| `content` | string | A full HTML document string (including `<style>`) rendered inside the app window. |
| `onInit` | function | Called once when the app's page loads. Good place for one-time DOM setup (e.g. hiding elements). |
| `onFirstOpen` | function | Called the first time the user opens the app in the current S3D session. |

After `create(config)`, grab the instance via `SKYCIV_APPS[app_id]` and attach custom functions to it — these are what your inline `onclick="SKYCIV_APPS.<id>.myFunction()"` handlers call. Finish with `app.init()`.

**Styling:** give every CSS class a unique suffix (e.g. `.main-coolapp`, `.h1-coolapp`) so it can't collide with S3D's own styles or another installed app.

Minimal working example:

```javascript
jQuery(document).ready(function () {
    const app_id = 'my_cool_app';

    const config = {
        id: app_id,
        name: 'Hello SkyCiv Apps',
        width: '600px',
        height: '600px',
        icon_img: 'https://platform.skyciv.com/storage/images/logo-pack/SkyCiv_Logo_IconOnly.png',
        icon_img_square: 'https://platform.skyciv.com/storage/images/logo-pack/SkyCiv_Logo_IconOnly.png',
        draggable: true,
        content: `
            <html>
                <head>
                    <style>
                        .main-coolapp { display: flex; flex-direction: column; margin: auto; max-width: 400px; }
                        .h1-coolapp { text-align: center; color: black; }
                    </style>
                </head>
                <body>
                    <main class="main-coolapp">
                        <h1 class="h1-coolapp">Hello SkyCiv Apps</h1>
                        <button class="ui button primary" onclick="SKYCIV_APPS.${app_id}.customFunction()">Run</button>
                    </main>
                </body>
            </html>
        `,
        onInit: function () {
            console.log('App has been initialised');
        },
    };

    new SKYCIV_APPS.create(config);
    const app = SKYCIV_APPS[app_id];

    app.customFunction = function () {
        SKYCIV.utils.alert.sideNotify({
            title: 'Success ✅',
            body: 'You can let the user know what is happening.',
            time: 5000,
            auto_hide: true,
            theme: 'dark',
        });
    };

    app.init();
});
```

---

## Reading and modifying the model

### Read-modify-write pattern (always use this)

```javascript
let temp_s3d_model = S3D.API.S3D2API(S3D.structure.get());
// ... make all your changes to temp_s3d_model (nodes, members, plates, loads, etc.) ...
S3D.structure.set(temp_s3d_model, null, true);
```

`S3D.API.S3D2API(...)` converts the live in-memory model into the same API-shaped `s3d_model` object documented in the `s3d-api` skill — so every field name, unit, and object shape you already know from that skill applies directly here. Always batch every mutation into one `temp_s3d_model` and call `S3D.structure.set` **once** at the end, so the user gets a single undo step instead of one per field you touch.

`S3D.structure.set(modelData, fileName?, isUndo?, callback?)`:

| Parameter | Type | Notes |
|---|---|---|
| `modelData` | object | The (mutated) API-format model |
| `fileName` | string \| `null` | Optional new filename; `null` keeps the current one |
| `isUndo` | boolean | Pass `true` so the change is captured as a single undoable step |
| `callback` | function | Optional, runs after the model finishes loading |

**Sections resolve asynchronously.** A `load_section` path or a template shape (`info`,
e.g. a concrete rectangle) is built into a full section object by a round trip to the server.
The resolved section (area, Iz, Iy, J) exists only once `set`'s `callback` runs, or in the
callback of `S3D.API.API2S3D(apiModel, null, callback)`, never synchronously. Before writing
code that creates a section or reads a new section's properties, read
[references/resolving-sections.md](references/resolving-sections.md).

Other top-level structure functions: `S3D.structure.get(options)` (pass `{ api_format: true }` to skip the `S3D2API` conversion yourself), `S3D.structure.clear()`, `S3D.structure.repair({ tasks: [...], force_repair })` (e.g. `merge_nodes`, `intersect_members`, `default_section`), `S3D.structure.COG(nodes, elements, plates, sections, materials)`, `S3D.structure.share(callback)`.

### Granular mutation helpers

For small, one-off edits you can also call these directly instead of going through the full `get`/mutate/`set` cycle — useful inside simple custom functions:

| Namespace | Functions |
|---|---|
| `S3D.structure.nodes` | `add(obj)`, `remove([ids])`, `getVector(startNode, endNode)` — unit vector from one node to another |
| `S3D.structure.members` | `add(obj)`, `remove([ids])`, `getLength(memberId)`, `intersect(obj)` (split by `%`, distance, or `equalParts`), `getIntersectingNodes(obj?)` |
| `S3D.structure.plates` | `add(obj)` |
| `S3D.mesher` | `autoMesher(options)`, `meshPlates(options)`, `unMeshPlates(ids, update_ui)` — **asynchronous** (meshing runs on the server). Read [references/meshing.md](references/meshing.md) before meshing or re-meshing plates. |
| `S3D.structure.supports` | `add({ node_id, fixity })` |
| `S3D.structure.loads.point_loads` | `add(obj)` — `type: "n"` (node) or `"m"` (member, with `position` 0–100%) |
| `S3D.structure.loads.distributed_loads` | `add(obj)` — `member`, `x_mag_A/B`, `y_mag_A/B`, `z_mag_A/B`, `position_A/B`, `load_group`, `axes` (`"global"`/`"local"`) |
| `S3D.structure.loads.area_loads` | `add(obj)` — `type` (`one_way`, `two_way`, `general_one_way`, `column_wind_load`, `open_structure`), `nodes`, `mag`, `direction`, `LG` — see `s3d-api` skill for `general_one_way`'s extra params (`mags`, `intervals`, `excluded_member_ids`, `exclude_internal_members`, `cantilever_extensions`) |
| `S3D.structure.loads.sw` | `set({ loadcaseId: { x, y, z } })` — self-weight gravity multipliers per load case |
| `S3D.structure.loads.lc` | `add({ name, ...loadGroupFactors })` — build a load combination from load groups |

Note the model calls members **"members"**, but internally some docs/tools refer to them as **"elements"** — if you see `elements` in a helper signature it means members.

### Area loads: check them after adding, fall back to distributed loads

An area load only works when S3D can find members to carry it: a closed panel bounded by members on every edge, with nodes at the corners. On a face with no members under it (walls or slabs modelled as plates, a corner without a column, a setback or re-entrant corner, a continuous member running past the panel's nodes) S3D **silently ignores** the load and shows the user a side notification for each one. A building with dozens of broken area loads floods the screen. So:

- Use area loads only on a plain rectangular frame: no plates on the faces, the same rectangular plan on every storey, a column at every corner. Anywhere else, use `distributed_loads` on the members (`w = p × tributary width`).
- **After adding area loads, always call `S3D.area_loads.checkAll()`**. Each failed load appears in `issues` and `details`:

  ```js
  const report = S3D.area_loads.checkAll();
  // { issues: ["Area load #181 issue. Something went wrong with this area load so it was ignored.", …],
  //   details: [{ area_load_ID: 181, variance_obj: { force_variance, moment_variance, applied: { f_x, … }, equivalent: { … }, … },
  //               load_obj: { applied_loads: { centroid, sub_polygons }, equivalent_loads: { DLs, PLs, node_PLs } }, comments: "<p>What to try…</p>" }] }
  ```

  A failed load has `equivalent_loads` empty and every force zero: none of it reaches the frame. `area_load_ID` is the load's index in `model.area_loads`. Areas that were already broken before your change are the user's; only judge the ones you added (IDs from the first index you added).
- **If any area load you added failed, don't try to repair it.** Remove all the area loads you added and apply the same loads as `distributed_loads` instead. Patching only the broken ones mixes two layouts on the same faces, and the repairs (splitting members, moving nodes) change the user's model. Then refresh with `S3D.UI.update({ force_update_area_loads: true, redraw: true })` and tell the user that the loads went on as member loads, and why.

### Model settings you must always check

Before generating any geometry or loads, read `model.settings` (from the object you got via the read-modify-write pattern) — **do not hardcode units or a vertical axis**:

| Setting | Values | Why it matters |
|---|---|---|
| `settings.vertical_axis` | `"Y"` (default) or `"Z"` | Determines which coordinate is "up". If `"Z"`, apply height/elevation offsets to `z`; otherwise apply them to `y`. Gravity/self-weight direction and "vertical" load directions follow the same axis. |
| `settings.units` | `"imperial"`, `"metric"`, or a custom object (`length`, `force`, `moment`, `pressure`, `density`, `mass`, `translation`, `stress` — each with its own unit string, e.g. `length: "mm"`, `force: "kN"`) | Determines what a numeric input from your app's UI actually means. Never assume mm/kN — read the unit and label your inputs accordingly (or convert). Imperial and metric units cannot be mixed within one model. |

See the `s3d-api` skill for the full `settings` object and every other model field.

---

## Selecting elements & GUI integration

Use these to make your app interactive with what the user has clicked on in the 3D viewport:

| Function | Signature | Purpose |
|---|---|---|
| `S3D.structure.getSelectedItems()` | `()` | Returns `{ nodes: [...], members: [...], plates: [...], supports: [...], distributedLoads: [...], pointLoads: [...], moments: [...], area_loads: [...], pressures: [...] }` — arrays of currently selected element IDs by type. This is how you implement an "only affect selected members" checkbox. |
| `S3D.graphics.highlightElement(elementType, elementId, null, addToSelection?)` | e.g. `('member', 12)`, `('member', [2, 13])`, `('member', 12, null, true)` | Programmatically select/highlight one or more elements in the viewport. `addToSelection: true` appends instead of replacing the current selection. |
| `S3D.graphics.locator(elementType, elementId)` | | Animates a pin pointing at a specific element — useful for "show me the problem" flows. |
| `S3D.graphics.setCameraView(view, no_redraw?)` | `view`: `"top"`, `"side"`, `"front"`, `"iso"` | Snap the camera to a standard view. |
| `S3D.graphics.refreshAllCanvas(callback?)` | async | Lightweight viewport redraw (no recalculation) — use after direct helper mutations if the view doesn't update on its own. |
| `S3D.graphics.screenshot(callback)` | async | Callback receives a base64 image string you can drop straight into an `<img src=...>`. |

Typical pattern: read `getSelectedItems().members`; if empty and the app has a "selected only" toggle checked, notify the user to select members first rather than silently doing nothing or falling back to "all".

---

## Reading solve results

Same read-modify-write discipline applies to results as to the model, plus one extra step:
`S3D.results.*` return S3D's internal/legacy results format, not the API-shaped object — always
convert with `S3D.API.output.S3D2API` before reading it (or handing it to any code written against
the documented API results schema).

```javascript
if (!S3D.solver.isSolved()) {
    SKYCIV.utils.alert.sideNotify({
        title: 'Not Solved ⛔️', body: 'Solve the model before reading results.',
        time: 5000, auto_hide: true, theme: 'dark',
    });
    return;
}

// S3D.results.get() is instant (current load combo only).
const currentResults = S3D.API.output.S3D2API(S3D.results.get());

// S3D.results.getAll(true, cb) covers every load combination but may take a moment to download.
S3D.results.getAll(true, function () {
    // Results are cached once downloaded, so this second call reads the local copy
    // rather than re-fetching — calling it twice costs nothing.
    const allResults = S3D.API.output.S3D2API(S3D.results.getAll(true));
    // ... read allResults["1"].member_peak_results, .reactions, etc.
});
```

See the [`analysis-results`](../analysis-results/SKILL.md) skill for the full results object
schema (reactions, per-station member/plate results, min/max summaries, gotchas), and
`S3D.solver.getLastSolveInfo()` for the solver's info/warning messages from the last solve.
Three traps in that object are worth knowing before you write any loop over it: a station value
can be a `[left, right]` pair rather than a number where a member has a discontinuity, station
counts vary per member, and `plate_element_forces`/`plate_element_stresses` can be absent rather
than empty. All three are covered there.

---

## Notifications

```javascript
SKYCIV.utils.alert.sideNotify({
    title: 'No Model ⛔️',
    body: 'Try opening a model before running this.',
    time: 5000,
    auto_hide: true,
    theme: 'dark',
});
```

Use this for validation errors (nothing selected, no model open, invalid input) and success confirmations — SkyCiv Apps have no other way to surface messages to the user.

---

## Hosting inside the Left Menu (preferred for general features)

When building an S3D feature meant for every user — not a personal one-off — host it in
the left menu instead of a floating App window: the user gets more usable width for the
GUI, and it feels like a native part of S3D rather than a bolted-on tool. See the
callout under "What is a SkyCiv App?" above for the fuller App-window-vs-left-menu
decision, and "Design pattern: parametric generator tools" below for how a generator
like a truss builder fits this.

If you build a tool like this, it's important to keep it all contained within it's own namespace for easy and reliable implementation. For example:

```js
S3D.trussBuilder = function() {
    let functions = {};

    functions.open = function() {
        //for example we will connect this to a button in S3D
    }


    return functions; //return all public functions

}();
```

`S3D.UI.leftMenu` is a singleton panel controller that slides open a temporary panel in
the left sidebar. Unlike an App window, there's no `SKYCIV_APPS.create` registration, no
launcher icon, and no draggable chrome to manage — you just call `open()`/`close()`
directly.

> **No iframe isolation — namespace your IDs/classes.** An App window renders `content`
> as its own document; a left-menu panel injects `content` directly into the live S3D
> page's DOM. Give every element a unique ID/class prefix (the same discipline as the
> "give every CSS class a unique suffix" advice for App styling above), and scope your
> jQuery lookups to the panel with `getSelector()` (below) rather than a bare global
> `$('#some-id')`, to avoid colliding with S3D's own DOM or another open panel.

---

### `open(args)`

Opens the panel. Closes any conflicting UI (renderer, datasheet, grouping).

```js
S3D.UI.leftMenu.open({
    title: "My Panel",          // string — displayed as <h2> header
    content: "<p>HTML here</p>",// string — inner HTML of the panel body (a fragment, not a full <html> doc)
    width: 30,                  // number (0–100) — left sidebar width %, default 30
    id: "my_panel_id",          // optional — stable element ID (persists user resize)
    allow_graphical_selections: true, //false by default
    graphicsClickFunction: function() { // this will run whenever you click an element, you can then run  S3D.structure.getSelectedItems() and do something with that automatically
        alert('click');
    },
    graphicsClickSelectFunction: function() {
        alert('click select');
    },
    graphicsDragSelectFunction: function() {
        alert('drag select');
    },
    openFunction: function() {  // called after panel is injected & visible - bind events here (like onInit for Apps)
        // bind events, init widgets, etc.
    },
    closeFunction: function() { // called when the panel is closed (X button or .close())
        // cleanup
    }
});
```

**Notes:**
- `width` is ignored if the user has previously resized a panel with the same `id` — their saved width is restored.
- Will **not** open if a design load panel is already open (`S3D.design.load.isOpen()`).

---

### `close(show_input_buttons?)`

Closes and removes the panel. Restores the left sidebar to its pre-open width.

```js
S3D.UI.leftMenu.close();         // restores input buttons (default)
S3D.UI.leftMenu.close(false);    // suppresses input button restoration
```

---

### `closeAll(show_input_buttons?)`

Alias for `close()`.

```js
S3D.UI.leftMenu.closeAll();
```

---

### `isOpen()`

Returns `true` if the panel is currently visible.

```js
if (S3D.UI.leftMenu.isOpen()) { ... }
```

---

### `getSelector()`

Returns the CSS selector (`#id`) of the currently open panel element — useful for targeting it with jQuery.

```js
let sel = S3D.UI.leftMenu.getSelector(); // e.g. "#gen_left_menu_4821"
```


## Worked example: auto-load beams with dead/live loads

Demonstrates the full pattern: reading settings, respecting a "selected only" toggle via `getSelectedItems`, batching mutations, and a single `structure.set` call.

```javascript
jQuery(document).ready(function () {
    const app_id = 'auto_beam_loads';

    const config = {
        id: app_id,
        name: 'Auto Beam Loads',
        width: '420px',
        height: '360px',
        icon_img: 'https://platform.skyciv.com/storage/images/logo-pack/SkyCiv_Logo_IconOnly.png',
        icon_img_square: 'https://platform.skyciv.com/storage/images/logo-pack/SkyCiv_Logo_IconOnly.png',
        draggable: true,
        content: `
            <html>
            <head>
                <style>
                    /* Only what Semantic doesn't cover - layout of the app's own shell. */
                    .main-abl { margin: auto; max-width: 380px; padding: 12px; }
                </style>
            </head>
            <body>
                <main class="main-abl">
                    <h4 class="ui header">Auto Beam Loads</h4>
                    <div class="ui form">
                        <div class="two fields">
                            <div class="field">
                                <label>Dead load</label>
                                <div class="ui right labeled input">
                                    <input type="number" id="dead-abl" value="1" />
                                    <div class="ui basic label">kN/m</div>
                                </div>
                            </div>
                            <div class="field">
                                <label>Live load</label>
                                <div class="ui right labeled input">
                                    <input type="number" id="live-abl" value="2" />
                                    <div class="ui basic label">kN/m</div>
                                </div>
                            </div>
                        </div>
                        <div class="field">
                            <div class="ui checkbox">
                                <input type="checkbox" id="selected-only-abl" />
                                <label>Apply to selected members only</label>
                            </div>
                        </div>
                        <button class="ui primary button" onclick="SKYCIV_APPS.${app_id}.applyLoads()">Apply Loads</button>
                    </div>
                </main>
            </body>
            </html>
        `,
        onInit: function () {
            // Upgrade the Semantic markup to Semantic's widgets where available.
            try {
                if ($.fn && typeof $.fn.checkbox === 'function') $('.ui.checkbox').checkbox();
            } catch (err) { /* native controls still work */ }
        },
    };

    new SKYCIV_APPS.create(config);
    const app = SKYCIV_APPS[app_id];

    app.applyLoads = function () {
        const dead = parseFloat($('#dead-abl').val());
        const live = parseFloat($('#live-abl').val());
        const selectedOnly = $('#selected-only-abl').is(':checked');

        let model = S3D.API.S3D2API(S3D.structure.get());
        const memberIds = Object.keys(model.members || {});

        if (memberIds.length === 0) {
            SKYCIV.utils.alert.sideNotify({
                title: 'No Members ⛔️', body: 'Open or build a model with members first.',
                time: 5000, auto_hide: true, theme: 'dark',
            });
            return;
        }

        let targetIds = memberIds;
        if (selectedOnly) {
            const selected = S3D.structure.getSelectedItems().members.map(String);
            if (selected.length === 0) {
                SKYCIV.utils.alert.sideNotify({
                    title: 'Nothing Selected ⛔️', body: 'Select at least one member, or untick "selected only".',
                    time: 5000, auto_hide: true, theme: 'dark',
                });
                return;
            }
            targetIds = selected;
        }

        if (!model.distributed_loads) model.distributed_loads = {};
        let nextId = Object.keys(model.distributed_loads).reduce((max, k) => Math.max(max, parseInt(k, 10)), 0) + 1;

        targetIds.forEach((memberId) => {
            // Global-vertical UDL; flip sign/axis per settings.vertical_axis so "down" is correct either way.
            const vertAxis = (model.settings.vertical_axis || 'Y').toLowerCase();
            const magKey = vertAxis === 'z' ? 'z_mag_A' : 'y_mag_A';
            const magKeyB = vertAxis === 'z' ? 'z_mag_B' : 'y_mag_B';

            model.distributed_loads[nextId++] = {
                member: parseInt(memberId, 10),
                [magKey]: -dead, [magKeyB]: -dead,
                position_A: 0, position_B: 100,
                axes: 'global', load_group: 'Dead',
            };
            model.distributed_loads[nextId++] = {
                member: parseInt(memberId, 10),
                [magKey]: -live, [magKeyB]: -live,
                position_A: 0, position_B: 100,
                axes: 'global', load_group: 'Live',
            };
        });

        S3D.structure.set(model, null, true);

        SKYCIV.utils.alert.sideNotify({
            title: 'Loads Applied ✅',
            body: `Dead + Live loads applied to ${targetIds.length} member(s).`,
            time: 5000, auto_hide: true, theme: 'dark',
        });
    };

    app.init();
});
```

---

## Design pattern: parametric generator tools (e.g. a truss or balustrade builder)

For tools that turn a couple of selected nodes plus form inputs into generated geometry
(posts/rails/glass for a balustrade; chords/webs for a truss; etc.), follow this shape.

**Host it in the left menu, not a floating App window, if it's a general feature.** A
truss generator or a balustrade builder is exactly the case the callout under "What is a
SkyCiv App?" describes: broadly useful to any S3D user, so it should feel like a native
S3D panel. The generation logic (steps 1–7 below) is identical either way — only the
hosting/open call changes:

- **Left menu (preferred):** `S3D.UI.leftMenu.open({ title, content, openFunction, ... })`, bind your form's events inside `openFunction`.
- **App window (only for a personal/experimental tool):** `SKYCIV_APPS.create({ ... })`, bind events via `onInit`/inline `onclick`.

Three rules these tools get wrong most often, all covered in full above — worth re-checking
before you ship one:

- **Every input is a Semantic component**, not just the buttons — see "UI: build it out of
  Semantic UI components". A generator form is mostly inputs and dropdowns, so this is where
  a hand-rolled UI shows up worst.
- **Never prompt for API credentials** if a step needs an HTTP API — use
  `SKYCIV_UTILS.currentUser.getApiAuth()`. See "Authentication".
- **Sections are picked from `SB.library.getTree()`**, never typed. A generator assigns a
  section to every member it creates, so a `load_section` path that doesn't resolve breaks the
  whole generated structure at once. See "Choosing sections".

1. **Require a selection first.** Call `S3D.structure.getSelectedItems().nodes`; if it isn't exactly the count you need (e.g. 2 start/end nodes for a balustrade run, or 2 support nodes for a truss span), `sideNotify` an error and stop.
2. **Compute geometry from the selection.** Read the relevant nodes' coordinates from `model.nodes`, work out the direction/length between them (or use `S3D.structure.nodes.getVector(startNode, endNode)` for the unit vector), then derive the rest of the layout from your form inputs (post/panel count and spacing for a balustrade; panel count, height, and truss type for a truss).
3. **Respect `settings.vertical_axis`.** Apply height offsets (post height, truss rise) to whichever coordinate is vertical (`z` or `y`) for the new nodes — never hardcode `y`.
4. **Generate in the single `temp_s3d_model`.** Add every new node and member (and `plates`, for a balustrade's glass facade) referencing the chosen `section_id`/`material_id`. Add the `sections`/`materials` entries yourself and reference their IDs, building each `load_section` from the cascading `SB.library.getTree()` dropdowns described in "Choosing sections" — or offer the sections/materials the open model already contains, read straight off `model.sections`/`model.materials`.
5. **Optional loads are just conditional blocks.** e.g. if "wind load" or "snow load" is checked, add the relevant `distributed_loads`/`pressures`; skip entirely if the checkbox is off.
6. **One `S3D.structure.set(temp_s3d_model, null, true)` at the end** so the whole generated structure (geometry + loads) appears — and undoes — as a single action.
7. **Highlight the result.** After `set`, call `S3D.graphics.highlightElement('member', [...newMemberIds])` so the user immediately sees what was generated.

