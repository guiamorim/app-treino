import { describe, expect, it } from 'vitest'
import { admitePesoExtra, incrementoDaForma, rotuloCarga, semCarga, tipoCarga, tiposCarga } from './carga'
import { lerCopia, type Copia } from './copia'
import { desdeQuando, diasEntre, escadaDe, escadas, mudarDegrau, planoComDegraus, posicaoNaEscada } from './escadas'
import { catalogo, perfilExemplo } from './fixtures'
import { equipamentoDisponivel, gerarPlano, motivoIncompatibilidade } from './plano'
import { sugerir, type NaEscada } from './progressao'
import type { Anamnese, Prescricao, RegistoExercicio, Serie, Sessao } from './types'

const ex = (id: string) => catalogo.get(id)!
const casa: Anamnese = { ...perfilExemplo, restricoes: [], equipamento: 'casa', equipamentos: [] }
const pr: Prescricao = { id: 'superior-a-1', exercicioId: 'flexoes', series: 3, faixa: [8, 20], rir: [1, 3], descansoSeg: 90 }
const s = (reps: number, rir?: number): Serie => ({ carga: 0, reps, ...(rir !== undefined ? { rir } : {}) })
const reg = (series: Serie[], dor?: number): RegistoExercicio => ({ prescricaoId: pr.id, exercicioId: 'flexoes', series, ...(dor !== undefined ? { dor } : {}) })
const topo = reg([s(20, 2), s(20, 1), s(20, 2)])
const escadaFlexoes: NaEscada = { anterior: ex('flexoes-inclinadas'), seguinte: ex('flexoes-declinadas'), diasNoDegrau: 20, pesoExtra: true }
const base = { prescricao: pr, exercicio: ex('flexoes'), readaptacao: false, escada: escadaFlexoes }

