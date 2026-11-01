import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { api } from '@/data/api'
import { loadLang, saveLang, saveMyCode, useNow, useQueueState } from '@/data/hooks'
import { roundWait } from '@/domain/format'
import { activeQueue, estimateJoinWait } from '@/domain/queue'
import { LANGS, type Lang } from '@/domain/types'
import { t } from '@/i18n/customer'
import { Brand, PhoneShell } from './PhoneShell'

export function JoinScreen() {
  const navigate = useNavigate()
  const s = useQueueState()
  const now = useNow()

  const [lang, setLang] = useState<Lang>(loadLang)
  const [name, setName] = useState('')
  const [people, setPeople] = useState(4)
  const [prefix, setPrefix] = useState('+351')
  const [number, setNumber] = useState('')
  const [errors, setErrors] = useState<{ name?: boolean; phone?: boolean }>({})

  const groups = activeQueue(s).length
  const wait = estimateJoinWait(s, people, now)
  const size = people === 6 ? '6+' : String(people)

  let summary: string
  if (wait == null) summary = t(lang, 'summaryNoTable')
  else if (groups === 0)
    summary = t(lang, 'summaryEmpty', { wait: roundWait(wait), size })
  else
    summary = t(lang, groups === 1 ? 'summaryOne' : 'summaryMany', {
      groups,
      wait: roundWait(wait),
      size,
    })

  function pickLang(l: Lang) {
    setLang(l)
    saveLang(l)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const digits = number.replace(/\D/g, '')
    const errs = { name: !name.trim(), phone: digits.length < 9 }
    setErrors(errs)
    if (errs.name || errs.phone) return
    const res = api.join({
      name,
      people,
      phone: `${prefix.trim()} ${number.trim()}`,
      lang,
      source: 'app',
    })
    if (res.value) {
      saveMyCode(res.value.code)
      navigate(`/fila/${res.value.code}`)
    }
  }

  return (
    <PhoneShell>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-6 px-6 pb-8 pt-7" noValidate>
        <Brand lang={lang} />

        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-[27px] leading-[1.16] text-foreground">
            {t(lang, 'joinTitle')}
          </h1>
          <p className="text-[15.5px] leading-[1.45] text-muted-foreground">
            {t(lang, 'joinLead')}
          </p>
        </div>

        <div className="flex items-center gap-3.5 rounded-sm border border-border bg-card px-4 py-3.5">
          <span className="size-2 shrink-0 rounded-full bg-primary" />
          <div className="flex flex-col gap-0.5">
            <span className="font-label text-[10.5px] font-semibold uppercase tracking-[0.18em] text-dim">
              {t(lang, 'nowInQueue')}
            </span>
            <span className="text-[15px]" data-testid="join-summary">
              {summary}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">{t(lang, 'yourName')}</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t(lang, 'namePlaceholder')}
            autoComplete="given-name"
            aria-invalid={errors.name}
          />
          {errors.name && <p className="text-xs text-destructive">{t(lang, 'errName')}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t(lang, 'partySize')}</Label>
          <ToggleGroup
            type="single"
            value={String(people)}
            onValueChange={(v) => v && setPeople(Number(v))}
            aria-label={t(lang, 'partySize')}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <ToggleGroupItem key={n} value={String(n)} aria-label={String(n)}>
                {n === 6 ? '6+' : n}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">{t(lang, 'whatsapp')}</Label>
          <div className="flex gap-2">
            <Input
              aria-label="Prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-[84px] text-center"
              inputMode="tel"
            />
            <Input
              id="phone"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="912 345 678"
              inputMode="tel"
              autoComplete="tel-national"
              aria-invalid={errors.phone}
            />
          </div>
          {errors.phone && <p className="text-xs text-destructive">{t(lang, 'errPhone')}</p>}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label>{t(lang, 'language')}</Label>
          <ToggleGroup
            type="single"
            value={lang}
            onValueChange={(v) => v && pickLang(v as Lang)}
            className="gap-1.5"
            aria-label={t(lang, 'language')}
          >
            {LANGS.map((l) => (
              <ToggleGroupItem key={l} value={l} className="h-8 w-10 flex-none text-[11px]">
                {l}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <Button type="submit" size="lg" className="w-full">
            {t(lang, 'join')}
          </Button>
          <p className="text-center text-xs leading-relaxed text-dim">
            {t(lang, 'joinNote')}
          </p>
        </div>
      </form>
    </PhoneShell>
  )
}
