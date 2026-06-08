import { supabase } from './supabase'
import { torontoDate, weekStart, prevWeekStarts, nextWeekStr } from './dates'

// ─── Sleep ────────────────────────────────────────────────────────────────────

export async function logBedtime(bedtimeISO) {
  const { error } = await supabase.from('sleep_logs').insert({
    toronto_date: torontoDate(),
    bedtime: bedtimeISO,
  })
  if (error) throw error
}

export async function logWake(quality, notes) {
  const { data, error } = await supabase
    .from('sleep_logs')
    .select('id, bedtime')
    .is('wake_time', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('No open bedtime to pair with')
  const wakeISO = new Date().toISOString()
  const hoursSlept = (new Date(wakeISO) - new Date(data.bedtime)) / 3_600_000
  const { error: e2 } = await supabase.from('sleep_logs').update({
    wake_time: wakeISO,
    quality,
    hours_slept: Math.max(0, Math.round(hoursSlept * 100) / 100),
    notes: notes || null,
  }).eq('id', data.id)
  if (e2) throw e2
}

export async function getLatestSleepLogs(limit = 14) {
  const { data, error } = await supabase
    .from('sleep_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// ─── Beer ─────────────────────────────────────────────────────────────────────

export async function logBeer(pints, isLastOfNight = false, notes = null) {
  const { error } = await supabase.from('beer_logs').insert({
    toronto_date: torontoDate(),
    pints,
    is_last_of_night: isLastOfNight,
    notes,
  })
  if (error) throw error
}

export async function getTodayBeerLogs() {
  const { data, error } = await supabase
    .from('beer_logs')
    .select('*')
    .eq('toronto_date', torontoDate())
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function getWeeklyBeerData() {
  const ws = weekStart()
  const { data, error } = await supabase
    .from('beer_logs')
    .select('*')
    .gte('toronto_date', ws)
    .order('created_at', { ascending: true })
  if (error) throw error
  return { logs: data, total: data.reduce((s, r) => s + r.pints, 0), weekStart: ws }
}

export async function getCurrentBeerGoal() {
  const { data, error } = await supabase
    .from('beer_goals')
    .select('*')
    .eq('week_start', weekStart())
    .maybeSingle()
  if (error) throw error
  return data
}

export async function setBeerGoal(targetPints, alcoholFreeDays = []) {
  const { error } = await supabase.from('beer_goals').upsert({
    week_start: weekStart(),
    target_pints: targetPints,
    alcohol_free_days: alcoholFreeDays,
  }, { onConflict: 'week_start' })
  if (error) throw error
}

export async function getBeerChartData(numWeeks = 12) {
  const weeks = prevWeekStarts(numWeeks)
  const { data, error } = await supabase
    .from('beer_logs')
    .select('toronto_date, pints')
    .gte('toronto_date', weeks[0])
  if (error) throw error
  return weeks.map(ws => ({
    week: ws,
    pints: data
      .filter(r => r.toronto_date >= ws && r.toronto_date < nextWeekStr(ws))
      .reduce((s, r) => s + r.pints, 0),
  }))
}

// ─── Caffeine ─────────────────────────────────────────────────────────────────

export async function logCaffeine(amount, unit, source, estimatedMg) {
  const { error } = await supabase.from('caffeine_logs').insert({
    toronto_date: torontoDate(),
    amount,
    unit,
    source,
    estimated_mg: estimatedMg,
  })
  if (error) throw error
}

export async function getTodayCaffeine() {
  const { data, error } = await supabase
    .from('caffeine_logs')
    .select('*')
    .eq('toronto_date', torontoDate())
    .order('created_at', { ascending: true })
  if (error) throw error
  return { logs: data, totalMg: data.reduce((s, r) => s + (r.estimated_mg || 0), 0) }
}

// ─── Energy ───────────────────────────────────────────────────────────────────

export async function logEnergy(score, notes = null) {
  const { error } = await supabase.from('energy_logs').insert({
    toronto_date: torontoDate(),
    score,
    notes,
  })
  if (error) throw error
}

export async function getTodayEnergy() {
  const { data, error } = await supabase
    .from('energy_logs')
    .select('*')
    .eq('toronto_date', torontoDate())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getRecentEnergyLogs(limit = 14) {
  const { data, error } = await supabase
    .from('energy_logs')
    .select('toronto_date, score')
    .order('toronto_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data.reverse()
}

// ─── Vitamins ─────────────────────────────────────────────────────────────────

export async function logVitamin(dose) {
  const { error } = await supabase.from('vitamin_logs').insert({
    toronto_date: torontoDate(),
    dose,
  })
  if (error) throw error
}

export async function getTodayVitamins() {
  const { data, error } = await supabase
    .from('vitamin_logs')
    .select('dose')
    .eq('toronto_date', torontoDate())
  if (error) throw error
  return data.map(r => r.dose)
}

export async function getWeeklyVitaminAdherence() {
  const ws = weekStart()
  const today = torontoDate()
  const days = Math.floor((new Date(today) - new Date(ws)) / 86400000) + 1
  const { data, error } = await supabase
    .from('vitamin_logs')
    .select('toronto_date, dose')
    .gte('toronto_date', ws)
  if (error) throw error
  const counts = {}
  for (const row of data) counts[row.dose] = (counts[row.dose] || 0) + 1
  return { counts, days }
}

// ─── Workouts ─────────────────────────────────────────────────────────────────

export async function logWorkout(workoutType, completed, notes, sets = [], customName = null) {
  const { data, error } = await supabase.from('workouts').insert({
    toronto_date: torontoDate(),
    workout_type: workoutType,
    completed,
    notes: notes || null,
    custom_name: workoutType === 'other' ? (customName || null) : null,
  }).select('id').single()
  if (error) throw error
  if (sets.length > 0) {
    const rows = sets.map(s => ({
      workout_id: data.id,
      exercise: s.exercise,
      set_number: s.setNumber,
      reps: s.reps || null,
      weight_kg: s.weightKg || null,
      time_sec: s.timeSec || null,
    }))
    const { error: e2 } = await supabase.from('workout_sets').insert(rows)
    if (e2) throw e2
  }
}

export async function getTodayWorkout() {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('toronto_date', torontoDate())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getRecentWorkouts(limit = 30) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*, workout_sets(*)')
    .order('toronto_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function getWorkoutsThisWeek() {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .gte('toronto_date', weekStart())
    .order('toronto_date', { ascending: true })
  if (error) throw error
  return data
}

export async function getWorkoutChartData(numWeeks = 12) {
  const weeks = prevWeekStarts(numWeeks)
  const { data, error } = await supabase
    .from('workouts')
    .select('toronto_date, completed')
    .gte('toronto_date', weeks[0])
  if (error) throw error
  return weeks.map(ws => ({
    week: ws,
    completed: data.filter(r => r.toronto_date >= ws && r.toronto_date < nextWeekStr(ws) && r.completed).length,
  }))
}

// ─── Weight ───────────────────────────────────────────────────────────────────

export async function logWeight(weightKg, notes = null) {
  const { error } = await supabase.from('weight_logs').insert({
    toronto_date: torontoDate(),
    weight_kg: weightKg,
    notes,
  })
  if (error) throw error
}

export async function getTodayWeight() {
  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('toronto_date', torontoDate())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getWeightHistory() {
  const { data, error } = await supabase
    .from('weight_logs')
    .select('toronto_date, weight_kg')
    .order('toronto_date', { ascending: true })
  if (error) throw error
  return data
}

// ─── Mood ─────────────────────────────────────────────────────────────────────

export async function logMood(score, notes = null) {
  const { error } = await supabase.from('mood_logs').insert({
    toronto_date: torontoDate(),
    score,
    notes,
  })
  if (error) throw error
}

export async function getTodayMood() {
  const { data, error } = await supabase
    .from('mood_logs')
    .select('*')
    .eq('toronto_date', torontoDate())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getRecentMoodLogs(limit = 14) {
  const { data, error } = await supabase
    .from('mood_logs')
    .select('toronto_date, score')
    .order('toronto_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data.reverse()
}

// ─── Illness ──────────────────────────────────────────────────────────────────

export async function startIllness(description) {
  const { error } = await supabase.from('illness_episodes').insert({
    start_date: new Date().toISOString(),
    description: description || null,
  })
  if (error) throw error
}

export async function endIllness() {
  const { data, error } = await supabase
    .from('illness_episodes')
    .select('id, start_date')
    .is('end_date', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return
  const endDate = new Date().toISOString()
  const daysLasted = Math.max(1, Math.ceil((new Date(endDate) - new Date(data.start_date)) / 86400000))
  const { error: e2 } = await supabase.from('illness_episodes').update({
    end_date: endDate,
    days_lasted: daysLasted,
  }).eq('id', data.id)
  if (e2) throw e2
}

export async function getActiveIllness() {
  const { data, error } = await supabase
    .from('illness_episodes')
    .select('*')
    .is('end_date', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getIllnessHistory(limit = 10) {
  const { data, error } = await supabase
    .from('illness_episodes')
    .select('*')
    .not('end_date', 'is', null)
    .order('start_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// ─── Health Daily (Google Health sync) ───────────────────────────────────────

export async function getTodayHealthDaily() {
  const { data, error } = await supabase
    .from('health_daily')
    .select('*')
    .eq('toronto_date', torontoDate())
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getWeeklyHealthDaily() {
  const { data, error } = await supabase
    .from('health_daily')
    .select('*')
    .gte('toronto_date', weekStart())
    .order('toronto_date', { ascending: true })
  if (error) throw error
  return data
}

export async function getRecentHealthDaily(days = 30) {
  const { data, error } = await supabase
    .from('health_daily')
    .select('toronto_date, steps, resting_heart_rate, active_minutes')
    .order('toronto_date', { ascending: false })
    .limit(days)
  if (error) throw error
  return data.reverse()
}

// ─── History / Edit ───────────────────────────────────────────────────────────

export async function getLast7DaysLogs() {
  const dates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(torontoDate(d))
  }
  const oldest = dates[dates.length - 1]
  // Fetch one extra day back for sleep: bedtime is logged the night before wake
  const sleepFrom = new Date(oldest + 'T12:00:00')
  sleepFrom.setDate(sleepFrom.getDate() - 1)
  const sleepFromStr = sleepFrom.toISOString().split('T')[0]

  const [sleepRes, beerRes, cafRes] = await Promise.all([
    supabase.from('sleep_logs').select('*').gte('toronto_date', sleepFromStr).order('created_at'),
    supabase.from('beer_logs').select('*').gte('toronto_date', oldest).order('created_at'),
    supabase.from('caffeine_logs').select('*').gte('toronto_date', oldest).order('created_at'),
  ])
  if (sleepRes.error) throw sleepRes.error
  if (beerRes.error) throw beerRes.error
  if (cafRes.error) throw cafRes.error

  return dates.map(date => ({
    date,
    // Match by wake date; fall back to bedtime date for today's open (no wake yet) entry
    sleep: sleepRes.data.find(r =>
      r.wake_time ? torontoDate(new Date(r.wake_time)) === date : r.toronto_date === date
    ) ?? null,
    beers: beerRes.data.filter(r => r.toronto_date === date),
    caffeine: cafRes.data.filter(r => r.toronto_date === date),
  }))
}

export async function getDayLogs(date) {
  // Sleep: fetch the night before too, since bedtime is logged on the prior date
  const prevDay = new Date(date + 'T12:00:00')
  prevDay.setDate(prevDay.getDate() - 1)
  const prevDayStr = prevDay.toISOString().split('T')[0]

  const [sleepRes, beerRes, cafRes] = await Promise.all([
    supabase.from('sleep_logs').select('*').gte('toronto_date', prevDayStr).lte('toronto_date', date).order('created_at'),
    supabase.from('beer_logs').select('*').eq('toronto_date', date).order('created_at'),
    supabase.from('caffeine_logs').select('*').eq('toronto_date', date).order('created_at'),
  ])
  if (sleepRes.error) throw sleepRes.error
  if (beerRes.error) throw beerRes.error
  if (cafRes.error) throw cafRes.error

  const sleep = sleepRes.data.find(r =>
    r.wake_time ? torontoDate(new Date(r.wake_time)) === date : r.toronto_date === date
  ) ?? null

  return { sleep, beers: beerRes.data || [], caffeine: cafRes.data || [] }
}

export async function updateSleepLog(id, bedtimeISO, wakeISO) {
  const hoursSlept = wakeISO && bedtimeISO
    ? Math.max(0, Math.round((new Date(wakeISO) - new Date(bedtimeISO)) / 3_600_000 * 100) / 100)
    : null
  const { error } = await supabase.from('sleep_logs').update({
    bedtime: bedtimeISO,
    wake_time: wakeISO || null,
    hours_slept: hoursSlept,
  }).eq('id', id)
  if (error) throw error
}

export async function upsertDayBeers(date, totalPints, consumedAt) {
  const { error: delErr } = await supabase.from('beer_logs').delete().eq('toronto_date', date)
  if (delErr) throw delErr
  if (totalPints > 0) {
    const { error } = await supabase.from('beer_logs').insert({
      toronto_date: date,
      pints: totalPints,
      is_last_of_night: true,
      consumed_at: consumedAt || null,
    })
    if (error) throw error
  }
}

export async function updateCaffeineConsumedAt(id, consumedAt) {
  const { error } = await supabase.from('caffeine_logs').update({
    consumed_at: consumedAt || null,
  }).eq('id', id)
  if (error) throw error
}

// ─── Weekly summary ───────────────────────────────────────────────────────────

export async function getWeeklySummary() {
  const ws = weekStart()
  const today = torontoDate()

  const [sleepLogs, beerData, beerGoal, energyLogs, vitaminData, workouts] = await Promise.all([
    getLatestSleepLogs(14),
    getWeeklyBeerData(),
    getCurrentBeerGoal(),
    getRecentEnergyLogs(7),
    getWeeklyVitaminAdherence(),
    getWorkoutsThisWeek(),
  ])

  const weekSleepLogs = sleepLogs.filter(r => r.toronto_date >= ws && r.wake_time)
  const avgSleepQuality = weekSleepLogs.length
    ? weekSleepLogs.reduce((s, r) => s + r.quality, 0) / weekSleepLogs.length
    : null
  const avgHoursSlept = weekSleepLogs.length
    ? weekSleepLogs.reduce((s, r) => s + r.hours_slept, 0) / weekSleepLogs.length
    : null

  const weekEnergyLogs = energyLogs.filter(r => r.toronto_date >= ws)
  const avgEnergy = weekEnergyLogs.length
    ? weekEnergyLogs.reduce((s, r) => s + r.score, 0) / weekEnergyLogs.length
    : null
  const energyCrashes = weekEnergyLogs.filter(r => r.score <= 2).length

  return {
    weekStart: ws,
    sleep: { logs: weekSleepLogs, avgQuality: avgSleepQuality, avgHours: avgHoursSlept },
    beer: { total: beerData.total, goal: beerGoal?.target_pints || 14 },
    energy: { avg: avgEnergy, crashes: energyCrashes },
    vitamins: vitaminData,
    workouts: { logs: workouts, completed: workouts.filter(w => w.completed).length },
  }
}
