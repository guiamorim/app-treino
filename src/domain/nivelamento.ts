// F32 (v1.21): teste de nivelamento opcional, fase por padrão de movimento e linha temporal de degraus.
import { m, traduzido } from '../i18n'
import { SEMANAS_BLOCO_ANTIGO } from './blocos'
import type { Catalogo } from './catalogo'
import { DIAS_MIN_DEGRAU, desdeQuando, diasEntre, escadas, planoComDegraus, type Degraus, type Escada } from './escadas'
import { faixaCalistenia, motivoIncompatibilidade } from './plano'
import type { Anamnese, Exercicio, Nivel, Plano, Sessao } from './types'

export const PADROES = ['empurrar', 'puxar-vertical', 'puxar-horizontal', 'joelho', 'anca', 'core'] as const
export type Padrao = (typeof PADROES)[number]

export const NOMES_PADROES: Record<Padrao, string> = traduzido({
  empurrar: m('Empurrar'),
  'puxar-vertical': m('Puxar na vertical'),
  'puxar-horizontal': m('Puxar na horizontal'),
  joelho: m('Pernas, joelho'),
  anca: m('Pernas, anca'),
  core: m('Core'),
})

/** F32.1: escada e variação de referência de cada padrão. */
export const REFERENCIAS: Record<Padrao, { escada: string; referencia: string }> = {
  empurrar: { escada: 'flexoes', referencia: 'flexoes' },
  'puxar-vertical': { escada: 'puxar-vertical', referencia: 'elevacoes' },
  'puxar-horizontal': { escada: 'puxar-horizontal', referencia: 'remada-invertida' },
  joelho: { escada: 'joelho', referencia: 'agachamento-bulgaro' },
  anca: { escada: 'anca', referencia: 'ponte-gluteos-unilateral' },
  core: { escada: 'core', referencia: 'hollow' },
}

export interface Tentativa { exercicioId: string; valor: number }
export interface ResultadoPadrao { tentativas: Tentativa[]; exercicioId: string }
/** F32.4: o último teste, guardado na chave 'nivelamento' e na cópia. */
export interface Nivelamento { data: string; resultados: Partial<Record<Padrao, ResultadoPadrao>> }

export interface Contexto {
  catalogo: Catalogo
  /** O exercício é compatível com o equipamento e as restrições da pessoa. */
  possivel: (ex: Exercicio) => boolean
  /** Faixa do plano para o exercício (F31.5). */
  faixa: (ex: Exercicio) => [number, number]
}

/** O contexto do teste para a anamnese: equipamento, restrições e faixas do plano de calistenia. */
export const contextoDe = (a: Anamnese, catalogo: Catalogo): Contexto => ({
  catalogo,
  possivel: (x) => !motivoIncompatibilidade(x, a),
  faixa: (x) => x.faixaFixa ?? faixaCalistenia(a.objetivo, x.tipo),
})

const escadaPorId = (id: string): Escada => escadas().find((e) => e.id === id)!

/** Os degraus da escada do padrão que a pessoa pode fazer, do mais fácil para o mais difícil. */
export function degrausPossiveis(padrao: Padrao, ctx: Pick<Contexto, 'catalogo' | 'possivel'>): Exercicio[] {
  return escadaPorId(REFERENCIAS[padrao].escada).degraus.map((id) => ctx.catalogo.get(id)).filter((x): x is Exercicio => !!x && ctx.possivel(x))
}

/** F32.1: índice da referência nos degraus possíveis (ou do possível mais alto abaixo dela); -1 sem nenhum. */
function indiceReferencia(padrao: Padrao, possiveis: Exercicio[]): number {
  const ordem = escadaPorId(REFERENCIAS[padrao].escada).degraus
  const ref = ordem.indexOf(REFERENCIAS[padrao].referencia)
  let r = -1
  possiveis.forEach((x, i) => { if (ordem.indexOf(x.id) <= ref) r = i })
  return r
}

export type Passo = { pedir: Exercicio } | { fim: Exercicio } | { indisponivel: true }

/** F32.3: com as séries já feitas, diz qual a próxima série a pedir ou o degrau onde a pessoa fica. */
export function avaliar(padrao: Padrao, tentativas: readonly Tentativa[], ctx: Contexto): Passo {
  const d = degrausPossiveis(padrao, ctx)
  const r = indiceReferencia(padrao, d)
  if (r < 0) return { indisponivel: true }
  const [primeira, segunda] = tentativas
  if (!primeira) return { pedir: d[r]! }
  const [min, max] = ctx.faixa(d[r]!)
  if (primeira.valor >= max) return { fim: d[Math.min(r + 1, d.length - 1)]! }
  if (primeira.valor >= min) return { fim: d[r]! }
  if (r === 0) return { fim: d[0]! }
  if (!segunda) return { pedir: d[r - 1]! }
  const [min2] = ctx.faixa(d[r - 1]!)
  return { fim: d[segunda.valor >= min2 ? r - 1 : Math.max(r - 2, 0)]! }
}

/** Ids dos exercícios do plano base (antes dos degraus), sem repetidos. */
const idsDoPlano = (plano: Plano) => [...new Set(plano.treinos.flatMap((tr) => tr.prescricoes.map((p) => p.exercicioId)))]

/**
 * F32.4: aplica os degraus do teste. Em cada padrão, o exercício do plano mais alto na escada passa para o degrau do
 * teste e os outros movem-se o mesmo número de degraus, sem sair da escada. Os que não mudam ficam como estavam.
 */
