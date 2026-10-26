import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { isoDate, rupees, shortDate, timeLabel } from '../../utils/format'
import { useDesk } from '../desk/context'
import { APPT_STATUS, APPT_TONE, PAYMENT_METHODS, dateOf } from '../desk/logic'
import { Avatar, Drawer, Empty, PageHeader, Pill, Sheet, Tabs } from '../ui'

export default function Clients() {
  const { clients, appointments, invoices } = useDesk()
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState(null)
  const [adding, setAdding] = useState(false)

  const stats = useMemo(() => {
    const today = isoDate()
    const map = {}
    for (const c of clients) map[c.id] = { visits: 0, spend: 0, last: null, next: null }
    for (const a of appointments) {
      const s = map[a.clientId]
      if (!s) continue
      if (a.status === 'completed') {
        s.visits += 1
        if (!s.last || a.date > s.last) s.last = a.date
      } else if ((a.status === 'booked' || a.status === 'confirmed') && a.date >= today && (!s.next || a.date < s.next)) s.next = a.date
    }
    for (const inv of invoices) if (map[inv.clientId]) map[inv.clientId].spend += inv.total
    return map
  }, [clients, appointments, invoices])

  const q = query.trim().toLowerCase()
  const list = clients
    .filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <PageHeader title="Clients" sub={`${clients.length} clients on file`}>
        <label className="p-search">
          <Icon name="search" size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, phone or email" aria-label="Search clients" />
        </label>
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
          <Icon name="plus" size={18} /> Add client
        </button>
      </PageHeader>

      {list.length ? (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th className="num">Visits</th>
                <th>Last visit</th>
                <th className="num">Lifetime spend</th>
                <th className="num">Loyalty points</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="is-clickable" onClick={() => setOpenId(c.id)}>
                  <td>
                    <span className="p-person">
                      <Avatar name={c.name} size={32} />
                      <strong>{c.name}</strong>
                    </span>
                  </td>
                  <td>{c.phone || '—'}</td>
                  <td className="muted">{c.email || '—'}</td>
                  <td className="num">{stats[c.id].visits}</td>
                  <td>{stats[c.id].last ? shortDate(stats[c.id].last) : '—'}</td>
                  <td className="num">{rupees(stats[c.id].spend)}</td>
                  <td className="num">{c.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon="users" title="No clients match">
          <p className="muted">Try another name or phone number.</p>
        </Empty>
      )}

      {adding && <AddClientSheet onClose={() => setAdding(false)} onAdded={(c) => setOpenId(c.id)} />}
      {openId && <ClientDrawer clientId={openId} onClose={() => setOpenId(null)} />}
    </>
  )
}

function AddClientSheet({ onClose, onAdded }) {
  const { addClient, clients } = useDesk()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const duplicate = phone.length >= 10 && clients.find((c) => c.phone === phone)

  return (
    <Sheet title="Add client" onClose={onClose}>
      <form
        className="p-form"
        onSubmit={async (e) => {
          e.preventDefault()
          const client = await addClient({ name, phone, email })
          if (!client) return
          onAdded(client)
          onClose()
        }}
      >
        <label className="field">
          <span>Full name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>
        <label className="field">
          <span>Mobile</span>
          <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} required minLength={10} />
        </label>
        {duplicate && <p className="form-error">{duplicate.name} already uses this number.</p>}
        <label className="field">
          <span>Email (optional)</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <div className="p-form-foot">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={Boolean(duplicate)}>
            Add client
          </button>
        </div>
      </form>
    </Sheet>
  )
}

const TABS = [
  { id: 'appointments', label: 'Appointments' },
  { id: 'notes', label: 'Notes' },
  { id: 'purchases', label: 'Purchases' },
]

function ClientDrawer({ clientId, onClose }) {
  const navigate = useNavigate()
  const { clientById, appointments, invoices, staffById, serviceById, addClientNote } = useDesk()
  const client = clientById[clientId]
  const [tab, setTab] = useState('appointments')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const history = appointments.filter((a) => a.clientId === clientId).sort((a, b) => b.date.localeCompare(a.date) || b.start - a.start)
  const bills = invoices.filter((i) => i.clientId === clientId).sort((a, b) => b.at - a.at)
  const spend = bills.reduce((sum, i) => sum + i.total, 0)

  return (
    <Drawer title={client.name} onClose={onClose}>
      <div className="drawer-head">
        <Avatar name={client.name} size={56} />
        <div>
          <h2 className="p-sheet-title">{client.name}</h2>
          <p className="muted small">
            {client.phone}
            {client.email && ` · ${client.email}`}
          </p>
        </div>
      </div>

      <div className="drawer-stats">
        <span>
          <strong>{history.filter((a) => a.status === 'completed').length}</strong> visits
        </span>
        <span>
          <strong>{rupees(spend)}</strong> spent
        </span>
        <span>
          <strong>{client.points}</strong> points
        </span>
      </div>

      <div className="drawer-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/portal/calendar?new=1')}>
          Book appointment
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(`/portal/checkout?client=${client.id}`)}>
          New sale
        </button>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'appointments' &&
        (history.length ? (
          <ul className="drawer-list">
            {history.map((a) => (
              <li key={a.id}>
                <div className="drawer-row">
                  <strong>
                    {shortDate(a.date)} · {timeLabel(a.start)}
                  </strong>
                  <Pill tone={APPT_TONE[a.status]}>{APPT_STATUS[a.status]}</Pill>
                </div>
                <span className="muted small">
                  {a.serviceIds.map((id) => serviceById[id]?.name).join(', ')} · with {staffById[a.staffId]?.name}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No appointments yet.</p>
        ))}

      {tab === 'notes' && (
        <>
          <form
            className="drawer-note-form"
            onSubmit={(e) => {
              e.preventDefault()
              addClientNote(client.id, { title: title.trim(), body: body.trim() })
              setTitle('')
              setBody('')
            }}
          >
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title, e.g. Colour formula" aria-label="Note title" required />
            <textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details" aria-label="Note details" />
            <button type="submit" className="btn btn-outline btn-sm">
              Add note
            </button>
          </form>
          {client.notes.length ? (
            <ul className="drawer-list">
              {client.notes.map((n) => (
                <li key={n.id}>
                  <strong>{n.title}</strong>
                  {n.body && <p className="drawer-note-body">{n.body}</p>}
                  <span className="muted small">{shortDate(dateOf(n.at))}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No notes yet.</p>
          )}
        </>
      )}

      {tab === 'purchases' &&
        (bills.length ? (
          <ul className="drawer-list">
            {bills.map((inv) => (
              <li key={inv.id}>
                <div className="drawer-row">
                  <strong>
                    #{inv.number} · {shortDate(dateOf(inv.at))}
                  </strong>
                  <strong>{rupees(inv.total)}</strong>
                </div>
                <span className="muted small">
                  {inv.items.map((i) => (i.qty > 1 ? `${i.name} ×${i.qty}` : i.name)).join(', ')} · {PAYMENT_METHODS[inv.method]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No purchases yet.</p>
        ))}
    </Drawer>
  )
}
