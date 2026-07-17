# SkyCiv Core API Skill

You are an agent that interacts with the SkyCiv API. This skill covers authentication, session management, the request/response envelope, and all common patterns shared across every SkyCiv API function.

---

## API Endpoint

All requests are HTTP POST to:

```
https://api.skyciv.com/v3
```

Content-Type must be `application/json`.

---

## Request Object Structure

Every API call sends a single JSON body with three top-level keys:

```json
{
  "auth": { ... },       // required
  "options": { ... },    // optional
  "functions": [ ... ]   // required — ordered array of functions to run
}
```

### `auth`

| Key | Type | Description |
|---|---|---|
| `username` | `string` | SkyCiv account email / username |
| `key` | `string` | API key from account settings (required on first call) |
| `session_id` | `string` | Reuse an open session from a prior call (optional) |

**First call** — always provide `key`:

```json
{
  "auth": {
    "username": "user@example.com",
    "key": "YOUR_API_KEY"
  }
}
```

**Subsequent calls within 30 min** — provide both to allow automatic fallback if session expires:

```json
{
  "auth": {
    "username": "user@example.com",
    "key": "YOUR_API_KEY",
    "session_id": "SESSION_ID_FROM_PREVIOUS_RESPONSE"
  }
}
```

> When `session_id` is valid it is used; if expired, `key` starts a fresh session. If `key` is absent and `session_id` is expired, the call fails.

### `options`

All fields optional.

| Key | Type | Default | Description |
|---|---|---|---|
| `validate_input` | `boolean` | `false` | Run model validation before executing. Strongly recommended. |
| `response_data_only` | `boolean` | `false` | Return only `response.data` from the last function, omitting the full `functions` array. Reduces response size. |
| `timeout` | `int` (ms) | auto | Override solver timeout. Only use for calls that need extra time. |
| `return_log` | `boolean` | `false` | Include a process log for debugging. |
| `return_base64_image_on_error` | `boolean` | `true` | Return a screenshot on error for debugging. |
| `response_webhook_url` | `string` | — | Send the response to this URL instead of the caller (useful for long-running jobs). |
| `timezone` | `number` | UTC | UTC offset for report timestamps (e.g. `10` for GMT+10). |

```json
{
  "options": {
    "validate_input": true,
    "response_data_only": false
  }
}
```

### `functions`

An ordered array of function objects. Functions execute sequentially. Each object must have:

```json
{
  "function": "Namespace.function.name",
  "arguments": { ... }
}
```

`return_data` (boolean, default `false`) can be added to any function object to omit that function's data from the response.

---

## `S3D.session.start`

**Must always be the first function in the array** — even when reusing a `session_id`.

| Key | Type | Default | Description |
|---|---|---|---|
| `keep_open` | `boolean` | `false` | Keep the session alive for 30 min. Subsequent calls using the returned `session_id` will be 4–8× faster by skipping re-authentication. |

```json
{
  "function": "S3D.session.start",
  "arguments": {
    "keep_open": true
  }
}
```

Response includes:

```json
{
  "response": {
    "session_id": "Ofd4WYH...",
    "last_session_id": "Ofd4WYH...",
    "session_expiry_time": 1605153571,
    "msg": "S3D session successfully started.",
    "status": 0,
    "function": "S3D.session.start"
  }
}
```

Store `last_session_id` for the next call's `auth.session_id`.

---

## Response Object Structure

```json
{
  "response": {
    "data": { ... },
    "msg": "Human-readable message",
    "status": 0,
    "function": "last-function-name",
    "last_session_id": "...",
    "monthly_api_credits": {
      "quota": 6000,
      "total_used": 22,
      "used_this_call": 1
    }
  },
  "functions": [
    { /* result for functions[0] */ },
    { /* result for functions[1] */ },
    { /* ... */ }
  ]
}
```

| Field | Meaning |
|---|---|
| `response.status` | `0` = success, `≥1` = failure |
| `response.data` | Data from the **last** function executed |
| `response.msg` | Status or error message |
| `functions[i]` | Per-function result at index `i` |

Always check `response.status === 0` before using results.

---

## Full Minimal Example

Session start → set model → solve:

```json
{
  "auth": {
    "username": "user@example.com",
    "key": "YOUR_API_KEY"
  },
  "options": {
    "validate_input": true
  },
  "functions": [
    {
      "function": "S3D.session.start",
      "arguments": { "keep_open": false }
    },
    {
      "function": "S3D.model.set",
      "arguments": { "s3d_model": { /* model object */ } }
    },
    {
      "function": "S3D.model.solve",
      "arguments": { "analysis_type": "linear" }
    }
  ]
}
```

---

## Available Function Namespaces

| Namespace | Purpose |
|---|---|
| `S3D.session` | Session management |
| `S3D.model` | Set, solve, repair, screenshot, mesh a structural model |
| `S3D.results` | Retrieve and post-process analysis results |
| `S3D.file` | Save/open/share S3D files in cloud storage |
| `S3D.design` | Member and RC design checks |
| `S3D.SB` | Section Builder — load library sections, build custom shapes |
| `standalone.foundation` | Standalone foundation design |
| `standalone.member` | Standalone member design |
| `standalone.loads` | Wind and snow loads |
| `cloudcad.model` | Create CAD models |
| `cloudcad.file` | Save/open CAD files in cloud storage |

---

## Common Patterns

**Check success before using data:**
```js
if (response.status === 0) {
  const data = response.data;
} else {
  console.error(response.msg);
}
```

**Minimise response size with filters:**  
Use `result_filter` and `lc_filter` in solve/results calls to return only what you need. Only if you're confident that load combination exists.

**Reuse sessions for speed:**  
Set `keep_open: true` in `S3D.session.start`, then pass the returned `last_session_id` as `auth.session_id` in subsequent calls. This skips re-authentication and is 4–8× faster.

## Recommendations

**Allow user to download API Object**
If prototyping, it's helpful to allow users to see and download the API input object being sent to the SkyCiv API. It makes troubleshooting a bit easier. So prepare the API object all client-side, then only when they want to send it to the API do you actually send it.

**Logging**
It's also a good idea to show a log of what the software is doing, what API it is calling. Makes it easier to find where things have gone wrong. 

**Transparency and Results**
It's also helpful to show results for each step in the API, even if the results are partial. For example, if you intend to run S3D.model.solve and then plan to pass your results to Quick Design - it's a good idea to show some results for the S3D.model.solve so we can see that part is running and you can show what information you're passing to the Quick Design. This transparency is very valuable to the engineer.

Return the link to the S3D model. Once the model is saved to cloud storage, it's a good idea to send back the link to the UI so the user can open the model and validate it's been built correctly. They can also inspect the loads, load combos and structural data much more easily.