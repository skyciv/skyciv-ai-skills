---
name: ai-assistant
description: "Use when an API call should hand a task to the SkyCiv AI Assistant inside an S3D session through S3D.ai_assistant.*: plain-English model edits ('change member 1 to a W14x90', 'add a 3 m cantilever at node 12'), building a structure from a description, code wind loads via the Load Generator, Quick Design checks, solving and results questions, diagnosing a failed solve, comparing options, or importing a structural plan PDF. Covers runPrompt, the outcome/pendingAction loop (keep_or_undo, approval, questions, sheet_selection, choice), keepChanges/undoChanges, approve/reply/answer/choose, auto_keep, attachments, timeouts, AI credits vs API credits, and keeping the session open between calls. Trigger even without the word SkyCiv, e.g. 'ask the assistant to...', 'let the AI build this frame', 'import this plan PDF into S3D via the API'. Not for building an s3d_model JSON yourself (use s3d-api) or for standalone design modules (use baseplate, connection, foundation-api)."
---

# SkyCiv AI Assistant via the API

`S3D.ai_assistant.*` sends prompts to the SkyCiv AI Assistant inside an API S3D session and answers its
cards, exactly as a user would in the panel. Use it when the assistant can do the job in one sentence
(an edit, wind loads, a plan import), rather than building or patching the `s3d_model` JSON yourself.
Full reference: https://skyciv.com/api/v3/docs/S3D.ai_assistant/

> **Prerequisite:** call `S3D.session.start` first, then put a model in the session with `S3D.model.set` or
> `S3D.file.open`. The assistant works on the session's model, and you read the result back with
> `S3D.model.get`.

## Credits

- The `S3D.ai_assistant.*` functions use **0 API credits**. Every prompt uses the account's **AI credits**,
  including questions, errors and refusals. `S3D.ai_assistant.getCredits` returns `{ used, limit, remaining }`.
- An `approval` card may spend more, such as the Load Generator's API credits. Only approve what the user asked for.
- Never resend the same prompt to "try again". Read `data.response` first.

## Workflow

```json
{
  "auth": { "username": "...", "key": "..." },
  "functions": [
    { "function": "S3D.session.start", "arguments": { "keep_open": true } },
    { "function": "S3D.model.set", "arguments": { "s3d_model": { "...": "..." } } },
    { "function": "S3D.ai_assistant.runPrompt", "arguments": { "prompt": "Change the section of member 1 to a W14x90.", "auto_keep": true } },
    { "function": "S3D.model.get" }
  ]
}
```

Then read `functions[i].data.outcome` for the `runPrompt` entry:

| `outcome` | `status` | Do this |
| --- | --- | --- |
| `completed` | 0 | Read `data.response`. Changes were kept if `data.changes_kept` is `true`. |
| `awaiting_input` | 0 | Respond to `data.pendingAction` (see the next table). The functions that follow in the same call still run. |
| `error` | 1 | The model is unchanged (see `data.errors`). Rephrase or simplify, and after two failures report back. |
| `refused` | 1 | Out of AI credits or no access. Tell the user; don't retry. |
| `timeout` | 1 | Still running in the session. Call `waitUntilIdle` (or `stop`) in a follow-up call. |
| `stopped` / `no_response` | 1 | Nothing more to read. |

| `pendingAction.type` | Respond with |
| --- | --- |
| `keep_or_undo` | `S3D.ai_assistant.keepChanges` / `undoChanges` (no args) |
| `approval` | `approve` (no args), `reply` `{ "text": "use exposure C" }`, or `dismiss`. Check `rows[]` with `assumed: true` first. |
| `questions` | `answer` `{ "value": 0 }` (option index, `[indexes]`, label, typed text such as `"3.2 m"`, or `null` for the recommended answer), `answerAll` `{ "answers": [null, 1] }`, or `reply` |
| `sheet_selection` | `answer` `{ "value": { "plan": 12, "supporting": [30, 31] } }`, `"confirm"`, `"plan_only"`, or `null` |
| `choice` | `choose` `{ "index": 0 }` |

An approval with `blocking: false` is only an offer. Ignore it, and the next `runPrompt` dismisses it.

To respond in a **later** API call, the first call must use `keep_open: true`. Then pass its
`last_session_id` as `auth.session_id`. The chat, and any pending card, live in that session's browser page.

## Arguments

`runPrompt`: `prompt` (string), `attachment?`, `plan_import?` (boolean), `auto_keep?` (boolean).

- `auto_keep: true` keeps any changes still waiting from an earlier turn before sending, and keeps
  this turn's changes when it finishes. Use it only when the user wants changes applied without review.
  It is also accepted by `reply`, `approve`, `answer`, `answerAll` and `choose`.
- `attachment` takes `{ "name": "plan.pdf", "base64": "..." }`, `{ "name": "x.csv", "text": "..." }`,
  `{ "name": "plan.pdf", "url": "https://..." }` (the server must allow CORS) or a data URL. It accepts
  PDF, CSV, XLS/XLSX, HTML reports and images. Always include the extension in `name`.
- `plan_import: true` builds the model from the attached plan PDF. A PDF recognised as a plan needs no prompt.
- The wait is 15 min by default, or `options.timeout` (ms) if set. Plan imports, whole buildings
  and meshing can take minutes.

Other functions: `getStatus`, `getLastResponse` `{ format: "text" | "markdown" | "detailed" }`,
`waitUntilIdle`, `stop`, `newChat`, `getConversation`, `listConversations`,
`resumeConversation` `{ conversation_id }`, and `getCredits`.

## Gotchas (live-verified)

- **A bad call stops the chain.** Responding to a card that isn't showing returns `status: 1` with the
  assistant's message (e.g. *"There are no changes waiting for Keep or Undo."*), and the functions
  after it don't run. Don't put `keepChanges` after a prompt that might not change anything; use
  `auto_keep: true` instead.
- **`runPrompt` refuses while a card is blocking.** Settle `keep_or_undo`, `approval` and `questions`
  first, or pass `auto_keep` to clear a waiting Keep/Undo.
- **Changes are on the model before Keep.** `S3D.model.get` straight after an unsettled edit already
  includes the changes. Settle Keep/Undo before you rely on the model, and don't edit it with other
  S3D functions while a decision is waiting.
- **`lastTurn` can lag.** It can show the previous turn for a second or two, and was `null` straight after
  the first prompt in testing. Use `getCredits` for totals.
- **Old sections stay in the model.** When it reassigns a section, the assistant leaves the old one in
  `sections` unused.
- **Be specific.** Name ids, sections (exact library names), codes, units and locations. Context carries over
  within a chat; use `newChat` for an unrelated task.
- The assistant only loads for regular user accounts with AI Assistant access. If it isn't available, every
  function returns *"The AI Assistant is not available in this S3D session..."*.

## Samples

[`sample-api/ask-and-edit/`](sample-api/ask-and-edit/) holds a live request and response: a question about
the model, then an edit with `auto_keep`, then `S3D.model.get`.

## Related skills

- `s3d-api`: build or edit the `s3d_model` JSON directly, solve, and read results.
- `load-gen-api`: wind/snow/seismic loads without the assistant.
- `run-quick-design`: run a specific calculator directly.
