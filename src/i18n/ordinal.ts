import type { Lang } from '@/domain/types'

export function ordinal(lang: Lang, n: number): string {
  if (lang === 'EN') {
    const v = n % 100
    const suf = v >= 11 && v <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
    return `${n}${suf}`
  }
  if (lang === 'FR') return n === 1 ? '1er' : `${n}e`
  return `${n}º`
}
