import { useState, useEffect, useCallback } from 'react'
import Sheet from '../Sheet'
import SleepForm from '../forms/SleepForm'
import BeerForm from '../forms/BeerForm'
import CaffeineForm from '../forms/CaffeineForm'
import EnergyForm from '../forms/EnergyForm'
import WorkoutForm from '../forms/WorkoutForm'
import VitaminForm from '../forms/VitaminForm'
import WeightForm from '../forms/WeightForm'
import MoodForm from '../forms/MoodForm'
import IllnessForm from '../forms/IllnessForm'
import MobilitySession from '../MobilitySession'
import BeerPlanCard from '../BeerPlanCard'
import IntentionForm from '../forms/IntentionForm'
import BeerPlanEditor from '../forms/BeerPlanEditor'
import RemindersSettings from '../forms/RemindersSettings'
import {
  getLatestSleepLogs, getTodayBeerLogs, getTodayCaffeine,
  getTodayEnergy, getTodayVitamins, getTodayWorkout,
  getTodayWeight, getTodayMood, getActiveIllness, getTodayHealthDaily, getWellnessSignal,
  getTodayMobility, logMobility,
  getWeekPlan, getPlanPeriods, getTodayIntention, getWeeklyBeerData, setIntention,
} from '../../lib/db'
import { todayLabel, torontoDate, scheduleFor, formatHours, formatShortDate } from '../../lib/dates'
import { MOBILITY_MODES, defaultMobilityMode } from '../../lib/mobility'
import { planForDate, dayStatus, daysBetween } from '../../lib/beerPlan'

