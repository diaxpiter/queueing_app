const timeFmt = new Intl.DateTimeFormat('pt-PT', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dateFmt = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export function fmtTime(ms: number): string {
  return timeFmt.format(ms)
}

export function fmtDate(ms: number): string {
  const s = dateFmt.format(ms)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function minutesSince(from: number, now: number): number {
  return Math.max(0, Math.floor((now - from) / 60000))
}

/** Arredonda a espera mostrada ao cliente para múltiplos de 5 min (mín. 5). */
export function roundWait(min: number): number {
  return Math.max(5, Math.round(min / 5) * 5)
}

/** Minutos que faltam até `until`, arredondado (a hora da tela tem até 10 s de atraso) e nunca abaixo de 1. */
export function minutesLeft(until: number, now: number): number {
  return Math.max(1, Math.round((until - now) / 60000))
}
