import type { TableClient } from '@azure/data-tables'
import type { AuthenticatedUserInfo } from './auth'

export interface TripEditAccess {
  allowed: boolean
  isOwner: boolean
  isContributor: boolean
  meta?: Record<string, any>
}

/**
 * Returns whether the authenticated user is the owner of the trip
 * or a contributor — both roles may edit shared trip metadata such
 * as the trip photo.
 */
export async function checkTripEditAccess(
  client: TableClient,
  tripId: string,
  user: AuthenticatedUserInfo | null
): Promise<TripEditAccess> {
  if (!user) return { allowed: false, isOwner: false, isContributor: false }
  let meta: Record<string, any> | undefined
  try {
    meta = await client.getEntity<Record<string, any>>(tripId, 'meta')
  } catch (e: any) {
    if (e.statusCode !== 404) throw e
  }
  const isOwner = !!(meta && (meta as any).ownerId === user.id)
  if (isOwner) return { allowed: true, isOwner: true, isContributor: false, meta }
  let isContributor = false
  try {
    await client.getEntity(tripId, `contributor:${user.id}`)
    isContributor = true
  } catch (e: any) {
    if (e.statusCode !== 404) throw e
  }
  return { allowed: isContributor, isOwner: false, isContributor, meta }
}
