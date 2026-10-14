# Mochi ♡

A personal productivity layer on top of Tengu: your Tengu tasks and your own private to-dos in one
cute, calm place, with Mochi (a tiny companion) who reacts to what you do.

## Run

From the repo root:

```bash
npm install
npm run mochi          # dev server (Vite), http://localhost:5173
npm run mochi:build    # typecheck + build + single-file pages:
                       #   mochi/dist/mochi-standalone.html  (open directly in a browser)
                       #   mochi/dist/mochi.html             (page body, for a claude.ai Artifact)
```

Everything is saved in this browser (localStorage). **Little Things → Start over** brings back the
sample data.

## Things to try

1. **Today**: tick a task. Watch the check, the sparkle, `+10 ✦`, and Mochi's reaction.
   The first tick unlocks flowers for Mochi's room.
2. Press **+** (or `n`) and type `Review Dosify hero tomorrow !`. Project, due date and priority
   are picked from your words and shown so you can change them.
3. **Projects → Dosify**: the progress bar and garden update as you go.
4. **What's on my plate?** (Today or Little Things) → **Pick my focus**. Up to three tasks, each
   with the reason it was picked. **Let's do this** pins them to the top of Today.
5. Finish every task in **Personal** to unlock the disco ball (plus confetti).
6. **Rewards**: change the wallpaper, and tap treasures to place them in the room or put them away.
7. **Little Things → Sync now**: the sample Tengu sends 2 new tasks. The next sync shows a teammate
   finishing one.
8. Click Mochi. Hover the small Mochi in the sidebar.

## Tasks: Tengu vs. mine

| | Tengu task | My task |
|---|---|---|
| Comes from | Tengu (sync) | You, in Mochi |
| Tag | `☁ TENGU` | `♡ MY TASK` |
| Changes (done, title, due, priority) | Sent to Tengu | Stay in Mochi |
| Delete | "Remove from Mochi" (stays in Tengu, and later syncs don't bring it back) | Deleted, with Undo |
| Project | Fixed to its Tengu space | Any project |

A personal task in a Tengu project can be sent to Tengu from its details ("Add to Tengu") or
when you create it. **Personal** is a Mochi-only project, so its tasks never leave the app.

## Architecture

```
Tengu
  ↓
integrations/tengu/         TenguProvider interface + MockTenguProvider + mapping
  ↓
store/store.tsx             projects, tasks, character, focus; all side effects live here
  ↓
screens/ + components/      Today, Projects, My Tasks, Little Things, Rewards
```

```
mochi/src/
  types.ts                  App data model (Project, Task, Character, Reward)
  data/seed.ts              Starting data (FIJI, Dosify, Personal), dates relative to today
  integrations/tengu/
    provider.ts             TenguProvider: connect, disconnect, pull, createTask, updateTask
    mockProvider.ts         Sample Tengu in this browser, with scripted teammate changes
    mapping.ts              Tengu task ↔ app task, and merging a pull into local tasks
    types.ts                Tengu-shaped data
    index.ts                Which provider the app uses (swap it here)
  lib/
    parse.ts                Quick-add understanding (dates, project names, "!")
    focus.ts                "Pick my focus" scoring (overdue, due soon, priority, project balance)
    mochi.ts                Mochi's moods and lines
    rewards.ts              Stars, unlock thresholds, levels
    selectors.ts, dates.ts, due.ts
  store/store.tsx           State, persistence, actions
  components/               Mochi, Room (+ RoomItems art), TaskRow, QuickAdd, TaskDetail, Plate, Chrome (nav, toasts, confetti)
  screens/                  Today, Projects (+ detail), MyTasks, LittleThings, Rewards
```

The UI never talks to Tengu. Writes to Tengu tasks go through the store to the provider. If
Tengu can't be reached, they're queued and sent on the next sync.

### Connecting real Tengu

The prototype uses `MockTenguProvider`. No real Tengu account or API is called. To connect it,
write a class that implements `TenguProvider` and export it from `integrations/tengu/index.ts`.

The sibling Product HQ app in this repo already reads Tengu through the **Tengu OS** connector
(see [`docs/TENGU_INTEGRATION.md`](../docs/TENGU_INTEGRATION.md)). The same tools map onto this
interface:

| TenguProvider | Tengu OS tool |
|---|---|
| `pull()` | `list_lists` (spaces) + `list_tasks` per list, filtered to me |
| `createTask()` | `create_task` |
| `updateTask()` | `update_task` (`done` → the list's done-role status) |

When published as an Artifact, the page would declare the `mcp` capability for those tools, so
each person's calls run with their own Tengu connection and the page never holds a token.
Note `update_task`/`create_task` are writes signed by the user, so they'd need that permission.

## Design notes

- Light theme on purpose: blush paper, plum ink, pink/lilac/peach accents, a touch of cherry for
  overdue. Fredoka for headings, M PLUS Rounded 1c for text, Instrument Serif italic for the name.
- Rail on desktop, bottom bar under 900px, Mochi's room beside Today on wide screens and above
  it on narrower ones.
- All motion is CSS and turns off under `prefers-reduced-motion` (confetti is skipped entirely).
