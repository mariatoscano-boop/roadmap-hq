# Product HQ

> Also in this repo: **[Mochi](mochi/README.md)**, a personal productivity world across your clients and tools (`npm run mochi`).

An interactive product roadmap you *walk into*. Initiatives are buildings in a small isometric city
and priority is depth. 🔥 **NOW** sits in the foreground, ⚡ **NEXT** in the middle, and
🌙 **LATER** on the horizon. Every linked Tengu ticket is a floor of its building:

- warm window = done · cyan = in progress · violet = in review · **red blink = blocked** · dark = not started
- rooftop beacon = health (🟢 healthy · 🟡 at risk · 🔴 blocked)

Click a building to fly into it. Its work orbits the initiative core as **missions**, wired in
by status (flowing = active, red dashes = blocked, solid = done).

## How it works for the team

- **Projects** (`P`): each Tengu space (Fiji, Dosify, …) has its own roadmap. The switcher lists
  your Tengu spaces automatically, so a new space in Tengu shows up without setup. Add work
  searches the current project's Tengu lists first, then the rest of Tengu.
- **Add work** (`A`): type what the work is. Press Enter to add it as a plain roadmap item, or
  pick matching Tengu tickets from the list under the box to link them. A plain item can be linked
  to a Tengu ticket later.
- **Linked tickets** show their live status, assignee and due date from Tengu. Plain items have
  a simple status (To do / In progress / Blocked / Done) and an owner.
- **Reprioritize**: drag buildings between NOW / NEXT / LATER, or use the arrows in **List** view
  (`2`), which ranks every initiative top to bottom.
- **Saving**: in the published Artifact, every change is saved to its shared database and shows
  up live for everyone with access. Viewers need **Contributor** (or Editor) access to make
  changes; Viewers see a read-only roadmap. Run locally, it saves to this browser only and
  starts with sample data.
- Tengu is read-only from the roadmap. Removing or unlinking an item never changes the ticket.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm run build:artifact   # dist/product-hq.html (for publishing as a claude.ai Artifact)
                         # + dist/product-hq-standalone.html (open directly; sample data)
```

Locally it runs on sample data.

## Things to try

- **Drag a building** to another district to reprioritize. Ticket priorities don't change.
- **Hover** a building for its holo-card. **Scroll** to zoom, drag the ground to pan, double-click to recenter.
- **Timeline** (`3`): initiatives travel from *today* to their target month. Drag one to retarget it.

| Key | Action |
|---|---|
| `/` | Search initiatives, work, people |
| `P` | Switch project |
| `A` | Add work |
| `N` | New initiative |
| `S` | Refresh from Tengu |
| `1` `2` `3` | World · List · Timeline |
| `Esc` | Close panel / go back |
| `?` | Shortcuts |

## Structure

```
src/
  app/            App shell, store (state + actions), selectors, shortcuts
  components/
    world/        Isometric city: districts, buildings, camera, drag & drop
    initiative/   Initiative environment (constellation), new-initiative modal
    list/         Ranked List view
    tickets/      Mission cards, item panel, Add work box
    timeline/     Timeline mode
    search/       "/" palette
    sync/         Sync indicator
    hud/          Top bar, quick actions, toasts, intro
  services/
    roadmapStore.ts  Shared (Artifact db, live) or local (browser) saving
    tengu.ts      TenguAdapter: McpTenguAdapter (viewer's connector) or MockTenguAdapter
    sync.ts       SyncEngine: re-reads linked Tengu tickets on an interval
    runtime.ts    Artifact capability access
  lib/            roadmap.ts (zones, layout) · missions.ts (item + ticket → mission) · progress.ts (progress, health)
  types/          roadmap.ts (roadmap-owned) · tengu.ts (Tengu-owned)
  data/mock.ts    6 initiatives, ~40 FIJI-style tickets
```

The UI never calls Tengu or MCP directly. It goes through the store, then `SyncEngine`, then a
`TenguAdapter`. See [docs/TENGU_INTEGRATION.md](docs/TENGU_INTEGRATION.md) for the capability
inspection and the plan for a real integration.

## Data model

Saved in the Artifact's database:

| Path | What |
|---|---|
| `projects/{projectId}` | name of a project (Tengu space) the roadmap has data for |
| `initiatives/{id}` | projectId, name, icon, place, priority, status, owner, target month, summary |
| `layout/{projectId}` | `{ now: [ids], next: [ids], later: [ids] }`: that project's ranking (one save per move) |
| `items/{id}` | initiativeId, title, status, owner, optional `tengu: { id, key, url }` |
| `settings/app` | `tenguBaseUrl` for "Open in Tengu" on relative links |
