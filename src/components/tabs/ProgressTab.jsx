import { useState, useEffect } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import {
  getRecentEnergyLogs, getLatestSleepLogs, getBeerChartData,
  getWorkoutChartData, getWeightHistory, getRecentMoodLogs,
} from '../../lib/db'
import { formatShortDate } from '../../lib/dates'

export default function ProgressTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getRecentEnergyLogs(30),
      getLatestSleepLogs(30),
      getBeerChartData(12),
      getWorkoutChartData(12),
      getWeightHistory(),
      getRecentMoodLogs(30),
    ]).then(([energy, sleep, beer, workouts, weight, mood]) => {
      setData({ energy, sleep: sleep.filter(r => r.wake_time).reverse(), beer, workouts, weight, mood })
      setLoading(false)
    })
  }, [])

  if (loading || !data) return <div style={s.loading}>Loading…</div>

  const { energy, sleep, beer, workouts, weight, mood } = data

  const chartProps = {
    margin: { top: 4, right: 4, left: -20, bottom: 0 },
    style: { fontSize: 11 },
  }

  return (
    <div style={s.container}>
      <h2 style={s.heading}>Progress</h2>

      <Chart title="Sleep Quality (14 days)" color="#4caf82">
        {sleep.length < 2
          ? <Empty />
          : <LineChart data={sleep} {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis dataKey="toronto_date" tickFormatter={formatShortDate} stroke="#555" />
              <YAxis domain={[1, 5]} stroke="#555" />
              <Tooltip formatter={v => [`${v}/5`, 'Quality']} labelFormatter={formatShortDate} contentStyle={ttStyle} />
              <Line type="monotone" dataKey="quality" stroke="#4caf82" strokeWidth={2} dot={false} />
            </LineChart>
        }
      </Chart>

      <Chart title="Energy Score (14 days)" color="#e5a550">
        {energy.length < 2
          ? <Empty />
          : <LineChart data={energy} {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis dataKey="toronto_date" tickFormatter={formatShortDate} stroke="#555" />
              <YAxis domain={[1, 5]} stroke="#555" />
              <Tooltip formatter={v => [`${v}/5`, 'Energy']} labelFormatter={formatShortDate} contentStyle={ttStyle} />
              <Line type="monotone" dataKey="score" stroke="#e5a550" strokeWidth={2} dot={false} />
            </LineChart>
        }
      </Chart>

      <Chart title="Beer (pints/week, 12 weeks)" color="#e06c75">
        {beer.every(b => b.pints === 0)
          ? <Empty />
          : <BarChart data={beer} {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis dataKey="week" tickFormatter={formatShortDate} stroke="#555" />
              <YAxis stroke="#555" />
              <Tooltip formatter={v => [`${v}pt`, 'Beer']} labelFormatter={formatShortDate} contentStyle={ttStyle} />
              <Bar dataKey="pints" fill="#e06c75" radius={[3, 3, 0, 0]} />
            </BarChart>
        }
      </Chart>

      <Chart title="Workouts completed/week" color="#4f9cf9">
        {workouts.every(w => w.completed === 0)
          ? <Empty />
          : <BarChart data={workouts} {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
              <XAxis dataKey="week" tickFormatter={formatShortDate} stroke="#555" />
              <YAxis stroke="#555" allowDecimals={false} />
              <Tooltip formatter={v => [v, 'Workouts']} labelFormatter={formatShortDate} contentStyle={ttStyle} />
              <Bar dataKey="completed" fill="#4f9cf9" radius={[3, 3, 0, 0]} />
            </BarChart>
        }
      </Chart>

      {weight.length >= 2 && (
        <Chart title="Weight (kg)" color="#c678dd">
          <LineChart data={weight} {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
            <XAxis dataKey="toronto_date" tickFormatter={formatShortDate} stroke="#555" />
            <YAxis stroke="#555" domain={['auto', 'auto']} />
            <Tooltip formatter={v => [`${v}kg`, 'Weight']} labelFormatter={formatShortDate} contentStyle={ttStyle} />
            <Line type="monotone" dataKey="weight_kg" stroke="#c678dd" strokeWidth={2} dot={false} />
          </LineChart>
        </Chart>
      )}

      {mood.length >= 2 && (
        <Chart title="Mood Score" color="#4f9cf9">
          <LineChart data={mood} {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
            <XAxis dataKey="toronto_date" tickFormatter={formatShortDate} stroke="#555" />
            <YAxis domain={[1, 5]} stroke="#555" />
            <Tooltip formatter={v => [`${v}/5`, 'Mood']} labelFormatter={formatShortDate} contentStyle={ttStyle} />
            <Line type="monotone" dataKey="score" stroke="#4f9cf9" strokeWidth={2} dot={false} />
          </LineChart>
        </Chart>
      )}
    </div>
  )
}

function Chart({ title, children }) {
  return (
    <div style={s.chartCard}>
      <p style={s.chartTitle}>{title}</p>
      <ResponsiveContainer width="100%" height={160}>
        {children}
      </ResponsiveContainer>
    </div>
  )
}

function Empty() {
  return <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 14 }}>Not enough data yet</div>
}

const ttStyle = { background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 6, color: '#eee', fontSize: 12 }

const s = {
  container: { padding: '20px 16px 32px' },
  loading: { padding: 40, textAlign: 'center', color: '#666' },
  heading: { margin: '0 0 20px', fontSize: 22, fontWeight: 700 },
  chartCard: { background: '#1a1a2e', borderRadius: 14, padding: '14px 14px 10px', marginBottom: 14 },
  chartTitle: { margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
}
