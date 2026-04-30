import { useState } from 'react'
import TodayTab from './components/tabs/TodayTab'
import WorkoutsTab from './components/tabs/WorkoutsTab'
import WeeklyTab from './components/tabs/WeeklyTab'
import ProgressTab from './components/tabs/ProgressTab'

const TABS = [
  { id: 'today',    label: 'Today',    icon: '⊙' },
  { id: 'workouts', label: 'Workouts', icon: '🏋️' },
  { id: 'weekly',   label: 'Weekly',   icon: '📊' },
  { id: 'progress', label: 'Progress', icon: '📈' },
]

export default function App() {
  const [tab, setTab] = useState('today')
  const [refreshKey, setRefreshKey] = useState(0)
  function bump() { setRefreshKey(k => k + 1) }

  return (
    <div style={s.app}>
      <main style={s.main}>
        {tab === 'today'    && <TodayTab    key={refreshKey} onSaved={bump} />}
        {tab === 'workouts' && <WorkoutsTab key={refreshKey} onSaved={bump} />}
        {tab === 'weekly'   && <WeeklyTab   key={refreshKey} />}
        {tab === 'progress' && <ProgressTab />}
      </main>
      <nav style={s.nav}>
        {TABS.map(t => (
          <button
            key={t.id}
            style={{ ...s.navBtn, color: tab === t.id ? '#4f9cf9' : '#555' }}
            onClick={() => setTab(t.id)}
          >
            <span style={s.navIcon}>{t.icon}</span>
            <span style={s.navLabel}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

const s = {
  app: { display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0d0d1a', color: '#eee', fontFamily: 'system-ui, sans-serif' },
  main: { flex: 1, overflowY: 'auto' },
  nav: { display: 'flex', borderTop: '1px solid #1e1e2e', flexShrink: 0, background: '#0d0d1a' },
  navBtn: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 0 14px', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' },
  navIcon: { fontSize: 20 },
  navLabel: { fontSize: 11, fontWeight: 500 },
}
