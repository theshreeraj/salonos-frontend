import { useEffect, useState } from 'react'
import { SALONS, getSalon } from '../data/salons'
import { useStore } from '../store/context'
import { ROLES, SALON_META, SOLO_NAV, districtName, tokensFor } from './data'
import { usePortal } from './context'
import { addUp, salonDay } from './network'

const isSolo = (user) => user.role === 'stylist' && getSalon(user.salonId)?.confirmMode === 'manual'

export const homeFor = (user) => (isSolo(user) ? '/portal/solo' : ROLES[user.role].home)
export const navFor = (user) => (isSolo(user) ? SOLO_NAV : ROLES[user.role].nav)

export function scopeLabel(user) {
  if (user.salonId) return getSalon(user.salonId)?.name
  if (user.district) return districtName(user.district)
  return 'All districts'
}

// Salons the signed-in user is allowed to see
export function useScopedSalons() {
  const { user } = usePortal()
  const withMeta = SALONS.map((s) => ({ ...s, meta: SALON_META[s.id] }))
  if (!user) return []
  if (user.role === 'admin') return withMeta
  if (user.role === 'manager') return withMeta.filter((s) => s.meta.district === user.district)
  if (user.role === 'agent') return withMeta.filter((s) => s.meta.agentId === user.id)
  return withMeta.filter((s) => s.id === user.salonId)
}

// Onboarding applications the signed-in user is allowed to see
export function useScopedOnboardings() {
  const { user, onboardings } = usePortal()
  if (!user) return []
  if (user.role === 'admin') return onboardings
  if (user.role === 'manager') return onboardings.filter((o) => o.district === user.district)
  if (user.role === 'agent') return onboardings.filter((o) => o.agentId === user.id)
  return []
}

// The signed-in agent's leads
export function useMyLeads() {
  const { user, leads } = usePortal()
  return user ? leads.filter((l) => l.agentId === user.id) : []
}

// Returns a function that lists today's tokens for a salon
export function useTokenRows() {
  const { allBookings, walkIns, marks, getQueue } = useStore()
  return (salon) => tokensFor(salon, { queue: getQueue(salon.id), bookings: allBookings, walkIns, marks })
}

// Field agents the signed-in manager or admin oversees
export function useScopedAgents() {
  const { user, users } = usePortal()
  if (!user) return []
  return users.filter((u) => u.role === 'agent' && (user.role === 'admin' || u.district === user.district))
}

// Leads belonging to agents in scope
export function useScopedLeads() {
  const { leads } = usePortal()
  const agentIds = new Set(useScopedAgents().map((a) => a.id))
  return leads.filter((l) => agentIds.has(l.agentId))
}

// Summed metrics per salon over a list of dates
export function useSalonMetrics(salons, dates) {
  const { allBookings } = useStore()
  const rowsFor = useTokenRows()
  return salons.map((salon) => ({ salon, ...addUp(dates.map((d) => salonDay(salon, d, rowsFor, allBookings))) }))
}

// Current time that re-renders on an interval, so time-based checks stay pure during render
export function useNow(intervalMs = 15000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
