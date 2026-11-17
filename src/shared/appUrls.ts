export function appUrl(app: 'client' | 'admin', route = ''): string {
  if (import.meta.env.DEV) {
    const url = new URL(window.location.href)
    url.port = app === 'client' ? '5173' : '5174'
    url.pathname = '/'
    url.search = ''
    url.hash = route
    return url.toString()
  }
  return `../${app}/${route}`
}
