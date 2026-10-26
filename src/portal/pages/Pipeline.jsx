import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon'
import { dayLabel, isoDate } from '../../utils/format'
import { usePortal } from '../context'
import { districtName } from '../data'
import { useScopedAgents, useScopedLeads, useScopedOnboardings } from '../hooks'
import LeadDrawer, { FollowUpLabel, LeadStatusPill } from '../LeadDrawer'
import { LEAD_STATUS, OUTCOMES, daysBetween, historyOf, isOpenLead, leadStatus } from '../leads'
import { pct } from '../network'
import { Empty, PageHeader, Pill } from '../ui'

const SLA_DAYS = 2
const FILTERS = ['all', 'new', 'contacted', 'interested', 'review', 'changes', 'onboarded', 'not-interested']

export default function Pipeline() {
  const { user, users, onboardings } = usePortal()
  const leads = useScopedLeads()
  const agents = useScopedAgents()
  const applications = useScopedOnboardings()
  const [filter, setFilter] = useState('all')
  const [agentId, setAgentId] = useState('all')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState(null)
  const today = isoDate()
  const nameOf = (id) => users.find((u) => u.id === id)?.name ?? '—'

  const rows = leads.map((l) => ({ lead: l, status: leadStatus(l, onboardings), last: l.activities.at(-1) }))
  const reached = (test) => rows.filter(test).length
  const funnel = [
    { label: 'Leads found', value: rows.length },
    { label: 'Contacted', value: reached((r) => r.lead.stage !== 'new' || r.lead.activities.some((a) => a.outcome)) },
    { label: 'Interested', value: reached((r) => r.lead.stage === 'interested' || r.lead.onboardingId) },
    { label: 'Submitted', value: reached((r) => r.lead.onboardingId) },
    { label: 'Approved & live', value: reached((r) => r.status === 'onboarded') },
  ]

  const pending = applications
    .filter((a) => a.status === 'pending')
    .map((a) => ({ app: a, waited: daysBetween(historyOf(a).at(-1).at, today) }))
    .sort((a, b) => b.waited - a.waited)
  const sentBack = applications.filter((a) => a.status === 'rejected')

  const q = query.trim().toLowerCase()
  const shown = rows
    .filter((r) => (filter === 'all' || r.status === filter) && (agentId === 'all' || r.lead.agentId === agentId))
    .filter((r) => !q || [r.lead.name, r.lead.area, r.lead.owner, r.lead.phone].some((x) => x?.toLowerCase().includes(q)))
    .sort((a, b) => (b.last?.at ?? 0) - (a.last?.at ?? 0))

  return (
    <>
      <PageHeader
        eyebrow={user.role === 'admin' ? 'All districts' : districtName(user.district)}
        title="Onboarding pipeline"
        sub="Every salon your agents are working on, from first visit to live on the app."
      >
        <Link to="/portal/approvals" className="btn btn-primary">
          <Icon name="shield" size={18} /> Approvals {pending.length > 0 && `(${pending.length})`}
        </Link>
      </PageHeader>

      <ol className="pl-funnel">
        {funnel.map((f, i) => (
          <li key={f.label}>
            <span className="pl-step">{f.label}</span>
            <strong>{f.value}</strong>
            <span className="muted small">{i === 0 ? 'All time' : `${pct(f.value, funnel[i - 1].value)}% of previous`}</span>
          </li>
        ))}
      </ol>

      <div className="pl-grid">
        <section className="p-card cc-card">
          <div className="cc-card-head">
            <div>
              <h2>Waiting for approval</h2>
              <p className="muted small">Target: decide within {SLA_DAYS} days</p>
            </div>
          </div>
          {pending.length ? (
            <ul className="pl-list">
              {pending.map(({ app, waited }) => (
                <li key={app.id}>
                  <span>
                    <strong>{app.name}</strong>
                    <span className="muted small d-block">
                      {app.area} · {districtName(app.district)} · {nameOf(app.agentId)}
                    </span>
                  </span>
                  <Pill tone={waited >= SLA_DAYS ? 'red' : waited ? 'amber' : 'green'}>{waited ? `${waited} ${waited === 1 ? 'day' : 'days'}` : 'Today'}</Pill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nothing waiting. Good job.</p>
          )}
        </section>

        <section className="p-card cc-card">
          <div className="cc-card-head">
            <div>
              <h2>Sent back to agents</h2>
              <p className="muted small">Waiting for the agent to fix and resubmit</p>
            </div>
          </div>
          {sentBack.length ? (
            <ul className="pl-list">
              {sentBack.map((a) => (
                <li key={a.id}>
                  <span>
                    <strong>{a.name}</strong>
                    <span className="muted small d-block">
                      {nameOf(a.agentId)}
                      {a.reviewedAt && ` · sent back ${dayLabel(a.reviewedAt)}`}
                    </span>
                    {a.reviewNote && <span className="small d-block pl-note">“{a.reviewNote}”</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No applications sent back.</p>
          )}
        </section>
      </div>

      <section className="p-section">
        <div className="p-section-head">
          <h2>All leads</h2>
          <span className="count">{rows.length}</span>
          <select className="p-select" value={agentId} onChange={(e) => setAgentId(e.target.value)} aria-label="Agent">
            <option value="all">All agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="p-toolbar">
          <div className="chips">
            {FILTERS.map((f) => (
              <button key={f} type="button" className={`chip ${filter === f ? 'is-active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : LEAD_STATUS[f].label} <span className="chip-count">{f === 'all' ? rows.length : rows.filter((r) => r.status === f).length}</span>
              </button>
            ))}
          </div>
          <label className="p-search">
            <Icon name="search" size={18} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Salon, owner, area, phone" aria-label="Search leads" />
          </label>
        </div>

        {shown.length ? (
          <div className="p-table-wrap">
            <table className="p-table lead-table">
              <thead>
                <tr>
                  <th>Salon</th>
                  <th>Agent</th>
                  <th>Status</th>
                  <th>Next follow-up</th>
                  <th>Last contact</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ lead, status, last }) => (
                  <tr key={lead.id} className="is-clickable" onClick={() => setOpenId(lead.id)}>
                    <td>
                      <strong>{lead.name}</strong>
                      <span className="muted small d-block">
                        {lead.type} · {lead.area}
                      </span>
                    </td>
                    <td>{nameOf(lead.agentId)}</td>
                    <td>
                      <LeadStatusPill status={status} />
                    </td>
                    <td>{isOpenLead(status) ? <FollowUpLabel date={lead.nextFollowUp} /> : <span className="muted">—</span>}</td>
                    <td className="lead-last">
                      {last ? (
                        <>
                          <span className="small">
                            {dayLabel(isoDate(new Date(last.at)))}
                            {last.outcome && ` · ${OUTCOMES[last.outcome].label}`}
                          </span>
                          {last.note && <span className="muted small d-block">{last.note}</span>}
                        </>
                      ) : (
                        <span className="muted small">Not contacted</span>
                      )}
                    </td>
                    <td className="small">{dayLabel(lead.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="list" title="No leads match" />
        )}
      </section>

      {openId && <LeadDrawer key={openId} leadId={openId} readOnly onClose={() => setOpenId(null)} />}
    </>
  )
}
