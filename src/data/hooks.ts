import { useSyncExternalStore } from 'react'

import { getState, simNow, subscribe } from '@/data/store'
import type { Lang, QueueState } from '@/domain/types'

export function useQueueState(): QueueState {
  return useSyncExternalStore(subscribe, getState, getState)
}

function subscribeClock(cb: () => void): () => void {
  const id = window.setInterval(cb, 10_000)
  return () => window.clearInterval(id)
}

/** Hora da aplicação (com deslocamento da demo). Atualiza a cada 10 s e a cada mudança de estado. */
export function useNow(): number {
  useQueueState() // re-renderiza quando o deslocamento do relógio muda
  return useSyncExternalStore(
    subscribeClock,
    () => Math.floor(simNow() / 10_000) * 10_000,
  )
}

const LANG_KEY = 'holy.lang'

export function loadLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY)
    if (v === 'PT' || v === 'EN' || v === 'ES' || v === 'FR') return v
  } catch {
    // sem localStorage
  }
  const nav = navigator.language.slice(0, 2).toUpperCase()
  return nav === 'EN' || nav === 'ES' || nav === 'FR' ? nav : 'PT'
}

export function saveLang(l: Lang) {
  try {
    localStorage.setItem(LANG_KEY, l)
  } catch {
    // sem localStorage
  }
}

const MY_KEY = 'holy.myCode'

/** Código da fila deste aparelho (para reabrir o ticket). */
export function loadMyCode(): string | null {
  try {
    return localStorage.getItem(MY_KEY)
  } catch {
    return null
  }
}

export function saveMyCode(code: string | null) {
  try {
    if (code) localStorage.setItem(MY_KEY, code)
    else localStorage.removeItem(MY_KEY)
  } catch {
    // sem localStorage
  }
}
