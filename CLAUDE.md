# Health Tracker PWA — Project Guide for Claude

Mobile-installable PWA for Dave's personal health logging. React 19 + Vite + vite-plugin-pwa, deployed to GitHub Pages. All data writes to Supabase (same shared project as notes-app and other PA ecosystem agents).

**Paired with:** Health Coach Telegram bot (`C:/Projects/health-coach`) — on-demand coaching chat between check-ins (no scheduled nudges; this app sends reminders). It reads the same Supabase tables, imports the routines from `src/lib/` (keep `dates.js`, `workouts.js`, `mobility.js`, `beerPlan.js` pure), and saves its chat to `coach_messages`.

## Running locally

```bash
npm run dev        # http://localhost:5173/health-tracker/ (no service worker → push can't be tested here)
npm run build      # production build → dist/
npm run reminders -- --dry-run [--at=HH:MM] [--date=YYYY-MM-DD]   # what reminders would send
npm run checkin [-- --days=N]                                     # coaching data report (/checkin)
```

Requires `.env` (gitignored) with:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY` (anon key)
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (only for sending reminders locally)

Windows/Git Bash gotcha: heredocs can mangle backslashes and nested quotes in generated JS/Python (a regex `\\s` silently becomes `\s`). Write scripts with the Write tool instead.

## Deployment

GitHub Actions deploys automatically on push to `master` → GitHub Pages at `https://daviecal.github.io/health-tracker/`.

Secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` and `VAPID_PRIVATE_KEY` are set in the repo's GitHub Actions secrets. Workflows:
- `deploy.yml` — build + Pages on push to `master`
- `reminders.yml` — push reminders cron every 15 min; Run workflow → "test" sends a test push

**The repo is public** — never commit personal health details or keys.

## Architecture

```
src/
├── App.jsx                   Bottom tab bar: Today | Workouts | Weekly | Progress | Days; handles ?open=<sheet> from notifications
├── main.jsx
├── hooks/
│   └── useWakeLock.js        Keeps the screen on while a workout/mobility session is open
├── lib/
│   ├── supabase.js           Supabase client init
│   ├── db.js                 All Supabase queries (one function per operation)
│   ├── dates.js              Toronto timezone helpers + WORKOUT_SCHEDULE
│   ├── workouts.js           Full workout data (exercises, cues, timed flags, equipment variants, finisher)
│   ├── mobility.js           Morning mobility routine (doses per quick/full mode)
│   ├── beerPlan.js           Beer plan / dry periods / sample rule (pure)
│   ├── reminders.js          Reminder definitions + due logic (shared with the cron script)
│   └── push.js               Browser push subscription
├── components/
│   ├── BeerPlanCard.jsx      Today's beer plan, commit, week budget
│   ├── Sheet.jsx             Reusable bottom-sheet overlay (used by all forms)
│   ├── WorkoutDetail.jsx     Read-only workout reference (warm-up, circuit, cool-down)
│   ├── WorkoutSession.jsx    Interactive session: equipment picker, set logger, timers, finisher (wake lock)
│   ├── MobilitySession.jsx   Morning mobility checklist (Quick/Full modes, per-step timers, wake lock)
│   ├── tabs/
│   │   ├── TodayTab.jsx      Quick-log grid + today's summary, mobility card, beer card, 🔔 reminders
│   │   ├── WorkoutsTab.jsx   Week strip, today's workout, session, history
│   │   ├── WeeklyTab.jsx     This-week stat cards
│   │   └── ProgressTab.jsx   recharts trend charts
│   └── forms/
│       ├── SleepForm.jsx     Two-step: bedtime → wake + quality
│       ├── BeerForm.jsx      Pint chips + last-of-night toggle
│       ├── CaffeineForm.jsx  Source picker + mg estimate
│       ├── EnergyForm.jsx    Score 1–5 with labels
│       ├── WorkoutForm.jsx   Type + completed + notes + optional sets table
│       ├── VitaminForm.jsx   Dose picker (morning/afternoon/evening/soak)
│       ├── WeightForm.jsx    Linked lb/kg inputs (stored as weight_kg; Today + Progress show lb)
│       ├── MoodForm.jsx      Emoji score 1–5
│       ├── IllnessForm.jsx   Start episode / mark recovered
│       ├── IntentionForm.jsx Morning beer commitment
│       ├── BeerPlanEditor.jsx Weekly plan, dry weeks, vacation
│       └── RemindersSettings.jsx Push on/off per device, reminder toggles + times
public/push-sw.js             Push + notificationclick handlers (imported into the Workbox SW)
scripts/
├── send-reminders.js         Push reminder sender (GitHub Actions cron)
└── checkin.js                Coaching data report / save check-in
.claude/commands/checkin.md   /checkin coaching session
.claude/commands/coach-bot.md /coach-bot: status, logs, restart, clear memory of the Telegram coach bot
```

## Key patterns

### Toronto timezone
All data uses `toronto_date text` (YYYY-MM-DD in Toronto time) as the primary date filter — never UTC ranges. Helper: `torontoDate()` from `lib/dates.js`. Every insert includes `toronto_date: torontoDate()`.

### Sheet pattern
All forms open in `<Sheet>` (bottom overlay, 88dvh, scrollable). Usage:
```jsx
<Sheet open={open} onClose={() => setOpen(false)} title="Log Beer">
  <BeerForm onSave={() => { setOpen(false); reload() }} />
