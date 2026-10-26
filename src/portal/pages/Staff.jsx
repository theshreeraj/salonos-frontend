import { useState } from 'react'
import Icon from '../../components/Icon'
import { rupees, timeLabel } from '../../utils/format'
import { useDesk } from '../desk/context'
import { STAFF_COLORS, STAFF_ROLES, WEEKDAYS, toMins } from '../desk/logic'
import { Avatar, PageHeader, Pill, Sheet } from '../ui'

export default function Staff() {
  const { staff, setStaffActive } = useDesk()
  const [editing, setEditing] = useState(undefined)
  const active = staff.filter((s) => s.active)

  return (
    <>
      <PageHeader title="Staff" sub={`${active.length} active · ${active.filter((s) => s.role !== 'frontdesk').length} take bookings`}>
        <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
          <Icon name="plus" size={18} /> Add staff
        </button>
      </PageHeader>

      <div className="p-table-wrap">
        <table className="p-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Shift</th>
              <th className="num">Salary</th>
              <th className="num">Commission</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className={s.active ? '' : 'is-muted'}>
                <td>
                  <span className="p-person">
                    <Avatar name={s.name} color={s.color} size={32} />
                    <span>
                      <strong>{s.name}</strong>
                      <span className="muted small d-block">{s.title}</span>
                    </span>
                  </span>
                </td>
                <td className="muted">{s.email}</td>
                <td>{STAFF_ROLES[s.role]}</td>
                <td>
                  {timeLabel(toMins(s.shiftStart))} – {timeLabel(toMins(s.shiftEnd))}
                  <span className="muted small d-block">{s.offDays.length ? `Off ${s.offDays.map((d) => WEEKDAYS[d]).join(', ')}` : 'No weekly off'}</span>
                </td>
                <td className="num">{rupees(s.salary)}</td>
                <td className="num">{s.commission}%</td>
                <td>
                  <Pill tone={s.active ? 'green' : 'gray'}>{s.active ? 'Active' : 'Inactive'}</Pill>
                </td>
                <td className="num">
                  <span className="row-actions">
                    <button type="button" className="text-btn link" onClick={() => setEditing(s)}>
                      Edit
                    </button>
                    <button type="button" className="text-btn" onClick={() => setStaffActive(s.id, !s.active)}>
                      {s.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing !== undefined && <StaffSheet member={editing} onClose={() => setEditing(undefined)} />}
    </>
  )
}

function StaffSheet({ member, onClose }) {
  const { saveStaff, staff } = useDesk()
  const [form, setForm] = useState(
    member ?? {
      name: '',
      email: '',
      phone: '',
      role: 'stylist',
      title: 'Stylist',
      color: STAFF_COLORS[staff.length % STAFF_COLORS.length],
      salary: 18000,
      commission: 10,
      shiftStart: '10:00',
      shiftEnd: '19:00',
      offDays: [2],
    },
  )
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const toggleDay = (d) => set({ offDays: form.offDays.includes(d) ? form.offDays.filter((x) => x !== d) : [...form.offDays, d].sort() })

  return (
    <Sheet title={member ? 'Edit staff member' : 'Add staff member'} onClose={onClose} wide>
      <form
        className="p-form"
        onSubmit={(e) => {
          e.preventDefault()
          saveStaff({ ...form, name: form.name.trim(), email: form.email.trim().toLowerCase() }, member?.id)
          onClose()
        }}
      >
        <div className="p-form-row">
          <label className="field">
            <span>Full name</span>
            <input value={form.name} onChange={(e) => set({ name: e.target.value })} required autoFocus />
          </label>
          <label className="field">
            <span>Job title</span>
            <input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Senior stylist" />
          </label>
        </div>
        <div className="p-form-row">
          <label className="field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} required />
          </label>
          <label className="field">
            <span>Mobile</span>
            <input inputMode="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
          </label>
        </div>
        <div className="p-form-row">
          <label className="field">
            <span>Role</span>
            <select value={form.role} onChange={(e) => set({ role: e.target.value })}>
              {Object.entries(STAFF_ROLES).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="p-form-row">
            <label className="field">
              <span>Salary / month (₹)</span>
              <input type="number" min={0} step={500} value={form.salary} onChange={(e) => set({ salary: Number(e.target.value) })} />
            </label>
            <label className="field">
              <span>Commission %</span>
              <input type="number" min={0} max={100} value={form.commission} onChange={(e) => set({ commission: Number(e.target.value) })} />
            </label>
          </div>
        </div>
        <div className="p-form-row">
          <label className="field">
            <span>Shift starts</span>
            <input type="time" value={form.shiftStart} onChange={(e) => set({ shiftStart: e.target.value })} required />
          </label>
          <label className="field">
            <span>Shift ends</span>
            <input type="time" value={form.shiftEnd} onChange={(e) => set({ shiftEnd: e.target.value })} required />
          </label>
        </div>
        <div className="field">
          <span>Weekly off</span>
          <div className="chips">
            {WEEKDAYS.map((label, d) => (
              <button key={label} type="button" className={`chip ${form.offDays.includes(d) ? 'is-active' : ''}`} onClick={() => toggleDay(d)} aria-pressed={form.offDays.includes(d)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Calendar colour</span>
          <div className="swatches">
            {STAFF_COLORS.map((c) => (
              <button key={c} type="button" className={`swatch av-${c} ${form.color === c ? 'is-active' : ''}`} onClick={() => set({ color: c })} aria-label={c} aria-pressed={form.color === c} />
            ))}
          </div>
        </div>
        <div className="p-form-foot">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </form>
    </Sheet>
  )
}
