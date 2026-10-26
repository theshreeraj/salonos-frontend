import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import { CATEGORIES, FACILITIES, getCategory } from '../../data/salons'
import { hoursLabel } from '../../utils/format'
import { usePortal } from '../context'
import { districtName } from '../data'
import { PageHeader } from '../ui'

const STEPS = ['Salon details', 'Services & facilities', 'Owner & documents', 'Review']
const DOCUMENTS = [
  { id: 'licence', label: 'Shop & establishment licence' },
  { id: 'ownerId', label: 'Owner PAN or Aadhaar' },
  { id: 'bank', label: 'Cancelled cheque for payouts' },
  { id: 'photos', label: 'Salon photos (outside and inside)' },
]
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6)

export default function Onboard() {
  const { user, leads, onboardings, submitOnboarding, resubmitOnboarding } = usePortal()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  // ?lead= starts from a lead's details; ?resubmit= reopens an application the manager sent back
  const lead = leads.find((l) => l.id === params.get('lead') && l.agentId === user.id)
  const resubmitting = onboardings.find((o) => o.id === params.get('resubmit') && o.agentId === user.id && o.status === 'rejected')
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(() => {
    const blank = {
      name: '',
      type: 'Unisex',
      area: '',
      address: '',
      chairs: 3,
      open: 9,
      close: 21,
      categories: [],
      facilities: ['payments', 'hygiene'],
      owner: '',
      ownerPhone: '',
      ownerEmail: '',
      gstin: '',
      documents: {},
    }
    if (resubmitting) {
      const a = resubmitting
      return {
        ...blank,
        ...a,
        ownerEmail: a.ownerEmail ?? '',
        gstin: a.gstin ?? '',
        open: a.hours[0],
        close: a.hours[1],
        documents: Object.fromEntries(DOCUMENTS.map((d) => [d.id, 'Previously uploaded'])),
      }
    }
    if (lead) return { ...blank, name: lead.name, type: lead.type, area: lead.area, address: lead.address, owner: lead.owner, ownerPhone: lead.phone }
    return blank
  })

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const toggleIn = (key, id) =>
    setForm((f) => ({ ...f, [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id] }))

  const stepValid = [
    form.name.trim() && form.area.trim() && form.address.trim() && Number(form.close) > Number(form.open),
    form.categories.length > 0,
    form.owner.trim() && /^\d{10}$/.test(form.ownerPhone) && DOCUMENTS.every((d) => form.documents[d.id]),
    true,
  ]

  const [submitting, setSubmitting] = useState(false)
  const submit = async () => {
    const fields = {
      name: form.name.trim(),
      type: form.type,
      area: form.area.trim(),
      address: form.address.trim(),
      district: user.district,
      owner: form.owner.trim(),
      ownerPhone: form.ownerPhone,
      chairs: Number(form.chairs),
      hours: [Number(form.open), Number(form.close)],
      categories: form.categories,
      facilities: form.facilities,
      ownerEmail: form.ownerEmail.trim(),
      gstin: form.gstin,
      agentId: user.id,
    }
    setSubmitting(true)
    const saved = resubmitting ? await resubmitOnboarding(resubmitting.id, fields) : await submitOnboarding(fields, lead?.id ?? null)
    setSubmitting(false)
    if (saved) navigate('/portal/onboardings')
  }

  return (
    <>
      <PageHeader
        eyebrow={districtName(user.district)}
        title={resubmitting ? `Fix & resubmit ${resubmitting.name}` : lead ? `Onboard ${lead.name}` : 'Onboard a salon'}
        sub={
          lead
            ? 'Details from your lead are filled in. Check them with the owner and add the rest.'
            : 'Your district manager reviews every application before the salon goes live on the app.'
        }
      />
      {resubmitting?.reviewNote && (
        <p className="ob-note ob-note-top">
          <Icon name="info" size={18} />
          <span>
            <strong>What your manager asked for</strong>
            {resubmitting.reviewNote}
          </span>
        </p>
      )}

      <ol className="stepper">
        {STEPS.map((label, i) => (
          <li key={label} className={`${i === step ? 'is-current' : ''} ${i < step ? 'is-done' : ''}`}>
            <span className="timeline-dot">{i < step ? <Icon name="check" size={12} strokeWidth={2.5} /> : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      <div className="p-card p-form">
        {step === 0 && (
          <>
            <label className="field">
              <span>Salon name</span>
              <input value={form.name} onChange={set('name')} placeholder="As shown on the shop board" autoFocus />
            </label>
            <div className="field">
              <span>Who it serves</span>
              <div className="segmented segmented-3">
                {['Men', 'Women', 'Unisex'].map((t) => (
                  <button key={t} type="button" className={form.type === t ? 'is-active' : ''} onClick={() => setForm((f) => ({ ...f, type: t }))}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-form-row">
              <label className="field">
                <span>Area / locality</span>
                <input value={form.area} onChange={set('area')} placeholder="Kothrud" />
              </label>
              <label className="field">
                <span>Chairs</span>
                <input type="number" min="1" max="40" value={form.chairs} onChange={set('chairs')} />
              </label>
            </div>
            <label className="field">
              <span>Full address</span>
              <input value={form.address} onChange={set('address')} placeholder="Shop no., building, road, pincode" />
            </label>
            <div className="p-form-row">
              <label className="field">
                <span>Opens at</span>
                <select value={form.open} onChange={set('open')}>
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {hoursLabel([h, h]).split(' –')[0]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Closes at</span>
                <select value={form.close} onChange={set('close')}>
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {hoursLabel([h, h]).split(' –')[0]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="field">
              <span>Service categories</span>
              <div className="chips">
                {CATEGORIES.map((c) => (
                  <button key={c.id} type="button" className={`chip ${form.categories.includes(c.id) ? 'is-active' : ''}`} onClick={() => toggleIn('categories', c.id)}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span>Facilities</span>
              <div className="p-check-grid">
                {Object.entries(FACILITIES).map(([id, f]) => (
                  <label key={id} className={`p-check ${form.facilities.includes(id) ? 'is-selected' : ''}`}>
                    <input type="checkbox" checked={form.facilities.includes(id)} onChange={() => toggleIn('facilities', id)} />
                    <Icon name={f.icon} size={18} />
                    <span>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="p-form-row">
              <label className="field">
                <span>Owner name</span>
                <input value={form.owner} onChange={set('owner')} autoFocus />
              </label>
              <label className="field">
                <span>Owner mobile</span>
                <input
                  inputMode="numeric"
                  value={form.ownerPhone}
                  onChange={(e) => setForm((f) => ({ ...f, ownerPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  placeholder="10-digit number"
                />
              </label>
            </div>
            <div className="p-form-row">
              <label className="field">
                <span>Owner email (optional)</span>
                <input type="email" value={form.ownerEmail} onChange={set('ownerEmail')} />
              </label>
              <label className="field">
                <span>GSTIN (optional)</span>
                <input value={form.gstin} onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))} />
              </label>
            </div>
            <div className="field">
              <span>Documents</span>
              <ul className="p-docs">
                {DOCUMENTS.map((d) => (
                  <li key={d.id}>
                    <Icon name={form.documents[d.id] ? 'check' : 'info'} size={18} className={form.documents[d.id] ? 'ok' : 'muted'} />
                    <span>
                      <strong>{d.label}</strong>
                      <span className="muted small d-block">{form.documents[d.id] ?? 'Not uploaded'}</span>
                    </span>
                    <label className="btn btn-outline btn-sm">
                      {form.documents[d.id] ? 'Replace' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) setForm((f) => ({ ...f, documents: { ...f.documents, [d.id]: file.name } }))
                        }}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {step === 3 && (
          <dl className="p-review">
            <div>
              <dt>Salon</dt>
              <dd>
                {form.name} · {form.type} · {form.chairs} chairs
              </dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>
                {form.address} ({form.area}, {districtName(user.district)})
              </dd>
            </div>
            <div>
              <dt>Hours</dt>
              <dd>{hoursLabel([Number(form.open), Number(form.close)])}</dd>
            </div>
            <div>
              <dt>Services</dt>
              <dd>{form.categories.map((c) => getCategory(c).name).join(', ')}</dd>
            </div>
            <div>
              <dt>Facilities</dt>
              <dd>{form.facilities.map((f) => FACILITIES[f].label).join(', ') || '—'}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>
                {form.owner} · {form.ownerPhone}
                {form.ownerEmail && ` · ${form.ownerEmail}`}
              </dd>
            </div>
            <div>
              <dt>Documents</dt>
              <dd>{DOCUMENTS.length} of {DOCUMENTS.length} uploaded</dd>
            </div>
          </dl>
        )}

        <div className="p-form-foot">
          <button type="button" className="btn btn-outline" onClick={() => (step ? setStep(step - 1) : navigate(-1))}>
            {step ? 'Back' : 'Cancel'}
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary" disabled={!stepValid[step]} onClick={() => setStep(step + 1)}>
              Continue
            </button>
          ) : (
            <button type="button" className="btn btn-primary" disabled={submitting} onClick={submit}>
              {resubmitting ? 'Resubmit for review' : 'Submit for review'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
