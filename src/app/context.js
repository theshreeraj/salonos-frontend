import { createContext, useContext } from 'react'

export const AppContext = createContext(null)

export function useApp() {
  const app = useContext(AppContext)
  if (!app) throw new Error('useApp must be used inside <AppProvider>')
  return app
}
