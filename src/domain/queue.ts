import { fmtTime, minutesSince } from './format'
import {
  expectedFreeInMin,
  forecast,
  HORIZON_MIN,
  typicalMinutes,
} from './tableModel'
import type { Group, QueueState, Table } from './types'

/** Aviso "faltam ~10 min" dispara quando a espera estimada chega a este valor. */
export const SOON_MIN = 10
/** Tempo que a mesa fica guardada depois do aviso "mesa pronta". */
export const HOLD_MIN = 5
/** A partir daqui o grupo ganha a marca "trava de justiça ativa". */
export const FAIRNESS_LOCK_MIN = 40

export function isActive(g: Group): boolean {
  return g.status === 'waiting' || g.status === 'notified'
}

/** Fila ativa em ordem de chegada. */
export function activeQueue(s: QueueState): Group[] {
  return s.groups.filter(isActive).sort((a, b) => a.joinedAt - b.joinedAt)
}

export function heldTableFor(s: QueueState, groupId: string): Table | undefined {
  return s.tables.find((t) => t.state === 'segurada' && t.heldFor === groupId)
}

/** Menor mesa em que o grupo cabe (a "classe" de mesa dele). */
export function tableClass(people: number, tables: Table[]): number | null {
  const fits = tables.filter((t) => t.seats >= people).map((t) => t.seats)
  return fits.length ? Math.min(...fits) : null
}

interface Slot {
  seats: number
  free: number
  heldFor: string | null
}

/**
 * Estimativa de espera, em minutos, para cada grupo ativo (null = nenhuma mesa serve).
 * Simula a fila em ordem: cada grupo pega a mesa em que cabe e que vaga primeiro,
 * e essa mesa só volta a vagar depois de mais um ciclo típico.
 * `extra` simula um grupo que ainda não entrou (usado na tela de entrada).
 */
export function estimateWaits(
  s: QueueState,
  now: number,
  extra?: { people: number },
): Record<string, number | null> {
  const queue = activeQueue(s)
  const slots: Slot[] = s.tables.map((t) => ({
    seats: t.seats,
    free: expectedFreeInMin(t, now),
    heldFor: t.heldFor,
  }))
  const out: Record<string, number | null> = {}

  // grupos já avisados têm mesa guardada: espera 0
  for (const g of queue) {
    if (g.status !== 'notified') continue
    const held = heldTableFor(s, g.id)
    if (!held) continue
    const slot = slots.find((x) => x.heldFor === g.id)
    if (slot) {
      out[g.id] = 0
      slot.free = typicalMinutes(slot.seats)
      slot.heldFor = null
    }
  }

  const items: { id: string; people: number }[] = queue
    .filter((g) => out[g.id] === undefined)
    .map((g) => ({ id: g.id, people: g.people }))
  if (extra) items.push({ id: '__new', people: extra.people })

  for (const it of items) {
    const cands = slots.filter((x) => x.seats >= it.people && !x.heldFor)
    if (!cands.length) {
      out[it.id] = null
      continue
    }
    cands.sort((a, b) => a.free - b.free || a.seats - b.seats)
    const pick = cands[0]
    out[it.id] = pick.free
    pick.free += typicalMinutes(pick.seats)
  }
  return out
}

export function estimateJoinWait(
  s: QueueState,
  people: number,
  now: number,
): number | null {
  return estimateWaits(s, now, { people }).__new ?? null
}

export function positionOf(s: QueueState, g: Group): number {
  return activeQueue(s).findIndex((x) => x.id === g.id) + 1
}

export interface FairnessInfo {
  /** Quantas mesas vagaram e foram para grupos menores enquanto este grupo esperava. */
  skipCount: number
  skipSeats: number[]
  classSeats: number | null
  /** Ninguém à frente disputa a mesma classe de mesa. */
  nextForClass: boolean
}

