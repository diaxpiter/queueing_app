import { roundWait } from './format'
import {
  activeQueue,
  estimateWaits,
  HOLD_MIN,
  isActive,
  positionOf,
  seatOptions,
  SOON_MIN,
} from './queue'
import type {
  Group,
  Lang,
  MessageKind,
  QueueState,
  Result,
  Table,
  TableState,
} from './types'
import { buildMessage } from '@/i18n/messages'

/**
 * Todas as mudanças de estado são funções puras: (estado, ...args, agora) -> Result.
 * Nada aqui toca em localStorage ou React. É isto que depois migra para o backend.
 */

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
}

function newCode(s: QueueState): string {
  for (;;) {
    let c = ''
    for (let i = 0; i < 4; i++)
      c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
    if (!s.groups.some((g) => g.code === c)) return c
  }
}

function withMessage(
  s: QueueState,
  g: Group,
  kind: MessageKind,
  now: number,
  params: { pos?: number; wait?: number; link?: string } = {},
): QueueState {
  if (!g.phone) return s // sem WhatsApp (cliente da porta): não há a quem enviar
  return {
    ...s,
    messages: [
      ...s.messages,
      {
        id: newId(),
        groupId: g.id,
        kind,
        lang: g.lang,
        text: buildMessage(kind, g.lang, params),
        at: now,
      },
    ],
  }
}

function patchGroup(s: QueueState, id: string, patch: Partial<Group>): QueueState {
  return { ...s, groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) }
}

function patchTable(s: QueueState, id: string, patch: Partial<Table>): QueueState {
  return { ...s, tables: s.tables.map((t) => (t.id === id ? { ...t, ...patch } : t)) }
}

function releaseHeld(s: QueueState, groupId: string, now: number): QueueState {
  return {
    ...s,
    tables: s.tables.map((t) =>
      t.state === 'segurada' && t.heldFor === groupId
        ? { ...t, state: 'livre', heldFor: null, heldUntil: null, stateSince: now }
        : t,
    ),
  }
}

export interface JoinInput {
  name: string
  people: number
  phone: string
  lang: Lang
  source: 'app' | 'door'
}

export function joinQueue(
  s: QueueState,
  input: JoinInput,
  now: number,
  linkBase: string,
): Result<Group> {
  const name = input.name.trim()
  if (!name) return { state: s, error: 'Nome obrigatório' }
  if (input.people < 1) return { state: s, error: 'Número de pessoas inválido' }

  const g: Group = {
    id: newId(),
    code: newCode(s),
    name,
    people: input.people,
    phone: input.phone.trim(),
    lang: input.lang,
    source: input.source,
    status: 'waiting',
    joinedAt: now,
    order: {},
    orderSent: false,
  }
  let next: QueueState = { ...s, groups: [...s.groups, g] }
  const wait = estimateWaits(next, now)[g.id]
  next = withMessage(next, g, 'joined', now, {
    pos: positionOf(next, g),
    wait: wait == null ? 0 : roundWait(wait),
    link: `${linkBase}/${g.code}`,
  })
  return { state: next, value: g }
}

/** Botão "Avisar": manda "mesa pronta" e guarda uma mesa por HOLD_MIN minutos, se houver. */
export function warnGroup(s: QueueState, groupId: string, now: number): Result {
  const g = s.groups.find((x) => x.id === groupId)
  if (!g || !isActive(g)) return { state: s, error: 'Grupo não está na fila' }
  if (g.notifiedAt) return { state: s, error: 'Grupo já foi avisado' }

  let next = s
  const { table } = seatOptions(s, g)
  if (table && table.state === 'livre') {
    next = patchTable(next, table.id, {
      state: 'segurada',
      heldFor: g.id,
      heldUntil: now + HOLD_MIN * 60000,
      stateSince: now,
    })
  }
  next = patchGroup(next, g.id, { status: 'notified', notifiedAt: now })
  next = withMessage(next, g, 'ready', now)
  return { state: next }
}

