// Equipment that can unlock exercise variants or extra exercises.
// Only equipment actually referenced by the workout data below shows in the session picker,
// so adding pull-up bar / kettlebell later is just adding `variants.bar` / `requires: 'kb'` entries.
export const EQUIPMENT = {
  bodyweight: { label: 'Bodyweight', emoji: '🤸' },
  band: { label: 'Band',        emoji: '🟢' },
  bar:  { label: 'Pull-up bar', emoji: '🔩' },
  kb:   { label: 'Kettlebell',  emoji: '🔔' },
}

// Exercise shape:
//   name, detail, cue                     — bodyweight version (default)
//   timed: true, targetSec: N             — count-up timer instead of reps
//   variants: { band: { name, detail, cue, timed?, targetSec? } }  — swap-in version when that equipment is selected
//   equipment: 'band'                     — the base version itself needs this equipment (no bodyweight option)
//   requires: 'bar'                       — only shown when that equipment is selected
//   weightOnly: true                      — finisher: log weight (kg) per set only

const FARMERS_CARRY = {
  name: 'Farmer’s Carry',
  detail: '~50 m per carry',
  cue: 'Heavy weight in each hand, shoulders down and back, ribs stacked over hips. Short quick steps, no leaning. Grip and core finisher.',
  weightOnly: true,
}