// initialSheet: opened when arriving from a reminder notification (e.g. 'vitamin', 'intention').
export default function TodayTab({ onSaved, initialSheet = null }) {
  const [sheet, setSheet] = useState(initialSheet)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // quiet = refresh data without the loading screen (keeps open sheets mounted)
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    const [sleepLogs, beerLogs, caffeine, energy, vitamins, workout, weight, mood, illness, healthDaily, wellness, mobility,
      weekPlan, periods, intention, weekBeer] =
      await Promise.all([
        getLatestSleepLogs(3),
        getTodayBeerLogs(),
        getTodayCaffeine(),
        getTodayEnergy(),
        getTodayVitamins(),
        getTodayWorkout(),
        getTodayWeight(),
        getTodayMood(),
        getActiveIllness(),
        getTodayHealthDaily(),
        getWellnessSignal(),
        getTodayMobility(),
        getWeekPlan(),
        getPlanPeriods(),
        getTodayIntention(),
        getWeeklyBeerData(),
      ])
    setData({ sleepLogs, beerLogs, caffeine, energy, vitamins, workout, weight, mood, illness, healthDaily, wellness, mobility,
      weekPlan, periods, intention, weekBeer })
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function handleSave() {
    setSheet(null)
    load()
    onSaved()
  }

  if (loading || !data) {
    return <div style={s.loading}>Loading…</div>
  }

  const { sleepLogs, beerLogs, caffeine, energy, vitamins, workout, weight, mood, illness, healthDaily, wellness, mobility,
    weekPlan, periods, intention, weekBeer } = data
  const latestSleep = sleepLogs[0] || null
  const hasOpenBedtime = latestSleep && !latestSleep.wake_time
  const todayBeerPints = beerLogs.reduce((s, r) => s + r.pints, 0)
  const today = torontoDate()
  const schedule = scheduleFor(today, periods)
  const mobilityMode = defaultMobilityMode(schedule.type)

  // Beer plan
  const beerPlan = planForDate(today, weekPlan, periods)
  const onVacation = beerPlan.type === 'vacation'
  const activeBeerPlan = intention ? { type: intention.plan_type, cap: intention.cap } : beerPlan
  const beerStatus = dayStatus(activeBeerPlan, beerLogs)
  const dryPeriod = periods
    .filter(p => p.kind === 'dry' && p.end_date && p.end_date >= today && daysBetween(today, p.start_date) <= 30)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0]

  async function handleMobilityComplete(result) {
    await logMobility(result)
    handleSave()
  }

  async function commitPlan() {
    try {
      await setIntention({ plan_type: beerPlan.type, cap: beerPlan.cap, note: beerPlan.note })
      load(true)
    } catch (e) {
      console.error('commit intention failed:', e.message)
    }
  }

  const tiles = [
    {
      id: 'sleep', emoji: '💤', label: 'Sleep',
      value: latestSleep?.wake_time
        ? `${formatHours(latestSleep.hours_slept)} · ${latestSleep.quality}/5`
        : hasOpenBedtime ? 'Bedtime ✓' : null,
      color: latestSleep?.wake_time ? '#4caf82' : '#aaa',
    },
    {
      id: 'beer', emoji: '🍺', label: 'Beer',
      value: todayBeerPints > 0 ? `${todayBeerPints}pt` : null,
      color: todayBeerPints === 0 ? '#aaa'
        : beerStatus === 'over' ? '#e06c75'
        : beerStatus === 'ok' ? '#4caf82'
        : todayBeerPints > 2 ? '#e06c75' : '#e5a550',
    },
    {
      id: 'caffeine', emoji: '☕', label: 'Caff.',
      value: caffeine.totalMg > 0 ? `${caffeine.totalMg}mg` : null,
      color: caffeine.totalMg > 300 ? '#e06c75' : caffeine.totalMg > 0 ? '#e5a550' : '#aaa',
    },
    {
      id: 'energy', emoji: '⚡', label: 'Energy',
      value: energy ? `${energy.score}/5` : null,
      color: energy ? scoreColor(energy.score) : '#aaa',
    },
    {
      id: 'vitamin', emoji: '💊', label: 'Vits',
      value: vitamins.length > 0 ? `${vitamins.length}/3` : null,
      color: vitamins.length >= 3 ? '#4caf82' : vitamins.length > 0 ? '#e5a550' : '#aaa',
    },
    {
      id: 'workout', emoji: schedule.emoji, label: 'Workout',
      value: workout ? (workout.completed ? '✓ Done' : '✗ Skipped') : null,
      color: workout?.completed ? '#4caf82' : workout ? '#666' : '#aaa',
    },
    {
      id: 'weight', emoji: '⚖️', label: 'Weight',
      value: weight ? `${Math.round(weight.weight_kg * 2.20462 * 10) / 10}lb` : null,
      color: '#aaa',
    },
    {
      id: 'mood', emoji: '😊', label: 'Mood',
      value: mood ? `${mood.score}/5` : null,
      color: mood ? scoreColor(mood.score) : '#aaa',
    },
    {
      id: 'illness', emoji: '🤒', label: 'Illness',
      value: illness ? 'Sick' : null,
      color: illness ? '#e06c75' : '#aaa',
    },
  ]

  const syncTiles = [
    {
      id: 'steps', emoji: '👟', label: 'Steps',
      value: healthDaily?.steps != null ? healthDaily.steps.toLocaleString() : null,
      color: healthDaily?.steps >= 8000 ? '#4caf82' : healthDaily?.steps >= 4000 ? '#e5a550' : '#aaa',
    },
    {
      id: 'hr', emoji: '❤️', label: 'Rest. HR',
      value: healthDaily?.resting_heart_rate ? `${healthDaily.resting_heart_rate} bpm` : null,
      color: healthDaily?.resting_heart_rate <= 60 ? '#4caf82' : healthDaily?.resting_heart_rate <= 75 ? '#e5a550' : '#aaa',
    },
    {
      id: 'active', emoji: '🏃', label: 'Active',
      value: healthDaily?.active_minutes != null ? `${healthDaily.active_minutes}min` : null,
      color: healthDaily?.active_minutes >= 30 ? '#4caf82' : healthDaily?.active_minutes > 0 ? '#e5a550' : '#aaa',
    },
  ]

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.headerTop}>
          <p style={s.dateLabel}>{todayLabel()}</p>
          <button style={s.bellBtn} onClick={() => setSheet('reminders')} aria-label="Reminders">🔔</button>
        </div>
        <div style={s.scheduleBadge}>
          <span>{schedule.emoji}</span>
          <span style={s.scheduleText}>{schedule.label}</span>
        </div>
      </div>

      {wellness && (
        <div style={{ ...s.illnessBanner, borderColor: wellness.alertLevel === 2 ? '#e06c75' : '#e5a550', color: wellness.alertLevel === 2 ? '#e06c75' : '#e5a550', background: wellness.alertLevel === 2 ? '#2a1a1a' : '#2a2010' }}>
          {wellness.alertLevel === 2 ? '⚠️ Illness signal' : '👁 Wellness watch'} · {wellness.signals.join(' · ')}
        </div>
      )}

      {onVacation && (
        <button style={s.vacationBanner} onClick={() => setSheet('beerplan')}>
          🏖️ Vacation mode{beerPlan.period?.end_date ? ` until ${formatShortDate(beerPlan.period.end_date)}` : ''} · no plans, no reminders
        </button>
      )}

      {!onVacation && dryPeriod && (
        <div style={s.dryBanner}>
          🌵 {dryPeriod.label || 'Dry week'} · {dryPeriod.start_date <= today
            ? `day ${daysBetween(dryPeriod.start_date, today) + 1} of ${daysBetween(dryPeriod.start_date, dryPeriod.end_date) + 1}`
            : `starts ${formatShortDate(dryPeriod.start_date)} · in ${daysBetween(today, dryPeriod.start_date)} day${daysBetween(today, dryPeriod.start_date) === 1 ? '' : 's'}`}
        </div>
      )}

      {illness && (
        <div style={s.illnessBanner}>
          🤒 Currently sick · <button style={s.illnessBtn} onClick={() => setSheet('illness')}>Mark recovered</button>
        </div>
      )}

      <button style={s.mobilityCard} onClick={() => setSheet('mobility')}>
        <span style={s.mobilitySun} aria-hidden="true" />
        <span style={s.mobilityInfo}>
          <span style={s.mobilityTitle}>Morning mobility</span>
          <span style={s.mobilitySub}>
            {mobility
              ? `${MOBILITY_MODES[mobility.mode]?.label || mobility.mode} · ${mobility.duration_min} min · ${mobility.steps_done}/${mobility.steps_total}`
              : `${MOBILITY_MODES[mobilityMode].label} · ${MOBILITY_MODES[mobilityMode].range}`}
          </span>
        </span>
        <span style={{ ...s.mobilityStatus, color: mobility ? '#4caf82' : '#e9b949' }}>
          {mobility ? '✓ Done' : '▶ Start'}
        </span>
      </button>

      {!onVacation && (
        <BeerPlanCard
          plan={beerPlan}
          intention={intention}
          todayLogs={beerLogs}
          weekLogs={weekBeer.logs}
          weekPlan={weekPlan}
          periods={periods}
          today={today}
          onCommit={commitPlan}
          onAdjust={() => setSheet('intention')}
          onEditPlan={() => setSheet('beerplan')}
        />
      )}

      <p style={s.sectionLabel}>Quick Log</p>
      <div style={s.grid}>
        {tiles.map(t => (
          <button key={t.id} style={s.tile} onClick={() => setSheet(t.id)}>
            <span style={s.tileEmoji}>{t.emoji}</span>
            <span style={s.tileName}>{t.label}</span>
            <span style={{ ...s.tileValue, color: t.color }}>{t.value || '—'}</span>
          </button>
        ))}
      </div>

      <p style={{ ...s.sectionLabel, marginTop: 20 }}>Fitbit <span style={s.syncBadge}>auto-sync</span></p>
      <div style={s.grid}>
        {syncTiles.map(t => (
          <div key={t.id} style={s.syncTile}>
            <span style={s.tileEmoji}>{t.emoji}</span>
            <span style={s.tileName}>{t.label}</span>
            <span style={{ ...s.tileValue, color: t.color }}>{t.value || '—'}</span>
          </div>
        ))}
      </div>

      <Sheet open={sheet === 'sleep'} onClose={() => setSheet(null)} title="Sleep">
        <SleepForm latestSleep={latestSleep} onSave={handleSave} />
      </Sheet>
      <Sheet open={sheet === 'beer'} onClose={() => setSheet(null)} title="Beer">
        <BeerForm onSave={handleSave} />
      </Sheet>
      <Sheet open={sheet === 'caffeine'} onClose={() => setSheet(null)} title="Caffeine">
        <CaffeineForm onSave={handleSave} />
      </Sheet>
      <Sheet open={sheet === 'energy'} onClose={() => setSheet(null)} title="Energy">
        <EnergyForm onSave={handleSave} />
      </Sheet>
      <Sheet open={sheet === 'vitamin'} onClose={() => setSheet(null)} title="Vitamins">
        <VitaminForm todayDoses={vitamins} onSave={handleSave} />
      </Sheet>
      <Sheet open={sheet === 'workout'} onClose={() => setSheet(null)} title="Workout">
        <WorkoutForm onSave={handleSave} />
      </Sheet>
      <Sheet open={sheet === 'weight'} onClose={() => setSheet(null)} title="Weight">
        <WeightForm onSave={handleSave} />
      </Sheet>
      <Sheet open={sheet === 'mood'} onClose={() => setSheet(null)} title="Mood">
        <MoodForm onSave={handleSave} />
      </Sheet>
      <Sheet open={sheet === 'illness'} onClose={() => setSheet(null)} title="Illness">
        <IllnessForm activeIllness={illness} onSave={handleSave} />
      </Sheet>
      <Sheet open={sheet === 'intention'} onClose={() => setSheet(null)} title="Today's Intention">
        {sheet === 'intention' && <IntentionForm plan={beerPlan} intention={intention} onSave={handleSave} />}
      </Sheet>
      <Sheet open={sheet === 'beerplan'} onClose={() => setSheet(null)} title="Beer Plan">
        {sheet === 'beerplan' && <BeerPlanEditor weekPlan={weekPlan} periods={periods} onSaved={() => load(true)} />}
      </Sheet>
      <Sheet open={sheet === 'reminders'} onClose={() => setSheet(null)} title="Reminders">
        {sheet === 'reminders' && <RemindersSettings />}
      </Sheet>
      <Sheet open={sheet === 'mobility'} onClose={() => setSheet(null)} title="Morning Mobility">
        {sheet === 'mobility' && <MobilitySession initialMode={mobilityMode} onComplete={handleMobilityComplete} />}
      </Sheet>
    </div>
  )
}

