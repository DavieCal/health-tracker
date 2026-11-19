---
description: Check on or fix the Telegram coach bot (status, logs, restart, clear its memory)
argument-hint: "[problem, e.g. 'not replying' or 'thinks I'm sick']"
---

You're checking on the Health Coach Telegram bot in `C:/Projects/health-coach`, the chat Dave uses between `/checkin` sessions. Problem described: `$ARGUMENTS` (may be empty, meaning a general health check).

Read `C:/Projects/health-coach/CLAUDE.md` first if you need the architecture.

## 1. Is it running?

- `pm2 jlist` — the `health-coach` process should be `online`, running `app.js`.
- `pm2 logs health-coach --lines 40 --nostream` — look for:
  - `[history] Loaded N messages.` at startup. If you see `Supabase unavailable … loaded … from history.json` instead, the `coach_messages` table or the bot's Supabase settings are the problem.
  - `[Telegram polling] ETELEGRAM: 502 Bad Gateway` — Telegram's servers having trouble. It's usually brief; only act if it continues.
  - `[Claude error]` — an API problem: key, credit or model.
  - `[scheduler]` lines should not appear. The scheduler is retired and the bot never messages first.

## 2. Wrong or stale answers

If the bot assumes something false (sick, wrong workout, wrong beer plan):

1. Check the data it sees. From `C:/Projects/health-coach`, print what it would be given:
   `node --input-type=module -e "import 'dotenv/config'; const s = await import('./supabase-context.js'); const p = await import('./plan-context.js'); console.log(await s.getSickContext()); console.log(await p.getPlanContext())"`
   An open `illness_episodes` row (no `end_date`) means it's a data problem: fix it in the app with Illness → Mark recovered.
2. Check what it remembers. Recent `coach_messages` rows are its working memory (last 7 days since the last `reset`). A wrong assistant reply in there will keep being repeated.
3. To clear its memory, insert a `reset` marker row (the same as Dave sending `/reset`), then restart:
   `supabase.from('coach_messages').insert({ toronto_date: <today in Toronto>, role: 'reset', content: '<why>' })`
   Never delete `coach_messages` rows; `/checkin` reads them.

## 3. After changing bot code

- `node --check <file>` on each file you edited, then `pm2 restart health-coach`, and check the startup lines in the logs.
- The bot imports `src/lib/dates.js`, `workouts.js`, `mobility.js` and `beerPlan.js` from this repo. Changing routines here changes what the bot coaches, after a restart.
- `C:/Projects/health-coach` is not a git repo, so edits there are live once restarted and have no history. Mention this when you change something.

## Rules

- Don't read other projects' `.env` files. Use the bot's own `.env` via `dotenv`, only from inside `C:/Projects/health-coach`.
- Ask Dave before changing the model, the Anthropic SDK version, or the system prompt in `context.js`.
- Finish with: what was wrong, what you changed, and anything Dave needs to do (for example "send `/reset`" or "run this SQL").
