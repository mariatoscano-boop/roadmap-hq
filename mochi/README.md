# Mochi

A visual, slightly game-like team workspace on top of Tengu. Tasks from Tengu and private tasks
live side by side; the team's progress shows up as timelines, mosaics, pulse bars and a live feed.

## Run

From the repo root:

```bash
npm install
npm run mochi          # dev server (Vite), http://localhost:5173
npm run mochi:build    # typecheck + build + single-file pages:
                       #   mochi/dist/mochi-standalone.html  (open directly in a browser)
                       #   mochi/dist/mochi.html             (page body, for a claude.ai Artifact)
```

Everything is saved in this browser (localStorage). **Profile & settings → Reset workspace**
brings back the sample data.

## Things to try

1. **Today** is a command center: your day as a timeline (carried over → scheduled with a "now"
   line → anytime), **Up next**, **Project pulse**, **Your week** and live **Team activity**.
   Switch the timeline between **Mine** and **Everyone**.
2. Click a status circle to complete a task: check animation, `+20 XP` in the HUD, project
   progress moves, the activity feed updates. The first completion levels Maria up to 4.
3. Press **C** (or **Create**). Type `Review Dosify hero tomorrow @malika !`. The card takes on
   Dosify's colour, Malika's avatar, a date and a priority as you type.
   - **Enter** creates it right away (`+5 XP`, with **Edit** in the toast).
   - **Tab** walks through Where → Who → When → Priority. Number keys pick an option.
4. **Drag** any task row. A dock appears: drop on **Today / Tomorrow / Next week**, a person, a
   project, **Review** or **Done**. Sidebar projects and people are drop targets too.
   On a project's **Board**, drag cards between status columns.
5. **Start focus** on Up next: a 25-minute timer for the top 3 picks. **Mark done** earns XP,
   then offers the next one.
6. **Projects**: each cover is a mosaic with one tile per task. Covers fill in as work gets
   done. Reaching a milestone triggers a **Project level up**.
7. **Team**: weekly pulse per person, then Active / Blocked / Upcoming. Click a person to filter.
8. **Activity**: a 4-week completion heatmap and the full feed, filterable by type and person.
   Teammates make a change about every 40 seconds while the page is open.
9. The **team switcher** (top left) scopes everything to Prizm Studio, FIJI Team or Dosify Team.
10. **Profile & settings** (your avatar): level, badges, Tengu **Sync now**, and a prototype-only
    **switch person** to see the app as Bryan, Malika or Natalia.

Shortcuts: `C`/`N` create · `1`–`5` switch views · `Esc` closes · `Space` pauses focus.

## Team model

- **Members**: Maria, Bryan, Malika, Natalia. Every action is performed as the current member
  (`state.me`) and recorded in the activity log.
- **Teams** scope projects and people. **Projects** list their members (who can own tasks).
  A project with an `ownerId` (Personal) is visible only to that person.
- **Tasks** have an owner (`assigneeId`), a creator (`createdBy`), a status
  (to do / in progress / in review / blocked / done), due date, optional time, priority.
- **Visibility**: Tengu tasks are shared with the team. Private tasks (`source: 'personal'`)
  are visible only to their creator until shared with **Share to Tengu**.
- **Progress**: XP per member (+20 per completion, +5 per new task, −20 if reopened),
  levels every 400 XP, project levels = milestones reached, weekly % = done ÷ (due this week +
  done this week).

## Architecture

```
Tengu
  ↓
integrations/tengu/         TenguProvider interface + MockTenguProvider + mapping (status roles, owners)
  ↓
store/store.tsx             workspace state, actions, activity, XP, level-ups, drag, focus
  ↓
lib/selectors.ts            visibility, today, pulse, weekly chart, streaks, levels
  ↓
screens/ + components/      Today, My Work, Projects (+ board), Team, Activity; composer, panel, focus, dock
```

```
mochi/src/
  types.ts                  Member, Team, Project (+ milestones), Task, Activity
  data/seed.ts              Sample workspace (dates relative to today)
  integrations/tengu/       provider.ts · mockProvider.ts · mapping.ts · types.ts · index.ts (swap provider here)
  lib/                      selectors · focus (Up next ranking) · parse (composer words) · dates · due
  store/store.tsx
  components/               Shell (sidebar, HUD, dock, toasts, level-up) · Composer · TaskPanel · TaskRow
                            FocusMode · Settings · Mosaic · ActivityLine · ui (avatars, status, rings, Mochi orb)
  screens/                  Today · MyWork · Projects · Team · Activity
```

The UI never talks to Tengu. Writes to Tengu tasks (status, owner, title, due date, priority) go
through the store to the provider; if Tengu can't be reached they're queued and sent on the
next sync.

### Connecting real Tengu

The prototype uses `MockTenguProvider`. No real Tengu account or API is called. To connect it,
implement `TenguProvider` and export it from `integrations/tengu/index.ts`.

The Product HQ app in this repo already reads Tengu through the **Tengu OS** connector
(see [`docs/TENGU_INTEGRATION.md`](../docs/TENGU_INTEGRATION.md)). The same tools map onto this
interface:

| TenguProvider | Tengu OS tool |
|---|---|
| `pull()` | `list_lists` (spaces, status roles) + `list_tasks` per list |
| `createTask()` | `create_task` |
| `updateTask()` | `update_task` (status by role → the list's own status name; one assignee) |

Mochi only reads status **roles** (available, started, review, blocked, done), never list-specific
status names, which matches how Tengu describes its lists. Owners are matched to members by name.

## Design notes

- Light theme by choice. Warm white ground, one inset white canvas, charcoal type.
  Accents only mark projects (FIJI pink, Dosify violet, Personal green), people, status and data.
- Geist for the interface, Geist Mono for metadata, keys, times and numbers.
- Motion: rows slide in, completion sweeps and draws the check, numbers count, bars and rings
  fill, the composer card launches into the list. All of it is off under `prefers-reduced-motion`.
- Mochi is now a small abstract orb. It shows up in focus mode, level-ups, empty states and
  your profile, never as a permanent panel.
