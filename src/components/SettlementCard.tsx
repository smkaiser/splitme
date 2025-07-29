import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight } from '@phosphor-icons/react'
import { Settlement } from '@/lib/settlements'
import { useKV } from '@github/spark/hooks'
import { Participant } from '@/App'

interface SettlementCardProps {
  settlement: Settlement
}

export function SettlementCard({ settlement }: SettlementCardProps) {
  const [participants] = useKV<Participant[]>('participants', [])
  
  const fromParticipant = participants.find(p => p.id === settlement.from)
  const toParticipant = participants.find(p => p.id === settlement.to)

  return (
    <Card className="bg-card/50 border-accent/20">
      <CardContent className="py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="font-semibold text-foreground">
                {fromParticipant?.name || 'Unknown'}
              </div>
              <div className="text-sm text-muted-foreground">owes</div>
            </div>
            
            <ArrowRight className="w-6 h-6 text-accent" />
            
            <div className="text-center">
              <div className="font-semibold text-foreground">
                {toParticipant?.name || 'Unknown'}
              </div>
              <div className="text-sm text-muted-foreground">receives</div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-accent">
              ${settlement.amount.toFixed(2)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}