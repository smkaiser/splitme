export interface Trip {
  id: string
  name: string
  slug: string
  createdAt: string
  ownerId?: string | null
  ownerName?: string | null
  ownerProvider?: string | null
  locked?: boolean
}

export type TripKV = Trip[];
