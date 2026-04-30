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
import {
  getLatestSleepLogs, getTodayBeerLogs, getTodayCaffeine,
  getTodayEnergy, getTodayVitamins, getTodayWorkout,
  getTodayWeight, getTodayMood, getActiveIllness,
} from '../../lib/db'
import { todayLabel, todaySchedule, formatHours } from '../../lib/dates'

export default function TodayTab({ onSaved }) {
  const [sheet, setSheet] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [sleepLogs, beerLogs, caffeine, energy, vitamins, workout, weight, mood, illness] =
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
      ])
    setData({ sleepLogs, beerLogs, caffeine, energy, vitamins, workout, weight, mood, illness })
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

  const { sleepLogs, beerLogs, caffeine, energy, vitamins, workout, weight, mood, illness } = data
  const latestSleep = sleepLogs[0] || null
  const hasOpenBedtime = latestSleep && !latestSleep.wake_time
  const todayBeerPints = beerLogs.reduce((s, r) => s + r.pints, 0)
  const schedule = todaySchedule()

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
      color: todayBeerPints > 2 ? '#e06c75' : todayBeerPints > 0 ? '#e5a550' : '#aaa',
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
      value: weight ? `${weight.weight_kg}kg` : null,
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

  return (
    <div style={s.container}>
      <div style={s.header}>
        <p style={s.dateLabel}>{todayLabel()}</p>
        <div style={s.scheduleBadge}>
          <span>{schedule.emoji}</span>
          <span style={s.scheduleText}>{schedule.label}</span>
        </div>
      </div>

      {illness && (
        <div style={s.illnessBanner}>
          🤒 Currently sick · <button style={s.illnessBtn} onClick={() => setSheet('illness')}>Mark recovered</button>
        </div>
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
  dateLabel: { margin: '0 0 10px', fontSize: 22, fontWeight: 700, color: '#eee' },
  scheduleBadge: { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1a1a2e', borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 600, color: '#ccc' },
  scheduleText: {},
  illnessBanner: { background: '#2a1a1a', border: '1px solid #e06c75', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#e06c75', marginBottom: 16 },
  illnessBtn: { background: 'none', border: 'none', color: '#4caf82', cursor: 'pointer', fontWeight: 600, padding: 0, fontSize: 14 },
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
}
