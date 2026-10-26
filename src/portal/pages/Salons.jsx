import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon'
import { useStore } from '../../store/context'
import { dayLabel, isOpenNow, tokenLabel, waitLabel } from '../../utils/format'
import { usePortal } from '../context'
import { APPLICATION_LABEL, APPLICATION_TONE, DISTRICTS, districtName, salonStats } from '../data'
import { useScopedOnboardings, useScopedSalons, useTokenRows } from '../hooks'
import { Empty, PageHeader, Pill, Stat } from '../ui'

export default function Salons() {
  const { user, users, suspended, toggleSuspend } = usePortal()
  const { getQueue } = useStore()
  const salons = useScopedSalons()
  const applications = useScopedOnboardings()
  const rowsFor = useTokenRows()
  const [district, setDistrict] = useState('all')
  const isAgent = user.role === 'agent'
  const isAdmin = user.role === 'admin'

  const nameOf = (id) => users.find((u) => u.id === id)?.name ?? '—'
  const visible = salons.filter((s) => district === 'all' || s.meta.district === district)
  const pending = applications.filter((a) => a.status === 'pending')
  const rejected = applications.filter((a) => a.status === 'rejected')

  return (
    <>
      <PageHeader
        eyebrow={isAgent ? districtName(user.district) : isAdmin ? 'All districts' : districtName(user.district)}
        title={isAgent ? 'My salons' : 'Salons'}
        sub={isAgent ? 'Salons you onboarded and applications in review' : 'Live queues and status for every salon in scope'}
      >
        {isAgent && (
          <Link to="/portal/onboard" className="btn btn-primary">
            <Icon name="plus" size={18} /> Onboard a salon
          </Link>
        )}
      </PageHeader>

      <div className="p-stats">
        <Stat label="Live salons" value={salons.filter((s) => !suspended[s.id]).length} />
        <Stat label="In review" value={pending.length} note={isAgent ? 'Waiting on district manager' : 'Awaiting your approval'} />
        {isAgent ? (
          <Stat label="Needs changes" value={rejected.length} note={rejected.length ? 'Fix and resubmit' : 'All clear'} />
        ) : (
          <Stat label="Suspended" value={salons.filter((s) => suspended[s.id]).length} />
        )}
      </div>

      {isAgent && (
        <section className="p-section">
          <div className="p-section-head">
            <h2>Applications</h2>
          </div>
          {applications.filter((a) => a.status !== 'approved').length ? (
            <ul className="p-app-list">
              {applications
                .filter((a) => a.status !== 'approved')
                .map((a) => (
                  <li key={a.id}>
                    <div>
                      <strong>{a.name}</strong>
                      <span className="muted small d-block">
                        {a.type} · {a.area} · submitted {dayLabel(a.submittedAt)}
                      </span>
                      {a.reviewNote && <p className="p-note">{a.reviewNote}</p>}
                    </div>
                    <Pill tone={APPLICATION_TONE[a.status]}>{APPLICATION_LABEL[a.status]}</Pill>
                  </li>
                ))}
            </ul>
          ) : (
            <Empty icon="store" title="No open applications">
              <Link to="/portal/onboard" className="btn btn-outline btn-sm">
                Onboard a salon
              </Link>
            </Empty>
          )}
        </section>
      )}

      <section className="p-section">
        <div className="p-section-head">
          <h2>{isAgent ? 'Live salons' : 'All salons'}</h2>
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
        </div>
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th>Salon</th>
                {!isAgent && <th>District</th>}
                <th>Status</th>
                <th className="num">Serving</th>
                <th className="num">Waiting</th>
                <th className="num">Tokens today</th>
                <th className="num">Online share</th>
                <th>Owner</th>
                {!isAgent && <th>Agent</th>}
                {isAdmin && <th />}
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => {
                const stats = salonStats(rowsFor(s))
                const open = isOpenNow(s.hours)
                return (
                  <tr key={s.id} className={suspended[s.id] ? 'is-muted' : ''}>
                    <td>
                      <div className="p-salon-cell">
                        <img src={s.photos[0].replace('w=1200', 'w=120')} alt="" />
                        <span>
                          <strong>{s.name}</strong>
                          <span className="muted small d-block">
                            {s.type} · {s.area} · {s.reviews ? `★ ${s.rating}` : 'New'}
                          </span>
                        </span>
                      </div>
                    </td>
                    {!isAgent && <td>{districtName(s.meta.district)}</td>}
                    <td>
                      {suspended[s.id] ? <Pill tone="red">Suspended</Pill> : open ? <Pill tone="green">Open</Pill> : <Pill>Closed</Pill>}
                    </td>
                    <td className="num p-token-cell">{tokenLabel(getQueue(s.id).serving)}</td>
                    <td className="num">
                      {stats.waiting}
                      <span className="muted small d-block">{waitLabel(stats.waiting * s.avgMins)}</span>
                    </td>
                    <td className="num">{stats.issued}</td>
                    <td className="num">{stats.issued ? Math.round((stats.online / stats.issued) * 100) : 0}%</td>
                    <td>{s.meta.owner}</td>
                    {!isAgent && <td>{nameOf(s.meta.agentId)}</td>}
                    {isAdmin && (
                      <td>
                        <button type="button" className="text-btn" onClick={() => toggleSuspend(s.id)}>
                          {suspended[s.id] ? 'Reinstate' : 'Suspend'}
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
