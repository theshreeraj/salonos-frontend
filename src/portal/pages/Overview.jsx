import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../store/context'
import { isOpenNow, isoDate, rupees } from '../../utils/format'
import { usePortal } from '../context'
import { DISTRICTS, districtName, salonStats } from '../data'
import { useScopedAgents, useScopedLeads, useScopedOnboardings, useScopedSalons, useSalonMetrics, useTokenRows } from '../hooks'
import { isOpenLead, leadStatus } from '../leads'
import { RANGES, addUp, feesOf, pct, rangeDates, rangeLabel } from '../network'
import { Kpi, PageHeader, RangeBar } from '../ui'

export default function Overview() {
  const { user, users, suspended, onboardings } = usePortal()
  const { isBookingOpen } = useStore()
  const rowsFor = useTokenRows()
  const today = isoDate()
  const [days, setDays] = useState(1)
  const [end, setEnd] = useState(today)
  const dates = rangeDates(end, days)
  const isAdmin = user.role === 'admin'

  const allSalons = useScopedSalons()
  const salons = allSalons.filter((s) => !suspended[s.id])
  const metrics = useSalonMetrics(salons, dates)
  const total = addUp(metrics)
  const fees = feesOf(total)
  const applications = useScopedOnboardings()
  const agents = useScopedAgents()
  const leads = useScopedLeads()
  const pending = applications.filter((a) => a.status === 'pending')
  const openLeads = leads.filter((l) => isOpenLead(leadStatus(l, onboardings)))
  const label = rangeLabel(dates)

  // Live panel is always "right now"
  const live = salons.map((s) => ({ salon: s, ...salonStats(rowsFor(s)), inChair: rowsFor(s).filter((r) => r.status === 'in-chair').length }))
  const openNow = salons.filter((s) => isOpenNow(s.hours)).length
  const paused = salons.filter((s) => !isBookingOpen(s.id)).length

  const league = [...metrics].sort((a, b) => b.serviceValue - a.serviceValue)
  const channels = [
    { label: 'Online app', value: total.online, tone: 'blue' },
    { label: 'Walk-in', value: total.walkIn, tone: 'gray' },
  ]

  return (
    <>
      <PageHeader
        eyebrow={isAdmin ? 'All districts' : districtName(user.district)}
        title="Command centre"
        sub="Bookings, queues, fees and salon performance for any day or range."
      >
        <RangeBar ranges={RANGES} days={days} onDays={setDays} end={end} onEnd={setEnd} max={today} />
      </PageHeader>

      <div className="cc-kpis">
        <Kpi hero label="Booking fees (net)" value={rupees(fees.net)} note={`${total.paidBookings} paid bookings · ${label}`} icon="rupee" />
        <Kpi tone="green" label="Tokens issued" value={total.issued} note={`${total.done} served (${pct(total.done, total.issued)}%)`} icon="ticket" />
        <Kpi tone="blue" label="Online share" value={`${pct(total.online, total.issued)}%`} note={`${total.online} app · ${total.walkIn} walk-in`} icon="mobile" />
        <Kpi tone="green" label="Service value" value={rupees(total.serviceValue)} note={`Paid at salons · avg ${rupees(total.done ? Math.round(total.serviceValue / total.done) : 0)}`} icon="receipt" />
        <Kpi tone="amber" label="No-show rate" value={`${pct(total.noShow, total.issued)}%`} note={`${total.noShow} tokens not used`} icon="calendarX" />
        <Kpi tone="red" label="Refunds" value={rupees(fees.refunds)} note={`${total.refunds} bookings refunded`} icon="wallet" />
      </div>

      <div className="cc-row">
        <section className="p-card cc-card">
          <div className="cc-card-head">
            <div>
              <h2>Booking channels</h2>
              <p className="muted small">How customers joined the queue · {label}</p>
            </div>
            <span className="p-badge p-badge-blue">
              {metrics.filter((m) => m.issued).length} of {salons.length} salons active
            </span>
          </div>
          <ul className="cc-bars">
            {channels.map((c) => (
              <li key={c.label}>
                <span>{c.label}</span>
                <strong>
                  {c.value} <span className="muted">({pct(c.value, total.issued)}%)</span>
                </strong>
                <span className={`cc-bar tone-${c.tone}`}>
                  <i style={{ width: `${pct(c.value, total.issued)}%` }} />
                </span>
              </li>
            ))}
          </ul>
          <div className="cc-mini">
            <span>
              <small>Served</small>
              <strong className="tone-green">{total.done}</strong>
              {pct(total.done, total.issued)}% of tokens
            </span>
            <span>
              <small>No-shows</small>
              <strong className="tone-amber">{total.noShow}</strong>
              {pct(total.noShow, total.issued)}% of tokens
            </span>
            <span>
              <small>Cancelled</small>
              <strong className="tone-red">{total.cancelled}</strong>
              {pct(total.cancelled, total.issued)}% of tokens
            </span>
          </div>
        </section>

        <section className="p-card cc-card">
          <div className="cc-card-head">
            <div>
              <h2>Live right now</h2>
              <p className="muted small">Across every salon in scope</p>
            </div>
            <Link to="/portal/live" className="link small">
              Open monitor
            </Link>
          </div>
          <div className="cc-live">
            <span>
              <small>Waiting</small>
              <strong className="tone-amber">{live.reduce((s, x) => s + x.waiting, 0)}</strong>
            </span>
            <span>
              <small>In chair</small>
              <strong className="tone-green">{live.reduce((s, x) => s + x.inChair, 0)}</strong>
            </span>
            <span>
              <small>Open salons</small>
              <strong>
                {openNow}/{salons.length}
              </strong>
            </span>
            <span>
              <small>Online booking paused</small>
              <strong className={paused ? 'tone-red' : ''}>{paused}</strong>
            </span>
          </div>
          <p className="muted small cc-foot">Queues refresh every 10 seconds.</p>
        </section>
      </div>

      <section className="p-card cc-card cc-league">
        <div className="cc-card-head">
          <div>
            <h2>Salon performance league</h2>
            <p className="muted small">Ranked by service value · {label}</p>
          </div>
          <Link to="/portal/fees" className="link small">
            Booking fee audit
          </Link>
        </div>
        <div className="p-table-wrap cc-table">
          <table className="p-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Salon</th>
                <th className="num">Service value</th>
                <th>Share</th>
                <th className="num">Served / issued</th>
                <th className="num">Online</th>
                <th className="num">No-show</th>
                <th className="num">Fees (net)</th>
              </tr>
            </thead>
            <tbody>
              {league.map((m, i) => (
                <tr key={m.salon.id}>
                  <td className="muted">{i + 1}</td>
                  <td>
                    <strong>{m.salon.name}</strong>
                    <span className="muted small d-block">
                      {m.salon.area} · {districtName(m.salon.meta.district)}
                    </span>
                  </td>
                  <td className="num cc-money">{rupees(m.serviceValue)}</td>
                  <td>
                    <span className="cc-share">
                      <span className="cc-bar tone-blue">
                        <i style={{ width: `${pct(m.serviceValue, total.serviceValue)}%` }} />
                      </span>
                      {pct(m.serviceValue, total.serviceValue)}%
                    </span>
                  </td>
                  <td className="num">
                    {m.done} / {m.issued}
                  </td>
                  <td className="num">{pct(m.online, m.issued)}%</td>
                  <td className={`num ${pct(m.noShow, m.issued) > 8 ? 'tone-red' : ''}`}>{pct(m.noShow, m.issued)}%</td>
                  <td className="num">{rupees(feesOf(m).net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="p-section">
        <div className="p-section-head">
          <h2>Network structure</h2>
          <span className="muted small">Cumulative · not affected by the dates above</span>
        </div>
        <div className="cc-kpis cc-kpis-4">
          <Kpi tone="blue" label="Total salons" value={allSalons.length} note={`${salons.length} live · ${allSalons.length - salons.length} suspended`} icon="store" />
          <Kpi tone="amber" label="Pending approvals" value={pending.length} note={pending.length ? <Link to="/portal/approvals" className="link">Review now</Link> : 'All clear'} icon="shield" />
          <Kpi tone="green" label="Leads in pipeline" value={openLeads.length} note={<Link to="/portal/pipeline" className="link">Open pipeline</Link>} icon="list" />
          <Kpi tone="blue" label="Field agents" value={agents.length} note={<Link to="/portal/agents" className="link">See leaderboard</Link>} icon="users" />
        </div>

        {isAdmin && (
          <div className="p-table-wrap cc-districts">
            <table className="p-table">
              <thead>
                <tr>
                  <th>District</th>
                  <th>Manager</th>
                  <th className="num">Salons</th>
                  <th className="num">Tokens</th>
                  <th className="num">Fees (net)</th>
                  <th className="num">Service value</th>
                  <th className="num">Agents</th>
                  <th className="num">Open leads</th>
                  <th className="num">In review</th>
                </tr>
              </thead>
              <tbody>
                {DISTRICTS.map((d) => {
                  const inDistrict = addUp(metrics.filter((m) => m.salon.meta.district === d.id))
                  const districtAgents = agents.filter((a) => a.district === d.id).map((a) => a.id)
                  return (
                    <tr key={d.id}>
                      <td>
                        <strong>{d.name}</strong>
                      </td>
                      <td>{users.find((u) => u.role === 'manager' && u.district === d.id)?.name ?? '—'}</td>
                      <td className="num">{salons.filter((s) => s.meta.district === d.id).length}</td>
                      <td className="num">{inDistrict.issued}</td>
                      <td className="num">{rupees(feesOf(inDistrict).net)}</td>
                      <td className="num">{rupees(inDistrict.serviceValue)}</td>
                      <td className="num">{districtAgents.length}</td>
                      <td className="num">{openLeads.filter((l) => districtAgents.includes(l.agentId)).length}</td>
                      <td className="num">{pending.filter((a) => a.district === d.id).length}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
