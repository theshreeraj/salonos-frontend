import { getSalon } from '../../data/salons'
import { useStore } from '../../store/context'
import { dayLabel, isoDate, rupees, tokenLabel, waitLabel } from '../../utils/format'
import { usePortal } from '../context'
import { useTokenRows } from '../hooks'
import { Empty, PageHeader, SourceBadge, Stat, TokenStatus } from '../ui'

export default function MyDay() {
  const { user } = usePortal()
  const salon = getSalon(user.salonId)
  const { getQueue } = useStore()
  const queue = getQueue(salon.id)
  const all = useTokenRows()(salon)
  const mine = all.filter((r) => r.stylist === user.name)
  const current = mine.find((r) => r.status === 'in-chair')
  const upNext = mine.filter((r) => r.status === 'waiting')
  const done = mine.filter((r) => r.status === 'done')

  // Position in the salon-wide line decides when each of my clients reaches me
  const etaFor = (token) => waitLabel(Math.max(0, token - queue.serving) * salon.avgMins)

  return (
    <>
      <PageHeader eyebrow={dayLabel(isoDate())} title={`Good to see you, ${user.name.split(' ')[0]}`} sub={`${salon.name} · salon is serving ${tokenLabel(queue.serving)}`} />

      <div className="p-stats">
        <Stat label="Clients done" value={done.length} />
        <Stat label="Waiting for you" value={upNext.length} note={upNext[0] ? `Next in ${etaFor(upNext[0].token)}` : 'Nobody yet'} />
        <Stat label="Service value" value={rupees(done.reduce((sum, r) => sum + r.amount, 0))} note="Completed today" />
      </div>

      <div className="q-grid">
        <section className="q-now">
          <div className="q-now-head">
            <span className="live-note">
              <span className="live-dot" /> In your chair
            </span>
            {current && <SourceBadge source={current.source} />}
          </div>
          {current ? (
            <>
              <div className="q-now-token">{tokenLabel(current.token)}</div>
              <div className="q-now-info">
                <strong>{current.name}</strong>
                <span>{current.services.join(', ') || 'Ask the client what they would like'}</span>
              </div>
            </>
          ) : (
            <>
              <div className="q-now-token muted">—</div>
              <p className="muted">You're free. The front desk will send your next client.</p>
            </>
          )}
        </section>

        <section className="q-next">
          <div className="p-section-head">
            <h2>Your next clients</h2>
            <span className="count">{upNext.length}</span>
          </div>
          {upNext.length ? (
            <ol className="q-list">
              {upNext.map((r) => (
                <li key={r.token}>
                  <span className="q-list-token">{tokenLabel(r.token)}</span>
                  <span className="q-list-main">
                    <strong>{r.name}</strong>
                    <span className="muted small">{r.services.join(', ') || 'Decide at salon'}</span>
                  </span>
                  <SourceBadge source={r.source} />
                  <span className="q-list-wait muted small">{etaFor(r.token)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <Empty icon="scissors" title="No clients assigned yet">
              <p className="muted">Clients who pick you, or any available stylist, show up here.</p>
            </Empty>
          )}
        </section>
      </div>

      {done.length > 0 && (
        <section className="p-section">
          <div className="p-section-head">
            <h2>Completed today</h2>
          </div>
          <div className="p-table-wrap">
            <table className="p-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Client</th>
                  <th>Services</th>
                  <th className="num">Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {done.map((r) => (
                  <tr key={r.token}>
                    <td className="p-token-cell">{tokenLabel(r.token)}</td>
                    <td>{r.name}</td>
                    <td>{r.services.join(', ')}</td>
                    <td className="num">{rupees(r.amount)}</td>
                    <td>
                      <TokenStatus status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  )
}
