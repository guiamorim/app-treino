import { describe, expect, it } from 'vitest'
import { aderencia, alvoVolume, e1rm, mediaMovel, progressaoExercicio, volumeSemanal } from './relatorios'
import { catalogo } from './fixtures'
import type { Sessao } from './types'

const sessao = (inicio: string, exercicios: Sessao['exercicios'], fim?: string): Sessao => ({
  id: inicio, planoId: 'p', treinoId: 't', inicio, exercicios, ...(fim ? { fim } : {}),
})

describe('F7 progressão por exercício', () => {
  it('1RM estimado pela fórmula de Epley; só séries de 1–12 reps', () => {
    expect(e1rm(100, 1)).toBe(100)
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 1)
    expect(e1rm(100, 13)).toBeNull()
    expect(e1rm(0, 10)).toBeNull()
  })

  it('melhor série, 1RM e recordes pessoais por sessão', () => {
    const s = [
      sessao('2026-10-20T10:00:00Z', [{ prescricaoId: 'a', exercicioId: 'leg-press', series: [{ carga: 100, reps: 8 }, { carga: 100, reps: 10 }], dor: 1 }]),
      sessao('2026-10-23T10:00:00Z', [{ prescricaoId: 'a', exercicioId: 'leg-press', series: [{ carga: 100, reps: 9 }] }]),
      sessao('2026-10-27T10:00:00Z', [{ prescricaoId: 'a', exercicioId: 'leg-press', series: [{ carga: 110, reps: 8 }] }]),
    ]
    const p = progressaoExercicio(s, 'leg-press')
    expect(p.map((x) => x.melhor)).toEqual([{ carga: 100, reps: 10 }, { carga: 100, reps: 9 }, { carga: 110, reps: 8 }])
    expect(p.map((x) => x.recorde)).toEqual([true, false, true])
    expect(p.map((x) => x.dor)).toEqual([1, 0, 0])
  })
})

describe('F8 semana em resumo', () => {
  it('séries por grupo: principal conta 1, secundário 0,5; só séries feitas', () => {
    const s = [sessao('2026-10-20T10:00:00Z', [{ prescricaoId: 'a', exercicioId: 'supino-halteres-neutro', series: [{ carga: 20, reps: 10 }, { carga: 20, reps: 10 }] }])]
    const v = volumeSemanal(s, catalogo, new Date('2026-10-19T00:00:00Z'), new Date('2026-10-26T00:00:00Z'))
    expect(v.peito).toBe(2)
    expect(v.triceps).toBe(1)
    expect(v.costas).toBe(0)
    expect(volumeSemanal(s, catalogo, new Date('2026-10-26T00:00:00Z'), new Date('2026-11-02T00:00:00Z')).peito).toBe(0)
  })

  it('alvos de volume: grupos grandes 8–14, pequenos 6–10', () => {
    expect(alvoVolume('peito')).toEqual([8, 14])
    expect(alvoVolume('biceps')).toEqual([6, 10])
  })

  it('aderência das últimas 4 semanas: sessões terminadas vs planeadas', () => {
    const agora = new Date('2026-11-17T12:00:00Z')
    const s = [
      sessao('2026-10-21T10:00:00Z', [], 'x'),
      sessao('2026-11-10T10:00:00Z', [], 'x'),
      sessao('2026-11-12T10:00:00Z', []),
      sessao('2026-10-01T10:00:00Z', [], 'x'),
    ]
    expect(aderencia(s, 4, agora)).toEqual({ feitas: 2, planeadas: 16 })
  })

  it('média móvel de 7 dias do peso', () => {
    const m = mediaMovel([
      { id: '1', data: '2026-10-01', pesoKg: 94 },
      { id: '2', data: '2026-10-05', pesoKg: 92 },
      { id: '3', data: '2026-10-10', pesoKg: 90 },
      { id: '4', data: '2026-10-11', cinturaCm: 95 },
    ])
    expect(m).toEqual([
      { data: '2026-10-01', valor: 94, media: 94 },
      { data: '2026-10-05', valor: 92, media: 93 },
      { data: '2026-10-10', valor: 90, media: 91 },
    ])
  })
})
