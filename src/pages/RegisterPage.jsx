import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerAuthority } from '../api'

const DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle',
]

const DEPARTMENTS = [
  'Sri Lanka Police',
  'Ministry of Health',
  'Disaster Management Centre',
  'Sri Lanka Army',
  'Sri Lanka Navy',
  'Sri Lanka Air Force',
  'Municipal Council',
  'National Hospital',
  'Other Government Department',
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', phone_number: '',
    district: 'Colombo', designation: '', department: '', employee_id: '',
  })
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await registerAuthority(form)
      setSuccess(true)
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        'Registration failed. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="login-wrap">
        <div className="login-box" style={{ textAlign: 'center', gap: 16 }}>
          <div style={{ fontSize: 48 }}>⏳</div>
          <h1>Registration Submitted</h1>
          <p className="sub">Your authority account is pending approval</p>
          <p style={{ color: '#90a4ae', fontSize: 14, lineHeight: 1.6 }}>
            A super-admin will review your registration and activate your account.
            You will be able to log in once approved.
          </p>
          <button className="btn primary" onClick={() => navigate('/login')}>
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={handleSubmit}
        style={{ maxWidth: 480, gap: 0 }}>
        <div className="logo">🛡️</div>
        <h1>Authority Registration</h1>
        <p className="sub">CitizenAlert Dashboard · Sri Lanka</p>

        <div style={{ marginTop: 24 }}>
          <p style={{ color: '#4fc3f7', fontSize: 11, fontWeight: 700,
            letterSpacing: 1, marginBottom: 12 }}>PERSONAL DETAILS</p>

          <label>Full Name *</label>
          <input value={form.full_name} onChange={set('full_name')}
            placeholder="Your full name" required />

          <label>Email *</label>
          <input type="email" value={form.email} onChange={set('email')}
            placeholder="official@department.gov.lk" required />

          <label>Password *</label>
          <input type="password" value={form.password} onChange={set('password')}
            placeholder="Min. 6 characters" required />

          <label>Phone Number</label>
          <input value={form.phone_number} onChange={set('phone_number')}
            placeholder="+94 77 000 0000" />

          <label>District</label>
          <select value={form.district} onChange={set('district')}
            style={{ width: '100%', padding: '10px 12px', marginBottom: 20,
              background: '#1a2332', color: '#fff', border: '1px solid #2a3f52',
              borderRadius: 8, fontSize: 14 }}>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div style={{ borderTop: '1px solid #2a3f52', paddingTop: 20 }}>
          <p style={{ color: '#4fc3f7', fontSize: 11, fontWeight: 700,
            letterSpacing: 1, marginBottom: 12 }}>AUTHORITY DETAILS</p>

          <label>Designation *</label>
          <input value={form.designation} onChange={set('designation')}
            placeholder="e.g. Police Officer, Health Inspector" required />

          <label>Department *</label>
          <select value={form.department} onChange={set('department')}
            style={{ width: '100%', padding: '10px 12px', marginBottom: 16,
              background: '#1a2332', color: '#fff', border: '1px solid #2a3f52',
              borderRadius: 8, fontSize: 14 }}
            required>
            <option value="">Select department…</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <label>Employee / Badge ID *</label>
          <input value={form.employee_id} onChange={set('employee_id')}
            placeholder="Official ID number" required />
        </div>

        <div style={{ marginTop: 8, padding: '12px 14px', background: '#1a2332',
          borderRadius: 8, border: '1px solid #2a3f52', marginBottom: 20 }}>
          <p style={{ color: '#90a4ae', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
            Your registration will be reviewed by a super-admin before you can
            log in. This ensures only verified authorities access the dashboard.
          </p>
        </div>

        {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}

        <button className="btn primary" disabled={loading}>
          {loading ? 'Submitting…' : 'Submit Registration'}
        </button>

        <button type="button" className="btn"
          style={{ marginTop: 10, background: 'transparent',
            color: '#4fc3f7', border: 'none', cursor: 'pointer' }}
          onClick={() => navigate('/login')}>
          Already have an account? Login
        </button>
      </form>
    </div>
  )
}
