import { describe, expect, it } from 'vitest'
import { fraseDoDia, FRASES } from './frases'
import { horasTreino, inicioMes, tendenciaPeso, treinosEntre } from './painel'
import type { Medicao, Sessao } from './types'

const s = (inicio: string, fim?: string): Sessao => ({ id: inicio, planoId: 'p', treinoId: 't', inicio, ...(fim ? { fim } : {}), exercicios: [] })

describe('F11 painel', () => {
  const sessoes = [
    s('2026-10-13T18:00:00.000Z', '2026-10-13T19:00:00.000Z'),
    s('2026-10-20T18:00:00.000Z', '2026-10-20T18:45:00.000Z'),
    s('2026-10-21T18:00:00.000Z', '2026-10-22T09:00:00.000Z'), // esquecida aberta: conta 3 h
    s('2026-10-22T18:00:00.000Z'), // em curso: não conta
  ]
  const ini = new Date('2026-10-19T00:00:00.000Z')
  const fim = new Date('2026-10-26T00:00:00.000Z')

  it('horas de treino somam fim − início, no máximo 3 h por sessão', () => {
    expect(horasTreino(sessoes, ini, fim)).toBeCloseTo(3.75)
    expect(horasTreino([], ini, fim)).toBe(0)
  })

  it('treinos terminados no intervalo', () => {
    expect(treinosEntre(sessoes, ini, fim)).toBe(2)
  })

  it('início do mês civil', () => {
    const d = inicioMes(new Date(2026, 9, 21, 15))
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 1, 0])
  })

  it('tendência de peso: média de 7 dias atual menos a de há 4 semanas', () => {
    const m: Medicao[] = [
      { id: '1', data: '2026-09-20', pesoKg: 90 },
      { id: '2', data: '2026-10-19', pesoKg: 88.6 },
      { id: '3', data: '2026-10-21', pesoKg: 88.4 },
    ]
    expect(tendenciaPeso(m)).toBeCloseTo(-1.5)
    expect(tendenciaPeso(m.slice(1))).toBeNull()
  })
})

describe('F13 frase do dia', () => {
  it('é determinística por data e muda de um dia para o outro', () => {
    const a = fraseDoDia(new Date(2026, 9, 20, 8))
    expect(fraseDoDia(new Date(2026, 9, 20, 22))).toEqual(a)
    expect(fraseDoDia(new Date(2026, 9, 21, 8))).not.toEqual(a)
    expect(FRASES).toContainEqual(a)
  })

  it('v1.4: frases curtas, sem aspas no texto (a interface põe-nas), e várias com autor', () => {
    for (const f of FRASES) {
      expect(f.texto.length).toBeLessThanOrEqual(120)
      expect(f.texto).not.toMatch(/["“”«»]/)
      if (f.autor !== undefined) expect(f.autor.trim()).not.toBe('')
    }
    expect(FRASES.filter((f) => f.autor).length).toBeGreaterThanOrEqual(10)
  })
})
