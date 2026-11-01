export type Lang = 'PT' | 'EN' | 'ES' | 'FR'
export const LANGS: Lang[] = ['PT', 'EN', 'ES', 'FR']

export type GroupStatus = 'waiting' | 'notified' | 'seated' | 'noshow' | 'left'

export interface Group {
  id: string
  /** Código curto usado no link do cliente: /fila/:code */
  code: string
  name: string
  people: number
  phone: string
  lang: Lang
  /** 'app' = entrou pelo celular; 'door' = a equipe adicionou na porta */
  source: 'app' | 'door'
  status: GroupStatus
  joinedAt: number
  /** Aviso "faltam ~10 minutos" enviado */
  soonSentAt?: number
  /** Aviso "mesa pronta" enviado (botão Avisar) */
  notifiedAt?: number
  seatedAt?: number
  endedAt?: number
  tableId?: string
  /** Pedido antecipado (Fase 3): id do item -> quantidade */
  order: Record<string, number>
  orderSent: boolean
}

export type TableState = 'ocupada' | 'conta' | 'limpar' | 'livre' | 'segurada'

export interface Table {
  id: string
  name: string
  seats: number
  state: TableState
  stateSince: number
  /** Quando o grupo atual sentou (base da previsão). null se não há grupo. */
  occupiedSince: number | null
  groupId: string | null
  /** Mesa segurada para este grupo (aviso enviado). null = segurada pela equipe. */
  heldFor: string | null
  heldUntil: number | null
}

export type MessageKind = 'joined' | 'soon' | 'ready'

export interface Message {
  id: string
  groupId: string
  kind: MessageKind
  lang: Lang
  text: string
  at: number
}

/** Registo de "mesa vagou e foi para grupo menor" — alimenta a explicação de justiça. */
export interface SkipEvent {
  id: string
  at: number
  seatedGroupId: string
  tableSeats: number
  skippedGroupIds: string[]
}

export interface QueueState {
  version: 1
  groups: Group[]
  tables: Table[]
  messages: Message[]
  skips: SkipEvent[]
  /** Deslocamento do relógio de demonstração (botão "+10 min"). */
  clockOffsetMs: number
  /** Números do dia anteriores ao que está nos grupos (para o seed bater com o mockup). */
  baseline: { seated: number; gaveUp: number; gaveUpPeople: number }
}

export interface Result<T = undefined> {
  state: QueueState
  value?: T
  error?: string
}
