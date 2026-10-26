import { useEffect, useRef, useState } from 'react'
import Icon from '../../components/Icon'
import { DECLINE_REASONS, getSalon } from '../../data/salons'
import { useStore } from '../../store/context'
import { acceptsTodayTokens, addDays, dayLabel, hourLabel, isoDate, rupees, tokenLabel, waitLabel } from '../../utils/format'
import { usePortal } from '../context'
import { useTokenRows } from '../hooks'
import { Sheet, SourceBadge } from '../ui'
import { WalkInSheet } from './Queue'

const THUMB = 56

// Phone-first screen for salons without a receptionist: answer booking requests between clients
export default function Solo() {
  const { user } = usePortal()
  const salon = getSalon(user.salonId)
  const { allBookings, getQueue, acceptRequest, callNext, isBookingOpen, setBookingOpen } = useStore()
  const rows = useTokenRows()(salon)
  const queue = getQueue(salon.id)
  const now = useNow()
  const [sheet, setSheet] = useState(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  const mine = allBookings.filter((b) => b.salonId === salon.id)
  const pending = mine.filter((b) => b.status === 'requested').sort((a, b) => a.createdAt - b.createdAt)
  const proposed = mine.filter((b) => b.status === 'proposed')
  const request = pending[0]
  const current = rows.find((r) => r.status === 'in-chair')
  const waiting = rows.filter((r) => r.status === 'waiting')
  const today = isoDate()
  const acceptedToday = mine.filter((b) => b.acceptedAt && isoDate(new Date(b.acceptedAt)) === today).length
  const declinedToday = mine.filter((b) => (b.status === 'declined' || b.status === 'expired') && isoDate(new Date(b.createdAt)) === today).length
  const open = isBookingOpen(salon.id)

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const flash = (message) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3500)
  }

  const accept = async (req) => {
    const booking = await acceptRequest(req.id)
    if (booking) flash(`Accepted · ${req.customerName ?? 'App customer'} is token ${tokenLabel(booking.token)}`)
  }

  return (
    <div className="solo">
      <header className="solo-head">
        <div>
          <p className="eyebrow">{dayLabel(today)}</p>
          <h1 className="p-title">{salon.name}</h1>
        </div>
        <button type="button" className={`solo-online ${open ? 'is-on' : ''}`} onClick={() => setBookingOpen(salon.id, !open)} aria-pressed={open}>
          <span className="switch" />
          {open ? 'Online' : 'Paused'}
        </button>
      </header>

      {!open && (
        <p className="solo-banner">
          <Icon name="info" size={18} /> Online bookings are paused. Customers can still walk in.
        </p>
      )}

      {request ? (
        <RequestCard
          key={request.id}
          request={request}
          salon={salon}
          now={now}
          more={pending.length - 1}
          tokenIfAccepted={getQueue(salon.id, request.date).next}
          onAccept={() => accept(request)}
          onDecline={() => setSheet({ type: 'decline', request })}
          onReschedule={() => setSheet({ type: 'reschedule', request })}
        />
      ) : (
        <div className="solo-idle">
          <span className="live-dot" />
          <div>
            <strong>{open ? 'Waiting for new bookings' : 'Not taking online bookings'}</strong>
            <span className="muted small d-block">
              {open ? 'New requests pop up here. You get 5 minutes to respond.' : 'Switch to Online when you are ready for app bookings.'}
            </span>
          </div>
        </div>
      )}

      <section className="q-now solo-now">
        <div className="q-now-head">
          <span className="live-note">
            <span className="live-dot" /> In the chair
          </span>
          {current && <SourceBadge source={current.source} />}
        </div>
        <div className="solo-now-row">
          <div className="q-now-token">{tokenLabel(queue.serving)}</div>
          <div className="q-now-info">
            <strong>{current?.name ?? 'Chair is free'}</strong>
            <span className="muted">{current ? current.services.join(', ') || 'Ask what they would like' : 'Call the next client when ready'}</span>
            {current?.amount > 0 && <span>{rupees(current.amount)} to collect</span>}
          </div>
        </div>
        <div className="q-now-actions">
          <button type="button" className="btn btn-primary" disabled={!waiting.length} onClick={() => callNext(salon.id)}>
            {waiting.length ? `Done · next ${tokenLabel(waiting[0].token)}` : 'No one waiting'}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setSheet({ type: 'walk-in' })}>
            <Icon name="plus" size={18} /> Walk-in
          </button>
        </div>
      </section>

      <div className="solo-stats">
        <div>
          <strong>{waiting.length}</strong>
          <span>Waiting</span>
        </div>
        <div>
          <strong>{acceptedToday}</strong>
          <span>Accepted</span>
        </div>
        <div>
          <strong>{declinedToday}</strong>
          <span>Declined</span>
        </div>
      </div>

      {proposed.length > 0 && (
        <section className="solo-section">
          <h2>Waiting on customer</h2>
          <ul className="solo-list">
            {proposed.map((b) => (
              <li key={b.id}>
                <Icon name="clock" size={20} />
                <span>
                  <strong>{b.customerName ?? 'App customer'}</strong>
                  <span className="muted small d-block">
                    You suggested {dayLabel(b.proposal.date).split(',')[0]}, {hourLabel(b.proposal.hour)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="solo-section">
        <h2>Up next</h2>
        {waiting.length ? (
          <ul className="solo-list">
            {waiting.slice(0, 6).map((r, i) => (
              <li key={r.token}>
                <span className="q-list-token">{tokenLabel(r.token)}</span>
                <span>
                  <strong>{r.name}</strong>
                  <span className="muted small d-block">{r.services.join(', ') || 'Decide at salon'}</span>
                </span>
                <span className="muted small">{waitLabel((i + 1) * salon.avgMins)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nobody waiting. Accepted bookings and walk-ins join this line.</p>
        )}
      </section>

      {toast && (
        <div className="solo-toast" role="status">
          <Icon name="check" size={18} strokeWidth={2.2} /> {toast}
        </div>
      )}

      {sheet?.type === 'decline' && <DeclineSheet request={sheet.request} onClose={() => setSheet(null)} onDone={flash} />}
      {sheet?.type === 'reschedule' && <RescheduleSheet request={sheet.request} salon={salon} onClose={() => setSheet(null)} onDone={flash} />}
      {sheet?.type === 'walk-in' && <WalkInSheet salon={salon} onClose={() => setSheet(null)} />}
    </div>
  )
}

function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function RequestCard({ request, salon, now, more, tokenIfAccepted, onAccept, onDecline, onReschedule }) {
  const left = Math.max(0, request.respondBy - now)
  const mins = Math.floor(left / 60000)
  const secs = String(Math.floor((left % 60000) / 1000)).padStart(2, '0')
  const queue = useStore().getQueue(salon.id, request.date)
  const isToday = request.date === isoDate()

  return (
    <section className="req-card" aria-label="New booking request">
      <div className="req-top">
        <span className="req-label">
          <Icon name="bell" size={18} /> New booking
          {more > 0 && <span className="req-more">+{more} more</span>}
        </span>
        <span className={`req-timer ${left < 60000 ? 'is-urgent' : ''}`} aria-label="Time left to respond">
          <Icon name="clock" size={16} /> {mins}:{secs}
        </span>
      </div>

      <div className="req-main">
        <div>
          <h2 className="req-name">{request.customerName ?? 'App customer'}</h2>
          <p className="muted">
            {isToday ? 'Today' : dayLabel(request.date)} · {request.stylist === 'Any available' ? 'Any stylist' : `Asked for ${request.stylist}`}
          </p>
        </div>
        <div className="req-token">
          <span>Token</span>
          <strong>{tokenLabel(tokenIfAccepted)}</strong>
          {isToday && <span>{waitLabel((tokenIfAccepted - queue.serving) * salon.avgMins)}</span>}
        </div>
      </div>

      <ul className="req-services">
        {request.services.length ? (
          request.services.map((s) => (
            <li key={s.id}>
              <span>
                {s.name} <span className="muted">· {s.mins} min</span>
              </span>
              <span>{rupees(s.price)}</span>
            </li>
          ))
        ) : (
          <li>
            <span className="muted">Will choose at the salon</span>
          </li>
        )}
        <li className="req-total">
          <span>Collect at salon</span>
          <strong>{request.servicesTotal ? rupees(request.servicesTotal) : '—'}</strong>
        </li>
      </ul>

      {request.note && <p className="req-note">“{request.note}”</p>}

      <SwipeToAccept onAccept={onAccept} />

      <div className="req-actions">
        <button type="button" className="btn btn-outline" onClick={onReschedule}>
          <Icon name="calendar" size={18} /> New time
        </button>
        <button type="button" className="btn req-decline" onClick={onDecline}>
          <Icon name="x" size={18} /> Decline
        </button>
      </div>
    </section>
  )
}

function SwipeToAccept({ onAccept }) {
  const [x, setX] = useState(0)
  const [limit, setLimit] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const progress = limit ? x / limit : 0

  const onPointerDown = (e) => {
    const track = e.currentTarget.parentElement
    setLimit(track.offsetWidth - THUMB - 8)
    startX.current = e.clientX - x
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (dragging) setX(Math.min(Math.max(0, e.clientX - startX.current), limit))
  }
  const onPointerUp = () => {
    setDragging(false)
    if (limit && x >= limit * 0.85) {
      setX(limit)
      onAccept()
    } else {
      setX(0)
    }
  }

  return (
    <div className="swipe" style={{ '--fill': `${x + THUMB + 4}px` }}>
      <span className="swipe-label" style={{ opacity: Math.max(0, 1 - progress * 1.6) }}>
        Swipe to accept
      </span>
      <button
        type="button"
        className={`swipe-thumb ${dragging ? '' : 'is-settling'}`}
        style={{ transform: `translateX(${x}px)` }}
        aria-label="Accept booking. Swipe right, or press Enter."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          setDragging(false)
          setX(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onAccept()
          }
        }}
        onClick={(e) => e.preventDefault()}
      >
        <Icon name="arrowRight" size={24} strokeWidth={2.2} />
      </button>
    </div>
  )
}

function DeclineSheet({ request, onClose, onDone }) {
  const { declineRequest } = useStore()
  const [reason, setReason] = useState('')

  return (
    <Sheet title="Decline this booking?" onClose={onClose}>
      <p className="muted">{request.customerName ?? 'The customer'} gets their ₹20 booking fee back right away.</p>
      <div className="reason-list" role="radiogroup" aria-label="Reason">
        {DECLINE_REASONS.map((r) => (
          <button key={r} type="button" role="radio" aria-checked={reason === r} className={`chip ${reason === r ? 'is-active' : ''}`} onClick={() => setReason(r)}>
            {r}
          </button>
        ))}
      </div>
      <div className="p-form-foot">
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Keep it
        </button>
        <button
          type="button"
          className="btn req-decline"
          disabled={!reason}
          onClick={() => {
            declineRequest(request.id, reason)
            onDone('Declined · ₹20 refunded to the customer')
            onClose()
          }}
        >
          Decline booking
        </button>
      </div>
    </Sheet>
  )
}

function RescheduleSheet({ request, salon, onClose, onDone }) {
  const { proposeTime } = useStore()
  const today = isoDate()
  const nowHour = new Date().getHours()
  const [open, close] = salon.hours
  const todayHours = acceptsTodayTokens(salon.hours) ? range(Math.max(open, nowHour + 1), close) : []
  const days = [
    ...(todayHours.length ? [{ date: today, hours: todayHours }] : []),
    { date: addDays(today, 1), hours: range(open, close) },
    { date: addDays(today, 2), hours: range(open, close) },
  ]
  const [date, setDate] = useState(days[0].date)
  const [hour, setHour] = useState(null)
  const hours = days.find((d) => d.date === date).hours

  return (
    <Sheet title="Suggest another time" onClose={onClose}>
      <p className="muted">{request.customerName ?? 'The customer'} can accept the new time or cancel for a full refund.</p>
      <div className="field">
        <span>Day</span>
        <div className="chips">
          {days.map((d) => (
            <button
              key={d.date}
              type="button"
              className={`chip ${date === d.date ? 'is-active' : ''}`}
              onClick={() => {
                setDate(d.date)
                setHour(null)
              }}
            >
              {dayLabel(d.date)}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>Arrive by</span>
        <div className="hour-grid">
          {hours.map((h) => (
            <button key={h} type="button" className={`chip ${hour === h ? 'is-active' : ''}`} onClick={() => setHour(h)}>
              {hourLabel(h)}
            </button>
          ))}
        </div>
      </div>
      <div className="p-form-foot">
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={hour == null}
          onClick={() => {
            proposeTime(request.id, { date, hour })
            onDone(`New time sent · ${dayLabel(date).split(',')[0]}, ${hourLabel(hour)}`)
            onClose()
          }}
        >
          Send new time
        </button>
      </div>
    </Sheet>
  )
}

const range = (from, to) => Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i)
