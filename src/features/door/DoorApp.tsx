import { Minus, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/data/api'
import { useNow, useQueueState } from '@/data/hooks'
import { fmtDate, fmtTime, minutesLeft, minutesSince } from '@/domain/format'
import { orderCount } from '@/domain/menu'
import {
  activeQueue,
  FAIRNESS_LOCK_MIN,
  heldTableFor,
  nextFit,
  seatOptions,
  stats,
} from '@/domain/queue'
import { forecast, HORIZON_MIN, type Tone } from '@/domain/tableModel'
import type { Group, QueueState, Table, TableState } from '@/domain/types'
import { cn } from '@/lib/utils'

const STATE_LABEL: Record<TableState, string> = {
  ocupada: 'ocupada',
  conta: 'conta pedida',
  limpar: 'a limpar',
  livre: 'livre',
  segurada: 'segurada',
}
const STATE_DOT: Record<TableState, string> = {
  ocupada: 'bg-copper',
  conta: 'bg-primary',
  limpar: 'bg-info',
  livre: 'bg-success',
  segurada: 'bg-primary',
}
const STATE_TEXT: Record<TableState, string> = {
  ocupada: 'text-copper',
  conta: 'text-primary',
  limpar: 'text-info',
  livre: 'text-success',
  segurada: 'text-primary',
}
const TABLE_BTN: Record<TableState, string> = {
  ocupada: 'Conta',
  conta: 'Saiu',
  limpar: 'Pronta',
  livre: 'Segurar',
  segurada: 'Soltar',
}
const TONE_BAR: Record<Tone, string> = {
  free: 'bg-success',
  held: 'bg-primary',
  clean: 'bg-info',
  bill: 'bg-primary',
  busy: 'bg-primary',
  calm: 'bg-dim',
}
const TONE_TEXT: Record<Tone, string> = {
  free: 'text-success',
  held: 'text-primary',
  clean: 'text-info',
  bill: 'text-primary',
  busy: 'text-primary',
  calm: 'text-dim',
}

export function DoorApp() {
  const s = useQueueState()
  const now = useNow()
  const st = stats(s, now)
  const queue = activeQueue(s)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1280px] flex-col gap-4 p-5">
      <header className="flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-[26px] leading-none">HOLY</span>
          <span className="font-label text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Porta
          </span>
        </div>
        <div className="flex items-baseline gap-4">
          <span className="text-sm text-muted-foreground">{fmtDate(now)}</span>
          <span className="font-label text-[26px] font-semibold leading-none" data-testid="clock">
            {fmtTime(now)}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Na fila" value={st.groups} unit={`grupos · ${st.people} pess.`} />
        <Stat label="Espera média" value={st.avgWait} unit={`min · maior ${st.maxWait}`} />
        <Stat
          label="Mesas livres"
          value={st.freeTables}
          unit={`de ${s.tables.length} · ${st.heldTables} segurada(s)`}
        />
        <Stat
          label="Desistiram hoje"
          value={st.gaveUp}
          unit={`grupos · ${st.gaveUpPeople} pess.`}
          accent
        />
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1.45fr_1fr]">
        <section className="flex flex-col overflow-hidden rounded-sm border border-border bg-card">
          <div className="grid grid-cols-[30px_minmax(0,1fr)_40px_76px_232px] gap-3 border-b border-border px-4 py-2.5 font-label text-[10px] font-semibold uppercase tracking-[0.18em] text-dim">
            <span>Pos</span>
            <span>Nome</span>
            <span>Pess.</span>
            <span>Esperando</span>
            <span className="text-right">Ação</span>
          </div>

          <div className="flex-1" data-testid="queue-list">
            {queue.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Ninguém na fila agora.
              </p>
            )}
            {queue.map((g, i) => (
              <QueueRow key={g.id} s={s} g={g} pos={i + 1} now={now} />
            ))}
          </div>

          <div className="border-t border-border p-3">
            <WalkInDialog />
          </div>
        </section>

        <section className="flex flex-col overflow-hidden rounded-sm border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5 font-label text-[10px] font-semibold uppercase tracking-[0.18em] text-dim">
            <span>Salão</span>
            <span>Prob. de vagar até {fmtTime(now + HORIZON_MIN * 60000)}</span>
          </div>
          <div className="flex-1">
            {s.tables.map((t) => (
              <TableRow key={t.id} s={s} t={t} now={now} />
            ))}
          </div>
          <div className="flex flex-col gap-1.5 border-t border-border p-4">
            <span className="font-label text-[10px] font-semibold uppercase tracking-[0.18em] text-copper">
              Próximo encaixe sugerido
            </span>
            <p className="text-[13.5px] leading-snug text-secondary-foreground" data-testid="next-fit">
              {nextFit(s, now)}
            </p>
          </div>
        </section>
      </div>

      <DemoTools />
    </div>
  )
}

