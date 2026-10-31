// F30 (v1.19): progressão por variação. Cada escada vai da variação mais fácil para a mais difícil; o degrau
// em que a pessoa está guarda-se por exercício do plano e aplica-se só na forma como o plano é mostrado.
import { m, t } from '../i18n'
import type { Catalogo } from './catalogo'
import type { Exercicio, Plano, Prescricao, Sessao } from './types'

export interface Escada {
  id: string
  nome: string
  /** Da variação mais fácil para a mais difícil. */
  degraus: string[]
}

const ESCADAS_PT: readonly Escada[] = [
  { id: 'flexoes', nome: m('Flexões'), degraus: ['flexoes-inclinadas', 'flexoes', 'flexoes-declinadas', 'flexoes-diamante'] },
  { id: 'mergulhos', nome: m('Mergulhos'), degraus: ['fundos-banco', 'paralelas'] },
  { id: 'puxar', nome: m('Puxar'), degraus: ['remada-invertida', 'elevacoes'] },
  { id: 'joelho', nome: m('Pernas, joelho'), degraus: ['agachamento-peso-corporal', 'afundos', 'agachamento-bulgaro'] },
  { id: 'anca', nome: m('Pernas, anca'), degraus: ['ponte-gluteos', 'ponte-gluteos-unilateral'] },
]

/** As escadas com o nome no idioma atual. */
export const escadas = (): Escada[] => ESCADAS_PT.map((e) => ({ ...e, nome: t(e.nome) }))

/** Regra 8 da secção 4: dias mínimos num degrau antes de subir. */
export const DIAS_MIN_DEGRAU = 14
/** F30.6: incremento do peso extra, em kg (5 lb em libras, pela regra F22.9). */
export const INCREMENTO_PESO_EXTRA = 2.5

/** Degrau escolhido para cada exercício do plano: id do exercício do plano → variação atual e desde quando. */
export type Degraus = Record<string, { exercicioId: string; desde: string }>

export function escadaDe(exercicioId: string): Escada | undefined {
  return escadas().find((e) => e.degraus.includes(exercicioId))
}

export interface Posicao {
  escada: Escada
  /** 1 = o mais fácil, contando só os degraus possíveis. */
  degrau: number
  total: number
  anterior?: Exercicio
  seguinte?: Exercicio
}

/** F30.2: posição na escada, saltando os degraus que a pessoa não pode fazer. */
export function posicaoNaEscada(ex: Exercicio, catalogo: Catalogo, possivel: (x: Exercicio) => boolean): Posicao | undefined {
  const escada = escadaDe(ex.id)
  if (!escada) return undefined
  const degraus = escada.degraus.map((id) => catalogo.get(id)).filter((x): x is Exercicio => !!x && (x.id === ex.id || possivel(x)))
  const i = degraus.findIndex((x) => x.id === ex.id)
  return { escada, degrau: i + 1, total: degraus.length, ...(i > 0 ? { anterior: degraus[i - 1] } : {}), ...(i < degraus.length - 1 ? { seguinte: degraus[i + 1] } : {}) }
}

/** F30.2: guarda a nova variação para todos os exercícios do plano que estão em `atual` (ou que são `atual`). */
export function mudarDegrau(degraus: Readonly<Degraus>, atual: string, novo: string, hoje: string): Degraus {
  const origens = Object.keys(degraus).filter((k) => degraus[k]!.exercicioId === atual)
  if (origens.length === 0) origens.push(atual)
  const r = { ...degraus }
  for (const k of origens) {
    if (k === novo) delete r[k]
    else r[k] = { exercicioId: novo, desde: hoje }
  }
  return r
}

/** Desde quando a pessoa está nesta variação: a mudança de degrau ou, sem ela, a primeira sessão registada. */
export function desdeQuando(degraus: Readonly<Degraus>, exercicioId: string, sessoes: readonly Sessao[]): string | undefined {
  const mudancas = Object.values(degraus).filter((d) => d.exercicioId === exercicioId).map((d) => d.desde)
  if (mudancas.length > 0) return mudancas.sort().at(-1)
  return sessoes.filter((s) => s.exercicios.some((e) => e.exercicioId === exercicioId && e.series.length > 0)).map((s) => s.inicio.slice(0, 10)).sort()[0]
}

/** Dias entre duas datas AAAA-MM-DD. */
export const diasEntre = (de: string, ate: string) => Math.round((Date.parse(`${ate.slice(0, 10)}T12:00:00Z`) - Date.parse(`${de.slice(0, 10)}T12:00:00Z`)) / 86_400_000)

/** F30.2: o plano com a variação atual de cada exercício (antes das férias). O plano guardado não muda. */
export function planoComDegraus(plano: Plano, degraus: Readonly<Degraus>, catalogo: Catalogo): Plano {
  const trocar = (id: string) => {
    const d = degraus[id]
    return d && catalogo.has(d.exercicioId) ? d.exercicioId : id
  }
  if (!plano.treinos.some((tr) => tr.prescricoes.some((p) => [p.exercicioId, ...(p.alternativas ?? [])].some((id) => trocar(id) !== id)))) return plano
  return {
    ...plano,
    treinos: plano.treinos.map((tr) => ({
      ...tr,
      prescricoes: tr.prescricoes.map((p): Prescricao => {
        const exercicioId = trocar(p.exercicioId)
        const alternativas = p.alternativas?.map(trocar)
        if (exercicioId === p.exercicioId && alternativas?.every((id, i) => id === p.alternativas![i]) !== false) return p
        const { nota: _, ...resto } = p
        const nota = exercicioId === p.exercicioId ? p.nota : t('Variação atual (o plano tinha «{nome}»).', { nome: catalogo.get(p.exercicioId)?.nome ?? p.exercicioId })
        return { ...resto, exercicioId, ...(alternativas ? { alternativas } : {}), ...(nota ? { nota } : {}) }
      }),
    })),
  }
}
