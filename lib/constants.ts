export const TRAINING_SESSIONS = [
  { type: 'run_easy', label: 'Easy Run', icon: '🏃', color: '#4ade80', desc: '5–7km, HR 140–157, fully conversational. Zone 2 fat-burning.', targetHR: [140,157], targetDist: 5, targetDuration: 38, mode: 'run' },
  { type: 'run_tempo', label: 'Tempo Run', icon: '🏃‍♂️', color: '#f59e0b', desc: '3–4km, HR 157–172, comfortably hard.', targetHR: [157,172], targetDist: 3.5, targetDuration: 25, mode: 'run' },
  { type: 'bike_easy', label: 'Recovery Ride', icon: '🚴', color: '#60a5fa', desc: '15–20km, HR 125–148, easy spin, fat burning.', targetHR: [125,148], targetDist: 18, targetDuration: 60, mode: 'bike' },
  { type: 'bike_hard', label: 'Hard Ride', icon: '🚴‍♂️', color: '#f97316', desc: '20–25km, HR 165–182, zone 4 push.', targetHR: [165,182], targetDist: 22, targetDuration: 75, mode: 'bike' },
  { type: 'brick', label: 'Brick Session', icon: '🔥', color: '#a855f7', desc: 'Bike 15km → Run 3km. Triathlon-specific.', targetHR: [155,170], targetDist: 18, targetDuration: 70, mode: 'multi' },
  { type: 'recovery_walk', label: 'Recovery Walk', icon: '🚶', color: '#86efac', desc: '30–60 min, HR under 120, active recovery.', targetHR: [90,120], targetDist: 4, targetDuration: 50, mode: 'walk' },
  { type: 'rest', label: 'Rest Day', icon: '💤', color: '#6b7280', desc: 'Morning routine only. Stretch. Eat well. Sleep.', targetHR: [0,0], targetDist: 0, targetDuration: 0, mode: 'rest' },
] as const

export const WEEKLY_TEMPLATE = [
  'run_easy','bike_hard','bike_easy','brick','rest','run_tempo','rest'
] as const

export function getSessionForDay(dateStr: string) {
  const dow = (new Date(dateStr + ' 12:00').getDay() + 6) % 7
  return TRAINING_SESSIONS.find(s => s.type === WEEKLY_TEMPLATE[dow]) ?? TRAINING_SESSIONS[6]
}

export const FOODS = [
  { name:'Egg', cal100:155, protein100:13, carbs100:1, fat100:11, defaultG:60, priceNote:'~€2/6-pack' },
  { name:'Chicken thigh', cal100:189, protein100:20, carbs100:0, fat100:12, defaultG:150, priceNote:'~€4/kg' },
  { name:'Chicken breast', cal100:165, protein100:31, carbs100:0, fat100:4, defaultG:150, priceNote:'~€5.50/kg' },
  { name:'Canned tuna', cal100:116, protein100:26, carbs100:0, fat100:1, defaultG:80, priceNote:'~€0.80/can' },
  { name:'Sardines', cal100:208, protein100:25, carbs100:0, fat100:12, defaultG:90, priceNote:'~€1/can' },
  { name:'Salmon (fresh)', cal100:208, protein100:20, carbs100:0, fat100:14, defaultG:150, priceNote:'~€12/kg' },
  { name:'Rice (cooked)', cal100:130, protein100:3, carbs100:28, fat100:0, defaultG:150, priceNote:'~€1.20/kg' },
  { name:'GF oats (dry)', cal100:370, protein100:13, carbs100:58, fat100:7, defaultG:80, priceNote:'~€2.50/kg' },
  { name:'Sweet potato', cal100:86, protein100:2, carbs100:20, fat100:0, defaultG:150, priceNote:'~€1.80/kg' },
  { name:'Banana', cal100:89, protein100:1, carbs100:23, fat100:0, defaultG:120, priceNote:'~€1.20/kg' },
  { name:'Broccoli', cal100:34, protein100:3, carbs100:7, fat100:0, defaultG:150, priceNote:'~€1.80/head' },
  { name:'Lentils (cooked)', cal100:116, protein100:9, carbs100:20, fat100:0, defaultG:150, priceNote:'~€1.20/500g' },
  { name:'Cottage cheese', cal100:98, protein100:11, carbs100:3, fat100:4, defaultG:150, priceNote:'~€1.80/250g' },
  { name:'Peanut butter', cal100:588, protein100:25, carbs100:20, fat100:50, defaultG:30, priceNote:'~€2.50/400g' },
  { name:'Pumpkin seeds', cal100:559, protein100:30, carbs100:11, fat100:49, defaultG:30, priceNote:'~€3/200g' },
  { name:'Rice cakes', cal100:387, protein100:8, carbs100:82, fat100:3, defaultG:25, priceNote:'~€1.20/pack' },
  { name:'Protein shake', cal100:380, protein100:75, carbs100:10, fat100:5, defaultG:35, priceNote:'~€25/kg' },
  { name:'Creatine monohydrate', cal100:0, protein100:0, carbs100:0, fat100:0, defaultG:5, priceNote:'~€15–20/500g' },
]

export function calcMacros(food: typeof FOODS[number], grams: number) {
  const g = grams / 100
  return {
    food_name: food.name, grams,
    calories: Math.round(food.cal100 * g),
    protein: Math.round(food.protein100 * g * 10) / 10,
    carbs: Math.round(food.carbs100 * g * 10) / 10,
    fat: Math.round(food.fat100 * g * 10) / 10,
  }
}

export function calcNavyBF(waist: number, neck: number, height: number) {
  if (!waist || !neck || !height || waist <= neck) return null
  return Math.round((86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76) * 10) / 10
}

export function calcBMR(weight: number, height: number, age: number) {
  return Math.round(10 * weight + 6.25 * height - 5 * age + 5)
}

export function getHRInsight(avgHR: number, lo: number, hi: number) {
  if (!lo) return null
  if (avgHR > hi + 10) return { type: 'warn', msg: `HR ${avgHR} is above target (${lo}–${hi}). Slow down next time.` }
  if (avgHR < lo - 10) return { type: 'info', msg: `HR ${avgHR} is below target. Push slightly harder or count as extra recovery.` }
  return { type: 'good', msg: `HR ${avgHR} is right in the target zone. Great execution.` }
}

export function formatDate(s: string) {
  return new Date(s + ' 12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export const todayStr = () => new Date().toISOString().split('T')[0]
