import { useEffect } from 'react'
import Icon from '../components/Icon'
import { TOKEN_STATUS } from './data'

export function PageHeader({ eyebrow, title, sub, children }) {
  return (
    <header className="p-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="p-title">{title}</h1>
        {sub && <p className="muted p-sub">{sub}</p>}
      </div>
      {children && <div className="p-head-actions">{children}</div>}
    </header>
  )
}

export function Stat({ label, value, note }) {
  return (
    <div className="p-stat">
      <span className="p-stat-label">{label}</span>
      <span className="p-stat-value">{value}</span>
      {note && <span className="p-stat-note">{note}</span>}
    </div>
  )
}

export function SourceBadge({ source }) {
  return (
    <span className={`p-badge ${source === 'online' ? 'p-badge-blue' : 'p-badge-gray'}`}>
      <Icon name={source === 'online' ? 'mobile' : 'store'} size={13} strokeWidth={2} />
      {source === 'online' ? 'Online' : 'Walk-in'}
    </span>
  )
}

const STATUS_TONE = { waiting: 'gray', 'in-chair': 'blue', done: 'green', 'no-show': 'amber', cancelled: 'red' }

export function TokenStatus({ status }) {
  return <span className={`p-badge p-badge-${STATUS_TONE[status]}`}>{TOKEN_STATUS[status]}</span>
}

export function Pill({ tone = 'gray', children }) {
  return <span className={`p-badge p-badge-${tone}`}>{children}</span>
}

export function Sheet({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet ${wide ? 'sheet-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={20} />
        </button>
        <h2 className="p-sheet-title">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function Drawer({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay p-drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="p-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={20} />
        </button>
        {children}
      </aside>
    </div>
  )
}

export function Avatar({ name, color, size = 32 }) {
  const letters = name
    .replace(/^Dr\.\s*/, '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span className={`p-avatar av-${color ?? 'none'}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">
      {letters}
    </span>
  )
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="p-tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={active === t.id} className={active === t.id ? 'is-active' : ''} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Empty({ icon = 'ticket', title, children }) {
  return (
    <div className="empty p-empty">
      <span className="empty-icon">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      {children}
    </div>
  )
}

// Today / 7 days / 30 days ending on any past day
export function RangeBar({ ranges, days, onDays, end, onEnd, max }) {
  return (
    <div className="range-bar">
      <div className="range-seg" role="radiogroup" aria-label="Range">
        {ranges.map((r) => (
          <button key={r.id} type="button" role="radio" aria-checked={days === r.id} className={days === r.id ? 'is-active' : ''} onClick={() => onDays(r.id)}>
            {r.id === 1 && end !== max ? 'Day' : r.label}
          </button>
        ))}
      </div>
      <label className="range-date">
        <Icon name="calendar" size={16} />
        <input type="date" max={max} value={end} onChange={(e) => e.target.value && onEnd(e.target.value)} aria-label="Ending on" />
      </label>
    </div>
  )
}

export function Kpi({ label, value, note, icon, tone = 'blue', hero = false }) {
  return (
    <div className={`cc-kpi tone-${tone} ${hero ? 'is-hero' : ''}`}>
      <div className="cc-kpi-top">
        <span className="cc-kpi-label">{label}</span>
        {icon && (
          <span className="cc-kpi-icon">
            <Icon name={icon} size={20} />
          </span>
        )}
      </div>
      <span className="cc-kpi-value">{value}</span>
      {note && <span className="cc-kpi-note">{note}</span>}
    </div>
  )
}
