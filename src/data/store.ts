import { seedState } from '@/data/seed'
import type { QueueState, Result } from '@/domain/types'

/**
 * Armazenamento da v0: o estado inteiro fica em localStorage e é sincronizado
 * entre abas/iframes da mesma origem (evento `storage`). Não há servidor.
 *
 * Para trocar por um backend, mantenha `commit` como única porta de escrita:
 * as regras (src/domain/actions.ts) são funções puras e podem rodar no servidor.
 */

const KEY = 'holy.queue.v0'

let memory: QueueState | null = null
let current: QueueState = read()
const listeners = new Set<() => void>()

function read(): QueueState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as QueueState
      if (parsed?.version === 1) return parsed
    }
  } catch {
    // localStorage indisponível (janela privada, etc.): cai para memória
  }
  return memory ?? seedState(Date.now())
}

function persist(s: QueueState) {
  memory = s
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // ignora: o estado continua em memória
  }
}

function emit() {
  for (const l of listeners) l()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      current = read()
      emit()
    }
  })
  // primeira visita: grava o seed para as outras abas verem o mesmo estado
  if (!localStorage.getItem(KEY)) persist(current)
}

export function getState(): QueueState {
  return current
}

export function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Relógio da aplicação: hora real + deslocamento da demonstração. */
export function simNow(): number {
  return Date.now() + current.clockOffsetMs
}

/** Única porta de escrita. Relê o estado mais recente antes de aplicar a regra. */
export function commit<T>(
  fn: (s: QueueState, now: number) => Result<T>,
): Result<T> {
  current = read()
  const res = fn(current, simNow())
  if (res.state !== current) {
    current = res.state
    persist(current)
    emit()
  }
  return res
}

export function replaceState(next: QueueState) {
  current = next
  persist(current)
  emit()
}
