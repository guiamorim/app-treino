import { describe, expect, it } from 'vitest'
import dados from '../novidades.json'
import pacote from '../../package.json'
import { carregarNovidades, compararVersoes, lerNovidades, novidadesDepois, novidadesPorVer, versaoAtual } from './novidades'

const novidades = carregarNovidades(dados)
const exemplo = carregarNovidades({
  versoes: [
    { versao: '1.10.0', data: '2026-11-02', itens: ['C'] },
    { versao: '1.9.1', data: '2026-11-01', itens: ['B'] },
    { versao: '1.9.0', data: '2026-10-30', itens: ['A'] },
  ],
  emPreparacao: [],
})

describe('F20 novidades', () => {
  it('ficheiro de novidades válido, da versão mais nova para a mais antiga', () => {
    const versoes = novidades.versoes.map((v) => v.versao)
    expect([...versoes].sort((a, b) => compararVersoes(b, a))).toEqual(versoes)
    expect(new Set(versoes).size).toBe(versoes.length)
  })

  it('a versão da app é a mais recente do ficheiro e a mesma do package.json', () => {
    expect(versaoAtual(novidades)).toBe(pacote.version)
  })

  it('compara versões por número, não por texto', () => {
    expect(compararVersoes('1.10.0', '1.9.0')).toBeGreaterThan(0)
    expect(compararVersoes('1.9.0', '1.9.1')).toBeLessThan(0)
    expect(compararVersoes('2.0.0', '2.0.0')).toBe(0)
  })

  it('resumo da versão nova: só o que é mais recente do que a versão instalada', () => {
    expect(novidadesDepois(exemplo, '1.9.0').map((v) => v.versao)).toEqual(['1.10.0', '1.9.1'])
    expect(novidadesDepois(exemplo, '1.10.0')).toEqual([])
  })

  it('depois de atualizar: mostra as versões ainda não vistas, uma vez', () => {
    expect(novidadesPorVer(exemplo, '1.9.0', true).map((v) => v.versao)).toEqual(['1.10.0', '1.9.1'])
    expect(novidadesPorVer(exemplo, '1.10.0', true)).toEqual([])
  })

  it('instalação nova não mostra novidades; quem já tinha plano vê as da versão atual', () => {
    expect(novidadesPorVer(exemplo, undefined, false)).toEqual([])
    expect(novidadesPorVer(exemplo, undefined, true).map((v) => v.versao)).toEqual(['1.10.0'])
  })

  it('ficheiro vindo da rede inválido é ignorado', () => {
    expect(lerNovidades({ versoes: [] })).toBeNull()
    expect(lerNovidades('<html>')).toBeNull()
    expect(lerNovidades(dados)).not.toBeNull()
  })
})
