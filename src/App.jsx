import { useState, useEffect } from 'react'
import TodayTab from './components/tabs/TodayTab'
import WorkoutsTab from './components/tabs/WorkoutsTab'
import WeeklyTab from './components/tabs/WeeklyTab'
import ProgressTab from './components/tabs/ProgressTab'
import HistoryTab from './components/tabs/HistoryTab'

const TABS = [
  { id: 'today',    label: 'Today',    icon: '⊙' },
  { id: 'workouts', label: 'Workouts', icon: '🏋️' },
  { id: 'weekly',   label: 'Weekly',   icon: '📊' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'history',  label: 'Days',     icon: '📅' },
]

// Reminder notifications open the app with ?open=<sheet> (cold start) or post an 'open-sheet' message (app already open).
const SHEET_PARAM = 'open'

export default function App() {
  const [tab, setTab] = useState('today')
  const [refreshKey, setRefreshKey] = useState(0)
  const [pendingSheet, setPendingSheet] = useState(() => new URLSearchParams(window.location.search).get(SHEET_PARAM))
  function bump() { setPendingSheet(null); setRefreshKey(k => k + 1) }
  function switchTab(id) { setPendingSheet(null); setTab(id) }

  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.has(SHEET_PARAM)) {
      url.searchParams.delete(SHEET_PARAM)
      window.history.replaceState(null, '', url)
    }
    if (!('serviceWorker' in navigator)) return
    function onMessage(e) {
      if (e.data?.type !== 'open-sheet') return
      setTab('today')
      setPendingSheet(e.data.sheet)
      setRefreshKey(k => k + 1)   // remount Today so it opens the sheet with fresh data
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [])

  return (
    <div style={s.app}>
      <main style={s.main}>
        {tab === 'today'    && <TodayTab    key={refreshKey} onSaved={bump} initialSheet={pendingSheet} />}
        {tab === 'workouts' && <WorkoutsTab key={refreshKey} onSaved={bump} />}
        {tab === 'weekly'   && <WeeklyTab   key={refreshKey} />}
        {tab === 'progress' && <ProgressTab />}
        {tab === 'history'  && <HistoryTab  key={refreshKey} />}
      </main>
      <nav style={s.nav}>
        {TABS.map(t => (
          <button
            key={t.id}
            style={{ ...s.navBtn, color: tab === t.id ? '#4f9cf9' : '#555' }}
            onClick={() => switchTab(t.id)}
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
