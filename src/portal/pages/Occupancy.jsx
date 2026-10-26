import { useState } from 'react'
import { dayLabel, isoDate, timeLabel } from '../../utils/format'
import AppointmentSheet from '../desk/AppointmentSheet'
import { useDesk } from '../desk/context'
import { nowMins } from '../desk/logic'
import { Avatar, PageHeader, Pill, Stat } from '../ui'

export default function Occupancy() {
  const { salon, chairs, liveAppointments, clientById, staffById } = useDesk()
  const [date, setDate] = useState(isoDate())
  const [draft, setDraft] = useState(null)

  const [openH, closeH] = salon.hours
  const dayMins = (closeH - openH) * 60
  const isToday = date === isoDate()
  const now = nowMins()
  const day = liveAppointments.filter((a) => a.date === date).sort((a, b) => a.start - b.start)

  const rows = Array.from({ length: chairs }, (_, chair) => {
    const list = day.filter((a) => a.chair === chair)
    return {
      chair,
      list,
      current: isToday ? list.find((a) => a.start <= now && now < a.start + a.mins) : null,
      next: list.find((a) => (isToday ? a.start > now : true)),
      booked: list.reduce((sum, a) => sum + a.mins, 0),
    }
  })

  const inUse = rows.filter((r) => r.current).length
  const bookedMins = rows.reduce((sum, r) => sum + r.booked, 0)
  const pct = (mins) => `${((mins - openH * 60) / dayMins) * 100}%`

  return (
    <>
      <PageHeader eyebrow={dayLabel(date)} title="Occupancy" sub={`${chairs} chairs at ${salon.name} · ${timeLabel(openH * 60)} – ${timeLabel(closeH * 60)}`}>
        <input type="date" className="p-select" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Date" />
      </PageHeader>

      <div className="p-stats">
        {isToday && <Stat label="In use now" value={`${inUse} / ${chairs}`} note={`${chairs - inUse} chairs free`} />}
        <Stat label="Bookings" value={day.length} note={`${new Set(day.map((a) => a.staffId)).size} stylists working`} />
        <Stat label="Chair utilisation" value={`${Math.round((bookedMins / (chairs * dayMins)) * 100)}%`} note={`${Math.round(bookedMins / 60)} of ${(chairs * dayMins) / 60} chair-hours booked`} />
        <Stat label="Idle chairs" value={rows.filter((r) => !r.list.length).length} note="No bookings all day" />
      </div>

      <div className="occ-scale" aria-hidden="true">
        {Array.from({ length: closeH - openH + 1 }, (_, i) => (
          <span key={i} style={{ left: pct((openH + i) * 60) }}>
            {timeLabel((openH + i) * 60).replace(':00', '')}
          </span>
        ))}
      </div>

      <div className="occ-list">
        {rows.map((r) => (
          <article key={r.chair} className="occ-row">
            <div className="occ-chair">
              <strong>Chair {r.chair + 1}</strong>
              {r.current ? (
                <Pill tone="blue">In use · until {timeLabel(r.current.start + r.current.mins)}</Pill>
              ) : r.next ? (
                <Pill tone="green">Free{isToday ? ` · next ${timeLabel(r.next.start)}` : ''}</Pill>
              ) : (
                <Pill tone="gray">Free {isToday ? 'rest of day' : 'all day'}</Pill>
              )}
              {r.current && (
                <span className="occ-now">
                  <Avatar name={staffById[r.current.staffId]?.name ?? '?'} color={staffById[r.current.staffId]?.color} size={22} />
                  {clientById[r.current.clientId]?.name}
                </span>
              )}
            </div>
            <div className="occ-track">
              {r.list.map((a) => {
                const s = staffById[a.staffId]
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`occ-seg av-${s?.color ?? 'none'} ${a.status === 'completed' ? 'is-done' : ''}`}
                    style={{ left: pct(a.start), width: `${(a.mins / dayMins) * 100}%` }}
                    title={`${timeLabel(a.start)} · ${clientById[a.clientId]?.name} with ${s?.name}`}
                    onClick={() => setDraft(a)}
                  >
                    {clientById[a.clientId]?.name.split(' ')[0]}
                  </button>
                )
              })}
              {isToday && now >= openH * 60 && now <= closeH * 60 && <span className="occ-now-line" style={{ left: pct(now) }} />}
            </div>
          </article>
        ))}
      </div>

      {draft && <AppointmentSheet key={draft.id} draft={draft} onClose={() => setDraft(null)} />}
    </>
  )
}
