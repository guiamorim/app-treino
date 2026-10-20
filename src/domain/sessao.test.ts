import { describe, expect, it } from 'vitest'
import { estadoExercicio, estadoSessao, historicoExercicio, proximoTreino } from './sessao'
import { gerarPlano, treinoEfetivo } from './plano'
import { catalogo, perfilExemplo } from './fixtures'
import type { Prescricao, RegistoExercicio, Sessao } from './types'

const plano = gerarPlano(perfilExemplo, catalogo, { id: 'p1', agora: '2026-10-20T08:00:00.000Z' })
const pr: Prescricao = { id: 'x-1', exercicioId: 'leg-press', series: 3, faixa: [6, 10], rir: [1, 3], descansoSeg: 120 }
const reg = (r: Partial<RegistoExercicio>): RegistoExercicio => ({ prescricaoId: 'x-1', exercicioId: 'leg-press', series: [], ...r })
const serie = { carga: 100, reps: 8 }

function sessao(treinoId: string, inicio: string, extra: Partial<Sessao> = {}): Sessao {
  return { id: `${treinoId}-${inicio}`, planoId: 'p1', treinoId, inicio, exercicios: [], ...extra }
}

describe('F3 estado dos exercícios e da sessão', () => {
  it('por fazer → em curso → feito (todas as séries ou concluído manualmente)', () => {
    expect(estadoExercicio(undefined, pr)).toBe('por-fazer')
    expect(estadoExercicio(reg({}), pr)).toBe('por-fazer')
    expect(estadoExercicio(reg({ series: [serie] }), pr)).toBe('em-curso')
    expect(estadoExercicio(reg({ series: [serie, serie, serie] }), pr)).toBe('feito')
    expect(estadoExercicio(reg({ series: [serie], concluido: true }), pr)).toBe('feito')
    expect(estadoExercicio(reg({ saltado: true }), pr)).toBe('saltado')
  })

  it('F3.4 sessão completa quando todos estão feitos ou saltados', () => {
    const treino = plano.treinos[0]!
    const exercicios = treino.prescricoes.map((p, i) =>
      reg({ prescricaoId: p.id, exercicioId: p.exercicioId, ...(i === 0 ? { saltado: true } : { concluido: true, series: [serie] }) }),
    )
    const completa = estadoSessao(sessao(treino.id, '2026-10-20T10:00:00Z', { exercicios }), treino)
    expect(completa).toEqual({ feitos: treino.prescricoes.length - 1, saltados: 1, total: treino.prescricoes.length, completa: true })
    const incompleta = estadoSessao(sessao(treino.id, '2026-10-20T10:00:00Z', { exercicios: exercicios.slice(1) }), treino)
    expect(incompleta.completa).toBe(false)
  })
})

describe('F3.4 sessão completa na readaptação', () => {
  it('2 séries feitas contam como exercício feito nas semanas 1–2', () => {
    const treino = treinoEfetivo(plano.treinos[0]!, plano, 1)
    const exercicios = treino.prescricoes.map((p) => reg({ prescricaoId: p.id, exercicioId: p.exercicioId, series: [serie, serie] }))
    expect(estadoSessao(sessao(treino.id, '2026-10-20T10:00:00Z', { exercicios }), treino).completa).toBe(true)
    expect(estadoSessao(sessao(treino.id, '2026-10-20T10:00:00Z', { exercicios }), plano.treinos[0]!).completa).toBe(false)
  })
})

describe('F3 próximo treino (rotação, não dia da semana)', () => {
  it('começa no primeiro treino', () => {
    expect(proximoTreino(plano, [])).toEqual({ treinoId: 'superior-a' })
  })

  it('segue a sequência depois de uma sessão terminada e volta ao início', () => {
    expect(proximoTreino(plano, [sessao('superior-a', '2026-10-20T10:00:00Z', { fim: '2026-10-20T11:00:00Z' })])).toEqual({ treinoId: 'inferior-a' })
    expect(proximoTreino(plano, [sessao('inferior-b', '2026-10-20T10:00:00Z', { fim: '2026-10-20T11:00:00Z' })])).toEqual({ treinoId: 'superior-a' })
  })

  it('F3.5 uma sessão por terminar é retomada', () => {
    const s = sessao('inferior-a', '2026-10-22T10:00:00Z')
    expect(proximoTreino(plano, [sessao('superior-a', '2026-10-20T10:00:00Z', { fim: 'x' }), s])).toEqual({ treinoId: 'inferior-a', sessaoId: s.id })
  })

  it('ignora sessões de planos antigos', () => {
    expect(proximoTreino(plano, [{ ...sessao('superior-a', '2026-10-20T10:00:00Z', { fim: 'x' }), planoId: 'antigo' }])).toEqual({ treinoId: 'superior-a' })
  })
})

describe('histórico por exercício', () => {
  it('ordena por data, exclui a sessão atual e registos vazios', () => {
    const a = sessao('t', '2026-10-25T10:00:00Z', { exercicios: [reg({ series: [{ carga: 110, reps: 8 }] })] })
    const b = sessao('t', '2026-10-20T10:00:00Z', { exercicios: [reg({ series: [serie] }), reg({ exercicioId: 'outro', series: [serie] })] })
    const atual = sessao('t', '2026-10-28T10:00:00Z', { exercicios: [reg({ series: [serie] })] })
    const vazia = sessao('t', '2026-10-26T10:00:00Z', { exercicios: [reg({ saltado: true })] })
    const h = historicoExercicio([a, atual, b, vazia], 'leg-press', atual.id)
    expect(h.map((x) => x.series[0]!.carga)).toEqual([100, 110])
  })
})
