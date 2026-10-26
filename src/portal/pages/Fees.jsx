import { useState } from 'react'
import Icon from '../../components/Icon'
import { BOOKING_FEE } from '../../data/salons'
import { useStore } from '../../store/context'
import { dayLabel, isoDate, rupees } from '../../utils/format'
import { usePortal } from '../context'
import { districtName } from '../data'
import { useScopedSalons, useTokenRows } from '../hooks'
import { RANGES, addUp, feesOf, pct, rangeDates, rangeLabel, salonDay } from '../network'
import { Kpi, PageHeader, RangeBar } from '../ui'

// Booking fees: what customers paid online, what was refunded, and what the platform keeps
export default function Fees() {
  const { user, suspended } = usePortal()
  const { allBookings } = useStore()
  const rowsFor = useTokenRows()
  const today = isoDate()
  const [days, setDays] = useState(30)
  const [end, setEnd] = useState(today)
  const dates = rangeDates(end, days)
  const salons = useScopedSalons().filter((s) => !suspended[s.id])

  // grid[salonId][date] = day metrics
  const grid = Object.fromEntries(salons.map((s) => [s.id, Object.fromEntries(dates.map((d) => [d, salonDay(s, d, rowsFor, allBookings)]))]))
  const bySalon = salons.map((s) => ({ salon: s, ...addUp(dates.map((d) => grid[s.id][d])) })).sort((a, b) => feesOf(b).net - feesOf(a).net)
  const byDay = dates.map((d) => ({ date: d, ...addUp(salons.map((s) => grid[s.id][d])) })).reverse()
  const total = addUp(bySalon)
  const fees = feesOf(total)
  const dayMax = Math.max(1, ...byDay.map((d) => feesOf(d).gross))

  const exportCsv = () => {
    const lines = [['Date', 'Salon', 'District', 'Paid bookings', 'Gross', 'Refunded bookings', 'Refunds', 'Net'].join(',')]
    for (const d of dates) {
      for (const s of salons) {
        const m = grid[s.id][d]
        const f = feesOf(m)
        lines.push([d, `"${s.name}"`, districtName(s.meta.district), m.paidBookings, f.gross, m.refunds, f.refunds, f.net].join(','))
      }
    }
    const link = document.createElement('a')
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(lines.join('\n'))}`
    link.download = `booking-fees-${dates[0]}-to-${end}.csv`
    link.click()
  }

  return (
    <>
      <PageHeader
        eyebrow={user.role === 'admin' ? 'All districts' : districtName(user.district)}
        title="Booking fees"
        sub={`Every ${rupees(BOOKING_FEE)} booking fee collected and refunded · ${rangeLabel(dates)}`}
      >
        <RangeBar ranges={RANGES} days={days} onDays={setDays} end={end} onEnd={setEnd} max={today} />
        <button type="button" className="btn btn-outline" onClick={exportCsv}>
          <Icon name="receipt" size={18} /> Export CSV
        </button>
      </PageHeader>

      <div className="cc-kpis cc-kpis-4">
        <Kpi hero label="Net fees" value={rupees(fees.net)} note="Kept after refunds" icon="rupee" />
        <Kpi tone="green" label="Collected" value={rupees(fees.gross)} note={`${total.paidBookings} paid bookings`} icon="wallet" />
        <Kpi tone="red" label="Refunded" value={rupees(fees.refunds)} note={`${total.refunds} bookings · ${pct(total.refunds, total.paidBookings)}% refund rate`} icon="calendarX" />
        <Kpi tone="blue" label="Per salon per day" value={rupees(Math.round(fees.net / Math.max(1, salons.length * dates.length)))} note={`${salons.length} salons · ${dates.length} ${dates.length === 1 ? 'day' : 'days'}`} icon="chart" />
      </div>

      <div className="pl-grid fee-grid">
        <section className="p-card cc-card">
          <div className="cc-card-head">
            <div>
              <h2>By salon</h2>
              <p className="muted small">Self-managed salons refund more when stylists miss requests</p>
            </div>
          </div>
          <div className="p-table-wrap cc-table">
            <table className="p-table">
              <thead>
                <tr>
                  <th>Salon</th>
                  <th className="num">Paid</th>
                  <th className="num">Collected</th>
                  <th className="num">Refunds</th>
                  <th className="num">Net</th>
                </tr>
              </thead>
              <tbody>
                {bySalon.map((m) => {
                  const f = feesOf(m)
                  const rate = pct(m.refunds, m.paidBookings)
                  return (
                    <tr key={m.salon.id}>
                      <td>
                        <strong>{m.salon.name}</strong>
                        <span className="muted small d-block">
                          {m.salon.confirmMode === 'manual' ? 'Self-managed' : 'Front desk'} · {districtName(m.salon.meta.district)}
                        </span>
                      </td>
                      <td className="num">{m.paidBookings}</td>
                      <td className="num">{rupees(f.gross)}</td>
                      <td className={`num ${rate > 5 ? 'tone-red' : ''}`}>
                        {rupees(f.refunds)}
                        <span className="muted small d-block">{rate}%</span>
                      </td>
                      <td className="num cc-money">{rupees(f.net)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="p-card cc-card">
          <div className="cc-card-head">
            <div>
              <h2>By day</h2>
              <p className="muted small">Newest first</p>
            </div>
          </div>
          <ul className="fee-days">
            {byDay.map((d) => {
              const f = feesOf(d)
              return (
                <li key={d.date}>
                  <span className="fee-day">{dayLabel(d.date)}</span>
                  <span className="fee-bar">
                    <i className="is-net" style={{ width: `${(f.net / dayMax) * 100}%` }} />
                    <i className="is-refund" style={{ width: `${(f.refunds / dayMax) * 100}%` }} />
                  </span>
                  <strong>{rupees(f.net)}</strong>
                  <span className="muted small">{d.refunds ? `−${rupees(f.refunds)}` : ''}</span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </>
  )
}
