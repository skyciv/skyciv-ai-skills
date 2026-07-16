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
2. **Give your assistant the skill(s) it needs** — clone this repo and point your assistant at the relevant `SKILLS.md`, or copy the folder into your assistant's skills directory (e.g. Claude Code's `.claude/skills/`).
3. **Always start with `skyciv-api-v3`** if you're using any `*-api` skill — it covers auth, sessions, and the shared request/response envelope every other API skill builds on.
4. **Read the API docs alongside the skill** when you need more depth: [skyciv.com/api/v3/docs](https://skyciv.com/api/v3/docs).

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
| **QA Engineer** (WIP)| [`qa-engineer/`](./qa-engineer/SKILLS.md) | Independent peer-review persona — checks a finished calculation or report for units, sanity, and completeness before it ships. |
| **Reporting Engineer** | [`reporting-engineer/`](./reporting-engineer/SKILLS.md) | Turn calculation output into a clean, client-ready report (HTML/DOCX) summarizing key inputs and outputs. |

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
  ↓
reporting-engineer     → generate the final client-ready report
```

Not every solution needs every skill — a simple calculator app might only need `run-quick-design`; a full design platform might use all of them.

`s3d-apps` sits alongside this pipeline rather than inside it — it's for building custom mini-apps embedded *inside* the S3D application itself (client-side, no auth), as opposed to `renderer`, which embeds a standalone viewer in your own external page.

---

## Example applications

| App | Folder | What it demonstrates |
|---|---|---|
| **Scaffold Designer** | [`scaffold-designer/`](./scaffold-designer/README.md) | A local test app chaining `skyciv-api-v3` → `s3d-api` → `run-quick-design` (AISC 360-16) → `renderer` → `cloudcad-api` to model, analyze, design-check, visualize and draft a tube-and-coupler scaffold from just a height, width and loading class. |

---

## Contributing

Found a gap, an outdated example, or a mismatch with the live API? Open an issue or PR — these skills are actively maintained against `api/v3` and we want them to stay accurate as the API evolves.
