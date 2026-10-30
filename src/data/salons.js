// Customer catalogue. Constants come from GET /api/config and the salon list from GET /api/salons;
// <CatalogProvider> loads both into these modules before the app renders.
export { BOOKING_FEE, CANCEL_REFUND_HOURS, CATEGORIES, CITIES, DECLINE_REASONS, FACILITIES, PHOTOS } from './config'
import { CATEGORIES } from './config'

export const SALONS = []

export const getSalon = (id) => SALONS.find((s) => s.id === id)
export const getCategory = (id) => CATEGORIES.find((c) => c.id === id)

// Newly onboarded salons have no reviews or distance yet
export const isNewSalon = (salon) => !salon.reviews
export const byDistance = (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)

export function setSalons(list) {
  SALONS.splice(0, SALONS.length, ...list)
}
