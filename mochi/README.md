# Mochi

A personal productivity world. You work across many clients, projects and tools; Mochi brings
*your* part of all of it into one visual place. Other people don't need to use it.

- **Worlds**: FIJI, DOSIFY, CLIENT A, CLIENT B, PERSONAL, IDEAS, plus any you add. Each is a place
  on your map with its own creature, terrain, notes and progress.
- **Quests** are either **Private** (made in Mochi, only you see them, never pushed anywhere unless
  you choose “Send to…”) or **External** (mirrored from the world's linked tool, e.g. Tengu).
- **Creatures** hatch when you finish your first quest in a world, react to what you do there,
  level up with the world, and unlock accessories.

## Run

From the repo root:

```bash
npm install
npm run mochi          # dev server (Vite), http://localhost:5173
npm run mochi:build    # typecheck + build + single-file pages:
                       #   mochi/dist/mochi-standalone.html  (open directly in a browser)
                       #   mochi/dist/mochi.html             (page body, for a claude.ai Artifact)
```

Everything is saved in this browser. **Connections → Reset sample data** starts over.

## Things to try

1. **Today** is your map: worlds around a Today hub, paths that flow when a world has something
   due, a dot per open quest (lit = today, hollow = waiting on someone). Your **next move** and
   **today's quests** sit beside it.
2. Tick a quest: the world's creature reacts, `+20 ✦`, the world's progress moves. Every 60 ✦ in
   a world it levels up and an object appears in its scene.
3. Press **C** (or **Create**). Type `Review the Dosify landing page tomorrow`. The quest assembles:
   the DOSIFY creature appears, then *For me*, *Tomorrow*, *Private*. Click any token to change it;
   **Private ↕ Connected** toggles whether it's also created in the world's tool.
   **Add to my world** (or Enter) flies it into the creature.
4. Fast add: **C**, `Buy flowers Saturday`, **Enter** → “Added to PERSONAL ✦”.
5. Enter **CLIENT A** and finish *Approve homepage mockups*: its egg hatches into Volt.
6. In a world, add private quests inline (“waiting on Bryan” works), keep private notes, and
   **Sync** its tool.
7. **Quests**: a skyline of dots per world (click one to filter), then Today / Next / Waiting /
   Someday. Filter Private vs From tools.
8. **Collection**: every creature, its level, and accessories to equip as it levels up.
9. **New world** (on the map or Worlds): name it, pick colour and terrain, and design its creature.
10. **Connections** (plug icon): Tengu and the client tool, which worlds use them, Sync, Connect.

Shortcuts: `C`/`N`/`+` new quest · `1`–`4` switch views · `Esc` closes · `Space` pauses focus.

## Model

```
World       id, name, color, terrain, creature {name, body, antenna}, kind, link?, notes
            link = { integrationId, ref }   (null = Mochi only)
Quest       id, title, worldId, source: 'private' | 'external', external? {integrationId, key},
            done, waitingOn, dueDate, priority, notes
Progress    totalXp, worldXp per world (+20 per quest), equipped accessories per world
```

Private quests never leave Mochi. The only writes to a tool are: changes to quests that came from
that tool (done, title, date, priority), and private quests you explicitly send there.

## Integrations

```
External tools (Tengu, client tool, …)
  ↓
integrations/         IntegrationProvider interface · registry (index.ts) · merge.ts
  ↓
Worlds (link → integration + ref)
  ↓
Mochi
```

- `integrations/types.ts`: `IntegrationProvider` with `connect`, `disconnect`, `pull`, `create`, `update`.
- `integrations/mockProvider.ts`: sample tools that live in this browser, with scripted changes so
  **Sync** visibly does something. No network calls.
- `integrations/index.ts`: the registry. Today: **Tengu** (FIJI, DOSIFY) and **Client tool** (CLIENT A).
  Add a tool by implementing the interface and registering it here.

### Connecting real tools

No real accounts or APIs are used yet. For Tengu, the Product HQ app in this repo already reads it
through the Tengu OS connector (see [`docs/TENGU_INTEGRATION.md`](../docs/TENGU_INTEGRATION.md));
a live provider would map `pull` → `list_tasks` (filtered to me), `create` → `create_task`,
`update` → `update_task`. Other tools need their own provider.

## Code

```
mochi/src/
  types.ts                  World, Quest, CreatureSpec, IntegrationState
  data/seed.ts              Sample worlds and quests (dates relative to today)
  integrations/             types · mockProvider · index (registry) · merge
  lib/                      world (progress, levels, map layout) · focus (next move) · parse · dates · due
  store/store.tsx           state, actions, reactions, sync
  components/               Creature (+ Egg) · Environment (terrain, objects) · WorldMap · Composer
                            QuestRow · QuestPanel · FocusMode · Connections · NewWorld · Shell · ui
  screens/                  Today (map) · Worlds (+ WorldView) · Quests · Collection
```

## Design notes

- Off-white editorial pages around dark-plum game viewports (map, scenes, composer, focus).
  Colour belongs to worlds; the rest is ink, paper and plum. Light theme by choice.
- Geist for text, Geist Mono for labels and metadata, Silkscreen only for game numbers (levels,
  counts, timer).
- Creatures are original: a body shape, a screen for a face, an antenna. Moods change the face;
  reactions make them hop. Motion stops under `prefers-reduced-motion`.
- “Natural language” is deterministic word matching (world names, dates, “waiting on”, “!”),
  and the composer says so.