export function fairnessInfo(s: QueueState, g: Group): FairnessInfo {
  const mine = s.skips.filter((k) => k.skippedGroupIds.includes(g.id))
  const cls = tableClass(g.people, s.tables)
  const ahead = activeQueue(s).filter((x) => x.joinedAt < g.joinedAt)
  return {
    skipCount: mine.length,
    skipSeats: [...new Set(mine.map((k) => k.tableSeats))],
    classSeats: cls,
    nextForClass:
      cls !== null && !ahead.some((x) => tableClass(x.people, s.tables) === cls),
  }
}

export interface SeatOption {
  table: Table | null
  reason: string | null
}

/**
 * Em que mesa este grupo pode sentar agora?
 * Regra da v0: a mesa guardada para ele; senão a menor mesa livre em que ele cabe,
 * desde que ninguém à frente (sem mesa própria) também caiba nela.
 */
export function seatOptions(s: QueueState, g: Group): SeatOption {
  const held = heldTableFor(s, g.id)
  if (held) return { table: held, reason: null }

  const free = s.tables
    .filter((t) => t.state === 'livre' && t.seats >= g.people)
    .sort((a, b) => a.seats - b.seats)
  if (!free.length)
    return { table: null, reason: 'Nenhuma mesa livre serve este grupo' }

  const ahead = activeQueue(s).filter(
    (x) => x.joinedAt < g.joinedAt && !heldTableFor(s, x.id),
  )
  for (const t of free) {
    if (!ahead.some((x) => x.people <= t.seats)) return { table: t, reason: null }
  }
  const t = free[0]
  const blocker = ahead.find((x) => x.people <= t.seats)!
  return {
    table: null,
    reason: `${blocker.name} (${blocker.people}) está à frente e cabe na ${t.name}`,
  }
}

/** Texto do quadro "Próximo encaixe sugerido" do painel da porta. */
export function nextFit(s: QueueState, now: number): string {
  const first = activeQueue(s)[0]
  if (!first)
    return 'Sem ninguém à espera. A próxima mesa que vagar fica livre para quem chegar.'

  const held = heldTableFor(s, first.id)
  const free = s.tables.filter((t) => t.state === 'livre')
  const fit = held ?? free.find((t) => t.seats >= first.people)
  if (fit)
    return `${fit.name} está ${held ? 'guardada' : 'livre'} e serve ${first.name} (${first.people}). Sentar agora.`

  let best: Table | null = null
  let bestPct = -1
  for (const t of s.tables) {
    if (t.seats < first.people || t.state === 'livre' || t.state === 'segurada')
      continue
    const f = forecast(t, now)
    if (f.pct > bestPct) {
      bestPct = f.pct
      best = t
    }
  }
  const blocked = free.length
    ? `${free[0].name} vagou mas serve só ${free[0].seats} — não dá para ${first.name} (${first.people}). `
    : ''
  return (
    blocked +
    (best
      ? `${best.name} é a candidata: ${bestPct}% de vagar até ${fmtTime(now + HORIZON_MIN * 60000)}. Nada garantido até ela sair.`
      : 'Nenhuma mesa desse tamanho está perto de vagar. Considerar o balcão para os grupos pequenos.')
  )
}

export interface Stats {
  groups: number
  people: number
  avgWait: number
  maxWait: number
  freeTables: number
  heldTables: number
  gaveUp: number
  gaveUpPeople: number
  seated: number
}

export function stats(s: QueueState, now: number): Stats {
  const q = activeQueue(s)
  const waits = q.map((g) => minutesSince(g.joinedAt, now))
  const gone = s.groups.filter((g) => g.status === 'noshow' || g.status === 'left')
  return {
    groups: q.length,
    people: q.reduce((n, g) => n + g.people, 0),
    avgWait: waits.length
      ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length)
      : 0,
    maxWait: waits.length ? Math.max(...waits) : 0,
    freeTables: s.tables.filter((t) => t.state === 'livre').length,
    heldTables: s.tables.filter((t) => t.state === 'segurada').length,
    gaveUp: s.baseline.gaveUp + gone.length,
    gaveUpPeople: s.baseline.gaveUpPeople + gone.reduce((n, g) => n + g.people, 0),
    seated: s.baseline.seated + s.groups.filter((g) => g.status === 'seated').length,
  }
}
