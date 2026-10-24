import { describe, expect, it } from 'vitest'
import dados from '../catalog/exercicios.json'
import corpos from '../ui/corpo/corpos.json'
import { carregarCatalogo } from './catalogo'
import { destaques, destaquesPorRegiao, REGIOES_POR_GRUPO } from './musculos'
import { GRUPOS_MUSCULARES } from './types'

describe('F18 imagens dos músculos', () => {
  it('cada grupo muscular existe no desenho masculino e no feminino', () => {
    for (const sexo of ['masculino', 'feminino'] as const) {
      const regioes = new Set([...corpos[sexo].frente.partes, ...corpos[sexo].costas.partes].map((p) => p.regiao))
      for (const g of GRUPOS_MUSCULARES) for (const r of REGIOES_POR_GRUPO[g]) expect(regioes.has(r), `${sexo}: ${g} → ${r}`).toBe(true)
    }
  })

  it('o grupo principal fica destacado e os secundários mais claros', () => {
    expect(destaques({ grupoPrincipal: 'peito', gruposSecundarios: ['triceps', 'ombros'] })).toEqual({ peito: 'principal', triceps: 'secundario', ombros: 'secundario' })
    expect(destaques({ grupoPrincipal: 'core', gruposSecundarios: ['core'] })).toEqual({ core: 'principal' })
    const r = destaquesPorRegiao({ grupoPrincipal: 'core', gruposSecundarios: ['costas'] })
    expect(r.get('lower-back')).toEqual({ grupo: 'core', destaque: 'principal' })
    expect(r.get('upper-back')).toEqual({ grupo: 'costas', destaque: 'secundario' })
    expect(r.has('chest')).toBe(false)
  })

  it('todos os exercícios do catálogo têm o grupo principal visível', () => {
    for (const ex of carregarCatalogo(dados).values()) expect([...destaquesPorRegiao(ex).values()].some((x) => x.destaque === 'principal'), ex.id).toBe(true)
  })
})
