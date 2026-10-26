import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import { addDays, isoDate, timeLabel } from '../../utils/format'
import AppointmentSheet from '../desk/AppointmentSheet'
import { useDesk } from '../desk/context'
import { WEEKDAYS, isBookable, isOffDay, isOnLeave, nowMins, weekday } from '../desk/logic'
import { Avatar } from '../ui'

const HOUR_H = 64
const VIEWS = { day: 'Day', week: 'Week', month: 'Month' }

// Weeks run Monday to Sunday
const weekStart = (date) => addDays(date, -((weekday(date) + 6) % 7))

function titleFor(view, date) {
  const d = new Date(`${date}T00:00:00`)
  if (view === 'day') return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  if (view === 'month') return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const start = new Date(`${weekStart(date)}T00:00:00`)
  const end = new Date(`${addDays(weekStart(date), 6)}T00:00:00`)
  return `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

export default function Calendar() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { salon, staff, appointments } = useDesk()
  const [date, setDate] = useState(isoDate())
  const [view, setView] = useState('day')
  const [staffFilter, setStaffFilter] = useState('all')
  const [draft, setDraft] = useState(null)

  const open = salon.hours[0] * 60
  const columns = staff.filter((s) => isBookable(s) && (staffFilter === 'all' || s.id === staffFilter))
  const firstStaff = columns[0]?.id ?? ''

  // Sidebar "New appointment" links here with ?new=1: open the sheet, then drop the flag from the URL
  const wantsNew = params.get('new') === '1'
  if (wantsNew && !draft) setDraft({ date: isoDate(), start: Math.min(salon.hours[1] * 60 - 30, Math.max(open, Math.ceil(nowMins() / 15) * 15)), staffId: '' })
  useEffect(() => {
    if (wantsNew) setParams({}, { replace: true })
  }, [wantsNew, setParams])

  const step = (dir) => {
    if (view === 'day') setDate((d) => addDays(d, dir))
    else if (view === 'week') setDate((d) => addDays(d, dir * 7))
    else
      setDate((d) => {
        const x = new Date(`${d.slice(0, 7)}-01T00:00:00`)
        x.setMonth(x.getMonth() + dir)
        return isoDate(x)
      })
  }

  const visible = appointments.filter((a) => staffFilter === 'all' || a.staffId === staffFilter)

  return (
    <div className="cal-page">
      <header className="p-head cal-head">
        <div className="cal-nav">
          <h1 className="p-title">{titleFor(view, date)}</h1>
          <button type="button" className="icon-btn" onClick={() => step(-1)} aria-label="Previous">
            <Icon name="chevronLeft" size={20} />
          </button>
          <button type="button" className="icon-btn" onClick={() => step(1)} aria-label="Next">
            <Icon name="chevronRight" size={20} />
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setDate(isoDate())}>
            Today
          </button>
          <input type="date" className="p-select" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Go to date" />
        </div>
        <div className="p-head-actions">
          <button type="button" className="btn btn-outline" onClick={() => navigate('/portal/checkout')}>
            Quick sale
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setDraft({ date, start: open + 60, staffId: staffFilter === 'all' ? firstStaff : staffFilter })}>
            <Icon name="plus" size={18} /> Add
          </button>
        </div>
      </header>

      <div className="p-toolbar">
        <div className="p-tabs" role="tablist">
          {Object.entries(VIEWS).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} className={view === id ? 'is-active' : ''} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </div>
        <select className="p-select" value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} aria-label="Staff">
          <option value="all">All staff</option>
          {staff.filter(isBookable).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {view === 'day' && <DayView date={date} columns={columns} onSlot={setDraft} onOpen={setDraft} />}
      {view === 'week' && (
        <WeekView date={date} appointments={visible} onSlot={(d, start) => setDraft({ date: d, start, staffId: staffFilter === 'all' ? firstStaff : staffFilter })} onOpen={setDraft} />
      )}
      {view === 'month' && (
        <MonthView
          date={date}
          appointments={visible}
          onDay={(d) => {
            setDate(d)
            setView('day')
          }}
        />
      )}

      {draft && <AppointmentSheet key={draft.id ?? 'new'} draft={draft} onClose={() => setDraft(null)} />}
    </div>
  )
}

function useGrid() {
  const { salon } = useDesk()
  const [openH, closeH] = salon.hours
  const hours = Array.from({ length: closeH - openH }, (_, i) => openH + i)
  const top = (mins) => ((mins - openH * 60) / 60) * HOUR_H
  // Click position inside a column → start time snapped to 15 minutes
  const slotAt = (e) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top
    return Math.min(closeH * 60 - 15, openH * 60 + Math.floor((y / HOUR_H) * 4) * 15)
  }
  return { hours, height: hours.length * HOUR_H, top, slotAt, openH, closeH }
}

function TimeGutter({ hours }) {
  return (
    <div className="cal-gutter">
      {hours.map((h, i) => (
        <span key={h} style={{ top: i * HOUR_H }}>
          {timeLabel(h * 60).replace(':00', '')}
        </span>
      ))}
    </div>
  )
}

function NowLine({ date, top, openH, closeH }) {
  const now = nowMins()
  if (date !== isoDate() || now < openH * 60 || now > closeH * 60) return null
  return <div className="cal-now" style={{ top: top(now) }} />
}

// Side-by-side lanes for bookings that overlap in one column: id → { lane, lanes }
function layoutLanes(list) {
  const sorted = [...list].sort((a, b) => a.start - b.start || b.mins - a.mins)
  const result = {}
  let cluster = []
  let clusterEnd = -1
  const close = () => {
    const lanes = Math.max(0, ...cluster.map((id) => result[id].lane)) + 1
    for (const id of cluster) result[id].lanes = lanes
    cluster = []
  }
  const laneEnds = []
  for (const a of sorted) {
    if (a.start >= clusterEnd && cluster.length) {
      close()
      laneEnds.length = 0
    }
    let lane = laneEnds.findIndex((end) => end <= a.start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = a.start + a.mins
    result[a.id] = { lane }
    cluster.push(a.id)
    clusterEnd = Math.max(clusterEnd, a.start + a.mins)
  }
  if (cluster.length) close()
  return result
}

function ApptBlock({ appt, top, onOpen, showStaff, lane = { lane: 0, lanes: 1 } }) {
  const { clientById, serviceById, staffById } = useDesk()
  const s = staffById[appt.staffId]
  const height = Math.max(26, (appt.mins / 60) * HOUR_H - 3)
  return (
    <button
      type="button"
      className={`cal-appt av-${s?.color ?? 'none'} is-${appt.status} ${height < 40 ? 'is-short' : ''}`}
      style={{ top: top(appt.start) + 1, height, left: `calc(${(lane.lane / lane.lanes) * 100}% + 3px)`, width: `calc(${100 / lane.lanes}% - 6px)` }}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(appt)
      }}
    >
      <span className="cal-appt-time">
        {timeLabel(appt.start)}
        {appt.invoiceId && <Icon name="check" size={13} strokeWidth={2.4} />}
      </span>
      <strong>{clientById[appt.clientId]?.name ?? 'Client'}</strong>
      {height > 50 && <span className="cal-appt-sub">{showStaff ? s?.name : appt.serviceIds.map((id) => serviceById[id]?.name).join(', ')}</span>}
    </button>
  )
}

function DayView({ date, columns, onSlot, onOpen }) {
  const { appointments, leave } = useDesk()
  const grid = useGrid()

  if (!columns.length) return <p className="muted">No active stylists. Add staff from the Staff page.</p>

  return (
    <div className="cal-scroll">
      <div className="cal-grid" style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(190px, 1fr))` }}>
        <div className="cal-corner" />
        {columns.map((s) => (
          <div key={s.id} className="cal-col-head">
            <Avatar name={s.name} color={s.color} size={30} />
            <span>{s.name}</span>
          </div>
        ))}

        <TimeGutter hours={grid.hours} />
        {columns.map((s) => {
          const away = isOnLeave(leave, s.id, date) ? 'On leave' : isOffDay(s, date) ? 'Weekly off' : null
          return (
            <div
              key={s.id}
              className={`cal-col ${away ? 'is-away' : ''}`}
              style={{ height: grid.height, '--hour': `${HOUR_H}px` }}
              onClick={(e) => !away && onSlot({ date, start: grid.slotAt(e), staffId: s.id })}
            >
              {away && <span className="cal-away">{away}</span>}
              {appointments
                .filter((a) => a.staffId === s.id && a.date === date)
                .map((a) => (
                  <ApptBlock key={a.id} appt={a} top={grid.top} onOpen={onOpen} />
                ))}
              <NowLine date={date} {...grid} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({ date, appointments, onSlot, onOpen }) {
  const grid = useGrid()
  const start = weekStart(date)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const today = isoDate()

  return (
    <div className="cal-scroll">
      <div className="cal-grid" style={{ gridTemplateColumns: '64px repeat(7, minmax(200px, 1fr))' }}>
        <div className="cal-corner" />
        {days.map((d) => (
          <div key={d} className={`cal-col-head cal-day-head ${d === today ? 'is-today' : ''}`}>
            <span className="muted small">{WEEKDAYS[weekday(d)]}</span>
            <strong>{Number(d.slice(8))}</strong>
          </div>
        ))}

        <TimeGutter hours={grid.hours} />
        {days.map((d) => {
          const list = appointments.filter((a) => a.date === d && a.status !== 'cancelled')
          const lanes = layoutLanes(list)
          return (
            <div key={d} className="cal-col" style={{ height: grid.height, '--hour': `${HOUR_H}px` }} onClick={(e) => onSlot(d, grid.slotAt(e))}>
              {list.map((a) => (
                <ApptBlock key={a.id} appt={a} top={grid.top} onOpen={onOpen} showStaff lane={lanes[a.id]} />
              ))}
              <NowLine date={d} {...grid} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonthView({ date, appointments, onDay }) {
  const { clientById, staffById } = useDesk()
  const month = date.slice(0, 7)
  const start = weekStart(`${month}-01`)
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  const today = isoDate()

  return (
    <div className="cal-month">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
        <div key={d} className="cal-month-head">
          {d}
        </div>
      ))}
      {days.map((d) => {
        const list = appointments.filter((a) => a.date === d && a.status !== 'cancelled').sort((a, b) => a.start - b.start)
        return (
          <button key={d} type="button" className={`cal-month-day ${d.slice(0, 7) !== month ? 'is-outside' : ''} ${d === today ? 'is-today' : ''}`} onClick={() => onDay(d)}>
            <span className="cal-month-num">{Number(d.slice(8))}</span>
            {list.slice(0, 3).map((a) => (
              <span key={a.id} className={`cal-month-appt av-${staffById[a.staffId]?.color ?? 'none'}`}>
                {timeLabel(a.start).replace(' ', '')} {clientById[a.clientId]?.name.split(' ')[0]}
              </span>
            ))}
            {list.length > 3 && <span className="muted small">+{list.length - 3} more</span>}
          </button>
        )
      })}
    </div>
  )
}
