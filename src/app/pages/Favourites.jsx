import { Link } from 'react-router-dom'
import { getSalon } from '../../data/salons'
import { TabScreen } from '../AppLayout'
import { useApp } from '../context'
import { SalonRow } from '../ui'

export default function Favourites() {
  const { favourites } = useApp()
  const salons = favourites.map(getSalon).filter(Boolean)
  return (
    <TabScreen>
      <header className="m-topbar">
        <h1>Favourites</h1>
      </header>
      <div className="m-pad">
        {salons.length ? (
          <div className="m-stack">
            {salons.map((s) => (
              <SalonRow key={s.id} salon={s} />
            ))}
          </div>
        ) : (
          <div className="m-empty">
            <strong>No favourites yet</strong>
            <span className="m-muted">Tap the heart on a salon to save it here.</span>
            <Link to="/app" className="m-btn m-btn-primary m-btn-sm">
              Explore salons
            </Link>
          </div>
        )}
      </div>
    </TabScreen>
  )
}
