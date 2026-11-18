# Health Tracker PWA — Project Guide for Claude

Mobile-installable PWA for Dave's personal health logging. React 19 + Vite + vite-plugin-pwa, deployed to GitHub Pages. All data writes to Supabase (same shared project as notes-app and other PA ecosystem agents).

**Paired with:** Health Coach Telegram bot (`C:/Projects/health-coach`) — bot is coaching-only and reads from the same Supabase tables this app writes to.

## Running locally

```bash
npm run dev     # http://localhost:5173/health-tracker/
npm run build   # production build → dist/
```

Requires `.env.local` with:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY` (anon key)

## Deployment

GitHub Actions deploys automatically on push to `master` → GitHub Pages at `https://daviecal.github.io/health-tracker/`.

Secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` are set in the repo's GitHub Actions secrets. See `.github/workflows/deploy.yml`.

## Architecture

```
src/
├── App.jsx                   Bottom tab bar: Today | Workouts | Weekly | Progress
├── main.jsx
├── Sheet.jsx                 Reusable bottom-sheet overlay (used by all forms)
├── WorkoutDetail.jsx         Read-only workout reference (warm-up, circuit, cool-down)
├── WorkoutSession.jsx        Interactive session: equipment picker, set logger, timers, finisher
├── MobilitySession.jsx       Morning mobility checklist (Quick/Full modes, per-step timers)
├── lib/
│   ├── supabase.js           Supabase client init
│   ├── db.js                 All Supabase queries (one function per operation)
│   ├── dates.js              Toronto timezone helpers + WORKOUT_SCHEDULE
│   ├── workouts.js           Full workout data (exercises, cues, timed flags, equipment variants, finisher)
│   └── mobility.js           Morning mobility routine (doses per quick/full mode)
├── components/
│   ├── tabs/
│   │   ├── TodayTab.jsx      Quick-log grid + today's summary
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
│       ├── WeightForm.jsx    kg input
│       ├── MoodForm.jsx      Emoji score 1–5
│       └── IllnessForm.jsx   Start episode / mark recovered
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
