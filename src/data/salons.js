// Customer catalogue. Constants live in shared/catalog.js; the salon list itself comes from the API
// (GET /api/salons) and is loaded into SALONS by <CatalogProvider> before the app renders.
export * from '../../../shared/catalog.js'

export const SALONS = []

export const getSalon = (id) => SALONS.find((s) => s.id === id)

// Newly onboarded salons have no reviews or distance yet
export const isNewSalon = (salon) => !salon.reviews
export const byDistance = (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)

export function setSalons(list) {
  SALONS.splice(0, SALONS.length, ...list)
}
