import { useState } from 'react'
import { lineTotal } from './logic'

export const GST_RATE = 0.18

// Editable bill state shared by the Checkout page and the queue's billing window.
// Lines: { kind: 'service' | 'product', refId, name, qty, price, staffId }
export function useBill(initial = {}) {
  const [clientId, setClientId] = useState(initial.clientId ?? '')
  const [cart, setCart] = useState(initial.items ?? [])
  const [discount, setDiscountRaw] = useState(0)
  const [gst, setGst] = useState(true)
  const [tip, setTipRaw] = useState(0)
  const [method, setMethod] = useState('upi')
  const [error, setError] = useState('')

  const subtotal = lineTotal(cart)
  const tax = gst ? Math.round(Math.max(0, subtotal - discount) * GST_RATE) : 0
  const total = Math.max(0, subtotal - discount + tax + tip)

  const addService = (s, staffId = '') => setCart((c) => [...c, { kind: 'service', refId: s.id, name: s.name, qty: 1, price: s.price, staffId }])

  const addProduct = (p, staffId = '') =>
    setCart((c) => {
      const line = c.find((i) => i.kind === 'product' && i.refId === p.id)
      if (!line) return [...c, { kind: 'product', refId: p.id, name: p.name, qty: 1, price: p.price, staffId }]
      return line.qty >= p.stock ? c : c.map((i) => (i === line ? { ...i, qty: i.qty + 1 } : i))
    })

  const setLine = (index, patch) => setCart((c) => c.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  const removeLine = (index) => setCart((c) => c.filter((_, i) => i !== index))

  const reset = (next = {}) => {
    setClientId(next.clientId ?? '')
    setCart(next.items ?? [])
    setDiscountRaw(0)
    setTipRaw(0)
    setError('')
  }

  return {
    clientId,
    setClientId,
    cart,
    discount,
    setDiscount: (n) => setDiscountRaw(Math.min(subtotal, Math.max(0, n || 0))),
    gst,
    setGst,
    tip,
    setTip: (n) => setTipRaw(Math.max(0, n || 0)),
    method,
    setMethod,
    error,
    setError,
    subtotal,
    tax,
    total,
    addService,
    addProduct,
    setLine,
    removeLine,
    reset,
    payload: () => ({ clientId, items: cart, discount, tax, tip, method }),
  }
}

// Every service line needs a barber so revenue is attributed correctly
export function billProblem(bill) {
  if (!bill.cart.length) return 'Add a service or product first.'
  if (bill.cart.some((i) => i.kind === 'service' && !i.staffId)) return 'Choose who did each service.'
  return ''
}

// Starting bill for a live-queue token: what they booked, done by the stylist on the token
export function tokenBill(row, { services, staff, clients }) {
  const barber = staff.find((s) => s.name === row.stylist && s.active) ?? staff.find((s) => s.active && s.role !== 'frontdesk')
  const items = row.services
    .map((name) => services.find((s) => s.name === name && s.active) ?? services.find((s) => s.name === name))
    .filter(Boolean)
    .map((s) => ({ kind: 'service', refId: s.id, name: s.name, qty: 1, price: s.price, staffId: barber?.id ?? '' }))
  const phone = /^\d{10}$/.test(row.phone) ? row.phone : ''
  return { items, staffId: barber?.id ?? '', clientId: (phone && clients.find((c) => c.phone === phone)?.id) || null, phone }
}
