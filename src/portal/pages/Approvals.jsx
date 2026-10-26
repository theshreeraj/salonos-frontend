import { useState } from 'react'
import { FACILITIES, getCategory } from '../../data/salons'
import { dayLabel, hoursLabel } from '../../utils/format'
import { usePortal } from '../context'
import { APPLICATION_LABEL, APPLICATION_TONE, districtName } from '../data'
import { useScopedOnboardings } from '../hooks'
import { Empty, PageHeader, Pill } from '../ui'

const TABS = ['pending', 'approved', 'rejected']

export default function Approvals() {
  const { user, users } = usePortal()
  const applications = useScopedOnboardings()
  const [tab, setTab] = useState('pending')
  const list = applications.filter((a) => a.status === tab)
  const nameOf = (id) => users.find((u) => u.id === id)?.name ?? '—'

  return (
    <>
      <PageHeader
        eyebrow={user.role === 'admin' ? 'All districts' : districtName(user.district)}
        title="Approvals"
        sub="Salons submitted by field agents. Approved salons go live on the customer app."
      />

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>
            {APPLICATION_LABEL[t]}
            <span className="count">{applications.filter((a) => a.status === t).length}</span>
          </button>
        ))}
      </div>

      {list.length ? (
        <ul className="p-review-list">
          {list.map((a) => (
            <ApplicationCard key={a.id} app={a} agentName={nameOf(a.agentId)} />
          ))}
        </ul>
      ) : (
        <Empty icon="shield" title={`Nothing ${APPLICATION_LABEL[tab].toLowerCase()}`}>
          <p className="muted">New submissions from field agents appear under In review.</p>
        </Empty>
      )}
    </>
  )
}

function ApplicationCard({ app, agentName }) {
  const { reviewOnboarding } = usePortal()
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')

  return (
    <li className="p-card p-app-card">
      <div className="p-app-head">
        <div>
          <h3>{app.name}</h3>
          <span className="muted small">
            {app.type} · {app.area}, {districtName(app.district)} · by {agentName} · {dayLabel(app.submittedAt)}
          </span>
        </div>
        <Pill tone={APPLICATION_TONE[app.status]}>{APPLICATION_LABEL[app.status]}</Pill>
      </div>

      <dl className="p-review">
        <div>
          <dt>Address</dt>
          <dd>{app.address}</dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd>
            {app.owner} · {app.ownerPhone}
          </dd>
        </div>
        <div>
          <dt>Setup</dt>
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
          <dd>{app.facilities.map((f) => FACILITIES[f].label).join(', ')}</dd>
        </div>
        {app.reviewNote && (
          <div>
            <dt>Review note</dt>
            <dd>{app.reviewNote}</dd>
          </div>
        )}
      </dl>

      {app.status === 'pending' &&
        (rejecting ? (
          <div className="p-reject">
            <label className="field">
              <span>What does the agent need to fix?</span>
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
            </label>
            <div className="p-form-foot">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setRejecting(false)}>
                Back
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={!note.trim()} onClick={() => reviewOnboarding(app.id, 'rejected', note.trim())}>
                Send back to agent
              </button>
            </div>
          </div>
        ) : (
          <div className="p-form-foot">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setRejecting(true)}>
              Request changes
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => reviewOnboarding(app.id, 'approved')}>
              Approve salon
            </button>
          </div>
        ))}
    </li>
  )
}
