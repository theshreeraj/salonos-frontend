import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon'
import { usePortal } from '../context'
import { districtName } from '../data'
import { SEVERITY, useAlerts } from '../alerts'
import { Empty, PageHeader, Pill, Stat } from '../ui'

const CATEGORY_ICON = { Approvals: 'shield', Queues: 'pulse', Bookings: 'ticket', Agents: 'users', Quality: 'star', Salons: 'store' }

export default function Health() {
  const { user } = usePortal()
  const alerts = useAlerts()
  const [severity, setSeverity] = useState('all')
  const [category, setCategory] = useState('all')
  const categories = [...new Set(alerts.map((a) => a.category))]
  const shown = alerts.filter((a) => (severity === 'all' || a.severity === severity) && (category === 'all' || a.category === category))
  const count = (sev) => alerts.filter((a) => a.severity === sev).length

  return (
    <>
      <PageHeader
        eyebrow={user.role === 'admin' ? 'All districts' : districtName(user.district)}
        title="Health & alerts"
        sub="Problems found automatically across salons, bookings, approvals and agents. Each one links to where you fix it."
      />

      <div className="p-stats">
        <Stat label="Critical" value={count('critical')} note="Needs action today" />
        <Stat label="Warnings" value={count('warning')} note="Watch closely" />
        <Stat label="Info" value={count('info')} note="Good to know" />
        <Stat label="Status" value={count('critical') ? 'Attention' : count('warning') ? 'Watch' : 'Healthy'} note={`${alerts.length} checks flagged`} />
      </div>

      <div className="p-toolbar">
        <div className="chips">
          {['all', 'critical', 'warning', 'info'].map((s) => (
            <button key={s} type="button" className={`chip ${severity === s ? 'is-active' : ''}`} onClick={() => setSeverity(s)}>
              {s === 'all' ? 'All' : SEVERITY[s].label} <span className="chip-count">{s === 'all' ? alerts.length : count(s)}</span>
            </button>
          ))}
        </div>
        <select className="p-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {shown.length ? (
        <ul className="hl-list">
          {shown.map((a) => (
            <li key={a.id} className={`hl-card is-${a.severity}`}>
              <span className="hl-icon">
                <Icon name={CATEGORY_ICON[a.category]} size={20} />
              </span>
              <span className="hl-main">
                <span className="hl-top">
                  <Pill tone={SEVERITY[a.severity].tone}>{SEVERITY[a.severity].label}</Pill>
                  <span className="muted small">{a.category}</span>
                </span>
                <strong>{a.title}</strong>
                <span className="muted small">{a.detail}</span>
              </span>
              <Link to={a.to} className="btn btn-outline btn-sm">
                {a.action}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon="shield" title={alerts.length ? 'Nothing in this filter' : 'All healthy'}>
          <p className="muted">{alerts.length ? 'Try another filter.' : 'No problems found across your salons, approvals and agents.'}</p>
        </Empty>
      )}
    </>
  )
}
