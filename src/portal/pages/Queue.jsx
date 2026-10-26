import { useState } from 'react'
import Icon from '../../components/Icon'
import { getSalon } from '../../data/salons'
import { useStore } from '../../store/context'
import { dayLabel, isoDate, rupees, tokenLabel, waitLabel } from '../../utils/format'
import { usePortal } from '../context'
import { salonStats } from '../data'
import BillSheet from '../desk/BillSheet'
import { useDesk } from '../desk/context'
import { dateOf } from '../desk/logic'
import { useTokenRows } from '../hooks'
import { Empty, PageHeader, Sheet, SourceBadge, Stat } from '../ui'

export default function Queue() {
  const { user } = usePortal()
  const salon = getSalon(user.salonId)
  const { callNext, markNoShow, getQueue, isBookingOpen, setBookingOpen } = useStore()
  const rows = useTokenRows()(salon)
  const queue = getQueue(salon.id)
  const [walkInOpen, setWalkInOpen] = useState(false)
  const { invoices, pendingBills, addPendingBill } = useDesk()
  const [billing, setBilling] = useState(null)
  const [lastPaid, setLastPaid] = useState(null)
  const today = isoDate()

  const current = rows.find((r) => r.token === queue.serving && r.status === 'in-chair')
  const waiting = rows.filter((r) => r.status === 'waiting')
  const next = waiting[0]
  const stats = salonStats(rows)
  const online = isBookingOpen(salon.id)
  const todaysInvoices = invoices.filter((i) => dateOf(i.at) === today)
  const unpaid = pendingBills.filter((p) => p.date === today).map((p) => rows.find((r) => r.token === p.token)).filter(Boolean)

  const finish = (row) => {
    setBilling(null)
    if (row.token === queue.serving) callNext(salon.id)
  }

  return (
    <>
      <PageHeader eyebrow={dayLabel(isoDate())} title="Live queue" sub={`${salon.name} · online and walk-in tokens in one line`}>
        <button type="button" className={`solo-online ${online ? 'is-on' : ''}`} onClick={() => setBookingOpen(salon.id, !online)} aria-pressed={online}>
          <span className="switch" />
          {online ? 'Online bookings on' : 'Online bookings paused'}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setWalkInOpen(true)}>
          <Icon name="plus" size={18} /> Add walk-in
        </button>
      </PageHeader>

      <div className="p-stats">
        <Stat label="Waiting" value={stats.waiting} note={waitLabel(stats.waiting * salon.avgMins) + ' to clear'} />
        <Stat label="Served today" value={stats.done} note={`${stats.noShow} no-show`} />
        <Stat label="Online · Walk-in" value={`${stats.online} · ${stats.walkIn}`} note={`${stats.issued} tokens issued`} />
        <Stat label="Collected today" value={rupees(todaysInvoices.reduce((n, i) => n + i.total, 0))} note={`${todaysInvoices.length} bills · ${unpaid.length} waiting to pay`} />
      </div>

      <div className="q-grid">
        <section className="q-now">
          <div className="q-now-head">
            <span className="live-note">
              <span className="live-dot" /> Now serving
            </span>
            {current && <SourceBadge source={current.source} />}
          </div>
          <div className="q-now-token">{tokenLabel(queue.serving)}</div>
          {current ? (
            <div className="q-now-info">
              <strong>{current.name}</strong>
              <span>{current.services.join(', ') || 'Services to be decided'}</span>
              <span className="muted">
                with {current.stylist} · {rupees(current.amount)} to collect
              </span>
            </div>
          ) : (
            <p className="muted">No one in the chair right now.</p>
          )}
          <div className="q-now-actions">
            {current && todaysInvoices.some((i) => i.token?.token === current.token) ? (
              <button type="button" className="btn btn-primary" onClick={() => callNext(salon.id)}>
                Paid · done, {next ? `call ${tokenLabel(next.token)}` : 'free the chair'}
              </button>
            ) : current ? (
              <button type="button" className="btn btn-primary" onClick={() => setBilling(current)}>
                Done · bill {tokenLabel(current.token)}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" disabled={!next} onClick={() => callNext(salon.id)}>
                {next ? `Call ${tokenLabel(next.token)}` : 'No one waiting'}
              </button>
            )}
            <button type="button" className="btn btn-outline" disabled={!current} onClick={() => markNoShow(salon.id, queue.serving)}>
              Mark no-show
            </button>
          </div>
        </section>

        <section className="q-next">
          <div className="p-section-head">
            <h2>Up next</h2>
            <span className="count">{waiting.length}</span>
          </div>
          {waiting.length ? (
            <ol className="q-list">
              {waiting.map((r, i) => (
                <li key={r.token}>
                  <span className="q-list-token">{tokenLabel(r.token)}</span>
                  <span className="q-list-main">
                    <strong>{r.name}</strong>
                    <span className="muted small">
                      {r.services.join(', ') || 'Decide at salon'} · {r.stylist}
                    </span>
                  </span>
                  <SourceBadge source={r.source} />
                  <span className="q-list-wait muted small">{waitLabel((i + 1) * salon.avgMins)}</span>
                  <button type="button" className="text-btn" onClick={() => markNoShow(salon.id, r.token)}>
                    No-show
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <Empty icon="pulse" title="Queue is clear">
              <p className="muted">New app bookings and walk-ins will appear here.</p>
            </Empty>
          )}
        </section>
      </div>

      {unpaid.length > 0 && (
        <section className="p-section">
          <div className="p-section-head">
            <h2>Waiting to pay</h2>
            <span className="count">{unpaid.length}</span>
          </div>
          <ol className="q-list">
            {unpaid.map((r) => (
              <li key={r.token}>
                <span className="q-list-token">{tokenLabel(r.token)}</span>
                <span className="q-list-main">
                  <strong>{r.name}</strong>
                  <span className="muted small">
                    {r.services.join(', ') || 'Services to be decided'} · {r.stylist}
                  </span>
                </span>
                <SourceBadge source={r.source} />
                <span />
                <button type="button" className="btn btn-outline btn-xs" onClick={() => setBilling(r)}>
                  Collect
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {lastPaid && (
        <div className="q-toast" role="status">
          <Icon name="check" size={18} strokeWidth={2.2} />
          <span>
            Collected <strong>{rupees(lastPaid.total)}</strong> from {lastPaid.customerName} · invoice #{lastPaid.number}
          </span>
          <button type="button" className="icon-btn" onClick={() => setLastPaid(null)} aria-label="Dismiss">
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      {billing && (
        <BillSheet
          key={billing.token}
          row={billing}
          date={today}
          onClose={() => setBilling(null)}
          onPaid={(invoice) => {
            setLastPaid(invoice)
            finish(billing)
          }}
          onLater={() => {
            addPendingBill({ date: today, token: billing.token })
            finish(billing)
          }}
        />
      )}

      {walkInOpen && <WalkInSheet salon={salon} onClose={() => setWalkInOpen(false)} />}
    </>
  )
}

export function WalkInSheet({ salon, onClose }) {
  const { addWalkIn } = useStore()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [serviceIds, setServiceIds] = useState([])
  const [stylist, setStylist] = useState('Any available')
  const [issued, setIssued] = useState(null)

  const toggle = (id) => setServiceIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  const total = salon.services.filter((s) => serviceIds.includes(s.id)).reduce((sum, s) => sum + s.price, 0)

  if (issued) {
    return (
      <Sheet title="Token issued" onClose={onClose}>
        <div className="sheet-center">
          <div className="token-hero">{tokenLabel(issued)}</div>
          <p>
            Hand token {tokenLabel(issued)} to <strong>{name}</strong>. They've joined the same queue as app bookings.
          </p>
          <div className="sheet-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setIssued(null)
                setName('')
                setPhone('')
                setServiceIds([])
              }}
            >
              Add another
            </button>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title="Add a walk-in" onClose={onClose} wide>
      <form
        className="p-form"
        onSubmit={async (e) => {
          e.preventDefault()
          const token = await addWalkIn(salon.id, { name: name.trim(), phone: phone.trim(), serviceIds, stylist })
          if (token != null) setIssued(token)
        }}
      >
        <div className="p-form-row">
          <label className="field">
            <span>Customer name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </label>
          <label className="field">
            <span>Mobile (optional)</span>
            <input inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+ ]/g, ''))} placeholder="For an SMS when it's their turn" />
          </label>
        </div>
        <label className="field">
          <span>Stylist</span>
          <select value={stylist} onChange={(e) => setStylist(e.target.value)}>
            <option>Any available</option>
            {salon.stylists.map((p) => (
              <option key={p.name}>{p.name}</option>
            ))}
          </select>
        </label>
        <div className="field">
          <span>Services</span>
          <div className="p-check-grid">
            {salon.services.map((s) => (
              <label key={s.id} className={`p-check ${serviceIds.includes(s.id) ? 'is-selected' : ''}`}>
                <input type="checkbox" checked={serviceIds.includes(s.id)} onChange={() => toggle(s.id)} />
                <span>{s.name}</span>
                <span className="muted">{rupees(s.price)}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="p-form-foot">
          <span className="muted">{total ? `${rupees(total)} to collect after service` : 'No booking fee for walk-ins'}</span>
          <button type="submit" className="btn btn-primary">
            Issue token
          </button>
        </div>
      </form>
    </Sheet>
  )
}
