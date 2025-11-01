import { useCallback, useEffect, useState } from 'react'

export interface AuthUser {
  id: string
  name: string
  provider: string
  email?: string | null
  avatarUrl?: string | null
  roles: string[]
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
}

export const AUTH_PROVIDERS = [
  { id: 'aad', label: 'Microsoft' },
  { id: 'google', label: 'Google' },
  { id: 'github', label: 'GitHub' },
  { id: 'facebook', label: 'Facebook' }
]

const ME_ENDPOINT = '/.auth/me'

function getClaim(principal: any, type: string): string | undefined {
  return principal?.claims?.find((c: any) => c.typ === type)?.val
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null })

  const fetchPrincipal = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch(ME_ENDPOINT, { credentials: 'include' })
      if (!res.ok) throw new Error(`/.auth/me failed (${res.status})`)
      const data = await res.json()
      const principal = data?.clientPrincipal ?? null
      if (!principal || !principal.userId) {
        setState({ user: null, loading: false, error: null })
        return
      }
      const user: AuthUser = {
        id: principal.userId,
        name: getClaim(principal, 'name') || principal.userDetails || 'User',
        provider: principal.identityProvider,
        email: getClaim(principal, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress') || null,
        avatarUrl: getClaim(principal, 'picture') || null,
        roles: Array.isArray(principal.roles) ? principal.roles : []
      }
      setState({ user, loading: false, error: null })
    } catch (e: any) {
      setState({ user: null, loading: false, error: e.message || 'Failed to load auth state' })
    }
  }, [])

  useEffect(() => { void fetchPrincipal() }, [fetchPrincipal])

  const login = useCallback((providerId: string, redirectUri: string = window.location.href) => {
    const target = `/.auth/login/${providerId}?post_login_redirect_uri=${encodeURIComponent(redirectUri)}`
    window.location.href = target
  }, [])

  const logout = useCallback((redirectUri: string = window.location.href) => {
    const target = `/.auth/logout?post_logout_redirect_uri=${encodeURIComponent(redirectUri)}`
    window.location.href = target
  }, [])

  return {
    ...state,
    login,
    logout,
    refresh: fetchPrincipal
  }
}
