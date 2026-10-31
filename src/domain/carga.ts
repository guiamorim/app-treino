// F24: como se conta o peso de cada exercício. Os dados guardam sempre o número que se escreveu (ou o total, com a barra).
import { m, t } from '../i18n'
import type { Equipamento, Exercicio, RegistoExercicio } from './types'
import { KG_POR_LB, unidadePeso, type UnidadePeso } from './unidades'

/** Formas que um exercício personalizado pode ter (F26). */
export const TIPOS_CARGA_PROPRIOS = ['halter', 'total', 'maquina', 'corporal'] as const
export type TipoCargaProprio = (typeof TIPOS_CARGA_PROPRIOS)[number]
/** F30.6 (v1.19): «peso-extra» é colete ou mochila num exercício de peso corporal. */
export const TIPOS_CARGA = [...TIPOS_CARGA_PROPRIOS, 'peso-extra'] as const
export type TipoCarga = (typeof TIPOS_CARGA)[number]
/** F30.6: incremento do peso extra, em kg (5 lb em libras, pela F22.9). */
export const INCREMENTO_PESO_EXTRA = 2.5

const DO_EQUIPAMENTO: Record<Equipamento, TipoCarga> = { halteres: 'halter', barra: 'total', maquina: 'maquina', cabo: 'maquina', 'peso-corporal': 'corporal', 'barra-fixa': 'corporal', paralelas: 'corporal', elasticos: 'corporal', caneleiras: 'corporal' }

const NOMES: Record<TipoCarga, string> = {
  halter: m('Por halter'),
  total: m('Total, com a barra'),
  maquina: m('O que marca a máquina'),
  corporal: m('Só o corpo'),
  'peso-extra': m('Peso extra (colete ou mochila)'),
}
export const nomeTipoCarga = (tipo: TipoCarga) => t(NOMES[tipo])

type ParaCarga = Pick<Exercicio, 'equipamento' | 'incrementoKg' | 'tipo' | 'medida'>
const APOIOS_CORPORAIS: readonly Equipamento[] = ['peso-corporal', 'barra-fixa', 'paralelas']
const comCarga = (x: TipoCarga) => x !== 'corporal' && x !== 'peso-extra'

/** F30.6: exercício composto de peso corporal, contado em repetições, a que se pode juntar colete ou mochila. */
export const admitePesoExtra = (ex: ParaCarga) => ex.incrementoKg === 0 && ex.tipo === 'composto' && ex.medida === 'reps' && ex.equipamento.every((q) => APOIOS_CORPORAIS.includes(q))

/** F24.1/F24.2: formas de contar que o exercício admite, pela ordem do catálogo. Sem carga, nenhuma (ou só o corpo e o peso extra, F30.6). */
export function tiposCarga(ex: ParaCarga): TipoCarga[] {
  if (ex.incrementoKg === 0) return admitePesoExtra(ex) ? ['corporal', 'peso-extra'] : []
  return [...new Set(ex.equipamento.map((q) => DO_EQUIPAMENTO[q]))]
}

/** A forma por omissão: o primeiro equipamento com carga (os registos antigos contam assim, F24.3). */
export function tipoPadrao(ex: ParaCarga): TipoCarga | undefined {
  const tipos = tiposCarga(ex)
  return tipos.find(comCarga) ?? tipos[0]
}

/**
 * A forma escolhida para o exercício, se ainda for válida; senão a forma por omissão. Com `disponivel` (F30.7),
 * a forma por omissão é a do primeiro equipamento que a pessoa tem, ou só o corpo.
 */
export function tipoCarga(ex: ParaCarga & Pick<Exercicio, 'id'>, escolhas: Readonly<Record<string, TipoCarga>>, disponivel?: readonly Equipamento[]): TipoCarga | undefined {
  const escolha = escolhas[ex.id]
  const tipos = tiposCarga(ex)
  if (escolha && tipos.includes(escolha)) return escolha
  if (!disponivel || ex.incrementoKg === 0) return tipoPadrao(ex)
  const temos = ex.equipamento.filter((q) => disponivel.includes(q)).map((q) => DO_EQUIPAMENTO[q])
  return temos.find(comCarga) ?? (tipos.includes('corporal') ? 'corporal' : tipoPadrao(ex))
}

/** Sem campo de carga: exercício sem carga ou contado só com o corpo (o peso extra tem carga). */
export const semCarga = (ex: Pick<Exercicio, 'incrementoKg'> | undefined, tipo: TipoCarga | undefined) => tipo !== 'peso-extra' && (ex?.incrementoKg === 0 || tipo === 'corporal')

/** O incremento que a progressão usa, pela forma de contar. */
export const incrementoDaForma = (ex: Pick<Exercicio, 'incrementoKg'>, tipo: TipoCarga | undefined) => (tipo === 'peso-extra' ? INCREMENTO_PESO_EXTRA : semCarga(ex, tipo) ? 0 : ex.incrementoKg)

/** F24.3: só se comparam sessões contadas da mesma forma. */
export function mesmaForma(historico: RegistoExercicio[], ex: ParaCarga, tipo: TipoCarga | undefined): RegistoExercicio[] {
  const padrao = tipoPadrao(ex)
  return historico.filter((r) => (r.tipoCarga ?? padrao) === tipo)
}

/** Rótulo do campo da carga (F24.1). */
export function rotuloCarga(tipo: TipoCarga | undefined, u: UnidadePeso = unidadePeso()): string {
  if (tipo === 'halter') return t('Carga ({u} por halter)', { u })
  if (tipo === 'total') return t('Carga total ({u})', { u })
  if (tipo === 'maquina') return t('Carga ({u} na máquina)', { u })
  if (tipo === 'peso-extra') return t('Peso extra ({u})', { u })
  return t('Carga ({u})', { u })
}

/** F24.4: pesos de barra que se podem escolher, em quilos (em libras, as barras de 45, 35 e 25 lb). */
export const barrasKg = (u: UnidadePeso = unidadePeso()): number[] => (u === 'kg' ? [20, 15, 10] : [45, 35, 25].map((lb) => lb * KG_POR_LB))
/** Total com a barra, a partir dos discos de cada lado (tudo em quilos). */
export const totalComBarra = (barraKg: number, porLadoKg: number) => barraKg + 2 * porLadoKg
