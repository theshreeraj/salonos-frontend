import Icon from '../../components/Icon'
import { rupees } from '../../utils/format'
import { useDesk } from './context'
import { PAYMENT_METHODS, isBookable } from './logic'

// Chip lists for adding any service or retail product to the bill
export function CatalogChips({ bill, defaultStaffId }) {
  const { services, products } = useDesk()
  return (
    <>
      <section className="p-card co-card">
        <h2 className="co-card-title">Add services</h2>
        <div className="co-chips">
          {services
            .filter((s) => s.active)
            .map((s) => (
              <button key={s.id} type="button" className="chip" onClick={() => bill.addService(s, defaultStaffId)}>
                {s.name} · {rupees(s.price)}
              </button>
            ))}
        </div>
      </section>
      <section className="p-card co-card">
        <h2 className="co-card-title">Add products</h2>
        <div className="co-chips">
          {products
            .filter((p) => p.active)
            .map((p) => (
              <button key={p.id} type="button" className="chip" onClick={() => bill.addProduct(p, '')} disabled={p.stock === 0}>
                {p.name} · {rupees(p.price)}
                <span className="chip-count">{p.stock ? `${p.stock} left` : 'Out of stock'}</span>
              </button>
            ))}
        </div>
      </section>
    </>
  )
}

// Compact "add" dropdowns for the billing window
export function QuickAdd({ bill, defaultStaffId }) {
  const { services, products } = useDesk()
  return (
    <div className="bill-add">
      <select
        className="p-select"
        value=""
        onChange={(e) => {
          const s = services.find((x) => x.id === e.target.value)
          if (s) bill.addService(s, defaultStaffId)
        }}
        aria-label="Add a service"
      >
        <option value="">+ Add service</option>
        {services
          .filter((s) => s.active)
          .map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {rupees(s.price)}
            </option>
          ))}
      </select>
      <select
        className="p-select"
        value=""
        onChange={(e) => {
          const p = products.find((x) => x.id === e.target.value)
          if (p) bill.addProduct(p, defaultStaffId)
        }}
        aria-label="Add a product"
      >
        <option value="">+ Add product</option>
        {products
          .filter((p) => p.active)
          .map((p) => (
            <option key={p.id} value={p.id} disabled={p.stock === 0}>
              {p.name} · {rupees(p.price)} ({p.stock} left)
            </option>
          ))}
      </select>
    </div>
  )
}

// Editable lines: who did / sold it, price, quantity
export function BillLines({ bill }) {
  const { staff, products } = useDesk()
  const team = staff.filter(isBookable)

  if (!bill.cart.length) return <p className="muted co-empty">No items on the bill yet.</p>

  return (
    <ul className="co-lines">
      {bill.cart.map((item, i) => (
        <li key={i}>
          <div className="co-line-main">
            <strong>{item.name}</strong>
            <span className="co-line-meta">
              <select className="co-line-staff" value={item.staffId} onChange={(e) => bill.setLine(i, { staffId: e.target.value })} aria-label={item.kind === 'service' ? 'Done by' : 'Sold by'}>
                {item.kind === 'product' && <option value="">Counter sale</option>}
                {item.kind === 'service' && !item.staffId && <option value="">Choose barber</option>}
                {team.map((s) => (
                  <option key={s.id} value={s.id}>
                    {item.kind === 'service' ? 'by' : 'sold by'} {s.name}
                  </option>
                ))}
              </select>
              {item.kind === 'product' && (
                <span className="co-qty">
                  <button type="button" className="icon-btn" onClick={() => (item.qty > 1 ? bill.setLine(i, { qty: item.qty - 1 }) : bill.removeLine(i))} aria-label="Fewer">
                    −
                  </button>
                  {item.qty}
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => bill.setLine(i, { qty: Math.min(item.qty + 1, products.find((p) => p.id === item.refId)?.stock ?? item.qty) })}
                    aria-label="More"
                  >
                    +
                  </button>
                </span>
              )}
            </span>
          </div>
          <label className="co-line-price">
            <span className="muted">₹</span>
            <input type="number" min={0} value={item.price} onChange={(e) => bill.setLine(i, { price: Math.max(0, Number(e.target.value)) })} aria-label={`Price of ${item.name}`} />
          </label>
          <button type="button" className="icon-btn co-remove" onClick={() => bill.removeLine(i)} aria-label={`Remove ${item.name}`}>
            <Icon name="trash" size={16} />
          </button>
        </li>
      ))}
    </ul>
  )
}

export function BillTotals({ bill }) {
  return (
    <>
      <dl className="co-totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{rupees(bill.subtotal)}</dd>
        </div>
        <div>
          <dt>Discount</dt>
          <dd>
            <input type="number" min={0} value={bill.discount} onChange={(e) => bill.setDiscount(Number(e.target.value))} aria-label="Discount in rupees" />
          </dd>
        </div>
        <div>
          <dt>
            <label className="inline-check">
              <input type="checkbox" checked={bill.gst} onChange={(e) => bill.setGst(e.target.checked)} /> GST 18%
            </label>
          </dt>
          <dd>{rupees(bill.tax)}</dd>
        </div>
        <div>
          <dt>Tip</dt>
          <dd>
            <input type="number" min={0} value={bill.tip} onChange={(e) => bill.setTip(Number(e.target.value))} aria-label="Tip in rupees" />
          </dd>
        </div>
        <div className="co-total">
          <dt>Total</dt>
          <dd>{rupees(bill.total)}</dd>
        </div>
      </dl>

      <div className="field">
        <span>Payment method</span>
        <div className="p-tabs co-methods" role="radiogroup">
          {Object.entries(PAYMENT_METHODS).map(([id, label]) => (
            <button key={id} type="button" role="radio" aria-checked={bill.method === id} className={bill.method === id ? 'is-active' : ''} onClick={() => bill.setMethod(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {bill.error && <p className="form-error">{bill.error}</p>}
    </>
  )
}
