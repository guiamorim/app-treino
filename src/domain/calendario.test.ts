import { describe, expect, it } from 'vitest'
import { diaDaSemana, diaLocal, grelhaMes, previsao, proximosTreinos, sessoesDoDia } from './calendario'
import { catalogo, perfilExemplo } from './fixtures'
import { gerarPlano } from './plano'
import type { Sessao } from './types'

const plano = gerarPlano(perfilExemplo, catalogo, { id: 'p1', agora: '2026-10-01T08:00:00.000Z' })
const ids = plano.treinos.map((t) => t.id)
const local = (dia: string, hora = 10) => new Date(`${dia}T${String(hora).padStart(2, '0')}:00:00`).toISOString()
const sessao = (dia: string, treinoId: string, fim = true): Sessao => ({
  id: `s-${dia}`, planoId: 'p1', treinoId, inicio: local(dia), ...(fim ? { fim: local(dia, 11) } : {}),
  exercicios: [{ prescricaoId: 'x', exercicioId: 'leg-press', series: [{ carga: 100, reps: 10 }] }],
})
// 2026-11-02 é segunda-feira. Dias: segunda, quarta, sexta e sábado.
const DIAS = [0, 2, 4, 5]

describe('F25 calendário', () => {
  it('dias da semana de segunda (0) a domingo (6), e o dia local de um treino', () => {
    expect(diaDaSemana('2026-11-02')).toBe(0)
    expect(diaDaSemana('2026-11-08')).toBe(6)
    expect(diaLocal(new Date(2026, 10, 2, 23, 30))).toBe('2026-11-02')
  })

  it('F25.2 sem dias escolhidos não há datas; a lista segue a rotação', () => {
    expect(previsao(plano, [], undefined, '2026-11-02', '2026-11-30')).toEqual([])
    expect(proximosTreinos(plano, [sessao('2026-10-30', ids[0]!)], 3)).toEqual([ids[1], ids[2], ids[3]])
  })

  it('F25.2 a rotação vai para os dias escolhidos, a partir do próximo treino', () => {
    const sessoes = [sessao('2026-10-30', ids[0]!)]
    expect(previsao(plano, sessoes, DIAS, '2026-11-02', '2026-11-09')).toEqual([
      { dia: '2026-11-02', treinoId: ids[1] },
      { dia: '2026-11-04', treinoId: ids[2] },
      { dia: '2026-11-06', treinoId: ids[3] },
      { dia: '2026-11-07', treinoId: ids[0] },
      { dia: '2026-11-09', treinoId: ids[1] },
    ])
  })

  it('F25.2 com o treino de hoje terminado, a previsão começa amanhã; treinar noutro dia reajusta-a', () => {
    const hoje = [sessao('2026-11-02', ids[0]!)]
    expect(previsao(plano, hoje, DIAS, '2026-11-02', '2026-11-04')).toEqual([{ dia: '2026-11-04', treinoId: ids[1] }])
    // Treinou na terça (fora dos dias): quarta passa a ter o treino seguinte.
    const terca = [...hoje, sessao('2026-11-03', ids[1]!)]
    expect(previsao(plano, terca, DIAS, '2026-11-03', '2026-11-04')).toEqual([{ dia: '2026-11-04', treinoId: ids[2] }])
  })

  it('F25.2 um treino a meio hoje continua a ser o de hoje', () => {
    const aMeio = [sessao('2026-11-02', ids[2]!, false)]
    expect(previsao(plano, aMeio, DIAS, '2026-11-02', '2026-11-02')).toEqual([{ dia: '2026-11-02', treinoId: ids[2] }])
  })

  it('F25.3 grelha do mês de segunda a domingo e sessões do dia', () => {
    const g = grelhaMes(2026, 11)
    expect(g[0]).toEqual([null, null, null, null, null, null, '2026-11-01'])
    expect(g.flat().filter(Boolean)).toHaveLength(30)
    expect(g.every((s) => s.length === 7)).toBe(true)
    const s = sessao('2026-11-02', ids[0]!)
    expect(sessoesDoDia([s, { ...s, id: 'vazia', exercicios: [], fim: undefined }], '2026-11-02')).toEqual([s])
  })
})
