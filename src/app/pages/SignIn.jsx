import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { post } from '../../api'
import Icon from '../../components/Icon'
import { PHOTOS } from '../../data/salons'
import { useApp } from '../context'

const RESEND_SECS = 30
const masked = (phone) => `+91 ${phone.slice(0, 2)}••••••${phone.slice(-2)}`

// Phone + one-time code. In development the API returns the code (devCode) since no SMS is sent yet.
export default function SignIn() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { user, signIn, setName } = useApp()
  const next = state?.next ?? '/app'
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [devCode, setDevCode] = useState(null)

  if (user && step === 'phone') return <Navigate to={next} replace />

  const requestCode = async () => {
    const res = await post('/auth/otp', { phone })
    setDevCode(res.devCode ?? null)
  }

  if (step === 'phone') {
    return (
      <PhoneStep
        phone={phone}
        setPhone={setPhone}
        reason={state?.reason}
        onBack={() => navigate(-1)}
        onSubmit={async () => {
          await requestCode()
          setStep('otp')
        }}
      />
    )
  }
  if (step === 'otp') {
    return (
      <OtpStep
        phone={phone}
        devCode={devCode}
        onResend={requestCode}
        onBack={() => setStep('phone')}
        onVerify={async (code) => {
          const { token, customer } = await post('/auth/verify', { phone, code })
          signIn(token, customer)
          // First visit: ask for a name before sending them on
          if (customer.name) navigate(next, { replace: true })
          else setStep('name')
        }}
      />
    )
  }
  return (
    <NameStep
      onSubmit={async (name) => {
        await setName(name)
        navigate(next, { replace: true })
      }}
    />
  )
}

// Runs an async submit, keeping a busy flag and the server's error message
function useSubmit() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, setError, run }
}

function PhoneStep({ phone, setPhone, reason, onBack, onSubmit }) {
  const { busy, error, run } = useSubmit()
  const valid = /^[6-9]\d{9}$/.test(phone)
  return (
    <main className="m-signin" style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.05) 25%, rgba(0,0,0,.92) 70%), url(${PHOTOS.shave})` }}>
      <button type="button" className="m-icon-btn m-signin-back" onClick={onBack} aria-label="Back">
        <Icon name="chevronLeft" size={24} />
      </button>
      <form
        className="m-signin-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid && !busy) run(onSubmit)
        }}
      >
        {reason === 'book' && <p className="m-signin-note">Sign in to confirm your appointment. Your selection is saved.</p>}
        <h1>Book your perfect look in minutes!</h1>
        <label className="m-phone-input">
          <span>+91</span>
          <input
            inputMode="numeric"
            autoComplete="tel-national"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="Enter your mobile number"
            aria-label="Mobile number"
            autoFocus
          />
        </label>
        {error && <p className="m-signin-error">{error}</p>}
        <button type="submit" className="m-btn m-btn-primary m-btn-block" disabled={!valid || busy}>
          {busy ? 'Sending code…' : 'Continue'}
        </button>
        <p className="m-signin-fine">We'll text you a 4-digit code to verify your number.</p>
      </form>
    </main>
  )
}

function OtpStep({ phone, devCode, onResend, onBack, onVerify }) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const { busy, error, setError, run } = useSubmit()
  const [wait, setWait] = useState(RESEND_SECS)
  const refs = useRef([])
  const entered = digits.join('')

  useEffect(() => {
    if (wait <= 0) return undefined
    const t = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const setDigit = (i, value) => {
    const chars = value.replace(/\D/g, '').split('')
    if (!chars.length) {
      setDigits((d) => d.map((x, j) => (j === i ? '' : x)))
      return
    }
    // Typing or pasting fills from this box onwards
    const nextDigits = [...digits]
    chars.slice(0, 4 - i).forEach((c, k) => (nextDigits[i + k] = c))
    setDigits(nextDigits)
    setError('')
    refs.current[Math.min(i + chars.length, 3)]?.focus()
  }

  const verify = (e) => {
    e.preventDefault()
    if (!busy) run(() => onVerify(entered))
  }

  return (
    <>
      <main className="m-main m-pad m-verify">
        <button type="button" className="m-icon-btn m-icon-btn-plain" onClick={onBack} aria-label="Change number">
          <Icon name="chevronLeft" size={24} />
        </button>
        <h1>Verify your identity</h1>
        <p className="m-muted">
          We've sent a 4-digit code to {masked(phone)}.
          <br />
          Please enter it below.
        </p>
        <form id="otp" className="m-otp" onSubmit={verify}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              className={error ? 'is-error' : ''}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => e.key === 'Backspace' && !d && i > 0 && refs.current[i - 1]?.focus()}
              aria-label={`Digit ${i + 1}`}
              autoFocus={i === 0}
            />
          ))}
        </form>
        {error && <p className="m-error">{error}</p>}
        <p className="m-muted m-small">
          Didn't receive a code?{' '}
          {wait > 0 ? (
            <span>Resend in {wait}s</span>
          ) : (
            <button
              type="button"
              className="m-link"
              onClick={() =>
                run(async () => {
                  await onResend()
                  setDigits(['', '', '', ''])
                  setWait(RESEND_SECS)
                  refs.current[0]?.focus()
                })
              }
            >
              Resend
            </button>
          )}
        </p>
        {devCode && (
          <p className="m-demo-code">
            Demo code: <strong>{devCode}</strong>
          </p>
        )}
      </main>
      <div className="m-footer">
        <button type="submit" form="otp" className="m-btn m-btn-primary m-btn-block" disabled={entered.length < 4 || busy}>
          {busy ? 'Checking…' : 'Continue'}
        </button>
      </div>
    </>
  )
}

function NameStep({ onSubmit }) {
  const [name, setName] = useState('')
  const { busy, error, run } = useSubmit()
  const valid = name.trim().length >= 2
  return (
    <>
      <main className="m-main m-pad m-verify">
        <h1>What's your name?</h1>
        <p className="m-muted">The salon sees this with your booking.</p>
        <form
          id="name"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid && !busy) run(() => onSubmit(name.trim()))
          }}
        >
          <input className="m-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" aria-label="Full name" autoFocus />
        </form>
        {error && <p className="m-error">{error}</p>}
      </main>
      <div className="m-footer">
        <button type="submit" form="name" className="m-btn m-btn-primary m-btn-block" disabled={!valid || busy}>
          Continue
        </button>
      </div>
    </>
  )
}
