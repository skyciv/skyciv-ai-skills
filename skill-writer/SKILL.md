---
name: skill-writer
description: "Use when creating a brand-new agent skill (a SKILL.md plus optional scripts/references/assets folders) from scratch, or when auditing, fixing, restructuring, or reviewing an existing one — including rewriting a weak or non-triggering description field, splitting an overlong SKILL.md into references/scripts/assets, validating frontmatter against the Agent Skills spec, or bringing a skill in this repo in line with its README/prerequisite/table/units conventions. Trigger even when the user doesn't say 'skill' or 'SKILL.md' explicitly — e.g. 'teach Claude how to do X every time', 'write instructions Claude can reuse for Y', 'this skill isn't triggering', 'my SKILL.md is too long', 'add a new skill folder for Z API', or 'review this skill before I ship it'."
metadata:
  argument-hint: "What to do, e.g. 'new skill for the Foo API' or 'audit baseplate/SKILL.md'"
  spec: https://agentskills.io/specification
---

# Skill Writer

Meta-skill for authoring and auditing agent skills — SKILL.md files (+ optional `scripts/`, `references/`, `assets/`) per the [Agent Skills spec](https://agentskills.io/specification). Encodes the spec's normative rules, the best-practice patterns from [agentskills.io](https://agentskills.io/skill-creation/best-practices), and (when working inside this repo) the SkyCiv-skill-library house style from the root `CLAUDE.md`.

Full detail lives in `references/` — this file is the workflow and the rules you must never skip. Load a reference file only when you reach the step that needs it.

## Mode A — writing a new skill from scratch

1. **Get real expertise, not vibes.** A skill generated purely from an LLM's general knowledge produces generic filler ("handle errors appropriately"). Ask the user for: a transcript of a real task they did with an agent (steps that worked, corrections they made), or existing project artifacts (runbooks, API specs, code review comments, past incident fixes). See `references/best-practices.md#start-from-real-expertise`.
2. **Scope it as one coherent unit** — like a function. Not so narrow that a task needs five skills loaded at once; not so broad it can't trigger precisely. See `references/best-practices.md#design-coherent-units`.
3. **Pick `name`** — must equal the parent directory name and pass the naming rules in [Frontmatter rules](#frontmatter-rules-never-skip) below.
4. **Draft `description`** using the checklist in [Writing the description](#writing-the-description) — this is the single field that decides whether the skill ever gets used.
5. **Decide the layout**: single `SKILL.md` if the whole thing is under ~500 lines / ~5000 tokens; otherwise split detail into `references/*.md`, put runnable helpers in `scripts/`, and templates/schemas/lookup data in `assets/`. See `references/frontmatter-reference.md#optional-directories`.
6. **Write the body** calibrating prescriptiveness to fragility (freeform guidance where approaches vary, exact command sequences where they don't), favoring procedures over one-off answers, and including a gotchas section for anything that defies a reasonable guess. See `references/best-practices.md`.
7. **If this skill lives in this repo** (`<skill>/SKILL.md` at repo root, part of the SkyCiv pipeline), also apply `references/repo-conventions.md` — README table update, prerequisite statement, tables for params, worked example, cross-links, explicit units.
8. **Validate and self-check** — run `python scripts/validate_skill.py <path-to-skill>` and work through the [Audit checklist](#audit-checklist) before calling it done.

## Mode B — auditing or fixing an existing skill

Start from the symptom. The fix location is usually predictable, and reading everything first wastes context on the wrong layer.

| Symptom | Where the problem almost always is | What to do |
|---|---|---|
| Never fires | `description` — not the body | Missing "when to use", no concrete trigger keywords, describes internals instead of user intent. Rewrite per [Writing the description](#writing-the-description). Also consider that the task may be simple enough that the agent needs no skill at all. |
| Fires on unrelated work | `description` too broad | Narrow the scope and state the boundary against the adjacent skill that *should* have fired. |
| Fires but gets ignored or misapplied | Body | Vagueness, menus instead of one default, missing gotchas, or the key instruction buried past 500 lines. |
| Output is generic boilerplate | Body content | Cut every line failing "would the agent get this wrong without this?" and replace with real project specifics. |
| Too long / slow to load | Structure | Split per [Structural rules](#structural-rules-progressive-disclosure), one load trigger per file, gotchas stay inline. |
| Spec/discovery errors | Frontmatter | Run `scripts/validate_skill.py`; check `name` vs directory, field lengths, non-spec top-level keys. |

Then:

1. Read the *entire* skill folder — `SKILL.md` plus everything under `scripts/`, `references/`, `assets/` — before judging it. A skill that looks incomplete standalone may be fine because detail was deliberately pushed to a reference file.
2. Run `python scripts/validate_skill.py <path-to-skill>` for the mechanical checks, so your reading time goes to the judgement calls.
3. If it's a repo skill, diff it against `references/repo-conventions.md`'s checklist (README row present and alphabetical, prerequisite stated near the top, tables not prose for params, units stated, cross-links present).
4. Report findings first; apply fixes once agreed, one skill at a time.

## Frontmatter rules (never skip)

| Field | Required | Constraints |
|---|---|---|
| `name` | Yes | 1–64 chars. Lowercase unicode alphanumerics and hyphens only. No leading/trailing hyphen, no `--`. **Must match the parent directory name exactly.** |
| `description` | Yes | 1–1024 chars, non-empty. Must describe both what the skill does and when to use it. |
| `license` | No | License name, or a reference to a bundled license file. |
| `compatibility` | No | Max 500 chars. Only include if the skill has real environment requirements (specific product, system packages, network access). Most skills omit it. |
| `metadata` | No | String-to-string map for anything outside the spec. Namespace keys to avoid collisions. |
| `allowed-tools` | No | Experimental. Space-separated string of pre-approved tools, e.g. `Bash(git:*) Bash(jq:*) Read`. |

**Nothing else is a spec field.** Anything extra — `argument-hint`, `version`, `author`, `tags` — belongs nested under `metadata:`, not at the top level. Some harnesses reject unknown top-level keys outright.

```yaml
name: pdf-processing     # valid
name: data-analysis      # valid
name: PDF-Processing     # INVALID — uppercase
name: -pdf               # INVALID — leading hyphen
name: pdf--processing    # INVALID — consecutive hyphens
```

Full field-by-field detail and further examples: `references/frontmatter-reference.md`.

## Writing the description

The `description` is the *only* thing loaded for every skill at startup (with `name`) — the agent decides whether to read the rest of the file based on this text alone. Get it wrong and the skill either never fires or fires on the wrong requests.

- Use imperative framing: "Use when..." / "Use this skill when...", not "This skill does...".
- Lead with what the user is trying to achieve, not the skill's internals.
- Be pushy about scope: explicitly list phrasings and contexts where it applies, including ones that don't name the domain directly ("even if they don't say X").
- Name concrete trigger surface: file types, formats, tool/API names, task verbs, domain nouns.
- State what it does NOT cover if there's a likely near-miss skill or capability, to avoid false triggers.
- Concise is good, but use the character budget (up to 1024) — a one-line description ("Helps with PDFs.") under-triggers.

```yaml
# Poor
description: Helps with PDFs.

# Good
description: >
  Extracts text and tables from PDF files, fills PDF forms, and merges
  multiple PDFs. Use when working with PDF documents or when the user
  mentions PDFs, forms, or document extraction.
```

One nuance: agents only consult skills for tasks that need capability beyond what they can already do. "Read this PDF" may not trigger a PDF skill however good the description, because basic tools suffice. Descriptions earn their keep on specialized APIs, domain workflows, and uncommon formats.

If a description isn't triggering reliably, don't guess-and-check — build a small eval set (should-trigger / should-not-trigger queries, near-misses especially) and iterate against it. Full method: `references/description-optimization.md`.

## Structural rules (progressive disclosure)

1. **Metadata** (`name` + `description`, ~100 tokens) loads for every skill, always.
2. **Instructions** (the SKILL.md body) loads in full the moment the skill activates — keep it under ~500 lines / ~5000 tokens.
3. **Resources** (`scripts/`, `references/`, `assets/`) load only when the body tells the agent to open them.

Consequences:
- Every reference file must be pointed to with **when to load it**, not just that it exists — "Read `references/errors.md` if the API returns non-200" beats "see references/ for details."
- Keep file references **relative** and **one level deep** from `SKILL.md` — don't chain references pointing to other references.
- Keep each `references/*.md` focused on one topic; smaller files cost less context when loaded on demand.
- Keep gotchas **inline in SKILL.md**, never in a reference file. The agent can't recognize the load trigger for a problem it doesn't know exists.

## Gotchas

- A description that only restates the skill's name ("PDF skill for PDFs") will under-trigger — the agent needs the *scenario*, not the label.
- An over-broad description ("Use for any file processing") will false-trigger and waste context on unrelated tasks — add explicit exclusions.
- Writing a skill from general knowledge alone (no real transcript, no real docs) produces vague, low-value instructions — always ask for source material first if none was given.
- A `references/` file the body never tells the agent to open is dead weight — it costs nothing until loaded, but it also never gets used. Every reference needs an inline pointer with a trigger condition.
- `name` mismatching the directory name is a spec violation that some harnesses will silently reject or fail to discover — always check the directory name last, since it's easy to rename one and forget the other.
- Non-spec keys at the top level of the frontmatter (most commonly `argument-hint`) are the second most common defect after weak descriptions. Nest them under `metadata:`.
- In this repo specifically: adding a new top-level skill folder without adding its row to `README.md`'s skills table (alphabetical by folder name) is a recurring miss — see `references/repo-conventions.md`.

## Best-practice patterns to reach for

Not every skill needs all of these — pick what fits. Full explanations and examples: `references/best-practices.md`.

- **Gotchas section** — non-obvious, environment-specific corrections, kept inline in `SKILL.md`. Every time you have to correct an agent, that correction belongs here.
- **Templates for output format** — a concrete Markdown/JSON template beats prose description of a format.
- **Checklists** for multi-step workflows with dependencies.
- **Validation loops** — do work → run a validator → fix → repeat until it passes.
- **Plan-validate-execute** — for batch/destructive operations, produce a plan, validate it against a source of truth, then execute.
- **Defaults, not menus** — pick one recommended tool/approach and mention alternatives briefly, rather than listing options as equals.
- **Procedures over declarations** — teach the general method (read schema → join on convention → filter → aggregate), not the answer to today's specific instance.
- **Bundle a script** once you notice the agent reinventing the same logic (parsing, validation, chart-building) across runs.

## If this skill belongs in this repo (skyciv-ai-skills)

This repo layers its own conventions on top of the generic spec (from the root `CLAUDE.md`). Read `references/repo-conventions.md` before finishing a repo skill. In short:

- State the prerequisite (`S3D.session.start`, another skill, etc.) near the top of `SKILL.md`.
- Use tables for API parameters, not prose lists.
- Include a minimal working JSON example.
- Cross-link related skills (e.g. `s3d-api` → `skyciv-api-v3`).
- Always state units and which field controls them.
- Add a row to `README.md`'s skills table, alphabetical by folder name, description kept to one non-technical line.
- Match the existing frontmatter style: `name`, a long pushy `description` in quotes, extras under `metadata`.

## Bundled files

- `scripts/validate_skill.py` — mechanical validator (frontmatter, naming, sizes, broken/dangling references). Run it on every skill before shipping and at the start of every audit.
- `assets/skill-template.md` — generic, spec-minimal skeleton.
- `assets/skyciv-skill-template.md` — this repo's house style (prerequisite callout, param table, worked example, gotchas).
- `references/frontmatter-reference.md` — load when drafting or auditing frontmatter field by field.
- `references/description-optimization.md` — load when a description under- or over-triggers and needs eval-driven rewriting.
- `references/best-practices.md` — load when writing or restructuring a body.
- `references/repo-conventions.md` — load when the skill lives in `skyciv-ai-skills`.

## Audit checklist

**Frontmatter**
- [ ] `name` matches the parent directory, ≤64 chars, lowercase/digits/hyphens, no leading/trailing/double hyphen
- [ ] `description` present, ≤1024 chars, says **what** and **when**, imperative, user-intent framed, not a one-liner, not over-broad
- [ ] Only spec fields at top level; extras nested under `metadata` (string → string)
- [ ] `compatibility` present only if there really are environment requirements (≤500 chars)

**Body**
- [ ] Under ~500 lines / ~5000 tokens, or split into `references/` with explicit "read this when..." pointers
- [ ] Prerequisites and dependencies stated up front
- [ ] At least one minimal working example
- [ ] Gotchas section present and inline, not in a reference file
- [ ] One clear default per decision, alternatives as brief escape hatches
- [ ] Procedures generalize; no one-off answers masquerading as instructions
- [ ] No content a competent agent already knows

**Files**
- [ ] Relative paths from skill root, one level deep, no reference chains
- [ ] Every reference/script/asset is linked from the body with a trigger condition
- [ ] Scripts are self-contained or document dependencies, with useful error messages

**Validation**
- [ ] `python scripts/validate_skill.py <path-to-skill>` passes (or `skills-ref validate ./<skill>` if installed)
- [ ] Tested against at least one real task; corrections folded back into gotchas
- [ ] If a repo skill: README row added/updated, prerequisite stated, tables used, units stated, cross-links present
