import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useApp } from '../app/context'
import BookingPanel from '../components/BookingPanel'
import Icon from '../components/Icon'
import PaymentSheet from '../components/PaymentSheet'
import { FACILITIES, getCategory, getSalon, isNewSalon } from '../data/salons'
import { useStore } from '../store/context'
import { directionsUrl, hoursLabel, isOpenNow, rupees, tokenLabel } from '../utils/format'

const initials = (name) =>
  name
    .replace(/^Dr\.\s*/, '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')

export default function SalonDetails() {
  const { id } = useParams()
  const salon = getSalon(id)
  if (!salon) {
    return (
      <div className="container empty page-top">
        <h1 className="display-sm">Salon not found</h1>
        <p className="muted">It may have moved or stopped taking online tokens.</p>
        <Link to="/" className="btn btn-outline">
          Back to Explore
        </Link>
      </div>
    )
  }
  return <SalonView key={salon.id} salon={salon} />
}

function SalonView({ salon }) {
  const [params] = useSearchParams()
  const { getQueue, bookToken, isBookingOpen } = useStore()
  const { draft, startDraft, updateDraft } = useApp()
  const [serviceFilter, setServiceFilter] = useState('all')
  // { date, slot, duration, stylist, anyStylist } while the payment sheet is open
  const [paying, setPaying] = useState(null)

  const liveQueue = getQueue(salon.id)
  const open = isOpenNow(salon.hours)
  const takingBookings = isBookingOpen(salon.id)
  const confirmsManually = salon.confirmMode === 'manual'
  const selected = draft.salonId === salon.id ? draft.serviceIds : []
  const chosen = salon.services.filter((s) => selected.includes(s.id))
  const visibleServices = useMemo(
    () => (serviceFilter === 'all' ? salon.services : salon.services.filter((s) => s.category === serviceFilter)),
    [salon.services, serviceFilter],
  )

  useEffect(() => {
    startDraft(salon.id)
  }, [salon.id, startDraft])

  useEffect(() => {
    window.scrollTo(0, 0)
    if (params.get('book')) {
      setTimeout(() => document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    }
  }, [params])

  // Services change the appointment length, so a picked time may no longer fit
  const toggle = (sid) => updateDraft({ salonId: salon.id, serviceIds: selected.includes(sid) ? selected.filter((x) => x !== sid) : [...selected, sid], slot: null })

  // The API re-checks the time (it may have gone while the customer was paying); null means it was taken
  const confirm = async (method) => {
    try {
      const booking = await bookToken({ salonId: salon.id, date: paying.date, services: chosen, stylist: paying.stylist, method, slot: paying.slot, anyStylist: paying.anyStylist })
      updateDraft({ slot: null })
      return booking
    } catch (err) {
      if (err.data?.code === 'slot-taken') return null
      throw err
    }
  }

  return (
    <div className="container page-top details">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Explore</Link>
        <Icon name="chevronRight" size={14} />
        <span>{salon.name}</span>
      </nav>

      <header className="details-head">
        <div>
          <p className="eyebrow">
            {salon.type === 'Unisex' ? 'Unisex' : `${salon.type}'s`} salon · {salon.area}
          </p>
          <h1 className="display-sm">{salon.name}</h1>
          <p className="details-meta">
            {isNewSalon(salon) ? (
              <span className="rating">New on SalonOS</span>
            ) : (
              <span className="rating">
                <Icon name="star" size={16} /> {salon.rating}
                <span className="muted">({salon.reviews} reviews)</span>
              </span>
            )}
            <span className={`badge ${open ? 'badge-open' : 'badge-closed'}`}>{open ? 'Open now' : 'Closed'}</span>
            <span className="muted">
              <Icon name="clock" size={16} /> {hoursLabel(salon.hours)}
            </span>
            {salon.distanceKm != null && (
              <span className="muted">
                <Icon name="pin" size={16} /> {salon.distanceKm} km away
              </span>
            )}
          </p>
        </div>
        <div className="details-actions">
          <a className="btn btn-outline" href={`tel:${salon.phone.replace(/\s/g, '')}`}>
            <Icon name="phone" size={18} /> Call
          </a>
          <a className="btn btn-outline" href={directionsUrl(salon)} target="_blank" rel="noreferrer">
            <Icon name="navigation" size={18} /> Get directions
          </a>
        </div>
      </header>

      <div className="gallery">
        {salon.photos.map((src, i) => (
          <img key={src} src={src} alt={i === 0 ? `Inside ${salon.name}` : ''} />
        ))}
      </div>

      <div className="details-grid">
        <div className="details-main">
          <div className="live-strip">
            <span className="live-note">
              <span className="live-dot" /> Live queue
            </span>
            <div>
              <span className="queue-label">Now serving</span>
              <span className="queue-value">{tokenLabel(liveQueue.serving)}</span>
            </div>
            <div>
              <span className="queue-label">Next token</span>
              <span className="queue-value accent">{tokenLabel(liveQueue.next)}</span>
            </div>
            <div>
              <span className="queue-label">Avg. per client</span>
              <span className="queue-value small">{salon.avgMins} min</span>
            </div>
          </div>

          <section className="block" id="services">
            <h2 className="block-title">Services &amp; prices</h2>
            <p className="muted block-sub">Add services to see your estimate. You pay for services at the salon, not online.</p>
            <div className="chips">
              <button type="button" className={`chip ${serviceFilter === 'all' ? 'is-active' : ''}`} onClick={() => setServiceFilter('all')}>
                All
              </button>
              {salon.categories.map((c) => (
                <button key={c} type="button" className={`chip ${serviceFilter === c ? 'is-active' : ''}`} onClick={() => setServiceFilter(c)}>
                  {getCategory(c).name}
                </button>
              ))}
            </div>
            <ul className="service-list">
              {visibleServices.map((s) => {
                const on = selected.includes(s.id)
                return (
                  <li key={s.id} className={on ? 'is-selected' : ''}>
                    <div>
                      <strong>{s.name}</strong>
                      <span className="muted small">
                        {getCategory(s.category).name} · {s.mins} min
                      </span>
                    </div>
                    <span className="service-price">{rupees(s.price)}</span>
                    <button
                      type="button"
                      className={`btn btn-sm ${on ? 'btn-primary' : 'btn-outline'} service-add`}
                      onClick={() => toggle(s.id)}
                      aria-pressed={on}
                    >
                      <Icon name={on ? 'check' : 'plus'} size={16} /> {on ? 'Added' : 'Add'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="block" id="facilities">
            <h2 className="block-title">Facilities</h2>
            <ul className="facility-list">
              {salon.facilities.map((f) => (
                <li key={f}>
                  <Icon name={FACILITIES[f].icon} size={24} />
                  {FACILITIES[f].label}
                </li>
              ))}
            </ul>
          </section>

          <section className="block" id="team">
            <h2 className="block-title">Meet the team</h2>
            <ul className="team-list">
              {salon.stylists.map((p) => (
                <li key={p.name}>
                  <span className="team-avatar">{initials(p.name)}</span>
                  <div>
                    <strong>{p.name}</strong>
                    <span className="muted small">
                      {p.role} · {p.years} yrs
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="block" id="about">
            <h2 className="block-title">About</h2>
            <p className="about">{salon.about}</p>
            <dl className="info-list">
              <div>
                <dt>
                  <Icon name="pin" size={20} /> Address
                </dt>
                <dd>
                  {salon.address}{' '}
                  <a href={directionsUrl(salon)} target="_blank" rel="noreferrer" className="link">
                    Get directions
                  </a>
                </dd>
              </div>
              <div>
                <dt>
                  <Icon name="clock" size={20} /> Hours
                </dt>
                <dd>Monday – Sunday, {hoursLabel(salon.hours)}</dd>
              </div>
              <div>
                <dt>
                  <Icon name="phone" size={20} /> Phone
                </dt>
                <dd>{salon.phone}</dd>
              </div>
            </dl>
          </section>
        </div>

        <BookingPanel
          salon={salon}
          chosen={chosen}
          onRemoveService={toggle}
          onBook={setPaying}
          confirmsManually={confirmsManually}
          takingBookings={takingBookings}
        />
      </div>

      {paying && (
        <PaymentSheet
          salon={salon}
          date={paying.date}
          slot={paying.slot}
          services={chosen}
          stylist={paying.anyStylist ? `${paying.assignedName} (first free)` : paying.stylist}
          onClose={() => setPaying(null)}
          onConfirm={confirm}
        />
      )}
    </div>
  )
}
