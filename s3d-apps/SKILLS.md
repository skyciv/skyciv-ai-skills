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
| `S3D.structure.loads.area_loads` | `add(obj)` — `type` (`one_way`, `two_way`, `column_wind_load`, `open_structure`), `nodes`, `mag`, `direction`, `LG` |
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

## Design pattern: parametric generator apps (e.g. a balustrade builder)

For apps that turn a couple of selected nodes plus form inputs into generated geometry (posts, rails, glass panels, loads), follow this shape:

1. **Require a selection first.** Call `S3D.structure.getSelectedItems().nodes`; if it isn't exactly the count you need (e.g. 2 start/end nodes), `sideNotify` an error and stop.
2. **Compute geometry from the selection.** Read the two nodes' coordinates from `model.nodes`, work out the direction/length between them (or use `S3D.structure.nodes.getVector(startNode, endNode)` for the unit vector), then interpolate post positions along that line based on the "number of posts" input.
3. **Respect `settings.vertical_axis`.** Apply the balustrade height offset to whichever coordinate is vertical (`z` or `y`) for the new top-of-post nodes.
4. **Generate in the single `temp_s3d_model`.** For each post position: add a node, add a vertical member referencing the chosen `section_id`/`material_id` (from your dropdown inputs — populate dropdowns from the library sections/materials you expect the model to already contain, or add new `sections`/`materials` entries yourself and reference their IDs). Add a continuous handrail member connecting all post tops. If "add glass facade" is checked, add a `plates` entry between each consecutive pair of posts.
5. **Optional loads are just conditional blocks.** If "post wind load" is checked, add `distributed_loads` on each post member; if "glass wind load" is checked, add `pressures` on each glass plate. Skip entirely if the checkbox is off.
6. **One `S3D.structure.set(temp_s3d_model, null, true)` at the end** so the whole balustrade (posts, rail, glass, loads) appears — and undoes — as a single action.
7. **Highlight the result.** After `set`, call `S3D.graphics.highlightElement('member', [...newMemberIds])` so the user immediately sees what was generated.