describe('F30 progressão por variação', () => {
  it('F30.1 cada degrau existe no catálogo, faz-se sem carga obrigatória e está numa só escada', () => {
    const vistos = new Set<string>()
    for (const e of escadas()) {
      expect(e.degraus.length).toBeGreaterThan(1)
      for (const id of e.degraus) {
        expect(catalogo.has(id), id).toBe(true)
        expect(ex(id).equipamento.some((q) => ['peso-corporal', 'barra-fixa', 'paralelas'].includes(q)), id).toBe(true)
        expect(vistos.has(id), id).toBe(false)
        vistos.add(id)
      }
    }
    expect(escadaDe('flexoes')?.nome).toBe('Flexões')
    expect(escadaDe('supino-barra')).toBeUndefined()
  })

  it('F30.2 a posição salta os degraus que a pessoa não pode fazer', () => {
    const p = posicaoNaEscada(ex('flexoes'), catalogo, () => true)!
    expect(p).toMatchObject({ degrau: 4, total: 9, anterior: { id: 'flexoes-joelhos' }, seguinte: { id: 'flexoes-declinadas' } })
    // Sem barra fixa, os outros degraus de puxar na vertical saem da escada.
    const semBarra = posicaoNaEscada(ex('elevacoes'), catalogo, (x) => !motivoIncompatibilidade(x, { ...casa, equipamentos: ['barra'] }))!
    expect(semBarra).toMatchObject({ degrau: 1, total: 1 })
    expect(semBarra.seguinte).toBeUndefined()
    expect(posicaoNaEscada(ex('supino-barra'), catalogo, () => true)).toBeUndefined()
  })

  it('F30.2 mudar de degrau fica guardado por exercício do plano; voltar à origem apaga a mudança', () => {
    let d = mudarDegrau({}, 'flexoes', 'flexoes-declinadas', '2026-11-01')
    expect(d).toEqual({ flexoes: { exercicioId: 'flexoes-declinadas', desde: '2026-11-01' } })
    d = mudarDegrau(d, 'flexoes-declinadas', 'flexoes-diamante', '2026-11-20')
    expect(d).toEqual({ flexoes: { exercicioId: 'flexoes-diamante', desde: '2026-11-20' } })
    expect(mudarDegrau(d, 'flexoes-diamante', 'flexoes', '2026-12-01')).toEqual({})
  })

  it('F30.2 o plano mostrado usa a variação atual, com nota; o plano guardado não muda', () => {
    const plano = gerarPlano(casa, catalogo, { id: 'p', agora: '2026-10-20T08:00:00.000Z' })
    const comFlexoes = plano.treinos.flatMap((t) => t.prescricoes).filter((p) => p.exercicioId === 'flexoes')
    expect(comFlexoes.length).toBeGreaterThan(0)
    expect(planoComDegraus(plano, {}, catalogo)).toBe(plano)
    const mostrado = planoComDegraus(plano, { flexoes: { exercicioId: 'flexoes-declinadas', desde: '2026-11-01' } }, catalogo)
    for (const p of comFlexoes) {
      const q = mostrado.treinos.flatMap((t) => t.prescricoes).find((x) => x.id === p.id)!
      expect(q).toMatchObject({ exercicioId: 'flexoes-declinadas', series: p.series, faixa: p.faixa, nota: 'Variação atual (o plano tinha «Flexões de braços»).' })
    }
    expect(plano.treinos.flatMap((t) => t.prescricoes).filter((p) => p.exercicioId === 'flexoes')).toEqual(comFlexoes)
    // Um exercício que deixou de existir no catálogo é ignorado.
    expect(planoComDegraus(plano, { flexoes: { exercicioId: 'nao-existe', desde: '2026-11-01' } }, catalogo)).toBe(plano)
  })

  it('F30.2 dias no degrau: desde a mudança ou, sem ela, desde a primeira sessão registada', () => {
    const sessao = (inicio: string, exercicioId: string): Sessao => ({ id: inicio, planoId: 'p', treinoId: 't', inicio, exercicios: [{ prescricaoId: 'x', exercicioId, series: [s(10)] }] })
    const sessoes = [sessao('2026-10-21T10:00:00.000Z', 'flexoes'), sessao('2026-10-25T10:00:00.000Z', 'flexoes')]
    expect(desdeQuando({}, 'flexoes', sessoes)).toBe('2026-10-21')
    expect(desdeQuando({ flexoes: { exercicioId: 'flexoes-declinadas', desde: '2026-11-01' } }, 'flexoes-declinadas', sessoes)).toBe('2026-11-01')
    expect(desdeQuando({}, 'elevacoes', sessoes)).toBeUndefined()
    expect(diasEntre('2026-10-21', '2026-11-04')).toBe(14)
  })

  it('4.8 sobe de degrau com o topo e RIR ≥ 1 em 2 sessões seguidas e 14 dias no degrau', () => {
    const r = sugerir({ ...base, historico: [topo, topo] })
    expect(r.variacao).toEqual({ exercicioId: 'flexoes-declinadas', nome: 'Flexões declinadas (pés elevados)', sentido: 'subir' })
    expect(r.motivo).toMatch(/2 sessões seguidas: passa para «Flexões declinadas/)
  })

  it('4.8 uma sessão no topo ainda não chega; a sugestão diz que falta uma', () => {
    const r = sugerir({ ...base, historico: [reg([s(15), s(14)]), topo] })
    expect(r.variacao).toBeUndefined()
    expect(r.motivo).toMatch(/Mais uma sessão assim e passas para «Flexões declinadas/)
  })

  it('4.8 com menos de 14 dias no degrau, diz quantos faltam', () => {
    const r = sugerir({ ...base, escada: { ...escadaFlexoes, diasNoDegrau: 10 }, historico: [topo, topo] })
    expect(r.variacao).toBeUndefined()
    expect(r.motivo).toMatch(/daqui a 4 dia\(s\)/)
  })

  it('4.8 até à falha, com dor ≥ 4, em readaptação ou em descarga não sobe de degrau', () => {
    const falha = reg([s(20, 0), s(20, 1), s(20, 1)])
    expect(sugerir({ ...base, historico: [topo, falha] }).variacao).toBeUndefined()
    expect(sugerir({ ...base, historico: [topo, reg(topo.series, 4)] })).toMatchObject({ alerta: 'substituir' })
    expect(sugerir({ ...base, historico: [topo, reg(topo.series, 4)] }).variacao).toBeUndefined()
    expect(sugerir({ ...base, readaptacao: true, historico: [topo] }).variacao).toBeUndefined()
    expect(sugerir({ ...base, descarga: true, historico: [topo, topo] }).variacao).toBeUndefined()
  })

  it('F30.4 transição suave: na primeira sessão da variação, a 1.ª série aqui e as restantes na anterior', () => {
    const r = sugerir({ ...base, historico: [] })
    expect(r).toMatchObject({ carga: null, reps: 8 })
    expect(r.motivo).toBe('Primeira vez nesta variação: faz a 1.ª série aqui e, se não chegares a 8 reps, faz as restantes em «Flexões inclinadas (mãos num banco)».')
  })

  it('F30.5 abaixo do mínimo em 2 sessões seguidas: volta ao degrau anterior; sem ele, nunca «baixa a carga»', () => {
    const abaixo = reg([s(6), s(5)])
    const r = sugerir({ ...base, historico: [abaixo, abaixo] })
    expect(r.variacao).toEqual({ exercicioId: 'flexoes-inclinadas', nome: 'Flexões inclinadas (mãos num banco)', sentido: 'descer' })
    const semAnterior = sugerir({ ...base, escada: { seguinte: ex('flexoes'), pesoExtra: true }, historico: [abaixo, abaixo] })
    expect(semAnterior.variacao).toBeUndefined()
    expect(semAnterior.motivo).toMatch(/variação mais fácil ou faz menos amplitude/)
    // Mesmo fora de uma escada, um exercício sem carga não sugere baixar a carga.
    expect(sugerir({ prescricao: pr, exercicio: ex('dead-bug'), readaptacao: false, historico: [abaixo, abaixo] }).motivo).not.toMatch(/baixa a carga/)
  })

  it('F30.6 no último degrau sugere peso extra; com peso extra vale a dupla progressão de 2,5 kg', () => {
    const r = sugerir({ ...base, escada: { anterior: ex('flexoes-declinadas'), diasNoDegrau: 30, pesoExtra: true }, historico: [topo, topo] })
    expect(r.variacao).toBeUndefined()
    expect(r.motivo).toMatch(/último degrau da escada: acrescenta peso extra/)
    expect(tiposCarga(ex('flexoes'))).toEqual(['corporal', 'peso-extra'])
    expect(tiposCarga(ex('elevacoes'))).toEqual(['corporal', 'peso-extra'])
    expect(tiposCarga(ex('dead-bug'))).toEqual([])
    expect(admitePesoExtra(ex('prancha'))).toBe(false)
    expect(tipoCarga(ex('flexoes'), {})).toBe('corporal')
    expect(rotuloCarga('peso-extra', 'kg')).toBe('Peso extra (kg)')
    expect(semCarga(ex('flexoes'), 'corporal')).toBe(true)
    expect(semCarga(ex('flexoes'), 'peso-extra')).toBe(false)
    const comPeso = { ...ex('flexoes'), incrementoKg: incrementoDaForma(ex('flexoes'), 'peso-extra') }
    const h = [{ ...topo, series: topo.series.map((x) => ({ ...x, carga: 5 })), tipoCarga: 'peso-extra' as const }]
    // O peso extra ignora a escada: sobe a carga (5 kg + metade de 2,5, por ser leve) e volta ao mínimo.
    expect(sugerir({ ...base, exercicio: comPeso, historico: h })).toMatchObject({ carga: 6.25, reps: 8, subiu: true })
  })

  it('F30.7 sem escolha, a forma por omissão segue o equipamento que tenho; sem nenhum, só o corpo', () => {
    expect(tipoCarga(ex('afundos'), {}, equipamentoDisponivel({ ...casa, equipamentos: ['halteres'] }))).toBe('halter')
    expect(tipoCarga(ex('afundos'), {}, equipamentoDisponivel(casa))).toBe('corporal')
    expect(tipoCarga(ex('afundos'), { afundos: 'halter' }, equipamentoDisponivel(casa))).toBe('halter')
    // Sem lista, como antes (F24.2).
    expect(tipoCarga(ex('afundos'), {})).toBe('halter')
  })

  it('F30.8 a cópia guarda o degrau de cada exercício e rejeita datas inválidas', () => {
    const copia: Copia = { formato: 'app-treino', versao: 1, exportadoEm: '2026-11-01T12:00:00.000Z', anamnese: null, plano: null, sessoes: [], medicoes: [], videos: {}, degraus: { flexoes: { exercicioId: 'flexoes-declinadas', desde: '2026-11-01' } } }
    expect(lerCopia(JSON.parse(JSON.stringify(copia)))).toEqual(copia)
    expect(() => lerCopia({ ...copia, degraus: { flexoes: { exercicioId: 'flexoes-declinadas', desde: 'ontem' } } })).toThrow()
    const { degraus: _, ...antiga } = copia
    expect(lerCopia(antiga)).toEqual(antiga)
  })
})
