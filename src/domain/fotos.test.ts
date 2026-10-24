import { describe, expect, it } from 'vitest'
import { compararFotos, fotosPorMes, medicaoProxima } from './fotos'
import type { FotoAvaliacao, Medicao } from './types'

const foto = (id: string, data: string, pose: FotoAvaliacao['pose'] = 'frente'): FotoAvaliacao => ({ id, data, pose, imagem: 'data:image/jpeg;base64,AAAA' })

describe('F15 fotos de avaliação', () => {
  it('agrupa por mês, do mais recente para o mais antigo', () => {
    const g = fotosPorMes([foto('a', '2026-09-03'), foto('b', '2026-10-20'), foto('c', '2026-10-02', 'lado'), foto('d', '2026-09-30')])
    expect(g.map((x) => x.mes)).toEqual(['2026-10', '2026-09'])
    expect(g[0]!.fotos.map((f) => f.id)).toEqual(['b', 'c'])
    expect(g[1]!.fotos.map((f) => f.id)).toEqual(['d', 'a'])
  })

  it('medição mais próxima até 7 dias de distância', () => {
    const m: Medicao[] = [
      { id: '1', data: '2026-10-01', pesoKg: 90 },
      { id: '2', data: '2026-10-12', pesoKg: 89, cinturaCm: 96 },
    ]
    expect(medicaoProxima(m, '2026-10-10')?.id).toBe('2')
    expect(medicaoProxima(m, '2026-10-04')?.id).toBe('1')
    expect(medicaoProxima(m, '2026-10-25')).toBeUndefined()
  })

  it('comparar dois meses na mesma pose: a última foto de cada mês e as diferenças', () => {
    const fotos = [foto('a', '2026-09-03'), foto('a2', '2026-09-20'), foto('b', '2026-10-20'), foto('c', '2026-10-21', 'lado')]
    const m: Medicao[] = [
      { id: '1', data: '2026-09-21', pesoKg: 92, cinturaCm: 98 },
      { id: '2', data: '2026-10-19', pesoKg: 89.5, cinturaCm: 95 },
    ]
    const c = compararFotos(fotos, m, '2026-09', '2026-10', 'frente')
    expect(c.antes?.foto.id).toBe('a2')
    expect(c.depois?.foto.id).toBe('b')
    expect(c.diferencas.pesoKg).toBeCloseTo(-2.5)
    expect(c.diferencas.cinturaCm).toBeCloseTo(-3)
    expect(compararFotos(fotos, m, '2026-09', '2026-10', 'costas')).toEqual({ diferencas: {} })
  })

  it('F9 v1.5 compara também peito, braço, anca e coxa quando medidos nos dois meses', () => {
    const fotos = [foto('a', '2026-09-20'), foto('b', '2026-10-20')]
    const m: Medicao[] = [
      { id: '1', data: '2026-09-20', peitoCm: 100, bracoCm: 33, coxaCm: 58 },
      { id: '2', data: '2026-10-20', peitoCm: 101.5, bracoCm: 34, ancaCm: 99 },
    ]
    expect(compararFotos(fotos, m, '2026-09', '2026-10', 'frente').diferencas).toEqual({ peitoCm: 1.5, bracoCm: 1 })
  })
})
