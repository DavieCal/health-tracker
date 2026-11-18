/* global process */
// Sends due push reminders. Run by GitHub Actions every 15 min (.github/workflows/reminders.yml).
//
//   node scripts/send-reminders.js              send whatever is due now
//   node scripts/send-reminders.js --dry-run    print what would be sent (no send, no log)
//   node scripts/send-reminders.js --at=10:05   pretend it's this Toronto time (use with --dry-run)
//   node scripts/send-reminders.js --date=2026-12-06  pretend it's this date (use with --dry-run)
//   node scripts/send-reminders.js --test       send a test notification to every device
//
// Env: VITE_SUPABASE_URL, VITE_SUPABASE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
// Locally: npm run reminders -- --dry-run   (reads .env)

import { createClient } from '@supabase/supabase-js'
import * as webpush from 'web-push'
import { torontoDate, nowTimeValue, scheduleFor, weekStart } from '../src/lib/dates.js'
import {
  planForDate, planLabel, resolveWeekPlan, periodOn, addDays, weekdayOf, daysBetween,
  PLAN_TEMPLATE_KEY, WEEKDAY_NAMES,
} from '../src/lib/beerPlan.js'
import { mergeReminderSettings, isDue, REMINDER_SETTINGS_ID } from '../src/lib/reminders.js'
import { MOBILITY_MODES, defaultMobilityMode } from '../src/lib/mobility.js'

const args = process.argv.slice(2)
const TEST = args.includes('--test')
const DRY_RUN = args.includes('--dry-run')
const AT = args.find(a => a.startsWith('--at='))?.slice(5)
const DATE = args.find(a => a.startsWith('--date='))?.slice(7)

function env(name) {
  const v = process.env[name]
  if (!v) { console.error(`Missing env ${name}`); process.exit(1) }
  return v
}

const supabase = createClient(env('VITE_SUPABASE_URL'), env('VITE_SUPABASE_KEY'))
if (!DRY_RUN) {
  webpush.setVapidDetails('https://daviecal.github.io/health-tracker/', env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'))
}

// fallback: in --dry-run, a missing table (migration not run yet) reads as this instead of failing.
async function rows(query, label, fallback) {
  const { data, error } = await query
  if (error) {
    if (DRY_RUN && fallback !== undefined) { console.log(`  (${label}: ${error.message} — using fallback)`); return fallback }
    throw new Error(`${label}: ${error.message}`)
  }
  return data
}

async function exists(table, today, extra = q => q) {
  const data = await rows(extra(supabase.from(table).select('id').eq('toronto_date', today)).limit(1), table, [])
  return data.length > 0
}

async function weekPlanFor(ws) {
  const data = await rows(supabase.from('beer_goals').select('*').in('week_start', [ws, PLAN_TEMPLATE_KEY]), 'beer_goals', [])
  return resolveWeekPlan(data, ws)
}

// ─── Message builders: return null if already done ───────────────────────────

function dryPeriodNote(date, plan) {
  const p = plan.period
  if (!p || p.kind !== 'dry' || !p.end_date) return ''
  return ` 🌵 Day ${daysBetween(p.start_date, date) + 1} of ${daysBetween(p.start_date, p.end_date) + 1}.`
}

const vitamin = (dose, title, body) => async ({ today }) => {
  const doses = Array.isArray(dose) ? dose : [dose]
  if (await exists('vitamin_logs', today, q => q.in('dose', doses))) return null
  return { title, body }
}

const BUILDERS = {
  async mobility({ today, periods }) {
    if (await exists('mobility_logs', today)) return null
    const sched = scheduleFor(today, periods)
    const mode = MOBILITY_MODES[defaultMobilityMode(sched.type)]
    return sched.type === 'rest'
      ? { title: '🧘 Morning mobility', body: `Rest day — ${mode.label} routine (${mode.range}).` }
      : { title: '🧘 Morning mobility', body: `${mode.label} routine (${mode.range}), then ${sched.emoji} ${sched.label}.` }
  },

  async beer_intention({ today, periods }) {
    if (await exists('beer_intentions', today)) return null
    const plan = planForDate(today, await weekPlanFor(weekStart(new Date(today + 'T12:00:00'))), periods)
    const note = plan.note && !plan.period ? ` ${plan.note}` : ''
    return {
      title: `🍺 Today: ${planLabel(plan)}`,
      body: `${note.trim() || 'Tap to commit to today’s plan.'}${dryPeriodNote(today, plan)}`,
    }
  },

  vit_morning: vitamin('morning', '💊 Morning vitamins', 'D3 · BioSteel · Probiotic — not logged yet.'),
  vit_afternoon: vitamin('afternoon', '⚡ Afternoon check', 'Multi · Vit C · Zinc — and how’s your energy (1–5)?'),
  vit_evening: vitamin(['evening', 'soak'], '🌙 Evening magnesium', 'Magnesium (or soak night) — not logged yet.'),

  async weekly_plan({ today, periods }) {
    const monday = addDays(today, 1)                 // fires on Sunday → plan for the week starting tomorrow
    const weekPlan = await weekPlanFor(monday)
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i)
      return { name: WEEKDAY_NAMES[weekdayOf(date)], plan: planForDate(date, weekPlan, periods) }
    })
    const names = type => days.filter(d => d.plan.type === type).map(d => d.name)
    const parts = []
    if (names('dry').length) parts.push(`Dry ${names('dry').join(', ')}`)
    if (names('sample').length) parts.push(`samples ${names('sample').join(', ')}`)
    const caps = days.filter(d => d.plan.type === 'cap').map(d => `${d.name} ≤${d.plan.cap}`)
    if (caps.length) parts.push(caps.join(', '))
    if (names('vacation').length) parts.push(`🏖️ ${names('vacation').join(', ')}`)
    const dry = periods.find(p => p.kind === 'dry' && p.start_date >= monday && p.start_date <= addDays(monday, 6))
    return {
      title: '📅 Next week’s beer plan',
      body: `${parts.join(' · ')} · budget ${weekPlan.target_pints} pt.${dry ? ` 🌵 ${dry.label || 'Dry week'} starts ${WEEKDAY_NAMES[weekdayOf(dry.start_date)]}.` : ''} Any swaps for work?`,
    }
  },
}

