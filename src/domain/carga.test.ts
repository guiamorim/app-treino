import { describe, expect, it } from 'vitest'
import { barrasKg, mesmaForma, rotuloCarga, tipoCarga, tipoPadrao, tiposCarga, totalComBarra } from './carga'
import { catalogo } from './fixtures'
import type { RegistoExercicio } from './types'
import { KG_POR_LB } from './unidades'

const ex = (id: string) => catalogo.get(id)!

describe('F24 tipo de carga', () => {
  it('F24.1 a forma de contar vem do equipamento, e o rótulo di-lo', () => {
    expect(tiposCarga(ex('supino-halteres-neutro'))).toEqual(['halter'])
    expect(tiposCarga(ex('supino-barra'))).toEqual(['total'])
    expect(tiposCarga(ex('puxada-frente'))).toEqual(['maquina'])
    expect(tiposCarga(ex('prancha'))).toEqual([])
    expect(rotuloCarga('halter', 'kg')).toBe('Carga (kg por halter)')
    expect(rotuloCarga('total', 'lb')).toBe('Carga total (lb)')
    expect(rotuloCarga('maquina', 'kg')).toBe('Carga (kg na máquina)')
  })

  it('F24.2 com mais de um equipamento, vale a escolha guardada; sem ela, o primeiro com carga', () => {
    expect(tiposCarga(ex('ponte-gluteos'))).toEqual(['corporal', 'halter'])
    expect(tipoPadrao(ex('ponte-gluteos'))).toBe('halter')
    expect(tipoCarga(ex('gemeos-pe'), {})).toBe('maquina')
    expect(tipoCarga(ex('gemeos-pe'), { 'gemeos-pe': 'halter' })).toBe('halter')
    // Uma escolha que o exercício não admite é ignorada.
    expect(tipoCarga(ex('gemeos-pe'), { 'gemeos-pe': 'total' })).toBe('maquina')
  })

  it('F24.3 a sugestão só compara sessões contadas da mesma forma; os registos antigos contam como a forma por omissão', () => {
    const reg = (tipoCarga?: RegistoExercicio['tipoCarga']): RegistoExercicio => ({ prescricaoId: 'p', exercicioId: 'gemeos-pe', series: [{ carga: 20, reps: 10 }], ...(tipoCarga ? { tipoCarga } : {}) })
    const historico = [reg(), reg('halter'), reg('maquina')]
    expect(mesmaForma(historico, ex('gemeos-pe'), 'maquina')).toEqual([historico[0], historico[2]])
    expect(mesmaForma(historico, ex('gemeos-pe'), 'halter')).toEqual([historico[1]])
  })

  it('F24.4 discos por lado: guarda-se o total com a barra; barras de 20/15/10 kg ou 45/35/25 lb', () => {
    expect(totalComBarra(20, 15)).toBe(50)
    expect(barrasKg('kg')).toEqual([20, 15, 10])
    expect(barrasKg('lb')[0]).toBeCloseTo(45 * KG_POR_LB)
  })
})
