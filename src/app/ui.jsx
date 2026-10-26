import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { getCategory } from '../data/salons'
import { isNewSalon } from '../data/salons'
import { isOpenNow } from '../utils/format'

export function TopBar({ title, back, right }) {
  const navigate = useNavigate()
  return (
    <header className="m-topbar">
      <button type="button" className="m-icon-btn m-icon-btn-plain" onClick={() => (back ? navigate(back) : navigate(-1))} aria-label="Back">
        <Icon name="chevronLeft" size={24} />
      </button>
      <h1>{title}</h1>
      {right}
    </header>
  )
}

export function SalonRow({ salon, to = `/app/salon/${salon.id}` }) {
  const open = isOpenNow(salon.hours)
  return (
    <Link to={to} className="m-card m-salon-row">
      <img src={salon.photos[0].replace('w=1200', 'w=300')} alt="" loading="lazy" />
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
          <span className={`m-dot-label ${open ? 'is-open' : ''}`}>{open ? 'Open' : 'Closed'}</span>
        </span>
      </div>
    </Link>
  )
}

export function Rating({ salon }) {
  if (isNewSalon(salon)) return <span className="m-rating m-blue">New on SalonOS</span>
  return (
    <span className="m-rating">
      <Icon name="star" size={16} /> {salon.rating} <span className="m-muted">({salon.reviews})</span>
    </span>
  )
}

// Bottom sheet / centred dialog over the phone frame
export function Sheet({ children, onClose, center = false, label }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className={`m-overlay ${center ? 'is-center' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={center ? 'm-dialog' : 'm-sheet'} role="dialog" aria-modal="true" aria-label={label}>
        {!center && <span className="m-sheet-grip" />}
        {children}
      </div>
    </div>
  )
}

export function ServiceTabs({ salon, tab, setTab }) {
  return (
    <div className="m-tabs m-scroll-x" role="tablist">
      {salon.categories.map((c) => (
        <button key={c} type="button" role="tab" aria-selected={tab === c} className={tab === c ? 'is-active' : ''} onClick={() => setTab(c)}>
          {getCategory(c).name}
        </button>
      ))}
    </div>
  )
}
