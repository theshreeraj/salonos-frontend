import { useState } from 'react'
import { addDays, dayLabel, isoDate, rupees, shortDate } from '../../utils/format'
import { useDesk } from '../desk/context'
import { PAYMENT_METHODS, dateOf, weekday } from '../desk/logic'
import { Avatar, Empty, PageHeader, Stat } from '../ui'

const PRESETS = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'Last 7 days',
  month: 'This month',
  '30d': 'Last 30 days',
  custom: 'Custom',
}

const SOURCES = { all: 'All sources', queue: 'Live queue', appointment: 'Appointments', counter: 'Counter sales' }
const GROUPS = { day: 'Day', week: 'Week', month: 'Month' }

function rangeFor(preset, today) {
  if (preset === 'today') return [today, today]
  if (preset === 'yesterday') return [addDays(today, -1), addDays(today, -1)]
  if (preset === 'week') return [addDays(today, -6), today]
  if (preset === 'month') return [`${today.slice(0, 8)}01`, today]
  return [addDays(today, -29), today]
}

const sourceOf = (inv) => (inv.token ? 'queue' : inv.appointmentId ? 'appointment' : 'counter')
// The barber on a bill's first service gets its tip
const primaryOf = (inv) => (inv.items.find((i) => i.kind === 'service') ?? inv.items[0])?.staffId ?? ''
const weekStart = (date) => addDays(date, -((weekday(date) + 6) % 7))

function periodOf(date, group) {
  if (group === 'month') return date.slice(0, 7)
  if (group === 'week') return weekStart(date)
  return date
}

