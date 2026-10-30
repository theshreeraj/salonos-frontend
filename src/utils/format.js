// Date, money and label helpers for the web app.
export const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`

export const tokenLabel = (n) => `#${String(n).padStart(2, '0')}`

// Local-date ISO string (yyyy-mm-dd); toISOString alone would shift dates across the UTC boundary
export function isoDate(date = new Date()) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return d.toISOString().slice(0, 10)
}

export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

export function dayLabel(iso) {
  const today = isoDate()
  const d = new Date(`${iso}T00:00:00`)
  const short = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  if (iso === today) return `Today, ${short}`
  if (iso === addDays(today, 1)) return `Tomorrow, ${short}`
  if (iso === addDays(today, -1)) return `Yesterday, ${short}`
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

export const hourLabel = (h) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'am' : 'pm'}`

// Minutes after midnight → "9:30 am"
export function timeLabel(mins) {
  const h = Math.floor(mins / 60)
  return `${((h + 11) % 12) + 1}:${String(mins % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

export const shortDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export const hoursLabel = ([open, close]) => `${hourLabel(open)} – ${hourLabel(close)}`

export function isOpenNow([open, close], now = new Date()) {
  const h = now.getHours() + now.getMinutes() / 60
  return h >= open && h < close
}

// Today's queue is bookable until closing time
export const acceptsTodayTokens = ([, close], now = new Date()) => now.getHours() < close

export function waitLabel(mins) {
  if (mins <= 0) return 'Now'
  if (mins < 60) return `~${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `~${h} hr ${m} min` : `~${h} hr`
}

export const directionsUrl = (salon) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${salon.name}, ${salon.address}`)}`
