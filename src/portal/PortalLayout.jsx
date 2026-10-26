import { Fragment, useState } from 'react'
import { Link, Navigate, NavLink, Outlet } from 'react-router-dom'
import Icon from '../components/Icon'
import { useNavBadges } from './NavBadges'
import { usePortal } from './context'
import { ROLES } from './data'
import { homeFor, navFor, scopeLabel } from './hooks'
import './portal.css'

const initials = (name) =>
  name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')

export function RequireRole({ roles, children }) {
  const { user } = usePortal()
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />
  return children
}

function SideNav({ user, badges = {}, onNavigate }) {
  return (
    <nav className="p-nav" aria-label="Portal">
      {navFor(user).map((item, i, items) => {
        const badge = item.badge && badges[item.badge]
        return (
          <Fragment key={item.to}>
            {item.section && item.section !== items[i - 1]?.section && <p className="p-nav-section">{item.section}</p>}
            <NavLink to={item.to} className="p-nav-link" onClick={onNavigate}>
              <Icon name={item.icon} size={20} />
              {item.label}
              {badge?.value ? <span className={`p-nav-badge ${badge.tone ? `is-${badge.tone}` : ''}`}>{badge.value}</span> : null}
            </NavLink>
          </Fragment>
        )
      })}
    </nav>
  )
}

// Badge counts are only computed for roles that oversee salons
function BadgedNav(props) {
  return <SideNav {...props} badges={useNavBadges()} />
}

export default function PortalLayout() {
  const { ready, user, logout } = usePortal()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!ready) {
    return (
      <div className="p-loading">
        <span className="spinner" aria-label="Loading" />
      </div>
    )
  }
  if (!user) return <Navigate to="/portal/login" replace />
  const role = ROLES[user.role]
  const oversees = user.role === 'manager' || user.role === 'admin'

  return (
    <div className={`portal ${menuOpen ? 'menu-open' : ''}`}>
      <aside className="p-side">
        <div className="p-side-top">
          <NavLink to={homeFor(user)} className="logo">
            <span className="logo-mark">
              <Icon name="scissors" size={18} strokeWidth={2} />
            </span>
            <span className="logo-word">SalonOS</span>
            <span className="p-biz-tag">Business</span>
          </NavLink>
          <div className="p-scope">
            <Icon name={user.salonId ? 'store' : 'pin'} size={18} />
            <span>
              <strong>{scopeLabel(user)}</strong>
              <span>{role.label}</span>
            </span>
          </div>
        </div>

        {oversees ? <BadgedNav user={user} onNavigate={() => setMenuOpen(false)} /> : <SideNav user={user} onNavigate={() => setMenuOpen(false)} />}

        {user.role === 'frontdesk' && (
          <Link to="/portal/calendar?new=1" className="btn btn-primary btn-block p-side-cta" onClick={() => setMenuOpen(false)}>
            <Icon name="plus" size={18} /> New appointment
          </Link>
        )}

        <div className="p-user">
          <span className="team-avatar">{initials(user.name)}</span>
          <span className="p-user-name">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </span>
          <button type="button" className="text-btn" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="p-mobile-bar">
        <button type="button" className="icon-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu" aria-expanded={menuOpen}>
          <Icon name={menuOpen ? 'x' : 'sliders'} size={22} />
        </button>
        <strong>{scopeLabel(user)}</strong>
        <span className="team-avatar small-avatar">{initials(user.name)}</span>
      </div>
      <div className="p-scrim" onClick={() => setMenuOpen(false)} />

      <main className="p-main">
        <Outlet />
      </main>
    </div>
  )
}