export function aplicarNivelamento(plano: Plano, degraus: Readonly<Degraus>, colocacoes: Partial<Record<Padrao, string>>, ctx: Pick<Contexto, 'catalogo' | 'possivel'>, hoje: string): Degraus {
  const r: Degraus = { ...degraus }
  const ids = idsDoPlano(plano)
  for (const padrao of PADROES) {
    const alvo = colocacoes[padrao]
    if (!alvo) continue
    const d = degrausPossiveis(padrao, ctx).map((x) => x.id)
    const p = d.indexOf(alvo)
    if (p < 0) continue
    const naEscada = ids.map((orig) => ({ orig, atual: degraus[orig]?.exercicioId ?? orig })).filter((x) => d.includes(x.atual))
    if (naEscada.length === 0) continue
    const desvio = p - Math.max(...naEscada.map((x) => d.indexOf(x.atual)))
    for (const { orig, atual } of naEscada) {
      const novo = d[Math.min(Math.max(d.indexOf(atual) + desvio, 0), d.length - 1)]!
      if (novo === atual) continue
      if (novo === orig) delete r[orig]
      else r[orig] = { exercicioId: novo, desde: hoje }
    }
  }
  return r
}

/** F32.1: o padrão está no plano (algum exercício do plano, no degrau atual, está na escada). */
export function padraoNoPlano(padrao: Padrao, plano: Plano, degraus: Readonly<Degraus>, catalogo: Catalogo): boolean {
  const escada = escadaPorId(REFERENCIAS[padrao].escada)
  return planoComDegraus(plano, degraus, catalogo).treinos.some((tr) => tr.prescricoes.some((p) => escada.degraus.includes(p.exercicioId)))
}

export interface FasePadrao {
  padrao: Padrao
  /** Sem valor: o padrão não está no plano. */
  atual?: Exercicio
  nivel?: Nivel
  /** 1 = o mais fácil, contando só os degraus possíveis. */
  degrau: number
  total: number
  seguinte?: Exercicio
  /** Topo da faixa do exercício atual no plano. */
  topo?: number
  /** Dias que faltam para os 14 dias no degrau (0 quando já passaram). */
  diasEmFalta?: number
}

/** F32.5: fase de cada padrão, a partir do plano com os degraus atuais. */
export function fasePorPadrao(plano: Plano, degraus: Readonly<Degraus>, sessoes: readonly Sessao[], ctx: Pick<Contexto, 'catalogo' | 'possivel'>, hoje: string): FasePadrao[] {
  const comDegraus = planoComDegraus(plano, degraus, ctx.catalogo)
  const prescricoes = comDegraus.treinos.flatMap((tr) => tr.prescricoes)
  return PADROES.map((padrao): FasePadrao => {
    const ordem = escadaPorId(REFERENCIAS[padrao].escada).degraus
    const noPlano = prescricoes.filter((p) => ordem.includes(p.exercicioId))
    const d = degrausPossiveis(padrao, ctx)
    if (noPlano.length === 0) return { padrao, degrau: 0, total: d.length }
    const topoId = noPlano.map((p) => p.exercicioId).sort((a, b) => ordem.indexOf(b) - ordem.indexOf(a))[0]!
    const atual = ctx.catalogo.get(topoId)!
    const i = Math.max(d.findIndex((x) => x.id === topoId), 0)
    const desde = desdeQuando(degraus, topoId, sessoes)
    return {
      padrao,
      atual,
      ...(atual.nivel ? { nivel: atual.nivel } : {}),
      degrau: i + 1,
      total: Math.max(d.length, 1),
      ...(d[i + 1] && d[i]?.id === topoId ? { seguinte: d[i + 1] } : {}),
      topo: noPlano.find((p) => p.exercicioId === topoId)!.faixa[1],
      ...(desde ? { diasEmFalta: Math.max(0, DIAS_MIN_DEGRAU - diasEntre(desde, hoje)) } : {}),
    }
  })
}

/** F32.5: o padrão mais fraco (nível mais baixo; em empate, o mais abaixo na escada), entre os que estão no plano. */
export function prioridade(fases: readonly FasePadrao[]): FasePadrao | undefined {
  return fases
    .filter((f) => f.atual)
    .sort((a, b) => (a.nivel ?? 1) - (b.nivel ?? 1) || a.degrau / a.total - b.degrau / b.total)[0]
}

export interface PontoDegrau { data: string; exercicioId: string; degrau: number }

/** F32.6: o degrau mais alto feito em cada sessão (1 = o primeiro da escada) e as mudanças. */
export function linhaDegraus(padrao: Padrao, sessoes: readonly Sessao[]): { pontos: PontoDegrau[]; mudancas: PontoDegrau[] } {
  const ordem = escadaPorId(REFERENCIAS[padrao].escada).degraus
  const pontos: PontoDegrau[] = []
  for (const s of [...sessoes].sort((a, b) => a.inicio.localeCompare(b.inicio))) {
    const feitos = s.exercicios.filter((e) => e.series.length > 0 && ordem.includes(e.exercicioId)).map((e) => ordem.indexOf(e.exercicioId))
    if (feitos.length === 0) continue
    const i = Math.max(...feitos)
    pontos.push({ data: s.inicio, exercicioId: ordem[i]!, degrau: i + 1 })
  }
  const mudancas = pontos.filter((p, i) => i === 0 || p.degrau !== pontos[i - 1]!.degrau)
  return { pontos, mudancas }
}

/** F32.7: passou um bloco desde o último teste. */
export function repetirTeste(nivelamento: Nivelamento | undefined, plano: Plano, hoje: string): boolean {
  if (!nivelamento) return false
  return diasEntre(nivelamento.data, hoje) >= (plano.semanasBloco ?? SEMANAS_BLOCO_ANTIGO) * 7
}
