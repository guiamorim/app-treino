import { describe, expect, it } from 'vitest'
import { lerCopia, type Copia } from './copia'
import { catalogo, perfilExemplo } from './fixtures'
import { aplicarNivelamento, avaliar, contextoDe, degrausPossiveis, fasePorPadrao, linhaDegraus, padraoNoPlano, prioridade, repetirTeste, type FasePadrao, type Tentativa } from './nivelamento'
import { gerarPlano } from './plano'
import type { Anamnese, Sessao } from './types'

const cal: Anamnese = { ...perfilExemplo, restricoes: [], estilo: 'calistenia', equipamento: 'casa', equipamentos: ['barra-fixa', 'paralelas'] }
const contexto = (a: Anamnese) => contextoDe(a, catalogo)
const ctx = contexto(cal)
const tent = (exercicioId: string, valor: number): Tentativa => ({ exercicioId, valor })
const id = (p: ReturnType<typeof avaliar>) => ('fim' in p ? `fim:${p.fim.id}` : 'pedir' in p ? `pedir:${p.pedir.id}` : 'indisponivel')
const plano = gerarPlano({ ...cal, diasPorSemana: 4, experiencia: 'iniciante' }, catalogo, { id: 'p', agora: '2026-11-01T08:00:00.000Z' })

