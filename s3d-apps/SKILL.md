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

In both cases, this will run on S3D which has Semantic UI installed. Please stay consistent with current UI and CSS using "primary" colour for blue buttons and core Semantic UI elements for dropdowns, inputs, radios etc..

---

## Runtime environment

The host page already provides these globals — **do not declare or import them**:

| Global | Purpose |
|---|---|
| `jQuery` (`$`) | DOM manipulation inside your app's `content` HTML |
| `SKYCIV_APPS` | Namespace you register your app into (`SKYCIV_APPS.create(config)`) |
| `S3D` | Model read/write (`S3D.structure.*`), graphics/selection (`S3D.graphics.*`) |
| `SKYCIV` | Platform utilities, e.g. notifications (`SKYCIV.utils.alert.sideNotify`) |

The S3D UI itself is built with **Semantic UI** and **jQuery** — reuse their classes (`ui button`, `ui button primary`, etc.) so your app's controls look native.

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

Other top-level structure functions: `S3D.structure.get(options)` (pass `{ api_format: true }` to skip the `S3D2API` conversion yourself), `S3D.structure.clear()`, `S3D.structure.repair({ tasks: [...], force_repair })` (e.g. `merge_nodes`, `intersect_members`, `default_section`), `S3D.structure.COG(nodes, elements, plates, sections, materials)`, `S3D.structure.share(callback)`.

### Granular mutation helpers

For small, one-off edits you can also call these directly instead of going through the full `get`/mutate/`set` cycle — useful inside simple custom functions:

| Namespace | Functions |
|---|---|
| `S3D.structure.nodes` | `add(obj)`, `remove([ids])`, `getVector(startNode, endNode)` — unit vector from one node to another |
| `S3D.structure.members` | `add(obj)`, `remove([ids])`, `getLength(memberId)`, `intersect(obj)` (split by `%`, distance, or `equalParts`), `getIntersectingNodes(obj?)` |
| `S3D.structure.plates` | `add(obj)` |
| `S3D.structure.supports` | `add({ node_id, fixity })` |
| `S3D.structure.loads.point_loads` | `add(obj)` — `type: "n"` (node) or `"m"` (member, with `position` 0–100%) |
| `S3D.structure.loads.distributed_loads` | `add(obj)` — `member`, `x_mag_A/B`, `y_mag_A/B`, `z_mag_A/B`, `position_A/B`, `load_group`, `axes` (`"global"`/`"local"`) |
| `S3D.structure.loads.area_loads` | `add(obj)` — `type` (`one_way`, `two_way`, `general_one_way`, `column_wind_load`, `open_structure`), `nodes`, `mag`, `direction`, `LG` — see `s3d-api` skill for `general_one_way`'s extra params (`mags`, `intervals`, `excluded_member_ids`, `exclude_internal_members`, `cantilever_extensions`) |
| `S3D.structure.loads.sw` | `set({ loadcaseId: { x, y, z } })` — self-weight gravity multipliers per load case |
| `S3D.structure.loads.lc` | `add({ name, ...loadGroupFactors })` — build a load combination from load groups |

Note the model calls members **"members"**, but internally some docs/tools refer to them as **"elements"** — if you see `elements` in a helper signature it means members.

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
    const allResults = S3D.API.output.S3D2API(S3D.results.getAll(true));
    // ... read allResults["1"].member_peak_results, .reactions, etc.
});
```

See the [`analysis-results`](../analysis-results/SKILL.md) skill for the full results object
schema (reactions, per-station member/plate results, min/max summaries, gotchas), and
`S3D.solver.getLastSolveInfo()` for the solver's info/warning messages from the last solve.

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
                    .main-abl { display: flex; flex-direction: column; gap: 10px; margin: auto; max-width: 380px; }
                </style>
            </head>
            <body>
                <main class="main-abl">
                    <h3>Auto Beam Loads</h3>
                    <label>Dead load (per model force/length unit)
                        <input type="number" id="dead-abl" value="1" />
                    </label>
                    <label>Live load (per model force/length unit)
                        <input type="number" id="live-abl" value="2" />
                    </label>
                    <label>
                        <input type="checkbox" id="selected-only-abl" />
                        Apply to selected members only
                    </label>
                    <button class="ui button primary" onclick="SKYCIV_APPS.${app_id}.applyLoads()">Apply Loads</button>
                </main>
            </body>
            </html>
        `,
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

1. **Require a selection first.** Call `S3D.structure.getSelectedItems().nodes`; if it isn't exactly the count you need (e.g. 2 start/end nodes for a balustrade run, or 2 support nodes for a truss span), `sideNotify` an error and stop.
2. **Compute geometry from the selection.** Read the relevant nodes' coordinates from `model.nodes`, work out the direction/length between them (or use `S3D.structure.nodes.getVector(startNode, endNode)` for the unit vector), then derive the rest of the layout from your form inputs (post/panel count and spacing for a balustrade; panel count, height, and truss type for a truss).
3. **Respect `settings.vertical_axis`.** Apply height offsets (post height, truss rise) to whichever coordinate is vertical (`z` or `y`) for the new nodes — never hardcode `y`.
4. **Generate in the single `temp_s3d_model`.** Add every new node and member (and `plates`, for a balustrade's glass facade) referencing the chosen `section_id`/`material_id` (from your dropdown inputs — populate dropdowns from the library sections/materials you expect the model to already contain, or add new `sections`/`materials` entries yourself and reference their IDs).
5. **Optional loads are just conditional blocks.** e.g. if "wind load" or "snow load" is checked, add the relevant `distributed_loads`/`pressures`; skip entirely if the checkbox is off.
6. **One `S3D.structure.set(temp_s3d_model, null, true)` at the end** so the whole generated structure (geometry + loads) appears — and undoes — as a single action.
7. **Highlight the result.** After `set`, call `S3D.graphics.highlightElement('member', [...newMemberIds])` so the user immediately sees what was generated.

