import { Check, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { api } from '@/data/api'
import { useQueueState } from '@/data/hooks'
import { MENU, orderCount } from '@/domain/menu'
import { t } from '@/i18n/customer'
import { cn } from '@/lib/utils'
import { BottomNav, Brand, PhoneShell } from './PhoneShell'

export function OrderScreen() {
  const { code } = useParams()
  const s = useQueueState()
  const g = s.groups.find((x) => x.code === code)

  if (!g) {
    return (
      <PhoneShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <Brand />
          <p className="text-muted-foreground">{t('PT', 'notFound')}</p>
          <Button asChild>
            <Link to="/fila?new">{t('PT', 'join')}</Link>
          </Button>
        </div>
      </PhoneShell>
    )
  }
  // `key` recria o formulário se o grupo mudar, em vez de sincronizar estado com efeito
  return <OrderForm key={g.id} groupId={g.id} />
}

function OrderForm({ groupId }: { groupId: string }) {
  const navigate = useNavigate()
  const s = useQueueState()
  const g = s.groups.find((x) => x.id === groupId)!
  const lang = g.lang
  const T = (k: Parameters<typeof t>[1], p?: Record<string, string | number>) => t(lang, k, p)

  const [qty, setQty] = useState<Record<string, number>>(g.order)
  const [saved, setSaved] = useState(g.orderSent)
  const total = orderCount(qty)

  function change(id: string, delta: number) {
    setSaved(false)
    setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) + delta) }))
  }

  return (
    <PhoneShell nav={<BottomNav code={g.code} lang={lang} />}>
      <main className="flex flex-1 flex-col gap-5 px-6 pb-6 pt-7">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <span className="rounded-sm bg-primary px-2 py-0.5 font-label text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground">
              {T('orderPhase')}
            </span>
            <span className="font-label text-[10px] font-semibold uppercase tracking-[0.2em] text-dim">
              {T('orderEyebrow')}
            </span>
          </div>
          <h1 className="font-display text-2xl leading-tight">{T('orderTitle')}</h1>
          <p className="text-sm text-muted-foreground">{T('orderLead')}</p>
        </div>

        <ul className="flex flex-col gap-2">
          {MENU.map((item) => {
            const q = qty[item.id] ?? 0
            return (
              <li
                key={item.id}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-sm border px-3.5 py-3',
                  q > 0 ? 'border-primary/40 bg-highlight' : 'border-border bg-card',
                )}
              >
                <div className="min-w-0">
                  <div className={cn('text-[15px]', q > 0 && 'font-semibold')}>{item.name}</div>
                  {item.note && q > 0 && (
                    <div className="text-xs text-copper">{T(item.note)}</div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  {q > 0 && (
                    <>
                      <button
                        type="button"
                        aria-label={`${T('remove')} ${item.name}`}
                        onClick={() => change(item.id, -1)}
                        className="grid size-8 place-items-center rounded-sm border border-border-strong text-muted-foreground hover:text-foreground"
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="w-4 text-center font-label text-base font-semibold text-primary">
                        {q}
                      </span>
                    </>
                  )}
                  <button
                    type="button"
                    aria-label={`${T('add')} ${item.name}`}
                    onClick={() => change(item.id, 1)}
                    className={cn(
                      'grid size-8 place-items-center rounded-sm border',
                      q > 0
                        ? 'border-primary text-primary'
                        : 'border-border-strong text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total === 1 ? T('itemsOne') : T('itemsMany', { n: total })}</span>
        </div>

        <p className="rounded-sm border border-border bg-card p-3.5 text-[13.5px] leading-relaxed text-muted-foreground">
          {T('orderNote')}
        </p>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <Button
            size="lg"
            className="w-full"
            disabled={total === 0}
            onClick={() => {
              api.setOrder(g.id, qty, true)
              setSaved(true)
            }}
          >
            {saved ? (
              <>
                <Check /> {T('orderSaved')}
              </>
            ) : (
              T('orderSave')
            )}
          </Button>
          <button
            type="button"
            className="py-2 text-center text-xs text-dim underline underline-offset-2 hover:text-foreground"
            onClick={() => {
              api.setOrder(g.id, {}, false)
              navigate(`/fila/${g.code}`)
            }}
          >
            {T('orderSkip')}
          </button>
        </div>
      </main>
    </PhoneShell>
  )
}
