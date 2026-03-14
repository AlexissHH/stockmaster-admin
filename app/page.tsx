'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!password) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/admin')
        router.refresh()
      } else {
        setError('Contraseña incorrecta.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(ellipse at 50% 0%, #0e1f14 0%, var(--bg) 60%)',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, var(--green) 0%, #16a34a 100%)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16, boxShadow: '0 0 32px rgba(34,197,94,0.3)',
          }}>
            <Lock size={24} color="#000" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
            StockMaster
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>
            Panel de administración
          </p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label>Contraseña de acceso</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoFocus
              />
              {error && (
                <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>{error}</p>
              )}
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px 16px' }}
              onClick={handleLogin}
              disabled={loading || !password}
            >
              {loading
                ? <><Loader2 size={15} className="spin" /> Entrando...</>
                : 'Entrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
