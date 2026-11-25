# SkyCiv AI Skills — Project Guidelines

## Project Overview

This repository is a collection of skills built on top of the [SkyCiv](https://skyciv.com) structural engineering platform. Each skill teaches an AI agent how to use a specific part of the SkyCiv API ecosystem. Skills are designed to be composed together to build high-quality structural engineering software.

## Skill Structure

Each skill lives in its own folder with a `SKILL.md` file at the root of that folder:

```
<skill-name>/
  SKILL.md       # required — skill instructions and API reference
  assets/         # optional — example inputs, catalogues, templates
```

Skill files use YAML frontmatter when the skill needs a `name`, `description`, or `argument-hint` discoverable by agents. Not all skills need frontmatter (documentation-only skills may omit it).

## Adding a New Skill

When a new skill folder and `SKILL.md` are added to this repository, **always update `README.md`** to include an entry for it. The README is the primary index for humans and agents discovering what skills are available.

Add the skill to the skills table in `README.md` using this format:

```markdown
| [skill-folder-name](./skill-folder-name/) | One-line description of what this skill enables |
```

Keep the table sorted alphabetically by folder name.

## Skill Authoring Guidelines

- **Prerequisite note first**: If a skill depends on `S3D.session.start` or another skill, call that out at the top.
- **Use tables for parameters**: Prefer Markdown tables over prose lists for API parameters.
- **Include minimal working examples**: Show the smallest JSON payload that demonstrates the core use case.
- **Reference related skills**: Cross-link to sibling skills where relevant (e.g., `s3d-api` → `skyciv-api-v3`).
- **Be specific about units**: Always state whether values are metric or imperial, and which field controls units.

## Skill Relationships

Skills are designed to work together:

```
skyciv-api-v3    → Core auth + request envelope (prerequisite for all API skills)
s3d-api          → Build and solve structural models; steel/CFS/timber member design via S3D.design.member.check (preferred over Quick Design where the code is supported)
s3d-apps         → Build custom client-side mini-apps embedded inside S3D itself
analysis-results → Read and interpret the results object returned after a solve
cloudcad-api     → Generate CAD drawings from models
renderer         → Visualise models in the browser
load-gen-api     → Retrieve wind/snow/seismic loads by location
load-combinations → Factor those loads into code-correct combinations on the model
schema-agent     → Interpret floor plans (DXF/image) into a structural schema
section-selector → Select and inject the right section from the library into an S3D model
run-quick-design → Run pre-built SkyCiv calculators (all concrete design, connections, foundations, and codes S3D Member Design doesn't cover)
build-quick-design-calculator → Author your own Quick Design calc pack, including S3D integration (s3d_integration.js)
baseplate        → Design and detail steel baseplates
connection       → Check steel connections from a Connection Design JSON (standalone.connection)
foundation-api   → Design piles (standalone.foundation)
qa-engineer      → Review and validate engineering outputs
skill-writer     → Author and validate skills in this repo (run scripts/validate_skill.py before shipping)
```

## README Requirements

The `README.md` must always reflect the current set of skills. When an agent adds, renames, or removes a skill:

1. Update the skills table in `README.md`.
2. Keep descriptions to a single line — clear and non-technical enough for a first-time reader.
3. Do not remove skills from the table without also removing their folder.

## Prototyping tips

When prototyping a solution (or if vibe coding a solution) it's a good idea to stick to the following rules:
 - Don't use `result_filter` key in the `S3D.model.solve` space unless you're 100% sure it will work
 - Stick to a shorter `timeout` in the options key for the API (or leave as default), when prototyping if things go wrong it's easier to identify and test if things don't take >30s to fail.
 - Don't call `S3D.results.getAnalysisReport` by default as part of a solve/results pipeline. It re-solves the model and renders every section across every load combination - slow (60-90s+, often timing out) - for a PDF report that's rarely used and usually isn't even surfaced in the app's UI. Only wire it up behind its own explicit button/endpoint if the user actually asks for a downloadable report, the same way a CAD-drawing generation step is kept separate from the main analyze call.
 - If we're missing any key inputs that you would recommend, please let us know before you start coding. It's best to clarify any missing inputs. For example, in the wind load generator you will need certain key information - if the user misses this, please let them know before building the prototype.
 - Collecting API credentials for **standalone** prototypes (a web app of our own, running outside the SkyCiv platform). Rather than the API credentials needing to be collected via .env, can you please:
   1. Have a settings button that collects this from the UI
   2. Stores in the localStorage so they don't have to continually add these keys
   3. If no key is provided, show the red bar and the settings popup prompting them to input this information
   4. API keys can be collected by logging in and visiting https://platform.skyciv.com/api please put this information in the popup

### In-app solutions (S3D Apps and `S3D.UI.leftMenu` panels) — three extra rules

Anything built on the `s3d-apps` skill runs *inside* a session the user already has open. That changes three things, and each of these has been a real mistake on a real prototype:

 - **Never show a settings/API-key popup.** The credential tip above does not apply — there's already a signed-in user. Read credentials with `SKYCIV_UTILS.currentUser.getApiAuth()`, which returns `{ "username": "example@skyciv.com", "key": "ExAmPlE" }`. See the "Authentication" section of `s3d-apps/SKILL.md`.
 - **Build the whole UI from Semantic UI components** — inputs, dropdowns, checkboxes, tabs, tables and messages, not just the buttons — since S3D itself is Semantic UI. See the "UI" section of `s3d-apps/SKILL.md`.
 - **Pick sections from `SB.library.getTree()`, never from typed-in text.** `load_section` is an exact-string-match lookup against the section library, so a typed path is a silent failure waiting to happen. The tree is available client-side and synchronously, in the same 4-level shape the path needs — drive cascading dropdowns off it. See the "Choosing sections" section of `s3d-apps/SKILL.md`.

Note: Whenever a prototype is improved by the user, please also consider: is this a blind spot of the skills? Should this be included in the relevant skill to ensure the next prototype doesn't face this same issue.

## User Context

 - Engineers like transparency, so if you're going to transfer data, or can show some partial results, I would build that into the UI. It's handy to have both levels: a key results (for example critical utility ratio) AND results along the way + an easy way to see what key values went into subsequent API calls.
 - Accordions of tabulated data is a nice clean way you can show this level of detail without cluttering up the user interface
