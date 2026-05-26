'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: 'Alan' } },
      })
      if (error) {
        setMessage(error.message)
      } else {
        setMessage('Check your email for a confirmation link.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage(error.message)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <div style={{
      background: '#0a0e1a', minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚡</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff' }}>FitTrack</div>
          <div style={{ fontSize: 13, color: '#60a5fa', marginTop: 4 }}>104kg → 83kg · Sprint Triathlon</div>
        </div>

        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 20, padding: 28 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9', marginBottom: 20 }}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Email</div>
              <input className="ft-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" required />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Password</div>
              <input className="ft-input" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required minLength={6} />
            </div>

            {message && (
              <div style={{
                background: message.includes('Check') ? '#14532d22' : '#7f1d1d22',
                border: `1px solid ${message.includes('Check') ? '#4ade8044' : '#ef444444'}`,
                borderRadius: 10, padding: '10px 14px', fontSize: 13,
                color: message.includes('Check') ? '#4ade80' : '#fca5a5',
                marginBottom: 16,
              }}>{message}</div>
            )}

            <button type="submit" className="ft-btn"
              style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign in →' : 'Create account →'}
            </button>
          </form>

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
            {mode === 'login' ? (
              <>No account? <button onClick={() => setMode('signup')}
                style={{ color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer' }}>Sign up</button></>
            ) : (
              <>Already have one? <button onClick={() => setMode('login')}
                style={{ color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer' }}>Sign in</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
