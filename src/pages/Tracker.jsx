import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { getSalon } from '../data/salons'
import { useStore } from '../store/context'
import { STATUS_LABEL, bookingStatus, isActive } from '../store/queue'
import { dayLabel, directionsUrl, hourLabel, hoursLabel, isOpenNow, rupees, timeLabel, tokenLabel, waitLabel } from '../utils/format'

const ORDER = { 'your-turn': 0, 'in-queue': 1, proposed: 2, requested: 3, scheduled: 4 }
const PENDING = ['requested', 'proposed']
const ALERT_AT = 2

export default function Tracker() {
  const { bookings, getQueue } = useStore()
  const [params, setParams] = useSearchParams()

  const active = bookings
    .map((b) => ({ ...b, queue: getQueue(b.salonId, b.date) }))
    .map((b) => ({ ...b, state: bookingStatus(b, b.queue) }))
    .filter((b) => isActive(b.state))
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.date.localeCompare(b.date))

  const current = active.find((b) => b.id === params.get('b')) ?? active[0]

  if (!current) {
    return (
      <div className="container page-top">
        <p className="eyebrow">Live tracker</p>
        <h1 className="display-sm">Your place in line</h1>
        <div className="empty">
          <span className="empty-icon">
            <Icon name="ticket" size={28} />
          </span>
          <h3>No active tokens</h3>
          <p className="muted">Book a token at a salon and you'll see the live queue here.</p>
          <Link to="/" className="btn btn-primary">
            Find a salon
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container page-top">
      <p className="eyebrow">Live tracker</p>
      <h1 className="display-sm">Your place in line</h1>

      {active.length > 1 && (
        <div className="chips tracker-picker">
          {active.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`chip ${b.id === current.id ? 'is-active' : ''}`}
              onClick={() => setParams({ b: b.id }, { replace: true })}
            >
              {b.token ? tokenLabel(b.token) : 'Request'} · {getSalon(b.salonId).name}
            </button>
          ))}
        </div>
      )}

      {PENDING.includes(current.state) ? <PendingView key={current.id} booking={current} /> : <TrackerView key={current.id} booking={current} />}
    </div>
  )
}

