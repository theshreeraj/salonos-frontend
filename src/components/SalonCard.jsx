import { Link, useNavigate } from 'react-router-dom'
import { isNewSalon } from '../data/salons'
import { useStore } from '../store/context'
import { isOpenNow, rupees, tokenLabel, waitLabel } from '../utils/format'
import Icon from './Icon'

export default function SalonCard({ salon }) {
  const { getQueue, isBookingOpen } = useStore()
  const navigate = useNavigate()
  const queue = getQueue(salon.id)
  const open = isOpenNow(salon.hours)
  const wait = (queue.next - queue.serving) * salon.avgMins

  return (
    <article className="salon-card">
      <Link to={`/salon/${salon.id}`} className="salon-card-media">
        <img src={salon.photos[0]} alt="" loading="lazy" />
        <span className={`badge ${open ? 'badge-open' : 'badge-closed'}`}>{open ? 'Open now' : 'Closed'}</span>
      </Link>

      <div className="salon-card-body">
        <div className="salon-card-title">
          <h3>
            <Link to={`/salon/${salon.id}`}>{salon.name}</Link>
          </h3>
          <span className="rating">
            {isNewSalon(salon) ? (
              'New'
            ) : (
              <>
                <Icon name="star" size={15} />
                {salon.rating}
                <span className="muted">({salon.reviews})</span>
              </>
            )}
          </span>
        </div>
        <p className="salon-card-meta">
          {salon.type} · {salon.area}
          {salon.distanceKm != null && ` · ${salon.distanceKm} km`}
        </p>

        <div className="queue-box">
          <div>
            <span className="queue-label">Now serving</span>
            <span className="queue-value">{tokenLabel(queue.serving)}</span>
          </div>
          <div>
            <span className="queue-label">Next token</span>
            <span className="queue-value accent">{tokenLabel(queue.next)}</span>
          </div>
          <div>
            <span className="queue-label">Est. wait</span>
            <span className="queue-value small">{open ? waitLabel(wait) : '—'}</span>
          </div>
        </div>

        <div className="salon-card-footer">
          <div>
            <span className="queue-label">Services from</span>
            <strong className="price">{rupees(salon.startingPrice)}</strong>
          </div>
          <div className="salon-card-actions">
            <Link to={`/salon/${salon.id}`} className="btn btn-outline btn-sm">
              Details
            </Link>
            <button type="button" className="btn btn-primary btn-sm" disabled={!isBookingOpen(salon.id)} onClick={() => navigate(`/salon/${salon.id}?book=1`)}>
              {isBookingOpen(salon.id) ? 'Book token' : 'Paused'}
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
