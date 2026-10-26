import { Navigate, useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { BOOKING_FEE } from '../../data/salons'
import { dayLabel, rupees, timeLabel } from '../../utils/format'
import { ANY_STYLIST, freeStylists } from '../availability'
import { useBooking, useBusy } from '../hooks'
import { Rating, TopBar } from '../ui'

export default function Checkout() {
  const navigate = useNavigate()
  const { salon, draft, services, duration, valid } = useBooking()
  const busy = useBusy(salon, draft.date)

  if (!valid || draft.slot == null || !draft.stylist) return <Navigate to={salon ? `/app/book/${salon.id}/time` : '/app'} replace />

  const free = freeStylists(salon, draft.slot, duration, busy)
  const stillFree = draft.stylist === ANY_STYLIST ? free.length > 0 : free.some((p) => p.name === draft.stylist)
  if (!stillFree) return <Navigate to={`/app/book/${salon.id}/time`} replace />

  const servicesTotal = services.reduce((sum, s) => sum + s.price, 0)

  return (
    <>
      <TopBar title="Booking summary" back={`/app/book/${salon.id}/time`} />
      <main className="m-main m-pad">
        <div className="m-card m-salon-row">
          <img src={salon.photos[0].replace('w=1200', 'w=300')} alt="" />
          <div>
            <div className="m-row-between">
              <strong>{salon.name}</strong>
              {salon.distanceKm != null && <span className="m-muted m-small">{salon.distanceKm} km</span>}
            </div>
            <span className="m-meta">
              <Icon name="pin" size={16} /> {salon.area}, {salon.city}
            </span>
            <span className="m-meta">
              <Rating salon={salon} />
            </span>
          </div>
        </div>

        <section className="m-section">
          <h2 className="m-h3">Booking details</h2>
          <dl className="m-details">
            <div>
              <dt>Date</dt>
              <dd>
                {dayLabel(draft.date)} at {timeLabel(draft.slot)}
              </dd>
            </div>
            <div>
              <dt>Stylist</dt>
              <dd>
                {draft.stylist === ANY_STYLIST ? `Any stylist (${free[0].name})` : draft.stylist} · {duration} mins
              </dd>
            </div>
          </dl>
        </section>

        <section className="m-section">
          <h2 className="m-h3">Payment</h2>
          <dl className="m-details">
            <div>
              <dt>Booking fee · pay online now</dt>
              <dd>Holds your slot and stylist</dd>
            </div>
            <div>
              <dt>Services · pay at salon</dt>
              <dd>Settle after your appointment, by UPI, card or cash</dd>
            </div>
          </dl>
          {salon.confirmMode === 'manual' && (
            <p className="m-note">
              <Icon name="bell" size={18} /> The stylist confirms each booking, usually within 5 minutes. If they can't take you, the {rupees(BOOKING_FEE)} is refunded.
            </p>
          )}
        </section>

        <section className="m-section">
          <h2 className="m-h3">Pricing details</h2>
          <dl className="m-prices">
            {services.map((s) => (
              <div key={s.id}>
                <dt>{s.name}</dt>
                <dd>{rupees(s.price)}</dd>
              </div>
            ))}
            <div className="m-prices-sub">
              <dt>Due at salon</dt>
              <dd>{rupees(servicesTotal)}</dd>
            </div>
            <div className="m-prices-total">
              <dt>Pay now</dt>
              <dd>{rupees(BOOKING_FEE)}</dd>
            </div>
          </dl>
        </section>
      </main>
      <div className="m-footer">
        <button type="button" className="m-btn m-btn-primary m-btn-block" onClick={() => navigate(`/app/book/${salon.id}/pay`)}>
          Proceed to pay {rupees(BOOKING_FEE)}
        </button>
      </div>
    </>
  )
}
