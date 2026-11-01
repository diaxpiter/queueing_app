import type { Group, Lang, QueueState, Table } from '@/domain/types'

const MIN = 60000

/** Estado de demonstração igual ao mockup do iPad: 6 grupos na fila, 6 mesas. */
export function seedState(now: number): QueueState {
  const mk = (
    id: string,
    code: string,
    name: string,
    people: number,
    waitedMin: number,
    lang: Lang = 'PT',
    extra: Partial<Group> = {},
  ): Group => ({
    id,
    code,
    name,
    people,
    phone: '',
    lang,
    source: 'app',
    status: 'waiting',
    joinedAt: now - waitedMin * MIN,
    order: {},
    orderSent: false,
    ...extra,
  })

  const groups: Group[] = [
    mk('g-sophie', 'SOPH', 'Sophie', 5, 51, 'EN', { soonSentAt: now - 10 * MIN }),
    mk('g-tiago', 'TIAG', 'Tiago', 2, 44),
    mk('g-marina', 'MARI', 'Marina', 4, 28),
    mk('g-kiarash', 'KIAR', 'Kiarash', 2, 21, 'EN'),
    mk('g-ana', 'ANAA', 'Ana', 3, 16),
    mk('g-helena', 'HELE', 'Helena', 2, 9),
  ]

  const table = (
    id: string,
    name: string,
    seats: number,
    state: Table['state'],
    elapsedMin: number,
    stateAgoMin = elapsedMin,
  ): Table => ({
    id,
    name,
    seats,
    state,
    stateSince: now - stateAgoMin * MIN,
    occupiedSince: now - elapsedMin * MIN,
    groupId: null,
    heldFor: null,
    heldUntil: null,
  })

  const tables: Table[] = [
    table('t1', 'Mesa 1', 2, 'ocupada', 34),
    table('t2', 'Mesa 2', 2, 'ocupada', 12),
    table('t3', 'Mesa 3', 5, 'conta', 58, 4),
    table('t4', 'Mesa 4', 4, 'ocupada', 51),
    table('t5', 'Mesa 5', 4, 'ocupada', 8),
    table('t6', 'Balcão', 8, 'ocupada', 22),
  ]

  return {
    version: 1,
    groups,
    tables,
    messages: [],
    skips: [],
    clockOffsetMs: 0,
    baseline: { seated: 38, gaveUp: 7, gaveUpPeople: 19 },
  }
}

/** Salão vazio: todas as mesas livres e nenhuma fila. Útil para testar do zero. */
export function emptyState(now: number): QueueState {
  const s = seedState(now)
  return {
    ...s,
    groups: [],
    tables: s.tables.map((t) => ({
      ...t,
      state: 'livre',
      stateSince: now,
      occupiedSince: null,
    })),
    baseline: { seated: 0, gaveUp: 0, gaveUpPeople: 0 },
  }
}
