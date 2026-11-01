import { Link, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useQueueState } from '@/data/hooks'
import { fmtTime } from '@/domain/format'
import { LANGS } from '@/domain/types'
import { t } from '@/i18n/customer'
import { buildMessage } from '@/i18n/messages'
import { BottomNav, Brand, PhoneShell } from './PhoneShell'

export function MessagesScreen() {
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

  const lang = g.lang
  const msgs = s.messages
    .filter((m) => m.groupId === g.id)
    .sort((a, b) => a.at - b.at)

  return (
    <PhoneShell nav={<BottomNav code={g.code} lang={lang} />}>
      <main className="flex flex-1 flex-col gap-5 px-6 pb-6 pt-7">
        <div className="flex flex-col gap-2">
          <span className="font-label text-[10px] font-semibold uppercase tracking-[0.2em] text-dim">
            {t(lang, 'msgEyebrow')}
          </span>
          <h1 className="font-display text-2xl leading-tight">{t(lang, 'msgHeadline')}</h1>
        </div>

        <div className="flex flex-col gap-3" data-testid="messages">
          {msgs.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {g.phone ? t(lang, 'msgEmpty') : t(lang, 'msgNoPhone')}
            </p>
          )}
          {msgs.map((m) => (
            <div key={m.id} className="flex flex-col gap-1">
              <div
                className={
                  m.kind === 'ready'
                    ? 'whitespace-pre-line rounded-sm border border-primary/50 border-l-[3px] border-l-primary bg-highlight p-3.5 text-[14.5px] leading-relaxed'
                    : 'whitespace-pre-line rounded-sm border border-border bg-card p-3.5 text-[14.5px] leading-relaxed'
                }
              >
                {m.kind === 'ready' && (
                  <div className="mb-1 font-label text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {t(lang, 'readyTitle')}
                  </div>
                )}
                {m.text}
              </div>
              <span className="text-[11px] text-dim">{fmtTime(m.at)}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <span className="font-label text-[10px] font-semibold uppercase tracking-[0.2em] text-dim">
            {t(lang, 'msgSame')}
          </span>
          {LANGS.filter((l) => l !== lang).map((l) => (
            <div key={l} className="flex gap-3 text-[13px] leading-snug text-muted-foreground">
              <span className="w-6 shrink-0 font-label font-semibold text-primary">{l}</span>
              <span>{buildMessage('ready', l)}</span>
            </div>
          ))}
        </div>

        <p className="mt-auto pt-2 text-xs text-dim">{t(lang, 'msgSim')}</p>
      </main>
    </PhoneShell>
  )
}
