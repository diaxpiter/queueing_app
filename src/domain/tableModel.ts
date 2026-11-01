import { minutesSince } from './format'
import type { Table } from './types'

/**
 * Modelo de mesas — PRIMEIRA VERSÃO, vinda do protótipo.
 * Os números abaixo são suposições, não dados da casa. Quando o sistema
 * registrar quanto cada mesa realmente leva, trocar por estatística real.
 */

/** Janela da previsão: "probabilidade de vagar até agora + 15 min". */
export const HORIZON_MIN = 15

/** Tempo típico de ocupação por tamanho de mesa, em minutos. */
export function typicalMinutes(seats: number): number {
  if (seats <= 2) return 45
  if (seats <= 4) return 55
  if (seats <= 5) return 65
  return 35 // balcão
}

export function elapsedMin(t: Table, now: number): number {
  return t.occupiedSince == null ? 0 : minutesSince(t.occupiedSince, now)
}

/** Minutos esperados até a mesa ficar utilizável (usado na estimativa de espera). */
export function expectedFreeInMin(t: Table, now: number): number {
  switch (t.state) {
    case 'livre':
    case 'segurada':
      return 0
    case 'limpar':
      return 3
    case 'conta':
      return 6
    case 'ocupada':
      return Math.max(2, typicalMinutes(t.seats) - elapsedMin(t, now))
  }
}

export type Tone = 'free' | 'held' | 'clean' | 'bill' | 'busy' | 'calm'

export interface Forecast {
  /** 0–100: largura da barra */
  pct: number
  prob: string
  sub: string
  tone: Tone
}

export function forecast(t: Table, now: number): Forecast {
  if (t.state === 'livre')
    return { pct: 100, prob: 'livre', sub: 'pronta a servir', tone: 'free' }
  if (t.state === 'segurada')
    return {
      pct: 100,
      prob: 'presa',
      sub: t.heldFor
        ? 'guardada para quem foi avisado'
        : 'segurada pela equipe',
      tone: 'held',
    }
  if (t.state === 'limpar')
    return { pct: 82, prob: '~3 min', sub: 'a limpar · cerca de 3 min', tone: 'clean' }
  if (t.state === 'conta')
    return {
      pct: 88,
      prob: '88%',
      sub: `conta há ${minutesSince(t.stateSince, now)} min · livre em 3–10 min`,
      tone: 'bill',
    }

  const typ = typicalMinutes(t.seats)
  const el = elapsedMin(t, now)
  const r = el / typ
  let p = Math.round((95 * (r * r)) / (r * r + 0.55))
  p = Math.min(93, Math.max(4, p))
  const rest = Math.max(2, Math.round(typ - el))
  const lo = Math.max(1, Math.round(rest * 0.5))
  const hi = Math.round(rest * 1.7)
  return {
    pct: p,
    prob: `${p}%`,
    sub: `há ${el} min · livre em ${lo}–${hi} min`,
    tone: p >= 60 ? 'busy' : 'calm',
  }
}
