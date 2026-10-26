import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { getSalon } from '../data/salons'
import { useStore } from '../store/context'
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

export function useBusy(salon, date) {
  const { allBookings } = useStore()
  return useMemo(() => (salon && date ? busyMap(salon, date, allBookings) : new Map()), [salon, date, allBookings])
}
