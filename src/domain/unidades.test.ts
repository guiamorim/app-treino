import { afterEach, describe, expect, it } from 'vitest'
import { definirUnidade, deUnidade, paraCampo, paraUnidade, peso, unidadeDoDispositivo } from './unidades'

afterEach(() => definirUnidade('kg'))

describe('F22.9 quilos ou libras', () => {
  it('por omissão: libras num telemóvel em inglês dos EUA, quilos nos restantes', () => {
    expect(unidadeDoDispositivo(['en-US', 'pt-PT'])).toBe('lb')
    expect(unidadeDoDispositivo(['en-GB'])).toBe('kg')
    expect(unidadeDoDispositivo(['pt-PT', 'en-US'])).toBe('kg')
    expect(unidadeDoDispositivo([])).toBe('kg')
  })

  it('os dados ficam em quilos: escrever 135 lb e mostrar de volta dá 135 lb', () => {
    definirUnidade('lb')
    const guardado = deUnidade(135)
    expect(guardado).toBeCloseTo(61.235, 3)
    expect(paraCampo(guardado)).toBe('135')
    expect(peso(guardado)).toBe('135 lb')
    expect(peso(60, 'kg')).toBe('60 kg')
    expect(paraUnidade(60)).toBeCloseTo(132.277, 3)
  })

  it('em quilos nada muda', () => {
    expect(deUnidade(62.5)).toBe(62.5)
    expect(peso(62.5)).toBe('62,5 kg')
  })
})