export const WORKOUTS = {
  A: {
    name: 'Workout A — Push / Core / Shoulders',
    rounds: '3 rounds · rest 60–90 sec between rounds',
    warmup: [
      { name: 'Arm Circles',   detail: '10 forward, 10 backward' },
      { name: 'Hip Circles',   detail: '10 each direction' },
      { name: 'Jumping Jacks', detail: '30 seconds' },
      { name: 'Cat-Cow',       detail: '8 reps' },
    ],
    circuit: [
      { name: 'Push-Ups',         detail: '12–15 reps',           cue: 'Chest to floor. If struggling, modify to knees — full range beats partial reps.',
        variants: { band: { name: 'Band-Resisted Push-Ups', detail: '10–12 reps', cue: 'Band across your upper back, an end pinned under each hand. Same full range — the band adds load at the top.' } } },
      { name: 'Band Overhead Press', detail: '10–12 reps', equipment: 'band', cue: 'Stand on the band, handles at shoulders. Press straight up, biceps by ears. Ribs down — don\'t arch.' },
      { name: 'Tricep Dips',      detail: '12–15 reps',           cue: 'Use a chair or couch edge. Elbows track straight back, not flaring out.',
        variants: { band: { name: 'Band Overhead Tricep Extension', detail: '12–15 reps', cue: 'Stand on the band, hands behind head. Extend arms up; elbows stay pointed forward and close to your head.' } } },
      { name: 'Doorframe Row',    detail: '12–15 reps',           cue: 'Grip both sides of a sturdy doorframe, feet close to it, lean back with straight arms. Pull your chest to the frame, squeeze shoulder blades. Walk feet closer to make it harder.',
        variants: { band: { name: 'Band Row', detail: '12–15 reps', cue: 'Anchor the band at chest height (door anchor) or loop it round your feet seated. Pull elbows back, squeeze shoulder blades together, pause 1 sec.' } } },
      { name: 'Prone T-Raise',    detail: '12–15 reps',           cue: 'Lying face down, arms straight out to the sides, thumbs up. Lift arms by squeezing shoulder blades, pause 2 sec. Counters all the pushing.',
        variants: { band: { name: 'Band Pull-Apart', detail: '15 reps', cue: 'Arms straight out at shoulder height, pull the band to your chest by squeezing shoulder blades. Counters all the pushing.' } } },
      { name: 'Plank Hold',       detail: '30–45 seconds',        cue: 'Dead-straight line from head to heel. Don\'t let hips sag or pike. Breathe steadily.',        timed: true, targetSec: 40,
        variants: { band: { name: 'Banded Plank Shoulder Taps', detail: '30–45 seconds', cue: 'Mini band around the wrists. From a high plank, tap opposite shoulder against the band\'s pull. Feet wide, hips don\'t rock.', timed: true, targetSec: 40 } } },
      { name: 'Mountain Climbers',detail: '20 reps (10 each leg)',cue: 'Hands under shoulders, keep hips level — don\'t bounce them.',
        variants: { band: { name: 'Banded Mountain Climbers', detail: '20 reps (10 each leg)', cue: 'Mini band around the feet. Drive each knee to chest against the band — slower and controlled, hips level.' } } },
      { name: 'Hollow Body Hold', detail: '20–30 seconds',        cue: 'Lower back pressed hard into the floor, arms overhead. This one will humble you.',               timed: true, targetSec: 25,
        variants: { band: { name: 'Banded Hollow Body Hold', detail: '20–30 seconds', cue: 'Hold a band overhead and pull it apart the whole time — lights up lats and core. Lower back stays pressed down.', timed: true, targetSec: 25 } } },
    ],
    finisher: [FARMERS_CARRY],
    cooldown: [
      { name: 'Child\'s Pose',          detail: '30 seconds' },
      { name: 'Doorway Chest Stretch',  detail: '30 seconds each side' },
      { name: 'Seated Forward Fold',    detail: '45 seconds' },
      { name: 'Thread the Needle',      detail: '30 seconds each side' },
    ],
  },
  B: {
    name: 'Workout B — Legs / Glutes / Posterior Chain',
    rounds: '3 rounds · rest 60–90 sec between rounds',
    warmup: [
      { name: 'Leg Swings',                detail: '10 forward/back, 10 side-to-side each leg' },
      { name: 'Slow Bodyweight Squats',    detail: '5 reps, 3 seconds down, controlled' },
      { name: 'Glute Bridge Activation',   detail: '10 slow reps, squeeze at top' },
      { name: 'Ankle Circles',             detail: '10 each direction' },
    ],
    circuit: [
      { name: 'Bodyweight Squats',  detail: '15–20 reps',        cue: 'Feet shoulder-width, chest up, knees track over toes. Go to parallel or below.',
        variants: { band: { name: 'Banded Squats', detail: '12–15 reps', cue: 'Stand on the band, handles at shoulders. Same depth and form — drive up hard against the band.' } } },
      { name: 'Reverse Lunges',     detail: '10 each leg',       cue: 'Step back, back knee hovers one inch from the floor. Front shin stays vertical.',
        variants: { band: { name: 'Banded Reverse Lunges', detail: '10 each leg', cue: 'Front foot pins the band, handles at shoulders. Step back, knee hovers, drive up through the front heel.' } } },
      { name: 'Glute Bridges',      detail: '15 reps + 5s hold', cue: 'Drive through heels. Squeeze hard at the top. Key exercise for posterior chain.',
        variants: { band: { name: 'Banded Glute Bridges', detail: '15 reps + 5s hold', cue: 'Mini band just above the knees — push knees out against it the whole time. Squeeze hard at the top.' } } },
      { name: 'Superman Hold',      detail: '10 reps, 2s hold',  cue: 'Arms forward, lift chest and legs simultaneously. Lower back and glutes doing the work.',
        variants: { band: { name: 'Band Good Mornings', detail: '12–15 reps', cue: 'Stand on the band, loop it behind your neck/upper back. Soft knees, hinge at the hips with a flat back, squeeze glutes to stand.' } } },
      { name: 'Doorframe Row',    detail: '12–15 reps',           cue: 'Grip both sides of a sturdy doorframe, feet close to it, lean back with straight arms. Pull your chest to the frame, squeeze shoulder blades. Walk feet closer to make it harder.',
        variants: { band: { name: 'Band Row', detail: '12–15 reps', cue: 'Anchor the band at chest height (door anchor) or loop it round your feet seated. Pull elbows back, squeeze shoulder blades together, pause 1 sec.' } } },
      { name: 'Wall Sit',           detail: '30–45 seconds',     cue: 'Thighs parallel to floor, back flat against wall. No sliding.',                              timed: true, targetSec: 40,
        variants: { band: { name: 'Banded Wall Sit', detail: '30–45 seconds', cue: 'Mini band above the knees, press knees out the whole hold. Thighs parallel, back flat.', timed: true, targetSec: 40 } } },
      { name: 'Calf Raises',        detail: '20 reps',           cue: 'Slow and controlled, full range. Heels drop below platform edge if possible.',
        variants: { band: { name: 'Banded Calf Raises', detail: '20 reps', cue: 'Band under the balls of your feet, handles at shoulders. Slow up, pause, slow down.' } } },
    ],
    finisher: [FARMERS_CARRY],
    cooldown: [
      { name: 'Pigeon Pose',                 detail: '60 seconds each side — don\'t skip this' },
      { name: 'Standing Hamstring Stretch',  detail: '30 seconds each leg' },
      { name: 'Low Lunge Hip Flexor Stretch',detail: '45 seconds each side' },
      { name: 'Calf + Achilles Stretch',     detail: '30 seconds each leg' },
    ],
  },
  stability: {
    name: 'Stability Training — Balance / Core / Unilateral',
    rounds: '3 rounds · rest 60 sec between rounds',
    warmup: [
      { name: 'Single-Leg Balance',   detail: '30 seconds each leg, eyes open' },
      { name: 'Hip Circles',          detail: '10 each direction' },
      { name: 'Cat-Cow',              detail: '8 reps' },
      { name: 'Dead Bug (warm-up)',   detail: '5 reps each side, slow' },
    ],
    circuit: [
      { name: 'Dead Bug',                   detail: '8 reps each side',    cue: 'Lower back glued to floor. Opposite arm + leg extend slowly. Do not let the back arch.',
        variants: { band: { name: 'Banded Dead Bug', detail: '8 reps each side', cue: 'Band anchored low behind your head, hold it with straight arms overhead. Keep tension on it while legs move — back stays glued down.' } } },
      { name: 'Bird Dog',                   detail: '10 reps each side',   cue: 'From all-fours — extend opposite arm and leg, pause 2 seconds. Spine stays flat. Do not rotate hips.',
        variants: { band: { name: 'Banded Bird Dog', detail: '10 reps each side', cue: 'Loop the band around the extending foot and the opposite hand. Extend against it, pause 2 sec. Spine flat, hips square.' } } },
      { name: 'Side Plank',                 detail: '30–40 sec each side', cue: 'Feet stacked or staggered. Hips up and square. Don\'t let the bottom hip sag.',          timed: true, targetSec: 35,
        variants: { band: { name: 'Side Plank Band Row', detail: '8 rows each side', cue: 'Band anchored at chest height. Hold a side plank facing the anchor and row with the top arm. Hips stay up the whole set.' } } },
      { name: 'Single-Leg Glute Bridge',    detail: '12 reps each leg',   cue: 'One leg extended straight. Drive through the heel. Hips stay level.',
        variants: { band: { name: 'Banded Single-Leg Glute Bridge', detail: '12 reps each leg', cue: 'Mini band above the knees, press out against it. One leg extended, drive through the heel, hips level.' } } },
      { name: 'Y-T-W (lying prone)',        detail: '8 reps each position',cue: 'Lying face down, lift arms to Y, then T, then W. Squeezes mid-back and rear delts. Light and controlled.',
        variants: { band: { name: 'Band Face Pull', detail: '12–15 reps', cue: 'Band anchored at face height. Pull toward your eyes, elbows high, finish with hands beside your ears. Light band, slow.' } } },
      { name: 'Pallof Press Hold',          detail: '20–30 sec each side', cue: 'No band? Half-kneel, reach both arms straight forward and hold. Resist rotation — trunk stays square.', timed: true, targetSec: 25,
        variants: { band: { name: 'Band Pallof Press Hold', detail: '20–30 sec each side', cue: 'Band anchored at chest height, stand side-on. Press hands straight out and hold — don\'t let the band twist you.', timed: true, targetSec: 25 } } },
    ],
    finisher: [FARMERS_CARRY],
    cooldown: [
      { name: 'Pigeon Pose',     detail: '45 seconds each side' },
      { name: 'Thread the Needle',detail: '30 seconds each side' },
      { name: 'Child\'s Pose',   detail: '30 seconds' },
      { name: 'Supine Twist',    detail: '30 seconds each side' },
    ],
  },
  bike: {
    name: 'Bike Ride',
    rounds: '20–30 min stationary',
    warmup: [{ name: 'Easy pace', detail: '3–5 min to warm up' }],
    circuit: [{ name: 'Steady ride', detail: '20–30 min', cue: 'Comfortable effort. Not a rest day, not a suffer-fest.' }],
    cooldown: [{ name: 'Easy spin', detail: '3–5 min to cool down' }],
  },
  rest: null,
}

// Selectable equipment used anywhere in a workout, in EQUIPMENT order (bodyweight excluded — always available).
export function equipmentFor(workout) {
  const used = new Set()
  for (const ex of workout?.circuit || []) {
    if (ex.requires) used.add(ex.requires)
    if (ex.equipment) used.add(ex.equipment)
    Object.keys(ex.variants || {}).forEach(k => used.add(k))
  }
  return Object.keys(EQUIPMENT).filter(k => k !== 'bodyweight' && used.has(k))
}

// Version keys an exercise offers, e.g. ['bodyweight', 'band'].
export function optionsFor(ex) {
  return [ex.equipment || 'bodyweight', ...Object.keys(ex.variants || {})]
}

// Default version given the equipment selected for today: first variant you have, else the base.
export function defaultOption(ex, equipment) {
  return Object.keys(ex.variants || {}).find(k => equipment.includes(k)) || ex.equipment || 'bodyweight'
}

// The exercise as performed with the chosen version key.
export function resolveExercise(ex, key) {
  const v = ex.variants?.[key]
  if (!v) return ex
  return { ...ex, ...v, timed: v.timed ?? false, targetSec: v.targetSec }
}
