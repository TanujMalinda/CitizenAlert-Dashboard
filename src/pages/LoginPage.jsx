import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email.trim(), password)
      navigate('/')
    } catch (err) {
      setError(
        err.message === 'Access denied — authority accounts only'
          ? err.message
          : err.response?.data?.error?.message ||
            err.response?.data?.detail ||
            'Login failed. Check your credentials.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={handleSubmit}>
        <div className="logo">🛡️</div>
        <h1>CitizenAlert</h1>
        <p className="sub">Authority Dashboard · Sri Lanka</p>

        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="authority@citizenalert.lk"
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        <button className="btn primary" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        {error && <div className="error">{error}</div>}

        <div style={{ textAlign: 'center', marginTop: 16, borderTop: '1px solid #2a3f52', paddingTop: 16 }}>
          <span style={{ color: '#90a4ae', fontSize: 13 }}>New authority? </span>
          <Link to="/register"
            style={{ color: '#4fc3f7', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
            Register here
          </Link>
        </div>
      </form>
    </div>
  )
}
