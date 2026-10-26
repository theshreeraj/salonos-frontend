import { useState } from 'react'
import Icon from '../../components/Icon'
import { rupees } from '../../utils/format'
import { useDesk } from '../desk/context'
import { Empty, PageHeader, Pill, Sheet, Stat } from '../ui'

export default function Inventory() {
  const { products, removeProduct } = useDesk()
  const [editing, setEditing] = useState(undefined)
  const [adjusting, setAdjusting] = useState(null)

  const list = products.filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name))
  const low = list.filter((p) => p.stock <= p.lowAt)

  return (
    <>
      <PageHeader title="Inventory" sub="Retail products sold at checkout">
        <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
          <Icon name="plus" size={18} /> Add product
        </button>
      </PageHeader>

      <div className="p-stats">
        <Stat label="Products" value={list.length} />
        <Stat label="Low stock" value={low.length} note={low.length ? low.map((p) => p.name.split(' ')[0]).join(', ') : 'All stocked up'} />
        <Stat label="Units on hand" value={list.reduce((n, p) => n + p.stock, 0)} />
        <Stat label="Stock value" value={rupees(list.reduce((n, p) => n + p.stock * p.cost, 0))} note="At cost price" />
      </div>

      {list.length ? (
        <div className="p-table-wrap">
          <table className="p-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th className="num">Price</th>
                <th className="num">Cost</th>
                <th>Stock</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td className="muted">{p.sku || '—'}</td>
                  <td>{p.category}</td>
                  <td className="num">{rupees(p.price)}</td>
                  <td className="num">{rupees(p.cost)}</td>
                  <td>
                    <span className="stock-cell">
                      {p.stock}
                      {p.stock === 0 ? <Pill tone="red">Out of stock</Pill> : p.stock <= p.lowAt && <Pill tone="amber">Low stock</Pill>}
                    </span>
                  </td>
                  <td className="num">
                    <span className="row-actions">
                      <button type="button" className="text-btn link" onClick={() => setAdjusting(p)}>
                        Adjust stock
                      </button>
                      <button type="button" className="text-btn" onClick={() => setEditing(p)}>
                        Edit
                      </button>
                      <button type="button" className="text-btn" onClick={() => removeProduct(p.id)}>
                        Remove
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon="box" title="No products yet">
          <p className="muted">Add retail products to sell them at checkout.</p>
        </Empty>
      )}

      {editing !== undefined && <ProductSheet product={editing} onClose={() => setEditing(undefined)} />}
      {adjusting && <AdjustSheet product={adjusting} onClose={() => setAdjusting(null)} />}
    </>
  )
}

function ProductSheet({ product, onClose }) {
  const { saveProduct } = useDesk()
  const [form, setForm] = useState(product ?? { name: '', sku: '', category: '', price: '', cost: '', stock: 0, lowAt: 5 })
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  return (
    <Sheet title={product ? 'Edit product' : 'Add product'} onClose={onClose}>
      <form
        className="p-form"
        onSubmit={(e) => {
          e.preventDefault()
          saveProduct(
            { ...form, name: form.name.trim(), category: form.category.trim() || 'General', price: Number(form.price), cost: Number(form.cost || 0), stock: Number(form.stock), lowAt: Number(form.lowAt) },
            product?.id,
          )
          onClose()
        }}
      >
        <label className="field">
          <span>Product name</span>
          <input value={form.name} onChange={(e) => set({ name: e.target.value })} required autoFocus />
        </label>
        <div className="p-form-row">
          <label className="field">
            <span>SKU</span>
            <input value={form.sku} onChange={(e) => set({ sku: e.target.value.toUpperCase() })} />
          </label>
          <label className="field">
            <span>Category</span>
            <input value={form.category} onChange={(e) => set({ category: e.target.value })} placeholder="e.g. Hair care" />
          </label>
        </div>
        <div className="p-form-row">
          <label className="field">
            <span>Retail price (₹)</span>
            <input type="number" min={0} value={form.price} onChange={(e) => set({ price: e.target.value })} required />
          </label>
          <label className="field">
            <span>Cost price (₹)</span>
            <input type="number" min={0} value={form.cost} onChange={(e) => set({ cost: e.target.value })} />
          </label>
        </div>
        <div className="p-form-row">
          {!product && (
            <label className="field">
              <span>Opening stock</span>
              <input type="number" min={0} value={form.stock} onChange={(e) => set({ stock: e.target.value })} />
            </label>
          )}
          <label className="field">
            <span>Low stock alert at</span>
            <input type="number" min={0} value={form.lowAt} onChange={(e) => set({ lowAt: e.target.value })} />
          </label>
        </div>
        <div className="p-form-foot">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </form>
    </Sheet>
  )
}

function AdjustSheet({ product, onClose }) {
  const { saveProduct } = useDesk()
  const [mode, setMode] = useState('receive')
  const [qty, setQty] = useState(0)
  const next = mode === 'receive' ? product.stock + Number(qty) : Number(qty)

  return (
    <Sheet title={`Adjust stock · ${product.name}`} onClose={onClose}>
      <form
        className="p-form"
        onSubmit={(e) => {
          e.preventDefault()
          saveProduct({ stock: Math.max(0, next) }, product.id)
          onClose()
        }}
      >
        <div className="segmented">
          <button
            type="button"
            className={mode === 'receive' ? 'is-active' : ''}
            onClick={() => {
              setMode('receive')
              setQty(0)
            }}
          >
            Receive stock
            <span>Add a delivery</span>
          </button>
          <button
            type="button"
            className={mode === 'count' ? 'is-active' : ''}
            onClick={() => {
              setMode('count')
              setQty(product.stock)
            }}
          >
            Set count
            <span>After a stock take</span>
          </button>
        </div>
        <label className="field">
          <span>{mode === 'receive' ? 'Units received' : 'Units on shelf'}</span>
          <input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
        </label>
        <div className="p-form-foot">
          <span className="muted">
            {product.stock} → <strong>{Math.max(0, next)}</strong> units
          </span>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </form>
    </Sheet>
  )
}
