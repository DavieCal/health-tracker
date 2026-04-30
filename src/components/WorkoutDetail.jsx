import { useState } from 'react'
import { WORKOUTS } from '../lib/workouts'

export default function WorkoutDetail({ type }) {
  const workout = WORKOUTS[type]
  if (!workout) return <div style={s.rest}>Rest day. You've earned it.</div>

  return (
    <div style={s.container}>
      <p style={s.rounds}>{workout.rounds}</p>

      <Section title="Warm-Up" emoji="🌡️" color="#e5a550">
        {workout.warmup.map((ex, i) => (
          <div key={i} style={s.simpleRow}>
            <span style={s.simpleName}>{ex.name}</span>
            <span style={s.simpleDetail}>{ex.detail}</span>
          </div>
        ))}
      </Section>

      <Section title="Main Circuit" emoji="💪" color="#4f9cf9">
        {workout.circuit.map((ex, i) => (
          <ExerciseRow key={i} num={i + 1} exercise={ex} />
        ))}
      </Section>

      <Section title="Cool-Down" emoji="🧊" color="#4caf82">
        {workout.cooldown.map((ex, i) => (
          <div key={i} style={s.simpleRow}>
            <span style={s.simpleName}>{ex.name}</span>
            <span style={s.simpleDetail}>{ex.detail}</span>
          </div>
        ))}
      </Section>
    </div>
  )
}

function Section({ title, emoji, color, children }) {
  return (
    <div style={s.section}>
      <div style={s.sectionHeader}>
        <span style={s.sectionEmoji}>{emoji}</span>
        <span style={{ ...s.sectionTitle, color }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function ExerciseRow({ num, exercise }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={s.exCard} onClick={() => setOpen(v => !v)}>
      <div style={s.exTop}>
        <span style={s.exNum}>{num}</span>
        <div style={s.exInfo}>
          <span style={s.exName}>{exercise.name}</span>
          <span style={s.exDetail}>{exercise.detail}</span>
        </div>
        <span style={s.exChevron}>{open ? '▾' : '▸'}</span>
      </div>
      {open && exercise.cue && (
        <p style={s.exCue}>{exercise.cue}</p>
      )}
    </div>
  )
}

const s = {
  container: { paddingBottom: 8 },
  rest: { padding: '24px 0', textAlign: 'center', color: '#666', fontSize: 15 },
  rounds: { margin: '0 0 16px', fontSize: 13, color: '#666', fontStyle: 'italic' },
  section: { marginBottom: 20 },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionEmoji: { fontSize: 16 },
  sectionTitle: { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 },
  simpleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#0d0d1a', borderRadius: 8, marginBottom: 6 },
  simpleName: { fontSize: 14, color: '#ccc' },
  simpleDetail: { fontSize: 13, color: '#666' },
  exCard: { background: '#0d0d1a', borderRadius: 8, padding: '10px 12px', marginBottom: 6, cursor: 'pointer' },
  exTop: { display: 'flex', alignItems: 'center', gap: 10 },
  exNum: { width: 22, height: 22, background: '#2a2a3e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#4f9cf9', flexShrink: 0, textAlign: 'center', lineHeight: '22px' },
  exInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  exName: { fontSize: 14, fontWeight: 600, color: '#eee' },
  exDetail: { fontSize: 12, color: '#666' },
  exChevron: { color: '#444', fontSize: 14, flexShrink: 0 },
  exCue: { margin: '10px 0 2px 32px', fontSize: 13, color: '#aaa', lineHeight: 1.5 },
}
