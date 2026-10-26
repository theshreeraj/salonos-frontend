import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSalon } from '../../data/salons'
import { isoDate, rupees, timeLabel, tokenLabel } from '../../utils/format'
import { usePortal } from '../context'
import { BillLines, BillTotals, CatalogChips } from '../desk/BillParts'
import ClientPicker from '../desk/ClientPicker'
import { useDesk } from '../desk/context'
import { PAYMENT_METHODS } from '../desk/logic'
import { billProblem, tokenBill, useBill } from '../desk/useBill'
import { useTokenRows } from '../hooks'
import { PageHeader, Sheet } from '../ui'

function appointmentItems(appt, serviceById) {
  return appt.serviceIds
    .map((id) => serviceById[id])
    .filter(Boolean)
    .map((s) => ({ kind: 'service', refId: s.id, name: s.name, qty: 1, price: s.price, staffId: appt.staffId }))
}

export default function Checkout() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = usePortal()
  const desk = useDesk()
  const { clients, appointments, pendingBills, serviceById, clientById, staffById, checkout } = desk
  const tokenRows = useTokenRows()(getSalon(user.salonId))
  const today = isoDate()

  const linked = appointments.find((a) => a.id === params.get('appointment') && !a.invoiceId)
  const [source, setSource] = useState(linked ? { appointmentId: linked.id } : null)
  const bill = useBill({
    clientId: linked?.clientId ?? (clientById[params.get('client')] ? params.get('client') : ''),
    items: linked ? appointmentItems(linked, serviceById) : [],
  })
  const [receipt, setReceipt] = useState(null)

  const unpaidAppointments = appointments
    .filter((a) => a.date === today && !a.invoiceId && (a.status === 'booked' || a.status === 'confirmed' || a.status === 'completed'))
    .sort((a, b) => a.start - b.start)
  const unpaidTokens = pendingBills
    .filter((p) => p.date === today)
    .map((p) => tokenRows.find((r) => r.token === p.token))
    .filter(Boolean)

  const loadAppointment = (a) => {
    setSource({ appointmentId: a.id })
    bill.reset({ clientId: a.clientId, items: appointmentItems(a, serviceById) })
  }

  const loadToken = (row) => {
    const start = tokenBill(row, desk)
    setSource({ token: { date: today, token: row.token }, customerName: row.name })
    bill.reset({ clientId: start.clientId, items: start.items })
  }

  const clear = () => {
    setSource(null)
    bill.reset()
  }

  const charge = async () => {
    if (bill.clientId === '' && !source?.customerName) return bill.setError('Choose a client, or pick “Walk-in customer”.')
    const problem = billProblem(bill)
    if (problem) return bill.setError(problem)
    const invoice = await checkout({ ...bill.payload(), clientId: bill.clientId || null, ...source })
    if (!invoice) return
    setReceipt(invoice)
    clear()
  }

  const isSource = (key, value) => source?.[key] === value || source?.token?.token === value

  return (
    <>
      <PageHeader title="Checkout" sub="Bill services and retail products, then take payment" />

      <div className="co-grid">
        <div className="co-main">
          <section className="p-card co-card">
            <h2 className="co-card-title">Client</h2>
            {source?.customerName && !bill.clientId ? (
              <p className="cp-selected">
                <strong>{source.customerName}</strong>
                <span className="muted small">Queue token {tokenLabel(source.token.token)}</span>
              </p>
            ) : (
              <ClientPicker clients={clients} value={bill.clientId} onChange={bill.setClientId} allowWalkIn />
            )}
          </section>

          {(unpaidAppointments.length > 0 || unpaidTokens.length > 0) && (
            <section className="p-card co-card">
              <h2 className="co-card-title">Waiting to pay</h2>
              <div className="co-chips">
                {unpaidTokens.map((r) => (
                  <button key={`t${r.token}`} type="button" className={`chip ${isSource('token', r.token) ? 'is-active' : ''}`} onClick={() => loadToken(r)}>
                    Token {tokenLabel(r.token)} · {r.name} · {r.stylist.split(' ')[0]}
                  </button>
                ))}
                {unpaidAppointments.map((a) => (
                  <button key={a.id} type="button" className={`chip ${isSource('appointmentId', a.id) ? 'is-active' : ''}`} onClick={() => loadAppointment(a)}>
                    {timeLabel(a.start)} · {clientById[a.clientId]?.name} · {staffById[a.staffId]?.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </section>
          )}

          <CatalogChips bill={bill} defaultStaffId={bill.cart.find((i) => i.staffId)?.staffId ?? ''} />
        </div>

        <aside className="p-card co-cart">
          <div className="co-cart-head">
            <h2 className="co-card-title">Bill</h2>
            {bill.cart.length > 0 && (
              <button type="button" className="text-btn" onClick={clear}>
                Clear
              </button>
            )}
          </div>
          <BillLines bill={bill} />
          <BillTotals bill={bill} />
          <button type="button" className="btn btn-primary btn-block" onClick={charge}>
            Collect {rupees(bill.total)}
          </button>
          <p className="muted small co-note">Each line is credited to the barber shown on it.</p>
        </aside>
      </div>

      {receipt && (
        <Sheet title="Payment received" onClose={() => setReceipt(null)}>
          <div className="sheet-center">
            <div className="token-hero co-receipt-amount">{rupees(receipt.total)}</div>
            <p>
              Invoice #{receipt.number} · {PAYMENT_METHODS[receipt.method]} · {clientById[receipt.clientId]?.name ?? receipt.customerName ?? 'Walk-in customer'}
            </p>
            {receipt.clientId && <p className="muted">+{Math.floor(receipt.total / 100)} loyalty points added.</p>}
            <div className="sheet-actions">
              <button type="button" className="btn btn-outline" onClick={() => navigate('/portal/revenue')}>
                View revenue
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setReceipt(null)}>
                New sale
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </>
  )
}
