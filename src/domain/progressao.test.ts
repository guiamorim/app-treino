import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { sugerir } from './progressao'
import { definirUnidade, KG_POR_LB, paraUnidade } from './unidades'
import { catalogo } from './fixtures'
import type { Prescricao, RegistoExercicio, Serie } from './types'

const supino = catalogo.get('supino-halteres-neutro')!
const pr: Prescricao = { id: 'superior-a-1', exercicioId: supino.id, series: 3, faixa: [8, 12], rir: [1, 3], descansoSeg: 120 }
const reg = (series: Serie[], dor?: number): RegistoExercicio => ({ prescricaoId: pr.id, exercicioId: supino.id, series, ...(dor !== undefined ? { dor } : {}) })
const s = (carga: number, reps: number, rir?: number): Serie => ({ carga, reps, ...(rir !== undefined ? { rir } : {}) })
const base = { prescricao: pr, exercicio: supino, readaptacao: false }

describe('F6 progressão (dupla progressão, secção 4)', () => {
  it('sem histórico: sem carga sugerida, começa no mínimo da faixa', () => {
    const r = sugerir({ ...base, historico: [] })
    expect(r).toMatchObject({ carga: null, reps: 8, subiu: false })
    expect(r.motivo).toMatch(/RIR 1–3/)
  })

  it('4.1 todas as séries no topo com RIR ≥ 1: sobe a carga e volta ao mínimo', () => {
    const r = sugerir({ ...base, historico: [reg([s(20, 12, 1), s(20, 12, 2), s(20, 12, 1)])] })
    expect(r).toMatchObject({ carga: 22, reps: 8, subiu: true })
    expect(r.motivo).toMatch(/12 reps em todas as séries/)
  })

  it('4.1 RIR em falta não impede a subida', () => {
    expect(sugerir({ ...base, historico: [reg([s(20, 12), s(20, 12), s(20, 12)])] }).carga).toBe(22)
  })

  it('4.1 topo atingido mas até à falha (RIR 0): mantém a carga', () => {
    const r = sugerir({ ...base, historico: [reg([s(20, 12, 1), s(20, 12, 0), s(20, 12, 1)])] })
    expect(r).toMatchObject({ carga: 20, reps: 12, subiu: false })
  })

  it('4.2 abaixo do topo: mantém a carga e tenta +1 rep na série mais baixa', () => {
    const r = sugerir({ ...base, historico: [reg([s(20, 11, 2), s(20, 10, 1), s(20, 9, 1)])] })
    expect(r).toMatchObject({ carga: 20, reps: 10, subiu: false })
  })

  it('4.3 abaixo do mínimo em 2 sessões seguidas: baixa 10% (arredonda a 0,5 kg)', () => {
    const r = sugerir({ ...base, historico: [reg([s(25, 7), s(25, 6)]), reg([s(25, 7), s(25, 7)])] })
    expect(r).toMatchObject({ carga: 22.5, reps: 8 })
    expect(r.motivo).toMatch(/10%/)
  })

  it('4.3 abaixo do mínimo só numa sessão: mantém', () => {
    expect(sugerir({ ...base, historico: [reg([s(25, 9), s(25, 8)]), reg([s(25, 7), s(25, 7)])] }).carga).toBe(25)
  })

  it('4.4 dor ≥ 4: não sobe e sugere substituto', () => {
    const r = sugerir({ ...base, historico: [reg([s(20, 12, 2), s(20, 12, 2), s(20, 12, 2)], 4)] })
    expect(r).toMatchObject({ carga: 20, subiu: false, alerta: 'substituir' })
  })

  it('4.4 dor ≥ 7: recomenda parar hoje', () => {
    const r = sugerir({ ...base, historico: [reg([s(20, 10, 2)], 7)] })
    expect(r.alerta).toBe('parar')
    expect(r.motivo).toMatch(/avaliação/)
  })

  it('4.5 readaptação: não sobe a carga nas primeiras 2 sessões do exercício', () => {
    const topo = reg([s(20, 12, 2), s(20, 12, 2)])
    expect(sugerir({ ...base, readaptacao: true, historico: [topo] }).subiu).toBe(false)
    expect(sugerir({ ...base, readaptacao: true, historico: [topo, topo] }).subiu).toBe(true)
  })

  it('exercícios em segundos: +5 s até ao máximo', () => {
    const prancha = catalogo.get('prancha')!
    const p: Prescricao = { ...pr, exercicioId: 'prancha', faixa: [30, 60] }
    const h = (seg: number) => [{ prescricaoId: p.id, exercicioId: 'prancha', series: [s(0, seg), s(0, seg)] }]
    expect(sugerir({ prescricao: p, exercicio: prancha, readaptacao: false, historico: h(40) })).toMatchObject({ carga: 0, reps: 45 })
    const r = sugerir({ prescricao: p, exercicio: prancha, readaptacao: false, historico: h(60) })
    expect(r.reps).toBe(60)
    expect(r.motivo).toMatch(/dificuldade/)
  })

  it('peso corporal sem incremento: no topo sugere aumentar a dificuldade', () => {
    const flexoes = catalogo.get('flexoes')!
    const p: Prescricao = { ...pr, exercicioId: 'flexoes' }
    const r = sugerir({ prescricao: p, exercicio: flexoes, readaptacao: false, historico: [{ prescricaoId: p.id, exercicioId: 'flexoes', series: [s(0, 12, 2), s(0, 12, 2)] }] })
    expect(r).toMatchObject({ carga: 0, reps: 12, subiu: false })
    expect(r.motivo).toMatch(/dificuldade/)
  })

  it('4.6 semana de descarga: mantém a carga mesmo no topo da faixa', () => {
    const topo = reg([s(20, 12, 2), s(20, 12, 2)])
    const r = sugerir({ ...base, descarga: true, historico: [topo, topo] })
    expect(r).toMatchObject({ carga: 20, subiu: false })
    expect(r.motivo).toMatch(/descarga/)
  })

  it('4.1 v1.3: incremento acima de 10% da carga sobe metade (mínimo 1 kg)', () => {
    const topo = (carga: number) => reg([s(carga, 12, 2), s(carga, 12, 2)])
    expect(sugerir({ ...base, historico: [topo(6)] })).toMatchObject({ carga: 7, subiu: true })
    expect(sugerir({ ...base, historico: [topo(6)] }).motivo).toMatch(/carga ainda é leve/)
    expect(sugerir({ ...base, historico: [topo(20)] })).toMatchObject({ carga: 22, subiu: true })
    const legPress = catalogo.get('leg-press')!
    const p: Prescricao = { ...pr, exercicioId: 'leg-press' }
    const lp = (carga: number) => [{ prescricaoId: p.id, exercicioId: 'leg-press', series: [s(carga, 12, 2), s(carga, 12, 2)] }]
    expect(sugerir({ prescricao: p, exercicio: legPress, readaptacao: false, historico: lp(30) }).carga).toBe(32.5)
    expect(sugerir({ prescricao: p, exercicio: legPress, readaptacao: false, historico: lp(60) }).carga).toBe(65)
  })
})

