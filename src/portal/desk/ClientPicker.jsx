import { useState } from 'react'
import Icon from '../../components/Icon'
import { Avatar } from '../ui'

// Search-as-you-type client selector. value is a client id, '' for none chosen, or null for a walk-in sale.
export default function ClientPicker({ clients, value, onChange, placeholder = 'Search by name or phone', allowWalkIn }) {
  const selected = clients.find((c) => c.id === value) ?? (allowWalkIn && value === null ? { name: 'Walk-in customer', phone: 'Sale without a client profile' } : null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const q = query.trim().toLowerCase()
  const matches = clients.filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 8)

  if (selected) {
    return (
      <div className="cp-selected">
        <Avatar name={selected.name} size={34} />
        <span>
          <strong>{selected.name}</strong>
          <span className="muted small d-block">{selected.phone || selected.email || 'No contact details'}</span>
        </span>
        <button type="button" className="text-btn" onClick={() => onChange('')}>
          Change
        </button>
      </div>
    )
  }

  return (
    <div className="cp">
      <label className="p-search cp-input">
        <Icon name="search" size={18} />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={placeholder}
          aria-label="Client"
        />
      </label>
      {open && (
        <ul className="cp-list" role="listbox">
          {allowWalkIn && !q && (
            <li>
              <button type="button" onMouseDown={() => onChange(null)}>
                <span className="p-avatar av-none" style={{ width: 30, height: 30 }}>
                  <Icon name="store" size={15} />
                </span>
                <strong>Walk-in customer</strong>
              </button>
            </li>
          )}
          {matches.map((c) => (
            <li key={c.id}>
              <button type="button" onMouseDown={() => onChange(c.id)}>
                <Avatar name={c.name} size={30} />
                <strong>{c.name}</strong>
                <span className="muted small">{c.phone}</span>
              </button>
            </li>
          ))}
          {!matches.length && <li className="muted small cp-none">No clients match “{query}”</li>}
        </ul>
      )}
    </div>
  )
}
