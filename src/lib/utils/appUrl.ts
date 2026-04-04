const FALLBACK_APP_URL = 'http://localhost:5173'

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const isValidUrl = (value: string) => {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export const getPublicAppUrl = () => {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim()

  if (configuredUrl && isValidUrl(configuredUrl)) {
    return trimTrailingSlash(configuredUrl)
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    return trimTrailingSlash(window.location.origin)
  }

  return FALLBACK_APP_URL
}

export const getAuthRedirectUrl = (path = '/') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return new URL(normalizedPath, `${getPublicAppUrl()}/`).toString()
}
