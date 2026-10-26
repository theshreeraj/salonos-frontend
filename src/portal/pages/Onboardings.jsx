import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import { FACILITIES, getCategory } from '../../data/salons'
import { dayLabel, hoursLabel, isoDate, shortDate } from '../../utils/format'
import { usePortal } from '../context'
import { APPLICATION_LABEL, APPLICATION_TONE, districtName, salonStats } from '../data'
import { useScopedOnboardings, useScopedSalons, useTokenRows } from '../hooks'
import { daysBetween, historyOf, telUrl } from '../leads'
import { Empty, PageHeader, Pill, Stat } from '../ui'

const TABS = ['all', 'pending', 'rejected', 'approved']
const HISTORY_LABEL = { submitted: 'Submitted', resubmitted: 'Resubmitted with fixes', approved: 'Approved', rejected: 'Sent back for changes' }

export default function Onboardings() {
  const { user } = usePortal()
  const [params] = useSearchParams()
  const applications = useScopedOnboardings()
  const live = useScopedSalons()
  const rowsFor = useTokenRows()
  const [tab, setTab] = useState('all')
  const [openId, setOpenId] = useState(params.get('open'))

  const sorted = [...applications].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  const shown = sorted.filter((a) => tab === 'all' || a.status === tab)
  const decided = applications.filter((a) => a.status !== 'pending')
  const approved = applications.filter((a) => a.status === 'approved')
  const approvalDays = approved.map((a) => daysBetween(a.submittedAt, a.reviewedAt))
  const count = (t) => (t === 'all' ? applications.length : applications.filter((a) => a.status === t).length)

  return (
    <>
      <PageHeader eyebrow={districtName(user.district)} title="Onboardings" sub="Every salon you've submitted, where it is in review, and the salons already live.">
        <Link to="/portal/onboard" className="btn btn-primary">
          <Icon name="plus" size={18} /> Onboard a salon
        </Link>
      </PageHeader>

      <div className="p-stats">
        <Stat label="Live salons" value={live.length} note="On the customer app" />
        <Stat label="In review" value={count('pending')} note="With your district manager" />
        <Stat label="Needs changes" value={count('rejected')} note={count('rejected') ? 'Fix and resubmit' : 'All clear'} />
        <Stat
          label="Approval rate"
          value={decided.length ? `${Math.round((approved.length / decided.length) * 100)}%` : '—'}
          note={approvalDays.length ? `Avg ${(approvalDays.reduce((s, d) => s + d, 0) / approvalDays.length).toFixed(1)} days to approve` : 'No decisions yet'}
        />
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>
            {t === 'all' ? 'All' : APPLICATION_LABEL[t]}
            <span className="count">{count(t)}</span>
          </button>
        ))}
      </div>

      {shown.length ? (
        <ul className="ob-list">
          {shown.map((a) => (
            <ApplicationRow key={a.id} app={a} open={openId === a.id} onToggle={() => setOpenId(openId === a.id ? null : a.id)} />
          ))}
        </ul>
      ) : (
        <Empty icon="store" title="Nothing here">
          <p className="muted">Applications you submit appear here with their review status.</p>
        </Empty>
      )}

      <section className="p-section">
        <div className="p-section-head">
          <h2>Live salons</h2>
          <span className="count">{live.length}</span>
        </div>
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th>Salon</th>
                <th>Owner</th>
                <th>Live since</th>
                <th className="num">Tokens today</th>
                <th className="num">Online share</th>
                <th className="num">Rating</th>
              </tr>
            </thead>
            <tbody>
              {live.map((s) => {
                const stats = salonStats(rowsFor(s))
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="p-salon-cell">
                        <img src={s.photos[0].replace('w=1200', 'w=120')} alt="" />
                        <span>
                          <strong>{s.name}</strong>
                          <span className="muted small d-block">
                            {s.type} · {s.area}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td>{s.meta.owner}</td>
                    <td>{shortDate(s.meta.onboardedOn)}</td>
                    <td className="num">{stats.issued}</td>
                    <td className="num">{stats.issued ? Math.round((stats.online / stats.issued) * 100) : 0}%</td>
                    <td className="num">{s.reviews ? `★ ${s.rating}` : 'New'}</td>
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

function ApplicationRow({ app, open, onToggle }) {
  const navigate = useNavigate()
  const history = historyOf(app)
  const waiting = app.status === 'pending' ? daysBetween(history.at(-1).at, isoDate()) : null
  // Tracker: Submitted → In review → Decision → Live
  const steps = [
    { label: 'Submitted', done: true, at: app.submittedAt },
    { label: 'In review', done: true, current: app.status === 'pending', at: app.status === 'pending' ? `${waiting === 0 ? 'Today' : `${waiting} ${waiting === 1 ? 'day' : 'days'}`}` : null },
    {
      label: app.status === 'rejected' ? 'Needs changes' : 'Approved',
      done: app.status !== 'pending',
      bad: app.status === 'rejected',
      current: app.status === 'rejected',
      at: app.status !== 'pending' ? app.reviewedAt : null,
    },
    { label: 'Live on app', done: app.status === 'approved', at: app.status === 'approved' ? app.reviewedAt : null },
  ]

  return (
    <li className={`p-card ob-card ${open ? 'is-open' : ''}`}>
      <button type="button" className="ob-head" onClick={onToggle} aria-expanded={open}>
        <span>
          <strong>{app.name}</strong>
          <span className="muted small d-block">
            {app.type} · {app.area} · {app.owner} · submitted {dayLabel(app.submittedAt)}
          </span>
        </span>
        <Pill tone={APPLICATION_TONE[app.status]}>{APPLICATION_LABEL[app.status]}</Pill>
        <Icon name="chevronDown" size={18} className="ob-chevron" />
      </button>

      <ol className="ob-track">
        {steps.map((s) => (
          <li key={s.label} className={`${s.done ? 'is-done' : ''} ${s.current ? 'is-current' : ''} ${s.bad ? 'is-bad' : ''}`}>
            <span className="ob-dot">{s.done && !s.current ? <Icon name={s.bad ? 'x' : 'check'} size={12} strokeWidth={2.6} /> : null}</span>
            <strong>{s.label}</strong>
            <span className="muted small">{s.at ? (s.at.includes('-') ? shortDate(s.at).replace(/ \d{4}$/, '') : s.at) : '—'}</span>
          </li>
        ))}
      </ol>

      {app.status === 'rejected' && app.reviewNote && (
        <div className="ob-note">
          <Icon name="info" size={18} />
          <span>
            <strong>Manager's note</strong>
            {app.reviewNote}
          </span>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/portal/onboard?resubmit=${app.id}`)}>
            Fix & resubmit
          </button>
        </div>
      )}

      {open && (
        <div className="ob-details">
          <dl className="p-review">
            <div>
              <dt>Address</dt>
              <dd>{app.address}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>
                {app.owner} ·{' '}
                <a className="link" href={telUrl(app.ownerPhone)}>
                  +91 {app.ownerPhone}
                </a>
              </dd>
            </div>
            <div>
              <dt>Salon</dt>
              <dd>
                {app.chairs} chairs · {hoursLabel(app.hours)}
              </dd>
            </div>
            <div>
              <dt>Services</dt>
              <dd>{app.categories.map((c) => getCategory(c).name).join(', ')}</dd>
            </div>
            <div>
              <dt>Facilities</dt>
              <dd>{app.facilities.map((f) => FACILITIES[f].label).join(', ') || '—'}</dd>
            </div>
          </dl>
          <h3 className="ob-history-title">Review history</h3>
          <ol className="lead-timeline">
            {[...history].reverse().map((h, i) => (
              <li key={i}>
                <span className="lead-timeline-icon">
                  <Icon name={h.status === 'approved' ? 'check' : h.status === 'rejected' ? 'x' : 'shield'} size={15} />
                </span>
                <div>
                  <div className="drawer-row">
                    <strong>{HISTORY_LABEL[h.status]}</strong>
                    <span className="muted small">{shortDate(h.at)}</span>
                  </div>
                  {h.note && <p className="drawer-note-body">{h.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </li>
  )
}
