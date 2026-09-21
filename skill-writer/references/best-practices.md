# Best practices for skill creators

Condensed from [agentskills.io/skill-creation/best-practices](https://agentskills.io/skill-creation/best-practices). Load this when drafting a skill's body, or when auditing one for bloat, vagueness, or missing structure.

## Start from real expertise

Asking an LLM to generate a skill from general training knowledge alone produces vague, generic procedures ("handle errors appropriately," "follow best practices for authentication") instead of the specific patterns that make a skill valuable. Feed in domain-specific context instead:

**Extract from a hands-on task.** Complete a real task in conversation, then extract the reusable pattern. Pay attention to: steps that worked, corrections the user made ("use library X instead of Y," "check for edge case Z"), the actual input/output formats, and project-specific facts the agent didn't already know.

**Synthesize from existing project artifacts.** Feed an LLM your team's actual runbooks, API specs, code review comments, version-control history (especially patches/fixes — they reveal patterns through what changed), and real failure cases + resolutions. A skill built from *your* schemas and failure modes beats one built from a generic best-practices article.

## Refine with real execution

The first draft usually needs refinement. Run the skill against real tasks and feed all the results — not just failures — back into revision. Even one execute-then-revise pass noticeably improves quality; complex domains benefit from several.

Read execution traces, not just final outputs. Wasted steps usually trace to: instructions too vague (agent tries several approaches before one works), instructions that don't apply to the current task but get followed anyway, or too many options with no clear default.

## Spending context wisely

Once activated, the full `SKILL.md` body competes for attention with conversation history, system context, and other active skills.

**Add what the agent lacks, omit what it knows.** Don't explain what a PDF is or how HTTP works. Ask of every sentence: "Would the agent get this wrong without it?" If no, cut it. If the agent already does the whole task well unaided, the skill may not be adding value at all.

```markdown
<!-- Too verbose -->
PDF (Portable Document Format) files are a common file format...
To extract text, you'll need to use a library. pdfplumber is recommended.

<!-- Better -->
Use pdfplumber for text extraction. For scanned documents, fall back to
pdf2image with pytesseract.
```

## Design coherent units

Scope a skill like a function's responsibility: a coherent unit of work that composes with other skills. Too narrow → multiple skills must load for one task, with overhead and possibly conflicting instructions. Too broad → hard to trigger precisely. ("Query a database and format results" is one unit; adding "database administration" to it is probably too much.)

## Aim for moderate detail

Exhaustive documentation can hurt: the agent struggles to find what's relevant and may wander down paths triggered by instructions that don't apply to the current task. Concise, stepwise guidance plus a working example usually beats covering every edge case — let the agent's own judgment handle the long tail.

## Calibrating control

Not every part of a skill needs the same prescriptiveness — match specificity to how fragile the task is.

**Give freedom** when multiple approaches are valid and the task tolerates variation. Explaining *why* often beats a rigid directive, since an agent that understands the purpose makes better context-dependent calls:

```markdown
## Code review process
1. Check all database queries for SQL injection (use parameterized queries)
2. Verify authentication checks on every endpoint
3. Look for race conditions in concurrent code paths
4. Confirm error messages don't leak internal details
```

**Be prescriptive** when operations are fragile, consistency matters, or a specific sequence is mandatory:

```markdown
## Database migration
Run exactly this sequence:
    python scripts/migrate.py --verify --backup
Do not modify the command or add additional flags.
```

Most skills mix both — calibrate section by section.

**Provide defaults, not menus.** Pick one recommended tool/approach and mention alternatives briefly rather than presenting equal options:

```markdown
<!-- Too many options -->
You can use pypdf, pdfplumber, PyMuPDF, or pdf2image...

<!-- Clear default with escape hatch -->
Use pdfplumber for text extraction. For scanned PDFs requiring OCR,
use pdf2image with pytesseract instead.
```

**Favor procedures over declarations.** Teach the general method, not the answer to today's specific instance:

```markdown
<!-- Specific answer, only useful for this exact task -->
Join `orders` to `customers` on `customer_id`, filter `region = 'EMEA'`,
sum `amount`.

<!-- Reusable method -->
1. Read the schema from references/schema.yaml to find relevant tables
2. Join tables using the `_id` foreign key convention
3. Apply filters from the user's request as WHERE clauses
4. Aggregate numeric columns and format as a markdown table
```

Specific details still belong where they're genuinely fixed (output templates, hard constraints like "never output PII," tool-specific syntax) — the point is that the *approach* should generalize even when individual details are specific.

## Patterns for effective instructions

Use what fits; not every skill needs all of these.

### Gotchas section

The highest-value content in many skills: environment-specific facts that defy reasonable assumptions, not generic advice.

```markdown
## Gotchas
- The `users` table uses soft deletes. Queries must include
  `WHERE deleted_at IS NULL` or results include deactivated accounts.
- The user ID is `user_id` in the database, `uid` in the auth service,
  and `accountId` in the billing API — all three refer to the same value.
- `/health` returns 200 as long as the web server runs, even if the
  database connection is down. Use `/ready` for full service health.
```

Keep gotchas inline in `SKILL.md`, not in a reference file — the agent needs to read them *before* hitting the situation, and may not know to load a reference file for something it doesn't yet know is a problem. When an agent makes a mistake that gets corrected, add the correction here — one of the most direct ways to improve a skill iteratively.

### Templates for output format

Provide a concrete template rather than describing a format in prose — agents pattern-match well against structure. Short templates live inline; longer or situational ones go in `assets/` and get referenced.

### Checklists for multi-step workflows

An explicit checklist helps the agent track progress and avoid skipping steps when steps have dependencies or validation gates.

### Validation loops

Do the work → run a validator (script, checklist, or self-check) → fix issues → repeat until it passes → only then proceed.

### Plan-validate-execute

For batch or destructive operations: have the agent produce an intermediate plan in structured form, validate the plan against a source of truth (a script that checks it and returns specific, actionable errors), and only then execute. The validation step is the key ingredient — an error like "Field 'signature_date' not found — available: customer_name, order_total, signature_date_signed" lets the agent self-correct.

### Bundling reusable scripts

If the agent keeps reinventing the same logic across runs (parsing a format, validating output, building a chart), write a tested script once and put it in `scripts/` instead of re-deriving it in prose each time.
