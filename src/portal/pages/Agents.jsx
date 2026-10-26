import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getSalon } from '../../data/salons'
import { addDays, dayLabel, isoDate, shortDate } from '../../utils/format'
import { usePortal } from '../context'
import { APPLICATION_LABEL, APPLICATION_TONE, SALON_META, districtName } from '../data'
import { useScopedAgents, useScopedLeads, useScopedOnboardings } from '../hooks'
import LeadDrawer, { FollowUpLabel, LeadStatusPill } from '../LeadDrawer'
import { followUpState, historyOf, isOpenLead, leadStatus } from '../leads'
import { pct } from '../network'
import { Avatar, Drawer, Empty, PageHeader, Pill, Stat, Tabs } from '../ui'

const WINDOW_DAYS = 30

// One row of numbers per agent; approvals include salons that went live before the lead pipeline existed
function useAgentRows() {
  const { onboardings } = usePortal()
  const agents = useScopedAgents()
  const leads = useScopedLeads()
  const applications = useScopedOnboardings()
  const since = addDays(isoDate(), -WINDOW_DAYS + 1)

  return agents.map((agent) => {
    const mine = leads.filter((l) => l.agentId === agent.id).map((l) => ({ lead: l, status: leadStatus(l, onboardings) }))
    const apps = applications.filter((a) => a.agentId === agent.id)
    const liveSalons = Object.entries(SALON_META).filter(([, m]) => m.agentId === agent.id)
    const activity = mine.flatMap(({ lead }) => lead.activities.filter((a) => a.kind !== 'note'))
    const decided = apps.filter((a) => a.status !== 'pending')
    const approved = apps.filter((a) => a.status === 'approved')
    return {
      agent,
      leads: mine,
      apps,
      liveSalons,
      open: mine.filter((r) => isOpenLead(r.status)).length,
      overdue: mine.filter((r) => isOpenLead(r.status) && followUpState(r.lead.nextFollowUp) === 'overdue').length,
      contacts: activity.filter((a) => isoDate(new Date(a.at)) >= since).length,
      submitted: apps.filter((a) => historyOf(a)[0].at >= since).length,
      // Every approved application became a catalogue salon, so live salons are the approvals
      approved: liveSalons.length,
      rate: decided.length ? `${pct(approved.length, decided.length)}%` : '—',
      lastActive: activity.length ? Math.max(...activity.map((a) => a.at)) : null,
    }
  })
}

export default function Agents() {
  const { user } = usePortal()
  const [params] = useSearchParams()
  const rows = useAgentRows().sort((a, b) => b.approved - a.approved || b.contacts - a.contacts)
  const [openId, setOpenId] = useState(params.get('open'))
  const open = rows.find((r) => r.agent.id === openId)
  const sum = (key) => rows.reduce((s, r) => s + r[key], 0)

  return (
    <>
      <PageHeader eyebrow={user.role === 'admin' ? 'All districts' : districtName(user.district)} title="Field agents" sub="Who's finding salons, who's following up, and whose onboardings get approved." />

      <div className="p-stats">
        <Stat label="Agents" value={rows.length} />
        <Stat label="Open leads" value={sum('open')} note={`${sum('overdue')} follow-ups overdue`} />
        <Stat label={`Contacts · ${WINDOW_DAYS} days`} value={sum('contacts')} note="Calls, visits and messages" />
        <Stat label={`Submitted · ${WINDOW_DAYS} days`} value={sum('submitted')} note={`${sum('approved')} salons approved all time`} />
      </div>

      <div className="p-table-wrap">
        <table className="p-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Agent</th>
              <th>District</th>
              <th className="num">Open leads</th>
              <th className="num">Overdue</th>
              <th className="num">Contacts</th>
              <th className="num">Submitted</th>
              <th className="num">Approved</th>
              <th className="num">Approval rate</th>
              <th>Last activity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.agent.id} className="is-clickable" onClick={() => setOpenId(r.agent.id)}>
                <td className="muted">{i + 1}</td>
                <td>
                  <div className="p-person">
                    <Avatar name={r.agent.name} />
                    <span>
                      <strong>{r.agent.name}</strong>
                      <span className="muted small d-block">{r.agent.email}</span>
                    </span>
                  </div>
                </td>
                <td>{districtName(r.agent.district)}</td>
                <td className="num">{r.open}</td>
                <td className={`num ${r.overdue ? 'tone-red' : ''}`}>{r.overdue}</td>
                <td className="num">{r.contacts}</td>
                <td className="num">{r.submitted}</td>
                <td className="num">
                  <strong>{r.approved}</strong>
                </td>
                <td className="num">{r.rate}</td>
                <td>{r.lastActive ? dayLabel(isoDate(new Date(r.lastActive))) : <span className="muted">No activity</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && <AgentDrawer row={open} onClose={() => setOpenId(null)} />}
    </>
  )
}

