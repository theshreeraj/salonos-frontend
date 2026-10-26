import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { BOOKING_FEE } from '../../data/salons'
import { useStore } from '../../store/context'
import { dayLabel, rupees, timeLabel } from '../../utils/format'
import { ANY_STYLIST } from '../availability'
import { useApp } from '../context'
import { useBooking } from '../hooks'
import { Sheet, TopBar } from '../ui'

const UPI_APPS = ['Google Pay', 'PhonePe', 'Paytm']
const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank']

// Mock checkout. In production this hands off to the payment gateway (e.g. Razorpay) via the backend.
export default function Payment() {
  const navigate = useNavigate()
  const { bookToken } = useStore()
  const { clearDraft } = useApp()
  const { salon, draft, services, valid } = useBooking()
  const [method, setMethod] = useState('Google Pay')
  const [upiId, setUpiId] = useState('')
  const [card, setCard] = useState('')
  const [bank, setBank] = useState(BANKS[0])
  const [step, setStep] = useState('pick')
  const [booking, setBooking] = useState(null)
  const [failure, setFailure] = useState('')

  const leave = (to) => {
    clearDraft()
    navigate(to, { replace: true })
  }

  // The result dialogs render before the draft check, since a finished booking clears the draft
  if (step === 'done') return <Success salon={salon} booking={booking} onLeave={leave} />
  if (!valid || draft.slot == null || !draft.stylist) return <Navigate to={salon ? `/app/book/${salon.id}/time` : '/app'} replace />

  const ready =
    UPI_APPS.includes(method) ||
    (method === 'UPI ID' && /^[\w.-]{2,}@[a-z]{2,}$/i.test(upiId.trim())) ||
    (method === 'Card' && card.replace(/\s/g, '').length === 16) ||
    method === 'Net banking'

  // The API re-checks the slot (someone may have taken it while this customer was paying) and assigns "any stylist"
  const pay = async () => {
    setStep('processing')
    try {
      const made = await bookToken({
        salonId: salon.id,
        date: draft.date,
        services,
        stylist: draft.stylist,
        method: method === 'Card' || method === 'Net banking' ? method : 'UPI',
        slot: draft.slot,
        anyStylist: draft.stylist === ANY_STYLIST,
      })
      setBooking(made)
      setStep('done')
    } catch (err) {
      if (err.data?.code === 'slot-taken') setStep('taken')
      else {
        setFailure(err.message)
        setStep('failed')
      }
    }
  }

  return (
    <>
      <TopBar title="Select payment method" back={`/app/book/${salon.id}/checkout`} />
      <main className="m-main m-pad">
        <p className="m-muted m-small m-summary-line">
          {salon.name} · {dayLabel(draft.date)}, {timeLabel(draft.slot)}
        </p>

        <div className="m-card m-pay-group" role="radiogroup" aria-label="Payment method">
          <h2 className="m-pay-group-title">UPI</h2>
          {UPI_APPS.map((app) => (
            <PayOption method={method} onPick={setMethod} key={app} id={app} label={app} logo={<span className="m-pay-logo">{app.split(' ')[0]}</span>} />
          ))}
          <PayOption method={method} onPick={setMethod} id="UPI ID" label="Pay with UPI ID">
            <input className="m-input m-pay-input" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@okhdfcbank" aria-label="UPI ID" autoFocus />
          </PayOption>
        </div>

        <div className="m-card m-pay-group">
          <PayOption method={method} onPick={setMethod} id="Card" label="Credit / debit card" logo={<Icon name="card" size={22} />}>
            <input
              className="m-input m-pay-input"
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
              placeholder="Card number"
              aria-label="Card number"
              autoFocus
            />
          </PayOption>
        </div>

        <div className="m-card m-pay-group">
          <PayOption method={method} onPick={setMethod} id="Net banking" label="Net banking" logo={<Icon name="bank" size={22} />}>
            <select className="m-input m-pay-input" value={bank} onChange={(e) => setBank(e.target.value)} aria-label="Bank">
              {BANKS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </PayOption>
        </div>

        <p className="m-muted m-small m-secure">
          <Icon name="lock" size={14} /> Only the {rupees(BOOKING_FEE)} booking fee is charged now. Services are paid at the salon.
        </p>
      </main>
      <div className="m-footer">
        <button type="button" className="m-btn m-btn-primary m-btn-block" disabled={!ready || step === 'processing'} onClick={pay}>
          {step === 'processing' ? 'Processing…' : `Pay ${rupees(BOOKING_FEE)}`}
        </button>
      </div>

      {step === 'processing' && (
        <Sheet center label="Processing payment">
          <span className="m-spinner" />
          <h2 className="m-dialog-title">Confirming payment…</h2>
          <p className="m-muted">Please don't close the app.</p>
        </Sheet>
      )}

      {step === 'failed' && (
        <Sheet center label="Payment failed" onClose={() => setStep('pick')}>
          <span className="m-result-mark is-error">
            <Icon name="x" size={30} strokeWidth={2.4} />
          </span>
          <h2 className="m-dialog-title">Booking didn't go through</h2>
          <p className="m-muted">{failure} You haven't been charged.</p>
          <button type="button" className="m-btn m-btn-primary m-btn-block" onClick={() => setStep('pick')}>
            Try again
          </button>
        </Sheet>
      )}

      {step === 'taken' && (
        <Sheet center label="Slot no longer available" onClose={() => navigate(`/app/book/${salon.id}/time`)}>
          <span className="m-result-mark is-error">
            <Icon name="x" size={30} strokeWidth={2.4} />
          </span>
          <h2 className="m-dialog-title">That slot was just taken</h2>
          <p className="m-muted">You haven't been charged. Please pick another time.</p>
          <button type="button" className="m-btn m-btn-primary m-btn-block" onClick={() => navigate(`/app/book/${salon.id}/time`)}>
            Choose another time
          </button>
        </Sheet>
      )}
    </>
  )
}

function PayOption({ id, label, children, logo, method, onPick }) {
  return (
    <label className={`m-pay-option ${method === id ? 'is-selected' : ''}`}>
      <input type="radio" name="method" checked={method === id} onChange={() => onPick(id)} />
      <span className="m-radio" />
      <span className="m-pay-label">{label}</span>
      {logo}
      {method === id && children}
    </label>
  )
}

function Success({ salon, booking, onLeave }) {
  const requested = booking.status === 'requested'
  return (
    <Sheet center label="Booking result">
      <span className={`m-result-mark ${requested ? 'is-pending' : ''}`}>
        <Icon name={requested ? 'bell' : 'check'} size={30} strokeWidth={2.4} />
      </span>
      <h2 className="m-dialog-title">{requested ? 'Request sent to the salon' : 'Your salon appointment is confirmed!'}</h2>
      <p className="m-muted">
        {salon.name} · {dayLabel(booking.date)} at {timeLabel(booking.slot)} with {booking.stylist}.
        {requested
          ? ` The stylist usually replies within 5 minutes. If they can't take you, your ${rupees(booking.fee)} is refunded.`
          : ' Thank you for your payment. We look forward to seeing you soon.'}
      </p>
      <button type="button" className="m-btn m-btn-primary m-btn-block" onClick={() => onLeave('/app/bookings')}>
        View booking
      </button>
      <button type="button" className="m-btn m-btn-outline m-btn-block" onClick={() => onLeave('/app')}>
        Back to home
      </button>
    </Sheet>
  )
}
