import { useCallback, useEffect, useMemo, useState } from 'react'
import { get } from '../api'
import Icon from '../components/Icon'
import { applyConfig } from '../data/config'
import { setSalons } from '../data/salons'
import { SALON_META } from '../portal/data'
import { CatalogContext } from './catalogContext'

// Loads the API's constants (GET /config) and the salon catalogue before anything renders, so data/config.js,
// getSalon() and SALON_META work synchronously everywhere.
// refresh() reloads the salons after changes that add or hide them (approvals, suspensions).
let configLoaded = null
const loadConfig = () => (configLoaded ??= get('/config').then(applyConfig).catch((err) => {
  configLoaded = null
  throw err
}))

export function CatalogProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', version: 0, error: null, salons: [] })

  const load = useCallback(
    () =>
      Promise.all([get('/salons'), loadConfig()]).then(([list]) => {
        setSalons(list)
        for (const key of Object.keys(SALON_META)) delete SALON_META[key]
        for (const s of list) SALON_META[s.id] = s.meta
        setState((prev) => ({ status: 'ready', version: prev.version + 1, error: null, salons: list }))
      }),
    [],
  )

  const retry = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'loading' }))
    load().catch((err) => setState((prev) => ({ ...prev, status: 'error', error: err.message })))
  }, [load])

  useEffect(() => {
    load().catch((err) => setState((prev) => ({ ...prev, status: 'error', error: err.message })))
    // Staff see internal salon details (owner, onboarding agent), so reload when someone signs in or out
    const onAuth = () => load().catch(() => {})
    window.addEventListener('salonos:auth', onAuth)
    return () => window.removeEventListener('salonos:auth', onAuth)
  }, [load])

  // salons: the same list as SALONS, as a new array per load so memoised views recompute
  const value = useMemo(() => ({ version: state.version, salons: state.salons, refresh: load }), [state.version, state.salons, load])

  if (state.status !== 'ready' && state.version === 0) {
    return (
      <div className="boot">
        <span className="logo-mark">
          <Icon name="scissors" size={20} strokeWidth={2} />
        </span>
        {state.status === 'error' ? (
          <>
            <p>{state.error}</p>
            <button type="button" className="btn btn-primary" onClick={retry}>
              Try again
            </button>
          </>
        ) : (
          <span className="spinner" aria-label="Loading" />
        )}
      </div>
    )
  }
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}
