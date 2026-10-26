// Network metrics for the command centre. Today comes from the live token rows;
// earlier days are simulated deterministically until the backend keeps daily history.
import { BOOKING_FEE } from '../data/salons'
import { addDays, dayLabel, isoDate, shortDate } from '../utils/format'
import { hash, salonStats } from './data'

export const RANGES = [
  { id: 1, label: 'Today' },
  { id: 7, label: '7 days' },
  { id: 30, label: '30 days' },
]

export const rangeLabel = (dates) => (dates.length === 1 ? dayLabel(dates[0]) : `${shortDate(dates[0]).replace(/ \d{4}$/, '')} – ${shortDate(dates.at(-1))}`)

export const rangeDates = (end, days) => Array.from({ length: days }, (_, i) => addDays(end, i - days + 1))

const EMPTY = { issued: 0, online: 0, walkIn: 0, done: 0, noShow: 0, cancelled: 0, serviceValue: 0, paidBookings: 0, refunds: 0 }

function simulatedDay(salon, date) {
  if (date < salon.meta.onboardedOn) return EMPTY
  const h = hash(`${salon.id}|${date}|history`)
  const weekday = new Date(`${date}T00:00:00`).getDay()
  const weekend = weekday === 0 || weekday === 6 ? 1.35 : 1
  const issued = Math.round(salon.meta.chairs * (3 + (h % 4)) * weekend)
  const online = Math.round(issued * (0.35 + ((h >>> 4) % 30) / 100))
  const noShow = Math.round(issued * (((h >>> 9) % 7) / 100))
  const cancelled = Math.round(issued * (((h >>> 13) % 3) / 100))
  const done = issued - noShow - cancelled
  const ticket = salon.startingPrice * (1.4 + ((h >>> 17) % 6) / 10)
  // Self-managed salons decline or miss more requests, and each one is refunded
  const refunded = Math.round(online * (salon.confirmMode === 'manual' ? 0.08 : 0.02))
  return { issued, online, walkIn: issued - online, done, noShow, cancelled, serviceValue: Math.round(done * ticket), paidBookings: online + refunded, refunds: refunded }
}

function liveDay(salon, rows, bookings) {
  const s = salonStats(rows)
  const today = isoDate()
  const refunded = bookings.filter((b) => b.salonId === salon.id && b.date === today && b.refunded).length
  return {
    issued: s.issued,
    online: s.online,
    walkIn: s.walkIn,
    done: s.done,
    noShow: s.noShow,
    cancelled: rows.filter((r) => r.status === 'cancelled').length,
    serviceValue: s.revenue,
    paidBookings: s.online + refunded,
    refunds: refunded,
  }
}

// rowsFor: today's token rows for a salon (useTokenRows); bookings: every booking in the store
export function salonDay(salon, date, rowsFor, bookings) {
  return date === isoDate() ? liveDay(salon, rowsFor(salon), bookings) : simulatedDay(salon, date)
}

export function addUp(list) {
  return list.reduce((acc, m) => Object.fromEntries(Object.keys(EMPTY).map((k) => [k, acc[k] + m[k]])), EMPTY)
}

export const feesOf = (m) => ({ gross: m.paidBookings * BOOKING_FEE, refunds: m.refunds * BOOKING_FEE, net: (m.paidBookings - m.refunds) * BOOKING_FEE })

export const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0)
