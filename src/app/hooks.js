import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { get } from '../api'
import { getSalon } from '../data/salons'
import { useStore } from '../store/context'
import { BOOKING } from '../data/config'
import { busyMap, durationOf } from './availability'
import { useApp } from './context'

export const initials = (name) =>
  name
    .replace(/^Dr\.\s*/, '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')

// Matches the "Top rated" badge in the designs
export const isTopRated = (stylist) => stylist.years >= 10

// The salon and selections for the booking in progress on /app/book/:id/*
export function useBooking() {
  const { id } = useParams()
  const { draft } = useApp()
  const salon = getSalon(id)
  const services = useMemo(() => (salon ? salon.services.filter((s) => draft.serviceIds.includes(s.id)) : []), [salon, draft.serviceIds])
  // Steps in order: stylist → services → time. Each later step needs the earlier ones.
  const started = Boolean(salon) && draft.salonId === id
  const hasStylist = started && Boolean(draft.stylist)
  const valid = hasStylist && services.length > 0
  return { salon, draft, services, duration: durationOf(services), started, hasStylist, valid }
}

const CALENDAR_POLL_MS = 15000

// The salon's free-time calendars from the API (date → { stylists, full }), the same ones it checks bookings against.
// Refetched every 15 s and whenever live data changes (someone booked or cancelled). Null until the first load.
export function useCalendars(salonId, days = BOOKING.bookingDays) {
  const { allBookings } = useStore()
  const [loaded, setLoaded] = useState({ salonId: null, calendars: null })
  // A new array arrives with every live poll; refetch only when a booking actually appeared, moved or closed
  const bookingsVersion = useMemo(() => allBookings.map((b) => `${b.id}:${b.status}:${b.date}:${b.slot}`).join('|'), [allBookings])

  useEffect(() => {
    if (!salonId) return undefined
    let current = true
    const load = () =>
      get(`/salons/${salonId}/availability?days=${days}`)
        .then((calendars) => current && setLoaded({ salonId, calendars }))
        .catch(() => {})
    load()
    const id = setInterval(() => document.visibilityState === 'visible' && load(), CALENDAR_POLL_MS)
    return () => {
      current = false
      clearInterval(id)
    }
  }, [salonId, days, bookingsVersion])

  return loaded.salonId === salonId ? loaded.calendars : null
}

export function useBusy(salon, date) {
  const calendars = useCalendars(salon?.id)
  return useMemo(() => (salon && date ? busyMap(salon, calendars?.[date]) : new Map()), [salon, date, calendars])
}
