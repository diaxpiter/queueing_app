import {
  advanceClock,
  advanceTable,
  joinQueue,
  leaveQueue,
  markNoShow,
  seatGroup,
  setOrder,
  tick,
  warnGroup,
  type JoinInput,
} from '@/domain/actions'
import { emptyState, seedState } from '@/data/seed'
import { commit, replaceState, simNow } from '@/data/store'

/** Endereço mostrado nos links enviados ao cliente. */
const LINK_BASE =
  typeof window !== 'undefined' ? `${window.location.host}/fila` : 'holy.pt/fila'

/**
 * Operações que a interface chama. É a fronteira para um futuro backend:
 * cada função aqui vira uma chamada HTTP/WebSocket.
 */
export const api = {
  join: (input: JoinInput) =>
    commit((s, now) => joinQueue(s, input, now, LINK_BASE)),
  leave: (groupId: string) => commit((s, now) => leaveQueue(s, groupId, now)),
  warn: (groupId: string) => commit((s, now) => warnGroup(s, groupId, now)),
  noShow: (groupId: string) => commit((s, now) => markNoShow(s, groupId, now)),
  seat: (groupId: string) => commit((s, now) => seatGroup(s, groupId, now)),
  advanceTable: (tableId: string) =>
    commit((s, now) => advanceTable(s, tableId, now)),
  setOrder: (groupId: string, order: Record<string, number>, sent: boolean) =>
    commit((s) => setOrder(s, groupId, order, sent)),
  tick: () => commit((s, now) => ({ state: tick(s, now) })),

  // ferramentas de demonstração
  advanceClock: (minutes: number) =>
    commit((s) => advanceClock(s, minutes)),
  resetDemo: () => replaceState(seedState(Date.now())),
  clearAll: () => replaceState(emptyState(Date.now())),
}

/** Roda os avisos automáticos e a expiração das mesas guardadas. */
export function startTicker(): () => void {
  api.tick()
  const id = window.setInterval(() => api.tick(), 10_000)
  return () => window.clearInterval(id)
}

export { simNow }