describe('F32 teste de nivelamento', () => {
  it('F32.1 a referência de cada padrão; sem equipamento ou com restrições, o degrau possível abaixo ou nenhum', () => {
    expect(id(avaliar('empurrar', [], ctx))).toBe('pedir:flexoes')
    expect(id(avaliar('puxar-vertical', [], ctx))).toBe('pedir:elevacoes')
    expect(id(avaliar('puxar-horizontal', [], ctx))).toBe('pedir:remada-invertida')
    expect(id(avaliar('joelho', [], ctx))).toBe('pedir:agachamento-bulgaro')
    expect(id(avaliar('anca', [], ctx))).toBe('pedir:ponte-gluteos-unilateral')
    expect(id(avaliar('core', [], ctx))).toBe('pedir:hollow')
    const semBarra = contexto({ ...cal, equipamentos: [] })
    expect(id(avaliar('puxar-vertical', [], semBarra))).toBe('indisponivel')
    expect(degrausPossiveis('puxar-vertical', semBarra)).toEqual([])
    const joelho = contexto({ ...cal, restricoes: [{ area: 'joelho', intensidade: 3, avaliadaPorProfissional: true }] })
    expect(id(avaliar('joelho', [], joelho))).toBe('pedir:agachamento-peso-corporal')
  })

  it('F32.1 um padrão que não está no plano fica de fora', () => {
    expect(padraoNoPlano('empurrar', plano, {}, catalogo)).toBe(true)
    const semPuxar = { ...plano, treinos: plano.treinos.map((t) => ({ ...t, prescricoes: t.prescricoes.filter((p) => !['elevacoes-negativas', 'suspensao-ativa'].includes(p.exercicioId)) })) }
    expect(padraoNoPlano('puxar-vertical', semPuxar, {}, catalogo)).toBe(false)
  })

  it('F32.3 colocação: topo sobe um degrau, faixa fica, abaixo pede o degrau de baixo', () => {
    expect(id(avaliar('empurrar', [tent('flexoes', 15)], ctx))).toBe('fim:flexoes-declinadas')
    expect(id(avaliar('empurrar', [tent('flexoes', 40)], ctx))).toBe('fim:flexoes-declinadas')
    expect(id(avaliar('empurrar', [tent('flexoes', 8)], ctx))).toBe('fim:flexoes')
    expect(id(avaliar('empurrar', [tent('flexoes', 3)], ctx))).toBe('pedir:flexoes-joelhos')
    expect(id(avaliar('empurrar', [tent('flexoes', 3), tent('flexoes-joelhos', 6)], ctx))).toBe('fim:flexoes-joelhos')
    expect(id(avaliar('empurrar', [tent('flexoes', 3), tent('flexoes-joelhos', 2)], ctx))).toBe('fim:flexoes-inclinadas')
    // Em segundos, com a faixa própria do exercício (hollow 15–45 s).
    expect(id(avaliar('core', [tent('hollow', 45)], ctx))).toBe('fim:l-sit-encolhido')
    expect(id(avaliar('core', [tent('hollow', 10)], ctx))).toBe('pedir:hollow-fletido')
    // Com objetivo força, a faixa dos compostos é 4–8.
    expect(id(avaliar('empurrar', [tent('flexoes', 8)], contexto({ ...cal, objetivo: 'forca' })))).toBe('fim:flexoes-declinadas')
    // No primeiro degrau possível, abaixo do mínimo fica nele.
    const joelho = contexto({ ...cal, restricoes: [{ area: 'joelho', intensidade: 3, avaliadaPorProfissional: true }] })
    expect(id(avaliar('joelho', [tent('agachamento-peso-corporal', 5)], joelho))).toBe('fim:agachamento-peso-corporal')
  })

  it('F32.4 aplicar: o mais alto vai para o degrau do teste e os outros movem-se o mesmo', () => {
    const ids = plano.treinos.flatMap((t) => t.prescricoes.map((p) => p.exercicioId))
    expect(ids).toContain('flexoes-inclinadas')
    expect(ids).toContain('flexoes-joelhos')
    const d = aplicarNivelamento(plano, {}, { empurrar: 'flexoes' }, ctx, '2026-11-02')
    expect(d).toEqual({
      'flexoes-joelhos': { exercicioId: 'flexoes', desde: '2026-11-02' },
      'flexoes-inclinadas': { exercicioId: 'flexoes-joelhos', desde: '2026-11-02' },
    })
    // Para baixo, sem sair da escada; voltar ao exercício original apaga a mudança.
    expect(aplicarNivelamento(plano, d, { empurrar: 'flexoes-inclinadas' }, ctx, '2026-11-03')).toEqual({
      'flexoes-joelhos': { exercicioId: 'flexoes-inclinadas', desde: '2026-11-03' },
      'flexoes-inclinadas': { exercicioId: 'flexoes-parede', desde: '2026-11-03' },
    })
    expect(aplicarNivelamento(plano, d, { empurrar: 'flexoes-joelhos' }, ctx, '2026-11-03')).toEqual({})
    // O que já está no degrau do teste não muda (nem a data).
    expect(aplicarNivelamento(plano, d, { empurrar: 'flexoes' }, ctx, '2026-11-09')).toEqual(d)
    // Sem teste nesse padrão, ou sem o padrão no plano, nada muda.
    expect(aplicarNivelamento(plano, {}, {}, ctx, '2026-11-02')).toEqual({})
  })

  it('F32.5 fase por padrão: exercício atual, nível, degrau, seguinte e dias em falta', () => {
    const d = aplicarNivelamento(plano, {}, { empurrar: 'flexoes' }, ctx, '2026-11-02')
    const fases = fasePorPadrao(plano, d, [], ctx, '2026-11-06')
    const empurrar = fases.find((f) => f.padrao === 'empurrar')!
    expect(empurrar).toMatchObject({ degrau: 4, total: 9, nivel: 1, topo: 15, diasEmFalta: 10 })
    expect(empurrar.atual!.id).toBe('flexoes')
    expect(empurrar.seguinte!.id).toBe('flexoes-declinadas')
    expect(fases.map((f) => f.padrao)).toEqual(['empurrar', 'puxar-vertical', 'puxar-horizontal', 'joelho', 'anca', 'core'])
    // Sem mudança de degrau, os dias contam desde a primeira sessão com o exercício.
    const sessoes: Sessao[] = [{ id: 's', planoId: 'p', treinoId: 't', inicio: '2026-10-20T08:00:00.000Z', exercicios: [{ prescricaoId: 'x', exercicioId: 'flexoes-joelhos', series: [{ carga: 0, reps: 10 }] }] }]
    expect(fasePorPadrao(plano, {}, sessoes, ctx, '2026-11-06').find((f) => f.padrao === 'empurrar')).toMatchObject({ degrau: 3, diasEmFalta: 0 })
  })

  it('F32.5 prioridade: o nível mais baixo; em empate, o mais abaixo na escada; fora do plano não conta', () => {
    const f = (padrao: FasePadrao['padrao'], nivel: 1 | 2 | 3 | 4 | undefined, degrau: number, total: number): FasePadrao => ({ padrao, degrau, total, ...(nivel ? { nivel, atual: catalogo.get('flexoes')! } : {}) })
    expect(prioridade([f('empurrar', 2, 5, 9), f('puxar-vertical', 1, 3, 7), f('core', 1, 4, 6), f('anca', undefined, 0, 3)])!.padrao).toBe('puxar-vertical')
    expect(prioridade([f('empurrar', 3, 6, 9), f('joelho', 2, 3, 7)])!.padrao).toBe('joelho')
    expect(prioridade([f('anca', undefined, 0, 3)])).toBeUndefined()
  })

  it('F32.6 linha temporal: o degrau mais alto de cada sessão e as mudanças', () => {
    const sessao = (inicio: string, ...ids: string[]): Sessao => ({ id: inicio, planoId: 'p', treinoId: 't', inicio, exercicios: ids.map((exercicioId) => ({ prescricaoId: 'x', exercicioId, series: [{ carga: 0, reps: 8 }] })) })
    const vazia: Sessao = { ...sessao('2026-11-04T08:00:00.000Z'), exercicios: [{ prescricaoId: 'x', exercicioId: 'flexoes-diamante', series: [] }] }
    const { pontos, mudancas } = linhaDegraus('empurrar', [sessao('2026-11-03T08:00:00.000Z', 'flexoes'), sessao('2026-11-01T08:00:00.000Z', 'flexoes-inclinadas', 'flexoes-joelhos'), vazia, sessao('2026-11-05T08:00:00.000Z', 'flexoes', 'agachamento-peso-corporal')])
    expect(pontos.map((p) => p.degrau)).toEqual([3, 4, 4])
    expect(mudancas.map((p) => [p.data.slice(0, 10), p.exercicioId])).toEqual([['2026-11-01', 'flexoes-joelhos'], ['2026-11-03', 'flexoes']])
  })

  it('F32.7 repetir o teste depois de um bloco; a cópia guarda o último teste', () => {
    const teste = { data: '2026-11-01', resultados: { empurrar: { tentativas: [tent('flexoes', 8)], exercicioId: 'flexoes' } } }
    const semanas = plano.semanasBloco ?? 5
    const dia = (n: number) => new Date(Date.parse('2026-11-01T12:00:00Z') + n * 86_400_000).toISOString().slice(0, 10)
    expect(repetirTeste(teste, plano, dia(semanas * 7 - 1))).toBe(false)
    expect(repetirTeste(teste, plano, dia(semanas * 7))).toBe(true)
    expect(repetirTeste(undefined, plano, dia(100))).toBe(false)
    const copia: Copia = { formato: 'app-treino', versao: 1, exportadoEm: '2026-11-01T12:00:00.000Z', anamnese: cal, plano: null, sessoes: [], medicoes: [], videos: {}, nivelamento: teste }
    expect(lerCopia(JSON.parse(JSON.stringify(copia)))).toEqual(copia)
    expect(() => lerCopia({ ...copia, nivelamento: { ...teste, resultados: { voar: teste.resultados.empurrar } } })).toThrow()
  })
})
