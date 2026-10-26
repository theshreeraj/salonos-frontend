import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon'
import { BOOKING_FEE, CATEGORIES, CITIES, PHOTOS, byDistance, getCategory } from '../../data/salons'
import { rupees } from '../../utils/format'
import { TabScreen } from '../AppLayout'
import { useCatalog } from '../../store/catalogContext'
import { useApp } from '../context'
import { SalonRow } from '../ui'

export default function Home() {
  const { user } = useApp()
  const { salons: catalogue } = useCatalog()
  const [city, setCity] = useState('Pune')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')

  const salons = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalogue.filter((s) => {
      if (s.suspended) return false
      if (s.city !== city) return false
      if (category && !s.categories.includes(category)) return false
      if (!q) return true
      return [s.name, s.area, s.address, ...s.services.map((x) => x.name)].some((h) => h.toLowerCase().includes(q))
    }).sort(byDistance)
  }, [catalogue, city, query, category])

  return (
    <TabScreen>
      <div className="m-pad">
        <div className="m-home-head">
          <Icon name="pin" size={26} className="m-blue" />
          <label className="m-location">
            <span className="m-muted">Location</span>
            <span className="m-location-select">
              <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">
                {CITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <Icon name="chevronDown" size={18} />
            </span>
          </label>
          <Link to="/app/profile" className="m-icon-btn" aria-label={user ? `Signed in as ${user.name}` : 'Sign in'}>
            {user ? <span className="m-avatar-sm">{user.name[0]}</span> : <Icon name="user" size={22} />}
          </Link>
        </div>

        <label className="m-search">
          <Icon name="search" size={22} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search salon, area or service" />
          {query && (
            <button type="button" className="m-icon-btn-plain" onClick={() => setQuery('')} aria-label="Clear search">
              <Icon name="x" size={18} />
            </button>
          )}
        </label>

        <div className="m-banner" style={{ backgroundImage: `linear-gradient(90deg, rgba(10,30,90,.88) 35%, rgba(10,30,90,.1)), url(${PHOTOS.barberCut})` }}>
          <strong>Skip the waiting room</strong>
          <span className="m-banner-big">Book for {rupees(BOOKING_FEE)}</span>
          <span>Pick a time and stylist. Pay for services at the salon.</span>
          <a href="#nearby" className="m-btn m-btn-white m-btn-sm">
            Book now
          </a>
        </div>

        <h2 className="m-h2">Services</h2>
      </div>
      <div className="m-scroll-x m-pad-x">
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" className={`m-pill ${category === c.id ? 'is-active' : ''}`} onClick={() => setCategory(category === c.id ? '' : c.id)} aria-pressed={category === c.id}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="m-pad" id="nearby">
        <div className="m-row-between">
          <h2 className="m-h2">{category ? `${getCategory(category).name} nearby` : 'Nearby salons'}</h2>
          <span className="m-muted m-small">{salons.length} found</span>
        </div>
        {salons.length ? (
          <div className="m-stack">
            {salons.map((s) => (
              <SalonRow key={s.id} salon={s} />
            ))}
          </div>
        ) : (
          <div className="m-empty">
            <strong>No salons match</strong>
            <span className="m-muted">{city === 'Pune' ? 'Try another service or search term.' : `We're not in ${city} yet. Pune is live now.`}</span>
          </div>
        )}
      </div>
    </TabScreen>
  )
}