describe('F22.9 progressão em libras', () => {
  const lb = (n: number) => n * KG_POR_LB
  const emLb = (r: { carga: number | null }) => paraUnidade(r.carga!, 'lb')
  const topo = (cargaLb: number) => reg([s(lb(cargaLb), 12, 2), s(lb(cargaLb), 12, 2)])
  beforeEach(() => definirUnidade('lb'))
  afterEach(() => definirUnidade('kg'))

  it('o incremento passa a libras redondas: 2 kg → 5 lb, 5 kg → 10 lb', () => {
    const r = sugerir({ ...base, historico: [topo(50)] })
    expect(emLb(r)).toBeCloseTo(55, 6)
    expect(r.motivo).toMatch(/sobe para 55 lb/)
    const legPress = catalogo.get('leg-press')!
    const p: Prescricao = { ...pr, exercicioId: 'leg-press' }
    const h = [{ prescricaoId: p.id, exercicioId: 'leg-press', series: [s(lb(200), 12, 2), s(lb(200), 12, 2)] }]
    expect(emLb(sugerir({ prescricao: p, exercicio: legPress, readaptacao: false, historico: h }))).toBeCloseTo(210, 6)
  })

  it('com carga leve sobe metade, arredondada a 2,5 lb', () => {
    const r = sugerir({ ...base, historico: [topo(20)] })
    expect(emLb(r)).toBeCloseTo(22.5, 6)
    expect(r.motivo).toMatch(/Subida de 2,5 lb/)
  })

  it('a descida de 10% arredonda a 0,5 lb e a mensagem de manter usa libras', () => {
    const abaixo = reg([s(lb(137), 7), s(lb(137), 6)])
    expect(emLb(sugerir({ ...base, historico: [abaixo, abaixo] }))).toBeCloseTo(123, 6)
    expect(sugerir({ ...base, historico: [reg([s(lb(135), 10), s(lb(135), 9)])] }).motivo).toMatch(/Mantém 135 lb/)
  })
})
