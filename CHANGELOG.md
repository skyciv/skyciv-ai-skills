# Changelog

A running log of significant changes to this skills repo, newest first.

**Why this file exists:** the skills here are kept in sync with the live SkyCiv API. When an agent reads a
`SKILL.md` it sees the current state but not *what recently moved*. This log gives that context — which skills
changed, when, and why — so an agent can tell a settled convention from one that changed last week.

**Adding an entry:** one row per significant change, newest at the top. Keep *Details* to a sentence or two —
enough for an agent to know whether it needs to go and read the diff. Skip trivial commits (typos, formatting,
single-word tweaks). Use the skill folder name in *Skills Affected*, or `repo` for root-level files
(`README.md`, `CLAUDE.md`, `.github/copilot-instructions.md`).

| Date | Change Summary | Skills Affected | Details |
|---|---|---|---|
| 2026-09-20 | New `build-quick-design-calculator` skill | `build-quick-design-calculator`, repo | Authoring skill for SkyCiv Quick Design calc packs (`config.json`, `calculate.js`, `ui.js`, `docs.md`, `s3d_integration.js`). Covers the input-form schema, the server-side globals (`REPORT`, `ReportHelpers`, `SectionProps`, `Database`, `requireUtil`), the results/utility-box object, metric/imperial conversion and S3D batch integration. The 21 official Quick Design docs are bundled under `assets/documentation/`. This is the **authoring** counterpart to `run-quick-design`, which only *calls* published calculators by UID. |
| 2026-09-20 | New `skill-writer` meta-skill | `skill-writer` | Skill for authoring and auditing other skills against the [Agent Skills spec](https://agentskills.io/specification) — frontmatter rules, description writing, progressive disclosure, plus this repo's own conventions. Ships `scripts/validate_skill.py` (frontmatter, naming, ~5000-token body limit, dangling references) and two SKILL.md templates. Run the validator on any skill before shipping it. |
| 2026-09-17 | S3D model schema — September update | `s3d-api` | Added to the `s3d_model` schema: semi-rigid member releases (`stiffness_A_Ry/Rz`, `stiffness_B_Ry/Rz` with `'S'` fixity), rigid diaphragms and orthotropic plate/material properties, non-linear spring supports (`non_linear_spring_stiffness`), `load_combination_settings` (auto-generation by country/code), and `member_prestress_loads`. |
| 2026-09-14 | Platform-native UI, section library and credential handling | `s3d-apps`, `load-gen-api`, `section-selector`, repo | Three behaviour rules for agents building on the platform: build UI from **Semantic UI** components rather than hand-rolled HTML/CSS; **never prompt the user for API credentials**; and choose sections via `SB.library.getTree()` rather than a typed-in library path. Also clarified that `status: 1` from the load generator is a warning, not necessarily a failure. |
| 2026-09-03 | Easier API key collection for prototyping | repo | Added guidance to `CLAUDE.md` and `.github/copilot-instructions.md` on how a prototype should collect and store SkyCiv API credentials. |
| 2026-08-20 | New `analysis-results` skill | `analysis-results`, `s3d-api`, `s3d-apps`, repo | Documents the analysis results object returned after a solve — reactions, per-station member/plate forces, stresses, displacements and min/max summaries — for both the `S3D.results.get` API path and the client-side `S3D.results.getAll` app path. Includes a full real-world example response under `assets/`. Cross-linked from `s3d-api` and `s3d-apps` instead of being duplicated in them. |
| 2026-08-20 | Renamed every `SKILLS.md` to `SKILL.md` | all | Singular `SKILL.md` is what Claude and other harnesses auto-discover. Any older reference to `SKILLS.md` is stale. |
| 2026-08-19 | Area loads, missing member types and left-menu functions | `s3d-api`, `s3d-apps` | Added the `general_one_way` area load type, documented member types that were previously missing from the schema, tightened the structural engineering modelling rules, and expanded the S3D App left-menu function reference. |
| 2026-08-18 | Gridlines added to the S3D model schema | `s3d-api` | Documented the `gridlines` object so agents can lay out and reference a grid when building models. |
| 2026-08-11 | Line loads and left-menu feature development | `s3d-api`, `s3d-apps` | Added distributed/line load documentation to the `s3d_model` schema and substantially expanded the S3D Apps left-menu API for building embedded UI. |
| 2026-08-07 | New `baseplate` skill | `baseplate`, repo | Full `standalone.baseplate` design skill — base plate, anchor bolts and welds against the supporting concrete. Includes worked request/response pairs for the American, Australian, Canadian and European codes under `sample-api/`. Note it uses its own session opener, `standalone.baseplate.start`, not `S3D.session.start`. |
| 2026-07-31 | CloudCAD drawing improvements | `cloudcad-api` | Added title blocks, dashed lines, angular dimensions and image support to the 2D drawing schema, plus an `all-elements.json` reference covering every supported element and SVG examples of each annotation type. |
