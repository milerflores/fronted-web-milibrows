import { useEffect, useSyncExternalStore } from 'react'
import { getAuthSnapshot, restoreSession, subscribeAuth } from './authService'

export function useAuth() {
  const state = useSyncExternalStore(subscribeAuth, getAuthSnapshot)
  useEffect(() => {
    void restoreSession()
    const refresh = () => {
      void restoreSession()
    }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])
  return state
}
