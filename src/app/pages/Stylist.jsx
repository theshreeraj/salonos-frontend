import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { ANY_STYLIST } from '../availability'
import { useApp } from '../context'
import { initials, isTopRated, useBooking } from '../hooks'
import { TopBar } from '../ui'

// First booking step: any stylist, or a specific one. Availability is shown later, per time slot.
export default function Stylist() {
  const navigate = useNavigate()
  const { startDraft, updateDraft } = useApp()
  const { salon, draft, started } = useBooking()

  useEffect(() => {
    if (salon) startDraft(salon.id)
  }, [salon, startDraft])

  if (!salon) return <Navigate to="/app" replace />

  const choice = started ? draft.stylist : null
  // A different stylist has a different calendar, so any picked time is dropped
  const pick = (stylist) => updateDraft({ salonId: salon.id, stylist, slot: stylist === draft.stylist ? draft.slot : null })

  return (
    <>
      <TopBar title="Choose your stylist" back={`/app/salon/${salon.id}`} />
      <main className="m-main m-pad">
        <p className="m-muted m-small m-summary-line">{salon.name}</p>
        <div className="m-gap" />
        <ul className="m-stack">
          <li>
            <button type="button" className={`m-card m-stylist ${choice === ANY_STYLIST ? 'is-selected' : ''}`} onClick={() => pick(ANY_STYLIST)} aria-pressed={choice === ANY_STYLIST}>
              <span className="m-avatar m-avatar-soft">
                <Icon name="users" size={24} />
              </span>
              <span>
                <strong>Any stylist</strong>
                <span className="m-muted m-small">Most time slots · whoever is free</span>
              </span>
            </button>
          </li>
          {salon.stylists.map((p) => {
            const on = choice === p.name
            return (
              <li key={p.name}>
                <button type="button" className={`m-card m-stylist ${on ? 'is-selected' : ''}`} onClick={() => pick(p.name)} aria-pressed={on}>
                  <span className="m-avatar">{initials(p.name)}</span>
                  <span>
                    <strong>{p.name}</strong>
                    <span className="m-muted m-small">
                      {p.role} · {p.years} yrs
                    </span>
                  </span>
                  {isTopRated(p) && (
                    <span className="m-badge">
                      <Icon name="award" size={16} /> Top rated
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </main>
      <div className="m-footer">
        <button type="button" className="m-btn m-btn-primary m-btn-block" disabled={!choice} onClick={() => navigate(`/app/book/${salon.id}/services`)}>
          Select & continue
        </button>
      </div>
    </>
  )
}
