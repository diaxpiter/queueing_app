import { ListOrdered, MessageCircle, UtensilsCrossed } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

import type { Lang } from '@/domain/types'
import { t } from '@/i18n/customer'
import { cn } from '@/lib/utils'

export function Brand({ size = 'lg', lang = 'PT' }: { size?: 'sm' | 'lg'; lang?: Lang }) {
  return (
    <div className={cn('flex flex-col', size === 'lg' ? 'items-center gap-1' : 'items-start gap-0.5')}>
      <div
        className={cn(
          'font-display leading-none text-foreground',
          size === 'lg' ? 'text-[27px]' : 'text-[19px]',
        )}
      >
        HOLY
      </div>
      <div className="font-label text-[9px] font-semibold uppercase tracking-[0.3em] text-primary">
        {t(lang, 'brandSub')}
      </div>
    </div>
  )
}

/** Moldura de celular: ocupa a tela inteira no aparelho e fica centrada em telas grandes. */
export function PhoneShell({ children, nav }: { children: ReactNode; nav?: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background">
      <div className="flex flex-1 flex-col">{children}</div>
      {nav}
    </div>
  )
}

export function BottomNav({ code, lang }: { code: string; lang: Lang }) {
  const items = [
    { to: `/fila/${code}`, end: true, icon: ListOrdered, label: t(lang, 'navQueue') },
    { to: `/fila/${code}/mensagens`, end: false, icon: MessageCircle, label: t(lang, 'navMessages') },
    { to: `/fila/${code}/pedido`, end: false, icon: UtensilsCrossed, label: t(lang, 'navOrder') },
  ]
  return (
    <nav className="sticky bottom-0 grid grid-cols-3 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {items.map(({ to, end, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 py-3 font-label text-[10.5px] font-semibold uppercase tracking-[0.14em]',
              isActive ? 'text-primary' : 'text-dim hover:text-foreground',
            )
          }
        >
          <Icon className="size-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
