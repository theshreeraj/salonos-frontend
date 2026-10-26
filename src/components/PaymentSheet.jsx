import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { reportError } from '../api'
import { BOOKING_FEE } from '../data/salons'
import { dayLabel, rupees, timeLabel } from '../utils/format'
import Icon from './Icon'

const METHODS = [
  { id: 'UPI', label: 'UPI', hint: 'Google Pay, PhonePe, Paytm, BHIM', icon: 'mobile' },
  { id: 'Card', label: 'Debit / credit card', hint: 'Visa, Mastercard, RuPay', icon: 'card' },
  { id: 'Net banking', label: 'Net banking', hint: 'All major Indian banks', icon: 'bank' },
]

const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank']

// Mock checkout. In production this hands off to the payment gateway (e.g. Razorpay) via the backend.
// onConfirm(method) returns the booking, or null when the time was taken meanwhile
export default function PaymentSheet({ salon, date, slot, services, stylist, onClose, onConfirm }) {
  const navigate = useNavigate()
  const [step, setStep] = useState('pay')
  const [method, setMethod] = useState('UPI')
  const [upiId, setUpiId] = useState('')
  const [card, setCard] = useState('')
  const [bank, setBank] = useState(BANKS[0])
  const [booking, setBooking] = useState(null)

  const servicesTotal = services.reduce((sum, s) => sum + s.price, 0)
  const valid =
    (method === 'UPI' && /^[\w.-]{2,}@[a-z]{2,}$/i.test(upiId.trim())) ||
    (method === 'Card' && card.replace(/\s/g, '').length === 16) ||
    method === 'Net banking'

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && step !== 'processing' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, step])

  const pay = async () => {
    setStep('processing')
    try {
      const result = await onConfirm(method)
      setBooking(result)
      setStep(result ? 'done' : 'taken')
    } catch (err) {
      reportError(err)
      setStep('pay')
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && step !== 'processing' && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        {step !== 'processing' && (
          <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
        )}

        {step === 'pay' && (
          <>
            <p className="eyebrow">Booking fee</p>
            <h2 id="sheet-title" className="sheet-title">
              {salon.confirmMode === 'manual' ? `Pay ${rupees(BOOKING_FEE)} to send your request` : `Pay ${rupees(BOOKING_FEE)} to book ${timeLabel(slot)}`}
            </h2>
            <p className="muted">
              {salon.name} · {dayLabel(date)}, {timeLabel(slot)} · {stylist}
            </p>

            <div className="method-list" role="radiogroup" aria-label="Payment method">
              {METHODS.map((m) => (
                <label key={m.id} className={`method ${method === m.id ? 'is-selected' : ''}`}>
                  <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} />
                  <Icon name={m.icon} size={22} />
                  <span>
                    <strong>{m.label}</strong>
                    <span className="muted small">{m.hint}</span>
                  </span>
                </label>
              ))}
            </div>

            {method === 'UPI' && (
              <label className="field">
                <span>UPI ID</span>
                <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@okhdfcbank" autoFocus />
              </label>
            )}
            {method === 'Card' && (
              <label className="field">
                <span>Card number</span>
                <input
                  inputMode="numeric"
                  value={card}
                  onChange={(e) =>
                    setCard(
                      e.target.value
                        .replace(/\D/g, '')
                        .slice(0, 16)
                        .replace(/(\d{4})(?=\d)/g, '$1 '),
                    )
                  }
                  placeholder="4111 1111 1111 1111"
                  autoFocus
                />
              </label>
            )}
            {method === 'Net banking' && (
              <label className="field">
                <span>Bank</span>
                <select value={bank} onChange={(e) => setBank(e.target.value)}>
                  {BANKS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </label>
            )}

            <dl className="summary">
              <div>
                <dt>Booking fee · pay now</dt>
                <dd>{rupees(BOOKING_FEE)}</dd>
              </div>
              <div className="muted">
                <dt>Services · pay at salon</dt>
                <dd>{servicesTotal ? rupees(servicesTotal) : 'Choose at salon'}</dd>
              </div>
            </dl>

            <button type="button" className="btn btn-primary btn-block" disabled={!valid} onClick={pay}>
              <Icon name="lock" size={18} /> Pay {rupees(BOOKING_FEE)}
            </button>
            <p className="fine-print">Secured payment. Your time is held the moment payment succeeds.</p>
          </>
        )}

        {step === 'processing' && (
          <div className="sheet-center">
            <span className="spinner" />
            <h2 className="sheet-title">Confirming payment…</h2>
            <p className="muted">Don't close this window.</p>
          </div>
        )}

        {step === 'taken' && (
          <div className="sheet-center">
            <span className="success-mark pending-mark">
              <Icon name="calendarX" size={26} />
            </span>
            <h2 id="sheet-title" className="sheet-title">
              {timeLabel(slot)} was just taken
            </h2>
            <p className="muted">You haven't been charged. Please pick another time.</p>
            <div className="sheet-actions">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Choose another time
              </button>
            </div>
          </div>
        )}

        {step === 'done' && booking?.status === 'requested' && (
          <div className="sheet-center">
            <span className="success-mark pending-mark">
              <Icon name="bell" size={26} />
            </span>
            <p className="eyebrow">Request sent</p>
            <h2 id="sheet-title" className="sheet-title">
              Waiting for {salon.name} to confirm {timeLabel(booking.slot)}
            </h2>
            <p className="muted">
              {booking.stylist} usually replies within 5 minutes. If they can't take you, your {rupees(booking.fee)} comes back.
            </p>
            <div className="sheet-actions">
              <button type="button" className="btn btn-outline" onClick={() => navigate('/bookings')}>
                View bookings
              </button>
              <button type="button" className="btn btn-primary" onClick={() => navigate(`/tracker?b=${booking.id}`)}>
                Track request
              </button>
            </div>
          </div>
        )}

        {step === 'done' && booking && booking.status !== 'requested' && (
          <div className="sheet-center">
            <span className="success-mark">
              <Icon name="check" size={28} strokeWidth={2.2} />
            </span>
            <p className="eyebrow">Appointment confirmed</p>
            <div className="token-hero">{timeLabel(booking.slot)}</div>
            <h2 id="sheet-title" className="sheet-title">
              See you at {salon.name}
            </h2>
            <p className="muted">
              {dayLabel(booking.date)} · with {booking.stylist}
            </p>

            <dl className="summary">
              <div>
                <dt>Paid via {booking.payment.method}</dt>
                <dd>{rupees(booking.fee)}</dd>
              </div>
              <div>
                <dt>Due at salon</dt>
                <dd>{booking.servicesTotal ? rupees(booking.servicesTotal) : 'As per services'}</dd>
              </div>
              <div className="muted small">
                <dt>Payment ref</dt>
                <dd>{booking.payment.ref}</dd>
              </div>
            </dl>

            <div className="sheet-actions">
              <button type="button" className="btn btn-outline" onClick={() => navigate('/bookings')}>
                View bookings
              </button>
              <button type="button" className="btn btn-primary" onClick={() => navigate(`/tracker?b=${booking.id}`)}>
                Track live
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
