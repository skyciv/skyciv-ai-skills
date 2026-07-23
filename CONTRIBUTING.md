# Contributing

Thank you for helping keep these skills accurate and useful.

## What to contribute

- **API drift** — a field, endpoint, or example that no longer matches the live SkyCiv API
- **New skill** — a new SkyCiv API namespace or workflow that doesn't have a skill yet
- **New calculator** — a `run-quick-design` calculator missing from the catalogue
- **New prototype** — a working example app demonstrating a skill chain
- **Corrections** — wrong units, wrong defaults, misleading descriptions, broken links

## Reporting issues

Open a GitHub issue describing:
- Which `SKILLS.md` file or asset is affected
- What the current text says
- What it should say (link to the live API docs if relevant: [skyciv.com/api/v3/docs](https://skyciv.com/api/v3/docs))

## Adding or editing a skill

1. Follow the folder structure — one folder, one `SKILLS.md`, optional `assets/`.
2. State any prerequisite skill near the top of `SKILLS.md` (e.g. _"Requires `skyciv-api-v3`"_).
3. Use Markdown tables for API parameters, not prose lists.
4. Include at least one minimal working JSON example.
5. State units explicitly — metric vs. imperial, and which field controls them.
6. **Always update `README.md`** — add a row to the skills table, sorted alphabetically by folder name.

## Adding a `run-quick-design` calculator

1. Create `run-quick-design/assets/<uid>/` with `schema.json`, `sample_input.json`, and `sample_output.json`.
2. Add a row to `run-quick-design/assets/catalogue.md` in the correct category table.

## Pull request checklist

- [ ] `README.md` skills table updated (if adding or removing a skill)
- [ ] No broken internal links
- [ ] Units stated explicitly in any new parameter table
- [ ] At least one working example included in any new skill
- [ ] Existing style and tone matched (tables over prose, concise descriptions)
