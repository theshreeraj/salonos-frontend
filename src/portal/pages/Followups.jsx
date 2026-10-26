import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { dayLabel, isoDate } from '../../utils/format'
import { usePortal } from '../context'
import { districtName } from '../data'
import { useMyLeads, useScopedOnboardings } from '../hooks'
import LeadDrawer, { FollowUpLabel, LeadStatusPill } from '../LeadDrawer'
import { OUTCOMES, followUpState, isOpenLead, leadStatus, telUrl, whatsappUrl } from '../leads'
import { Empty, PageHeader, Stat } from '../ui'

const GROUPS = [
  { id: 'overdue', title: 'Overdue', sub: 'Missed follow-up dates' },
  { id: 'today', title: 'Today', sub: 'Still to contact today' },
  { id: 'week', title: 'Next 7 days', sub: 'Coming up' },
  { id: 'later', title: 'Later', sub: 'Scheduled further out' },
]

export default function Followups() {
  const navigate = useNavigate()
  const { user, onboardings } = usePortal()
  const leads = useMyLeads()
  const applications = useScopedOnboardings()
  const [openId, setOpenId] = useState(null)
  const today = isoDate()

  const open = leads.map((l) => ({ lead: l, status: leadStatus(l, onboardings) })).filter((r) => isOpenLead(r.status))
  const scheduled = open.filter((r) => r.lead.nextFollowUp).sort((a, b) => a.lead.nextFollowUp.localeCompare(b.lead.nextFollowUp))
  const unscheduled = open.filter((r) => !r.lead.nextFollowUp)
  const byGroup = (id) => scheduled.filter((r) => followUpState(r.lead.nextFollowUp, today) === id)
  const needsChanges = applications.filter((a) => a.status === 'rejected')
  const inReview = applications.filter((a) => a.status === 'pending')

  return (
    <>
      <PageHeader eyebrow={districtName(user.district)} title="Follow-ups" sub="Who to call or visit, and what they said last time.">
        <Link to="/portal/leads" className="btn btn-outline">
          All leads
        </Link>
      </PageHeader>

      <div className="p-stats">
        <Stat label="Overdue" value={byGroup('overdue').length} note="Missed follow-up dates" />
        <Stat label="Due today" value={byGroup('today').length} note="Still to contact" />
        <Stat label="Next 7 days" value={byGroup('week').length} note="Upcoming" />
        <Stat label="Awaiting approval" value={inReview.length} note="With your district manager" />
      </div>

      {needsChanges.length > 0 && (
        <section className="p-section fu-changes">
          <div className="p-section-head">
            <h2>Sent back by your manager</h2>
            <span className="count">{needsChanges.length}</span>
          </div>
          <ul className="fu-list">
            {needsChanges.map((a) => (
              <li key={a.id} className="fu-card fu-card-alert">
                <div className="fu-main">
                  <strong>{a.name}</strong>
                  <span className="muted small">
                    {a.area} · {a.owner}
                    {a.reviewedAt && ` · sent back ${dayLabel(a.reviewedAt)}`}
                  </span>
                  {a.reviewNote && <p className="p-note">{a.reviewNote}</p>}
                </div>
                <div className="fu-actions">
                  <a className="btn btn-outline btn-sm" href={telUrl(a.ownerPhone)}>
                    <Icon name="phone" size={16} /> Call owner
                  </a>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/portal/onboard?resubmit=${a.id}`)}>
                    Fix & resubmit
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {scheduled.length === 0 && unscheduled.length === 0 ? (
        <Empty icon="bell" title="No follow-ups">
          <p className="muted">Add a lead after your first visit and set when to go back.</p>
          <Link to="/portal/leads" className="btn btn-outline btn-sm">
            Go to leads
          </Link>
        </Empty>
      ) : (
        GROUPS.map((g) => {
          const items = byGroup(g.id)
          if (!items.length) return null
          return (
            <section key={g.id} className="p-section">
              <div className="p-section-head">
                <h2>{g.title}</h2>
                <span className="count">{items.length}</span>
              </div>
              <ul className="fu-list">
                {items.map(({ lead, status }) => (
                  <FollowupCard key={lead.id} lead={lead} status={status} onOpen={() => setOpenId(lead.id)} />
                ))}
              </ul>
            </section>
          )
        })
      )}

      {unscheduled.length > 0 && (
        <section className="p-section">
          <div className="p-section-head">
            <h2>No follow-up set</h2>
            <span className="count">{unscheduled.length}</span>
          </div>
          <ul className="fu-list">
            {unscheduled.map(({ lead, status }) => (
              <FollowupCard key={lead.id} lead={lead} status={status} onOpen={() => setOpenId(lead.id)} />
            ))}
          </ul>
        </section>
      )}

      {openId && <LeadDrawer key={openId} leadId={openId} onClose={() => setOpenId(null)} />}
    </>
  )
}

function FollowupCard({ lead, status, onOpen }) {
  const last = lead.activities.at(-1)
  return (
    <li className="fu-card">
      <button type="button" className="fu-main" onClick={onOpen}>
        <span className="fu-title">
          <strong>{lead.name}</strong>
          <LeadStatusPill status={status} />
        </span>
        <span className="muted small">
          {lead.area} · {lead.owner || 'Owner unknown'} · +91 {lead.phone}
        </span>
        <span className="fu-last small">
          {last ? (
            <>
              <strong>{last.outcome ? OUTCOMES[last.outcome].label : 'Note'}:</strong> {last.note || 'No notes'}
            </>
          ) : (
            <span className="muted">Not contacted yet</span>
          )}
        </span>
      </button>
      <div className="fu-actions">
        <FollowUpLabel date={lead.nextFollowUp} />
        <a className="icon-btn" href={telUrl(lead.phone)} aria-label={`Call ${lead.name}`}>
          <Icon name="phone" size={18} />
        </a>
        <a className="icon-btn" href={whatsappUrl(lead)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${lead.name}`}>
          <Icon name="mobile" size={18} />
        </a>
        <button type="button" className="btn btn-primary btn-sm" onClick={onOpen}>
          Log contact
        </button>
      </div>
    </li>
  )
}
