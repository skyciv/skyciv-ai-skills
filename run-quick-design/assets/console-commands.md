# Console Commands

Part of the [run-quick-design](../SKILL.md) skill, which covers the REST endpoint for running a calculator without a browser. This page covers the `SKYCIV_DESIGN` object available in the browser dev tools console while a Quick Design is open (`https://platform.skyciv.com/quick-design?uid=<uid>`). The commands are intended for automated runs and QA, so each section notes what the command returns and when it is safe to call.

> **Use a signed-in browser.** Run these in a browser where the user is already signed in to SkyCiv. Never enter credentials on the user's behalf.

Writing or editing a calc pack (`config.json`, `calculate.js`, `ui.js`, test files) is covered by [`build-quick-design-calculator`](../../build-quick-design-calculator/SKILL.md), not here.

## Contents

| Section | Commands |
| --- | --- |
| [Typical Run Flow](#typical-run-flow) | The order to call everything below |
| [Readiness Checks](#readiness-checks) | `isPageLoaded`, `isConfigLoaded`, `isLoadingFile`, `isConfigUpdating` |
| [Waiting for the UI](#waiting-for-the-ui) | `_ui_script_is_complete`, `isUpdatingUIWithHelper`, `getLastUIRunTime`, `#run-design-btn` |
| [Loading a Design](#loading-a-design) | `utils.loadByUID`, `reloadDesignPack`, `loadDataInUI`, `getCurrentUID` |
| [Inputs](#inputs) | `setConfigInput`, `generateInputUI`, `generateInput`, `validateConfigInput`, `getDropdownValues` |
| [Running the Design](#running-the-design) | `solve.run` |
| [Results](#results) | `hasResults`, `get`, `getFullOutput`, `getReportHTML`, `hasWarnings`, `getWarnings`, `checkInputCurrent`, `getLastSolveLog` |

---

## Typical Run Flow

1. Wait until the page and config are loaded ([Readiness Checks](#readiness-checks)).
2. Set the input with `SKYCIV_DESIGN.setConfigInput(input)`, checking it first with `validateConfigInput(input)`.
3. Wait for the UI to settle ([Waiting for the UI](#waiting-for-the-ui)).
4. Call `SKYCIV_DESIGN.solve.run()`.
5. Poll until the `#run-design-btn` button no longer has the `loading` class.
6. Check `SKYCIV_DESIGN.results.hasResults()`, then read the results, warnings and solve log.

```js
const waitFor = async (check, timeout = 30000) => {
	const start = Date.now();
	while (!check()) {
		if (Date.now() - start > timeout) throw new Error('Timed out');
		await new Promise((r) => setTimeout(r, 100));
	}
};

await waitFor(() => SKYCIV_DESIGN.isPageLoaded() && SKYCIV_DESIGN.isConfigLoaded() && !SKYCIV_DESIGN.isLoadingFile());

SKYCIV_DESIGN.setConfigInput({ /* inputs */ });
await waitFor(() => !SKYCIV_DESIGN.isConfigUpdating() && !SKYCIV_DESIGN.ui.isUpdatingUIWithHelper());

SKYCIV_DESIGN.solve.run();
await waitFor(() => !jQuery('#run-design-btn').hasClass('loading'));

if (SKYCIV_DESIGN.results.hasResults() && !SKYCIV_DESIGN.results.isErrorResults()) {
	console.log(SKYCIV_DESIGN.results.get());
} else {
	console.log(SKYCIV_DESIGN.solve.getLastSolveLog());
}
```

> `run()` can return without producing results (see [Running the Design](#running-the-design)), so always check `hasResults()` and the loading class rather than assuming a run completed.

---

## Readiness Checks

Without these an agent will race the page load. All return a boolean.

| Command | True when |
| --- | --- |
| `SKYCIV_DESIGN.isPageLoaded()` | The page has finished loading |
| `SKYCIV_DESIGN.isConfigLoaded()` | The design's config has loaded |
| `SKYCIV_DESIGN.isLoadingFile()` | A file is currently being loaded into the UI (wait for **false**) |
| `SKYCIV_DESIGN.isConfigUpdating()` | The config form is mid-update, for example after setting input (wait for **false**) |

## Waiting for the UI

`ui.js` runs after every input change, so the UI needs time to settle before a run.

| Signal | Meaning |
| --- | --- |
| `window._ui_script_is_complete` | `false` while `ui.js` is running |
| `SKYCIV_DESIGN.ui.isUpdatingUIWithHelper()` | `true` while a UI helper is updating the UI |
| `SKYCIV_DESIGN.ui.getLastUIRunTime()` | Timestamp (ms) of when the UI last ran. `solve.run()` waits until this is 2s old |
| `#run-design-btn` has the `loading` class | A run is in progress |

---

## Loading a Design

### Load by UID

```js
SKYCIV_DESIGN.utils.loadByUID(uid)
```

Opens the design with the given UID. This **navigates the page** (`?uid=...`), so the console state is lost and the readiness checks must be repeated afterwards.

### Get the Current UID

```js
SKYCIV_DESIGN.getCurrentUID()
```

Returns the UID of the loaded design.

### Reload a Quick Design

```js
SKYCIV_DESIGN.reloadDesignPack(skip_hard_reload = false)
```

Resets the Quick Design back to its default state.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `skip_hard_reload` | boolean | `false` | Reload in place instead of a hard reload. The hard reload is preferred as the in-place version has caused issues |

### Load Data into the UI

```js
SKYCIV_DESIGN.loadDataInUI(data, file_data_loaded = false, from_json = false, callback = false, skip_loading = false)
```

Loads a file into the UI the same way as **File > Import JSON** does. Call it directly to avoid selecting a file. Only one file can be loaded at a time. To change individual inputs, use [`setConfigInput`](#set-input) instead.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | object | | The data to load into the UI |
| `file_data_loaded` | boolean | `false` | |
| `from_json` | boolean | `false` | |
| `callback` | function \| false | `false` | Called once the data has loaded |
| `skip_loading` | boolean | `false` | |

---

## Inputs

### Set Input

```js
SKYCIV_DESIGN.setConfigInput(input)
```

Sets inputs directly in the config form. This is easier and more reliable than `loadDataInUI`, which is meant for whole files. Table inputs have their number columns parsed with `parseFloat`. Does nothing if the config has not loaded.

### Get the Current Input

```js
SKYCIV_DESIGN.generateInputUI()
```

Returns the raw input currently set in the UI (the same as `getConfigInput()`).

### Get the Full Solver Input

```js
SKYCIV_DESIGN.generateInput(map_inputs = false, for_solve = false)
```

Returns the full payload that is sent to the solver. Unlike `generateInputUI()`, it also includes:

- `current_unit_system` and `uid`
- `conversion_factors` when inputs are unit-mapped
- `project_details`
- `batch_data` when the batch tab has been visited

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `map_inputs` | boolean | `false` | Map the inputs through the unit system's input map |
| `for_solve` | boolean | `false` | Also update the input map. Used by `solve.run()` |

### Validate Input

```js
SKYCIV_DESIGN.validateConfigInput(input)
```

Validates an input object against the design's config (`input_variables`). Use it before `setConfigInput` to catch invalid values. `SKYCIV_DESIGN.getConfigData()` returns the config itself, which can be used to generate valid and boundary values for each input.

### Get Dropdown Values

```js
SKYCIV_DESIGN.getDropdownValues(key)
```

Returns the options currently available for the dropdown input `key`. These can change as other inputs change.

---

## Running the Design

```js
SKYCIV_DESIGN.solve.run()
```

Runs the design, the same as clicking `#run-design-btn`. It is asynchronous and returns immediately, so poll for completion (see [Typical Run Flow](#typical-run-flow)).

- If the UI last ran less than 2s ago it waits for the remainder of the 2s before running.
- `run()` stops without running if solve limits are exceeded, or if a visible input is `null` (locked dropdowns fall back to their default). In the second case a side notification reads **Input Error** and names the field. No results are produced.
- A failure inside `calculate.js` shows a **Calculator Failed to Run** notification with the error line and stack trace.

---

## Results

### Check for Results

```js
SKYCIV_DESIGN.results.hasResults()
```

Returns `true` once a run has produced results. `get()` and `getFullOutput()` call `JSON.parse` on the stored output and throw if no run has happened, so check this first.

### Get the Current Results

```js
SKYCIV_DESIGN.results.get()
```

Returns the current results. `SKYCIV_DESIGN.results.isErrorResults()` returns `true` when any result has a `unit` / `units` of `'error'`.

### Get the Full Results Object

```js
SKYCIV_DESIGN.results.getFullOutput()
```

Returns all data from the server, including intermediate results.

### Get the Report HTML

```js
SKYCIV_DESIGN.results.getReportHTML()
```

Returns the HTML for the report.

### Warnings

```js
SKYCIV_DESIGN.results.hasWarnings()
SKYCIV_DESIGN.results.getWarnings()
```

`hasWarnings()` returns `true` if the last run raised any warnings. `getWarnings()` returns them as an array.

### Check Results Match the Input

```js
SKYCIV_DESIGN.results.checkInputCurrent()
```

Compares the current input to the input of the last run. When they differ it greys out the results and report and shows **Results do not reflect the current input**. When they match it clears those messages. Call it after changing an input to see whether the displayed results are stale. It waits for any running `ui.js` script first.

### Get the Solve Log

```js
SKYCIV_DESIGN.solve.getLastSolveLog()
```

Returns the log output from the last `calculate.js` run. It is also printed to the console under `===== LOGGING =====`, which makes it the first place to look when a run fails.