function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string
  value: number
  unit: string
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-sm border bg-card px-4 py-3',
        accent ? 'border-primary/40' : 'border-border',
      )}
    >
      <span className="font-label text-[10px] font-semibold uppercase tracking-[0.18em] text-dim">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            'font-label text-[26px] font-semibold leading-none',
            accent && 'text-primary',
          )}
        >
          {value}
        </span>
        <span className={cn('text-[12.5px]', accent ? 'text-copper' : 'text-dim')}>{unit}</span>
      </div>
    </div>
  )
}

function QueueRow({ s, g, pos, now }: { s: QueueState; g: Group; pos: number; now: number }) {
  const waited = minutesSince(g.joinedAt, now)
  const opt = seatOptions(s, g)
  const held = heldTableFor(s, g.id)
  const first = pos === 1
  const items = orderCount(g.order)

  const notes: { text: string; cls: string }[] = []
  if (g.notifiedAt) {
    notes.push({
      text: held?.heldUntil
        ? `mesa pronta às ${fmtTime(g.notifiedAt)} · ${held.name} guardada mais ${minutesLeft(held.heldUntil, now)} min`
        : `avisada às ${fmtTime(g.notifiedAt)}`,
      cls: 'text-copper',
    })
  } else if (g.soonSentAt) {
    notes.push({ text: `avisada às ${fmtTime(g.soonSentAt)} (10 min)`, cls: 'text-copper' })
  }
  if (!first && waited >= FAIRNESS_LOCK_MIN)
    notes.push({ text: 'trava de justiça ativa', cls: 'text-[#8c7a5e]' })
  if (items > 0 && g.orderSent)
    notes.push({ text: `pedido pronto · ${items} ${items === 1 ? 'item' : 'itens'}`, cls: 'text-success' })

  return (
    <div
      className={cn(
        'grid grid-cols-[30px_minmax(0,1fr)_40px_76px_232px] items-center gap-3 border-b border-border/60 px-4 py-2.5',
        first && 'bg-highlight',
      )}
      data-testid={`row-${g.name}`}
    >
      <span className={cn('font-label text-base font-semibold', first ? 'text-primary' : 'text-dim')}>
        {pos}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className={cn('flex items-center gap-2 text-[15px]', first && 'font-semibold')}>
          <span className="truncate">{g.name}</span>
          {g.source === 'door' && (
            <Badge variant="muted" className="px-1.5 py-0 text-[9px]">
              porta
            </Badge>
          )}
        </span>
        {notes.map((n) => (
          <span key={n.text} className={cn('text-[11.5px]', n.cls)}>
            {n.text}
          </span>
        ))}
      </div>
      <span className="text-[14.5px] text-secondary-foreground">{g.people}</span>
      <span className="font-label text-[14.5px] text-secondary-foreground">{waited} min</span>
      <div className="flex justify-end gap-1.5">
        {!g.notifiedAt && (
          <Button variant="secondary" size="sm" onClick={() => api.warn(g.id)}>
            Avisar
          </Button>
        )}
        {(first || opt.table) && (
          <Button
            size="sm"
            disabled={!opt.table}
            title={opt.reason ?? undefined}
            onClick={() => api.seat(g.id)}
          >
            Sentar
          </Button>
        )}
        {(first || g.notifiedAt) && (
          <Button variant="secondary" size="sm" className="text-muted-foreground" onClick={() => api.noShow(g.id)}>
            Não veio
          </Button>
        )}
      </div>
    </div>
  )
}

