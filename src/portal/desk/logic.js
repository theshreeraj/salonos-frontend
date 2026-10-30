// Pure helpers for the front desk back office. Times of day are minutes after midnight.
import { addDays, isoDate } from '../../utils/format'

export const GRACE_MINS = 10

export const STAFF_COLORS = ['peach', 'blue', 'mint', 'lavender', 'rose']
export const STAFF_ROLES = { owner: 'Owner', manager: 'Manager', frontdesk: 'Front desk', stylist: 'Stylist' }
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const APPT_STATUS = { booked: 'Booked', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', 'no-show': 'No-show' }
export const APPT_TONE = { booked: 'gray', confirmed: 'blue', completed: 'green', cancelled: 'red', 'no-show': 'amber' }

export const LEAVE_TYPES = { sick: 'Sick', vacation: 'Vacation', personal: 'Personal', unpaid: 'Unpaid' }
export const LEAVE_TONE = { pending: 'amber', approved: 'green', rejected: 'red', cancelled: 'gray' }

export const ATTENDANCE = {
  present: { label: 'Present', tone: 'green' },
  late: { label: 'Late', tone: 'amber' },
  absent: { label: 'Absent', tone: 'red' },
  'on-leave': { label: 'On leave', tone: 'blue' },
  'day-off': { label: 'Day off', tone: 'gray' },
  scheduled: { label: 'Not in yet', tone: 'gray' },
}

export const PAYMENT_METHODS = { upi: 'UPI', cash: 'Cash', card: 'Card' }

export const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function toMins(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const toHHMM = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
export const nowMins = (d = new Date()) => d.getHours() * 60 + d.getMinutes()
export const atMins = (date, mins) => new Date(`${date}T00:00:00`).getTime() + mins * 60000
export const minsOf = (ms) => nowMins(new Date(ms))
export const dateOf = (ms) => isoDate(new Date(ms))
export const weekday = (date) => new Date(`${date}T00:00:00`).getDay()

export function dateRange(from, to) {
  const days = []
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d)
  return days
}

export const isBookable = (s) => s.active && s.role !== 'frontdesk'
export const isLive = (a) => a.status !== 'cancelled' && a.status !== 'no-show'
export const overlaps = (a, start, mins) => a.start < start + mins && start < a.start + a.mins

export const isOffDay = (staff, date) => staff.offDays.includes(weekday(date))

export const isOnLeave = (leave, staffId, date) =>
  leave.some((l) => l.staffId === staffId && l.status === 'approved' && l.from <= date && date <= l.to)

export const leaveDays = (l) => dateRange(l.from, l.to).length

// First chair (0-based) with nothing booked in the slot, or null when the salon is full
export function freeChair(appointments, chairs, date, start, mins, ignoreId) {
  const taken = new Set(
    appointments.filter((a) => a.id !== ignoreId && a.date === date && isLive(a) && overlaps(a, start, mins)).map((a) => a.chair),
  )
  for (let c = 0; c < chairs; c++) if (!taken.has(c)) return c
  return null
}

export function staffBusy(appointments, staffId, date, start, mins, ignoreId) {
  return appointments.some((a) => a.id !== ignoreId && a.staffId === staffId && a.date === date && isLive(a) && overlaps(a, start, mins))
}

export const lineTotal = (items) => items.reduce((sum, i) => sum + i.qty * i.price, 0)

export const initials = (name) =>
  name
    .replace(/^Dr\.\s*/, '')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

// One staff member's attendance on a date, derived from clock entries, leave and weekly offs
export function attendanceFor(desk, staff, date, now = new Date()) {
  const entries = desk.attendance.filter((e) => e.staffId === staff.id && dateOf(e.in) === date).sort((a, b) => a.in - b.in)
  const today = isoDate(now)
  const shiftStart = toMins(staff.shiftStart)

  if (entries.length) {
    const ms = entries.reduce((sum, e) => sum + ((e.out ?? (date === today ? now.getTime() : e.in)) - e.in), 0)
    const open = entries.find((e) => !e.out)
    return {
      status: minsOf(entries[0].in) > shiftStart + GRACE_MINS ? 'late' : 'present',
      clockIn: entries[0].in,
      clockOut: open ? null : entries[entries.length - 1].out,
      openEntry: open ?? null,
      hours: ms / 3600000,
    }
  }
  let status = 'absent'
  if (isOnLeave(desk.leave, staff.id, date)) status = 'on-leave'
  else if (isOffDay(staff, date)) status = 'day-off'
  else if (date > today || (date === today && nowMins(now) < shiftStart + GRACE_MINS)) status = 'scheduled'
  return { status, clockIn: null, clockOut: null, openEntry: null, hours: 0 }
}

export const isPresent = (status) => status === 'present' || status === 'late'

export function payrollFor(desk, month, now = new Date()) {
  const first = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const last = `${month}-${String(daysInMonth).padStart(2, '0')}`
  const today = isoDate(now)
  const elapsed = dateRange(first, last < today ? last : today)
  const allDays = dateRange(first, last)
  const invoices = desk.invoices.filter((inv) => {
    const d = dateOf(inv.at)
    return d >= first && d <= last
  })

  return desk.staff
    .filter((s) => s.active)
    .map((s) => {
      const approved = desk.leave.filter((l) => l.staffId === s.id && l.status === 'approved')
      const onLeave = (d) => approved.find((l) => l.from <= d && d <= l.to)
      const leaveDayCount = allDays.filter(onLeave).length
      const unpaidDays = allDays.filter((d) => onLeave(d)?.type === 'unpaid').length
      const serviceRevenue = invoices.reduce(
        (sum, inv) => sum + inv.items.filter((i) => i.kind === 'service' && i.staffId === s.id).reduce((n, i) => n + i.qty * i.price, 0),
        0,
      )
      const commission = Math.round((serviceRevenue * s.commission) / 100)
      const deduction = Math.round((s.salary / daysInMonth) * unpaidDays)
      return {
        staff: s,
        serviceRevenue,
        commission,
        daysPresent: elapsed.filter((d) => isPresent(attendanceFor(desk, s, d, now).status)).length,
        leaveDays: leaveDayCount,
        deduction,
        total: s.salary + commission - deduction,
      }
    })
}
