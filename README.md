# SkyCiv AI Skills

A library of **skills** — structured, LLM-readable documentation and workflows — for building structural engineering software on top of the [SkyCiv API](https://skyciv.com/api/). Point any AI coding assistant or agent at this repo and it will know how to correctly model, analyze, design, visualize, and report on structures using SkyCiv's engineering engine, instead of guessing at request shapes and units.

These skills are maintained by SkyCiv and kept in sync with the live API, so agents get correct schemas, units, and call sequences on the first try.

---

## What is a "skill"?

Each folder below is a self-contained `SKILLS.md` file (plus, where relevant, supporting assets like JSON schemas and sample inputs/outputs). A skill teaches an LLM:

- **What the tool/API does** and when to reach for it
- **The exact request/response shape** — required fields, units, defaults, gotchas
- **Worked examples** it can pattern-match against instead of hallucinating a payload
- **Sequencing** — what has to happen before what (e.g. always start a session before calling `S3D.model.set`)

This format is compatible with any assistant that can read markdown context — Claude Code / Claude Skills, Cursor, Windsurf, custom GPTs, or your own agent harness.

---

## Getting started

1. **Get a SkyCiv API key** — sign up and grab one at [platform.skyciv.com/api](https://platform.skyciv.com/api). Most skills need it; a few (`run-quick-design`) need an API token from the same page.
2. **Clone this repo** and point your assistant at the relevant `SKILLS.md` file(s). See [Using with your AI tool](#using-with-your-ai-tool) below for per-tool setup.
3. **Always start with `skyciv-api-v3`** if you're using any `*-api` skill — it covers auth, sessions, and the shared request/response envelope every other API skill builds on.
4. **Read the API docs alongside the skill** when you need more depth: [skyciv.com/api/v3/docs](https://skyciv.com/api/v3/docs).

### Using with your AI tool

**Claude Code** — `CLAUDE.md` is auto-loaded when you open this repo. For another project, copy the relevant skill folder(s) into `.claude/skills/` in that project's root.

**GitHub Copilot (VS Code)** — `.github/copilot-instructions.md` is auto-loaded as workspace context when you open this repo. Reference individual skills in Copilot Chat with `#file:path/to/SKILLS.md`.

**Cursor** — Open this repo and reference skills with `@file` in Cursor Chat. For persistent context across sessions, copy relevant `SKILLS.md` content into `.cursor/rules/`.

**Windsurf / other agents** — Copy the relevant `SKILLS.md` files into your agent's system prompt or rules directory, or include them as file context in your session.

---

## Skills included

| Skill | Folder | What it lets your agent do |
|---|---|---|
| **SkyCiv Core API** | [`skyciv-api-v3/`](./skyciv-api-v3/SKILLS.md) | Foundation for every API skill below — auth, session management, the request/response envelope, and shared call patterns. Start here. |
| **S3D (Structural 3D)** | [`s3d-api/`](./s3d-api/SKILLS.md) | Build, solve, repair, and query full 3D structural models — nodes, members, plates, sections, materials, supports, loads, load combinations, and results. |
| **S3D Apps** | [`s3d-apps/`](./s3d-apps/SKILLS.md) | Build custom, embeddable mini-apps that run client-side inside the S3D application itself — read/write the live model, react to the user's selection, and automate or generate model content. |
| **CloudCAD** | [`cloudcad-api/`](./cloudcad-api/SKILLS.md) | Generate 2D engineering drawings — floor plans, dimensions, gridlines, annotations, tables — with optional mapping into a structural 3D model. |
| **Load Combinations** | [`load-combinations/`](./load-combinations/SKILLS.md) | Define code-correct load cases and combinations on a structural model, with ready-made combination sets for the US, Europe, Canada, Australia, and India. |
| **Load Generator** | [`load-gen-api/`](./load-gen-api/SKILLS.md) | Look up wind, snow, and seismic loads/pressures for any location worldwide, across major design codes. |
| **Run Quick Design** | [`run-quick-design/`](./run-quick-design/SKILLS.md) | Call any of 150+ Quick Design calculators (steel, concrete, timber, aluminium, connections, foundations, loads) via one REST endpoint — includes a full catalogue plus schema and sample input/output for each calculator. |
| **3D Renderer** | [`renderer/`](./renderer/SKILLS.md) | Embed the client-side SkyCiv 3D Renderer to visualize a structural model and its analysis results interactively in the browser. |
| **Schema Agent** | [`schema-agent/`](./schema-agent/SKILLS.md) | Interpret an uploaded floor plan (DXF/DWG/PDF/image) into a precise structural schema that the S3D skill can build a model from. |
| **Section Selector** | [`section-selector/`](./section-selector/SKILLS.md) | Choose the right structural section from the SkyCiv library for any region and material, and inject it correctly into an S3D model. |
| **QA Engineer** (WIP)| [`qa-engineer/`](./qa-engineer/SKILLS.md) | Independent peer-review persona — checks a finished calculation or report for units, sanity, and completeness before it ships. |

---

## How the skills fit together

A typical AI-driven structural workflow chains several of these:

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

Not every solution needs every skill — a simple calculator app might only need `run-quick-design`; a full design platform might use all of them.

`s3d-apps` sits alongside this pipeline rather than inside it — it's for building custom mini-apps embedded *inside* the S3D application itself (client-side, no auth), as opposed to `renderer`, which embeds a standalone viewer in your own external page.

---

## Example applications

| App | Folder | What it demonstrates |
|---|---|---|
| **Glass Balustrade Configurator** | [`prototypes/glass-balustrade-configurator/`](./prototypes/glass-balustrade-configurator/README.md) | A local test app chaining `skyciv-api-v3` → `s3d-api` → `load-gen-api` (AS 1170.2 wind) → `load-combinations` (AS/NZS 1170.0) → `run-quick-design` (AS/NZS 1664) → `renderer` → `cloudcad-api` to model, wind/imposed-load-check, visualize and draft a glass balustrade (aluminium posts, glass infill, CHS handrail) from post spacing, run length, occupancy classification, and site/building data. |
| **Truss Designer** | [`prototypes/truss-designer/`](./prototypes/truss-designer/README.md) | A local test app chaining `skyciv-api-v3` → `s3d-api` → `run-quick-design` (NDS 2018) → `renderer` → `cloudcad-api` to model, ASCE 7-22-check, visualize and draft a Warren/Fink/Howe/Pratt timber roof truss from span, height, type, and a single section size. |

---

## Prototyping tips

When prototyping a solution (or if vibe coding a solution) it's a good idea to stick to the following rules:
 - Don't use `result_filter` key in the `S3D.model.solve` space unless you're 100% sure it will work
 - Stick to a shorter `timeout` in the options key for the API (or leave as default), when prototyping if things go wrong it's easier to identify and test if things don't take >30s to fail.
- Don't call `S3D.results.getAnalysisReport` by default as part of a solve/results pipeline. It re-solves the model and renders every section across every load combination - slow (60-90s+, often timing out) - for a PDF report that's rarely used and usually isn't even surfaced in the app's UI. Only wire it up behind its own explicit button/endpoint if the user actually asks for a downloadable report, the same way a CAD-drawing generation step is kept separate from the main analyze call.
- If we're missing any key inputs that you would recommend, please let us know before you start coding. It's best to clarify any missing inputs. For example, in the wind load generator you will need certain key information - if the user misses this, please let them know before building the prototype.

---

## Contributing

Found a gap, an outdated example, or a mismatch with the live API? Open an issue or PR — these skills are actively maintained against `api/v3` and we want them to stay accurate as the API evolves.


## Sample Prompts for Vibe Coding

### Example 1: Truss Designer
Goal:
I'd like to build a structural engineering software for truss design. It should be an easy to use truss designer with nice graphics. The goal is to make an engaging, powerful and accurate design tool using reliable calculations. Give it a new age and high tech feel, with a coulour scheme of black and blue.

Task:
It should use ASCE7-22 load combinations, they are for small roofs in the US. Build an analysis model, run an NDS check of each member, and generate a CAD drawing ready for build. 

The inputs should be:
- truss span
- truss type (warren, fink, howe, pratt)
- truss height
- timber section sizes should be all a single size (I usually design using 2x4, sx6, 2x8 and 4x4)
- put inputs for loads and sheeting weight

Results:
Result panel on the right should include:
- critical utility ratio
- critical member design reports of the NDS check
- open link for CAD
- table of members and their utilities (so I know it's all been checked)
- reaction summary at my supports


### Example 2: Balustrade design
Goal:
Let's build a glass balustrade configurator. The arrangement will consist of a glass panel between aluminium posts, fixed to concrete as well as a CHS handrail at the top. It will need to take into considerations wind loads (as per AS1170) and typical balustrade loads. It will also generate the CAD drawing with spacing, height dimensions.

Task:
It should use AS1170 load combinations and allow the user to select what type of imposed balustrade loads it should use (for example occupancy type A, B, C1, C2, C5 etc..). Please do a AS1664 check on the posts. And in the outputs should show governing post reactions.

The inputs should be:
- handrail height
- spacing between posts
- site location
- building height, and dimensions (for the wind load generator)
- elevation of the balustrade
- importance factor 
- glass height
- post type (RHS, SHS and CHS) - dropdown
- post sizes (ranging from 50-100 and various thicknesses) - dropdown

Results:
Result panel on the right should include:
- critical utility ratio for posts and governing load case
- critical member design reports of the AS1664 check
- open link for CAD
- table of members and their utilities (so I know it's all been checked)
- governing post reaction (table)

