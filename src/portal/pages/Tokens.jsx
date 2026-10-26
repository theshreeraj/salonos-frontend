import { useState } from 'react'
import Icon from '../../components/Icon'
import { BOOKING_FEE, getSalon } from '../../data/salons'
import { dayLabel, isoDate, rupees, tokenLabel } from '../../utils/format'
import { usePortal } from '../context'
import BillSheet from '../desk/BillSheet'
import { useDesk } from '../desk/context'
import { PAYMENT_METHODS } from '../desk/logic'
import { useTokenRows } from '../hooks'
import { Empty, PageHeader, Pill, SourceBadge, TokenStatus } from '../ui'

const FILTERS = {
  all: { label: 'All', fn: () => true },
  online: { label: 'Online', fn: (r) => r.source === 'online' },
  'walk-in': { label: 'Walk-in', fn: (r) => r.source === 'walk-in' },
  waiting: { label: 'Waiting', fn: (r) => r.status === 'waiting' || r.status === 'in-chair' },
  done: { label: 'Done', fn: (r) => r.status === 'done' },
  'no-show': { label: 'No-show', fn: (r) => r.status === 'no-show' || r.status === 'cancelled' },
}

export default function Tokens() {
  const { user } = usePortal()
  const salon = getSalon(user.salonId)
  const rows = useTokenRows()(salon)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [billing, setBilling] = useState(null)
  const { invoices, pendingBills, staffById } = useDesk()
  const today = isoDate()
  const paid = Object.fromEntries(invoices.filter((i) => i.token?.date === today).map((i) => [i.token.token, i]))
  const pending = new Set(pendingBills.filter((p) => p.date === today).map((p) => p.token))

  const q = query.trim().toLowerCase()
  const list = rows
    .filter(FILTERS[filter].fn)
    .filter((r) => !q || r.name.toLowerCase().includes(q) || tokenLabel(r.token).includes(q))
    .reverse()

  return (
    <>
      <PageHeader eyebrow={dayLabel(isoDate())} title="Today's tokens" sub={`${rows.length} tokens issued at ${salon.name}`} />

      <div className="p-toolbar">
        <div className="chips">
          {Object.entries(FILTERS).map(([id, f]) => (
            <button key={id} type="button" className={`chip ${filter === id ? 'is-active' : ''}`} onClick={() => setFilter(id)}>
              {f.label}
              <span className="chip-count">{rows.filter(f.fn).length}</span>
            </button>
          ))}
        </div>
        <label className="p-search">
          <Icon name="search" size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name or token" aria-label="Search tokens" />
        </label>
      </div>

      {list.length ? (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Customer</th>
                <th>Source</th>
                <th>Services</th>
                <th>Stylist</th>
                <th className="num">Booking fee</th>
                <th className="num">At salon</th>
                <th>Status</th>
                <th>Bill</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.token}>
                  <td className="p-token-cell">{tokenLabel(r.token)}</td>
                  <td>
                    <strong>{r.name}</strong>
                    <span className="muted small d-block">{r.phone}</span>
                  </td>
                  <td>
                    <SourceBadge source={r.source} />
                  </td>
                  <td>{r.services.join(', ') || '—'}</td>
                  <td>{paid[r.token] ? [...new Set(paid[r.token].items.map((i) => staffById[i.staffId]?.name).filter(Boolean))].join(', ') : r.stylist}</td>
                  <td className="num">{r.source === 'online' ? rupees(BOOKING_FEE) : '—'}</td>
                  <td className="num">{paid[r.token] ? rupees(paid[r.token].total) : r.amount ? rupees(r.amount) : '—'}</td>
                  <td>
                    <TokenStatus status={r.status} />
                  </td>
                  <td>
                    {paid[r.token] ? (
                      <Pill tone="green">Paid · {PAYMENT_METHODS[paid[r.token].method]}</Pill>
                    ) : pending.has(r.token) || r.status === 'in-chair' ? (
                      <button type="button" className="btn btn-outline btn-xs" onClick={() => setBilling(r)}>
                        Collect
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No tokens match">
          <p className="muted">Try another filter or search.</p>
        </Empty>
      )}
      {billing && <BillSheet key={billing.token} row={billing} date={today} onClose={() => setBilling(null)} onPaid={() => setBilling(null)} onLater={() => setBilling(null)} />}
    </>
  )
}