function TrackerView({ booking }) {
  const salon = getSalon(booking.salonId)
  const { queue, state } = booking
  const ahead = Math.max(0, booking.token - queue.serving - 1)
  const wait = (booking.token - queue.serving) * salon.avgMins
  const [alerts, setAlerts] = useState(false)
  const notified = useRef(false)

  useEffect(() => {
    if (!alerts || notified.current || state !== 'in-queue' || ahead > ALERT_AT) return
    notified.current = true
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Almost your turn at ${salon.name}`, {
        body: `${ahead === 0 ? 'You are next' : `${ahead} ahead of you`} · token ${tokenLabel(booking.token)}`,
      })
    }
  }, [alerts, ahead, state, salon.name, booking.token])

  const toggleAlerts = async () => {
    if (!alerts && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    setAlerts((v) => !v)
  }

  // Tokens between "now serving" and yours, capped so long queues stay readable
  const span = booking.token - queue.serving
  const dots = state === 'in-queue' ? Array.from({ length: Math.min(span + 1, 9) }, (_, i) => i) : []

  const steps = [
    { label: 'Token booked', done: true, note: new Date(booking.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) },
    { label: `Booking fee paid · ${rupees(booking.fee)}`, done: true, note: booking.payment.method },
    { label: 'In queue', done: state !== 'scheduled', current: state === 'in-queue' },
    { label: 'Your turn', done: false, current: state === 'your-turn' },
    { label: 'Service & pay at salon', done: false },
  ]

  return (
    <div className="tracker-grid">
      <section className={`tracker-panel state-${state}`}>
        <div className="tracker-top">
          <span className="live-note">
            <span className="live-dot" /> {state === 'scheduled' ? 'Queue not started' : isOpenNow(salon.hours) ? 'Live' : 'Salon closed'}
          </span>
          <span className={`status status-${state}`}>{STATUS_LABEL[state]}</span>
        </div>

        {state === 'scheduled' ? (
          <div className="tracker-numbers">
            <div>
              <span className="queue-label">Your token</span>
              <span className="tracker-big accent">{tokenLabel(booking.token)}</span>
            </div>
            <p className="tracker-message">
              Booked for {dayLabel(booking.date)}. The queue opens at {hoursLabel(salon.hours).split(' –')[0]} — check back then for live updates.
            </p>
          </div>
        ) : (
          <>
            <div className="tracker-numbers">
              <div>
                <span className="queue-label">Now serving</span>
                <span className="tracker-big">{tokenLabel(queue.serving)}</span>
              </div>
              <div>
                <span className="queue-label">Your token</span>
                <span className="tracker-big accent">{tokenLabel(booking.token)}</span>
              </div>
            </div>

            {state === 'your-turn' ? (
              <p className="tracker-message strong">It's your turn — please head to the front desk at {salon.name}.</p>
            ) : (
              <>
                <div className="queue-dots" aria-hidden="true">
                  {dots.map((i) => {
                    const isYou = i === dots.length - 1
                    return (
                      <span key={i} className={`qdot ${i === 0 ? 'is-serving' : ''} ${isYou ? 'is-you' : ''}`}>
                        {isYou ? 'You' : i === 0 ? tokenLabel(queue.serving) : ''}
                      </span>
                    )
                  })}
                </div>
                <p className="tracker-message">
                  <strong>{ahead === 0 ? "You're next." : `${ahead} ${ahead === 1 ? 'person' : 'people'} ahead of you.`}</strong> Estimated wait{' '}
                  {waitLabel(wait)}.{ahead <= ALERT_AT && ' Time to head over.'}
                </p>
              </>
            )}

            <button type="button" className={`alert-toggle ${alerts ? 'is-on' : ''}`} onClick={toggleAlerts} aria-pressed={alerts}>
              <Icon name="bell" size={20} />
              <span>
                <strong>Alert me when I'm {ALERT_AT} away</strong>
                <span className="muted small">{alerts ? 'On — keep this tab open' : 'Off'}</span>
              </span>
              <span className="switch" />
            </button>
          </>
        )}
      </section>

      <aside className="tracker-side">
        <BookingSummary booking={booking} salon={salon} />

        <ol className="timeline">
          {steps.map((s) => (
            <li key={s.label} className={`${s.done ? 'is-done' : ''} ${s.current ? 'is-current' : ''}`}>
              <span className="timeline-dot">{s.done && <Icon name="check" size={12} strokeWidth={2.5} />}</span>
              <span>
                {s.label}
                {s.note && <span className="muted small"> · {s.note}</span>}
              </span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  )
}

function BookingSummary({ booking, salon }) {
  return (
    <>
      <div className="tracker-salon">
        <img src={salon.photos[0]} alt="" />
        <div>
          <Link to={`/salon/${salon.id}`} className="tracker-salon-name">
            {salon.name}
          </Link>
          <span className="muted small">{salon.address}</span>
        </div>
        <a href={directionsUrl(salon)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
          <Icon name="navigation" size={16} /> Directions
        </a>
      </div>

      <dl className="summary">
        <div>
          <dt>Date</dt>
          <dd>
            {dayLabel(booking.date)}
            {booking.slot != null && `, ${timeLabel(booking.slot)}`}
            {booking.arriveAt != null && `, arrive by ${hourLabel(booking.arriveAt)}`}
          </dd>
        </div>
        <div>
          <dt>Stylist</dt>
          <dd>{booking.stylist}</dd>
        </div>
        <div>
          <dt>Services</dt>
          <dd>{booking.services.length ? booking.services.map((s) => s.name).join(', ') : 'Choose at salon'}</dd>
        </div>
        <div>
          <dt>Booking fee</dt>
          <dd>{rupees(booking.fee)} paid</dd>
        </div>
        <div>
          <dt>Due at salon</dt>
          <dd>{booking.servicesTotal ? rupees(booking.servicesTotal) : 'As per services'}</dd>
        </div>
      </dl>
    </>
  )
}

// Self-managed salons: the request is waiting on the stylist, or the stylist suggested another time
function PendingView({ booking }) {
  const salon = getSalon(booking.salonId)
  const { respondToProposal, cancelBooking } = useStore()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const left = Math.max(0, (booking.respondBy ?? now) - now)

  return (
    <div className="tracker-grid">
      <section className="tracker-panel state-pending">
        <div className="tracker-top">
          <span className="live-note">
            <span className="live-dot" /> {booking.state === 'requested' ? 'Waiting for the salon' : 'Salon replied'}
          </span>
          <span className={`status status-${booking.state}`}>{STATUS_LABEL[booking.state]}</span>
        </div>

        {booking.state === 'requested' ? (
          <>
            <div className="tracker-numbers">
              <div>
                <span className="queue-label">Stylist replies within</span>
                <span className="tracker-big">
                  {Math.floor(left / 60000)}:{String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}
                </span>
              </div>
            </div>
            <p className="tracker-message">
              {salon.name} has no receptionist, so the stylist confirms bookings between clients. You'll get your token number the moment they accept. If they
              can't take you, your {rupees(booking.fee)} comes straight back.
            </p>
            <button type="button" className="text-btn" onClick={() => cancelBooking(booking.id)}>
              Cancel request and get a refund
            </button>
          </>
        ) : (
          <>
            <div className="tracker-numbers">
              <div>
                <span className="queue-label">Suggested time</span>
                <span className="tracker-big proposal-big">
                  {dayLabel(booking.proposal.date).split(',')[0]}, {hourLabel(booking.proposal.hour)}
                </span>
              </div>
            </div>
            <p className="tracker-message">
              {salon.name} can't take you at the original time. Accept the new time to get your token, or decline for a full {rupees(booking.fee)} refund.
            </p>
            <div className="sheet-actions proposal-actions">
              <button type="button" className="btn btn-outline" onClick={() => respondToProposal(booking.id, false)}>
                Decline &amp; refund
              </button>
              <button type="button" className="btn btn-primary" onClick={() => respondToProposal(booking.id, true)}>
                Accept new time
              </button>
            </div>
          </>
        )}
      </section>

      <aside className="tracker-side">
        <BookingSummary booking={booking} salon={salon} />
      </aside>
    </div>
  )
}
