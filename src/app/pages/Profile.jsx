import { Link } from 'react-router-dom'
import Icon from '../../components/Icon'
import { TabScreen } from '../AppLayout'
import { useApp } from '../context'

export default function Profile() {
  const { user, signOut } = useApp()
  return (
    <TabScreen>
      <header className="m-topbar">
        <h1>Profile</h1>
      </header>
      <div className="m-pad">
        {user ? (
          <div className="m-card m-profile">
            <span className="m-avatar">{user.name[0]}</span>
            <div>
              <strong>{user.name}</strong>
              <span className="m-muted m-small">+91 {user.phone}</span>
            </div>
          </div>
        ) : (
          <div className="m-card m-profile-guest">
            <strong>You're browsing as a guest</strong>
            <span className="m-muted m-small">Sign in with your mobile number to book appointments and see your bookings.</span>
            <Link to="/app/login" state={{ next: '/app/profile' }} className="m-btn m-btn-primary m-btn-block">
              Sign in
            </Link>
          </div>
        )}

        <ul className="m-menu">
          <li>
            <Link to="/app/bookings">
              <Icon name="calendar" size={22} /> My bookings <Icon name="chevronRight" size={18} />
            </Link>
          </li>
          <li>
            <Link to="/app/favourites">
              <Icon name="heart" size={22} /> Favourites <Icon name="chevronRight" size={18} />
            </Link>
          </li>
          <li>
            <Link to="/portal/login">
              <Icon name="store" size={22} /> For salon owners <Icon name="chevronRight" size={18} />
            </Link>
          </li>
          {user && (
            <li>
              <button type="button" onClick={signOut}>
                <Icon name="logout" size={22} /> Sign out
              </button>
            </li>
          )}
        </ul>
      </div>
    </TabScreen>
  )
}
