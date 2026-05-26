'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import {
  TRAINING_SESSIONS, WEEKLY_TEMPLATE, FOODS,
  getSessionForDay, calcMacros, calcNavyBF, calcBMR,
  getHRInsight, formatDate, todayStr,
} from '@/lib/constants'

interface Profile {
  id: string; name: string; weight: number; goal_weight: number;
  milestone1: number; milestone2: number; start_weight: number;
  height: number; age: number; calorie_target: number; protein_target: number;
  resting_hr: number; max_hr: number;
}
interface Session {
  id?: string; session_date: string; type: string; hr?: number; dist?: number;
  duration_min?: number; calories?: number; pace?: string; speed?: number;
  note?: string; done: boolean; skipped?: boolean; is_benchmark?: boolean;
}
interface WeightLog { id?: string; logged_date: string; value: number }
interface Meal {
  id?: string; logged_date: string; meal_type: string; food_name: string;
  grams?: number; calories: number; protein?: number; carbs?: number; fat?: number;
}
interface WaterLog { logged_date: string; glasses: number }
interface MoodLog { logged_date: string; score: number }
interface WatchLog { logged_date: string; nightly_recharge?: number; hrv?: number; sleep_hours?: number; leg_recovery?: string; }
interface SupplementLog { logged_date: string; protein_shake: boolean; creatine: boolean }
interface Measurement { id?: string; logged_date: string; waist?: number; neck?: number; chest?: number; hips?: number }

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return <span style={{ background: color + '22', color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, display: 'inline-block' }}>{children}</span>
}
function Bar({ pct, color }: { pct: number; color: string }) {
  return <div style={{ height: 6, borderRadius: 3, background: '#1f2937', overflow: 'hidden', marginTop: 4 }}><div style={{ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, background: color, borderRadius: 3 }} /></div>
}

