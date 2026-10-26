import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import { addDays, isoDate, rupees, shortDate, timeLabel } from '../../utils/format'
import { useDesk } from '../desk/context'
import { APPT_STATUS, APPT_TONE, PAYMENT_METHODS, attendanceFor, dateOf, dateRange, isPresent, lineTotal, minsOf } from '../desk/logic'
import { Empty, PageHeader, Pill, Stat } from '../ui'

const REPORTS = [
  { id: 'sales', title: 'Sales', blurb: 'Total revenue over a date range', icon: 'rupee' },
  { id: 'appointments', title: 'Appointments', blurb: 'Booking volume and status breakdown', icon: 'calendar' },
  { id: 'retail-sales', title: 'Retail sales', blurb: 'Product sales from checkout', icon: 'bag' },
  { id: 'sales-tax', title: 'Sales tax', blurb: 'GST collected on invoices', icon: 'receipt' },
  { id: 'inventory', title: 'Inventory', blurb: 'Stock levels and value across products', icon: 'box', noRange: true },
  { id: 'transactions', title: 'Transaction detail', blurb: 'Line-by-line invoice history', icon: 'list' },
  { id: 'top-clients', title: 'Most valuable clients', blurb: 'Top 10 clients by lifetime spend', icon: 'star', noRange: true },
  { id: 'commission', title: 'Commission earnings', blurb: 'Service revenue and commission by stylist', icon: 'wallet' },
  { id: 'expenses', title: 'Expenses', blurb: 'Business expenses by category', icon: 'card' },
  { id: 'timesheets', title: 'Timesheets', blurb: 'Hours worked from staff clock-ins', icon: 'clock' },
]

export default function Reports() {
  return (
    <>
      <PageHeader title="Reports" sub="Built from your bookings, checkouts, stock and attendance" />
      <div className="card-grid report-grid">
        {REPORTS.map((r) => (
          <Link key={r.id} to={`/portal/reports/${r.id}`} className="p-card report-card">
            <span className="report-icon">
              <Icon name={r.icon} size={20} />
            </span>
            <strong>{r.title}</strong>
            <span className="muted small">{r.blurb}</span>
          </Link>
        ))}
      </div>
    </>
  )
}

export function ReportDetail() {
  const { reportKey } = useParams()
  const report = REPORTS.find((r) => r.id === reportKey)
  const [from, setFrom] = useState(addDays(isoDate(), -29))
  const [to, setTo] = useState(isoDate())

  if (!report) {
    return (
      <Empty icon="chart" title="Report not found">
        <Link to="/portal/reports" className="btn btn-outline">
          All reports
        </Link>
      </Empty>
    )
  }

  const View = VIEWS[report.id]
  return (
    <>
      <Link to="/portal/reports" className="back-link">
        <Icon name="arrowLeft" size={18} /> Reports
      </Link>
      <PageHeader title={report.title} sub={report.blurb}>
        {!report.noRange && (
          <div className="range">
            <input type="date" className="p-select" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} aria-label="From" />
            <span className="muted">to</span>
            <input type="date" className="p-select" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} aria-label="To" />
          </div>
        )}
      </PageHeader>
      <View from={from} to={to} />
    </>
  )
}

