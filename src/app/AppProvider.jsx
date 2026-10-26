import { useCallback, useEffect, useMemo, useState } from 'react'
import { attempt, get, patch, put, tokens } from '../api'
import { AppContext } from './context'

const GUEST_FAV_KEY = 'salonos:app:favourites:v1'
// The draft lives in sessionStorage so it survives the sign-in detour and a refresh, but not a new visit
const DRAFT_KEY = 'salonos:app:draft:v1'

const EMPTY_DRAFT = { salonId: null, serviceIds: [], date: null, slot: null, stylist: null }

function read(storage, key, fallback) {
  try {
    return JSON.parse(storage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

function usePersisted(storage, key, fallback) {
  const [value, setValue] = useState(() => read(storage, key, fallback))
  useEffect(() => {
    try {
      storage.setItem(key, JSON.stringify(value))
    } catch {
      // storage unavailable (private mode); state still lives in memory
    }
  }, [storage, key, value])
  return [value, setValue]
}

// Customer session (phone + OTP via the API), favourites and the booking in progress.
// user: { id, phone, name, favourites } once signed in. ready: false until a saved session has been checked.
export function AppProvider({ children }) {
  const [session, setSession] = useState(() => ({ user: null, ready: !tokens.get('customer') }))
  const [guestFavourites, setGuestFavourites] = usePersisted(localStorage, GUEST_FAV_KEY, [])
  const [draft, setDraft] = usePersisted(sessionStorage, DRAFT_KEY, EMPTY_DRAFT)

  useEffect(() => {
    if (!tokens.get('customer')) return
    get('/me')
      .then((user) => setSession({ user, ready: true }))
      .catch(() => {
        tokens.set('customer', null)
        setSession({ user: null, ready: true })
      })
  }, [])

  // Called by the sign-in screen after the code is verified
  const signIn = useCallback((token, user) => {
    tokens.set('customer', token)
    setSession({ user, ready: true })
  }, [])

  const signOut = useCallback(() => {
    tokens.set('customer', null)
    setSession({ user: null, ready: true })
  }, [])

  const setName = useCallback(async (name) => {
    const user = await patch('/me', { name })
    setSession({ user, ready: true })
    return user
  }, [])

  const favourites = session.user ? session.user.favourites : guestFavourites
  const toggleFavourite = useCallback(
    async (id) => {
      if (!session.user) {
        setGuestFavourites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))
        return
      }
      const user = await attempt(put(`/me/favourites/${id}`))
      if (user) setSession({ user, ready: true })
    },
    [session.user, setGuestFavourites],
  )

  // Starting on a different salon throws away the old selection
  const startDraft = useCallback((salonId) => setDraft((d) => (d.salonId === salonId ? d : { ...EMPTY_DRAFT, salonId })), [setDraft])
  const updateDraft = useCallback((p) => setDraft((d) => ({ ...d, ...p })), [setDraft])
  const clearDraft = useCallback(() => setDraft(EMPTY_DRAFT), [setDraft])

  const value = useMemo(
    () => ({ user: session.user, ready: session.ready, signIn, signOut, setName, favourites, toggleFavourite, draft, startDraft, updateDraft, clearDraft }),
    [session, signIn, signOut, setName, favourites, toggleFavourite, draft, startDraft, updateDraft, clearDraft],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
