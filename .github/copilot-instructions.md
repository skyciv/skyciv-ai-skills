# SkyCiv AI Skills — Project Guidelines

## Project Overview

This repository is a collection of skills built on top of the [SkyCiv](https://skyciv.com) structural engineering platform. Each skill teaches an AI agent how to use a specific part of the SkyCiv API ecosystem. Skills are designed to be composed together to build high-quality structural engineering software.

## Skill Structure

Each skill lives in its own folder with a `SKILLS.md` file at the root of that folder:

```
<skill-name>/
  SKILLS.md       # required — skill instructions and API reference
  assets/         # optional — example inputs, catalogues, templates
```

Skill files use YAML frontmatter when the skill needs a `name`, `description`, or `argument-hint` discoverable by agents. Not all skills need frontmatter (documentation-only skills may omit it).

## Adding a New Skill

When a new skill folder and `SKILLS.md` are added to this repository, **always update `README.md`** to include an entry for it. The README is the primary index for humans and agents discovering what skills are available.

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
skyciv-api-v3   → Core auth + request envelope (prerequisite for all API skills)
s3d-api         → Build and solve structural models
cloudcad-api    → Generate CAD drawings from models
renderer        → Visualise models in the browser
load-gen-api    → Retrieve wind/snow/seismic loads by location
schema-agent    → Interpret floor plans (DXF/image) into a structural schema
run-quick-design → Run pre-built SkyCiv calculators
qa-engineer     → Review and validate engineering outputs
```

## README Requirements

The `README.md` must always reflect the current set of skills. When an agent adds, renames, or removes a skill:

1. Update the skills table in `README.md`.
2. Keep descriptions to a single line — clear and non-technical enough for a first-time reader.
3. Do not remove skills from the table without also removing their folder.
