import { Info } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '@/data/api'
import { saveMyCode, useNow, useQueueState } from '@/data/hooks'
import { fmtTime, minutesLeft, roundWait } from '@/domain/format'
import {
  activeQueue,
  estimateWaits,
  fairnessInfo,
  heldTableFor,
  isActive,
  positionOf,
  SOON_MIN,
} from '@/domain/queue'
import { t } from '@/i18n/customer'
import { cn } from '@/lib/utils'
import { ordinal } from '@/i18n/ordinal'
import { BottomNav, Brand, PhoneShell } from './PhoneShell'

export function TicketScreen() {
  const { code } = useParams()
  const navigate = useNavigate()
  const s = useQueueState()
  const now = useNow()
  const [confirmLeave, setConfirmLeave] = useState(false)

  const g = s.groups.find((x) => x.code === code)
  if (!g) {
    return (
      <PhoneShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <Brand />
          <p className="text-muted-foreground">{t('PT', 'notFound')}</p>
          <Button asChild>
            <Link to="/fila?new">{t('PT', 'join')}</Link>
          </Button>
        </div>
      </PhoneShell>
    )
  }

  const lang = g.lang
  const T = (k: Parameters<typeof t>[1], p?: Record<string, string | number>) => t(lang, k, p)
  const nav = <BottomNav code={g.code} lang={lang} />

  const header = (
    <header className="flex items-center justify-between px-6 pt-7">
      <Brand size="sm" lang={lang} />
      <Badge variant="muted" className="rounded-full px-3 py-1.5 text-[10px]">
        {g.name} ·{' '}
        {g.people === 1 ? T('personOne') : T('people', { n: g.people })}
      </Badge>
    </header>
  )

  function rejoin() {
    saveMyCode(null)
    navigate('/fila?new')
  }

  if (g.status === 'seated') {
    return (
      <PhoneShell nav={nav}>
        {header}
        <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <h1 className="font-display text-4xl text-primary">{T('seatedTitle')}</h1>
          <p className="text-muted-foreground">{T('seatedBody')}</p>
        </main>
      </PhoneShell>
    )
  }

  if (!isActive(g)) {
    return (
      <PhoneShell nav={nav}>
        {header}
        <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <p className="text-lg">
            {g.status === 'left' ? T('endedLeft') : T('endedNoShow')}
          </p>
          <Button onClick={rejoin}>{T('joinAgain')}</Button>
        </main>
      </PhoneShell>
    )
  }

  const queue = activeQueue(s)
  const pos = positionOf(s, g)
  const wait = estimateWaits(s, now)[g.id]
  const fair = fairnessInfo(s, g)
  const held = heldTableFor(s, g.id)
  const notifyAt = wait == null ? null : now + Math.max(0, wait - SOON_MIN) * 60000
  const size = g.people === 6 ? '6+' : String(g.people)

  return (
    <PhoneShell nav={nav}>
      {header}
      <main className="flex flex-1 flex-col gap-5 px-6 pb-6 pt-6">
        {g.status === 'notified' && (
          <div
            role="status"
            className="rounded-sm border-2 border-primary bg-primary/10 p-4"
          >
            <div className="font-display text-2xl text-primary">{T('readyTitle')}</div>
            <p className="mt-1 text-[15px]">
              {held?.heldUntil
                ? T('readyHold', { min: minutesLeft(held.heldUntil, now) })
                : T('readyNoHold')}
            </p>
          </div>
        )}

        <div className="flex flex-col items-center gap-1 pt-2">
          <span className="font-label text-[10.5px] font-semibold uppercase tracking-[0.2em] text-dim">
            {T('yourPosition')}
          </span>
          <span
            className="font-display text-[96px] leading-none text-primary"
            data-testid="position"
          >
            {ordinal(lang, pos)}
          </span>
          <span className="text-sm text-muted-foreground">
            {queue.length === 1 ? T('ofOne') : T('ofMany', { n: queue.length })}
          </span>
        </div>

        <div className="flex gap-1.5" aria-hidden>
          {queue.map((q, i) => (
            <span
              key={q.id}
              className={cn(
                'h-[3px] flex-1 rounded-full',
                i < pos ? 'bg-primary' : 'bg-border',
              )}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 divide-x divide-border rounded-sm border border-border bg-card">
          <Info2 label={T('wait')} value={wait == null ? '—' : `~${roundWait(wait)} min`} />
          <Info2
            label={T('notifyAt')}
            value={
              notifyAt == null ? '—' : wait! <= SOON_MIN ? T('notifyNow') : fmtTime(notifyAt)
            }
          />
        </div>

        <section className="flex flex-col gap-2 rounded-sm border border-primary/40 bg-highlight p-4">
          <div className="flex items-center gap-2 font-label text-[10.5px] font-semibold uppercase tracking-[0.16em] text-primary">
            <Info className="size-3.5" />
            {T('whyTitle')}
          </div>
          <p className="text-[14.5px] leading-relaxed text-secondary-foreground">
            {T('whyBase', { size })}{' '}
            {fair.skipCount === 1
              ? T('skipOne', { seats: fair.skipSeats[0] })
              : fair.skipCount > 1
                ? T('skipMany', { n: fair.skipCount })
                : T('whyRule')}{' '}
            {fair.nextForClass && fair.classSeats && (
              <strong className="font-semibold text-foreground">
                {T('whyNext', { seats: fair.classSeats })}
              </strong>
            )}
          </p>
        </section>

        <div className="flex flex-col gap-2">
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to={`/fila/${g.code}/pedido`}>+ {T('drinkNow')}</Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="w-full">
            <Link to={`/fila/${g.code}/pedido`}>{T('seeMenu')}</Link>
          </Button>
        </div>

        <div className="mt-auto flex items-center justify-between pt-4 text-xs text-dim">
          <span>{T('address')}</span>
          <button
            type="button"
            onClick={() => setConfirmLeave(true)}
            className="underline underline-offset-2 hover:text-foreground"
          >
            {T('leave')}
          </button>
        </div>
      </main>

      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{T('leaveTitle')}</DialogTitle>
            <DialogDescription>{T('leaveBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{T('leaveCancel')}</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                api.leave(g.id)
                saveMyCode(null)
                setConfirmLeave(false)
              }}
            >
              {T('leaveConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PhoneShell>
  )
}

function Info2({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-3.5">
      <span className="font-label text-[10px] font-semibold uppercase tracking-[0.18em] text-dim">
        {label}
      </span>
      <span className="font-label text-2xl font-semibold">{value}</span>
    </div>
  )
}
