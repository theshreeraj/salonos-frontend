import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BOOKING_FEE, getSalon } from '../../data/salons'
import { useStore } from '../../store/context'
import { STATUS_LABEL, bookingStatus, isActive } from '../../store/queue'
import { dayLabel, directionsUrl, hourLabel, rupees, shortDate, timeLabel, tokenLabel } from '../../utils/format'
import { TabScreen } from '../AppLayout'
import { Sheet } from '../ui'

const TABS = [
  { id: 'upcoming', label: 'Upcoming', test: isActive },
  { id: 'completed', label: 'Completed', test: (s) => s === 'completed' },
  { id: 'cancelled', label: 'Cancelled', test: (s) => s === 'cancelled' || s === 'declined' },
]

export default function Bookings() {
  const { bookings, getQueue, cancelBooking, respondToProposal } = useStore()
  const [tab, setTab] = useState('upcoming')
  const [cancelling, setCancelling] = useState(null)
  const [receipt, setReceipt] = useState(null)

  const mine = bookings.map((b) => ({ ...b, state: bookingStatus(b, getQueue(b.salonId, b.date)) }))
  const shown = mine
    .filter((b) => TABS.find((t) => t.id === tab).test(b.state))
    .sort((a, b) => (tab === 'upcoming' ? 1 : -1) * (`${a.date}${String(a.slot ?? 0).padStart(4, '0')}` < `${b.date}${String(b.slot ?? 0).padStart(4, '0')}` ? -1 : 1))

  return (
    <TabScreen>
      <header className="m-topbar">
        <h1>Bookings</h1>
      </header>
      <div className="m-pad">
        <div className="m-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <div className="m-empty">
            <strong>No {tab} bookings</strong>
            {tab === 'upcoming' && (
              <Link to="/app" className="m-btn m-btn-primary m-btn-sm">
                Find a salon
              </Link>
            )}
          </div>
        ) : (
          <ul className="m-stack">
            {shown.map((b) => {
              const salon = getSalon(b.salonId)
              const upcoming = isActive(b.state)
              return (
                <li key={b.id} className="m-card m-booking">
                  <div className="m-row-between">
                    <strong className="m-small">
                      {shortDate(b.date)} · {b.slot != null ? timeLabel(b.slot) : b.arriveAt != null ? hourLabel(b.arriveAt) : 'Queue token'}
                    </strong>
                    <span className={`m-status is-${b.state}`}>{STATUS_LABEL[b.state]}</span>
                  </div>
                  <div className="m-booking-body">
                    <img src={salon.photos[0].replace('w=1200', 'w=300')} alt="" />
                    <div>
                      <Link to={`/app/salon/${salon.id}`}>
                        <strong>{salon.name}</strong>
                      </Link>
                      <span className="m-muted m-small">
                        {salon.area}, {salon.city}
                      </span>
                      <span className="m-muted m-small">Services: {b.services.map((s) => s.name).join(', ')}</span>
                      <span className="m-muted m-small">
                        With {b.stylist}
                        {b.token != null && ` · Token ${tokenLabel(b.token)}`}
                      </span>
                    </div>
                  </div>

                  {b.state === 'proposed' && (
                    <div className="m-note">
                      The salon suggested {dayLabel(b.proposal.date)} at {hourLabel(b.proposal.hour)} instead.
                      <div className="m-actions">
                        <button type="button" className="m-btn m-btn-outline m-btn-sm" onClick={() => respondToProposal(b.id, false)}>
                          Decline · refund
                        </button>
                        <button type="button" className="m-btn m-btn-primary m-btn-sm" onClick={() => respondToProposal(b.id, true)}>
                          Accept
                        </button>
                      </div>
                    </div>
                  )}
                  {b.state === 'declined' && b.declineReason && <p className="m-muted m-small">Declined: {b.declineReason}. {rupees(b.fee)} refunded.</p>}

                  <div className="m-actions">
                    {upcoming ? (
                      <button type="button" className="m-btn m-btn-outline" onClick={() => setCancelling(b)}>
                        Cancel booking
                      </button>
                    ) : (
                      <a className="m-btn m-btn-outline" href={directionsUrl(salon)} target="_blank" rel="noreferrer">
                        Directions
                      </a>
                    )}
                    <button type="button" className="m-btn m-btn-primary" onClick={() => setReceipt(b)}>
                      View receipt
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {cancelling && (
        <Sheet center label="Cancel booking" onClose={() => setCancelling(null)}>
          <h2 className="m-dialog-title">Cancel this booking?</h2>
          <p className="m-muted">
            {cancelling.status === 'requested'
              ? `The salon hasn't confirmed yet, so your ${rupees(cancelling.fee)} booking fee will be refunded.`
              : `Your slot will be released. The ${rupees(BOOKING_FEE)} booking fee isn't refunded once the salon has confirmed.`}
          </p>
          <button
            type="button"
            className="m-btn m-btn-danger m-btn-block"
            onClick={() => {
              cancelBooking(cancelling.id)
              setCancelling(null)
            }}
          >
            Cancel booking
          </button>
          <button type="button" className="m-btn m-btn-outline m-btn-block" onClick={() => setCancelling(null)}>
            Keep it
          </button>
        </Sheet>
      )}

      {receipt && <Receipt booking={receipt} onClose={() => setReceipt(null)} />}
    </TabScreen>
  )
}

function Receipt({ booking, onClose }) {
  const salon = getSalon(booking.salonId)
  return (
    <Sheet onClose={onClose} label="Receipt">
      <h2 className="m-dialog-title">Receipt</h2>
      <p className="m-muted m-small">
        {salon.name} · {shortDate(booking.date)}
        {booking.slot != null && `, ${timeLabel(booking.slot)}`}
      </p>
      <dl className="m-prices">
        <div>
          <dt>Booking fee · paid via {booking.payment.method}</dt>
          <dd>{rupees(booking.fee)}</dd>
        </div>
        {booking.refunded && (
          <div className="m-green">
            <dt>Refunded</dt>
            <dd>−{rupees(booking.fee)}</dd>
          </div>
        )}
        {booking.services.map((s) => (
          <div key={s.id} className="m-muted">
            <dt>{s.name} · at salon</dt>
            <dd>{rupees(s.price)}</dd>
          </div>
        ))}
        <div className="m-prices-sub">
          <dt>Payment ref</dt>
          <dd>{booking.payment.ref}</dd>
        </div>
      </dl>
      <button type="button" className="m-btn m-btn-outline m-btn-block" onClick={onClose}>
        Close
      </button>
    </Sheet>
  )
}
