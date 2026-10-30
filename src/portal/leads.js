// Field agent sales pipeline: salons an agent has found but not yet onboarded.
// Lead sources and contact outcomes are API rules (GET /api/config); the rest is display and import parsing.
import { addDays, isoDate } from '../utils/format'

export { LEAD_SOURCES, OUTCOMES } from '../data/config'

export const CONTACT_KINDS = {
  call: { label: 'Call', icon: 'phone' },
  whatsapp: { label: 'WhatsApp', icon: 'mobile' },
  visit: { label: 'Visit', icon: 'pin' },
  note: { label: 'Note', icon: 'edit' },
  onboarding: { label: 'Onboarding', icon: 'shield' },
}

// Display status: a lead's own stage until it's submitted, then its application's status
export const LEAD_STATUS = {
  new: { label: 'New', tone: 'blue' },
  contacted: { label: 'Contacted', tone: 'gray' },
  interested: { label: 'Interested', tone: 'green' },
  review: { label: 'In review', tone: 'amber' },
  changes: { label: 'Needs changes', tone: 'red' },
  onboarded: { label: 'Onboarded', tone: 'green' },
  'not-interested': { label: 'Not interested', tone: 'gray' },
}

const APP_TO_STATUS = { pending: 'review', rejected: 'changes', approved: 'onboarded' }

export function leadStatus(lead, onboardings) {
  if (lead.onboardingId) {
    const app = onboardings.find((o) => o.id === lead.onboardingId)
    if (app) return APP_TO_STATUS[app.status]
  }
  return lead.stage
}

// Leads that still need the agent's attention
export const isOpenLead = (status) => ['new', 'contacted', 'interested'].includes(status)

export function followUpState(date, today = isoDate()) {
  if (!date) return null
  if (date < today) return 'overdue'
  if (date === today) return 'today'
  if (date <= addDays(today, 7)) return 'week'
  return 'later'
}

// Review history for an application; older saved data has no history array
export function historyOf(app) {
  if (app.history?.length) return app.history
  return [
    { status: 'submitted', at: app.submittedAt },
    ...(app.reviewedAt ? [{ status: app.status, at: app.reviewedAt, note: app.reviewNote }] : []),
  ]
}

export const daysBetween = (from, to) => Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 864e5)

export const telUrl = (phone) => `tel:+91${phone}`
export const whatsappUrl = (lead) => {
  const greeting = lead.owner ? `Hi ${lead.owner.split(' ')[0]}` : 'Hi'
  return `https://wa.me/91${lead.phone}?text=${encodeURIComponent(`${greeting}, following up about listing ${lead.name} on SalonOS for online bookings.`)}`
}

// ---- Bulk import ----

export const CSV_TEMPLATE = 'Salon name,Area,Owner name,Phone,Type,Address\nStyle Hub,Kothrud,Rakesh Jadhav,9822000111,Men,"Paud Road, Kothrud"\n'

function splitCsvLine(line) {
  const cells = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"' && line[i + 1] === '"' && quoted) {
      cell += '"'
      i++
    } else if (ch === '"') quoted = !quoted
    else if ((ch === ',' || ch === '\t') && !quoted) {
      cells.push(cell.trim())
      cell = ''
    } else cell += ch
  }
  cells.push(cell.trim())
  return cells
}

const TYPES = { men: 'Men', male: 'Men', gents: 'Men', women: 'Women', female: 'Women', ladies: 'Women', unisex: 'Unisex' }

// Parses pasted rows (CSV or tab-separated from a spreadsheet). A header row is skipped if present.
// Returns rows with an `error` when something is missing or the phone is already a lead.
export function parseLeads(text, existingPhones) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length && /salon|name/i.test(lines[0]) && !/\d{10}/.test(lines[0])) lines.shift()
  const seen = new Set()
  return lines.map((line, i) => {
    const [name = '', area = '', owner = '', rawPhone = '', type = '', address = ''] = splitCsvLine(line)
    const phone = rawPhone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '')
    let error = null
    if (!name) error = 'Salon name missing'
    else if (!/^[6-9]\d{9}$/.test(phone)) error = 'Phone must be a 10-digit mobile'
    else if (existingPhones.has(phone)) error = 'Already in your leads'
    else if (seen.has(phone)) error = 'Duplicate row'
    seen.add(phone)
    return { line: i + 1, name, area, owner, phone, type: TYPES[type.toLowerCase()] ?? 'Unisex', address, error }
  })
}
