import { createContext, useContext } from 'react'

export const PortalContext = createContext(null)

export function usePortal() {
  const portal = useContext(PortalContext)
  if (!portal) throw new Error('usePortal must be used inside <PortalProvider>')
  return portal
}
