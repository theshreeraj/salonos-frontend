import { useState } from 'react'
import Icon from '../../components/Icon'
import { isoDate } from '../../utils/format'
import { usePortal } from '../context'
import { districtName } from '../data'
import { useMyLeads, useScopedOnboardings, useScopedSalons } from '../hooks'
import { daysBetween, followUpState, historyOf, isOpenLead, leadStatus } from '../leads'
import { PageHeader, Stat } from '../ui'

const monthOf = (iso) => iso.slice(0, 7)
const monthLabel = (m, opts = { month: 'long', year: 'numeric' }) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', opts)
function shiftMonth(m, by) {
  const d = new Date(`${m}-01T00:00:00`)
  d.setMonth(d.getMonth() + by)
  return isoDate(d).slice(0, 7)
}

export default function Performance() {
  const { user, onboardings } = usePortal()
  const leads = useMyLeads()
  const applications = useScopedOnboardings()
  const live = useScopedSalons()
  const current = monthOf(isoDate())
  const [month, setMonth] = useState(current)

  // Salons live before this pipeline existed count as submitted and approved on their go-live date;
  // salons that came through an application are counted from its history instead
  const events = [
    ...live.filter((s) => !s.onboardingId).flatMap((s) => [
      { kind: 'submitted', at: s.meta.onboardedOn },
      { kind: 'approved', at: s.meta.onboardedOn, days: 0 },
    ]),
    ...applications.flatMap((a) =>
      historyOf(a).map((h) => ({ kind: h.status === 'resubmitted' ? 'resubmitted' : h.status, at: h.at, days: h.status === 'approved' ? daysBetween(a.submittedAt, h.at) : null })),
    ),
  ]
  const contacts = leads.flatMap((l) => l.activities.filter((a) => a.kind !== 'note' && a.kind !== 'onboarding').map((a) => ({ leadId: l.id, at: isoDate(new Date(a.at)) })))

  const statsFor = (m) => {
    const inMonth = (e) => monthOf(e.at) === m
    const approvedEvents = events.filter((e) => e.kind === 'approved' && inMonth(e))
    const monthContacts = contacts.filter(inMonth)
    return {
      submitted: events.filter((e) => e.kind === 'submitted' && inMonth(e)).length,
      approved: approvedEvents.length,
      rejected: events.filter((e) => e.kind === 'rejected' && inMonth(e)).length,
      approvalDays: approvedEvents.filter((e) => e.days != null && e.days > 0).map((e) => e.days),
      contacts: monthContacts.length,
      salonsContacted: new Set(monthContacts.map((c) => c.leadId)).size,
      leadsAdded: leads.filter((l) => monthOf(l.createdAt) === m),
    }
  }

  const s = statsFor(month)
  const decisions = s.approved + s.rejected
  const allTimeApproved = events.filter((e) => e.kind === 'approved').length
  const avgDays = s.approvalDays.length ? (s.approvalDays.reduce((a, b) => a + b, 0) / s.approvalDays.length).toFixed(1) : null
  const pending = applications.filter((a) => a.status === 'pending').length

  // Funnel: leads added this month and how far each got
  const funnelLeads = s.leadsAdded.map((l) => ({ lead: l, status: leadStatus(l, onboardings) }))
  const reached = (test) => funnelLeads.filter(test).length
  const funnel = [
    { label: 'Leads added', value: funnelLeads.length },
    { label: 'Contacted', value: reached(({ lead }) => lead.stage !== 'new' || lead.activities.some((a) => a.outcome)) },
    { label: 'Interested', value: reached(({ lead }) => lead.stage === 'interested' || lead.onboardingId) },
    { label: 'Submitted for approval', value: reached(({ lead }) => lead.onboardingId) },
    { label: 'Approved & live', value: reached(({ status }) => status === 'onboarded') },
  ]
  const funnelMax = Math.max(1, funnel[0].value)

  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5)).map((m) => ({ m, ...statsFor(m) }))
  const chartMax = Math.max(1, ...months.map((x) => Math.max(x.submitted, x.approved)))

  const openLeads = leads.filter((l) => isOpenLead(leadStatus(l, onboardings)))
  const dueState = (st) => openLeads.filter((l) => followUpState(l.nextFollowUp) === st).length

  return (
    <>
      <PageHeader eyebrow={`${user.name} · ${districtName(user.district)}`} title="My performance">
        <div className="perf-month">
          <button type="button" className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
            <Icon name="chevronLeft" size={18} />
          </button>
          <span>
            <Icon name="calendar" size={16} /> {monthLabel(month)}
          </span>
          <button type="button" className="icon-btn" disabled={month >= current} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
            <Icon name="chevronRight" size={18} />
          </button>
        </div>
      </PageHeader>

      <div className="perf-hero">
        <div>
          <span className="perf-hero-label">Salons onboarded · {monthLabel(month)}</span>
          <span className="perf-hero-value">{s.approved}</span>
          <span className="perf-hero-note">approved by your district manager · {allTimeApproved} all time</span>
        </div>
        <div className="perf-hero-tiles">
          <span>
            <small>Submitted</small>
            <strong>{s.submitted}</strong>
          </span>
          <span>
            <small>Sent back</small>
            <strong>{s.rejected}</strong>
          </span>
          <span>
            <small>Approval rate</small>
            <strong>{decisions ? `${Math.round((s.approved / decisions) * 100)}%` : '—'}</strong>
          </span>
        </div>
      </div>

      <div className="p-stats">
        <Stat label="Awaiting approval" value={pending} note={pending ? 'With your manager now' : 'Nothing waiting'} />
        <Stat label="Avg approval time" value={avgDays ? `${avgDays} d` : '—'} note="Submission to approval" />
        <Stat label="Contacts logged" value={s.contacts} note={`${s.salonsContacted} salons · ${s.leadsAdded.length} new leads`} />
        <Stat
          label="Lead conversion"
          value={funnel[0].value ? `${Math.round((funnel[3].value / funnel[0].value) * 100)}%` : '—'}
          note="New leads → submitted"
        />
      </div>

      <div className="perf-grid">
        <section className="p-card">
          <h2 className="perf-title">Onboarding funnel</h2>
          <p className="muted small perf-sub">Leads added in {monthLabel(month, { month: 'long' })} and how far they got</p>
          <ul className="perf-funnel">
            {funnel.map((f) => (
              <li key={f.label}>
                <span>{f.label}</span>
                <strong>{f.value}</strong>
                <span className="perf-bar">
                  <i style={{ width: `${(f.value / funnelMax) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="p-card">
          <h2 className="perf-title">Last 6 months</h2>
          <p className="muted small perf-sub">Submitted vs approved, with contacts logged</p>
          <div className="perf-chart" role="img" aria-label="Submitted and approved salons per month">
            {months.map((x) => (
              <div key={x.m} className={`perf-col ${x.m === month ? 'is-current' : ''}`}>
                <div className="perf-bars">
                  <i className="is-submitted" style={{ height: `${(x.submitted / chartMax) * 100}%` }} title={`${x.submitted} submitted`} />
                  <i className="is-approved" style={{ height: `${(x.approved / chartMax) * 100}%` }} title={`${x.approved} approved`} />
                </div>
                <strong>{monthLabel(x.m, { month: 'short' })}</strong>
                <span className="muted small">
                  {x.submitted}/{x.approved} · {x.contacts}c
                </span>
              </div>
            ))}
          </div>
          <p className="perf-legend small">
            <i className="is-submitted" /> Submitted <i className="is-approved" /> Approved <span className="muted">c = contacts</span>
          </p>
        </section>

        <section className="p-card">
          <h2 className="perf-title">Follow-up health</h2>
          <p className="muted small perf-sub">Right now, across your open leads</p>
          <div className="perf-health">
            <span>
              <strong>{openLeads.length}</strong>Open leads
            </span>
            <span className="is-amber">
              <strong>{dueState('today')}</strong>Due today
            </span>
            <span className="is-red">
              <strong>{dueState('overdue')}</strong>Overdue
            </span>
          </div>
        </section>
      </div>
    </>
  )
}