export default function DashboardClient({ user, initialProfile }: { user: { id: string; email?: string }; initialProfile: Profile | null }) {
  const supabase = createClient()
  const router = useRouter()
  const TODAY = todayStr()

  const [tab, setTab] = useState('dashboard')
  const [profile, setProfile] = useState<Profile>(initialProfile || { id: user.id, name: 'Alan', weight: 104, goal_weight: 83, milestone1: 94, milestone2: 90, start_weight: 104, height: 173, age: 37, calorie_target: 2400, protein_target: 150, resting_hr: 58, max_hr: 202 })
  const [weights, setWeights] = useState<WeightLog[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [waterLog, setWaterLog] = useState<WaterLog | null>(null)
  const [moodLog, setMoodLog] = useState<MoodLog | null>(null)
  const [suppLog, setSuppLog] = useState<SupplementLog | null>(null)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [showLogSession, setShowLogSession] = useState(false)
  const [showAddFood, setShowAddFood] = useState(false)
  const [showAddWeight, setShowAddWeight] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(null)
  const emptyLog = { type: 'run_easy', hr: '', dist: '', time: '', cal: '', speed: '', pace: '', note: '', sessionDate: TODAY }
  const [logForm, setLogForm] = useState(emptyLog)
  const [newWeight, setNewWeight] = useState('')
  const [foodMeal, setFoodMeal] = useState('breakfast')
  const [foodSearch, setFoodSearch] = useState('')
  const [foodGrams, setFoodGrams] = useState<Record<number, number>>({})
  const [measForm, setMeasForm] = useState({ waist: '', neck: '', chest: '', hips: '' })
  const [wlForm, setWlForm] = useState({ nightly: '', hrv: '', sleepH: '', legRecovery: '' })
  const [saving, setSaving] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    const uid = user.id
    const [s, w, m, water, mood, supp, meas] = await Promise.all([
      supabase.from('sessions').select('*').eq('user_id', uid).order('session_date'),
      supabase.from('weight_logs').select('*').eq('user_id', uid).order('logged_date'),
      supabase.from('meals').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('water_logs').select('*').eq('user_id', uid).eq('logged_date', TODAY).single(),
      supabase.from('mood_logs').select('*').eq('user_id', uid).eq('logged_date', TODAY).single(),
      supabase.from('supplement_logs').select('*').eq('user_id', uid).eq('logged_date', TODAY).single(),
      supabase.from('measurements').select('*').eq('user_id', uid).order('logged_date'),
    ])
    if (s.data) setSessions(s.data)
    if (w.data) setWeights(w.data)
    if (m.data) setMeals(m.data)
    if (water.data) setWaterLog(water.data)
    if (mood.data) setMoodLog(mood.data)
    if (supp.data) setSuppLog(supp.data)
    if (meas.data) setMeasurements(meas.data)
    setLoading(false)
  }, [user.id, TODAY])

  useEffect(() => { loadAll() }, [loadAll])

  const todayMeals = meals.filter(m => m.logged_date === TODAY)
  const todayCal = todayMeals.reduce((s, m) => s + m.calories, 0)
  const todayProtein = todayMeals.reduce((s, m) => s + (m.protein || 0), 0)
  const todayWater = waterLog?.glasses || 0
  const todayDone = sessions.filter(s => s.session_date === TODAY && s.done).slice(-1)[0]
  const todayCalBurned = todayDone?.calories || 0
  const calTarget = todayDone ? profile.calorie_target + 200 : profile.calorie_target
  const deficit = calTarget - todayCal + todayCalBurned
  const todaySession = getSessionForDay(TODAY)
  const latestWeight = weights.length > 0 ? weights[weights.length - 1].value : profile.weight
  const weightToGo = latestWeight - profile.goal_weight
  const weightLost = profile.start_weight - latestWeight
  const lastSess = sessions.filter(s => s.done).slice(-1)[0]
  const lastSessDef = lastSess ? TRAINING_SESSIONS.find(t => t.type === lastSess?.type) : null
  const hrInsight = lastSess && lastSessDef ? getHRInsight(lastSess.hr || 0, lastSessDef.targetHR[0], lastSessDef.targetHR[1]) : null
  const latestMeas = measurements.length > 0 ? measurements[measurements.length - 1] : null
  const currentBF = latestMeas ? calcNavyBF(latestMeas.waist || 0, latestMeas.neck || 0, profile.height) : null
  const todayDow = (new Date().getDay() + 6) % 7
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i)
    const ds = d.toISOString().split('T')[0]
    const s = sessions.find(x => x.session_date === ds)
    return { date: ds, label: d.toLocaleDateString('en', { weekday: 'short' }), done: s?.done, skipped: s?.skipped, cal: s?.calories || 0 }
  })
  const filteredFoods = FOODS.filter(f => f.name.toLowerCase().includes(foodSearch.toLowerCase()))

  async function logSession() {
    setSaving(true)
    await supabase.from('sessions').insert({ user_id: user.id, session_date: logForm.sessionDate || TODAY, type: logForm.type, hr: logForm.hr ? +logForm.hr : null, dist: logForm.dist ? +logForm.dist : null, duration_min: logForm.time ? +logForm.time : null, calories: logForm.cal ? +logForm.cal : null, pace: logForm.pace || null, speed: logForm.speed ? +logForm.speed : null, note: logForm.note || null, done: true, skipped: false })
    await loadAll(); setShowLogSession(false); setLogForm(emptyLog); setSaving(false)
  }
  async function skipDay(date: string) {
    await supabase.from('sessions').insert({ user_id: user.id, session_date: date, type: getSessionForDay(date).type, skipped: true, done: false })
    await loadAll()
  }
  async function addFood(food: typeof FOODS[number], grams: number) {
    const macros = calcMacros(food, grams)
    await supabase.from('meals').insert({ user_id: user.id, logged_date: TODAY, meal_type: foodMeal, food_name: macros.food_name, grams: macros.grams, calories: macros.calories, protein: macros.protein, carbs: macros.carbs, fat: macros.fat })
    await loadAll()
  }
  async function deleteFood(id: string) {
    await supabase.from('meals').delete().eq('id', id)
    setMeals(meals.filter(m => m.id !== id))
  }
  async function addWeight() {
    if (!newWeight) return
    await supabase.from('weight_logs').upsert({ user_id: user.id, logged_date: TODAY, value: +newWeight }, { onConflict: 'user_id,logged_date' })
    await loadAll(); setNewWeight(''); setShowAddWeight(false)
  }
  async function setGlasses(n: number) {
    await supabase.from('water_logs').upsert({ user_id: user.id, logged_date: TODAY, glasses: n }, { onConflict: 'user_id,logged_date' })
    setWaterLog({ logged_date: TODAY, glasses: n })
  }
  async function setMood(score: number) {
    await supabase.from('mood_logs').upsert({ user_id: user.id, logged_date: TODAY, score }, { onConflict: 'user_id,logged_date' })
    setMoodLog({ logged_date: TODAY, score })
  }
  async function toggleSupp(key: 'protein_shake' | 'creatine') {
    const current = suppLog || { logged_date: TODAY, protein_shake: false, creatine: false }
    const updated = { ...current, [key]: !current[key] }
    await supabase.from('supplement_logs').upsert({ user_id: user.id, ...updated }, { onConflict: 'user_id,logged_date' })
    setSuppLog(updated)
  }
  async function saveMeasurements() {
    if (!measForm.waist && !measForm.neck) return
    await supabase.from('measurements').insert({ user_id: user.id, logged_date: TODAY, waist: measForm.waist ? +measForm.waist : null, neck: measForm.neck ? +measForm.neck : null, chest: measForm.chest ? +measForm.chest : null, hips: measForm.hips ? +measForm.hips : null })
    setMeasForm({ waist: '', neck: '', chest: '', hips: '' }); await loadAll()
  }
  async function saveWatchLog() {
    await supabase.from('watch_logs').upsert({ user_id: user.id, logged_date: TODAY, nightly_recharge: wlForm.nightly ? +wlForm.nightly : null, hrv: wlForm.hrv ? +wlForm.hrv : null, sleep_hours: wlForm.sleepH ? +wlForm.sleepH : null, leg_recovery: wlForm.legRecovery || null }, { onConflict: 'user_id,logged_date' })
    await loadAll()
  }
  async function saveProfile() {
    await supabase.from('profiles').upsert({ id: user.id, ...profile })
  }
  async function signOut() {
    await supabase.auth.signOut(); router.push('/login')
  }

  if (loading) return <div style={{ background: '#0a0e1a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', fontSize: 18 }}>Loading FitTrack...</div>

  const TABS = [{ id: 'dashboard', icon: '🏠', label: 'Today' }, { id: 'train', icon: '🏃', label: 'Train' }, { id: 'food', icon: '🍽️', label: 'Food' }, { id: 'progress', icon: '📈', label: 'Stats' }, { id: 'more', icon: '⚙️', label: 'More' }]

  return (
    <div style={{ background: '#0a0e1a', minHeight: '100vh', color: '#e2e8f0', paddingBottom: 72, maxWidth: 480, margin: '0 auto', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#0f2744)', padding: '16px 16px 12px', borderBottom: '1px solid #1e3a5f' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>⚡ FitTrack</div>
            <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 2 }}>{formatDate(TODAY)} · {latestWeight}kg · M1: {profile.milestone1}kg → {profile.goal_weight}kg</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#6b7280' }}>To goal</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: weightToGo <= 5 ? '#4ade80' : '#f59e0b' }}>{weightToGo.toFixed(1)}kg</div>
          </div>
        </div>
      </div>

      <div style={{ padding: 16, paddingBottom: 0 }}>

        {tab === 'dashboard' && <>
          <div className="card" style={{ borderColor: todaySession.color + '44', background: todaySession.color + '11' }}>
            <div className="card-title">Today's Training</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 32 }}>{todaySession.icon}</div>
              <div><div style={{ fontSize: 17, fontWeight: 800 }}>{todaySession.label}</div><div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{todaySession.desc}</div></div>
            </div>
            {todaySession.targetHR[0] > 0 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}><Pill color="#ef4444">❤️ {todaySession.targetHR[0]}–{todaySession.targetHR[1]}</Pill><Pill color="#60a5fa">📍 {todaySession.targetDist}km</Pill><Pill color="#a855f7">⏱ ~{todaySession.targetDuration}min</Pill></div>}
            {todayDone ? <Pill color="#4ade80">✅ Done · {todayDone.dist}km · {todayDone.hr}bpm · {todayDone.calories}kcal</Pill>
              : todaySession.type !== 'rest' ? <div style={{ display: 'flex', gap: 8 }}><button className="ft-btn" onClick={() => { setLogForm({ ...emptyLog, type: todaySession.type }); setShowLogSession(true) }}>✅ Log Session</button><button className="ft-btn-red" onClick={() => skipDay(TODAY)}>Skip</button></div>
              : <div style={{ fontSize: 13, color: '#6b7280' }}>Rest day — morning routine only</div>}
          </div>

          {hrInsight && <div style={{ background: hrInsight.type === 'warn' ? '#7f1d1d18' : hrInsight.type === 'good' ? '#14532d18' : '#1e3a5f18', border: `1px solid ${hrInsight.type === 'warn' ? '#ef444433' : hrInsight.type === 'good' ? '#4ade8033' : '#60a5fa33'}`, borderRadius: 12, padding: 12, marginBottom: 10, fontSize: 13, lineHeight: 1.6 }}>{hrInsight.type === 'warn' ? '⚠️' : hrInsight.type === 'good' ? '✅' : 'ℹ️'} {hrInsight.msg}</div>}

          <div className="card">
            <div className="card-title">Energy Balance</div>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 12 }}>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 32, fontWeight: 900, color: '#60a5fa', lineHeight: 1 }}>{todayCal}</div><div style={{ fontSize: 10, color: '#6b7280' }}>eaten</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 32, fontWeight: 900, color: '#f97316', lineHeight: 1 }}>−{todayCalBurned}</div><div style={{ fontSize: 10, color: '#6b7280' }}>burned</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: 32, fontWeight: 900, color: deficit > 0 ? '#4ade80' : '#ef4444', lineHeight: 1 }}>{deficit}</div><div style={{ fontSize: 10, color: '#6b7280' }}>deficit</div></div>
            </div>
            <div style={{ marginBottom: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 2 }}><span>Calories {todayCal}/{calTarget}</span><span>{Math.round(todayCal / calTarget * 100)}%</span></div><Bar pct={todayCal / calTarget * 100} color="#60a5fa" /></div>
            <div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 2 }}><span>Protein {todayProtein.toFixed(0)}g/{profile.protein_target}g</span><span>{Math.round(todayProtein / profile.protein_target * 100)}%</span></div><Bar pct={todayProtein / profile.protein_target * 100} color="#a855f7" /></div>
            <button className="ft-btn-sm" style={{ marginTop: 10 }} onClick={() => setShowAddFood(true)}>+ Add Food</button>
          </div>

          <div className="card">
            <div className="card-title">💧 Water</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Array.from({ length: 10 }, (_, i) => <div key={i} onClick={() => setGlasses(i + 1)} style={{ width: 34, height: 34, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, background: i < todayWater ? '#1d4ed8' : '#1f2937', border: `2px solid ${i < todayWater ? '#60a5fa' : '#374151'}` }}>💧</div>)}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>{todayWater} of 10 glasses</div>
          </div>

          <div className="card">
            <div className="card-title">💊 Supplements</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ key: 'protein_shake' as const, icon: '🥤', label: 'Protein Shake', sub: '30–35g post-workout', color: '#a855f7' }, { key: 'creatine' as const, icon: '⚡', label: 'Creatine', sub: '5g any time', color: '#60a5fa' }].map(s => (
                <div key={s.key} onClick={() => toggleSupp(s.key)} style={{ flex: 1, borderRadius: 12, padding: 12, cursor: 'pointer', textAlign: 'center', background: suppLog?.[s.key] ? s.color + '22' : '#1f2937', border: `2px solid ${suppLog?.[s.key] ? s.color : '#374151'}` }}>
                  <div style={{ fontSize: 26, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: suppLog?.[s.key] ? s.color : '#9ca3af' }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{s.sub}</div>
                  <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: suppLog?.[s.key] ? '#4ade80' : '#4b5563' }}>{suppLog?.[s.key] ? '✅ Done' : 'Tap to log'}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">⚡ Energy Today</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(s => <div key={s} onClick={() => setMood(s)} style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}><div style={{ fontSize: 22, filter: moodLog?.score === s ? 'none' : 'grayscale(1) opacity(0.4)' }}>{['😴', '😐', '🙂', '💪', '🔥'][s - 1]}</div><div style={{ fontSize: 9, color: moodLog?.score === s ? '#60a5fa' : '#4b5563', marginTop: 2 }}>{['Low', 'OK', 'Good', 'Great', 'Beast'][s - 1]}</div></div>)}
            </div>
          </div>

          <div className="card">
            <div className="card-title">This Week</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {last7.map((d, i) => <div key={i} style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>{d.label}</div><div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: d.skipped ? '#7f1d1d' : d.done ? '#14532d' : '#1f2937', border: `2px solid ${d.skipped ? '#ef4444' : d.done ? '#4ade80' : '#374151'}` }}>{d.done ? '✓' : d.skipped ? '✗' : '·'}</div>{d.done && <div style={{ fontSize: 9, color: '#4ade80', marginTop: 2 }}>{d.cal}k</div>}</div>)}
            </div>
          </div>

          <button className="ft-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowAddWeight(true)}>⚖️ Log Weight</button>
        </>}

        {tab === 'train' && <>
          <div className="card" style={{ borderColor: todaySession.color + '44', background: todaySession.color + '11' }}>
            <div className="card-title">Today's Session</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}><div style={{ fontSize: 32 }}>{todaySession.icon}</div><div><div style={{ fontSize: 17, fontWeight: 800 }}>{todaySession.label}</div><div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{todaySession.desc}</div></div></div>
            {todayDone ? <Pill color="#4ade80">✅ {todayDone.dist}km · {todayDone.hr}bpm · {todayDone.calories}kcal</Pill>
              : todaySession.type !== 'rest' ? <div style={{ display: 'flex', gap: 8 }}><button className="ft-btn" onClick={() => { setLogForm({ ...emptyLog, type: todaySession.type }); setShowLogSession(true) }}>✅ Log Session</button><button className="ft-btn-red" onClick={() => skipDay(TODAY)}>Skip</button></div>
              : <div style={{ fontSize: 13, color: '#6b7280' }}>Rest day</div>}
          </div>

          <div className="card">
            <div className="card-title">This Week's Plan</div>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
              const sess = TRAINING_SESSIONS.find(s => s.type === WEEKLY_TEMPLATE[i])!
              const isToday = i === todayDow
              return <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '8px 10px', borderRadius: 10, background: isToday ? '#1e3a5f33' : 'transparent', border: isToday ? '1px solid #1d4ed8' : '1px solid transparent' }}>
                <div style={{ width: 30, fontSize: 12, fontWeight: 800, color: isToday ? '#60a5fa' : '#6b7280' }}>{day}</div>
                <div style={{ fontSize: 18 }}>{sess.icon}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{sess.label}{isToday ? ' 👈' : ''}</div><div style={{ fontSize: 11, color: '#6b7280' }}>{sess.targetDist > 0 ? `${sess.targetDist}km` : ''}{sess.targetHR[0] > 0 ? ` · HR ${sess.targetHR[0]}–${sess.targetHR[1]}` : ''}</div></div>
                <Pill color={sess.color}>{sess.mode}</Pill>
              </div>
            })}
          </div>
          <button className="ft-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowLogSession(true)}>✅ Log a Session</button>
        </>}

        {tab === 'food' && <>
          <div className="card">
            <div className="card-title">Today's Meals</div>
            {['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => {
              const items = todayMeals.filter(m => m.meal_type === mealType)
              return <div key={mealType} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize' }}>{mealType}</span><span style={{ fontSize: 11, color: '#6b7280' }}>{items.reduce((a, m) => a + m.calories, 0)}kcal · {items.reduce((a, m) => a + (m.protein || 0), 0).toFixed(1)}g</span></div>
                {items.length === 0 ? <div style={{ fontSize: 11, color: '#374151', paddingLeft: 8 }}>Nothing logged</div>
                  : items.map((item, j) => <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#9ca3af', paddingLeft: 8, marginBottom: 2 }}><span>• {item.food_name}{item.grams ? ` (${item.grams}g)` : ''} — {item.calories}kcal · {item.protein}g</span>{item.id && <button onClick={() => deleteFood(item.id!)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}>×</button>}</div>)}
              </div>
            })}
            <button className="ft-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} onClick={() => setShowAddFood(true)}>+ Add Food</button>
          </div>
        </>}

        {tab === 'progress' && <>
          <div className="card">
            <div className="card-title">⚖️ Weight Progress</div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
              {[{ val: latestWeight, label: 'now', color: '#60a5fa' }, { val: weightLost > 0 ? `-${weightLost.toFixed(1)}` : '—', label: 'lost', color: '#4ade80' }, { val: profile.milestone1, label: latestWeight <= profile.milestone1 ? '✅ M1' : '🎯 M1', color: latestWeight <= profile.milestone1 ? '#4ade80' : '#f59e0b' }, { val: profile.goal_weight, label: 'goal', color: '#6b7280' }].map((item, i) => <div key={i} style={{ textAlign: 'center' }}><div style={{ fontSize: 26, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.val}</div><div style={{ fontSize: 10, color: item.color, marginTop: 1 }}>{item.label}</div></div>)}
            </div>
            <div style={{ background: '#1f2937', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#93c5fd' }}>🎯 Next: {profile.milestone1}kg — your weight when you ran 10km in June 2025.</div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><div className="card-title" style={{ marginBottom: 0 }}>📋 Session History</div><button className="ft-btn-sm" onClick={() => setShowHistory(!showHistory)}>{showHistory ? 'Show less' : 'Show all'}</button></div>
            {(showHistory ? sessions.filter(s => s.done).slice().reverse() : sessions.filter(s => s.done).slice().reverse().slice(0, 5)).map((s, i) => {
              const def = TRAINING_SESSIONS.find(t => t.type === s.type)
              const ins = s.hr && def ? getHRInsight(s.hr, def.targetHR[0], def.targetHR[1]) : null
              return <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #1f2937' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ fontSize: 16 }}>{def?.icon || '🏋️'}</span><span style={{ fontSize: 13, fontWeight: 700 }}>{def?.label || s.type}</span>{s.is_benchmark && <Pill color="#f59e0b">BENCHMARK</Pill>}</div><span style={{ fontSize: 11, color: '#6b7280' }}>{formatDate(s.session_date)}</span></div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>{s.dist && <Pill color="#60a5fa">📍 {s.dist}km</Pill>}{s.hr && <Pill color="#ef4444">❤️ {s.hr}bpm</Pill>}{s.duration_min && <Pill color="#a855f7">⏱ {s.duration_min}min</Pill>}{s.calories && <Pill color="#f97316">🔥 {s.calories}kcal</Pill>}{s.pace && <Pill color="#f59e0b">🏃 {s.pace}/km</Pill>}{s.speed && <Pill color="#f59e0b">🚀 {s.speed}km/h</Pill>}</div>
                {ins && <div style={{ fontSize: 11, color: ins.type === 'warn' ? '#f97316' : ins.type === 'good' ? '#4ade80' : '#60a5fa' }}>{ins.type === 'warn' ? '⚠️' : ins.type === 'good' ? '✅' : 'ℹ️'} {ins.msg}</div>}
                {s.note && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>"{s.note}"</div>}
              </div>
            })}
            {sessions.filter(s => s.done).length === 0 && <div style={{ textAlign: 'center', color: '#4b5563', padding: 16, fontSize: 12 }}>No sessions logged yet</div>}
          </div>

          <div className="card">
            <div className="card-title">All-Time Stats</div>
            {(() => {
              const done = sessions.filter(s => s.done)
              return [['🚴 Bike', `${done.filter(s => ['bike_easy', 'bike_hard'].includes(s.type)).reduce((a, s) => a + (s.dist || 0), 0).toFixed(1)} km`, '#60a5fa'], ['🏃 Run', `${done.filter(s => ['run_easy', 'run_tempo'].includes(s.type)).reduce((a, s) => a + (s.dist || 0), 0).toFixed(1)} km`, '#4ade80'], ['🔥 Total burned', `${done.reduce((a, s) => a + (s.calories || 0), 0)} kcal`, '#f97316'], ['📅 Sessions', done.length, '#9ca3af']].map(([label, val, color], i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, marginBottom: 6, borderBottom: '1px solid #1f2937' }}><span style={{ fontSize: 13, color: '#9ca3af' }}>{label}</span><span style={{ fontSize: 14, fontWeight: 700, color: color as string }}>{val}</span></div>)
            })()}
          </div>
        </>}

        {tab === 'more' && <>
          <div className="card">
            <div className="card-title">📅 Activity Calendar</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
              {Array.from({ length: 35 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 34 + i); const ds = d.toISOString().split('T')[0]; const s = sessions.find(x => x.session_date === ds); const sel = selectedCalDay === ds; return <div key={i} onClick={() => setSelectedCalDay(sel ? null : ds)} style={{ width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, background: s?.done ? '#14532d' : s?.skipped ? '#7f1d1d' : '#1f2937', border: `2px solid ${sel ? '#60a5fa' : s?.done ? '#4ade80' : s?.skipped ? '#ef4444' : '#374151'}`, color: s?.done ? '#4ade80' : s?.skipped ? '#ef4444' : '#4b5563' }}>{d.getDate()}</div> })}
            </div>
            {selectedCalDay && (() => { const s = sessions.find(x => x.session_date === selectedCalDay); const def = s ? TRAINING_SESSIONS.find(t => t.type === s.type) : null; return <div style={{ background: '#1f2937', borderRadius: 10, padding: 12 }}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{formatDate(selectedCalDay)}</div>{s?.done ? <><div style={{ fontSize: 13, color: '#4ade80' }}>✅ {def?.label || s.type}</div><div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{s.dist && `📍 ${s.dist}km`} {s.hr && `· ❤️ ${s.hr}bpm`} {s.calories && `· 🔥 ${s.calories}kcal`}</div>{s.note && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>"{s.note}"</div>}</> : s?.skipped ? <div style={{ fontSize: 13, color: '#ef4444' }}>✗ Skipped</div> : <div style={{ fontSize: 13, color: '#4b5563' }}>No session logged</div>}</div> })()}
          </div>

          <div className="card">
            <div className="card-title">📏 Body Fat % (Navy Method)</div>
            {currentBF && (() => { const fatKg = Math.round(latestWeight * currentBF / 100 * 10) / 10; const leanKg = Math.round((latestWeight - fatKg) * 10) / 10; const color = currentBF < 14 ? '#4ade80' : currentBF < 18 ? '#60a5fa' : currentBF < 25 ? '#f59e0b' : '#f97316'; return <div style={{ background: color + '18', border: `1px solid ${color}44`, borderRadius: 10, padding: 12, marginBottom: 12 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><div style={{ fontSize: 28, fontWeight: 900, color }}>{currentBF}%</div><div style={{ fontSize: 12, color: '#9ca3af' }}><div>Fat: {fatKg}kg</div><div>Lean: {leanKg}kg</div></div></div></div> })()}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[{ key: 'waist', label: 'Waist (cm)' }, { key: 'neck', label: 'Neck (cm)' }, { key: 'chest', label: 'Chest (cm)' }, { key: 'hips', label: 'Hips (cm)' }].map(f => <div key={f.key} style={{ flex: 1, minWidth: 70 }}><div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3 }}>{f.label}</div><input className="ft-input" type="number" placeholder="0" value={measForm[f.key as keyof typeof measForm]} onChange={e => setMeasForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ padding: '8px 10px' }} /></div>)}
            </div>
            <button className="ft-btn-sm" style={{ marginTop: 10 }} onClick={saveMeasurements}>Save Measurements</button>
          </div>

          <div className="card">
            <div className="card-title">⌚ Polar — Morning Log</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {[{ key: 'nightly', label: 'Nightly Recharge', ph: '72' }, { key: 'hrv', label: 'HRV (ms)', ph: '45' }, { key: 'sleepH', label: 'Sleep hours', ph: '7.5' }].map(f => <div key={f.key} style={{ flex: 1, minWidth: 90 }}><div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3 }}>{f.label}</div><input className="ft-input" type="number" placeholder={f.ph} value={wlForm[f.key as keyof typeof wlForm]} onChange={e => setWlForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ padding: '7px 9px', fontSize: 12 }} /></div>)}
            </div>
            <div style={{ marginBottom: 10 }}><div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3 }}>Leg Recovery</div><select className="ft-input" style={{ fontSize: 12, padding: '7px 9px' }} value={wlForm.legRecovery} onChange={e => setWlForm(p => ({ ...p, legRecovery: e.target.value }))}><option value="">— not tested —</option><option value="ready">✅ Ready</option><option value="partial">🟡 Partial</option><option value="notready">❌ Not recovered</option></select></div>
            <button className="ft-btn-sm" onClick={saveWatchLog}>Save Watch Data</button>
          </div>

          <div className="card">
            <div className="card-title">⚙️ Settings</div>
            {[{ label: 'Current Weight (kg)', key: 'weight' }, { label: 'Goal Weight (kg)', key: 'goal_weight' }, { label: 'Calorie Target', key: 'calorie_target' }, { label: 'Protein Target (g)', key: 'protein_target' }, { label: 'Resting HR', key: 'resting_hr' }, { label: 'Max HR', key: 'max_hr' }].map(({ label, key }) => <div key={key} style={{ marginBottom: 10 }}><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>{label}</div><input className="ft-input" type="number" value={(profile as any)[key] || ''} onChange={e => setProfile(p => ({ ...p, [key]: +e.target.value }))} /></div>)}
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>BMR: ~{calcBMR(profile.weight, profile.height, profile.age)} kcal</div>
            <button className="ft-btn" onClick={saveProfile}>Save Settings</button>
          </div>

          <div className="card">
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>Signed in as {user.email}</div>
            <button className="ft-btn-red" onClick={signOut}>Sign out</button>
          </div>
        </>}

      </div>

      <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: '#111827', borderTop: '1px solid #1f2937', display: 'flex', justifyContent: 'space-around', padding: '8px 0 16px', zIndex: 100 }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ background: 'none', border: 'none', color: tab === t.id ? '#60a5fa' : '#4b5563', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', fontSize: 9, fontWeight: 600, minWidth: 0, padding: '0 4px' }}><span style={{ fontSize: 20 }}>{t.icon}</span>{t.label}</button>)}
      </nav>

      {showLogSession && <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowLogSession(false)}><div style={{ background: '#111827', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxHeight: '88vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}><div style={{ fontSize: 17, fontWeight: 800, marginBottom: 14 }}>Log Session</div><div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>Date</div><input className="ft-input" type="date" value={logForm.sessionDate} onChange={e => setLogForm(p => ({ ...p, sessionDate: e.target.value }))} /></div><div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>Session Type</div><select className="ft-input" value={logForm.type} onChange={e => setLogForm(p => ({ ...p, type: e.target.value }))}>{TRAINING_SESSIONS.map(s => <option key={s.type} value={s.type}>{s.icon} {s.label}</option>)}</select></div>{[{ label: 'Avg HR (bpm)', key: 'hr', ph: '155' }, { label: 'Distance (km)', key: 'dist', ph: '5.2' }, { label: 'Duration (min)', key: 'time', ph: '42' }, { label: 'Calories burned', key: 'cal', ph: 'from Polar' }].map(({ label, key, ph }) => <div key={key} style={{ marginBottom: 10 }}><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>{label}</div><input className="ft-input" type="number" placeholder={ph} value={(logForm as any)[key] || ''} onChange={e => setLogForm(p => ({ ...p, [key]: e.target.value }))} /></div>)}{['run_easy', 'run_tempo', 'recovery_walk'].includes(logForm.type) ? <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>Pace (min:sec per km)</div><input className="ft-input" type="text" placeholder="7:27" value={logForm.pace} onChange={e => setLogForm(p => ({ ...p, pace: e.target.value }))} /></div> : <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>Avg Speed (km/h)</div><input className="ft-input" type="number" placeholder="18.8" value={logForm.speed} onChange={e => setLogForm(p => ({ ...p, speed: e.target.value }))} /></div>}<div style={{ marginBottom: 14 }}><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 3 }}>Note</div><input className="ft-input" placeholder="How did it feel?" value={logForm.note} onChange={e => setLogForm(p => ({ ...p, note: e.target.value }))} /></div><div style={{ display: 'flex', gap: 8 }}><button className="ft-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={logSession} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button><button className="ft-btn-sm" onClick={() => setShowLogSession(false)}>Cancel</button></div></div></div>}

      {showAddFood && <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowAddFood(false)}><div style={{ background: '#111827', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxHeight: '88vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}><div style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Add Food</div><select className="ft-input" style={{ marginBottom: 10 }} value={foodMeal} onChange={e => setFoodMeal(e.target.value)}>{['breakfast', 'lunch', 'dinner', 'snack'].map(m => <option key={m} value={m}>{m}</option>)}</select><input className="ft-input" style={{ marginBottom: 10 }} placeholder="Search food..." value={foodSearch} onChange={e => setFoodSearch(e.target.value)} /><div style={{ maxHeight: 340, overflowY: 'auto' }}>{filteredFoods.map((f, i) => { const g = foodGrams[i] !== undefined ? foodGrams[i] : f.defaultG; const cal = Math.round(f.cal100 * (g / 100)); const prot = Math.round(f.protein100 * (g / 100) * 10) / 10; return <div key={i} style={{ padding: '10px 8px', borderBottom: '1px solid #1f2937' }}><div style={{ marginBottom: 5 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</div><div style={{ fontSize: 10, color: '#4b5563' }}>{f.priceNote} · {f.cal100}kcal/100g</div></div><div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="number" value={foodGrams[i] !== undefined ? foodGrams[i] : f.defaultG} onChange={e => setFoodGrams(p => ({ ...p, [i]: +e.target.value }))} style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#f1f5f9', padding: '6px 8px', fontSize: 12, width: 70, outline: 'none' }} /><span style={{ fontSize: 11, color: '#6b7280' }}>g →</span><span style={{ fontSize: 12, color: '#60a5fa' }}>{cal}kcal</span><span style={{ fontSize: 12, color: '#a855f7' }}>{prot}g</span><button className="ft-btn" style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={() => { addFood(f, g || f.defaultG); setFoodGrams(p => ({ ...p, [i]: f.defaultG })) }}>Add</button></div></div> })}</div><button className="ft-btn-sm" style={{ marginTop: 10, width: '100%', textAlign: 'center' }} onClick={() => { setShowAddFood(false); setFoodSearch(''); setFoodGrams({}) }}>Close</button></div></div>}

      {showAddWeight && <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowAddWeight(false)}><div style={{ background: '#111827', borderRadius: '20px 20px 0 0', padding: 24, width: '100%' }} onClick={e => e.stopPropagation()}><div style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Log Weight</div><input className="ft-input" type="number" step="0.1" placeholder="e.g. 103.5" value={newWeight} onChange={e => setNewWeight(e.target.value)} style={{ marginBottom: 12 }} /><div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>Current: {latestWeight}kg · Goal: {profile.goal_weight}kg · M1: {profile.milestone1}kg</div><div style={{ display: 'flex', gap: 8 }}><button className="ft-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={addWeight}>Save</button><button className="ft-btn-sm" onClick={() => setShowAddWeight(false)}>Cancel</button></div></div></div>}

    </div>
  )
}
