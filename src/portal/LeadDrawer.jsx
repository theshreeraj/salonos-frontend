import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { addDays, dayLabel, isoDate, shortDate } from '../utils/format'
import { usePortal } from './context'
import { CONTACT_KINDS, LEAD_STATUS, OUTCOMES, followUpState, isOpenLead, leadStatus, telUrl, whatsappUrl } from './leads'
import { Drawer, Pill } from './ui'

const FOLLOW_TONE = { overdue: 'red', today: 'amber', week: 'blue', later: 'gray' }

export function FollowUpLabel({ date }) {
  const state = followUpState(date)
  if (!state) return <span className="muted">—</span>
  const text = state === 'overdue' ? `Overdue · ${shortDate(date).replace(/ \d{4}$/, '')}` : dayLabel(date)
  return <Pill tone={FOLLOW_TONE[state]}>{text}</Pill>
}

export function LeadStatusPill({ status }) {
  return <Pill tone={LEAD_STATUS[status].tone}>{LEAD_STATUS[status].label}</Pill>
}

const when = (ms) => new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

// readOnly: managers and admins viewing an agent's lead see contact history but can't act as the agent
export default function LeadDrawer({ leadId, onClose, readOnly = false }) {
  const navigate = useNavigate()
  const { leads, users, onboardings, logActivity, updateLead } = usePortal()
  const lead = leads.find((l) => l.id === leadId)
  const today = isoDate()
  const [kind, setKind] = useState('call')
  const [outcome, setOutcome] = useState(null)
  const [note, setNote] = useState('')
  const [next, setNext] = useState(lead?.nextFollowUp ?? addDays(today, 1))
  const [saved, setSaved] = useState(false)

  if (!lead) return null
  const status = leadStatus(lead, onboardings)
  const open = isOpenLead(status)
  const app = onboardings.find((o) => o.id === lead.onboardingId)
  const isNote = kind === 'note'
  const canSave = isNote ? note.trim() : outcome

  const pickOutcome = (id) => {
    setOutcome(id)
    const gap = OUTCOMES[id].followUp
    setNext(gap == null ? '' : addDays(today, gap))
  }

  const save = (e) => {
    e.preventDefault()
    logActivity(lead.id, { kind, outcome: isNote ? null : outcome, note: note.trim(), nextFollowUp: isNote ? lead.nextFollowUp : next || null })
    setOutcome(null)
    setNote('')
    setSaved(true)
  }

  return (
    <Drawer title={lead.name} onClose={onClose}>
      <div className="lead-head">
        <div>
          <h2 className="p-sheet-title">{lead.name}</h2>
          <p className="muted small">
            {lead.type} · {lead.area}
            {lead.address && ` · ${lead.address}`}
          </p>
          <p className="muted small">
            {lead.source} · added {dayLabel(lead.createdAt)}
            {readOnly && ` · agent ${users.find((u) => u.id === lead.agentId)?.name ?? '—'}`}
          </p>
        </div>
        <LeadStatusPill status={status} />
      </div>

      <div className="lead-contact">
        <div>
          <strong>{lead.owner || 'Owner not recorded'}</strong>
          <span className="muted small d-block">+91 {lead.phone}</span>
        </div>
        <a className="btn btn-outline btn-sm" href={telUrl(lead.phone)}>
          <Icon name="phone" size={16} /> Call
        </a>
        <a className="btn btn-outline btn-sm" href={whatsappUrl(lead)} target="_blank" rel="noreferrer">
          <Icon name="mobile" size={16} /> WhatsApp
        </a>
      </div>

      {open && readOnly && (
        <div className="lead-next">
          <strong>Next follow-up</strong>
          <FollowUpLabel date={lead.nextFollowUp} />
        </div>
      )}
      {open && !readOnly && (
        <div className="lead-next">
          <span>
            <strong>Next follow-up</strong>
            <FollowUpLabel date={lead.nextFollowUp} />
          </span>
          <input type="date" min={today} value={lead.nextFollowUp ?? ''} onChange={(e) => updateLead(lead.id, { nextFollowUp: e.target.value || null })} aria-label="Next follow-up date" />
        </div>
      )}

      {status === 'interested' && !readOnly && (
        <button type="button" className="btn btn-primary btn-block" onClick={() => navigate(`/portal/onboard?lead=${lead.id}`)}>
          <Icon name="store" size={18} /> Start onboarding
        </button>
      )}
      {app && (
        <div className={`lead-app lead-app-${app.status}`}>
          <span>
            <strong>Application {LEAD_STATUS[status].label.toLowerCase()}</strong>
            <span className="small d-block">
              Submitted {dayLabel(app.submittedAt)}
              {app.reviewNote && ` · “${app.reviewNote}”`}
            </span>
          </span>
          {readOnly ? (
            app.status === 'pending' && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate('/portal/approvals')}>
                Review
              </button>
            )
          ) : app.status === 'rejected' ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/portal/onboard?resubmit=${app.id}`)}>
              Fix & resubmit
            </button>
          ) : (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(`/portal/onboardings?open=${app.id}`)}>
              View
            </button>
          )}
        </div>
      )}
      {status === 'not-interested' && !readOnly && (
        <button type="button" className="btn btn-outline btn-block" onClick={() => updateLead(lead.id, { stage: 'contacted', nextFollowUp: today })}>
          Reopen lead
        </button>
      )}

      {!app && !readOnly && (
        <form className="lead-log" onSubmit={save}>
          <h3>Log a contact</h3>
          <div className="segmented lead-kinds" role="radiogroup" aria-label="Contact type">
            {['call', 'whatsapp', 'visit', 'note'].map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? 'is-active' : ''} onClick={() => setKind(k)}>
                {CONTACT_KINDS[k].label}
              </button>
            ))}
          </div>
          {!isNote && (
            <div className="chips" role="radiogroup" aria-label="Outcome">
              {Object.entries(OUTCOMES).map(([id, o]) => (
                <button key={id} type="button" role="radio" aria-checked={outcome === id} className={`chip ${outcome === id ? 'is-active' : ''}`} onClick={() => pickOutcome(id)}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={isNote ? 'What do you want to remember?' : 'What did they say? Objections, decision maker, best time to call…'} aria-label="Notes" />
          {!isNote && outcome !== 'not-interested' && (
            <label className="field lead-next-field">
              <span>Follow up on</span>
              <input type="date" min={today} value={next} onChange={(e) => setNext(e.target.value)} />
            </label>
          )}
          <button type="submit" className="btn btn-primary btn-sm" disabled={!canSave}>
            Save {isNote ? 'note' : 'contact'}
          </button>
          {saved && <span className="lead-saved">Saved to timeline</span>}
        </form>
      )}

      <h3 className="lead-timeline-title">Timeline</h3>
      {lead.activities.length ? (
        <ol className="lead-timeline">
          {[...lead.activities].reverse().map((a) => (
            <li key={a.id}>
              <span className="lead-timeline-icon">
                <Icon name={CONTACT_KINDS[a.kind].icon} size={15} />
              </span>
              <div>
                <div className="drawer-row">
                  <strong>
                    {CONTACT_KINDS[a.kind].label}
                    {a.outcome && ` · ${OUTCOMES[a.outcome].label}`}
                  </strong>
                  <span className="muted small">{when(a.at)}</span>
                </div>
                {a.note && <p className="drawer-note-body">{a.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">No contact yet. Call or visit, then log what happened.</p>
      )}
    </Drawer>
  )
}
