import { useState } from 'react'
import Icon from '../../components/Icon'
import { SALONS, getSalon } from '../../data/salons'
import { usePortal } from '../context'
import { DEMO, DISTRICTS, ROLES, ROLE_ORDER, districtName } from '../data'
import { PageHeader, Pill, Sheet } from '../ui'

const SALON_ROLES = ['frontdesk', 'stylist']
const DISTRICT_ROLES = ['agent', 'manager']

export default function Users() {
  const { user: me, users, setUserActive } = usePortal()
  const [role, setRole] = useState('all')
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)

  const q = query.trim().toLowerCase()
  const list = users
    .filter((u) => role === 'all' || u.role === role)
    .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.includes(q))

  return (
    <>
      <PageHeader eyebrow="All districts" title="Users & roles" sub="Everyone who can sign in to the salon portal">
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
          <Icon name="plus" size={18} /> Add user
        </button>
      </PageHeader>

      <div className="p-role-cards">
        {ROLE_ORDER.map((r) => (
          <div key={r} className="p-role-card">
            <strong>{ROLES[r].label}</strong>
            <span className="p-stat-value">{users.filter((u) => u.role === r).length}</span>
            <span className="muted small">{ROLES[r].blurb}</span>
          </div>
        ))}
      </div>

      <div className="p-toolbar">
        <div className="chips">
          <button type="button" className={`chip ${role === 'all' ? 'is-active' : ''}`} onClick={() => setRole('all')}>
            All
          </button>
          {ROLE_ORDER.map((r) => (
            <button key={r} type="button" className={`chip ${role === r ? 'is-active' : ''}`} onClick={() => setRole(r)}>
              {ROLES[r].label}
            </button>
          ))}
        </div>
        <label className="p-search">
          <Icon name="search" size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or email" aria-label="Search users" />
        </label>
      </div>

      <div className="p-table-wrap">
        <table className="p-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Access</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className={u.active ? '' : 'is-muted'}>
                <td>
                  <strong>{u.name}</strong>
                  <span className="muted small d-block">
                    {u.email} · {u.phone}
                  </span>
                </td>
                <td>{ROLES[u.role].label}</td>
                <td>{u.salonId ? getSalon(u.salonId)?.name : u.district ? districtName(u.district) : 'All districts'}</td>
                <td>{u.active ? <Pill tone="green">Active</Pill> : <Pill>Deactivated</Pill>}</td>
                <td>
                  {u.id !== me.id && (
                    <button type="button" className="text-btn" onClick={() => setUserActive(u.id, !u.active)}>
                      {u.active ? 'Deactivate' : 'Reactivate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && <AddUserSheet onClose={() => setAdding(false)} />}
    </>
  )
}

function AddUserSheet({ onClose }) {
  const { users, addUser } = usePortal()
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'frontdesk', salonId: SALONS[0].id, district: DISTRICTS[0].id, password: DEMO?.password ?? '' })
  const [error, setError] = useState('')
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const email = form.email.trim().toLowerCase()
    if (users.some((u) => u.email === email)) return setError('Someone already uses that email.')
    if (!/^\d{10}$/.test(form.phone)) return setError('Enter a 10-digit mobile number.')
    const made = await addUser({
      name: form.name.trim(),
      email,
      phone: form.phone,
      role: form.role,
      password: form.password,
      ...(SALON_ROLES.includes(form.role) && { salonId: form.salonId }),
      ...(DISTRICT_ROLES.includes(form.role) && { district: form.district }),
    })
    if (made) onClose()
  }

  return (
    <Sheet title="Add a user" onClose={onClose} wide>
      <form className="p-form" onSubmit={submit}>
        <label className="field">
          <span>Full name</span>
          <input value={form.name} onChange={set('name')} required autoFocus />
        </label>
        <div className="p-form-row">
          <label className="field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={set('email')} required />
          </label>
          <label className="field">
            <span>Mobile</span>
            <input inputMode="numeric" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} required />
          </label>
        </div>
        <div className="p-form-row">
          <label className="field">
            <span>Role</span>
            <select value={form.role} onChange={set('role')}>
              {ROLE_ORDER.map((r) => (
                <option key={r} value={r}>
                  {ROLES[r].label}
                </option>
              ))}
            </select>
          </label>
          {SALON_ROLES.includes(form.role) && (
            <label className="field">
              <span>Salon</span>
              <select value={form.salonId} onChange={set('salonId')}>
                {SALONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {DISTRICT_ROLES.includes(form.role) && (
            <label className="field">
              <span>District</span>
              <select value={form.district} onChange={set('district')}>
                {DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <label className="field">
          <span>Temporary password</span>
          <input value={form.password} onChange={set('password')} minLength={6} required />
        </label>
        <p className="muted small">{ROLES[form.role].blurb}. Share the temporary password with them directly.</p>
        {error && (
          <p className="form-error" role="alert">
            <Icon name="info" size={16} /> {error}
          </p>
        )}
        <div className="p-form-foot">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Add user
          </button>
        </div>
      </form>
    </Sheet>
  )
}
