// Business constants owned by the API (GET /api/config): fees, booking rules, catalogue vocabulary, districts.
// <CatalogProvider> loads them before anything renders, so every module can read them synchronously.
// Exports are live bindings: importers see the values once applyConfig() has run.

export let BOOKING_FEE = 0
export let CANCEL_REFUND_HOURS = 0
// { slotMins, bookingDays, defaultMins }
export const BOOKING = {}
export const PHOTOS = {}
export const CITIES = []
export const DISTRICTS = []
export const CATEGORIES = []
export const FACILITIES = {}
export const DECLINE_REASONS = []
export const LEAD_SOURCES = []
export const OUTCOMES = {}
// { password, accounts: { [role]: [{ email, note }] } } in development; null in production
export let DEMO = null

const refill = (target, source) => {
  if (Array.isArray(target)) target.splice(0, target.length, ...source)
  else {
    for (const key of Object.keys(target)) delete target[key]
    Object.assign(target, source)
  }
}

export function applyConfig(cfg) {
  BOOKING_FEE = cfg.bookingFee
  CANCEL_REFUND_HOURS = cfg.cancelRefundHours
  refill(BOOKING, cfg.booking)
  refill(PHOTOS, cfg.photos)
  refill(CITIES, cfg.cities)
  refill(DISTRICTS, cfg.districts)
  refill(CATEGORIES, cfg.categories)
  refill(FACILITIES, cfg.facilities)
  refill(DECLINE_REASONS, cfg.declineReasons)
  refill(LEAD_SOURCES, cfg.leadSources)
  refill(OUTCOMES, cfg.outcomes)
  DEMO = cfg.demo
}
