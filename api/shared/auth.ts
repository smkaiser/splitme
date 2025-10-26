import type { HttpRequest } from '@azure/functions'

export interface ClientPrincipalClaim {
  typ: string
  val: string
}

export interface ClientPrincipal {
  userId: string
  userDetails: string
  identityProvider: string
  claims: ClientPrincipalClaim[]
  roles: string[]
  userRoles?: string[]
}

export function getClientPrincipal(req: HttpRequest): ClientPrincipal | null {
  const header = req.headers.get('x-ms-client-principal')
  if (!header) return null
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf8')
    if (!decoded) return null
    const parsed = JSON.parse(decoded) as ClientPrincipal
    if (!parsed) return null
    // normalise defaults
    const rolesSource = Array.isArray(parsed.roles)
      ? parsed.roles
      : Array.isArray(parsed.userRoles)
        ? parsed.userRoles
        : []
    const claims = Array.isArray(parsed.claims) ? parsed.claims : []
    return {
      ...parsed,
      roles: rolesSource,
      claims
    }
  } catch {
    return null
  }
}

export function isAuthenticated(principal: ClientPrincipal | null | undefined) {
  if (!principal) return false
  return Array.isArray(principal.roles) && principal.roles.includes('authenticated')
}

export interface AuthenticatedUserInfo {
  id: string
  name: string
  provider: string
}

export function getAuthenticatedUser(principal: ClientPrincipal | null): AuthenticatedUserInfo | null {
  if (!isAuthenticated(principal)) return null
  const nameClaim = principal?.claims?.find(c => c.typ === 'name')?.val
  const displayName = nameClaim || principal?.userDetails || 'User'
  return {
    id: principal!.userId,
    name: displayName,
    provider: principal!.identityProvider || 'unknown'
  }
}
