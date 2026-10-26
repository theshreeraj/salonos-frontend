import { useState } from 'react'
import Icon from '../../components/Icon'
import { rupees } from '../../utils/format'
import { useDesk } from '../desk/context'
import { Empty, PageHeader, Sheet } from '../ui'

export default function Services() {
  const { services, removeService } = useDesk()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(undefined)

  const q = query.trim().toLowerCase()
  const list = services.filter((s) => s.active && (!q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)))
  const grouped = Object.groupBy(list, (s) => s.category)

  return (
    <>
      <PageHeader title="Services" sub={`${services.filter((s) => s.active).length} services on the menu`}>
        <label className="p-search">
          <Icon name="search" size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services" aria-label="Search services" />
        </label>
        <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
          <Icon name="plus" size={18} /> Add service
        </button>
      </PageHeader>

      {!list.length && (
        <Empty icon="scissors" title={q ? 'No services match' : 'No services yet'}>
          <p className="muted">{q ? 'Try another search.' : 'Add your first service to start taking bookings.'}</p>
        </Empty>
      )}

      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className="svc-group">
          <h2 className="svc-group-title">{category}</h2>
          <div className="card-grid">
            {items.map((s) => (
              <article key={s.id} className="p-card svc-card">
                <h3>{s.name}</h3>
                <span className="muted small svc-mins">
                  <Icon name="clock" size={14} /> {s.mins} min
                </span>
                <strong className="svc-price">{rupees(s.price)}</strong>
                <div className="svc-actions">
                  <button type="button" className="text-btn link" onClick={() => setEditing(s)}>
                    <Icon name="edit" size={14} /> Edit
                  </button>
                  <button type="button" className="text-btn" onClick={() => removeService(s.id)}>
                    <Icon name="trash" size={14} /> Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {editing !== undefined && <ServiceSheet service={editing} categories={[...new Set(services.map((s) => s.category))]} onClose={() => setEditing(undefined)} />}
    </>
  )
}

function ServiceSheet({ service, categories, onClose }) {
  const { saveService } = useDesk()
  const [name, setName] = useState(service?.name ?? '')
  const [category, setCategory] = useState(service?.category ?? '')
  const [mins, setMins] = useState(service?.mins ?? 30)
  const [price, setPrice] = useState(service?.price ?? '')

  return (
    <Sheet title={service ? 'Edit service' : 'Add service'} onClose={onClose}>
      <form
        className="p-form"
        onSubmit={(e) => {
          e.preventDefault()
          saveService({ name: name.trim(), category: category.trim() || 'General', mins: Number(mins), price: Number(price) }, service?.id)
          onClose()
        }}
      >
        <label className="field">
          <span>Service name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>
        <label className="field">
          <span>Category</span>
          <input value={category} onChange={(e) => setCategory(e.target.value)} list="service-categories" placeholder="e.g. Haircut, Facial & Skin" />
          <datalist id="service-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <div className="p-form-row">
          <label className="field">
            <span>Duration (min)</span>
            <input type="number" min={5} step={5} value={mins} onChange={(e) => setMins(e.target.value)} required />
          </label>
          <label className="field">
            <span>Price (₹)</span>
            <input type="number" min={0} step={10} value={price} onChange={(e) => setPrice(e.target.value)} required />
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
