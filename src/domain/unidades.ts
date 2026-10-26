// F22.9: quilos ou libras. Os dados ficam sempre em quilos; a unidade só muda o que se mostra e o que se escreve.
import { locale } from '../i18n'

export const UNIDADES = ['kg', 'lb'] as const
export type UnidadePeso = (typeof UNIDADES)[number]

export const KG_POR_LB = 0.45359237

let atual: UnidadePeso = 'kg'

export const definirUnidade = (u: UnidadePeso) => { atual = u }
export const unidadePeso = () => atual

/** Libras num telemóvel em inglês dos Estados Unidos; quilos nos restantes. */
export const unidadeDoDispositivo = (linguas: readonly string[]): UnidadePeso => (linguas[0]?.toLowerCase() === 'en-us' ? 'lb' : 'kg')

/** Quilos guardados → valor na unidade. */
export const paraUnidade = (kg: number, u: UnidadePeso = atual) => (u === 'kg' ? kg : kg / KG_POR_LB)
/** Valor escrito na unidade → quilos a guardar. */
export const deUnidade = (v: number, u: UnidadePeso = atual) => (u === 'kg' ? v : v * KG_POR_LB)

/** Número com até uma casa decimal, no formato do idioma. */
export const decimal = (n: number) => n.toLocaleString(locale(), { maximumFractionDigits: 1 })
/** Valor na unidade para um campo de texto (ponto decimal, até uma casa). */
export const paraCampo = (kg: number, u: UnidadePeso = atual) => String(Math.round(paraUnidade(kg, u) * 10) / 10)
/** Peso a partir de quilos, na unidade: «60 kg», «132,5 lb». */
export const peso = (kg: number, u: UnidadePeso = atual) => `${decimal(paraUnidade(kg, u))} ${u}`
