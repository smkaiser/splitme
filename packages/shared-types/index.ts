export interface Trip {
  id: string
  name: string
  slug: string
  createdAt: string
  ownerId?: string | null
  ownerName?: string | null
  ownerProvider?: string | null
  locked?: boolean
  role?: 'owner' | 'contributor' | null
  photoUpdatedAt?: string | null
}

export interface Participant {
  id: string
  name: string
}

export interface Expense {
  id: string
  date: string
  place: string
  amount: number
  description: string
  paidBy: string
  participants: string[]
  createdAt: string
  createdBy?: string | null
  lastEditedBy?: string | null
}

export interface Contributor {
  userId: string
  userName: string
  userProvider: string
  linkedParticipantId?: string | null
  joinedAt: string
}
