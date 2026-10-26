import { useState } from 'react'
import { rupees, tokenLabel } from '../../utils/format'
import { Sheet, SourceBadge } from '../ui'
import { BillLines, BillTotals, QuickAdd } from './BillParts'
import { useDesk } from './context'
import { billProblem, tokenBill, useBill } from './useBill'

// Billing window for a live-queue token. Starts from what they booked; the desk can swap services,
// add retail products, change who did the work or the price, then collect payment or bill later.
export default function BillSheet({ row, date, onPaid, onLater, onClose }) {
  const desk = useDesk()
  const [start] = useState(() => tokenBill(row, desk))
  const bill = useBill({ clientId: start.clientId, items: start.items })
  const [saveClient, setSaveClient] = useState(Boolean(start.phone && !start.clientId))

  const collect = async () => {
    const problem = billProblem(bill)
    if (problem) return bill.setError(problem)
    let clientId = bill.clientId
    if (!clientId && saveClient) clientId = (await desk.addClient({ name: row.name, phone: start.phone }))?.id ?? null
    const invoice = await desk.checkout({ ...bill.payload(), clientId, token: { date, token: row.token }, customerName: row.name })
    if (invoice) onPaid(invoice)
  }

  return (
    <Sheet title={`Bill ${tokenLabel(row.token)} · ${row.name}`} onClose={onClose} wide>
      <div className="bill-head">
        <SourceBadge source={row.source} />
        <span className="muted small">Booked: {row.services.join(', ') || 'decide at salon'}</span>
        {row.phone !== '—' && <span className="muted small">· {row.phone}</span>}
      </div>

      <QuickAdd bill={bill} defaultStaffId={start.staffId} />
      <BillLines bill={bill} />
      <BillTotals bill={bill} />

      {!start.clientId && start.phone && (
        <label className="inline-check">
          <input type="checkbox" checked={saveClient} onChange={(e) => setSaveClient(e.target.checked)} /> Save {row.name} as a client (earns loyalty points)
        </label>
      )}

      <div className="p-form-foot">
        <button type="button" className="text-btn" onClick={onLater}>
          Bill later
        </button>
        <button type="button" className="btn btn-primary" onClick={collect}>
          Collect {rupees(bill.total)}
        </button>
      </div>
    </Sheet>
  )
}
