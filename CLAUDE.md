# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

This is a **documentation/prompt-engineering repository**, not a codebase with source files to build, lint, or test. It's a library of "skills" — structured Markdown files that teach an AI agent how to correctly call the [SkyCiv API](https://skyciv.com/api/) (structural engineering modeling, analysis, drawing, and reporting) instead of guessing at request shapes and units. There is no build system, package manifest, linter, or test suite — the only artifacts are `SKILLS.md` files and their supporting assets.

## Repository structure

Each top-level folder is one self-contained skill:

```
<skill-name>/
  SKILLS.md       # required — skill instructions and API reference
  assets/         # optional — example inputs, catalogues, templates
```

Current skills: `skyciv-api-v3`, `s3d-api`, `s3d-apps`, `cloudcad-api`, `load-gen-api`, `load-combinations`, `run-quick-design`, `renderer`, `schema-agent`, `section-selector`, `qa-engineer`. There is also a `prototypes/` folder holding runnable example *apps* built on these skills (Node/Express), not `SKILLS.md` files — currently `prototypes/glass-balustrade-configurator` and `prototypes/truss-designer`. Note: a `reporting-engineer` skill is planned but the folder does not yet exist in this repo — don't assume it does.

Some `SKILLS.md` files have YAML frontmatter (`name`, `description`, `argument-hint`) so agent harnesses can discover them; others (e.g. `skyciv-api-v3`, `s3d-api`, `cloudcad-api`, `load-gen-api`, `run-quick-design`) are documentation-only and omit it. Match the style of the skill you're editing.

## How the skills compose

Skills are designed to be chained in a typical structural workflow:

```
schema-agent          → interpret a floor plan into a structural schema
  ↓
s3d-api / cloudcad-api → build the 3D model / 2D drawing
  ↓
load-gen-api           → pull wind / snow / seismic loads for the site
  ↓
load-combinations      → factor those loads into code-correct combinations on the model
  ↓
s3d-api                → solve, then run-quick-design for member/connection checks
  ↓
renderer               → visualize the model and results
  ↓
qa-engineer            → independent review of the results
```

`skyciv-api-v3` is the foundation every `*-api` skill depends on — it covers auth, session management (`S3D.session.start`), and the shared request/response envelope (`{ auth, options, functions }`) that every other API skill's calls are built on. Any skill that calls the SkyCiv API states this prerequisite at the top of its `SKILLS.md`.

- `s3d-api` — full `s3d_model` JSON schema; `S3D.model`, `S3D.results`, `S3D.file`, `S3D.SB` namespaces.
- `s3d-apps` — sits alongside this pipeline, not inside it: builds custom client-side mini-apps that run *embedded inside* the S3D application itself (`S3D.structure.*`, `S3D.graphics.*`, `S3D.API.S3D2API`), reusing the same `s3d_model` schema as `s3d-api` but with no auth/session calls (the app runs inside an already-open session).
- `cloudcad-api` — 2D CAD drawing schema; `cloudcad.model` and `cloudcad.file` namespaces; can map into an S3D model.
- `load-gen-api` — wind/snow/seismic lookups via `standalone.loads`. Always open the session with `standalone.loads.start`, not `S3D.session.start` — confirmed against the live API that the latter breaks `standalone.loads.getLoads` (a generic, non-obvious failure on the *second* call, not on session start itself). If an app needs both an S3D model and a load-gen-api lookup, run them as separate sessions, each with its own matching `*.start` call.
- `load-combinations` — documentation-only skill for the `s3d_model` load-combination data model (`load_combinations`, `load_cases`, `load_combination_settings`) and code-correct combination sets; no API namespace of its own — combos are written directly into the model consumed by `s3d-api`, with the `7000-load-combination-generator` Quick Design calculator as an optional generator.
- `run-quick-design` — a separate REST endpoint (`POST https://qd.skyciv.com/run`, its own API-token auth, not the `skyciv-api-v3` envelope) that runs any of 154 standalone calculators by UID.
- `renderer` — client-side JS library (`SKYCIV.renderer`), not a server API; visualizes an `s3d_model` fetched via the API.
- `schema-agent` — vision/DXF interpretation persona feeding `s3d-api`.
- `section-selector` — section library lookup and injection helper for `s3d-api`; maps country/material/role to the correct `load_section` path from `section_tree.json`, or builds concrete sections as template-shape objects. Used whenever a model needs real section geometry.
- `qa-engineer` — independent-reviewer persona/checklist, not an API skill.

## `run-quick-design` asset layout

This skill's calculator catalogue lives at `run-quick-design/assets/catalogue.md`, indexed by UID and grouped by category (Foundation, Steel, Concrete, Timber, Aluminium, Connections, Loads, etc.). Each catalogue entry links to a per-calculator folder under `run-quick-design/assets/<uid>/` containing exactly:

```
schema.json         # input/output JSON schema for that calculator
sample_input.json   # minimal working example input
sample_output.json  # corresponding example output
```

When adding a new calculator, add all three files under a new `assets/<uid>/` folder and add a row to `catalogue.md` in the correct category table.

## Conventions when editing or adding a skill

These are enforced project conventions (from `.github/copilot-instructions.md`) — follow them when authoring or modifying any `SKILLS.md`:

- **Always update `README.md`** when adding a new skill folder — add a row to the skills table, keeping it sorted alphabetically by folder name.
- **State the prerequisite first**: if a skill depends on `S3D.session.start` or another skill, call that out near the top of `SKILLS.md`.
- **Use tables for API parameters**, not prose lists.
- **Include a minimal working example**: the smallest JSON payload that demonstrates the core use case.
- **Cross-link related skills** (e.g. `s3d-api` → `skyciv-api-v3`).
- **Always state units** (metric vs. imperial) and which field controls them — these skills exist specifically to stop agents guessing at units.
- Keep skill descriptions in `README.md` to a single line, non-technical enough for a first-time reader.

These skills are kept in sync with the live SkyCiv API (`api/v3`). If you notice a schema, example, or endpoint that looks stale, treat the [live API docs](https://skyciv.com/api/v3/docs) as the source of truth over what's written here.

## Prototyping tips

When prototyping a solution (or if vibe coding a solution) it's a good idea to stick to the following rules:
 - Don't use `result_filter` key in the `S3D.model.solve` space unless you're 100% sure it will work
 - Stick to a shorter `timeout` in the options key for the API (or leave as default), when prototyping if things go wrong it's easier to identify and test if things don't take >30s to fail.
 - Don't call `S3D.results.getAnalysisReport` by default as part of a solve/results pipeline. It re-solves the model and renders every section across every load combination - slow (60-90s+, often timing out) - for a PDF report that's rarely used and usually isn't even surfaced in the app's UI. Only wire it up behind its own explicit button/endpoint if the user actually asks for a downloadable report, the same way a CAD-drawing generation step is kept separate from the main analyze call.
  - If we're missing any key inputs that you would recommend, please let us know before you start coding. It's best to clarify any missing inputs. For example, in the wind load generator you will need certain key information - if the user misses this, please let them know before building the prototype.

## User Context

 - Engineers like transparency, so if you're going to transfer data, or can show some partial results, I would build that into the UI. It's handy to have both levels: a key results (for example critical utility ratio) AND results along the way + an easy way to see what key values went into subsequent API calls.
 - Accordions of tabulated data is a nice clean way you can show this level of detail without cluttering up the user interface