function AgentDrawer({ row, onClose }) {
  const [tab, setTab] = useState('leads')
  const [leadId, setLeadId] = useState(null)
  const { agent } = row

  if (leadId) return <LeadDrawer key={leadId} leadId={leadId} readOnly onClose={() => setLeadId(null)} />

  return (
    <Drawer title={agent.name} onClose={onClose}>
      <div className="drawer-head">
        <Avatar name={agent.name} size={56} />
        <div>
          <h2 className="p-sheet-title">{agent.name}</h2>
          <p className="muted small">
            {districtName(agent.district)} · +91 {agent.phone} · {agent.email}
          </p>
        </div>
      </div>
      <div className="drawer-stats">
        <span>
          <strong>{row.open}</strong> open leads
        </span>
        <span>
          <strong className={row.overdue ? 'tone-red' : ''}>{row.overdue}</strong> overdue
        </span>
        <span>
          <strong>{row.approved}</strong> approved
        </span>
      </div>

      <Tabs
        tabs={[
          { id: 'leads', label: `Leads (${row.leads.length})` },
          { id: 'apps', label: `Applications (${row.apps.length})` },
          { id: 'live', label: `Live (${row.liveSalons.length})` },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'leads' &&
        (row.leads.length ? (
          <ul className="drawer-list">
            {row.leads.map(({ lead, status }) => (
              <li key={lead.id}>
                <button type="button" className="agent-lead" onClick={() => setLeadId(lead.id)}>
                  <span className="drawer-row">
                    <strong>{lead.name}</strong>
                    <LeadStatusPill status={status} />
                  </span>
                  <span className="drawer-row">
                    <span className="muted small">
                      {lead.area} · {lead.activities.length} {lead.activities.length === 1 ? 'contact' : 'contacts'}
                    </span>
                    {isOpenLead(status) && <FollowUpLabel date={lead.nextFollowUp} />}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon="users" title="No leads yet" />
        ))}

      {tab === 'apps' &&
        (row.apps.length ? (
          <ul className="drawer-list">
            {row.apps.map((a) => (
              <li key={a.id}>
                <div className="drawer-row">
                  <strong>{a.name}</strong>
                  <Pill tone={APPLICATION_TONE[a.status]}>{APPLICATION_LABEL[a.status]}</Pill>
                </div>
                <span className="muted small">
                  {a.area} · submitted {shortDate(a.submittedAt)}
                  {a.reviewedAt && ` · reviewed ${shortDate(a.reviewedAt)}`}
                </span>
                {a.reviewNote && <p className="p-note">{a.reviewNote}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon="shield" title="No applications yet" />
        ))}

      {tab === 'live' &&
        (row.liveSalons.length ? (
          <ul className="drawer-list">
            {row.liveSalons.map(([id, m]) => (
              <li key={id}>
                <strong>{getSalon(id)?.name}</strong>
                <span className="muted small">
                  Live since {shortDate(m.onboardedOn)} · {m.chairs} chairs · owner {m.owner}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon="store" title="No live salons yet" />
        ))}
    </Drawer>
  )
}
