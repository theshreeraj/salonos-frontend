// Portal navigation, labels and the queue view model. Users, salons, applications, districts and demo sign-ins
// come from the API.
import { DISTRICTS } from '../data/config'
import { isoDate } from '../utils/format'

export { DEMO, DISTRICTS } from '../data/config'

// FNV-1a: stable pseudo-random numbers from a string, so simulated rows are the same on every render
export function hash(str) {
  let h = 2166136261
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

export const ROLES = {
  frontdesk: {
    label: 'Front desk',
    blurb: 'Run the live queue, add walk-ins, collect payments',
    home: '/portal/queue',
    nav: [
      { to: '/portal/queue', label: 'Live queue', icon: 'pulse' },
      { to: '/portal/tokens', label: "Today's tokens", icon: 'ticket' },
      { to: '/portal/calendar', label: 'Calendar', icon: 'calendar' },
      { section: 'Front desk', to: '/portal/clients', label: 'Clients', icon: 'users' },
      { section: 'Front desk', to: '/portal/checkout', label: 'Checkout', icon: 'cart' },
      { section: 'Team & catalogue', to: '/portal/staff', label: 'Staff', icon: 'user' },
      { section: 'Team & catalogue', to: '/portal/services', label: 'Services', icon: 'scissors' },
      { section: 'Team & catalogue', to: '/portal/occupancy', label: 'Occupancy', icon: 'grid' },
      { section: 'People ops', to: '/portal/attendance', label: 'Attendance', icon: 'clock' },
      { section: 'People ops', to: '/portal/leave', label: 'Leave', icon: 'calendarX' },
      { section: 'People ops', to: '/portal/payroll', label: 'Payroll', icon: 'wallet' },
      { section: 'Business', to: '/portal/revenue', label: 'Revenue', icon: 'rupee' },
      { section: 'Business', to: '/portal/inventory', label: 'Inventory', icon: 'box' },
      { section: 'Business', to: '/portal/reports', label: 'Reports', icon: 'chart' },
    ],
  },
  stylist: {
    label: 'Stylist',
    blurb: 'See your clients — or run a salon with no receptionist',
    home: '/portal/my-day',
    nav: [{ to: '/portal/my-day', label: 'My day', icon: 'scissors' }],
  },
  agent: {
    label: 'Field agent',
    blurb: 'Find salons, follow up, onboard and track approvals',
    home: '/portal/followups',
    nav: [
      { to: '/portal/followups', label: 'Follow-ups', icon: 'bell' },
      { to: '/portal/leads', label: 'Leads', icon: 'users' },
      { to: '/portal/onboardings', label: 'Onboardings', icon: 'store' },
      { to: '/portal/performance', label: 'Performance', icon: 'chart' },
      { section: 'New', to: '/portal/onboard', label: 'Onboard a salon', icon: 'plus' },
    ],
  },
  manager: {
    label: 'District manager',
    blurb: 'Monitor salons, agents and approvals in your district',
    home: '/portal/overview',
    nav: [
      { section: 'Command', to: '/portal/overview', label: 'Command centre', icon: 'chart' },
      { section: 'Command', to: '/portal/live', label: 'Live monitor', icon: 'pulse', badge: 'waiting' },
      { section: 'Command', to: '/portal/salons', label: 'Salons', icon: 'store', badge: 'salons' },
      { section: 'Command', to: '/portal/approvals', label: 'Approvals', icon: 'shield', badge: 'approvals' },
      { section: 'Growth', to: '/portal/pipeline', label: 'Onboarding pipeline', icon: 'list' },
      { section: 'Growth', to: '/portal/agents', label: 'Field agents', icon: 'users', badge: 'agents' },
      { section: 'Audits & health', to: '/portal/fees', label: 'Booking fees', icon: 'rupee' },
      { section: 'Audits & health', to: '/portal/health', label: 'Health & alerts', icon: 'bell', badge: 'alerts' },
    ],
  },
  admin: {
    label: 'Super admin',
    blurb: 'Platform-wide salons, users, roles and districts',
    home: '/portal/overview',
    nav: [
      { section: 'Command', to: '/portal/overview', label: 'Command centre', icon: 'chart' },
      { section: 'Command', to: '/portal/live', label: 'Live monitor', icon: 'pulse', badge: 'waiting' },
      { section: 'Command', to: '/portal/salons', label: 'Salons', icon: 'store', badge: 'salons' },
      { section: 'Command', to: '/portal/approvals', label: 'Approvals', icon: 'shield', badge: 'approvals' },
      { section: 'Growth', to: '/portal/pipeline', label: 'Onboarding pipeline', icon: 'list' },
      { section: 'Growth', to: '/portal/agents', label: 'Field agents', icon: 'users', badge: 'agents' },
      { section: 'Audits & health', to: '/portal/fees', label: 'Booking fees', icon: 'rupee' },
      { section: 'Audits & health', to: '/portal/health', label: 'Health & alerts', icon: 'bell', badge: 'alerts' },
      { section: 'Administration', to: '/portal/users', label: 'Users & roles', icon: 'user' },
    ],
  },
}

// Stylists at salons without a receptionist confirm bookings themselves from the phone-first app
export const SOLO_NAV = [
  { to: '/portal/solo', label: 'Bookings', icon: 'bell' },
  { to: '/portal/my-day', label: 'My day', icon: 'scissors' },
]

export const ROLE_ORDER = ['frontdesk', 'stylist', 'agent', 'manager', 'admin']

export const districtName = (id) => DISTRICTS.find((d) => d.id === id)?.name ?? '—'

// Portal-only facts per salon (district, agent, owner, go-live date, chairs), filled from the API with the catalogue
export const SALON_META = {}

// ---- Queue model: one row per token, combining app bookings, desk walk-ins and simulated arrivals ----

const FIRST = ['Aarav', 'Vivaan', 'Ishaan', 'Ananya', 'Diya', 'Saanvi', 'Kabir', 'Meera', 'Rohan', 'Tanvi', 'Aditya', 'Kavya', 'Arjun', 'Nisha', 'Siddharth', 'Pooja', 'Yash', 'Riya', 'Omkar', 'Sneha']
const LAST = ['Patil', 'Joshi', 'Kulkarni', 'Deshpande', 'Shinde', 'Pawar', 'Jadhav', 'Kale', 'More', 'Gokhale']


export function tokensFor(salon, { queue, bookings, walkIns, marks, date = isoDate() }) {
  const key = `${salon.id}|${date}`
  const appBookings = new Map(
    bookings.filter((b) => b.salonId === salon.id && b.date === date && b.token != null).map((b) => [b.token, b]),
  )
  const desk = walkIns[key] ?? {}
  const flags = marks[key] ?? {}
  const rows = []

  for (let t = 1; t < queue.next; t++) {
    const h = hash(`${key}#${t}`)
    const roundRobin = salon.stylists[t % salon.stylists.length].name
    let row
    if (appBookings.has(t)) {
      const b = appBookings.get(t)
      row = {
        name: b.customerName ?? 'App customer',
        phone: '—',
        source: 'online',
        services: b.services.map((s) => s.name),
        amount: b.servicesTotal,
        stylist: b.stylist === 'Any available' ? roundRobin : b.stylist,
        cancelled: b.status === 'cancelled',
        fromApp: true,
      }
    } else if (desk[t]) {
      const w = desk[t]
      const chosen = salon.services.filter((s) => w.serviceIds.includes(s.id))
      row = {
        name: w.name,
        phone: w.phone || '—',
        source: w.source ?? 'walk-in',
        services: chosen.map((s) => s.name),
        amount: chosen.reduce((sum, s) => sum + s.price, 0),
        stylist: w.stylist === 'Any available' ? roundRobin : w.stylist,
      }
    } else {
      const service = salon.services[h % salon.services.length]
      row = {
        name: `${FIRST[h % FIRST.length]} ${LAST[(h >>> 8) % LAST.length]}`,
        phone: `98${String(h % 100000000).padStart(8, '0')}`.replace(/^(\d{2})\d{6}/, '$1••••••'),
        source: h % 3 === 0 ? 'walk-in' : 'online',
        services: [service.name],
        amount: service.price,
        stylist: roundRobin,
      }
    }

    let status = 'waiting'
    if (row.cancelled) status = 'cancelled'
    else if (flags[t] === 'no-show') status = 'no-show'
    else if (t < queue.serving) status = 'done'
    else if (t === queue.serving) status = 'in-chair'
    rows.push({ token: t, ...row, status })
  }
  return rows
}

export const APPLICATION_TONE = { pending: 'amber', approved: 'green', rejected: 'red' }
export const APPLICATION_LABEL = { pending: 'In review', approved: 'Approved', rejected: 'Needs changes' }

export const TOKEN_STATUS = {
  waiting: 'Waiting',
  'in-chair': 'In chair',
  done: 'Done',
  'no-show': 'No-show',
  cancelled: 'Cancelled',
}

export function salonStats(rows) {
  const valid = rows.filter((r) => r.status !== 'cancelled')
  return {
    issued: valid.length,
    online: valid.filter((r) => r.source === 'online').length,
    walkIn: valid.filter((r) => r.source === 'walk-in').length,
    done: valid.filter((r) => r.status === 'done').length,
    waiting: valid.filter((r) => r.status === 'waiting').length,
    noShow: valid.filter((r) => r.status === 'no-show').length,
    revenue: valid.filter((r) => r.status === 'done' || r.status === 'in-chair').reduce((sum, r) => sum + r.amount, 0),
  }
}
