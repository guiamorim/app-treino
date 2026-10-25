import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import dadosAlongamentos from '../catalog/alongamentos.json'
import dadosCatalogo from '../catalog/exercicios.json'
import alongamentosEn from '../catalog/i18n/alongamentos.en.json'
import alongamentosEs from '../catalog/i18n/alongamentos.es.json'
import exerciciosEn from '../catalog/i18n/exercicios.en.json'
import exerciciosEs from '../catalog/i18n/exercicios.es.json'
import { carregarAlongamentos, traduzirAlongamentos } from '../domain/alongamentos'
import { carregarCatalogo, traduzirCatalogo } from '../domain/catalogo'
import { planoNoIdioma } from '../domain/plano'
import type { Anamnese, FotoAvaliacao, Medicao, Perfil, Plano, Sessao } from '../domain/types'
import { definirIdioma, IDIOMAS, idiomaDoDispositivo, locale, type Idioma } from '../i18n'

const catalogoPt = carregarCatalogo(dadosCatalogo)
const alongamentosPt = carregarAlongamentos(dadosAlongamentos)
const CATALOGOS = { pt: catalogoPt, en: traduzirCatalogo(catalogoPt, exerciciosEn), es: traduzirCatalogo(catalogoPt, exerciciosEs) }
const ALONGAMENTOS = { pt: alongamentosPt, en: traduzirAlongamentos(alongamentosPt, alongamentosEn), es: traduzirAlongamentos(alongamentosPt, alongamentosEs) }

// F21: catálogos no idioma atual. `export let` mantém a ligação viva: quem importa vê a troca de idioma.
export let catalogo = catalogoPt
export let alongamentos = alongamentosPt

export function aplicarIdioma(i: Idioma) {
  definirIdioma(i)
  catalogo = CATALOGOS[i]
  alongamentos = ALONGAMENTOS[i]
}

aplicarIdioma(idiomaDoDispositivo(typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language])))

const idiomaGuardado = (v: unknown): Idioma | undefined => (IDIOMAS as readonly unknown[]).includes(v) ? (v as Idioma) : undefined

export interface Dados {
  anamnese?: Anamnese
  plano?: Plano
  sessoes: Sessao[]
  medicoes: Medicao[]
  videos: Record<string, string>
  ultimaExportacao?: string
  fotos: FotoAvaliacao[]
  perfil: Perfil
  /** F20: última versão cujas novidades foram vistas (fica só no dispositivo). */
  versaoVista?: string
  /** F21: idioma escolhido, ou o do telemóvel se nunca foi escolhido. */
  idioma: Idioma
}

export function useDados(): Dados | undefined {
  return useLiveQuery(async () => {
    const idioma = idiomaGuardado(await db.ler('idioma')) ?? idiomaDoDispositivo(navigator.languages ?? [navigator.language])
    aplicarIdioma(idioma)
    const anamnese = await db.ler<Anamnese>('anamnese')
    const plano = await db.ler<Plano>('plano')
    return {
      idioma,
      anamnese,
      plano: plano && planoNoIdioma(plano, anamnese, catalogo),
      sessoes: await db.sessoes.orderBy('inicio').toArray(),
      medicoes: await db.medicoes.orderBy('data').toArray(),
      videos: (await db.ler<Record<string, string>>('videos')) ?? {},
      ultimaExportacao: await db.ler<string>('ultimaExportacao'),
      fotos: await db.fotos.orderBy('data').toArray(),
      perfil: (await db.ler<Perfil>('perfil')) ?? {},
      versaoVista: await db.ler<string>('versaoVista'),
    }
  })
}

export const novoId = () => crypto.randomUUID()
export const agoraIso = () => new Date().toISOString()
export const hojeIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const diasDesde = (iso?: string) => (iso ? (Date.now() - Date.parse(iso)) / 86_400_000 : Infinity)
export const kg = (n: number) => n.toLocaleString(locale(), { maximumFractionDigits: 1 })
export const dataCurta = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })
