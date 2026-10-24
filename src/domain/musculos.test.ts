import { describe, expect, it } from 'vitest'
import dados from '../catalog/exercicios.json'
import { carregarCatalogo } from './catalogo'
import { destaques, GRUPOS_POR_VISTA } from './musculos'
import { GRUPOS_MUSCULARES } from './types'

describe('F18 imagens dos músculos', () => {
  it('cada grupo muscular aparece pelo menos numa vista do corpo', () => {
    const visiveis = new Set([...GRUPOS_POR_VISTA.frente, ...GRUPOS_POR_VISTA.costas])
    for (const g of GRUPOS_MUSCULARES) expect(visiveis.has(g), g).toBe(true)
  })

  it('o grupo principal fica destacado e os secundários mais claros', () => {
    expect(destaques({ grupoPrincipal: 'peito', gruposSecundarios: ['triceps', 'ombros'] })).toEqual({ peito: 'principal', triceps: 'secundario', ombros: 'secundario' })
    expect(destaques({ grupoPrincipal: 'core', gruposSecundarios: ['core'] })).toEqual({ core: 'principal' })
  })

  it('todos os exercícios do catálogo têm o grupo principal visível', () => {
    for (const ex of carregarCatalogo(dados).values()) expect(Object.values(destaques(ex))).toContain('principal')
  })
})
