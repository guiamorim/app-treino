import { describe, expect, it } from 'vitest'
import { cardioEntre, intensidade, META_OMS, minutosEquivalentes, testeDaFala, validarCardio, zonasFc, type RegistoCardio } from './cardio'

const reg = (id: string, data: string, minutos: number, esforco: number): RegistoCardio => ({ id, data, modalidade: 'caminhada', minutos, esforco })

describe('F36.2 registo de cardio', () => {
  const base = { data: '2026-10-20T10:00:00.000Z', modalidade: 'bicicleta' as const, minutos: 30, esforco: 6 }

  it('modalidade, minutos e esforço são obrigatórios; distância e FC são opcionais', () => {
    expect(validarCardio(base, '2026-10-20', '2026-10-21')).toBeNull()
    expect(validarCardio({ ...base, distanciaKm: 12.5, fcMedia: 132 }, '2026-10-20', '2026-10-21')).toBeNull()
    expect(validarCardio({ ...base, modalidade: 'patins' as never }, '2026-10-20', '2026-10-21')).toBe('modalidade')
    expect(validarCardio({ ...base, minutos: 0 }, '2026-10-20', '2026-10-21')).toBe('minutos')
    expect(validarCardio({ ...base, minutos: 301 }, '2026-10-20', '2026-10-21')).toBe('minutos')
    expect(validarCardio({ ...base, minutos: 12.5 }, '2026-10-20', '2026-10-21')).toBe('minutos')
    expect(validarCardio({ ...base, esforco: 11 }, '2026-10-20', '2026-10-21')).toBe('esforco')
    expect(validarCardio({ ...base, distanciaKm: 0 }, '2026-10-20', '2026-10-21')).toBe('distancia')
    expect(validarCardio({ ...base, fcMedia: 250 }, '2026-10-20', '2026-10-21')).toBe('fc')
  })

  it('não aceita dias no futuro', () => {
    expect(validarCardio(base, '2026-10-22', '2026-10-21')).toBe('data')
    expect(validarCardio(base, '', '2026-10-21')).toBe('data')
  })

  it('esforço 0–4 leve, 5–6 moderado, 7–10 vigoroso, com o teste da fala', () => {
    expect([0, 4, 5, 6, 7, 10].map(intensidade)).toEqual(['leve', 'leve', 'moderada', 'moderada', 'vigorosa', 'vigorosa'])
    expect(testeDaFala(5)).toContain('não cantar')
    expect(testeDaFala(8)).toContain('algumas palavras')
    expect(testeDaFala(10)).toContain('não consegues falar')
  })

  it('zonas de frequência cardíaca pela idade (Tanaka), só como nota', () => {
    const z = zonasFc(40)
    expect(z.max).toBe(180)
    expect(z.moderada).toEqual([115, 137])
    expect(z.vigorosa).toEqual([139, 171])
  })
})

describe('F36.3 minutos da semana comparados com a OMS', () => {
  it('vigoroso conta a dobrar e leve não conta', () => {
    expect(minutosEquivalentes({ minutos: 30, esforco: 6 })).toBe(30)
    expect(minutosEquivalentes({ minutos: 30, esforco: 8 })).toBe(60)
    expect(minutosEquivalentes({ minutos: 30, esforco: 3 })).toBe(0)
    expect(META_OMS).toEqual([150, 300])
  })

  it('soma só os registos da semana, por ordem de data', () => {
    const lista = [
      reg('c', '2026-10-22T18:00:00.000Z', 20, 8),
      reg('a', '2026-10-19T08:00:00.000Z', 40, 5),
      reg('b', '2026-10-20T08:00:00.000Z', 30, 2),
      reg('fora', '2026-10-26T08:00:00.000Z', 60, 6),
    ]
    const r = cardioEntre(lista, new Date('2026-10-19T00:00:00.000Z'), new Date('2026-10-26T00:00:00.000Z'))
    expect(r.registos.map((x) => x.id)).toEqual(['a', 'b', 'c'])
    expect(r.minutos).toBe(90)
    expect(r.moderados).toBe(40)
    expect(r.vigorosos).toBe(20)
    expect(r.equivalentes).toBe(80)
  })
})
