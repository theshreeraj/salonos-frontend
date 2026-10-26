import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { attempt, get, patch, post } from '../../api'
import { getSalon } from '../../data/salons'
import { usePortal } from '../context'
import { SALON_META } from '../data'
import { Empty } from '../ui'
import { DeskContext } from './context'
import { isLive } from './logic'

// Inserts or replaces a record (by id) in one of the desk lists
const upsert = (list, doc) => (list.some((x) => x.id === doc.id) ? list.map((x) => (x.id === doc.id ? doc : x)) : [...list, doc])

// Back office for the front desk's salon, loaded from GET /api/desk. The API enforces the rules
// (double-booking, leave, chairs, stock); each action updates local state from the record it returns.
export function DeskProvider({ salonId, children }) {
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const load = useCallback(
    () =>
      get('/desk')
        .then(setData)
        .catch((err) => setLoadError(err.message)),
    [],
  )

  useEffect(() => {
    load()
  }, [load])

  const put = useCallback((key, doc) => setData((d) => ({ ...d, [key]: upsert(d[key], doc) })), [])
  // Runs a request; on success stores the returned record under `key` and resolves to it
  const save = useCallback(
    async (key, request) => {
      const doc = await attempt(request)
      if (doc) put(key, doc)
      return doc
    },
    [put],
  )

  // ---- Clients ----

  const addClient = useCallback((fields) => save('clients', post('/desk/clients', fields)), [save])
  const updateClient = useCallback((id, changes) => save('clients', patch(`/desk/clients/${id}`, changes)), [save])
  const addClientNote = useCallback((id, note) => save('clients', post(`/desk/clients/${id}/notes`, note)), [save])

  // ---- Appointments ----

  // Resolves to { appointment } or { error } so the booking sheet can show why a slot can't be taken
  const saveAppointment = useCallback(
    async (fields) => {
      try {
        const { appointment } = await post('/desk/appointments', fields)
        put('appointments', appointment)
        if (fields.newClient) await load()
        return { appointment }
      } catch (err) {
        return { error: err.message }
      }
    },
    [put, load],
  )

  const setAppointmentStatus = useCallback((id, status) => save('appointments', patch(`/desk/appointments/${id}/status`, { status })), [save])

  // ---- Checkout ----

  // Stock, loyalty points, the appointment and pending bills all change, so everything reloads afterwards
  const checkout = useCallback(
    async (bill) => {
      const invoice = await attempt(post('/desk/checkout', bill))
      if (invoice) await load()
      return invoice
    },
    [load],
  )

  // Queue customers who left the chair without paying yet ("bill later")
  const addPendingBill = useCallback((bill) => save('pendingBills', post('/desk/pending-bills', bill)), [save])

  // ---- Team & catalogue ----

  const saveStaff = useCallback((fields, id) => save('staff', id ? patch(`/desk/staff/${id}`, fields) : post('/desk/staff', fields)), [save])
  const setStaffActive = useCallback((id, active) => save('staff', patch(`/desk/staff/${id}`, { active })), [save])

  // Services and products are archived, not deleted, so past bookings and invoices keep their names
  const saveService = useCallback((fields, id) => save('services', id ? patch(`/desk/services/${id}`, fields) : post('/desk/services', fields)), [save])
  const removeService = useCallback((id) => save('services', patch(`/desk/services/${id}`, { active: false })), [save])
  const saveProduct = useCallback((fields, id) => save('products', id ? patch(`/desk/products/${id}`, fields) : post('/desk/products', fields)), [save])
  const removeProduct = useCallback((id) => save('products', patch(`/desk/products/${id}`, { active: false })), [save])

  // ---- People ops ----

  const clockIn = useCallback((staffId) => save('attendance', post('/desk/attendance', { staffId })), [save])
  const clockOut = useCallback((entryId) => save('attendance', post(`/desk/attendance/${entryId}/out`)), [save])
  const addLeave = useCallback((fields) => save('leave', post('/desk/leave', fields)), [save])
  const setLeaveStatus = useCallback((id, status) => save('leave', patch(`/desk/leave/${id}`, { status })), [save])

  const value = useMemo(() => {
    if (!data) return null
    const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]))
    return {
      salon: getSalon(salonId),
      chairs: SALON_META[salonId].chairs,
      ...data,
      staffById: byId(data.staff),
      clientById: byId(data.clients),
      serviceById: byId(data.services),
      liveAppointments: data.appointments.filter(isLive),
      pendingBills: data.pendingBills ?? [],
      reload: load,
      addClient,
      updateClient,
      addClientNote,
      saveAppointment,
      setAppointmentStatus,
      checkout,
      addPendingBill,
      saveStaff,
      setStaffActive,
      saveService,
      removeService,
      saveProduct,
      removeProduct,
      clockIn,
      clockOut,
      addLeave,
      setLeaveStatus,
    }
  }, [salonId, data, load, addClient, updateClient, addClientNote, saveAppointment, setAppointmentStatus, checkout, addPendingBill, saveStaff, setStaffActive, saveService, removeService, saveProduct, removeProduct, clockIn, clockOut, addLeave, setLeaveStatus])

  if (!value) {
    return loadError ? (
      <Empty icon="info" title="Couldn't load the back office">
        <p className="muted">{loadError}</p>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setLoadError(null) || load()}>
          Try again
        </button>
      </Empty>
    ) : (
      <div className="p-loading">
        <span className="spinner" aria-label="Loading" />
      </div>
    )
  }
  return <DeskContext.Provider value={value}>{children}</DeskContext.Provider>
}

// Route element for every front desk back-office page
export function DeskShell() {
  const { user } = usePortal()
  return (
    <DeskProvider key={user.salonId} salonId={user.salonId}>
      <Outlet />
    </DeskProvider>
  )
}
