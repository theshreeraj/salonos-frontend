// Health checks across the salons, approvals and agents in scope.
// Each alert links to the page where it can be fixed.
import { useStore } from '../store/context'
import { addDays, isOpenNow, isoDate, rupees, waitLabel } from '../utils/format'
import { usePortal } from './context'
import { salonStats } from './data'
import { useNow, useScopedAgents, useScopedLeads, useScopedOnboardings, useScopedSalons, useSalonMetrics, useTokenRows } from './hooks'
import { daysBetween, followUpState, historyOf, leadStatus } from './leads'
import { pct, rangeDates } from './network'

export const SEVERITY = {
  critical: { label: 'Critical', tone: 'red', rank: 0 },
  warning: { label: 'Warning', tone: 'amber', rank: 1 },
  info: { label: 'Info', tone: 'blue', rank: 2 },
}

const LONG_QUEUE_MINS = 90
const NO_SHOW_LIMIT = 8
const APPROVAL_SLA_DAYS = 2
const LOW_RATING = 4.5

export function useAlerts() {
  const { suspended, onboardings, users } = usePortal()
  const { allBookings, isBookingOpen } = useStore()
  const rowsFor = useTokenRows()
  const salons = useScopedSalons()
  const applications = useScopedOnboardings()
  const agents = useScopedAgents()
  const leads = useScopedLeads()
  const today = isoDate()
  const week = useSalonMetrics(salons, rangeDates(today, 7))
  const now = useNow()
  const alerts = []
  const add = (a) => alerts.push(a)
  const agentName = (id) => users.find((u) => u.id === id)?.name ?? 'An agent'

  for (const a of applications.filter((x) => x.status === 'pending')) {
    const waited = daysBetween(historyOf(a).at(-1).at, today)
    if (waited >= APPROVAL_SLA_DAYS) {
      add({ id: `sla-${a.id}`, severity: 'critical', category: 'Approvals', title: `${a.name} has waited ${waited} days for approval`, detail: `Submitted by ${agentName(a.agentId)} · target is under ${APPROVAL_SLA_DAYS} days`, to: '/portal/approvals', action: 'Review' })
    }
  }

  for (const s of salons) {
    if (suspended[s.id]) {
      add({ id: `sus-${s.id}`, severity: 'info', category: 'Salons', title: `${s.name} is suspended`, detail: 'Hidden from the customer app', to: '/portal/salons', action: 'Manage' })
      continue
    }
    if (!isBookingOpen(s.id)) {
      add({ id: `pause-${s.id}`, severity: 'warning', category: 'Bookings', title: `${s.name} has paused online bookings`, detail: 'Customers can only walk in', to: '/portal/live', action: 'Open monitor' })
    }
    const live = salonStats(rowsFor(s))
    const wait = live.waiting * s.avgMins
    if (isOpenNow(s.hours) && wait > LONG_QUEUE_MINS) {
      add({ id: `queue-${s.id}`, severity: 'warning', category: 'Queues', title: `Long queue at ${s.name}`, detail: `${live.waiting} waiting · ${waitLabel(wait)} to clear`, to: '/portal/live', action: 'Open monitor' })
    }
    if (s.confirmMode === 'manual') {
      const mine = allBookings.filter((b) => b.salonId === s.id)
      const expiring = mine.filter((b) => b.status === 'requested' && b.respondBy - now < 2 * 60 * 1000).length
      const expired = mine.filter((b) => b.status === 'expired' && b.date === today).length
      if (expiring) add({ id: `exp-${s.id}`, severity: 'warning', category: 'Bookings', title: `${expiring} booking ${expiring === 1 ? 'request' : 'requests'} about to expire at ${s.name}`, detail: 'The stylist has under 2 minutes to answer', to: '/portal/live', action: 'Open monitor' })
      if (expired) add({ id: `missed-${s.id}`, severity: 'warning', category: 'Bookings', title: `${s.name} missed ${expired} ${expired === 1 ? 'request' : 'requests'} today`, detail: `Each was refunded · ${rupees(expired * 20)} lost in fees`, to: '/portal/fees', action: 'See fees' })
    }
    const m = week.find((w) => w.salon.id === s.id)
    const noShow = pct(m.noShow, m.issued)
    if (m.issued > 20 && noShow > NO_SHOW_LIMIT) {
      add({ id: `ns-${s.id}`, severity: 'warning', category: 'Quality', title: `High no-shows at ${s.name}`, detail: `${noShow}% of tokens in the last 7 days`, to: '/portal/overview', action: 'View metrics' })
    }
    if (s.reviews > 0 && s.rating < LOW_RATING) {
      add({ id: `rating-${s.id}`, severity: 'info', category: 'Quality', title: `${s.name} is rated ${s.rating}`, detail: `Below the ${LOW_RATING} network target`, to: '/portal/salons', action: 'View salon' })
    }
  }

  for (const agent of agents) {
    const mine = leads.filter((l) => l.agentId === agent.id)
    const overdue = mine.filter((l) => ['new', 'contacted', 'interested'].includes(leadStatus(l, onboardings)) && followUpState(l.nextFollowUp, today) === 'overdue').length
    if (overdue >= 2) add({ id: `od-${agent.id}`, severity: 'warning', category: 'Agents', title: `${agent.name} has ${overdue} overdue follow-ups`, detail: 'Leads going cold', to: `/portal/agents?open=${agent.id}`, action: 'View agent' })
    const untouched = mine.filter((l) => l.stage === 'new' && !l.activities.length && l.createdAt <= addDays(today, -3)).length
    if (untouched) add({ id: `new-${agent.id}`, severity: 'info', category: 'Agents', title: `${agent.name} hasn't contacted ${untouched} ${untouched === 1 ? 'lead' : 'leads'} in 3+ days`, detail: 'New leads with no calls or visits logged', to: `/portal/agents?open=${agent.id}`, action: 'View agent' })
  }

  for (const a of applications.filter((x) => x.status === 'rejected')) {
    const since = a.reviewedAt ? daysBetween(a.reviewedAt, today) : 0
    if (since >= 3) add({ id: `rej-${a.id}`, severity: 'info', category: 'Approvals', title: `${a.name} not resubmitted for ${since} days`, detail: `Sent back to ${agentName(a.agentId)}`, to: '/portal/pipeline', action: 'View pipeline' })
  }

  return alerts.sort((a, b) => SEVERITY[a.severity].rank - SEVERITY[b.severity].rank)
}
