import { useMemo, useState } from 'react'
import Icon from '../../components/Icon'
import { dayLabel, isoDate } from '../../utils/format'
import { usePortal } from '../context'
import { districtName } from '../data'
import { useMyLeads } from '../hooks'
import LeadDrawer, { FollowUpLabel, LeadStatusPill } from '../LeadDrawer'
import { CSV_TEMPLATE, LEAD_SOURCES, LEAD_STATUS, OUTCOMES, followUpState, isOpenLead, leadStatus, parseLeads, telUrl } from '../leads'
import { Empty, PageHeader, Sheet, Stat } from '../ui'

const FILTERS = ['all', 'new', 'contacted', 'interested', 'review', 'changes', 'onboarded', 'not-interested']

export default function Leads() {
  const { user, onboardings } = usePortal()
  const leads = useMyLeads()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const today = isoDate()

  const rows = useMemo(
    () =>
      leads.map((l) => ({ lead: l, status: leadStatus(l, onboardings), last: l.activities.at(-1) })).sort((a, b) => {
        // Open leads first, ordered by next follow-up; the rest by most recent
        const ao = isOpenLead(a.status), bo = isOpenLead(b.status)
        if (ao !== bo) return ao ? -1 : 1
        if (ao) return (a.lead.nextFollowUp ?? '9999').localeCompare(b.lead.nextFollowUp ?? '9999')
        return (b.last?.at ?? 0) - (a.last?.at ?? 0)
      }),
    [leads, onboardings],
  )
  const count = (f) => (f === 'all' ? rows.length : rows.filter((r) => r.status === f).length)
  const q = query.trim().toLowerCase()
  const shown = rows.filter((r) => (filter === 'all' || r.status === filter) && (!q || [r.lead.name, r.lead.area, r.lead.owner, r.lead.phone].some((x) => x?.toLowerCase().includes(q))))

  const open = rows.filter((r) => isOpenLead(r.status))
  const due = open.filter((r) => ['overdue', 'today'].includes(followUpState(r.lead.nextFollowUp, today))).length
  const submitted = rows.filter((r) => r.lead.onboardingId).length

  return (
    <>
      <PageHeader eyebrow={districtName(user.district)} title="Leads" sub="Salons you've found but not onboarded yet. Log every call and visit so you know when to go back.">
        <button type="button" className="btn btn-outline" onClick={() => setImporting(true)}>
          <Icon name="list" size={18} /> Bulk import
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
          <Icon name="plus" size={18} /> Add lead
        </button>
      </PageHeader>

      <div className="p-stats">
        <Stat label="Open leads" value={open.length} note={`${count('new')} not contacted yet`} />
        <Stat label="Follow-ups due" value={due} note="Today and overdue" />
        <Stat label="Interested" value={count('interested')} note="Ready to onboard" />
        <Stat label="Lead → submitted" value={rows.length ? `${Math.round((submitted / rows.length) * 100)}%` : '—'} note={`${submitted} of ${rows.length} leads`} />
      </div>

      <div className="p-toolbar">
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f} type="button" className={`chip ${filter === f ? 'is-active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : LEAD_STATUS[f].label} <span className="chip-count">{count(f)}</span>
            </button>
          ))}
        </div>
        <label className="p-search">
          <Icon name="search" size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Salon, owner, area, phone" aria-label="Search leads" />
        </label>
      </div>

      {shown.length ? (
        <div className="p-table-wrap">
          <table className="p-table lead-table">
            <thead>
              <tr>
                <th>Salon</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Next follow-up</th>
                <th>Last contact</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {shown.map(({ lead, status, last }) => (
                <tr key={lead.id} className="is-clickable" onClick={() => setOpenId(lead.id)}>
                  <td>
                    <strong>{lead.name}</strong>
                    <span className="muted small d-block">
                      {lead.type} · {lead.area} · {lead.source}
                    </span>
                  </td>
                  <td>
                    {lead.owner || '—'}
                    <span className="muted small d-block">+91 {lead.phone}</span>
                  </td>
                  <td>
                    <LeadStatusPill status={status} />
                  </td>
                  <td>{isOpenLead(status) ? <FollowUpLabel date={lead.nextFollowUp} /> : <span className="muted">—</span>}</td>
                  <td className="lead-last">
                    {last ? (
                      <>
                        <span className="small">
                          {dayLabel(isoDate(new Date(last.at)))}
                          {last.outcome && ` · ${OUTCOMES[last.outcome].label}`}
                        </span>
                        {last.note && <span className="muted small d-block">{last.note}</span>}
                      </>
                    ) : (
                      <span className="muted small">Not contacted</span>
                    )}
                  </td>
                  <td className="row-actions">
                    <a className="icon-btn" href={telUrl(lead.phone)} onClick={(e) => e.stopPropagation()} aria-label={`Call ${lead.name}`}>
                      <Icon name="phone" size={18} />
                    </a>
                    <Icon name="chevronRight" size={18} className="muted" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty icon="users" title={leads.length ? 'No leads match' : 'No leads yet'}>
          <p className="muted">{leads.length ? 'Try another filter or search.' : 'Add salons you walk past, or import a list from a spreadsheet.'}</p>
        </Empty>
      )}

      {openId && <LeadDrawer key={openId} leadId={openId} onClose={() => setOpenId(null)} />}
      {adding && <AddLeadSheet onClose={() => setAdding(false)} onAdded={(id) => setOpenId(id)} />}
      {importing && <ImportSheet onClose={() => setImporting(false)} />}
    </>
  )
}

function AddLeadSheet({ onClose, onAdded }) {
  const { addLeads } = usePortal()
  const leads = useMyLeads()
  const [form, setForm] = useState({ name: '', type: 'Unisex', area: '', owner: '', phone: '', address: '', source: 'Walk-by', nextFollowUp: isoDate(), note: '' })
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const duplicate = leads.find((l) => l.phone === form.phone)
  const valid = form.name.trim() && form.area.trim() && /^[6-9]\d{9}$/.test(form.phone) && !duplicate

  const [error, setError] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    const { created, skipped } = await addLeads([{ ...form, name: form.name.trim(), area: form.area.trim(), owner: form.owner.trim(), address: form.address.trim(), note: form.note.trim() }])
    if (!created.length) return setError(skipped[0]?.reason ?? 'Couldn’t add this lead.')
    onClose()
    onAdded(created[0].id)
  }

  return (
    <Sheet title="Add a lead" onClose={onClose}>
      <form className="p-form-plain" onSubmit={submit}>
        <label className="field">
          <span>Salon name</span>
          <input value={form.name} onChange={set('name')} placeholder="As shown on the shop board" autoFocus required />
        </label>
        <div className="segmented segmented-3" role="radiogroup" aria-label="Who it serves">
          {['Men', 'Women', 'Unisex'].map((t) => (
            <button key={t} type="button" role="radio" aria-checked={form.type === t} className={form.type === t ? 'is-active' : ''} onClick={() => setForm((f) => ({ ...f, type: t }))}>
              {t}
            </button>
          ))}
        </div>
        <div className="p-form-row">
          <label className="field">
            <span>Owner / contact name</span>
            <input value={form.owner} onChange={set('owner')} />
          </label>
          <label className="field">
            <span>Mobile</span>
            <input inputMode="numeric" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} placeholder="10 digits" required />
          </label>
        </div>
        {duplicate && <p className="form-error">{duplicate.name} already has this number.</p>}
        {error && <p className="form-error">{error}</p>}
        <div className="p-form-row">
          <label className="field">
            <span>Area</span>
            <input value={form.area} onChange={set('area')} placeholder="Kothrud" required />
          </label>
          <label className="field">
            <span>Source</span>
            <select value={form.source} onChange={set('source')}>
              {LEAD_SOURCES.filter((s) => s !== 'Bulk import').map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Address (optional)</span>
          <input value={form.address} onChange={set('address')} />
        </label>
        <div className="p-form-row">
          <label className="field">
            <span>First follow-up</span>
            <input type="date" min={isoDate()} value={form.nextFollowUp} onChange={set('nextFollowUp')} />
          </label>
        </div>
        <label className="field">
          <span>Note (optional)</span>
          <textarea rows={2} value={form.note} onChange={set('note')} placeholder="Chairs, current booking method, who decides…" />
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={!valid}>
          Add lead
        </button>
      </form>
    </Sheet>
  )
}

function ImportSheet({ onClose }) {
  const { addLeads } = usePortal()
  const leads = useMyLeads()
  const [text, setText] = useState('')
  const [followUp, setFollowUp] = useState(isoDate())
  const [done, setDone] = useState(null)
  const parsed = useMemo(() => parseLeads(text, new Set(leads.map((l) => l.phone))), [text, leads])
  const good = parsed.filter((r) => !r.error)

  const readFile = (file) => {
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result))
    reader.readAsText(file)
  }

  const [busy, setBusy] = useState(false)
  // The API re-checks every row; anything it skips (e.g. added by someone else meanwhile) is reported
  const run = async () => {
    setBusy(true)
    const { created, skipped } = await addLeads(good.map(({ name, area, owner, phone, type, address }) => ({ name, area, owner, phone, type, address, source: 'Bulk import', nextFollowUp: followUp })))
    setBusy(false)
    if (created.length || skipped.length) setDone({ created: created.length, skipped: skipped.length })
  }

  if (done != null) {
    return (
      <Sheet title="Import complete" onClose={onClose}>
        <div className="sheet-center">
          <span className="success-mark">
            <Icon name="check" size={28} strokeWidth={2.2} />
          </span>
          <h2 className="sheet-title">
            {done.created} {done.created === 1 ? 'lead' : 'leads'} added
          </h2>
          <p className="muted">
            They're under New, with a first follow-up on {dayLabel(followUp)}.{done.skipped > 0 && ` ${done.skipped} skipped as duplicates or invalid.`}
          </p>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title="Bulk import leads" onClose={onClose} wide>
      <p className="muted">
        Paste rows from Excel or Google Sheets, or upload a CSV. Columns in this order: <strong>Salon name, Area, Owner name, Phone, Type, Address</strong>. Only name and phone are required.
      </p>
      <div className="import-actions">
        <label className="btn btn-outline btn-sm">
          <Icon name="box" size={16} /> Upload CSV
          <input type="file" accept=".csv,text/csv,text/plain" hidden onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
        </label>
        <a className="btn btn-outline btn-sm" href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`} download="salonos-leads-template.csv">
          Download template
        </a>
      </div>
      <textarea className="import-text" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Style Hub, Kothrud, Rakesh Jadhav, 9822000111, Men\nCurl Up, Baner, Neha Joshi, 9890001122, Women'} aria-label="Leads to import" />

      {parsed.length > 0 && (
        <>
          <p className="import-summary">
            <strong>{good.length}</strong> ready to import
            {parsed.length - good.length > 0 && (
              <>
                {' '}
                · <span className="import-bad">{parsed.length - good.length} will be skipped</span>
              </>
            )}
          </p>
          <div className="p-table-wrap import-preview">
            <table className="p-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Salon</th>
                  <th>Area</th>
                  <th>Owner</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {parsed.map((r) => (
                  <tr key={r.line} className={r.error ? 'is-muted' : ''}>
                    <td>{r.line}</td>
                    <td>{r.name || '—'}</td>
                    <td>{r.area || '—'}</td>
                    <td>{r.owner || '—'}</td>
                    <td>{r.phone || '—'}</td>
                    <td>{r.type}</td>
                    <td>{r.error ? <span className="import-bad small">{r.error}</span> : <Icon name="check" size={16} className="ok" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="import-foot">
        <label className="field">
          <span>First follow-up for all</span>
          <input type="date" min={isoDate()} value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
        </label>
        <button type="button" className="btn btn-primary" disabled={!good.length || busy} onClick={run}>
          Import {good.length || ''} {good.length === 1 ? 'lead' : 'leads'}
        </button>
      </div>
    </Sheet>
  )
}
