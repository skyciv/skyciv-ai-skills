# Frontmatter reference

Full normative detail from the [Agent Skills specification](https://agentskills.io/specification). Load this when drafting or auditing a `SKILL.md`'s YAML frontmatter.

## Directory structure

A skill is a directory containing, at minimum, a `SKILL.md` file:

```
skill-name/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...                # Any additional files or directories
```

`SKILL.md` must contain YAML frontmatter followed by Markdown content.

## `name` field (required)

- Must be 1–64 characters.
- May only contain unicode lowercase alphanumeric characters (`a-z`, `0-9`) and hyphens (`-`).
- Must not start or end with a hyphen.
- Must not contain consecutive hyphens (`--`).
- **Must match the parent directory name.**

```yaml
# Valid
name: pdf-processing
name: data-analysis
name: code-review

# Invalid
name: PDF-Processing   # uppercase not allowed
name: -pdf              # cannot start with hyphen
name: pdf--processing   # consecutive hyphens not allowed
```

## `description` field (required)

- Must be 1–1024 characters.
- Should describe both what the skill does and when to use it.
- Should include specific keywords that help agents identify relevant tasks.

```yaml
# Good
description: Extracts text and tables from PDF files, fills PDF forms, and merges multiple PDFs. Use when working with PDF documents or when the user mentions PDFs, forms, or document extraction.

# Poor
description: Helps with PDFs.
```

See `description-optimization.md` for the full method of writing and testing one of these.

## Top-level fields are closed

`name`, `description`, `license`, `compatibility`, `metadata` and `allowed-tools` are the only fields the spec defines. Anything else — `argument-hint`, `version`, `author`, `tags` — must be nested under `metadata:`. Some harnesses reject unknown top-level keys rather than ignoring them, so this is a discovery failure, not a style nit.

## `license` field (optional)

- Specifies the license applied to the skill.
- Keep it short: either the license name, or the name of a bundled license file.

```yaml
license: Proprietary. LICENSE.txt has complete terms
```

## `compatibility` field (optional)

- 1–500 characters if provided.
- Only include it if the skill has specific environment requirements: intended product, required system packages, network access needs, etc.
- Most skills do not need this field.

```yaml
compatibility: Designed for Claude Code (or similar products)
compatibility: Requires git, docker, jq, and access to the internet
compatibility: Requires Python 3.14+ and uv
```

## `metadata` field (optional)

- A map from string keys to string values.
- Clients can use this to store additional properties the spec doesn't define.
- Namespace/uniquify key names to avoid accidental conflicts.

```yaml
metadata:
  author: example-org
  version: "1.0"
```

## `allowed-tools` field (optional, experimental)

- A space-separated string of tools pre-approved to run.
- Support varies between agent implementations — don't rely on it being enforced everywhere.

```yaml
allowed-tools: Bash(git:*) Bash(jq:*) Read
```

## Body content

No format restrictions beyond being Markdown — write whatever helps the agent perform the task. Recommended sections: step-by-step instructions, examples of inputs/outputs, common edge cases.

The agent loads the entire `SKILL.md` body once it activates the skill — split longer content into referenced files rather than inlining everything.

## Optional directories

### `scripts/`

Executable code the agent can run. Scripts should be self-contained or clearly document dependencies, include helpful error messages, and handle edge cases gracefully. Language support depends on the agent implementation (Python, Bash, and JavaScript are common).

### `references/`

Additional documentation loaded on demand — e.g. `REFERENCE.md`, `FORMS.md`, or domain-specific files (`finance.md`, `legal.md`). Keep individual files focused on one topic; smaller files cost less context when loaded.

### `assets/`

Static resources: templates (document/config templates), images (diagrams, examples), data files (lookup tables, schemas).

## Progressive disclosure

1. **Metadata** (~100 tokens): `name` + `description`, loaded at startup for every skill.
2. **Instructions** (< 5000 tokens recommended): the full `SKILL.md` body, loaded when the skill activates.
3. **Resources** (as needed): files in `scripts/`, `references/`, `assets/`, loaded only when the body tells the agent to load them.

Keep `SKILL.md` under 500 lines. Move detailed reference material to separate files.

## File references

Use relative paths from the skill root:

```markdown
See [the reference guide](references/REFERENCE.md) for details.

Run the extraction script:
scripts/extract.py
```

Keep references one level deep from `SKILL.md` — avoid deeply nested reference chains (a reference file pointing to another reference file pointing to another).

## Validation

The spec ships a reference validator:

```bash
skills-ref validate ./my-skill
```

This checks frontmatter validity and naming conventions. If it isn't installed/available in this environment, use the [Final checklist](../SKILL.md#final-checklist) in the main skill file as a manual substitute.
