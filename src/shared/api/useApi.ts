import { useEffect, useState } from 'react'
import { allPages, resource } from './http'

export function useApi<T>(path: string | null, paginated = false) {
  const [version, setVersion] = useState(0)
  const key = `${path}|${paginated}|${version}`
  const [result, setResult] = useState<{ key: string; data: T | null; error: string } | null>(null)
  useEffect(() => {
    if (!path) return
    let active = true
    const pending = paginated ? (allPages<unknown>(path) as Promise<T>) : resource<T>(path)
    pending
      .then((data) => {
        if (active) setResult({ key, data, error: '' })
      })
      .catch((error: unknown) => {
        if (active)
          setResult({
            key,
            data: null,
            error: error instanceof Error ? error.message : 'No se pudo cargar la información.',
          })
      })
    return () => {
      active = false
    }
  }, [path, paginated, key])
  return {
    data: result?.key === key ? result.data : null,
    error: result?.key === key ? result.error : '',
    loading: !!path && result?.key !== key,
    reload: () => setVersion((value) => value + 1),
  }
}
