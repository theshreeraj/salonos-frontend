import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import SalonCard from '../components/SalonCard'
import { BOOKING_FEE, CATEGORIES, PHOTOS, byDistance, getCategory } from '../data/salons'
import { useCatalog } from '../store/catalogContext'
import { useStore } from '../store/context'
import { isOpenNow, rupees } from '../utils/format'

const TYPES = ['All', 'Men', 'Women', 'Unisex']
const SORTS = {
  distance: { label: 'Nearest', fn: (a, b) => byDistance(a.salon, b.salon) },
  wait: { label: 'Shortest wait', fn: (a, b) => a.wait - b.wait },
  rating: { label: 'Top rated', fn: (a, b) => b.salon.rating - a.salon.rating },
  price: { label: 'Lowest price', fn: (a, b) => a.salon.startingPrice - b.salon.startingPrice },
}

const HOW_IT_WORKS = [
  { icon: 'search', text: 'Find a salon nearby and compare live queues, prices and facilities before you leave home.' },
  { icon: 'ticket', text: `Book a digital token for just ${rupees(BOOKING_FEE)}. That's the only thing you pay online.` },
  { icon: 'bell', text: 'Track the queue in real time and get a heads-up when you are two clients away.' },
  { icon: 'store', text: 'Walk in on time, get your service, and pay the salon directly for what you had done.' },
]

const scrollToSalons = () => setTimeout(() => document.getElementById('salons')?.scrollIntoView({ behavior: 'smooth' }), 30)

export default function Explore() {
  const [params, setParams] = useSearchParams()
  const { getQueue } = useStore()
  const { salons: catalogue } = useCatalog()
  const query = params.get('q') ?? ''
  const area = params.get('area') ?? ''
  const category = params.get('category') ?? ''
  const [draft, setDraft] = useState({ area, q: query, category })
  const [type, setType] = useState('All')
  const [openOnly, setOpenOnly] = useState(false)
  const [sort, setSort] = useState('distance')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const a = area.trim().toLowerCase()
    return catalogue.filter((s) => {
      if (s.suspended) return false
      if (a && !`${s.area} ${s.address}`.toLowerCase().includes(a)) return false
      if (category && !s.categories.includes(category)) return false
      if (type !== 'All' && s.type !== type) return false
      if (openOnly && !isOpenNow(s.hours)) return false
      if (!q) return true
      const haystack = [s.name, s.area, s.address, ...s.services.map((x) => x.name), ...s.categories.map((c) => getCategory(c).name)]
      return haystack.some((h) => h.toLowerCase().includes(q))
    })
      .map((salon) => {
        const queue = getQueue(salon.id)
        return { salon, wait: (queue.next - queue.serving) * salon.avgMins }
      })
      .sort(SORTS[sort].fn)
      .map((r) => r.salon)
  }, [query, area, category, type, openOnly, sort, getQueue, catalogue])

  const applyParams = (next) => {
    const p = new URLSearchParams()
    if (next.q) p.set('q', next.q)
    if (next.area) p.set('area', next.area)
    if (next.category) p.set('category', next.category)
    setParams(p, { replace: true })
  }

  const submitSearch = (e) => {
    e.preventDefault()
    applyParams({ q: draft.q.trim(), area: draft.area.trim(), category: draft.category })
    scrollToSalons()
  }

  const pickCategory = (id) => {
    const nextCategory = id === category ? '' : id
    setDraft((d) => ({ ...d, category: nextCategory }))
    applyParams({ q: query, area, category: nextCategory })
    scrollToSalons()
  }

  const clearAll = () => {
    setDraft({ area: '', q: '', category: '' })
    setType('All')
    setOpenOnly(false)
    applyParams({})
  }

  return (
    <>
      <section className="hero container">
        <h1 className="display">
          The look you want,
          <br />
          without the waiting room
        </h1>
        <p className="lead">
          Book a digital token at salons near you, watch the queue move in real time, and walk in right on time. Just{' '}
          {rupees(BOOKING_FEE)} to book — pay for your service at the salon.
        </p>

        <form className="search" onSubmit={submitSearch} role="search">
          <label className="search-field">
            <span>Area</span>
            <input value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} placeholder="Kothrud, Baner…" />
          </label>
          <label className="search-field">
            <span>Salon or service</span>
            <input value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} placeholder="Haircut, facial, salon name" />
          </label>
          <label className="search-field">
            <span>Category</span>
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-primary search-btn">
            <Icon name="search" size={20} />
            <span>Search</span>
          </button>
        </form>

        <p className="live-note">
          <span className="live-dot" /> Real-time queue updates from every salon
        </p>
      </section>



      <section className="section container" id="categories">
        <div className="section-head">
          <h2>Browse by category</h2>
        </div>
        <div className="category-grid">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`category-tile ${category === c.id ? 'is-active' : ''}`}
              onClick={() => pickCategory(c.id)}
              aria-pressed={category === c.id}
            >
              <img src={c.photo.replace('w=1200', 'w=300')} alt="" loading="lazy" />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section container" id="salons">
        <div className="section-head">
          <h2>
            {category ? `${getCategory(category).name} near you` : 'Salons near you'}
            <span className="count">{results.length}</span>
          </h2>
          <label className="sort">
            <Icon name="sliders" size={18} />
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort salons">
              {Object.entries(SORTS).map(([id, s]) => (
                <option key={id} value={id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="chips">
          {TYPES.map((t) => (
            <button key={t} type="button" className={`chip ${type === t ? 'is-active' : ''}`} onClick={() => setType(t)}>
              {t === 'All' ? 'All salons' : t}
            </button>
          ))}
          <button type="button" className={`chip ${openOnly ? 'is-active' : ''}`} onClick={() => setOpenOnly((v) => !v)}>
            <span className="live-dot" /> Open now
          </button>
          {(query || area || category) && (
            <button type="button" className="chip chip-clear" onClick={clearAll}>
              {[query && `“${query}”`, area, category && getCategory(category).name].filter(Boolean).join(' · ')}
              <Icon name="x" size={14} />
            </button>
          )}
        </div>

        {results.length ? (
          <div className="salon-grid">
            {results.map((s) => (
              <SalonCard key={s.id} salon={s} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <h3>No salons match those filters</h3>
            <p className="muted">Try a different area or service, or clear the filters.</p>
            <button type="button" className="btn btn-outline" onClick={clearAll}>
              Clear filters
            </button>
          </div>
        )}
      </section>

      <section className="section container feature">
        <div className="feature-media">
          <img src={PHOTOS.facial} alt="Therapist applying a facial mask" loading="lazy" />
          <div className="float-card">
            <div>
              <strong>Hydrating Facial</strong>
              <span>{rupees(1500)} · 60 min</span>
            </div>
            <span className="btn btn-primary btn-xs">
              <Icon name="ticket" size={16} /> Book token
            </span>
          </div>
        </div>
        <div className="feature-copy">
          <h2>How booking works</h2>
          <ul className="feature-list">
            {HOW_IT_WORKS.map((item) => (
              <li key={item.icon}>
                <Icon name={item.icon} size={26} />
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
