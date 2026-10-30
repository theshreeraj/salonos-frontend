import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { PHOTOS } from '../data/salons'
import { usePortal } from './context'
import { DEMO, ROLES, ROLE_ORDER } from './data'
import { homeFor } from './hooks'
import './portal.css'

export default function Login() {
  const { ready, user, login } = usePortal()
  const navigate = useNavigate()
  const [role, setRole] = useState('frontdesk')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={homeFor(user)} replace />
  if (!ready) return null

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const result = await login({ identifier, password, role })
    setBusy(false)
    if (result.error) setError(result.error)
    else navigate(homeFor(result.user), { replace: true })
  }

  const fillDemo = (email) => {
    setIdentifier(email)
    setPassword(DEMO.password)
    setError('')
  }

  return (
    <div className="login">
      <div className="login-form-side">
        <div className="login-top">
          <Link to="/" className="logo" aria-label="SalonOS home">
            <span className="logo-mark">
              <Icon name="scissors" size={18} strokeWidth={2} />
            </span>
            <span className="logo-word">SalonOS</span>
            <span className="p-biz-tag">Business</span>
          </Link>
          <Link to="/" className="login-back">
            Book a salon instead <Icon name="arrowRight" size={16} />
          </Link>
        </div>

        <form className="login-form" onSubmit={submit}>
          <p className="eyebrow">Salon portal</p>
          <h1 className="display-sm">Sign in</h1>

          <fieldset className="role-picker">
            <legend>Sign in as</legend>
            {ROLE_ORDER.map((r) => (
              <label key={r} className={`role-option ${role === r ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={role === r}
                  onChange={() => {
                    setRole(r)
                    setError('')
                  }}
                />
                <strong>{ROLES[r].label}</strong>
                <span>{ROLES[r].blurb}</span>
              </label>
            ))}
          </fieldset>

          <label className="field">
            <span>Email or mobile number</span>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@salon.com"
              autoComplete="username"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <div className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button type="button" className="text-btn" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {error && (
            <p className="form-error" role="alert">
              <Icon name="info" size={16} /> {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Signing in…' : `Sign in as ${ROLES[role].label}`}
          </button>

          {DEMO && (
            <div className="demo-hint">
              <span className="demo-hint-title">
                <Icon name="info" size={16} /> Demo {ROLES[role].label.toLowerCase()} · password <code>{DEMO.password}</code>
              </span>
              {(DEMO.accounts[role] ?? []).map((d) => (
                <div key={d.email} className="demo-row">
                  <span>
                    <code>{d.email}</code>
                    <span className="muted small d-block">{d.note}</span>
                  </span>
                  <button type="button" className="btn btn-outline btn-xs" onClick={() => fillDemo(d.email)}>
                    Fill in
                  </button>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>

      <div className="login-media">
        <img src={PHOTOS.interiorNoir} alt="" />
        <div className="float-card login-card">
          <div>
            <span className="queue-label">Mirror &amp; Mane · Now serving</span>
            <span className="queue-value">#22</span>
          </div>
          <div>
            <span className="queue-label">Online · Walk-in</span>
            <strong>14 · 9</strong>
          </div>
        </div>
        <p className="login-quote">One queue for app bookings and walk-ins, from the front desk to the district office.</p>
      </div>
    </div>
  )
}
