import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { useStore } from '../../store/context'
import { isoDate, timeLabel } from '../../utils/format'
import { ANY_STYLIST, bookableDates, busyMap, daySlots, freeStylists } from '../availability'
import { useApp } from '../context'
import { useBooking } from '../hooks'
import { Sheet, TopBar } from '../ui'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const fmt = (iso, opts) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', opts)

export default function DateTime() {
  const navigate = useNavigate()
  const { allBookings } = useStore()
  const { user, updateDraft } = useApp()
  const { salon, draft, services, duration, valid } = useBooking()
  const [calendarOpen, setCalendarOpen] = useState(false)
  const today = isoDate()
  const dates = useMemo(() => bookableDates(today), [today])

  const any = draft.stylist === ANY_STYLIST

  // Slots for a date, each with the chosen stylist (or every stylist, for "any") free for the whole appointment
  const slotsByDate = useMemo(() => {
    if (!salon) return new Map()
    return new Map(
      dates.map((date) => {
        const busy = busyMap(salon, date, allBookings)
        return [
          date,
          daySlots(salon, date).map((slot) => ({
            slot,
            free: freeStylists(salon, slot, duration, busy).filter((p) => any || p.name === draft.stylist),
          })),
        ]
      }),
    )
  }, [salon, dates, allBookings, duration, any, draft.stylist])

  if (!valid) return <Navigate to={salon ? `/app/book/${salon.id}/services` : '/app'} replace />

  const slotsFor = (date) => slotsByDate.get(date)
  const openCount = (date) => slotsFor(date).filter((s) => s.free.length).length
  const date = dates.includes(draft.date) ? draft.date : (dates.slice(0, 3).find((d) => openCount(d) > 0) ?? dates[0])
  const chips = dates.slice(0, 3).includes(date) ? dates.slice(0, 3) : [dates[0], dates[1], date]
  const slots = slotsFor(date)
  const picked = slots.find((s) => s.slot === draft.slot && s.free.length)

  const pickDate = (d) => {
    updateDraft({ date: d, slot: null })
    setCalendarOpen(false)
  }

  // Booking needs a signed-in customer; sign-in returns straight to checkout
  const next = () => {
    const checkout = `/app/book/${salon.id}/checkout`
    if (user) navigate(checkout)
    else navigate('/app/login', { state: { next: checkout, reason: 'book' } })
  }

  return (
    <>
      <TopBar title="Date and time" back={`/app/book/${salon.id}/services`} />
      <main className="m-main m-pad">
        <p className="m-muted m-small m-summary-line">
          {any ? 'Any stylist' : draft.stylist} · {services.length} {services.length === 1 ? 'service' : 'services'} · {duration} mins
        </p>

        <h2 className="m-h2">Select date</h2>
        <div className="m-date-row">
          {chips.map((d) => {
            const count = openCount(d)
            return (
              <button key={d} type="button" className={`m-card m-date ${d === date ? 'is-selected' : ''}`} onClick={() => pickDate(d)} aria-pressed={d === date}>
                <span className="m-date-day">{d === today ? 'Today' : fmt(d, { weekday: 'short' })}</span>
                <strong>{fmt(d, { day: 'numeric', month: 'short' })}</strong>
                <span className={`m-small ${count ? 'm-green' : 'm-muted'}`}>{count ? `${count} slots` : 'Full'}</span>
              </button>
            )
          })}
          <button type="button" className="m-card m-date" onClick={() => setCalendarOpen(true)}>
            <Icon name="calendar" size={22} />
            <span>More dates</span>
          </button>
        </div>

        <h2 className="m-h2">Select time</h2>
        {slots.length === 0 ? (
          <div className="m-empty">
            <strong>{date === today ? 'No more slots today' : 'Closed on this day'}</strong>
            <span className="m-muted">Pick another date above.</span>
          </div>
        ) : (
          <>
            {!any && openCount(date) === 0 && (
              <p className="m-note">
                {draft.stylist} is fully booked on this day.{' '}
                <button type="button" className="m-link" onClick={() => updateDraft({ stylist: ANY_STYLIST, slot: null })}>
                  Switch to any stylist
                </button>
              </p>
            )}
          <ul className="m-stack m-slots">
            {slots.map(({ slot, free }) => {
              const on = picked?.slot === slot
              return (
                <li key={slot}>
                  <button
                    type="button"
                    className={`m-card m-slot ${on ? 'is-selected' : ''}`}
                    disabled={!free.length}
                    onClick={() => updateDraft({ date, slot })}
                    aria-pressed={on}
                  >
                    <strong>{timeLabel(slot).toUpperCase()}</strong>
                    <span className={free.length ? 'm-green' : ''}>
                      {!free.length ? (any ? 'Fully booked' : 'Booked') : any ? `${free.length} ${free.length === 1 ? 'stylist' : 'stylists'} free` : 'Available'}
                    </span>
                  </button>
                </li>
              )
            })}
            </ul>
          </>
        )}
      </main>

      <div className="m-footer">
        <button type="button" className="m-btn m-btn-primary m-btn-block" disabled={!picked} onClick={next}>
          {!picked ? 'Select a time' : user ? `Continue · ${timeLabel(picked.slot)}` : `Sign in to book · ${timeLabel(picked.slot)}`}
        </button>
      </div>

      {calendarOpen && (
        <Sheet onClose={() => setCalendarOpen(false)} label="Choose a date">
          <CalendarGrid dates={dates} selected={date} openCount={openCount} onPick={pickDate} />
        </Sheet>
      )}
    </>
  )
}

function CalendarGrid({ dates, selected, openCount, onPick }) {
  const months = [...new Set(dates.map((d) => d.slice(0, 7)))]
  return (
    <div className="m-calendar">
      <div className="m-cal-grid m-cal-head">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      {months.map((month) => {
        const first = new Date(`${month}-01T00:00:00`)
        const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
        return (
          <section key={month}>
            <h3>{first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3>
            <div className="m-cal-grid">
              {Array.from({ length: first.getDay() }, (_, i) => (
                <span key={`pad${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const iso = `${month}-${String(i + 1).padStart(2, '0')}`
                const bookable = dates.includes(iso) && openCount(iso) > 0
                return (
                  <button key={iso} type="button" className={iso === selected ? 'is-selected' : ''} disabled={!bookable} onClick={() => onPick(iso)}>
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
