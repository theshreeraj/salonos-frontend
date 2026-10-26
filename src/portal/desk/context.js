import { createContext, useContext } from 'react'

export const DeskContext = createContext(null)

export function useDesk() {
  const desk = useContext(DeskContext)
  if (!desk) throw new Error('useDesk must be used inside <DeskProvider>')
  return desk
}
