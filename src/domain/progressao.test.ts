import { describe, expect, it } from 'vitest'
import { sugerir } from './progressao'
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
})
