import { describe, expect, it } from 'vitest'
import { carregarCatalogo } from './catalogo'
import dados from '../catalog/exercicios.json'
import { lerVideo } from './video'

describe('catálogo de exercícios', () => {
  const catalogo = carregarCatalogo(dados)

  it('é válido e tem ids únicos', () => {
    expect(catalogo.size).toBe(dados.length)
  })

  it('todos os substitutos existem e não se referem a si próprios', () => {
    for (const ex of catalogo.values()) {
      for (const s of ex.substitutos) {
        expect(catalogo.has(s), `${ex.id} → ${s}`).toBe(true)
        expect(s).not.toBe(ex.id)
      }
    }
  })

  it('todos os vídeos são de domínios permitidos', () => {
    for (const ex of catalogo.values()) {
      if (ex.video) expect(lerVideo(ex.video), ex.id).not.toBeNull()
    }
  })

  it('rejeita dados inválidos', () => {
    expect(() => carregarCatalogo([{ id: 'x' }])).toThrow()
    expect(() =>
      carregarCatalogo([{ ...dados[0], substitutos: ['nao-existe'] }]),
    ).toThrow(/nao-existe/)
  })
})
