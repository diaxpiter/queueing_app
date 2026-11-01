export interface MenuItem {
  id: string
  name: string
  /** chave de i18n para uma nota curta (opcional) */
  note?: 'ponyNote'
  /** preço em cêntimos — ainda não preenchido, a Holy precisa passar o cardápio real */
  priceCents?: number
}

export const MENU: MenuItem[] = [
  { id: 'pony', name: 'Pony Line', note: 'ponyNote' },
  { id: 'coxinha', name: 'Coxinha de Pastrami' },
  { id: 'motz', name: 'Motz Burger' },
  { id: 'fries', name: 'Pastrami Fries' },
  { id: 'banoffee', name: 'Banoffee' },
]

export function orderCount(order: Record<string, number>): number {
  return Object.values(order).reduce((n, q) => n + q, 0)
}
