import { useStore } from '../store/context'
import { usePortal } from './context'
import { salonStats } from './data'
import { useAlerts } from './alerts'
import { useScopedAgents, useScopedOnboardings, useScopedSalons, useTokenRows } from './hooks'

// Counts shown next to manager/admin nav items
export function useNavBadges() {
  const { suspended } = usePortal()
  const { isBookingOpen } = useStore()
  const rowsFor = useTokenRows()
  const salons = useScopedSalons()
  const alerts = useAlerts()
  const pending = useScopedOnboardings().filter((a) => a.status === 'pending').length
  const waiting = salons.filter((s) => !suspended[s.id]).reduce((sum, s) => sum + salonStats(rowsFor(s)).waiting, 0)
  const urgent = alerts.filter((a) => a.severity !== 'info').length
  return {
    waiting: { value: waiting, tone: 'amber' },
    salons: { value: salons.length },
    approvals: { value: pending, tone: pending ? 'amber' : null },
    agents: { value: useScopedAgents().length },
    alerts: { value: urgent, tone: alerts.some((a) => a.severity === 'critical') ? 'red' : 'amber' },
    paused: { value: salons.filter((s) => !isBookingOpen(s.id)).length },
  }
}