function Table({ head, rows, empty = 'No data for this range.' }) {
  if (!rows.length) return <p className="muted p-card">{empty}</p>
  return (
    <div className="p-table-wrap">
      <table className="p-table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h.label ?? h} className={h.num ? 'num' : undefined}>
                {h.label ?? h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className={head[j].num ? 'num' : undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const num = (label) => ({ label, num: true })
const when = (ms) => `${shortDate(dateOf(ms))}, ${timeLabel(minsOf(ms))}`

function useInvoices(from, to) {
  const { invoices } = useDesk()
  return invoices.filter((i) => dateOf(i.at) >= from && dateOf(i.at) <= to).sort((a, b) => b.at - a.at)
}

function Sales({ from, to }) {
  const { clientById } = useDesk()
  const list = useInvoices(from, to)
  const total = list.reduce((n, i) => n + i.total, 0)
  const byMethod = Object.keys(PAYMENT_METHODS).map((m) => list.filter((i) => i.method === m).reduce((n, i) => n + i.total, 0))
  return (
    <>
      <div className="p-stats">
        <Stat label="Total sales" value={rupees(total)} note={`${list.length} invoices`} />
        <Stat label="Average ticket" value={rupees(list.length ? Math.round(total / list.length) : 0)} />
        {Object.values(PAYMENT_METHODS).map((label, i) => (
          <Stat key={label} label={label} value={rupees(byMethod[i])} />
        ))}
      </div>
      <Table
        head={['Date', 'Invoice', 'Client', 'Payment', num('Total')]}
        rows={list.map((i) => [when(i.at), `#${i.number}`, clientById[i.clientId]?.name ?? i.customerName ?? 'Walk-in', PAYMENT_METHODS[i.method], rupees(i.total)])}
      />
    </>
  )
}

function Appointments({ from, to }) {
  const { appointments, clientById, staffById, serviceById } = useDesk()
  const list = appointments.filter((a) => a.date >= from && a.date <= to).sort((a, b) => b.date.localeCompare(a.date) || b.start - a.start)
  return (
    <>
      <div className="p-stats">
        <Stat label="Total" value={list.length} />
        {Object.entries(APPT_STATUS).map(([id, label]) => (
          <Stat key={id} label={label} value={list.filter((a) => a.status === id).length} />
        ))}
      </div>
      <Table
        head={['Date', 'Client', 'Stylist', 'Services', 'Status']}
        rows={list.map((a) => [
          `${shortDate(a.date)}, ${timeLabel(a.start)}`,
          clientById[a.clientId]?.name ?? '—',
          staffById[a.staffId]?.name ?? '—',
          a.serviceIds.map((id) => serviceById[id]?.name).join(', '),
          <Pill key="s" tone={APPT_TONE[a.status]}>
            {APPT_STATUS[a.status]}
          </Pill>,
        ])}
      />
    </>
  )
}

function RetailSales({ from, to }) {
  const lines = useInvoices(from, to).flatMap((i) => i.items.filter((x) => x.kind === 'product').map((x) => ({ ...x, at: i.at })))
  return (
    <>
      <div className="p-stats">
        <Stat label="Retail revenue" value={rupees(lineTotal(lines))} />
        <Stat label="Units sold" value={lines.reduce((n, l) => n + l.qty, 0)} />
      </div>
      <Table head={['Date', 'Product', num('Qty'), num('Unit price'), num('Total')]} rows={lines.map((l) => [shortDate(dateOf(l.at)), l.name, l.qty, rupees(l.price), rupees(l.qty * l.price)])} />
    </>
  )
}

function SalesTax({ from, to }) {
  const list = useInvoices(from, to)
  return (
    <>
      <div className="p-stats">
        <Stat label="GST collected" value={rupees(list.reduce((n, i) => n + i.tax, 0))} note={`on ${list.filter((i) => i.tax).length} invoices`} />
      </div>
      <Table
        head={['Date', 'Invoice', num('Taxable value'), num('GST'), num('Invoice total')]}
        rows={list.map((i) => [shortDate(dateOf(i.at)), `#${i.number}`, rupees(lineTotal(i.items) - i.discount), rupees(i.tax), rupees(i.total)])}
      />
    </>
  )
}

function Inventory() {
  const { products } = useDesk()
  const list = products.filter((p) => p.active)
  return (
    <>
      <div className="p-stats">
        <Stat label="Stock value (cost)" value={rupees(list.reduce((n, p) => n + p.stock * p.cost, 0))} />
        <Stat label="Stock value (retail)" value={rupees(list.reduce((n, p) => n + p.stock * p.price, 0))} />
      </div>
      <Table
        head={['Product', 'SKU', num('Stock'), num('Alert at'), num('Value at cost')]}
        rows={list.map((p) => [p.name, p.sku || '—', p.stock, p.lowAt, rupees(p.stock * p.cost)])}
        empty="No products yet."
      />
    </>
  )
}

function Transactions({ from, to }) {
  const { clientById, staffById } = useDesk()
  const rows = useInvoices(from, to).flatMap((i) =>
    i.items.map((x) => [when(i.at), `#${i.number}`, clientById[i.clientId]?.name ?? i.customerName ?? 'Walk-in', x.name, x.kind === 'service' ? 'Service' : 'Product', staffById[x.staffId]?.name ?? '—', x.qty, rupees(x.price), rupees(x.qty * x.price)]),
  )
  return <Table head={['Date', 'Invoice', 'Client', 'Item', 'Type', 'Staff', num('Qty'), num('Price'), num('Line total')]} rows={rows} />
}

function TopClients() {
  const { clients, invoices } = useDesk()
  const rows = clients
    .map((c) => {
      const own = invoices.filter((i) => i.clientId === c.id)
      return { c, spend: own.reduce((n, i) => n + i.total, 0), visits: own.length, last: own.length ? Math.max(...own.map((i) => i.at)) : null }
    })
    .filter((r) => r.visits)
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10)
  return (
    <Table
      head={['#', 'Client', 'Phone', num('Visits'), 'Last visit', num('Lifetime spend')]}
      rows={rows.map((r, i) => [i + 1, r.c.name, r.c.phone, r.visits, shortDate(dateOf(r.last)), rupees(r.spend)])}
      empty="No paying clients yet."
    />
  )
}

function Commission({ from, to }) {
  const { staff } = useDesk()
  const list = useInvoices(from, to)
  const rows = staff
    .filter((s) => s.role !== 'frontdesk')
    .map((s) => {
      const lines = list.flatMap((i) => i.items.filter((x) => x.kind === 'service' && x.staffId === s.id))
      const revenue = lineTotal(lines)
      return [s.name, lines.length, rupees(revenue), `${s.commission}%`, rupees(Math.round((revenue * s.commission) / 100))]
    })
  return <Table head={['Stylist', num('Services'), num('Revenue'), num('Rate'), num('Commission')]} rows={rows} />
}

function Expenses({ from, to }) {
  const { expenses } = useDesk()
  const list = expenses.filter((e) => e.date >= from && e.date <= to).sort((a, b) => b.date.localeCompare(a.date))
  const categories = [...new Set(list.map((e) => e.category))]
  return (
    <>
      <div className="p-stats">
        <Stat label="Total expenses" value={rupees(list.reduce((n, e) => n + e.amount, 0))} />
        {categories.map((c) => (
          <Stat key={c} label={c} value={rupees(list.filter((e) => e.category === c).reduce((n, e) => n + e.amount, 0))} />
        ))}
      </div>
      <Table head={['Date', 'Category', 'Note', num('Amount')]} rows={list.map((e) => [shortDate(e.date), e.category, e.note || '—', rupees(e.amount)])} />
    </>
  )
}

function Timesheets({ from, to }) {
  const desk = useDesk()
  const days = dateRange(from, to < isoDate() ? to : isoDate())
  const rows = desk.staff
    .filter((s) => s.active)
    .map((s) => {
      const log = days.map((d) => attendanceFor(desk, s, d)).filter((a) => isPresent(a.status))
      const hours = log.reduce((n, a) => n + a.hours, 0)
      return [s.name, log.length, log.filter((a) => a.status === 'late').length, hours.toFixed(1), log.length ? (hours / log.length).toFixed(1) : '0.0']
    })
  return <Table head={['Staff', num('Days worked'), num('Late'), num('Hours'), num('Avg / day')]} rows={rows} />
}

const VIEWS = {
  sales: Sales,
  appointments: Appointments,
  'retail-sales': RetailSales,
  'sales-tax': SalesTax,
  inventory: Inventory,
  transactions: Transactions,
  'top-clients': TopClients,
  commission: Commission,
  expenses: Expenses,
  timesheets: Timesheets,
}
