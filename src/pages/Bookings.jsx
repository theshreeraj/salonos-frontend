import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { getSalon } from '../data/salons'
import { useStore } from '../store/context'
import { STATUS_LABEL, bookingStatus, isActive } from '../store/queue'
import { dayLabel, directionsUrl, hourLabel, rupees, timeLabel, tokenLabel } from '../utils/format'

const TABS = [
  { id: 'upcoming', label: 'Upcoming', match: isActive },
  { id: 'completed', label: 'Completed', match: (s) => s === 'completed' },
  { id: 'cancelled', label: 'Cancelled', match: (s) => s === 'cancelled' || s === 'declined' },
]

export default function Bookings() {
  const { bookings, getQueue, cancelBooking } = useStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState('upcoming')

  const rows = bookings.map((b) => ({ ...b, state: bookingStatus(b, getQueue(b.salonId, b.date)) }))
  const current = TABS.find((t) => t.id === tab)
  const list = rows.filter((b) => current.match(b.state))

  const cancel = (b) => {
    const what = b.token ? `token ${tokenLabel(b.token)}` : 'your request'
    const refund = b.state === 'requested' ? ' Your booking fee will be refunded.' : ' Your place in the queue will be released.'
    if (window.confirm(`Cancel ${what} at ${getSalon(b.salonId).name}?${refund}`)) {
      cancelBooking(b.id)
    }
  }

  return (
    <div className="container page-top">
      <p className="eyebrow">My bookings</p>
      <h1 className="display-sm">Bookings</h1>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
            <span className="count">{rows.filter((b) => t.match(b.state)).length}</span>
          </button>
        ))}
      </div>

      {list.length ? (
        <ul className="booking-list">
          {list.map((b) => {
            const salon = getSalon(b.salonId)
            return (
              <li key={b.id} className={`booking-row state-${b.state}`}>
                <div className="booking-token">
                  <span className="queue-label">Token</span>
                  <span className="booking-token-num">{b.token ? tokenLabel(b.token) : '—'}</span>
                </div>

                <img className="booking-thumb" src={salon.photos[0]} alt="" />

                <div className="booking-info">
                  <div className="booking-title">
                    <Link to={`/salon/${salon.id}`}>{salon.name}</Link>
                    <span className={`status status-${b.state}`}>{STATUS_LABEL[b.state]}</span>
                  </div>
                  <p className="muted small">
                    <Icon name="calendar" size={15} /> {dayLabel(b.date)}
                    {b.slot != null && `, ${timeLabel(b.slot)}`}
            {b.arriveAt != null && `, arrive by ${hourLabel(b.arriveAt)}`} · {salon.area} · {b.stylist}
                  </p>
                  <p className="small">{b.services.length ? b.services.map((s) => s.name).join(', ') : 'Services to be chosen at salon'}</p>
                  <p className="booking-pay small">
                    <span>
                      <Icon name="check" size={14} strokeWidth={2.2} /> {rupees(b.fee)} booking fee {b.refunded ? 'refunded' : 'paid'}
                    </span>
                    {b.declineReason && <span className="muted">Salon: {b.declineReason}</span>}
                    {b.status === 'expired' && <span className="muted">The salon didn't respond in time</span>}
                    {b.state !== 'cancelled' && b.state !== 'declined' && (
                      <span className="muted">
                        {b.servicesTotal ? `${rupees(b.servicesTotal)} ${b.state === 'completed' ? 'paid at salon' : 'due at salon'}` : 'Pay at salon'}
                      </span>
                    )}
                  </p>
                </div>

                <div className="booking-actions">
                  {isActive(b.state) ? (
                    <>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/tracker?b=${b.id}`)}>
                        {b.state === 'proposed' ? 'Review new time' : b.state === 'requested' ? 'View request' : 'Track live'}
                      </button>
                      <a href={directionsUrl(salon)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                        Directions
                      </a>
                      {b.state !== 'your-turn' && b.state !== 'proposed' && (
                        <button type="button" className="text-btn" onClick={() => cancel(b)}>
                          Cancel token
                        </button>
                      )}
                    </>
                  ) : (
                    <Link to={`/salon/${salon.id}?book=1`} className="btn btn-outline btn-sm">
                      Book again
                    </Link>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="empty">
          <span className="empty-icon">
            <Icon name="ticket" size={28} />
          </span>
          <h3>No {current.label.toLowerCase()} bookings</h3>
          <p className="muted">{tab === 'upcoming' ? 'Tokens you book will show up here.' : 'Nothing here yet.'}</p>
          {tab === 'upcoming' && (
            <Link to="/" className="btn btn-primary">
              Find a salon
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
