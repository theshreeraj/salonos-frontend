import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import { getSalon } from '../../data/salons'
import { useStore } from '../../store/context'
import { hoursLabel, isOpenNow, rupees } from '../../utils/format'
import { useApp } from '../context'
import { initials, isTopRated } from '../hooks'
import { Rating, ServiceTabs } from '../ui'

export default function Salon() {
  const { id } = useParams()
  const salon = getSalon(id)
  if (!salon) {
    return (
      <div className="m-empty m-pad">
        <strong>Salon not found</strong>
        <Link to="/app" className="m-btn m-btn-outline">
          Back to home
        </Link>
      </div>
    )
  }
  return <SalonView key={salon.id} salon={salon} />
}

function SalonView({ salon }) {
  const navigate = useNavigate()
  const { isBookingOpen } = useStore()
  const { startDraft, favourites, toggleFavourite } = useApp()
  const [tab, setTab] = useState(salon.categories[0])
  const open = isOpenNow(salon.hours)
  const takingBookings = isBookingOpen(salon.id)
  const favourite = favourites.includes(salon.id)

  const book = () => {
    startDraft(salon.id)
    navigate(`/app/book/${salon.id}/stylist`)
  }

  return (
    <>
      <main className="m-main m-pad">
        <div className="m-row-between m-top-actions">
          <button type="button" className="m-icon-btn" onClick={() => navigate(-1)} aria-label="Back">
            <Icon name="chevronLeft" size={24} />
          </button>
          <button type="button" className={`m-icon-btn ${favourite ? 'is-fav' : ''}`} onClick={() => toggleFavourite(salon.id)} aria-pressed={favourite} aria-label="Favourite">
            <Icon name="heart" size={22} />
          </button>
        </div>

        <div className="m-gallery">
          {salon.photos.map((src, i) => (
            <img key={src} src={src.replace('w=1200', 'w=800')} alt={i === 0 ? `Inside ${salon.name}` : ''} />
          ))}
        </div>

        <h1 className="m-h1">{salon.name}</h1>
        <ul className="m-facts">
          <li>
            <Icon name="pin" size={18} /> {salon.address}
          </li>
          <li>
            <Icon name="clock" size={18} /> {hoursLabel(salon.hours)}, Mon – Sun
            <span className={`m-dot-label ${open ? 'is-open' : ''}`}>{open ? 'Open now' : 'Closed'}</span>
          </li>
          <li>
            <Rating salon={salon} />
          </li>
        </ul>
        <p className="m-about">{salon.about}</p>

        <h2 className="m-h2">Stylists</h2>
        <div className="m-scroll-x m-team">
          {salon.stylists.map((p) => (
            <div key={p.name} className="m-team-member">
              <span className="m-avatar">{initials(p.name)}</span>
              <strong>{p.name.split(' ')[0]}</strong>
              <span className="m-muted m-small">{isTopRated(p) ? 'Top rated' : p.role}</span>
            </div>
          ))}
        </div>

        <h2 className="m-h2">Services</h2>
        <ServiceTabs salon={salon} tab={tab} setTab={setTab} />
        <ul className="m-stack m-services">
          {salon.services
            .filter((s) => s.category === tab)
            .map((s) => (
              <li key={s.id} className="m-card m-service">
                <span>
                  <strong>{s.name}</strong>
                  <span className="m-meta">
                    {rupees(s.price)} <Icon name="clock" size={15} /> {s.mins} mins
                  </span>
                </span>
              </li>
            ))}
        </ul>
        {!takingBookings && <p className="m-note">This salon has paused online bookings for now. You can still walk in.</p>}
      </main>

      {takingBookings && (
        <div className="m-footer">
          <button type="button" className="m-btn m-btn-primary m-btn-block" onClick={book}>
            Book appointment
          </button>
        </div>
      )}
    </>
  )
}
