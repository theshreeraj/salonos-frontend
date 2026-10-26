import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { rupees, timeLabel } from '../../utils/format'
import { Pill, Sheet } from '../ui'
import ClientPicker from './ClientPicker'
import { useDesk } from './context'
import { APPT_STATUS, APPT_TONE, isBookable, toHHMM, toMins } from './logic'

// draft: { date, start, staffId } for a new booking, or an existing appointment to edit
export default function AppointmentSheet({ draft, onClose }) {
  const navigate = useNavigate()
  const { clients, services, staff, staffById, saveAppointment, setAppointmentStatus } = useDesk()
  const existing = draft.id ? draft : null
  const locked = existing && ['completed', 'cancelled', 'no-show'].includes(existing.status)

  const [clientId, setClientId] = useState(existing?.clientId ?? '')
  const [isNew, setIsNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [serviceIds, setServiceIds] = useState(existing?.serviceIds ?? [])
  const [anyStylist, setAnyStylist] = useState(existing?.anyStylist ?? false)
  const [staffId, setStaffId] = useState(existing?.staffId ?? draft.staffId ?? '')
  const [date, setDate] = useState(draft.date)
  const [time, setTime] = useState(toHHMM(draft.start))
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [error, setError] = useState('')

  const offered = services.filter((s) => s.active || serviceIds.includes(s.id))
  const chosen = services.filter((s) => serviceIds.includes(s.id))
  const mins = chosen.reduce((sum, s) => sum + s.mins, 0)
  const total = chosen.reduce((sum, s) => sum + s.price, 0)
  const toggle = (id) => setServiceIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const submit = async (e) => {
    e.preventDefault()
    if (isNew ? !newName.trim() || !newPhone.trim() : !clientId) return setError(isNew ? 'Enter the new client’s name and phone.' : 'Choose a client.')
    if (!serviceIds.length) return setError('Pick at least one service.')
    const result = await saveAppointment({
      id: existing?.id,
      clientId,
      newClient: isNew ? { name: newName, phone: newPhone } : null,
      staffId,
      anyStylist,
      serviceIds,
      date,
      start: toMins(time),
      notes,
    })
    if (result.error) return setError(result.error)
    onClose()
  }

  const act = (status) => {
    setAppointmentStatus(existing.id, status)
    onClose()
  }

  return (
    <Sheet title={existing ? 'Appointment' : 'New appointment'} onClose={onClose} wide>
      {existing && (
        <div className="appt-meta">
          <Pill tone={APPT_TONE[existing.status]}>{existing.invoiceId ? 'Paid' : APPT_STATUS[existing.status]}</Pill>
          <span className="muted small">
            Chair {existing.chair + 1} · with {staffById[existing.staffId]?.name}
            {existing.anyStylist && ' (any available)'}
          </span>
        </div>
      )}

      <form className="p-form" onSubmit={submit}>
        <div className="field">
          <span className="field-head">
            Client
            {!existing && (
              <button type="button" className="text-btn" onClick={() => setIsNew((v) => !v)}>
                {isNew ? 'Choose existing client' : '+ New client'}
              </button>
            )}
          </span>
          {isNew ? (
            <div className="p-form-row">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" aria-label="New client name" autoFocus />
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value.replace(/[^\d+ ]/g, ''))} inputMode="tel" placeholder="Mobile number" aria-label="New client mobile" />
            </div>
          ) : (
            <ClientPicker clients={clients} value={clientId} onChange={(id) => setClientId(id ?? '')} />
          )}
        </div>

        <div className="field">
          <span className="field-head">
            Services
            {chosen.length > 0 && (
              <span className="muted small">
                {mins} min · {rupees(total)}
              </span>
            )}
          </span>
          <div className="p-check-grid appt-services">
            {offered.map((s) => (
              <label key={s.id} className={`p-check ${serviceIds.includes(s.id) ? 'is-selected' : ''}`}>
                <input type="checkbox" checked={serviceIds.includes(s.id)} onChange={() => toggle(s.id)} disabled={locked} />
                <span>{s.name}</span>
                <span className="muted">{rupees(s.price)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="p-form-row appt-when">
          <label className="field">
            <span className="field-head">
              Stylist
              <label className="inline-check">
                <input type="checkbox" checked={anyStylist} onChange={(e) => setAnyStylist(e.target.checked)} disabled={locked} /> Any available
              </label>
            </span>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} disabled={anyStylist || locked}>
              <option value="">Choose stylist</option>
              {staff.filter((s) => isBookable(s) || s.id === staffId).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} disabled={locked} />
          </label>
          <label className="field">
            <span>Time</span>
            <input type="time" step={900} value={time} onChange={(e) => e.target.value && setTime(e.target.value)} disabled={locked} />
          </label>
        </div>

        <label className="field">
          <span>Notes</span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preferences, allergies, reference photos…" disabled={locked} />
        </label>

        {error && <p className="form-error">{error}</p>}

        {existing && !locked && (
          <div className="appt-actions">
            {existing.status === 'booked' && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => act('confirmed')}>
                Mark confirmed
              </button>
            )}
            <button type="button" className="btn btn-outline btn-sm" onClick={() => act('no-show')}>
              No-show
            </button>
            <button type="button" className="text-btn danger" onClick={() => act('cancelled')}>
              Cancel appointment
            </button>
          </div>
        )}

        <div className="p-form-foot">
          {existing && <span className="muted">{timeLabel(existing.start)} – {timeLabel(existing.start + existing.mins)}</span>}
          {existing && !existing.invoiceId && existing.status !== 'cancelled' && existing.status !== 'no-show' && (
            <button type="button" className="btn btn-outline" onClick={() => navigate(`/portal/checkout?appointment=${existing.id}`)}>
              Check out
            </button>
          )}
          {!locked && (
            <button type="submit" className="btn btn-primary">
              {existing ? 'Save changes' : 'Book appointment'}
            </button>
          )}
        </div>
      </form>
    </Sheet>
  )
}
