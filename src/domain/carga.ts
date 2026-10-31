// F24: como se conta o peso de cada exercício. Os dados guardam sempre o número que se escreveu (ou o total, com a barra).
import { m, t } from '../i18n'
import type { Equipamento, Exercicio, RegistoExercicio } from './types'
import { KG_POR_LB, unidadePeso, type UnidadePeso } from './unidades'

export const TIPOS_CARGA = ['halter', 'total', 'maquina', 'corporal'] as const
export type TipoCarga = (typeof TIPOS_CARGA)[number]

const DO_EQUIPAMENTO: Record<Equipamento, TipoCarga> = { halteres: 'halter', barra: 'total', maquina: 'maquina', cabo: 'maquina', 'peso-corporal': 'corporal', 'barra-fixa': 'corporal', paralelas: 'corporal' }

const NOMES: Record<TipoCarga, string> = {
  halter: m('Por halter'),
  total: m('Total, com a barra'),
  maquina: m('O que marca a máquina'),
  corporal: m('Só o corpo'),
}
export const nomeTipoCarga = (tipo: TipoCarga) => t(NOMES[tipo])

/** F24.1/F24.2: formas de contar que o exercício admite, pela ordem do catálogo. Sem carga, nenhuma. */
export function tiposCarga(ex: Pick<Exercicio, 'equipamento' | 'incrementoKg'>): TipoCarga[] {
  if (ex.incrementoKg === 0) return []
  return [...new Set(ex.equipamento.map((q) => DO_EQUIPAMENTO[q]))]
}

/** A forma por omissão: o primeiro equipamento com carga (os registos antigos contam assim, F24.3). */
export function tipoPadrao(ex: Pick<Exercicio, 'equipamento' | 'incrementoKg'>): TipoCarga | undefined {
  const tipos = tiposCarga(ex)
  return tipos.find((x) => x !== 'corporal') ?? tipos[0]
}

/** A forma escolhida para o exercício, se ainda for válida; senão a forma por omissão. */
export function tipoCarga(ex: Pick<Exercicio, 'id' | 'equipamento' | 'incrementoKg'>, escolhas: Readonly<Record<string, TipoCarga>>): TipoCarga | undefined {
  const escolha = escolhas[ex.id]
  return escolha && tiposCarga(ex).includes(escolha) ? escolha : tipoPadrao(ex)
}

/** F24.3: só se comparam sessões contadas da mesma forma. */
export function mesmaForma(historico: RegistoExercicio[], ex: Pick<Exercicio, 'equipamento' | 'incrementoKg'>, tipo: TipoCarga | undefined): RegistoExercicio[] {
  const padrao = tipoPadrao(ex)
  return historico.filter((r) => (r.tipoCarga ?? padrao) === tipo)
}

/** Rótulo do campo da carga (F24.1). */
export function rotuloCarga(tipo: TipoCarga | undefined, u: UnidadePeso = unidadePeso()): string {
  if (tipo === 'halter') return t('Carga ({u} por halter)', { u })
  if (tipo === 'total') return t('Carga total ({u})', { u })
  if (tipo === 'maquina') return t('Carga ({u} na máquina)', { u })
  return t('Carga ({u})', { u })
}

/** F24.4: pesos de barra que se podem escolher, em quilos (em libras, as barras de 45, 35 e 25 lb). */
export const barrasKg = (u: UnidadePeso = unidadePeso()): number[] => (u === 'kg' ? [20, 15, 10] : [45, 35, 25].map((lb) => lb * KG_POR_LB))
/** Total com a barra, a partir dos discos de cada lado (tudo em quilos). */
export const totalComBarra = (barraKg: number, porLadoKg: number) => barraKg + 2 * porLadoKg
