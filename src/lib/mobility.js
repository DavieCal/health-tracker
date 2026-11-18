// Morning mobility routine.
// Each step has a dose per mode. `quick: null` means the step is skipped in Quick mode.
//   quick — 5–10 min, for workout days (default when today has a scheduled workout)
//   full  — 15–20 min, for mobility-only days (default on rest days)

export const MOBILITY_MODES = {
  quick: { label: 'Quick', range: '5–10 min', targetMin: 8,  hint: 'Workout day: prioritise squat hold, Cossacks and shoulders.' },
  full:  { label: 'Full',  range: '15–20 min', targetMin: 18, hint: 'Mobility-only day: want longer? Add time to the deep squat hold.' },
}

const yt = q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`

export const MOBILITY_PHASES = [
  {
    name: 'Open',
    note: 'Settle in and get focused.',
    steps: [
      {
        name: 'Box breathing',
        dose: { full: '2 min', quick: '1 min' },
        timed: { full: 120, quick: 60 },
        cue: 'In through the nose for 4, hold 4, out 4, hold 4. Wakes you up without spiking anything.',
        links: [{ label: 'Box breathing', url: yt('James Nestor box breathing') }],
      },
    ],
  },
  {
    name: 'Move',
    note: 'Nasal breathing throughout. Exhale into the deep positions.',
    steps: [
      {
        name: 'Lymphatic bounces',
        dose: { full: '2 min', quick: '1 min' },
        timed: { full: 120, quick: 60 },
        cue: 'Light heel bounces or small jumps. Loose shoulders, shake out the arms.',
        links: [{ label: 'Lymphatic bounce', url: yt('lymphatic heel bounce') }],
      },
      {
        name: 'Body waves',
        dose: { full: '1–2 min', quick: null },
        timed: { full: 90 },
        cue: 'Start slow, rolling chest to hips, then go bigger. Add side-to-side waves.',
        links: [{ label: 'Body wave tutorial', url: yt('body wave tutorial for beginners') }],
      },
      {
        name: 'Cat-cow',
        dose: { full: '10 reps', quick: '10 reps' },
        cue: 'On all fours. Move one segment at a time, tailbone to head.',
        breath: 'Inhale as you open, exhale as you round.',
        links: [{ label: 'Prehab Guys', url: yt('cat cow Prehab Guys') }],
      },
      {
        name: 'Thread the needle',
        dose: { full: '5 per side', quick: '5 per side' },
        cue: 'From all fours, reach one arm under and through, then open up to the ceiling. Thoracic rotation.',
        breath: 'Exhale as you thread through, inhale as you open.',
        links: [{ label: 'Prehab Guys', url: yt('thread the needle Prehab Guys') }],
      },
      {
        name: 'World’s greatest stretch',
        dose: { full: '5 per side', quick: '3 per side' },
        cue: 'Lunge, elbow to instep, rotate and reach up. Hips, hamstrings and upper back in one move.',
        breath: 'Inhale on the reach up.',
        links: [{ label: 'Prehab Guys demo', url: 'https://library.theprehabguys.com/vimeo-video/worlds-greatest-stretch-2' }],
      },
      {
        name: 'Deep squat hold',
        dose: { full: '2 min total · up to 4–5 min to go longer', quick: '1–2 min' },
        timed: { full: 120, quick: 90 },
        cue: 'Pry knees out with elbows, shift side to side, reach one arm overhead at a time. Hold a doorframe if your heels lift.',
        breath: 'Long exhales help the hips let go.',
        links: [{ label: 'Squat University', url: yt('Squat University deep squat') }],
      },
      {
        name: 'Cossack squats',
        dose: { full: '5–6 per side', quick: '4–5 per side' },
        cue: 'Slow, as low as you can control. Straight-leg toes up, bent-side heel down, chest upright. Hold something or go partway if needed.',
        quickCue: 'Standing in for 90/90 hip switches today.',
        breath: 'Exhale as you sink.',
        links: [{ label: 'Prehab Guys demo', url: 'https://library.theprehabguys.com/vimeo-video/cossack-squat' }],
      },
      {
        name: '90/90 hip switches',
        dose: { full: '8–10 reps', quick: null },
        cue: 'Seated, rotate knees side to side. Best for internal hip rotation.',
        links: [{ label: 'Tom Merrick', url: yt('90/90 hip switch Tom Merrick') }],
      },
      {
        name: 'Shoulder CARs or wall slides',
        dose: { full: '5–8 each', quick: '5 each' },
        cue: 'Slow, controlled, full range. Balances out the hip work.',
        links: [
          { label: 'Shoulder CARs', url: yt('shoulder CARs FRC') },
          { label: 'Wall slides', url: yt('wall slides Prehab Guys') },
        ],
      },
      {
        name: 'Shake-out bounces',
        dose: { full: '30–60 sec', quick: null },
        timed: { full: 45 },
        cue: 'Loose and easy. Shake it all out.',
        links: [],
      },
    ],
  },
  {
    name: 'Close',
    note: 'Calm and focused.',
    steps: [
      {
        name: 'Physiological sighs',
        dose: { full: '2–3 min', quick: '1 min' },
        timed: { full: 150, quick: 60 },
        cue: 'Double inhale through the nose (big breath, then a short top-up sip), then a long, slow exhale through the mouth.',
        links: [{ label: 'Physiological sigh', url: yt('Huberman physiological sigh') }],
      },
    ],
  },
]

// Default mode: Quick on scheduled workout days, Full on rest days.
export function defaultMobilityMode(scheduleType) {
  return scheduleType && scheduleType !== 'rest' ? 'quick' : 'full'
}
