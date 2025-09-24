import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Participant } from '@/App'
// Removed currency handling UI; assume USD implicitly. Added responsive scrollable layout.

interface ParsedRow {
  index: number
  include: boolean
  amount: number | null
  date: string
  description: string
  warnings: string[]
}

interface ImportSpreadsheetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripSlug: string
  participants: Participant[]
  onImported: () => void
  createExpense: (e: { amount: number; date: string; place: string; description: string; paidBy: string; participants: string[] }) => Promise<any>
}

export function ImportSpreadsheetDialog({ open, onOpenChange, tripSlug, participants, onImported, createExpense }: ImportSpreadsheetDialogProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [paidBy, setPaidBy] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const allParticipantIds = participants.map(p => p.id)

  function reset() {
    setStep(1); setPaidBy(''); setFile(null); setRows([]); setError(null); setLoading(false); setImporting(false)
  }

  async function handleParse() {
    if (!file || !paidBy) { setError('Select payer and file'); return }
    setLoading(true); setError(null)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const base64 = bufferToBase64(new Uint8Array(arrayBuffer))
      const res = await fetch(`/api/trips/${encodeURIComponent(tripSlug)}/importSpreadsheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidBy, fileName: file.name, fileContentBase64: base64 })
      })
      if (!res.ok) throw new Error((await safeErr(res)))
      const data = await res.json()
      setRows(data.rows || [])
      setStep(2)
    } catch (e: any) {
      setError(e.message || 'Parse failed')
    } finally { setLoading(false) }
  }

  async function handleImport() {
    setImporting(true)
    setError(null)
    try {
      for (const r of rows) {
        if (!r.include) continue
        if (r.amount == null || r.amount <= 0) continue
        if (!r.description.trim()) continue
        await createExpense({
          amount: r.amount,
          date: r.date,
          place: '',
          description: r.description.trim(),
          paidBy,
          participants: allParticipantIds
        })
      }
      onImported()
      onOpenChange(false)
      setTimeout(() => reset(), 300)
    } catch (e: any) {
      setError(e.message || 'Import failed')
    } finally { setImporting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      {/* Mobile scroll fix: make the dialog itself scroll within viewport on small screens */}
      <DialogContent className="max-w-4xl w-[94vw] sm:w-auto max-h-[90vh] md:max-h-[85vh] flex flex-col overflow-auto">
        <DialogHeader>
          <DialogTitle>Import Spreadsheet</DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Upload a .csv or .xlsx file. All participants will be assigned to each expense.' : 'Review parsed rows and import selected expenses.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          // Wrap step 1 content in its own scroll region so tall forms don't overflow on short viewports
          <div className="space-y-6 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label>Payer (who paid all these)</Label>
              <select className="border rounded px-2 py-1 text-sm w-full" value={paidBy} onChange={e => setPaidBy(e.target.value)}>
                <option value="">Select participant</option>
                {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <Input type="file" accept=".csv,.xlsx" onChange={e => setFile(e.target.files?.[0] || null)} />
              {file && <p className="text-xs text-muted-foreground">{file.name} ({(file.size/1024).toFixed(1)} KB)</p>}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }}>Cancel</Button>
              <Button onClick={handleParse} disabled={loading || !file || !paidBy}>
                {loading ? 'Parsing…' : 'Parse'}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="flex flex-wrap gap-4 items-center text-sm">
              <div><span className="font-medium">Rows:</span> {rows.length}</div>
              <div><span className="font-medium">Valid:</span> {rows.filter(r => r.amount && r.description.trim()).length}</div>
              <div className="text-muted-foreground">Currency assumed USD ($)</div>
            </div>
            <div className="flex-1 min-h-0 border rounded overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted/40 text-left">
                    <th className="p-2">Include</th>
                    <th className="p-2">Date</th>
                    <th className="p-2">Description</th>
                    <th className="p-2 text-right">Amount ($)</th>
                    <th className="p-2">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const valid = r.amount && r.description.trim()
                    const descWarn = r.warnings.includes('missing-description') || r.warnings.includes('guessed-description') || !r.description.trim()
                    const amtWarn = r.warnings.includes('invalid-amount') || r.amount == null || r.amount <= 0
                    const dateWarn = r.warnings.includes('date-fallback')
                    return (
                      <tr key={r.index} className={!valid ? 'bg-amber-50' : ''}>
                        <td className="p-2 align-top"><input type="checkbox" checked={r.include} onChange={e => setRows(rs => rs.map(x => x.index === r.index ? { ...x, include: e.target.checked } : x))} /></td>
                        <td className="p-2 align-top w-[110px]">
                          <Input
                            type="date"
                            className={`h-8 ${dateWarn ? 'border-amber-400 focus-visible:ring-amber-400' : ''}`}
                            value={r.date}
                            onChange={e => setRows(rs => rs.map(x => x.index === r.index ? { ...x, date: e.target.value } : x))}
                          />
                        </td>
                        <td className="p-2 align-top min-w-[200px]">
                          <Input
                            value={r.description}
                            className={`h-8 ${descWarn ? 'border-amber-400 focus-visible:ring-amber-400' : ''}`}
                            onChange={e => setRows(rs => rs.map(x => x.index === r.index ? { ...x, description: e.target.value } : x))}
                          />
                        </td>
                        <td className="p-2 align-top w-[120px]">
                          <Input
                            type="number"
                            step="0.01"
                            className={`h-8 text-right ${amtWarn ? 'border-amber-400 focus-visible:ring-amber-400' : ''}`}
                            value={r.amount ?? ''}
                            onChange={e => setRows(rs => rs.map(x => x.index === r.index ? { ...x, amount: Number(e.target.value) } : x))}
                          />
                        </td>
                        <td className="p-2 align-top w-[160px]">
                          {r.warnings.length > 0 && (
                            <div className="flex flex-col gap-1">
                              {r.warnings.map((w,i) => <span key={i} className="text-[10px] rounded bg-amber-200 text-amber-900 px-1 py-0.5 inline-block">{w}</span>)}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {error && <p className="text-sm text-destructive -mt-2">{error}</p>}
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setStep(1)} disabled={importing}>Back</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }} disabled={importing}>Cancel</Button>
                <Button onClick={handleImport} disabled={importing || rows.length === 0}>{importing ? 'Importing…' : 'Import Selected'}</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function bufferToBase64(buf: Uint8Array) {
  let binary = ''
  for (let i=0;i<buf.length;i++) binary += String.fromCharCode(buf[i])
  return btoa(binary)
}

async function safeErr(res: Response) {
  try { const j = await res.json(); return j.error || JSON.stringify(j) } catch { return res.statusText }
}
