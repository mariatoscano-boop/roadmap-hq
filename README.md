# Product HQ

An interactive product roadmap you *walk into*. Initiatives are buildings in a small isometric city
and priority is depth. 🔥 **NOW** sits in the foreground, ⚡ **NEXT** in the middle, and
🌙 **LATER** on the horizon. Every linked Tengu ticket is a floor of its building:

- warm window = done · cyan = in progress · violet = in review · **red blink = blocked** · dark = not started
- rooftop beacon = health (🟢 healthy · 🟡 at risk · 🔴 blocked)

Click a building to fly into it. Its tickets orbit the initiative core as **missions**, wired in
by status (flowing = active, red dashes = blocked, solid = done).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

Runs fully on mock data. Add `?chaos` to the URL to simulate Tengu write failures and try the retry flow.

## Things to try

- **Drag a building** to another district to reprioritize. Ticket priorities don't change.
- **Hover** a building for its holo-card. **Scroll** to zoom, drag the ground to pan, double-click to recenter.
- Inside an initiative: change a mission's status in the side panel (optimistic, then synced), **Link Tengu ticket**, **Unlink**.
- **Timeline** (`T`): ships fly from *today* to their target month. Drag one to retarget it.
- Every ~45s a simulated teammate moves a ticket in Tengu and HQ picks it up on the next sync.

| Key | Action |
|---|---|
| `/` | Search initiatives, Tengu tickets, people |
| `N` | New initiative |
| `L` / `C` | Link / create Tengu ticket |
| `S` | Sync now |
| `T` | World ↔ Timeline |
| `Esc` | Close panel / go back |
| `?` | Shortcuts |

## Structure

```
src/
  app/            App shell, store (state + actions), selectors, shortcuts
  components/
    world/        Isometric city: districts, buildings, camera, drag & drop
    initiative/   Initiative environment (constellation), new-initiative modal
    tickets/      Mission cards, ticket panel, link & create modals
    timeline/     Timeline mode
    search/       "/" palette
    sync/         Sync indicator
    hud/          Top bar, quick actions, toasts, intro
  services/
    tengu.ts      TenguAdapter interface + MockTenguAdapter
    sync.ts       SyncEngine: polling pull, optimistic push, rollback, retry
  lib/            roadmap.ts (zones, ordering, links) · progress.ts (progress, health)
  types/          roadmap.ts (roadmap-owned) · tengu.ts (Tengu-owned)
  data/mock.ts    6 initiatives, ~40 FIJI-style tickets
```

The UI never calls Tengu or MCP directly. It goes through the store, then `SyncEngine`, then a
`TenguAdapter`. See [docs/TENGU_INTEGRATION.md](docs/TENGU_INTEGRATION.md) for the capability
inspection and the plan for a real integration.

## Status

| Phase | |
|---|---|
| 1 Product HQ world | ✅ |
| 2 Initiative environments | ✅ |
| 3 Ticket missions + detail panel | ✅ |
| 4 Link / unlink tickets | ✅ (mock adapter) |
| 5 Drag & drop strategic priority | ✅ |
| 6 Timeline | ✅ |
| 7 Tengu MCP | 🔎 Inspected & documented; adapter boundary ready, bridge not built |
| 8 Two-way sync | ⚙️ Engine built (optimistic + polling) against the mock |
| 9 Polish | ongoing |
