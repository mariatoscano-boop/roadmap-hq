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

## How the published page talks to Tengu

The page runs as a claude.ai Artifact and declares the `mcp` capability for the **Tengu OS**
connector with four read tools: `list_lists`, `get_task`, `list_tasks` and `search`. Each viewer's calls run
with **their own** Tengu connection. The page never holds a token, and nobody needs a backend.
The first time someone opens the page, claude.ai asks them to allow Tengu for it.

- **Projects** are Tengu spaces. `list_lists` is grouped by `space`, and each project's id is a
  slug of the space name (`fiji`, `dosify`). A space that disappears from Tengu keeps its saved
  roadmap and is marked "not found in your Tengu".
- **Add work** runs `list_tasks { text, list_id }` for each of the project's lists, which returns
  status and assignee. It also calls `search` across all of Tengu, which returns only id, title
  and url; those hits show under "More from Tengu".
- Linked tickets are refreshed with `get_task` every 90 seconds (Tengu has no webhooks).
- The page doesn't write to Tengu. "Open in Tengu" uses the ticket's `url`. Tengu returns relative
  urls (`/tasks/…`) for its own lists, so the page joins them to the web address set in Settings.
- Errors map to clear messages: not connected, reconnect needed, access turned off for the page,
  or Tengu unavailable. Plain roadmap items keep working without Tengu.
- Not verified yet: the shape of `get_task` comments. No ticket had any during development, so
  the page reads them defensively.

Outside an Artifact (local dev), the app uses `MockTenguAdapter` sample data. **Inside the
published page it never uses sample data.** When Tengu can't be used, the page says why and
offers the fix.

## Connection states (per viewer)

| State | Cause | What the viewer sees |
|---|---|---|
| connected | Tengu answered | Tickets, live status |
| needs-allow | Tengu not allowed / turned off for this page (`not_in_manifest`, `consent_required`) | **Allow Tengu** button (asks, or opens the page's Permissions panel) |
| not-connected | No Tengu connector on their claude.ai account (`server_not_connected`) | "Add Tengu in claude.ai → Settings → Connectors, then reload" |
| reconnect | Connector credentials expired (`needs_reauth`) | "Reconnect Tengu in Settings → Connectors" |
| unavailable | This view can't use connectors (`use("mcp")` is null) | "Open the page on claude.ai, signed in to your organization" |
| error | Tengu returned an error | The message + Try again |

These appear as a banner under the top bar, in Add work, in the item panel and in Settings.
Plain roadmap items keep working in every state.

## Shared copy (for viewers who can't reach Tengu)

Some viewers' pages can't use connectors at all (`use("mcp")` is null). That's typical for people
invited by email who are signed in to a different claude.ai organization. So that they still see
tickets, **pages whose Tengu works keep a shared copy in the artifact's database**:

| Doc | Written when | Contents |
|---|---|---|
| `tengu/projects` | Project list changes | Tengu spaces + their lists |
| `tengu/index-{projectId}` | Missing or older than 15 min, when that project is opened | Up to 450 most recently changed tickets (`list_tasks` per list, `limit: 100`) |
| `tenguTickets/{ticketId}` | A linked ticket changes | That ticket |

Each ticket keeps only the key, title, status, priority, assignee names, due date, list and link.
**Descriptions and comments are never copied.** Anyone who can open the page can read the copy.
Only viewers who can edit the roadmap write it.

Viewers without Tengu see "Showing Tengu tickets shared by teammates · as of 10:42", can search
and link from the copy, and open tickets in Tengu for details. Live data always wins when present.

### Setting up a coworker
1. Share the page with them as **Contributor** or **Editor**.
2. Best: they use claude.ai in the same organization, add the **Tengu** connector
   (Settings → Connectors) and click **Allow Tengu**. They then get live data.
3. Otherwise they see the shared copy. It stays fresh as long as someone with Tengu opens the
   page now and then.
