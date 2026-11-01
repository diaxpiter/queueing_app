import { describe, expect, it } from 'vitest'

import { seedState, emptyState } from '@/data/seed'
import {
  advanceTable,
  joinQueue,
  leaveQueue,
  markNoShow,
  seatGroup,
  tick,
  warnGroup,
} from './actions'
import {
  activeQueue,
  estimateJoinWait,
  estimateWaits,
  fairnessInfo,
  nextFit,
  seatOptions,
  stats,
} from './queue'
import { forecast } from './tableModel'
import type { QueueState, Result } from './types'

const NOW = Date.UTC(2026, 10, 1, 21, 14)
const MIN = 60000

function seed(): QueueState {
  return seedState(NOW)
}
function ok<T>(r: Result<T>): QueueState {
  expect(r.error).toBeUndefined()
  return r.state
}
/** leva a mesa até "livre": ocupada → conta → limpar → livre */
function freeTable(s: QueueState, id: string): QueueState {
  for (let i = 0; i < 3; i++) s = ok(advanceTable(s, id, NOW))
  return s
}
const group = (s: QueueState, id: string) => s.groups.find((g) => g.id === id)!

describe('modelo de mesas', () => {
  it('reproduz a previsão do protótipo (Mesa 1, 34 min de 45)', () => {
    const t = seed().tables[0]
    expect(forecast(t, NOW).prob).toBe('48%')
  })

  it('mesa com conta pedida e a limpar têm valores fixos', () => {
    const s = seed()
    expect(forecast(s.tables[2], NOW).prob).toBe('88%')
    const limpar = { ...s.tables[0], state: 'limpar' as const }
    expect(forecast(limpar, NOW).prob).toBe('~3 min')
  })
})

describe('estimativa de espera', () => {
  it('a Sophie (grupo de 5) espera pela Mesa 3, que está com a conta pedida', () => {
    const w = estimateWaits(seed(), NOW)
    expect(w['g-sophie']).toBe(6)
  })

  it('grupo maior que qualquer mesa não tem estimativa', () => {
    expect(estimateJoinWait(seed(), 12, NOW)).toBeNull()
  })

  it('salão vazio: espera zero', () => {
    expect(estimateJoinWait(emptyState(NOW), 2, NOW)).toBe(0)
  })
})

describe('ordem da fila e justiça', () => {
  it('mesa de 2 que vaga serve o Tiago (2) e ultrapassa a Sophie (5), que não cabe', () => {
    let s = freeTable(seed(), 't1')
    expect(seatOptions(s, group(s, 'g-tiago')).table?.id).toBe('t1')
    s = ok(seatGroup(s, 'g-tiago', NOW))
    expect(group(s, 'g-tiago').status).toBe('seated')
    expect(s.tables[0].state).toBe('ocupada')
    expect(fairnessInfo(s, group(s, 'g-sophie')).skipCount).toBe(1)
  })

  it('o Kiarash não pode passar à frente do Tiago numa mesa de 2', () => {
    const s = freeTable(seed(), 't1')
    const opt = seatOptions(s, group(s, 'g-kiarash'))
    expect(opt.table).toBeNull()
    expect(opt.reason).toContain('Tiago')
  })

  it('sem mesa livre, ninguém senta', () => {
    const r = seatGroup(seed(), 'g-sophie', NOW)
    expect(r.error).toBeTruthy()
  })

  it('a Marina é a próxima para mesa de 4', () => {
    const s = seed()
    const f = fairnessInfo(s, group(s, 'g-marina'))
    expect(f.classSeats).toBe(4)
    expect(f.nextForClass).toBe(true)
  })

  it('o painel explica quando a mesa que vagou não serve ao primeiro grupo', () => {
    const s = freeTable(seed(), 't1')
    expect(nextFit(s, NOW)).toContain('serve só 2')
  })
})

describe('avisar, guardar e liberar', () => {
  it('avisar guarda uma mesa livre por 5 minutos e a mesa guardada é a que o grupo usa', () => {
    let s = freeTable(seed(), 't1')
    s = ok(warnGroup(s, 'g-tiago', NOW))
    expect(s.tables[0].state).toBe('segurada')
    expect(s.tables[0].heldFor).toBe('g-tiago')
    s = ok(seatGroup(s, 'g-tiago', NOW))
    expect(s.tables[0].groupId).toBe('g-tiago')
  })

  it('a mesa guardada volta a ficar livre depois de 5 minutos', () => {
    let s = freeTable(seed(), 't1')
    s = ok(warnGroup(s, 'g-tiago', NOW))
    expect(tick(s, NOW + 4 * MIN).tables[0].state).toBe('segurada')
    expect(tick(s, NOW + 6 * MIN).tables[0].state).toBe('livre')
  })

  it('"não veio" e sair da fila liberam a mesa guardada', () => {
    let s = freeTable(seed(), 't1')
    s = ok(warnGroup(s, 'g-tiago', NOW))
    s = ok(markNoShow(s, 'g-tiago', NOW))
    expect(s.tables[0].state).toBe('livre')
    expect(group(s, 'g-tiago').status).toBe('noshow')
    expect(stats(s, NOW).gaveUp).toBe(8)
  })

  it('não dá para avisar duas vezes', () => {
    let s = ok(warnGroup(seed(), 'g-tiago', NOW))
    expect(warnGroup(s, 'g-tiago', NOW).error).toBeTruthy()
    s = ok(leaveQueue(s, 'g-tiago', NOW))
    expect(activeQueue(s).some((g) => g.id === 'g-tiago')).toBe(false)
  })
})

describe('entrar na fila', () => {
  it('cria o grupo no fim da fila e manda a mensagem no idioma escolhido', () => {
    const r = joinQueue(
      seed(),
      { name: 'Marie', people: 2, phone: '+33 6 12 34 56 78', lang: 'FR', source: 'app' },
      NOW,
      'holy.test/fila',
    )
    const s = ok(r)
    expect(positionOfLast(s)).toBe(7)
    const m = s.messages.at(-1)!
    expect(m.kind).toBe('joined')
    expect(m.lang).toBe('FR')
    expect(m.text).toContain('Position 7')
    expect(m.text).toContain(`holy.test/fila/${r.value!.code}`)
  })

  it('rejeita nome vazio', () => {
    const r = joinQueue(
      seed(),
      { name: '  ', people: 2, phone: '', lang: 'PT', source: 'door' },
      NOW,
      'x',
    )
    expect(r.error).toBeTruthy()
  })

  it('cliente da porta (sem WhatsApp) não gera mensagem', () => {
    const s = ok(
      joinQueue(seed(), { name: 'Rui', people: 2, phone: '', lang: 'PT', source: 'door' }, NOW, 'x'),
    )
    expect(s.messages).toHaveLength(0)
  })
})

describe('aviso "faltam ~10 minutos"', () => {
  it('dispara uma vez quando a espera estimada chega a 10 min', () => {
    let s = ok(
      joinQueue(
        emptyState(NOW),
        { name: 'Ana', people: 2, phone: '+351 900 000 000', lang: 'ES', source: 'app' },
        NOW,
        'x',
      ),
    )
    // salão vazio: espera 0, então o aviso sai no primeiro tick
    s = tick(s, NOW)
    s = tick(s, NOW + MIN)
    const soon = s.messages.filter((m) => m.kind === 'soon')
    expect(soon).toHaveLength(1)
    expect(soon[0].lang).toBe('ES')
  })
})

function positionOfLast(s: QueueState): number {
  return activeQueue(s).length
}