</Sheet>
```

### Workout schedule
Defined in `lib/dates.js` as `WORKOUT_SCHEDULE` keyed by `getDay()` (0=Sun):
- Mon=Bike, Tue=A, Wed=Bike, Thu=B, Fri=Bike, Sat=Stability, Sun=Rest

`todaySchedule()` returns today's `{ type, label, emoji }`.

### Workout session (WorkoutSession.jsx)
- Warm-up + cool-down: tap-to-check checklists
- Rep exercises: 3 pre-populated set rows (reps + kg), expandable with "+ Set"
- Timed exercises: count-up timer with progress bar toward `targetSec` target; Log captures the elapsed time and resets for next set
- Timed exercises are flagged in `lib/workouts.js` with `timed: true, targetSec: N`
- Equipment: every exercise has a bodyweight base + `variants: { band: {...} }`; `equipment: 'band'` marks a base that itself needs equipment (Band Overhead Press), `requires: 'bar'` hides an exercise unless that equipment is selected. Each exercise has a per-session version toggle; the "Default for today" picker sets all toggles. The picker only lists equipment referenced in the data (`EQUIPMENT` = band / bar / kb), so adding pull-up bar or kettlebell work is data-only. Owned equipment persists per-device in localStorage.
- `finisher` exercises (Farmer's Carry on A/B/stability) are `weightOnly`: kg per carry, prefilled from the last logged weight via `getLastExerciseWeight()`

### Morning mobility
Card at top of Today tab → `MobilitySession`. Default mode is Quick (5–10 min) on scheduled workout days, Full (15–20 min) on rest days. A step with `quick: null` dose is skipped in Quick mode. Logged to `mobility_logs`.

### Beer plan + vacation mode (`lib/beerPlan.js`)
- Day plan types: `dry` / `sample` (work samples only) / `cap` (up to N) / `open`, keyed by `getDay()` in `beer_goals.day_plan`. Row `week_start = 'template'` is the default for future weeks; per-week rows are overrides (dry-day swaps). `DEFAULT_WEEK_PLAN` (Plan B: Sun/Mon/Thu dry, Tue samples, Wed ≤1 for owner meeting) is used until a template is saved. `saveWeekPlan` also keeps `target_pints` + `alcohol_free_days` filled for the health-coach bot.
- Sample rule: `beer_logs.kind = 'sample'`; a day is dry if all logs are samples totalling ≤ ½ pt (`isDryDay`). "Sample > ½ pt" logs 1 pt.
- `plan_periods` holds dry periods and vacations as date ranges (`end_date` null = open-ended). `planForDate()` applies them: vacation overrides everything; a dry period turns days dry but keeps sample days.
- Vacation: `scheduleFor(date, periods)` in `dates.js` returns `VACATION_SCHEDULE` (no workout); Today hides the beer card; reminders (when built) must skip vacation days.
- Morning commitment: `beer_intentions` (one row per `toronto_date`), prefilled from the day's plan.
- New-table reads (`getWeekPlan`, `getPlanPeriods`, `getTodayIntention`, `getTodayMobility`) swallow errors and fall back, so the app loads even if a migration hasn't been run.

### Push reminders (`lib/reminders.js`, `lib/push.js`, `scripts/send-reminders.js`)
- **Sender:** `.github/workflows/reminders.yml` runs `scripts/send-reminders.js` every 15 min (UTC 09–02). No Supabase Edge Function. The script imports the pure libs (`dates.js`, `beerPlan.js`, `reminders.js`, `mobility.js`) directly — keep those free of Vite/browser/Supabase imports and use explicit `.js` extensions on any imports they add.
- **Reminders** are defined in `REMINDERS` (id, time, optional `weekendTime`, `sundayOnly`, `sheet` to open on tap). User overrides live in `reminder_settings` (one row, `id='default'`). A reminder is due from its time until `REMINDER_WINDOW_MIN` later; each builder in the script returns null if the thing is already logged. `reminder_log` (unique date+kind) makes each fire once per day. Vacation days send nothing.
- **Devices:** 🔔 on Today → `RemindersSettings` → `enablePush()` subscribes and stores in `push_subscriptions`; expired subscriptions (404/410) are deleted by the script.
- **Service worker:** generateSW + `workbox.importScripts: ['push-sw.js']` (`public/push-sw.js`). Notification tap → `?open=<sheet>` (cold start) or `postMessage({type:'open-sheet'})` → `App` passes `initialSheet` to `TodayTab`. Push only works in the built app, not `npm run dev`.
- **Keys:** VAPID public key is in `reminders.js` and the workflow; private key in `.env` locally and the `VAPID_PRIVATE_KEY` Actions secret.
- **Test locally:** `npm run reminders -- --dry-run --at=07:35 --date=2026-12-08` (prints what would send). Real test push: Actions → Reminders → Run workflow → test.

### Coaching check-ins (`/checkin`)
- `.claude/commands/checkin.md` drives a coaching session in Claude Code; the report includes the bot chat (`coach_messages`) since the last check-in; `scripts/checkin.js` (`npm run checkin -- --days=14`) prints the data report, `--save=file.json` stores the outcome in `coach_checkins` so the next check-in can follow up.
- The repo is public: keep personal health details out of committed files (they live in Claude memory and `C:/Projects/health-coach/context.js`).

### db.js conventions
- Each table has focused functions: `logX()` for inserts, `getTodayX()` / `getRecentX()` / `getXChartData()` for reads
- Sleep is paired: `logBedtime()` creates a row with `wake_time = null`; `logWake()` finds the most recent unpaired row and updates it
- `logWorkout(type, completed, notes, sets)` inserts to `workouts` then `workout_sets` in one call

## Supabase schema

11 tables — all with `toronto_date text` and `created_at timestamptz`:

| Table | Purpose |
|-------|---------|
| `sleep_logs` | Paired bedtime/wake rows; `hours_slept`, `quality` filled on wake |
| `beer_logs` | Per-session pint entries; `kind` = beer / sample |
| `beer_goals` | Weekly pint target + alcohol-free days + `day_plan` jsonb; `week_start='template'` = default plan |
| `beer_intentions` | Morning commitment per day: plan_type, cap, if-then note |
| `plan_periods` | Dry periods + vacations: kind, start_date, end_date (null = open) |
| `caffeine_logs` | Source, amount, estimated mg |
| `energy_logs` | Afternoon score 1–5 |
| `vitamin_logs` | Dose per entry (morning/afternoon/evening/soak) |
| `workouts` | Completion record: type, completed bool, notes |
| `workout_sets` | Per-set detail: exercise, set_number, reps, weight_kg, time_sec |
| `weight_logs` | Weight in kg |
| `mood_logs` | Score 1–5 |
| `illness_episodes` | start_date / end_date pairs |
| `mobility_logs` | Morning mobility: mode (quick/full), duration_min, steps_done/total |
| `push_subscriptions` | Web Push endpoint + keys per device |
| `reminder_settings` | One row (`id='default'`): per-reminder on/time/weekendTime jsonb |
| `reminder_log` | One row per reminder sent per day (dedupe) |
| `coach_checkins` | /checkin outcomes: summary, focus[], changes[] |
| `coach_messages` | Telegram bot chat: role user/assistant/reset (reset = bot forgot earlier messages) |

RLS is disabled on all tables (personal app, anon key).

## Adding a new metric

1. Add table to `schema.sql` + run `CREATE TABLE` in Supabase SQL editor
2. Add `logX()` / `getTodayX()` functions to `lib/db.js`
3. Add a form component in `components/forms/`
4. Add a tile to `TodayTab.jsx` (3×3 grid)
5. Add stat to `WeeklyTab.jsx` and chart to `ProgressTab.jsx` if relevant
6. Add context query to `C:/Projects/health-coach/supabase-context.js` if the bot should coach on it

## Icons

`public/icon-192.png` and `public/icon-512.png` were generated by `generate-icons.cjs` (pure Node, no deps). Re-run `node generate-icons.cjs` if icons need updating.
