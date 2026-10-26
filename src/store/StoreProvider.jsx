import { useCallback, useEffect, useMemo, useState } from 'react'
import { ANY_STYLIST } from '../app/availability'
import { attempt, get, post, put, reportError } from '../api'
import { getSalon } from '../data/salons'
import { isoDate } from '../utils/format'
import { StoreContext } from './context'
import { defaultQueue, queueKey } from './queue'

// Live data comes from GET /api/live, polled while the page is visible. The server decides what each caller sees:
// customers get their own bookings plus anonymous slot occupancy, staff get their salons' bookings, walk-ins and marks.
const POLL_MS = 5000

const EMPTY = { queues: {}, bookingOpen: {}, bookings: [], mine: [], walkIns: {}, marks: {} }

export function StoreProvider({ children }) {
  const [state, setState] = useState(EMPTY)

  // On failure keep showing the last known state; the next poll retries
  const refresh = useCallback(
    () =>
      get('/live')
        .then(setState)
        .catch(() => {}),
    [],
  )

  useEffect(() => {
    refresh()
    const tick = () => document.visibilityState === 'visible' && refresh()
    const id = setInterval(tick, POLL_MS)
    // Signing in or out changes which bookings this browser may see
    window.addEventListener('salonos:auth', refresh)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      window.removeEventListener('salonos:auth', refresh)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [refresh])

  // Runs an action, then reloads live data. Reports failures and resolves to null.
  const act = useCallback(
    async (promise) => {
      const result = await attempt(promise)
      await refresh()
      return result
    },
    [refresh],
  )

  const getQueue = useCallback(
    (salonId, date = isoDate()) => state.queues[queueKey(salonId, date)] ?? defaultQueue(getSalon(salonId), date),
    [state.queues],
  )

  const isBookingOpen = useCallback((salonId) => state.bookingOpen[salonId] !== false, [state.bookingOpen])

  // Throws ApiError so checkout screens can tell "slot taken" (data.code === 'slot-taken') from other failures
  const bookToken = useCallback(
    async ({ salonId, date, services, stylist, method, slot = null, anyStylist = false }) => {
      const booking = await post('/bookings', {
        salonId,
        date,
        slot,
        method,
        serviceIds: services.map((s) => s.id),
        stylist: anyStylist || stylist === 'Any available' ? ANY_STYLIST : stylist,
      })
      await refresh()
      return booking
    },
    [refresh],
  )

  const cancelBooking = useCallback((id) => act(post(`/bookings/${id}/cancel`)), [act])
  const respondToProposal = useCallback((id, accept) => act(post(`/bookings/${id}/respond`, { accept })), [act])

  // ---- Self-managed salon actions (stylist app) ----

  const acceptRequest = useCallback((id) => act(post(`/bookings/${id}/accept`)), [act])
  const declineRequest = useCallback((id, reason) => act(post(`/bookings/${id}/decline`, { reason })), [act])
  const proposeTime = useCallback((id, proposal) => act(post(`/bookings/${id}/propose`, proposal)), [act])
  const setBookingOpen = useCallback((salonId, open) => act(put(`/salons/${salonId}/booking-open`, { open })), [act])

  // ---- Front desk actions (salon portal) ----

  const callNext = useCallback((salonId, date = isoDate()) => act(post(`/salons/${salonId}/queue/call-next`, { date })), [act])
  const markNoShow = useCallback((salonId, token, date = isoDate()) => act(post(`/salons/${salonId}/queue/no-show`, { token, date })), [act])

  // Resolves to the token issued, or null if it failed
  const addWalkIn = useCallback(
    async (salonId, walkIn, date = isoDate()) => {
      try {
        const { token } = await post(`/salons/${salonId}/queue/walk-ins`, { ...walkIn, date })
        await refresh()
        return token
      } catch (err) {
        reportError(err)
        return null
      }
    },
    [refresh],
  )

  const value = useMemo(
    () => ({
      bookings: state.mine,
      allBookings: state.bookings,
      walkIns: state.walkIns,
      marks: state.marks,
      refresh,
      getQueue,
      isBookingOpen,
      bookToken,
      cancelBooking,
      acceptRequest,
      declineRequest,
      proposeTime,
      respondToProposal,
      setBookingOpen,
      callNext,
      markNoShow,
      addWalkIn,
    }),
    [state, refresh, getQueue, isBookingOpen, bookToken, cancelBooking, acceptRequest, declineRequest, proposeTime, respondToProposal, setBookingOpen, callNext, markNoShow, addWalkIn],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