function TableRow({ s, t, now }: { s: QueueState; t: Table; now: number }) {
  const f = forecast(t, now)
  const hot = t.state === 'conta' || t.state === 'livre' || t.state === 'segurada'
  const heldGroup = t.heldFor ? s.groups.find((g) => g.id === t.heldFor) : undefined
  const sub =
    t.state === 'segurada' && heldGroup && t.heldUntil
      ? `guardada para ${heldGroup.name} · mais ${minutesLeft(t.heldUntil, now)} min`
      : f.sub

  return (
    <div
      className={cn('flex flex-col gap-1.5 border-b border-border/60 px-4 py-2.5', hot && 'bg-highlight')}
      data-testid={`table-${t.name}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={cn('size-[7px] shrink-0 rounded-full', STATE_DOT[t.state])} />
          <span className={cn('whitespace-nowrap text-[14.5px]', hot && 'font-semibold')}>
            {t.name} · {t.seats} lug.
          </span>
          <span
            className={cn(
              'whitespace-nowrap font-label text-[10px] font-semibold uppercase tracking-[0.1em]',
              STATE_TEXT[t.state],
            )}
          >
            {STATE_LABEL[t.state]}
          </span>
        </div>
        <Button
          size="sm"
          variant={t.state === 'conta' ? 'default' : 'secondary'}
          className="h-7 px-2.5 text-[10.5px]"
          onClick={() => api.advanceTable(t.id)}
        >
          {TABLE_BTN[t.state]}
        </Button>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="h-[3px] w-14 shrink-0 overflow-hidden rounded-full bg-border">
          <div className={cn('h-full', TONE_BAR[f.tone])} style={{ width: `${f.pct}%` }} />
        </div>
        <span className={cn('min-w-[34px] font-label text-[11px] font-semibold', TONE_TEXT[f.tone])}>
          {f.prob}
        </span>
        <span className="truncate text-[11.5px] text-dim">{sub}</span>
      </div>
    </div>
  )
}

function WalkInDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [people, setPeople] = useState(2)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const res = api.join({
      name: name.trim() || 'Sem nome',
      people,
      phone: '',
      lang: 'PT',
      source: 'door',
    })
    if (!res.error) {
      setName('')
      setPeople(2)
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex h-11 w-full items-center justify-center gap-2.5 rounded-sm border border-dashed border-[#4a443c] font-label text-[12.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:border-primary hover:text-primary"
        >
          <Plus className="size-4" /> Adicionar grupo na porta
        </button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Novo grupo</DialogTitle>
            <DialogDescription>
              Para quem chegou sem celular. Entra no fim da fila.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="walkin-name">Nome</Label>
            <Input
              id="walkin-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do grupo"
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Pessoas</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Menos uma pessoa"
                onClick={() => setPeople((p) => Math.max(1, p - 1))}
              >
                <Minus />
              </Button>
              <span className="w-8 text-center font-label text-2xl font-semibold" data-testid="walkin-people">
                {people}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Mais uma pessoa"
                onClick={() => setPeople((p) => Math.min(12, p + 1))}
              >
                <Plus />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Adicionar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DemoTools() {
  return (
    <footer className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <span className="mr-1 font-label text-[10px] font-semibold uppercase tracking-[0.18em] text-dim">
        Demo
      </span>
      <Button variant="ghost" size="sm" onClick={() => api.advanceClock(10)}>
        +10 min
      </Button>
      <Button variant="ghost" size="sm" onClick={() => api.advanceClock(30)}>
        +30 min
      </Button>
      <Button variant="ghost" size="sm" onClick={() => api.resetDemo()}>
        <RotateCcw /> Reiniciar demo
      </Button>
      <Button variant="ghost" size="sm" onClick={() => api.clearAll()}>
        <Trash2 /> Salão vazio
      </Button>
    </footer>
  )
}
