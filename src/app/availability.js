// Which appointment times to offer. The API serves each day's calendar (GET /salons/:id/availability) and re-checks
// every booking; this only turns that calendar into free slots and stylists for the picker. Rules come from /api/config.
import { BOOKING } from '../data/config'
import { addDays, isoDate } from '../utils/format'

export const ANY_STYLIST = 'any'

const blocks = (mins) => Math.max(1, Math.ceil(mins / BOOKING.slotMins))

export const durationOf = (services) => services.reduce((sum, s) => sum + s.mins, 0)

// Every bookable start time for a day, as minutes after midnight. Today hides slots starting in the next 15 minutes.
export function daySlots(salon, date, now = new Date()) {
  const [open, close] = salon.hours
  const earliest = date === isoDate(now) ? now.getHours() * 60 + now.getMinutes() + 15 : 0
  const slots = []
  for (let m = open * 60; m < close * 60; m += BOOKING.slotMins) if (m >= earliest) slots.push(m)
  return slots
}

// stylist name → Set of block starts that can't be booked, from a calendar served by the API.
// Blocks where every chair is taken are busy for everyone. No calendar yet (still loading) = nothing busy.
export function busyMap(salon, calendar) {
  const full = calendar?.full ?? []
  return new Map(salon.stylists.map((p) => [p.name, new Set([...(calendar?.stylists?.[p.name] ?? []), ...full])]))
}

// Stylists who can take the whole appointment starting at `slot` and still finish before closing
export function freeStylists(salon, slot, mins, busy) {
  if (slot + mins > salon.hours[1] * 60) return []
  return salon.stylists.filter((p) => {
    const taken = busy.get(p.name)
    for (let i = 0; i < blocks(mins); i++) if (taken?.has(slot + i * BOOKING.slotMins)) return false
    return true
  })
}

export const bookableDates = (today = isoDate()) => Array.from({ length: BOOKING.bookingDays }, (_, i) => addDays(today, i))
