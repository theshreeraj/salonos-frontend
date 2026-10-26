import { useState } from 'react'
import { addDays, dayLabel, isoDate, shortDate, timeLabel } from '../../utils/format'
import { useDesk } from '../desk/context'
import { ATTENDANCE, attendanceFor, dateRange, isPresent, minsOf, toMins } from '../desk/logic'
import { Avatar, PageHeader, Pill, Stat, Tabs } from '../ui'

const VIEWS = [
  { id: 'today', label: 'Daily' },
  { id: 'employee', label: 'By employee' },
  { id: 'team', label: 'Team overview' },
]

const RANGES = [7, 14, 30]

const clock = (ms) => (ms ? timeLabel(minsOf(ms)) : '—')
const hrs = (h) => (h ? `${h.toFixed(1)} h` : '—')

export default function Attendance() {
  const [view, setView] = useState('today')
  return (
    <>
      <PageHeader title="Attendance" sub="Who’s clocked in, who’s late, and who hasn’t shown up yet" />
      <div className="p-toolbar">
        <Tabs tabs={VIEWS} active={view} onChange={setView} />
      </div>
      {view === 'today' && <Daily />}
      {view === 'employee' && <ByEmployee />}
      {view === 'team' && <Team />}
    </>
  )
}

function Daily() {
  const desk = useDesk()
  const { staff, clockIn, clockOut } = desk
  const [date, setDate] = useState(isoDate())
  const isToday = date === isoDate()
  const rows = staff.filter((s) => s.active).map((s) => ({ s, a: attendanceFor(desk, s, date) }))
  const count = (...statuses) => rows.filter((r) => statuses.includes(r.a.status)).length

  return (
    <>
      <div className="p-section-head">
        <h2>{dayLabel(date)}</h2>
        <input type="date" className="p-select" value={date} max={isoDate()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Date" />
      </div>

      <div className="p-stats p-stats-5">
        <Stat label="Present" value={count('present', 'late')} />
        <Stat label="Late" value={count('late')} note="After shift start + 10 min" />
        <Stat label={isToday ? 'Absent / not in' : 'Absent'} value={count('absent', 'scheduled')} />
        <Stat label="On leave" value={count('on-leave')} />
        <Stat label="Day off" value={count('day-off')} />
      </div>

      <div className="p-table-wrap">
        <table className="p-table">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Shift</th>
              <th>Status</th>
              <th>Clock in</th>
              <th>Clock out</th>
              <th className="num">Hours</th>
              {isToday && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, a }) => (
              <tr key={s.id}>
                <td>
                  <span className="p-person">
                    <Avatar name={s.name} color={s.color} size={30} />
                    <strong>{s.name}</strong>
                  </span>
                </td>
                <td className="muted">
                  {timeLabel(toMins(s.shiftStart))} – {timeLabel(toMins(s.shiftEnd))}
                </td>
                <td>
                  <Pill tone={ATTENDANCE[a.status].tone}>{ATTENDANCE[a.status].label}</Pill>
                </td>
                <td>{clock(a.clockIn)}</td>
                <td>{a.openEntry ? <span className="muted">On shift</span> : clock(a.clockOut)}</td>
                <td className="num">{hrs(a.hours)}</td>
                {isToday && (
                  <td className="num">
                    {a.openEntry ? (
                      <button type="button" className="btn btn-outline btn-xs" onClick={() => clockOut(a.openEntry.id)}>
                        Clock out
                      </button>
                    ) : (
                      !a.clockIn &&
                      a.status !== 'on-leave' && (
                        <button type="button" className="btn btn-primary btn-xs" onClick={() => clockIn(s.id)}>
                          Clock in
                        </button>
                      )
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ByEmployee() {
  const desk = useDesk()
  const people = desk.staff.filter((s) => s.active)
  const [staffId, setStaffId] = useState(people[0]?.id)
  const [range, setRange] = useState(14)
  const member = desk.staffById[staffId]
  if (!member) return null

  const today = isoDate()
  const days = dateRange(addDays(today, -(range - 1)), today)
    .reverse()
    .map((d) => ({ date: d, a: attendanceFor(desk, member, d) }))
  const present = days.filter((d) => isPresent(d.a.status))
  const totalHours = present.reduce((sum, d) => sum + d.a.hours, 0)

  return (
    <>
      <div className="p-toolbar">
        <select className="p-select" value={staffId} onChange={(e) => setStaffId(e.target.value)} aria-label="Staff member">
          {people.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <RangePicker value={range} onChange={setRange} />
      </div>

      <div className="p-stats">
        <Stat label="Days present" value={present.length} note={`of ${days.filter((d) => d.a.status !== 'day-off').length} working days`} />
        <Stat label="Late arrivals" value={days.filter((d) => d.a.status === 'late').length} />
        <Stat label="Total hours" value={totalHours.toFixed(1)} />
        <Stat label="Avg hours / day" value={present.length ? (totalHours / present.length).toFixed(1) : '0'} />
      </div>

      <div className="p-table-wrap">
        <table className="p-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Clock in</th>
              <th>Clock out</th>
              <th className="num">Hours</th>
            </tr>
          </thead>
          <tbody>
            {days.map(({ date, a }) => (
              <tr key={date}>
                <td>{dayLabel(date)}</td>
                <td>
                  <Pill tone={ATTENDANCE[a.status].tone}>{ATTENDANCE[a.status].label}</Pill>
                </td>
                <td>{clock(a.clockIn)}</td>
                <td>{a.openEntry ? <span className="muted">On shift</span> : clock(a.clockOut)}</td>
                <td className="num">{hrs(a.hours)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Team() {
  const desk = useDesk()
  const [range, setRange] = useState(30)
  const today = isoDate()
  const from = addDays(today, -(range - 1))
  const days = dateRange(from, today)

  const rows = desk.staff
    .filter((s) => s.active)
    .map((s) => {
      const log = days.map((d) => attendanceFor(desk, s, d))
      const present = log.filter((a) => isPresent(a.status))
      const hours = present.reduce((sum, a) => sum + a.hours, 0)
      return {
        s,
        present: present.length,
        late: log.filter((a) => a.status === 'late').length,
        absent: log.filter((a) => a.status === 'absent').length,
        leave: log.filter((a) => a.status === 'on-leave').length,
        hours,
        avg: present.length ? hours / present.length : 0,
      }
    })

  return (
    <>
      <div className="p-toolbar">
        <span className="muted">
          {shortDate(from)} – {shortDate(today)}
        </span>
        <RangePicker value={range} onChange={setRange} />
      </div>
      <div className="p-table-wrap">
        <table className="p-table">
          <thead>
            <tr>
              <th>Staff</th>
              <th className="num">Days present</th>
              <th className="num">Late</th>
              <th className="num">Absent</th>
              <th className="num">On leave</th>
              <th className="num">Total hours</th>
              <th className="num">Avg / day</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.s.id}>
                <td>
                  <span className="p-person">
                    <Avatar name={r.s.name} color={r.s.color} size={30} />
                    <strong>{r.s.name}</strong>
                  </span>
                </td>
                <td className="num">{r.present}</td>
                <td className="num">{r.late}</td>
                <td className="num">{r.absent}</td>
                <td className="num">{r.leave}</td>
                <td className="num">{r.hours.toFixed(1)}</td>
                <td className="num">{r.avg.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function RangePicker({ value, onChange }) {
  return (
    <div className="chips">
      {RANGES.map((d) => (
        <button key={d} type="button" className={`chip ${value === d ? 'is-active' : ''}`} onClick={() => onChange(d)}>
          {d} days
        </button>
      ))}
    </div>
  )
}
