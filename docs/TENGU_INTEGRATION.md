# Tengu integration — capability inspection

Inspected through the connected **Tengu_OS** MCP server (tool schemas, server instructions, and one
read-only `list_lists` call). Nothing below is assumed. If a capability isn't listed here, Tengu
doesn't expose it.

## Authentication

- The MCP connection is authenticated **as a user** ("you are connected as <user>, through Claude").
  It sees exactly the lists that user sees, with that user's permissions. Tool descriptions refer to
  "this key", so access is key-scoped on the server side.
- No auth headers, tokens or REST endpoints are visible to (or needed by) the client. **Product HQ
  must never hold Tengu credentials in the browser.**
- Writes are signed "<user> via Claude".

## Tools exposed

| Tool | What it does | Adapter method |
|---|---|---|
| `list_lists` | Lists with `id`, `name`, `space`, ordered `statuses` (each with a **role**), custom `fields` | `getLists()` |
| `list_tasks` | Filter by `list_id`, `status` (name or role), `assignee`, `text`, `updated_since`; `limit` ≤ 100 | `getTickets({ since })` |
| `get_task` | One task + description + people + link + **comments** (oldest first) | `getTicket(id)`, `getTicketActivity(id)` |
| `fetch` | One task as a Markdown document + url | (not needed) |
| `search` | Full-text over title/key/description → `id`, `title`, `url` | `searchTickets(q)` |
| `update_task` | `name`, `status`, `assignee` (one person or null), `priority` (1–4 or null), `due_date`, `description`, custom `fields`; returns the task as it is now | `updateTicket(id, u)` |
| `create_task` | In a list: `name`, `description`, `assignee`, `due_date`, `priority`, `status`, `fields` | `createTicket(draft)` |
| `add_comment` | Comment on a task | (not used yet) |
| `needs_attention` | Triage groups: review, blocked, sent_back, overdue, due_soon, stuck, unassigned, ship | (future: HQ alerts) |
| `project_status` | Per-list rollups: open by status/stage, overdue, unassigned, workload | (future: district stats) |

Tasks are addressable by `id` or by key (`custom_id`, e.g. `FIJI-142`).

## Status model

Status **names differ per list**, but every status carries a **role**:
`planning · available · started · blocked · review · sentback · done · shipping · live · closed`.

Product HQ never hard-codes status names. Everything (progress, health, window colours) runs off
`statusRole`. Status changes are written using the list's own status names, taken from `list_lists`.
The mock data mirrors the real Fiji status set (`backlog … qa passed → merged to dev → pushed to live`).

## What Tengu does NOT support (and how the app handles it)

| Missing | Consequence |
|---|---|
| Webhooks / realtime events | `SyncEngine` **polls** `list_tasks({ updated_since })` (30s) and diffs. |
| Deleting tasks | Not needed — unlinking only removes the roadmap relationship. |
| Updating lists/projects | Initiatives are **roadmap-owned**. Nothing about them is written to Tengu. |
| Per-ticket progress field | Progress is **estimated from status role** (`lib/progress.ts`), labelled as estimated. |
| Multiple assignees on update | `update_task` sets one assignee, so the panel edits one person. |
| Initiative ↔ ticket relationship | Stored by the roadmap (`links`). Tickets are never copied or duplicated. |
| Full audit log | "Activity" = task comments from `get_task`. |

## Ownership

**Roadmap owns:** initiatives, strategic priority (P0–P3), zone (NOW/NEXT/LATER), order, target
month, metadata, ticket links. Moving an initiative never touches ticket priority.

**Tengu owns:** ticket title, status, assignee, priority (1–4), due date, description, comments.
Edits from the ticket panel go through `TenguAdapter.updateTicket` optimistically. On failure they
roll back and the sync pill shows **⚠ Sync failed — Retry**. (Try `?chaos` in the URL to simulate
failures.)

## Phase 7/8 plan

The UI only talks to `TenguAdapter` (`src/services/tengu.ts`). Today that's `MockTenguAdapter`.
A browser can't speak MCP with user credentials, so the real implementation should be a small
**server-side bridge**:

```
Browser ──(HTTP, same shape as TenguAdapter)──▶ HQ bridge ──(MCP client)──▶ Tengu_OS
```

- `GET  /tengu/lists` → `list_lists`
- `GET  /tengu/tickets?since=` → `list_tasks` (page through each list, `limit: 100`)
- `GET  /tengu/tickets/:id` → `get_task`
- `GET  /tengu/search?q=` → `search` (+ `list_tasks { text }` for status/assignee)
- `PATCH /tengu/tickets/:id` → `update_task`
- `POST /tengu/tickets` → `create_task`

These routes belong to the bridge we would build. They aren't Tengu endpoints. Then add an
`HttpTenguAdapter` and choose it in `createTenguAdapter()`. Nothing in the UI changes.

Open questions for Phase 7: where the bridge runs and how it gets its MCP connection (a service
account key vs. the signed-in user's), and whether to persist roadmap state (initiatives + links)
server-side rather than in `localStorage`.
