import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ANY_STYLIST, bookableDates, busyMap, daySlots, durationOf, freeStylists } from '../app/availability'
import { BOOKING } from '../data/config'
import { useApp } from '../app/context'
import { initials, isTopRated, useCalendars } from '../app/hooks'
import { BOOKING_FEE } from '../data/salons'
import { dayLabel, isoDate, rupees, timeLabel } from '../utils/format'
import Icon from './Icon'

const STRIP_DAYS = 14
const PERIODS = [
  { label: 'Morning', until: 12 * 60 },
  { label: 'Afternoon', until: 17 * 60 },
  { label: 'Evening', until: 24 * 60 },
]
const fmt = (iso, opts) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', opts)
const firstName = (name) => name.replace(/^Dr\.\s*/, '').split(' ')[0]

// Desktop booking card: stylist → day → start time, with every stylist's free and booked times visible.
// Selections live in the shared booking draft so they survive the sign-in detour.
export default function BookingPanel({ salon, chosen, onRemoveService, onBook, confirmsManually, takingBookings }) {
  const navigate = useNavigate()
  const { user, draft, updateDraft } = useApp()
  const mine = draft.salonId === salon.id
  const stylist = (mine && draft.stylist) || ANY_STYLIST
  const any = stylist === ANY_STYLIST
  const duration = Math.max(durationOf(chosen), BOOKING.defaultMins)
  const servicesTotal = chosen.reduce((sum, s) => sum + s.price, 0)
  const today = isoDate()
  const dates = useMemo(() => bookableDates(today).slice(0, STRIP_DAYS), [today])
  const calendars = useCalendars(salon.id, STRIP_DAYS)

  // date → [{ slot, free: stylists free for the whole appointment }]
  const days = useMemo(
    () =>
      new Map(
        dates.map((d) => {
          const busy = busyMap(salon, calendars?.[d])
          return [d, daySlots(salon, d).map((slot) => ({ slot, free: freeStylists(salon, slot, duration, busy) }))]
        }),
      ),
    [salon, dates, calendars, duration],
  )

  const eligible = (free) => (any ? free : free.filter((p) => p.name === stylist))
  const openCount = (d) => days.get(d).filter((s) => eligible(s.free).length).length
  const date = mine && dates.includes(draft.date) ? draft.date : (dates.find((d) => openCount(d) > 0) ?? dates[0])
  const slots = days.get(date)
  const picked = calendars && mine && draft.date === date ? slots.find((s) => s.slot === draft.slot && eligible(s.free).length) : null
  const assigned = picked ? eligible(picked.free)[0] : null
  const nextFree = (name) => slots.find((s) => s.free.some((p) => p.name === name))?.slot
  const nextOpenDate = dates.find((d) => d > date && openCount(d) > 0)

  const set = (patch) => updateDraft({ salonId: salon.id, ...patch })
  const pickStylist = (name) => set({ stylist: name, date, slot: picked && (name === ANY_STYLIST || picked.free.some((p) => p.name === name)) ? picked.slot : null })

  const book = () => {
    if (!picked || !takingBookings) return document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (!user) return navigate('/app/login', { state: { next: `/salon/${salon.id}?book=1`, reason: 'book' } })
    onBook({ date, slot: picked.slot, duration, stylist, anyStylist: any, assignedName: assigned.name })
  }

  const cta = !takingBookings ? 'Online booking paused' : !picked ? 'Choose a time' : `${user ? 'Book' : 'Sign in & book'} ${timeLabel(picked.slot)} · ${rupees(BOOKING_FEE)}`

  return (
    <>
      <aside className="book-card" id="book">
        <h2 className="book-title">Book an appointment</h2>

        <section className="bp-step">
          <div className="bp-step-head">
            <span className="bp-label">Stylist</span>
            <span className="bp-hint">Next free time {date === today ? 'today' : `on ${fmt(date, { weekday: 'short', day: 'numeric', month: 'short' })}`}</span>
          </div>
          <div className="bp-stylists" role="radiogroup" aria-label="Stylist">
            <button type="button" role="radio" aria-checked={any} className={`bp-stylist ${any ? 'is-active' : ''}`} onClick={() => pickStylist(ANY_STYLIST)}>
              <span className="bp-avatar bp-avatar-any">
                <Icon name="users" size={20} />
              </span>
              <strong>Any</strong>
              <span className="bp-free">Most times</span>
            </button>
            {salon.stylists.map((p) => {
              const next = nextFree(p.name)
              const on = stylist === p.name
              return (
                <button
                  key={p.name}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`bp-stylist ${on ? 'is-active' : ''}`}
                  onClick={() => pickStylist(p.name)}
                  title={`${p.name} · ${p.role}, ${p.years} yrs`}
                >
                  <span className="bp-avatar">
                    {initials(p.name)}
                    {isTopRated(p) && (
                      <span className="bp-top" aria-label="Top rated">
                        <Icon name="star" size={10} />
                      </span>
                    )}
                  </span>
                  <strong>{firstName(p.name)}</strong>
                  <span className={`bp-free ${next != null ? 'is-free' : ''}`}>{next != null ? timeLabel(next) : 'Booked'}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="bp-step">
          <div className="bp-step-head">
            <span className="bp-label">Day</span>
            <span className="bp-hint">{fmt(date, { month: 'long' })}</span>
          </div>
          <div className="bp-dates" role="radiogroup" aria-label="Day">
            {dates.map((d) => {
              const count = openCount(d)
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={d === date}
                  className={`bp-date ${d === date ? 'is-active' : ''} ${count ? '' : 'is-full'}`}
                  onClick={() => set({ stylist, date: d, slot: null })}
                >
                  <span>{d === today ? 'Today' : fmt(d, { weekday: 'short' })}</span>
                  <strong>{fmt(d, { day: 'numeric' })}</strong>
                  <span className="bp-date-count">{count ? `${count} free` : 'Full'}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="bp-step">
          <div className="bp-step-head">
            <span className="bp-label">Start time</span>
            <span className="bp-legend">
              <i className="is-free" /> Free <i className="is-booked" /> Booked
            </span>
          </div>
          <p className="bp-hint bp-duration">
            {duration} min appointment
            {!chosen.length && ' · add services to fit longer ones'}
          </p>

          {slots.length === 0 ? (
            <p className="bp-empty">
              {date === today ? 'No more start times today.' : 'Closed on this day.'}{' '}
              {nextOpenDate && (
                <button type="button" className="link" onClick={() => set({ stylist, date: nextOpenDate, slot: null })}>
                  See {dayLabel(nextOpenDate).split(',')[0]}
                </button>
              )}
            </p>
          ) : (
            <>
              {!any && openCount(date) === 0 && (
                <p className="bp-empty">
                  {firstName(stylist)} is fully booked this day.{' '}
                  {nextOpenDate && (
                    <>
                      <button type="button" className="link" onClick={() => set({ stylist, date: nextOpenDate, slot: null })}>
                        Next free: {fmt(nextOpenDate, { weekday: 'short', day: 'numeric', month: 'short' })}
                      </button>{' '}
                      or{' '}
                    </>
                  )}
                  <button type="button" className="link" onClick={() => pickStylist(ANY_STYLIST)}>
                    any stylist
                  </button>
                </p>
              )}
              {PERIODS.map((period, i) => {
                const from = i === 0 ? 0 : PERIODS[i - 1].until
                const inPeriod = slots.filter((s) => s.slot >= from && s.slot < period.until)
                if (!inPeriod.length) return null
                return (
                  <div key={period.label} className="bp-period">
                    <span className="bp-period-label">{period.label}</span>
                    <div className="bp-times">
                      {inPeriod.map(({ slot, free }) => {
                        const ok = eligible(free)
                        const on = picked?.slot === slot
                        return (
                          <button
                            key={slot}
                            type="button"
                            className={`bp-time ${on ? 'is-active' : ''}`}
                            disabled={!ok.length}
                            aria-pressed={on}
                            title={ok.length ? (any ? `Free: ${ok.map((p) => firstName(p.name)).join(', ')}` : 'Free') : any ? 'Every stylist is booked' : `${firstName(stylist)} is booked`}
                            onClick={() => set({ stylist, date, slot })}
                          >
                            {timeLabel(slot).replace(' ', ' ')}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </section>

        {picked && (
          <div className="bp-selection">
            <Icon name="calendar" size={22} />
            <div>
              <strong>
                {dayLabel(date)} · {timeLabel(picked.slot)} – {timeLabel(picked.slot + duration)}
              </strong>
              <span>
                with {assigned.name}
                {any && ' (first free stylist)'}
              </span>
            </div>
          </div>
        )}

        <div className="book-services">
          {chosen.length ? (
            <ul>
              {chosen.map((s) => (
                <li key={s.id}>
                  <span>{s.name}</span>
                  <span>{rupees(s.price)}</span>
                  <button type="button" className="icon-btn" onClick={() => onRemoveService(s.id)} aria-label={`Remove ${s.name}`}>
                    <Icon name="x" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">
              No services added. You can decide at the salon, or{' '}
              <a href="#services" className="link">
                pick from the menu
              </a>
              .
            </p>
          )}
        </div>

        <dl className="summary">
          <div className="muted">
            <dt>Services · pay at salon</dt>
            <dd>{servicesTotal ? rupees(servicesTotal) : '—'}</dd>
          </div>
          <div>
            <dt>Booking fee · pay now</dt>
            <dd>{rupees(BOOKING_FEE)}</dd>
          </div>
        </dl>

        {confirmsManually && takingBookings && (
          <p className="confirm-note">
            <Icon name="bell" size={18} />
            <span>
              <strong>The stylist confirms each booking</strong>
              This salon has no receptionist, so the stylist accepts your request between clients — usually within 5 minutes. If they can't take you, you get the{' '}
              {rupees(BOOKING_FEE)} back.
            </span>
          </p>
        )}
        <button type="button" className="btn btn-primary btn-block" disabled={!takingBookings || !picked} onClick={book}>
          {cta}
        </button>
        <p className="fine-print">
          <Icon name="info" size={14} />{' '}
          {takingBookings
            ? `${rupees(BOOKING_FEE)} holds your time with the stylist. Pay for services at the salon.${user ? '' : ' You’ll sign in with your mobile number first.'}`
            : 'The salon has paused online bookings for now. You can still walk in.'}
        </p>
      </aside>

      <div className="mobile-book-bar">
        <div>
          <strong>{picked ? `${dayLabel(date).split(',')[0]} · ${timeLabel(picked.slot)}` : 'Pick a time'}</strong>
          <span className="muted small">{picked ? `with ${firstName(assigned.name)} · ${rupees(BOOKING_FEE)} to book` : `${rupees(BOOKING_FEE)} to book`}</span>
        </div>
        <button type="button" className="btn btn-primary" disabled={!takingBookings} onClick={book}>
          {!takingBookings ? 'Paused' : picked ? 'Book' : 'Choose time'}
        </button>
      </div>
    </>
  )
}
