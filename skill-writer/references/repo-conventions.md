# This repo's conventions for skills

Additional rules layered on top of the generic Agent Skills spec, for any skill that lives at the top level of `skyciv-ai-skills` (i.e. is part of the SkyCiv API pipeline documented in the root `README.md` and `CLAUDE.md`) — not for tooling skills under `.claude/skills/` like this one. Load this when writing or auditing a repo skill.

## What this repo's skills are

Structured Markdown that teaches an agent to correctly call the SkyCiv API instead of guessing at request shapes and units. There's no build/lint/test system — the only artifacts are `SKILL.md` files and their supporting assets.

## Mandatory conventions (from `.github/copilot-instructions.md` via `CLAUDE.md`)

- **Always update `README.md`** when adding a new skill folder — add a row to the skills table, keeping it sorted alphabetically by folder name.
- **State the prerequisite first.** If a skill depends on `S3D.session.start`, a non-standard session opener (e.g. `standalone.loads.start`, `standalone.baseplate.start`), or another skill, call that out near the top of `SKILL.md` — typically as a blockquote right after the H1.
- **Use tables for API parameters**, not prose lists.
- **Include a minimal working example** — the smallest JSON payload that demonstrates the core use case.
- **Cross-link related skills** (e.g. `s3d-api` → `skyciv-api-v3`).
- **Always state units** (metric vs. imperial) and which field controls them — these skills exist specifically to stop agents guessing at units.
- Keep the skill's one-line description in `README.md`'s table non-technical enough for a first-time reader — save the dense, keyword-rich version for the frontmatter `description`.
- Treat the [live API docs](https://skyciv.com/api/v3/docs) as the source of truth over anything written in a skill — if a schema, example, or endpoint looks stale, flag it.

## Frontmatter style actually used in this repo

Some `SKILL.md` files have frontmatter (`name`, `description`, optionally `argument-hint`) so harnesses can discover them; documentation-only foundational skills (`skyciv-api-v3`, `s3d-api`, `cloudcad-api`, `load-gen-api`, `run-quick-design`) currently omit it. Match the style of the skill you're editing rather than imposing frontmatter where the sibling skills don't use it, unless the user asks for it specifically.

Where frontmatter is used, `description` is written long, dense, and pushy — quoted YAML string, third-person imperative ("Use when..."), enumerating field names/namespaces/call names the skill covers plus plain-language phrasings a user might use without saying "SkyCiv" (see `baseplate/SKILL.md` and `qa-engineer/SKILL.md` for the pattern). This matches — and predates — the generic spec's own description guidance in `description-optimization.md`.

## `run-quick-design` calculator asset layout

If the skill being added/edited is a new calculator under `run-quick-design`, its catalogue lives at `run-quick-design/assets/catalogue.md`, indexed by UID and grouped by category (Foundation, Steel, Concrete, Timber, Aluminium, Connections, Loads, etc.). Each entry links to `run-quick-design/assets/<uid>/` containing exactly:

```
schema.json         # input/output JSON schema for that calculator
sample_input.json   # minimal working example input
sample_output.json  # corresponding example output
```

Adding a calculator means adding all three files plus a new row in `catalogue.md`'s correct category table.

## How the pipeline fits together

Useful context for scoping a new skill correctly — where does it sit relative to the others:

```
schema-agent          → interpret a floor plan into a structural schema
  ↓
s3d-api / cloudcad-api → build the 3D model / 2D drawing
  ↓
load-gen-api           → pull wind / snow / seismic loads for the site
  ↓
load-combinations      → factor those loads into code-correct combinations on the model
  ↓
s3d-api                → solve
  ↓
analysis-results       → fetch and interpret the results, then run-quick-design for member/connection checks
  ↓
renderer               → visualize the model and results
  ↓
qa-engineer            → independent review of the results
```

`skyciv-api-v3` underlies every `*-api` skill (auth, session, the `{ auth, options, functions }` envelope). `s3d-apps` sits alongside the pipeline rather than in it — client-side mini-apps embedded inside an already-open S3D session, no auth/session calls of its own.

## Prototyping / app-building guardrails

Not skill-authoring rules, but relevant when a new skill's worked example demonstrates building an app on top of it — carry these into any example code:

- Don't use `result_filter` in `S3D.model.solve` unless certain it works.
- Keep `timeout` short during prototyping (or leave default) — faster, clearer failures.
- Don't call `S3D.results.getAnalysisReport` as part of a default solve/results pipeline — it re-solves and renders every section across every load combination (60–90s+, often timing out) for a PDF that's rarely surfaced. Wire it up only behind its own explicit button/endpoint if asked for a downloadable report.
- If a worked example is missing a key input a real implementation would need (e.g. site data for a wind load lookup), call that out rather than inventing a plausible-looking default.
