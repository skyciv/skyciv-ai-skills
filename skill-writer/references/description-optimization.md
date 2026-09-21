# Optimizing skill descriptions

Condensed from [agentskills.io/skill-creation/optimizing-descriptions](https://agentskills.io/skill-creation/optimizing-descriptions). Load this when a description needs to be written carefully (high-stakes or easily-confused-with-another-skill case) or when a skill isn't triggering reliably and needs systematic testing rather than guesswork.

## How triggering works

Agents load only `name` + `description` for every available skill at startup. When a task matches a description, the agent reads the full `SKILL.md`. The description carries the *entire* burden of triggering — if it doesn't convey when the skill is useful, the skill never gets read.

Nuance: agents typically only consult skills for tasks that need knowledge/capability beyond what they can already do. A trivial one-step request ("read this PDF") may not trigger a matching skill even with a perfect description, because the agent doesn't need help. Well-written descriptions matter most for specialized knowledge — an unfamiliar API, a domain workflow, an uncommon format.

## Principles

- **Imperative phrasing.** "Use this skill when..." not "This skill does...". The agent is deciding whether to act.
- **User intent, not implementation.** Describe what the user is trying to achieve; the agent matches against what was asked for, not internal mechanics.
- **Err pushy.** Explicitly list contexts where it applies, including phrasings that don't name the domain directly: "even if they don't explicitly mention 'CSV' or 'analysis.'"
- **Concise but use the budget.** A few sentences to a short paragraph is typical. Hard limit: 1024 characters.

## Designing trigger eval queries

Build ~20 realistic prompts labeled `should_trigger: true/false` (aim for 8–10 of each).

**Should-trigger queries** — vary along:
- *Phrasing*: formal, casual, typos, abbreviations.
- *Explicitness*: some name the domain directly ("analyze this CSV"), others describe the need without naming it ("my boss wants a chart from this data file").
- *Detail*: terse vs. context-heavy (file paths, column names, backstory).
- *Complexity*: single-step vs. the relevant task buried inside a larger multi-step ask.

The most useful ones are cases where the skill would help but the connection isn't obvious from the query alone — that's where description wording actually matters.

**Should-not-trigger queries** — the valuable ones are **near-misses**: sharing keywords/concepts but needing something genuinely different.

```
Weak negative:  "Write a fibonacci function"          (no overlap, tests nothing)
Strong negative: "I need to update the formulas in my Excel budget spreadsheet"
                 (shares "spreadsheet"/"data" but needs Excel editing, not CSV analysis)
Strong negative: "write a python script that reads a csv and uploads each row to postgres"
                 (touches CSV, but the task is DB ETL, not analysis)
```

Include realism: real file paths (`~/Downloads/report_final_v2.xlsx`), personal context ("my manager asked me to..."), specific details, casual language.

## Testing whether a description triggers

Run each query through the agent with the skill installed; observe whether it invokes the skill (via execution logs / tool-call history / verbose output). A query passes if `should_trigger` matches whether the skill was actually invoked.

Model behavior is nondeterministic — run each query multiple times (3 is a reasonable start) and compute a trigger rate (fraction of runs invoked). A should-trigger query passes above a threshold (0.5 default); a should-not-trigger query passes below it.

```bash
#!/bin/bash
QUERIES_FILE="${1:?Usage: $0 <queries.json>}"
SKILL_NAME="my-skill"
RUNS=3

check_triggered() {
  local query="$1"
  claude -p "$query" --output-format json 2>/dev/null \
    | jq -e --arg skill "$SKILL_NAME" \
      'any(.messages[].content[]; .type == "tool_use" and .name == "Skill" and .input.skill == $skill)' \
      > /dev/null 2>&1
}

count=$(jq length "$QUERIES_FILE")
for i in $(seq 0 $((count - 1))); do
  query=$(jq -r ".[$i].query" "$QUERIES_FILE")
  should_trigger=$(jq -r ".[$i].should_trigger" "$QUERIES_FILE")
  triggers=0
  for run in $(seq 1 $RUNS); do
    check_triggered "$query" && triggers=$((triggers + 1))
  done
  jq -n --arg query "$query" --argjson should_trigger "$should_trigger" \
    --argjson triggers "$triggers" --argjson runs "$RUNS" \
    '{query: $query, should_trigger: $should_trigger, triggers: $triggers, runs: $runs, trigger_rate: ($triggers / $runs)}'
done | jq -s '.'
```

Adapt `check_triggered` to whatever the target agent client exposes. If the client supports it, stop a run early once the outcome is clear (skill consulted or not) to cut eval cost.

## Avoiding overfitting: train/validation split

Optimizing against every query risks a description that works for these exact phrasings but fails on new ones.

- **Train (~60%)**: use to find failures and drive changes.
- **Validation (~40%)**: set aside; only use to check that changes generalize.

Keep a proportional should/should-not mix in both, shuffle once, keep the split fixed across iterations.

## The optimization loop

1. Evaluate the current description on both train and validation sets.
2. Identify train-set failures: which should-trigger queries didn't fire? Which should-not-trigger queries falsely fired?
3. Revise, using only train-set failures as signal:
   - Should-trigger failures → description too narrow: broaden scope / add context about when it's useful.
   - Should-not-trigger false-fires → description too broad: add what it does *not* cover, or clarify the boundary with an adjacent skill.
   - Don't hard-code keywords from failed queries (overfitting) — generalize to the underlying category.
   - If stuck after several iterations, try a structurally different framing rather than incremental tweaks.
   - Recheck the 1024-character limit — descriptions tend to grow during optimization.
4. Repeat until train-set queries pass or improvement stalls.
5. Select the iteration with the best *validation* pass rate — not necessarily the last one; an earlier draft may generalize better than a later, overfit one.

Five iterations is usually enough. If nothing improves, suspect the queries (too easy/hard/mislabeled) before suspecting the description.

## Before / after example

```yaml
# Before
description: Process CSV files.

# After
description: >
  Analyze CSV and tabular data files — compute summary statistics,
  add derived columns, generate charts, and clean messy data. Use this
  skill when the user has a CSV, TSV, or Excel file and wants to
  explore, transform, or visualize the data, even if they don't
  explicitly mention "CSV" or "analysis."
```

The improved version is more specific about *what* it does (stats, derived columns, charts, cleaning) and broader about *when* it applies (CSV/TSV/Excel, even without the literal keywords).

## Final sanity check

After picking a description: confirm it's under 1024 characters, try a handful of prompts manually, and — for anything important — write 5–10 fresh queries never used during optimization and run them through the eval script for an honest generalization check.
