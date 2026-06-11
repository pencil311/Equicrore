'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import '@/styles/auth.css'

const GOOGLE_LOGO = (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.38 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-3.88-13.45-9.41l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
)

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setLoading(false)
      return
    }
    await signIn('credentials', { email, password, redirect: false })
    router.push('/dashboard')
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link href="/" className="auth-brand">
          <img src="/assets/logo.svg" alt="" />
          <b>EQUICRORE</b>
        </Link>
        <h1>Create your account</h1>
        <p className="sub">Start tracking your portfolio</p>
        {error && <div className="auth-err">{error}</div>}
        <button
          className="auth-google"
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
        >
          {GOOGLE_LOGO}
          Continue with Google
        </button>
        <div className="auth-divider">— or sign up with email —</div>
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Full name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Yeshwanth S." required />
          </div>
          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" required minLength={6} />
          </div>
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account →'}
          </button>
        </form>
        <p className="auth-micro">Your portfolio data is stored securely in MongoDB Atlas.</p>
        <p className="auth-foot">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
