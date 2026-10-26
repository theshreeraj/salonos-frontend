import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { rupees } from '../../utils/format'
import { ANY_STYLIST } from '../availability'
import { useApp } from '../context'
import { useBooking } from '../hooks'
import { ServiceTabs, TopBar } from '../ui'

export default function Services() {
  const navigate = useNavigate()
  const { updateDraft } = useApp()
  const { salon, draft, services, duration, hasStylist } = useBooking()
  const [tab, setTab] = useState(salon?.categories[0])

  if (!hasStylist) return <Navigate to={salon ? `/app/book/${salon.id}/stylist` : '/app'} replace />

  const selected = draft.serviceIds
  // Services decide the appointment length, so a changed basket needs a fresh time
  const toggle = (sid) => updateDraft({ serviceIds: selected.includes(sid) ? selected.filter((x) => x !== sid) : [...selected, sid], slot: null })

  return (
    <>
      <TopBar title="Select services" back={`/app/book/${salon.id}/stylist`} />
      <main className="m-main m-pad">
        <p className="m-muted m-small m-summary-line">
          {salon.name} · {draft.stylist === ANY_STYLIST ? 'Any stylist' : draft.stylist}
        </p>
        <div className="m-gap" />
        <ServiceTabs salon={salon} tab={tab} setTab={setTab} />
        <ul className="m-stack m-services">
          {salon.services
            .filter((s) => s.category === tab)
            .map((s) => {
              const on = selected.includes(s.id)
              return (
                <li key={s.id}>
                  <button type="button" className={`m-card m-service ${on ? 'is-selected' : ''}`} onClick={() => toggle(s.id)} aria-pressed={on}>
                    <span>
                      <strong>{s.name}</strong>
                      <span className="m-meta">
                        {rupees(s.price)} <Icon name="clock" size={15} /> {s.mins} mins
                      </span>
                    </span>
                    <span className={`m-check ${on ? 'is-on' : ''}`}>
                      <Icon name={on ? 'check' : 'plus'} size={16} strokeWidth={2.2} />
                    </span>
                  </button>
                </li>
              )
            })}
        </ul>
      </main>
      <div className="m-footer">
        <button type="button" className="m-btn m-btn-primary m-btn-block" disabled={!services.length} onClick={() => navigate(`/app/book/${salon.id}/time`)}>
          {services.length ? `Continue (${services.length}) · ${duration} mins` : 'Select at least one service'}
        </button>
      </div>
    </>
  )
}