function scoreColor(n) {
  return ['', '#e06c75', '#e5a550', '#e5c07b', '#4caf82', '#4f9cf9'][n]
}

const s = {
  container: { padding: '20px 16px 32px' },
  loading: { padding: 40, textAlign: 'center', color: '#666' },
  header: { marginBottom: 20 },
  headerTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  bellBtn: { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '2px 4px', lineHeight: 1 },
  dateLabel: { margin: '0 0 10px', fontSize: 22, fontWeight: 700, color: '#eee' },
  scheduleBadge: { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a1a2e', borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 600, color: '#ccc' },
  scheduleText: {},
  illnessBanner: { background: '#2a1a1a', border: '1px solid #e06c75', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#e06c75', marginBottom: 16 },
  illnessBtn: { background: 'none', border: 'none', color: '#4caf82', cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: 14 },
  vacationBanner: { display: 'block', width: '100%', textAlign: 'left', background: '#10283a', border: '1px solid #4f9cf9', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#8cc4ff', marginBottom: 16, cursor: 'pointer' },
  dryBanner: { background: '#1a2a1a', border: '1px solid #4caf82', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#4caf82', marginBottom: 16 },
  mobilityCard: { display: 'flex', alignItems: 'center', gap: 14, width: '100%', background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 12, padding: '14px 16px', marginBottom: 20, cursor: 'pointer', textAlign: 'left' },
  mobilitySun: { width: 32, height: 16, borderRadius: '32px 32px 0 0', background: '#e9b949', flexShrink: 0 },
  mobilityInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  mobilityTitle: { fontSize: 15, fontWeight: 700, color: '#eee' },
  mobilitySub: { fontSize: 12, color: '#888' },
  mobilityStatus: { fontSize: 14, fontWeight: 700, flexShrink: 0 },
  sectionLabel: { margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: 1 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
  tile: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    background: '#1a1a2e', border: 'none', borderRadius: 12, padding: '16px 8px',
    cursor: 'pointer', transition: 'background 0.15s',
  },
  tileEmoji: { fontSize: 22 },
  tileName: { fontSize: 11, color: '#888', fontWeight: 500 },
  tileValue: { fontSize: 13, fontWeight: 700 },
  syncTile: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    background: '#12122a', border: '1px solid #2a2a3e', borderRadius: 12, padding: '16px 8px',
  },
  syncBadge: { fontSize: 9, fontWeight: 600, background: '#1a2a1a', color: '#4caf82', borderRadius: 4, padding: '1px 5px', letterSpacing: 0.5, verticalAlign: 'middle', marginLeft: 4 },
}
