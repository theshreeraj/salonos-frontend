import { useCallback, useEffect, useMemo, useState } from 'react'
import { attempt, get, patch, post, put, tokens } from '../api'
import { SALONS } from '../data/salons'
import { useCatalog } from '../store/catalogContext'
import { PortalContext } from './context'

const POLL_MS = 30000
// Roles that work with onboarding applications and leads
const PIPELINE_ROLES = ['agent', 'manager', 'admin']

const SIGNED_OUT = { ready: true, user: null, users: [], onboardings: [], leads: [] }

// Portal session and the people, applications and leads the signed-in user may see (scoped by the API).
export function PortalProvider({ children }) {
  const catalog = useCatalog()
  const [state, setState] = useState(() => ({ ...SIGNED_OUT, ready: !tokens.get('staff') }))

  const loadData = useCallback(async (user) => {
    const pipeline = PIPELINE_ROLES.includes(user.role)
    const [users, onboardings, leads] = await Promise.all([get('/users'), pipeline ? get('/onboardings') : [], pipeline ? get('/leads') : []])
    setState({ ready: true, user, users, onboardings, leads })
  }, [])

  // Restore a saved session
  useEffect(() => {
    if (!tokens.get('staff')) return
    get('/portal/me')
      .then(loadData)
      .catch(() => {
        tokens.set('staff', null)
        setState(SIGNED_OUT)
      })
  }, [loadData])

  // Pick up changes made by others (a manager reviewing, an agent adding leads)
  useEffect(() => {
    if (!state.user) return undefined
    const id = setInterval(() => document.visibilityState === 'visible' && loadData(state.user).catch(() => {}), POLL_MS)
    return () => clearInterval(id)
  }, [state.user, loadData])

  const reload = useCallback(() => (state.user ? loadData(state.user).catch(() => {}) : null), [state.user, loadData])

  // Resolves to { user } or { error }
  const login = useCallback(
    async ({ identifier, password, role }) => {
      try {
        const { token, user } = await post('/portal/login', { identifier, password, role })
        tokens.set('staff', token)
        await loadData(user)
        return { user }
      } catch (err) {
        return { error: err.message }
      }
    },
    [loadData],
  )

  const logout = useCallback(() => {
    tokens.set('staff', null)
    setState(SIGNED_OUT)
  }, [])

  // Replaces one record in a list held in state
  const replaceIn = (key, doc) => setState((s) => ({ ...s, [key]: s[key].map((x) => (x.id === doc.id ? doc : x)) }))

  const addUser = useCallback(
    async (fields) => {
      const user = await attempt(post('/users', fields))
      if (user) setState((s) => ({ ...s, users: [...s.users, user] }))
      return user
    },
    [],
  )

  const setUserActive = useCallback(async (id, active) => {
    const user = await attempt(patch(`/users/${id}`, { active }))
    if (user) replaceIn('users', user)
  }, [])

  // leadId links the application back to the agent's lead so the pipeline shows its review status
  const submitOnboarding = useCallback(
    async (fields, leadId = null) => {
      const entry = await attempt(post('/onboardings', { ...fields, leadId }))
      if (entry) await reload()
      return entry
    },
    [reload],
  )

  const resubmitOnboarding = useCallback(async (id, fields) => {
    const entry = await attempt(post(`/onboardings/${id}/resubmit`, fields))
    if (entry) replaceIn('onboardings', entry)
    return entry
  }, [])

  // Approving puts the salon live, so the catalogue is reloaded too
  const reviewOnboarding = useCallback(
    async (id, status, note = '') => {
      const entry = await attempt(post(`/onboardings/${id}/review`, { status, note }))
      if (!entry) return null
      replaceIn('onboardings', entry)
      if (status === 'approved') await catalog.refresh()
      return entry
    },
    [catalog],
  )

  // Resolves to { created, skipped }
  const addLeads = useCallback(async (list) => {
    const result = await attempt(post('/leads', { leads: list }), { created: [], skipped: [] })
    if (result.created.length) setState((s) => ({ ...s, leads: [...result.created, ...s.leads] }))
    return result
  }, [])

  const logActivity = useCallback(async (leadId, activity) => {
    const lead = await attempt(post(`/leads/${leadId}/activities`, activity))
    if (lead) replaceIn('leads', lead)
    return lead
  }, [])

  const updateLead = useCallback(async (leadId, changes) => {
    const lead = await attempt(patch(`/leads/${leadId}`, changes))
    if (lead) replaceIn('leads', lead)
  }, [])

  const toggleSuspend = useCallback(
    async (salonId) => {
      const salon = SALONS.find((s) => s.id === salonId)
      if (await attempt(put(`/salons/${salonId}/suspended`, { suspended: !salon?.suspended }))) await catalog.refresh()
    },
    [catalog],
  )

  // Derived from the catalogue so it stays in step after refresh()
  const suspended = useMemo(() => Object.fromEntries(SALONS.map((s) => [s.id, Boolean(s.suspended)])), [catalog.version]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(
    () => ({
      ready: state.ready,
      user: state.user,
      users: state.users,
      onboardings: state.onboardings,
      leads: state.leads,
      suspended,
      login,
      logout,
      addUser,
      setUserActive,
      submitOnboarding,
      resubmitOnboarding,
      reviewOnboarding,
      addLeads,
      logActivity,
      updateLead,
      toggleSuspend,
    }),
    [state, suspended, login, logout, addUser, setUserActive, submitOnboarding, resubmitOnboarding, reviewOnboarding, addLeads, logActivity, updateLead, toggleSuspend],
  )

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}
