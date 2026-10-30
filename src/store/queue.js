// Queue and customer booking status as shown in the app, and whether cancelling now refunds the fee
import { CANCEL_REFUND_HOURS } from '../data/config'
import { isoDate } from '../utils/format'

export const queueKey = (salonId, date) => `${salonId}|${date}`

// Shown until the API's live feed has a queue for the day: today starts from the salon's live numbers;
// future days start with a few pre-booked tokens
export function defaultQueue(salon, date) {
  if (date === isoDate()) return { ...salon.queue }
  const prebooked = [...salon.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 4
  return { serving: 0, next: prebooked + 1 }
}

export function bookingStatus(booking, queue) {
  if (booking.status === 'cancelled') return 'cancelled'
  if (booking.status === 'no-show') return 'no-show'
  if (booking.status === 'declined' || booking.status === 'expired') return 'declined'
  if (booking.status === 'requested' || booking.status === 'proposed') return booking.status
  const today = isoDate()
  if (booking.date < today) return 'completed'
  if (booking.date > today) return 'scheduled'
  if (queue.serving > booking.token) return 'completed'
  if (queue.serving === booking.token) return 'your-turn'
  return 'in-queue'
}

const ACTIVE = ['in-queue', 'your-turn', 'scheduled', 'requested', 'proposed']
export const isActive = (status) => ACTIVE.includes(status)

export const STATUS_LABEL = {
  'in-queue': 'In queue',
  'your-turn': 'Your turn',
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  requested: 'Awaiting salon',
  proposed: 'New time suggested',
  declined: 'Declined · refunded',
  'no-show': 'No-show',
}

// When the booking starts, as epoch ms. Token bookings with no time count from the hour they were told to arrive,
// or from opening.
function startsAt(booking, salon) {
  const mins = booking.slot ?? (booking.arriveAt != null ? booking.arriveAt * 60 : salon.hours[0] * 60)
  return new Date(`${booking.date}T00:00:00`).getTime() + mins * 60000
}

// Preview of the API's refund rule for the cancel dialog: always before the salon confirms,
// otherwise only CANCEL_REFUND_HOURS or more before the start
export function refundsOnCancel(booking, salon, now = Date.now()) {
  if (booking.status === 'requested' || booking.status === 'proposed') return true
  return startsAt(booking, salon) - now >= CANCEL_REFUND_HOURS * 3600000
}
