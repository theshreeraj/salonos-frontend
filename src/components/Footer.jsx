import { Link } from 'react-router-dom'
import { Logo } from './Header'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div>
          <Logo />
          <p className="muted small">Book a token, track the queue, pay at the salon.</p>
        </div>
        <div className="footer-cols">
          <div id="help">
            <strong>Help</strong>
            <a href="mailto:support@salonos.app">support@salonos.app</a>
            <span className="muted">Booking fees and refunds</span>
          </div>
          <div id="for-salons">
            <strong>For salon owners</strong>
            <span className="muted">Manage online and walk-in tokens in one portal.</span>
            <Link to="/portal/login">Sign in to the salon portal</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
