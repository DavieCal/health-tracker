# Health Tracker

A mobile-installable PWA for personal daily health logging: sleep, beer, caffeine, energy, vitamins, workouts, morning mobility, weight, mood and illness. Built with React 19, Vite and vite-plugin-pwa, with data in Supabase. Live at https://daviecal.github.io/health-tracker/.

## Features

- **Today:** quick-log grid, morning mobility session, beer plan card with a morning commitment, Fitbit tiles, push reminder settings
- **Workouts:** weekly schedule; interactive sessions with set logging, timers and equipment variants; a screen wake lock keeps the phone awake
- **Weekly / Progress / Days:** week stats, trend charts and day history
- **Beer plan:** dry, sample, cap and open days; dry periods; vacation mode
- **Push reminders:** Web Push, sent by a GitHub Actions cron
- **Coaching:** `/checkin` in Claude Code builds a data report (including chat with the companion Telegram coach bot) and saves each check-in

## Development

```bash
npm install
npm run dev       # http://localhost:5173/health-tracker/
npm run build     # production build → dist/
npm run reminders -- --dry-run    # preview which push reminders would send
npm run checkin -- --days=14      # coaching data report
```

`npm run dev` and `npm run build` need a `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY`. Sending reminders locally also needs `VAPID_PRIVATE_KEY`. Table definitions are in `schema.sql`.

Pushing to `master` deploys to GitHub Pages via GitHub Actions. See `CLAUDE.md` for the architecture and conventions.