// ─── Sending ─────────────────────────────────────────────────────────────────

async function sendAll(subs, payload) {
  let ok = 0
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 },
      )
      ok++
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        console.log(`  subscription expired, removing (${s.device || s.endpoint.slice(0, 40)})`)
        await supabase.from('push_subscriptions').delete().eq('id', s.id)
      } else {
        console.error(`  send failed (${s.device || 'device'}): ${e.statusCode || ''} ${e.body || e.message}`)
      }
    }
  }
  return ok
}

// Record the reminder for today; false if another run already sent it.
async function claim(today, kind) {
  const { error } = await supabase.from('reminder_log').insert({ toronto_date: today, kind })
  if (!error) return true
  if (error.code === '23505') return false
  throw new Error(`reminder_log: ${error.message}`)
}

async function main() {
  const today = DATE || torontoDate()
  const now = AT || nowTimeValue()
  const weekday = weekdayOf(today)

  const subs = await rows(supabase.from('push_subscriptions').select('*'), 'push_subscriptions', [])
  console.log(`${today} ${now} (${WEEKDAY_NAMES[weekday]}) · ${subs.length} device(s)${DRY_RUN ? ' · dry run' : ''}`)

  if (TEST) {
    const sent = await sendAll(subs, { title: '🔔 Test reminder', body: 'Push reminders are working.', url: './', tag: 'test' })
    console.log(`test sent to ${sent}/${subs.length}`)
    if (subs.length && !sent) process.exitCode = 1
    return
  }
  if (!subs.length && !DRY_RUN) return

  const [settings, periods] = await Promise.all([
    rows(supabase.from('reminder_settings').select('settings').eq('id', REMINDER_SETTINGS_ID).maybeSingle(), 'reminder_settings', null),
    rows(supabase.from('plan_periods').select('*'), 'plan_periods', []),
  ])

  if (periodOn(today, periods, 'vacation')) { console.log('vacation — no reminders'); return }

  for (const r of mergeReminderSettings(settings?.settings)) {
    if (!isDue(r, now, weekday)) continue
    const msg = await BUILDERS[r.id]({ today, periods })
    if (!msg) { console.log(`${r.id}: already done`); continue }
    const payload = { ...msg, url: `./?open=${r.sheet}`, tag: r.id }
    if (DRY_RUN) { console.log(`${r.id}: would send →`, payload); continue }
    if (!(await claim(today, r.id))) { console.log(`${r.id}: already sent today`); continue }
    const sent = await sendAll(subs, payload)
    console.log(`${r.id}: sent to ${sent}/${subs.length}`)
    // Nothing delivered → un-claim so the next run retries.
    if (!sent) await supabase.from('reminder_log').delete().eq('toronto_date', today).eq('kind', r.id)
  }
}

main().catch(e => { console.error(e.message); process.exitCode = 1 })