function periodLabel(key, group) {
  if (group === 'month') return new Date(`${key}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  if (group === 'week') return `Week of ${shortDate(key)}`
  return dayLabel(key)
}

const sumLines = (lines) => lines.reduce((n, l) => n + l.qty * l.price, 0)

export default function Revenue() {
  const { invoices, staff, staffById } = useDesk()
  const today = isoDate()
  const [preset, setPreset] = useState('today')
  const [custom, setCustom] = useState(() => rangeFor('week', today))
  const [barber, setBarber] = useState('all')
  const [method, setMethod] = useState('all')
  const [source, setSource] = useState('all')
  const [group, setGroup] = useState('day')

  const [from, to] = preset === 'custom' ? custom : rangeFor(preset, today)

  const inRange = invoices.filter((inv) => {
    const d = dateOf(inv.at)
    return d >= from && d <= to && (method === 'all' || inv.method === method) && (source === 'all' || sourceOf(inv) === source)
  })
  const touches = (inv, id) => inv.items.some((i) => i.staffId === id)
  const bills = barber === 'all' ? inRange : inRange.filter((inv) => touches(inv, barber))
  const lines = bills.flatMap((inv) => inv.items.map((item) => ({ ...item, inv }))).filter((l) => barber === 'all' || l.staffId === barber)
  const serviceLines = lines.filter((l) => l.kind === 'service')
  const productLines = lines.filter((l) => l.kind === 'product')
  const tips = bills.filter((inv) => barber === 'all' || primaryOf(inv) === barber).reduce((n, inv) => n + inv.tip, 0)
  const collected = bills.reduce((n, inv) => n + inv.total, 0)

  // Per-barber breakdown always lists the whole team so they can be compared
  const team = staff
    .filter((s) => s.role !== 'frontdesk' || inRange.some((inv) => touches(inv, s.id)))
    .map((s) => {
      const own = inRange.flatMap((inv) => inv.items.filter((i) => i.staffId === s.id))
      const svc = own.filter((i) => i.kind === 'service')
      const prod = own.filter((i) => i.kind === 'product')
      const tip = inRange.filter((inv) => primaryOf(inv) === s.id).reduce((n, inv) => n + inv.tip, 0)
      return {
        s,
        customers: inRange.filter((inv) => inv.items.some((i) => i.kind === 'service' && i.staffId === s.id)).length,
        services: svc.length,
        serviceRevenue: sumLines(svc),
        productRevenue: sumLines(prod),
        tips: tip,
        total: sumLines(own) + tip,
      }
    })
    .filter((r) => r.s.active || r.total)
    .sort((a, b) => b.total - a.total)
  const counterSales = sumLines(inRange.flatMap((inv) => inv.items.filter((i) => !i.staffId)))
  const teamTotal = team.reduce((n, r) => n + r.total, 0) + counterSales

  const periods = Object.entries(Object.groupBy(bills, (inv) => periodOf(dateOf(inv.at), group)))
    .map(([key, list]) => {
      const own = list.flatMap((inv) => inv.items).filter((i) => barber === 'all' || i.staffId === barber)
      return {
        key,
        customers: list.length,
        services: sumLines(own.filter((i) => i.kind === 'service')),
        products: sumLines(own.filter((i) => i.kind === 'product')),
        discount: list.reduce((n, inv) => n + inv.discount, 0),
        tax: list.reduce((n, inv) => n + inv.tax, 0),
        tips: list.filter((inv) => barber === 'all' || primaryOf(inv) === barber).reduce((n, inv) => n + inv.tip, 0),
        collected: list.reduce((n, inv) => n + inv.total, 0),
      }
    })
    .sort((a, b) => b.key.localeCompare(a.key))

  const rangeText = from === to ? dayLabel(from) : `${shortDate(from)} – ${shortDate(to)}`
  const barberName = barber === 'all' ? null : staffById[barber]?.name

  return (
    <>
      <PageHeader title="Revenue" sub={`${rangeText}${barberName ? ` · ${barberName}` : ''}`} />

      <div className="rev-filters">
        <div className="chips">
          {Object.entries(PRESETS).map(([id, label]) => (
            <button key={id} type="button" className={`chip ${preset === id ? 'is-active' : ''}`} onClick={() => setPreset(id)}>
              {label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="range">
            <input type="date" className="p-select" value={custom[0]} max={custom[1]} onChange={(e) => e.target.value && setCustom([e.target.value, custom[1]])} aria-label="From" />
            <span className="muted">to</span>
            <input type="date" className="p-select" value={custom[1]} min={custom[0]} max={today} onChange={(e) => e.target.value && setCustom([custom[0], e.target.value])} aria-label="To" />
          </div>
        )}
        <div className="rev-selects">
          <select className="p-select" value={barber} onChange={(e) => setBarber(e.target.value)} aria-label="Barber">
            <option value="all">All barbers</option>
            {staff
              .filter((s) => s.role !== 'frontdesk')
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
          <select className="p-select" value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Payment method">
            <option value="all">All payments</option>
            {Object.entries(PAYMENT_METHODS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <select className="p-select" value={source} onChange={(e) => setSource(e.target.value)} aria-label="Source">
            {Object.entries(SOURCES).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-stats">
        <Stat label="Collected" value={rupees(collected)} note={barberName ? `Full value of bills ${barberName.split(' ')[0]} worked on` : 'Incl. GST and tips, after discounts'} />
        <Stat label="Customers" value={bills.length} note={`Avg bill ${rupees(bills.length ? Math.round(collected / bills.length) : 0)}`} />
        <Stat label="Services" value={rupees(sumLines(serviceLines))} note={`${serviceLines.length} services done`} />
        <Stat label="Products" value={rupees(sumLines(productLines))} note={`${productLines.reduce((n, l) => n + l.qty, 0)} units sold`} />
        <Stat label="Tips" value={rupees(tips)} />
      </div>

      {!inRange.length ? (
        <Empty icon="rupee" title="No sales in this range">
          <p className="muted">Bills collected from the queue, appointments and counter show up here.</p>
        </Empty>
      ) : (
        <>
          <section className="p-section">
            <div className="p-section-head">
              <h2>By barber</h2>
            </div>
            <div className="p-table-wrap">
              <table className="p-table">
                <thead>
                  <tr>
                    <th>Barber</th>
                    <th className="num">Customers</th>
                    <th className="num">Services done</th>
                    <th className="num">Service revenue</th>
                    <th className="num">Product sales</th>
                    <th className="num">Tips</th>
                    <th className="num">Total credited</th>
                    <th className="num">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((r) => (
                    <tr key={r.s.id} className={`${barber === r.s.id ? 'is-selected' : ''} is-clickable`} onClick={() => setBarber(barber === r.s.id ? 'all' : r.s.id)}>
                      <td>
                        <span className="p-person">
                          <Avatar name={r.s.name} color={r.s.color} size={30} />
                          <strong>{r.s.name}</strong>
                        </span>
                      </td>
                      <td className="num">{r.customers}</td>
                      <td className="num">{r.services}</td>
                      <td className="num">{rupees(r.serviceRevenue)}</td>
                      <td className="num">{rupees(r.productRevenue)}</td>
                      <td className="num">{rupees(r.tips)}</td>
                      <td className="num">
                        <strong>{rupees(r.total)}</strong>
                      </td>
                      <td className="num">{teamTotal ? `${Math.round((r.total / teamTotal) * 100)}%` : '—'}</td>
                    </tr>
                  ))}
                  {counterSales > 0 && (
                    <tr>
                      <td className="muted">Counter sales (no barber)</td>
                      <td className="num">—</td>
                      <td className="num">—</td>
                      <td className="num">—</td>
                      <td className="num">{rupees(counterSales)}</td>
                      <td className="num">—</td>
                      <td className="num">
                        <strong>{rupees(counterSales)}</strong>
                      </td>
                      <td className="num">{`${Math.round((counterSales / teamTotal) * 100)}%`}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="muted small rev-note">Line values before discounts and GST. Click a barber to filter the whole page.</p>
          </section>

          <section className="p-section">
            <div className="p-section-head">
              <h2>By {GROUPS[group].toLowerCase()}</h2>
              <div className="p-tabs" role="tablist">
                {Object.entries(GROUPS).map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={group === id} className={group === id ? 'is-active' : ''} onClick={() => setGroup(id)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-table-wrap">
              <table className="p-table">
                <thead>
                  <tr>
                    <th>{GROUPS[group]}</th>
                    <th className="num">Customers</th>
                    <th className="num">Services</th>
                    <th className="num">Products</th>
                    <th className="num">Discounts</th>
                    <th className="num">GST</th>
                    <th className="num">Tips</th>
                    <th className="num">Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p.key}>
                      <td>{periodLabel(p.key, group)}</td>
                      <td className="num">{p.customers}</td>
                      <td className="num">{rupees(p.services)}</td>
                      <td className="num">{rupees(p.products)}</td>
                      <td className="num">{p.discount ? `−${rupees(p.discount)}` : '—'}</td>
                      <td className="num">{rupees(p.tax)}</td>
                      <td className="num">{rupees(p.tips)}</td>
                      <td className="num">
                        <strong>{rupees(p.collected)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td className="num">{bills.length}</td>
                    <td className="num">{rupees(periods.reduce((n, p) => n + p.services, 0))}</td>
                    <td className="num">{rupees(periods.reduce((n, p) => n + p.products, 0))}</td>
                    <td className="num">{bills.some((inv) => inv.discount) ? `−${rupees(bills.reduce((n, inv) => n + inv.discount, 0))}` : '—'}</td>
                    <td className="num">{rupees(periods.reduce((n, p) => n + p.tax, 0))}</td>
                    <td className="num">{rupees(tips)}</td>
                    <td className="num">{rupees(collected)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  )
}
