import { useState } from 'react'
import Icon from '../../components/Icon'
import { useStore } from '../../store/context'
import { hoursLabel, isOpenNow, timeLabel, tokenLabel } from '../../utils/format'
import { usePortal } from '../context'
import { DISTRICTS, districtName, salonStats } from '../data'
import { useScopedSalons, useTokenRows } from '../hooks'
import { Empty, PageHeader, Pill, Stat } from '../ui'

const BUSY_MINS = 90

// Compact so it fits a stat column: "2h 5m", "40m"
const shortWait = (mins) => (mins <= 0 ? 'Now' : mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`)
const firstName = (name) => name.replace(/^Dr\.\s*/, '').split(' ')[0]
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'busy', label: 'Busy' },
  { id: 'open', label: 'Open' },
  { id: 'closed', label: 'Closed' },
  { id: 'paused', label: 'Booking paused' },
  { id: 'suspended', label: 'Suspended' },
]

export default function Live() {
  const { user, suspended, toggleSuspend } = usePortal()
  const { getQueue, allBookings, isBookingOpen, setBookingOpen } = useStore()
  const rowsFor = useTokenRows()
  const salons = useScopedSalons()
  const [filter, setFilter] = useState('all')
  const [district, setDistrict] = useState('all')
  const isAdmin = user.role === 'admin'

  const cards = salons
    .filter((s) => district === 'all' || s.meta.district === district)
    .map((s) => {
      const rows = rowsFor(s)
      const stats = salonStats(rows)
      const wait = stats.waiting * s.avgMins
      const state = suspended[s.id] ? 'suspended' : !isOpenNow(s.hours) ? 'closed' : wait > BUSY_MINS ? 'busy' : 'open'
      return {
        salon: s,
        stats,
        wait,
        state,
        queue: getQueue(s.id),
        inChair: rows.filter((r) => r.status === 'in-chair'),
        requests: allBookings.filter((b) => b.salonId === s.id && b.status === 'requested').length,
        bookingOpen: isBookingOpen(s.id),
      }
    })
    .sort((a, b) => b.wait - a.wait)
  const matches = (id, c) => id === 'all' || (id === 'paused' ? !c.bookingOpen : id === 'open' ? c.state === 'open' || c.state === 'busy' : c.state === id)
  const shown = cards.filter((c) => matches(filter, c))
  const live = cards.filter((c) => c.state !== 'suspended')

  return (
    <>
      <PageHeader eyebrow={isAdmin ? 'All districts' : districtName(user.district)} title="Live monitor" sub="Every queue right now. Updates every 10 seconds.">
        {isAdmin && (
          <select className="p-select" value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="District">
            <option value="all">All districts</option>
            {DISTRICTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </PageHeader>

      <div className="p-stats">
        <Stat label="Waiting" value={live.reduce((s, c) => s + c.stats.waiting, 0)} note="Across all queues" />
        <Stat label="In chair" value={live.reduce((s, c) => s + c.inChair.length, 0)} note="Being served now" />
        <Stat label="Open salons" value={`${live.filter((c) => c.state === 'open' || c.state === 'busy').length}/${live.length}`} note={`${cards.filter((c) => c.state === 'busy').length} busy`} />
        <Stat label="Awaiting stylist reply" value={live.reduce((s, c) => s + c.requests, 0)} note="Self-managed salons" />
      </div>

      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className={`chip ${filter === f.id ? 'is-active' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label} <span className="chip-count">{cards.filter((c) => matches(f.id, c)).length}</span>
          </button>
        ))}
      </div>

      {shown.length ? (
        <ul className="lm-grid">
          {shown.map((c) => (
            <li key={c.salon.id} className={`lm-card is-${c.state}`}>
              <div className="lm-head">
                <img src={c.salon.photos[0].replace('w=1200', 'w=120')} alt="" />
                <span>
                  <strong>{c.salon.name}</strong>
                  <span className="muted small d-block">
                    {c.salon.area} · {districtName(c.salon.meta.district)}
                  </span>
                </span>
                <StatePill state={c.state} />
              </div>

              <div className="lm-numbers">
                <span>
                  <small>Serving</small>
                  <strong>{tokenLabel(c.queue.serving)}</strong>
                </span>
                <span>
                  <small>Waiting</small>
                  <strong>{c.stats.waiting}</strong>
                </span>
                <span>
                  <small>To clear</small>
                  <strong className={c.state === 'busy' ? 'tone-amber' : ''}>{c.state === 'closed' ? '—' : shortWait(c.wait)}</strong>
                </span>
                <span>
                  <small>Served</small>
                  <strong>{c.stats.done}</strong>
                </span>
              </div>

              <p className="lm-meta small">
                {c.inChair.length ? (
                  <>
                    <Icon name="scissors" size={14} /> In chair with {[...new Set(c.inChair.map((r) => firstName(r.stylist)))].join(', ')}
                  </>
                ) : (
                  <span className="muted">{c.state === 'closed' ? `Hours ${hoursLabel(c.salon.hours)}` : 'No one in the chair'}</span>
                )}
                {c.salon.confirmMode === 'manual' && (
                  <span className="lm-tag">
                    Self-managed{c.requests ? ` · ${c.requests} awaiting reply` : ''}
                  </span>
                )}
              </p>

              <div className="lm-actions">
                <label className="inline-check">
                  <input type="checkbox" checked={c.bookingOpen} disabled={c.state === 'suspended'} onChange={(e) => setBookingOpen(c.salon.id, e.target.checked)} />
                  Online booking {c.bookingOpen ? 'on' : 'paused'}
                </label>
                {isAdmin && (
                  <button type="button" className="text-btn" onClick={() => toggleSuspend(c.salon.id)}>
                    {suspended[c.salon.id] ? 'Reinstate' : 'Suspend'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon="pulse" title="No salons match">
          <p className="muted">Try another filter.</p>
        </Empty>
      )}
      <p className="muted small lm-updated">Last updated {timeLabel(new Date().getHours() * 60 + new Date().getMinutes())}</p>
    </>
  )
}

function StatePill({ state }) {
  const map = { open: ['green', 'Open'], busy: ['amber', 'Busy'], closed: ['gray', 'Closed'], suspended: ['red', 'Suspended'] }
  const [tone, label] = map[state]
  return <Pill tone={tone}>{label}</Pill>
}
