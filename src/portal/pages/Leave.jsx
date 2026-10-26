import { useState } from 'react'
import Icon from '../../components/Icon'
import { addDays, isoDate, shortDate } from '../../utils/format'
import { useDesk } from '../desk/context'
import { LEAVE_TONE, LEAVE_TYPES, leaveDays } from '../desk/logic'
import { Avatar, Empty, PageHeader, Pill, Sheet } from '../ui'

const FILTERS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', all: 'All' }

export default function Leave() {
  const { leave, staffById, setLeaveStatus } = useDesk()
  const [filter, setFilter] = useState('pending')
  const [adding, setAdding] = useState(false)

  const list = leave.filter((l) => filter === 'all' || l.status === filter).sort((a, b) => b.from.localeCompare(a.from))
  const today = isoDate()
  const awayToday = leave.filter((l) => l.status === 'approved' && l.from <= today && today <= l.to)

  return (
    <>
      <PageHeader title="Leave requests" sub={awayToday.length ? `Away today: ${awayToday.map((l) => staffById[l.staffId]?.name).join(', ')}` : 'Everyone is in today'}>
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
          <Icon name="plus" size={18} /> Log leave
        </button>
      </PageHeader>

      <div className="p-toolbar">
        <div className="chips">
          {Object.entries(FILTERS).map(([id, label]) => (
            <button key={id} type="button" className={`chip ${filter === id ? 'is-active' : ''}`} onClick={() => setFilter(id)}>
              {label}
              <span className="chip-count">{leave.filter((l) => id === 'all' || l.status === id).length}</span>
            </button>
          ))}
        </div>
      </div>

      {list.length ? (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Reason</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((l) => {
                const s = staffById[l.staffId]
                return (
                  <tr key={l.id}>
                    <td>
                      <span className="p-person">
                        <Avatar name={s?.name ?? '?'} color={s?.color} size={30} />
                        <strong>{s?.name ?? 'Former staff'}</strong>
                      </span>
                    </td>
                    <td>{LEAVE_TYPES[l.type]}</td>
                    <td>
                      {l.from === l.to ? shortDate(l.from) : `${shortDate(l.from)} – ${shortDate(l.to)}`}
                      <span className="muted"> ({leaveDays(l)}d)</span>
                    </td>
                    <td className="muted">{l.reason || '—'}</td>
                    <td>
                      <Pill tone={LEAVE_TONE[l.status]}>{l.status[0].toUpperCase() + l.status.slice(1)}</Pill>
                    </td>
                    <td className="num">
                      {l.status === 'pending' && (
                        <span className="row-actions">
                          <button type="button" className="btn btn-xs btn-approve" onClick={() => setLeaveStatus(l.id, 'approved')}>
                            <Icon name="check" size={14} strokeWidth={2.2} /> Approve
                          </button>
                          <button type="button" className="text-btn" onClick={() => setLeaveStatus(l.id, 'rejected')}>
                            <Icon name="x" size={14} /> Reject
                          </button>
                        </span>
                      )}
                      {l.status === 'approved' && l.from > today && (
                        <button type="button" className="text-btn" onClick={() => setLeaveStatus(l.id, 'cancelled')}>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon="calendarX" title="No requests here">
          <p className="muted">Leave logged for your team will appear here.</p>
        </Empty>
      )}

      {adding && <LeaveSheet onClose={() => setAdding(false)} />}
    </>
  )
}

function LeaveSheet({ onClose }) {
  const { staff, addLeave } = useDesk()
  const people = staff.filter((s) => s.active)
  const [staffId, setStaffId] = useState(people[0]?.id ?? '')
  const [type, setType] = useState('sick')
  const [from, setFrom] = useState(isoDate())
  const [to, setTo] = useState(isoDate())
  const [reason, setReason] = useState('')

  return (
    <Sheet title="Log leave" onClose={onClose}>
      <form
        className="p-form"
        onSubmit={(e) => {
          e.preventDefault()
          addLeave({ staffId, type, from, to: to < from ? from : to, reason: reason.trim() })
          onClose()
        }}
      >
        <label className="field">
          <span>Staff member</span>
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            {people.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(LEAVE_TYPES).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="p-form-row">
          <label className="field">
            <span>From</span>
            <input type="date" value={from} min={addDays(isoDate(), -30)} onChange={(e) => e.target.value && setFrom(e.target.value)} required />
          </label>
          <label className="field">
            <span>To</span>
            <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} required />
          </label>
        </div>
        <label className="field">
          <span>Reason</span>
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <div className="p-form-foot">
          <span className="muted">Goes to the pending list for approval</span>
          <button type="submit" className="btn btn-primary">
            Submit
          </button>
        </div>
      </form>
    </Sheet>
  )
}
