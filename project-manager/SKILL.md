---
name: project-manager
description: "Use when organising SkyCiv work into projects through the API with the SkyCiv Project Manager (project_manager.*): create, list, rename, archive or delete projects; add saved S3D/CloudCAD files to a project and sort them into folders; set project details (client, engineer, site location, project number); share a project with a colleague or the organisation; read the activity log and reports. Callable on its own or inside any session as S3D.project_manager.*, cloudcad.project_manager.*, standalone.project_manager.* or SB.project_manager.*. Trigger even without the word SkyCiv, e.g. 'put these models in a project', 'create a project for this job and add the frame file', 'share the project with my colleague'. Not for saving or opening the files themselves (use s3d-api / cloudcad-api file functions)."
---

# Project Manager

Create and organise SkyCiv projects with the `project_manager.*` API functions. Full reference:
https://skyciv.com/api/v3/docs/project_manager/

> **Prerequisite:** the `skyciv-api-v3` request envelope (`auth`, `functions`). No session start is needed:
> `project_manager.list` works on its own. Inside a session, call the same functions as
> `S3D.project_manager.*`, `cloudcad.project_manager.*`, `standalone.project_manager.*` or
> `SB.project_manager.*`. The session stays on its model, so later functions still work.

All functions use **0 API credits**.

## Identifiers

| Thing | Key | Where to get it |
| --- | --- | --- |
| Project | `project_uid` (string) | `create` → `data.uid`, or `list` → `[].uid` |
| File | `file_uid` (string) | `S3D.file.save` with `return_uid_url: true` → the `u=` value in `data` (`.../structural?u=<file_uid>`), or `listUserFiles` → `[].uid` |
| Folder | `folder_id` (integer) | `createFolder` → `data.folder.id`, or `getData` → `folders[].id` |

`rename`, `archive` and `delete` also accept the integer `project_id`. `file_uids` is always an array (a single `file_uid` also works).

## Minimal example

```json
{
  "auth": { "username": "...", "key": "..." },
  "functions": [
    { "function": "S3D.session.start", "arguments": { "keep_open": false } },
    { "function": "S3D.model.set", "arguments": { "s3d_model": { "...": "..." } } },
    { "function": "S3D.file.save", "arguments": { "name": "Warehouse frame", "path": "Projects/Warehouse", "return_uid_url": true } },
    { "function": "S3D.project_manager.create", "arguments": { "name": "Warehouse 2026" } }
  ]
}
```

A request can't pass one function's output into the next. So steps that need the new `project_uid`,
`file_uid` or `folder_id` (`addFiles`, `createFolder`, `moveFiles`) go in a follow-up request.

## Functions

| Function | Arguments | Returns (`data`) |
| --- | --- | --- |
| `list` | | `[{ id, uid, name, last_opened, access, meta }]` |
| `getRecent` | | 5 most recently opened projects |
| `getLimit` | | `{ project_limit, current_projects_count }` (`-1` = unlimited, `0` = none on this plan) |
| `create` | `name`, `org_sharing?`, `meta?` | the project (`uid`, `id`, `name`, …) |
| `getData` | `project_uid` | `{ project_meta, files, folders, sharing, org_sharing, is_owner }` |
| `rename` / `archive` / `delete` | `project_uid` or `project_id` (+ `name` for rename) | `{ success: true }`. `delete` keeps the files. |
| `getMeta` / `updateMeta` | `project_uid` (+ `details` object for update) | `{ project_id, details, last_updated }` |
| `listUserFiles` | `search?` | up to 50 of the user's files: `uid`, `file_name`, `path`, `module` |
| `listFiles` | `project_uid` | project files with `folder_id` |
| `addFiles` / `removeFiles` | `project_uid`, `file_uids` | `{ success, project_data }`. `removeFiles` only unlinks. |
| `checkFile` | `file_uid` | `{ in_project, project_name? }` |
| `createFolder` | `project_uid`, `name`, `parent_folder_id?` | `{ success, folder, project_data }` |
| `renameFolder` | `project_uid`, `folder_id`, `name` | `{ success, folder, project_data }` |
| `moveFolder` | `project_uid`, `folder_id`, `new_parent_id?` (null = root) | `{ success, folder, project_data }` |
| `deleteFolder` | `project_uid`, `folder_id` | `{ success, project_data }`. Its files move to the root. |
| `moveFiles` | `project_uid`, `file_uids`, `folder_id?` (null = root) | `{ success, project_data }` |
| `share` / `unshare` | `project_uid`, `email` | `{ success, project_data }` (owner only) |
| `setOrgSharing` | `project_uid`, `org_sharing` | `{ success, org_sharing, project_data }` |
| `getLogs` / `getReports` | `project_uid` | activity log (`action`, `details`, `user_email`) / reports |

Prefix each with `project_manager.` (or `S3D.project_manager.` etc. inside a session).

## Gotchas (live-verified)

- **Project names** can use letters, numbers, spaces, `_ - ( )` and must be unique per owner. `bad/name` returns
  `status: 1`, *"Project name contains invalid characters (HTTP 422)"*, and stops the functions after it.
- **Errors carry the HTTP status** in `msg` and `http_status`: 403 (not the owner, or `Project limit reached`), 404
  (`Project not found`, `Folder not found`, `User not found` for an email with no SkyCiv account), 422 (validation).
- **Changes return `project_data`**, the refreshed project, so there's no need to call `getData` again. `rename` and
  `delete` return only `{ success: true }`.
- **`getMeta` `details` is an object.** The endpoint sends it as a JSON string, which the API parses. `updateMeta`'s
  own response shows `project_id: 0`; use `getMeta` to read the stored record.
- **`checkFile` on an unknown file** returns `{ in_project: false }`, not an error.
- **Not exposed yet:** project size and ZIP download. Both endpoints are broken server-side.

## Related skills

- `skyciv-api-v3`: request envelope, auth and sessions.
- `s3d-api`: `S3D.file.save` / `S3D.file.open`, which give the files you add to projects.
- `cloudcad-api`: `cloudcad.file.save` for drawings.
