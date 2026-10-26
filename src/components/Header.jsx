import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { CITIES } from '../data/salons'
import { useStore } from '../store/context'
import { bookingStatus, isActive } from '../store/queue'
import Icon from './Icon'

const TABS = [
  { to: '/', label: 'Explore', icon: 'compass', end: true },
  { to: '/tracker', label: 'Tracker', icon: 'pulse' },
  { to: '/bookings', label: 'Bookings', icon: 'ticket' },
]

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="SalonOS home">
      <span className="logo-mark">
        <Icon name="scissors" size={18} strokeWidth={2} />
      </span>
      <span className="logo-word">SalonOS</span>
    </Link>
  )
}

function useActiveCount() {
  const { bookings, getQueue } = useStore()
  return bookings.filter((b) => isActive(bookingStatus(b, getQueue(b.salonId, b.date)))).length
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [city, setCity] = useState('Pune')
  const navigate = useNavigate()
  const activeCount = useActiveCount()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header className={`subnav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="container subnav-inner">
          <Logo />

          <label className="city-select">
            <Icon name="pin" size={18} />
            <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <Icon name="chevronDown" size={16} />
          </label>

          <nav className="subnav-tabs" aria-label="Main">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} className="subnav-link">
                {t.label}
                {t.to === '/tracker' && activeCount > 0 && <span className="count-dot">{activeCount}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="subnav-actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate('/tracker')}>
              My token
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                navigate('/')
                setTimeout(() => document.getElementById('salons')?.scrollIntoView({ behavior: 'smooth' }), 50)
              }}
            >
              Book a token
            </button>
          </div>

          <nav className="topbar-links">
            <Link to="/portal/login">For salon owners</Link>
            <a href="#help">Help</a>
            <button type="button" className="avatar" aria-label="Your profile">
              <Icon name="user" size={20} />
            </button>
          </nav>
        </div>
      </header>

      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className="tabbar-link">
            <span className="tabbar-icon">
              <Icon name={t.icon} size={22} />
              {t.to === '/tracker' && activeCount > 0 && <span className="count-dot">{activeCount}</span>}
            </span>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
