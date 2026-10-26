import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import Icon from '../components/Icon'
import { useApp } from './context'
import './app.css'

const TABS = [
  { to: '/app', label: 'Home', icon: 'home', end: true },
  { to: '/app/bookings', label: 'Bookings', icon: 'calendar' },
  { to: '/app/favourites', label: 'Favourites', icon: 'heart' },
  { to: '/app/profile', label: 'Profile', icon: 'user' },
]

export default function AppLayout() {
  return (
    <div className="m-stage">
      <div className="m-shell">
        <Outlet />
      </div>
    </div>
  )
}

// Screens with the bottom tab bar
export function TabScreen({ children }) {
  return (
    <>
      <main className="m-main">{children}</main>
      <nav className="m-tabbar" aria-label="Main">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className="m-tab">
            <Icon name={t.icon} size={24} />
            {t.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}

// Booking requires a signed-in customer; send them to sign in and bring them back here afterwards
export function RequireCustomer({ children }) {
  const { user, ready } = useApp()
  const location = useLocation()
  if (!ready) return <main className="m-main m-empty"><span className="m-spinner" /></main>
  if (!user) return <Navigate to="/app/login" replace state={{ next: location.pathname, reason: 'book' }} />
  return children
}