function endGroup(
  s: QueueState,
  groupId: string,
  status: 'noshow' | 'left',
  now: number,
): Result {
  const g = s.groups.find((x) => x.id === groupId)
  if (!g || !isActive(g)) return { state: s, error: 'Grupo não está na fila' }
  let next = releaseHeld(s, groupId, now)
  next = patchGroup(next, groupId, { status, endedAt: now })
  return { state: next }
}

export const markNoShow = (s: QueueState, id: string, now: number) =>
  endGroup(s, id, 'noshow', now)

export const leaveQueue = (s: QueueState, id: string, now: number) =>
  endGroup(s, id, 'left', now)

export function seatGroup(s: QueueState, groupId: string, now: number): Result<Table> {
  const g = s.groups.find((x) => x.id === groupId)
  if (!g || !isActive(g)) return { state: s, error: 'Grupo não está na fila' }
  const { table, reason } = seatOptions(s, g)
  if (!table) return { state: s, error: reason ?? 'Sem mesa disponível' }

  // quem estava à frente e não cabia nesta mesa foi "ultrapassado": guardamos para explicar ao cliente
  const skipped = activeQueue(s)
    .filter((x) => x.joinedAt < g.joinedAt && x.people > table.seats)
    .map((x) => x.id)

  let next = patchTable(s, table.id, {
    state: 'ocupada',
    stateSince: now,
    occupiedSince: now,
    groupId: g.id,
    heldFor: null,
    heldUntil: null,
  })
  next = patchGroup(next, g.id, {
    status: 'seated',
    seatedAt: now,
    endedAt: now,
    tableId: table.id,
  })
  if (skipped.length) {
    next = {
      ...next,
      skips: [
        ...next.skips,
        { id: newId(), at: now, seatedGroupId: g.id, tableSeats: table.seats, skippedGroupIds: skipped },
      ],
    }
  }
  return { state: next, value: { ...table, state: 'ocupada' } }
}

const NEXT_STATE: Record<TableState, TableState> = {
  ocupada: 'conta',
  conta: 'limpar',
  limpar: 'livre',
  livre: 'segurada',
  segurada: 'livre',
}

/** Botão da mesa no salão: ocupada → conta → limpar → livre → segurada → livre. */
export function advanceTable(s: QueueState, tableId: string, now: number): Result {
  const t = s.tables.find((x) => x.id === tableId)
  if (!t) return { state: s, error: 'Mesa não existe' }
  const to = NEXT_STATE[t.state]
  const patch: Partial<Table> = { state: to, stateSince: now }
  if (to === 'livre') {
    Object.assign(patch, { occupiedSince: null, groupId: null, heldFor: null, heldUntil: null })
  }
  if (to === 'segurada') Object.assign(patch, { heldFor: null, heldUntil: null })
  return { state: patchTable(s, tableId, patch) }
}

export function setOrder(
  s: QueueState,
  groupId: string,
  order: Record<string, number>,
  sent: boolean,
): Result {
  const clean = Object.fromEntries(Object.entries(order).filter(([, q]) => q > 0))
  return { state: patchGroup(s, groupId, { order: clean, orderSent: sent }) }
}

/** Passo do relógio: libera mesas seguradas que expiraram e dispara "faltam ~10 min". */
export function tick(s: QueueState, now: number): QueueState {
  let next = s

  for (const t of s.tables) {
    if (t.state === 'segurada' && t.heldUntil != null && t.heldUntil <= now) {
      next = patchTable(next, t.id, {
        state: 'livre',
        heldFor: null,
        heldUntil: null,
        stateSince: now,
      })
    }
  }

  const waits = estimateWaits(next, now)
  for (const g of activeQueue(next)) {
    const w = waits[g.id]
    if (g.status === 'waiting' && !g.soonSentAt && w != null && w <= SOON_MIN) {
      next = patchGroup(next, g.id, { soonSentAt: now })
      next = withMessage(next, g, 'soon', now)
    }
  }
  return next
}

export function advanceClock(s: QueueState, minutes: number): Result {
  return { state: { ...s, clockOffsetMs: s.clockOffsetMs + minutes * 60000 } }
}
