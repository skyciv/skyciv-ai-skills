---
name: replace-with-directory-name
description: "Reference for the SkyCiv <namespace> API — <one clause on what it does>. Documents <the .start/session call> and <the main functions>, and every key of <the main input object> (<list the top-level keys>) — <call out units, per-code variance, or anything that changes shape>. Use when <plain-language phrasings a user might use>, even in plain language like '<example phrase 1>' or '<example phrase 2>', without saying 'SkyCiv'."
---

# Replace With Title

`<namespace>.<function>` <one or two sentences on what the API does and for whom>. This skill exists so the request/response shape is correct on the first try instead of guessed from memory.

> **Prerequisite:** Open the session with `<namespace>.session.start` (or the skill's own non-standard opener, if it has one — call that out explicitly, it's a common gotcha) as the first function. See [`skyciv-api-v3`](../skyciv-api-v3/SKILL.md) for auth, `options`, and the shared `{ auth, options, functions }` envelope every API skill builds on.

## `<main_input_object>` structure

| Key | Type | Description | Units | Reference |
|---|---|---|---|---|
| `example_key` | string | What it controls. | — | [`references/example.md`](references/example.md) |

## Minimal working example

```json
{
  "auth": { "...": "..." },
  "options": { "...": "..." },
  "functions": [
    { "function": "<namespace>.session.start" }
  ]
}
```

## Units

State explicitly which field controls the unit system and what the defaults/options are — this is the single most common source of agent-guessed errors.

## Gotchas

- Non-obvious behavior confirmed against the live API (e.g. a call that silently fails on the *second* invocation, not the first; a field that's required only under certain other field values).

## Cross-links

- [`skyciv-api-v3`](../skyciv-api-v3/SKILL.md) — auth/session/envelope prerequisite.
- Link any other skill this one feeds into or depends on.

---

**Repo checklist before shipping this skill:**
- [ ] Added a row to `README.md`'s skills table, alphabetical by folder name, one non-technical line
- [ ] Prerequisite stated near the top
- [ ] Params in a table, not prose
- [ ] Minimal working example included
- [ ] Units stated explicitly
- [ ] Related skills cross-linked
