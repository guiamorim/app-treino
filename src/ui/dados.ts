import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import dadosAlongamentos from '../catalog/alongamentos.json'
import dadosCatalogo from '../catalog/exercicios.json'
import { carregarAlongamentos, traduzirAlongamentos, type CatalogoAlongamentos } from '../domain/alongamentos'
import { carregarCatalogo, traduzirCatalogo, type Catalogo } from '../domain/catalogo'
import { planoNoCatalogo, planoNoIdioma } from '../domain/plano'
import type { Anamnese, FotoAvaliacao, Medicao, Perfil, Plano, Sessao } from '../domain/types'
import { definirUnidade, UNIDADES, unidadeDoDispositivo, type UnidadePeso } from '../domain/unidades'
import { carregarIdioma, definirIdioma, IDIOMAS, idiomaDoDispositivo, locale, type Idioma } from '../i18n'

const catalogoPt = carregarCatalogo(dadosCatalogo)
const alongamentosPt = carregarAlongamentos(dadosAlongamentos)
const CATALOGOS: Partial<Record<Idioma, Catalogo>> = { pt: catalogoPt }
const ALONGAMENTOS: Partial<Record<Idioma, CatalogoAlongamentos>> = { pt: alongamentosPt }
// F22.12: os catálogos traduzidos só são carregados quando o idioma é escolhido.
const IMPORTAR = {
  en: () => Promise.all([import('../catalog/i18n/exercicios.en.json'), import('../catalog/i18n/alongamentos.en.json')]),
  es: () => Promise.all([import('../catalog/i18n/exercicios.es.json'), import('../catalog/i18n/alongamentos.es.json')]),
}

// F21: catálogos no idioma atual. `export let` mantém a ligação viva: quem importa vê a troca de idioma.
export let catalogo = catalogoPt
export let alongamentos = alongamentosPt

export async function aplicarIdioma(i: Idioma) {
  if (i !== 'pt' && !CATALOGOS[i]) {
    const [[ex, al]] = await Promise.all([IMPORTAR[i](), carregarIdioma(i)])
    CATALOGOS[i] = traduzirCatalogo(catalogoPt, ex.default)
    ALONGAMENTOS[i] = traduzirAlongamentos(alongamentosPt, al.default)
  }
  definirIdioma(i)
  catalogo = CATALOGOS[i]!
  alongamentos = ALONGAMENTOS[i]!
}

const linguasDoDispositivo = () => (typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]))
const idiomaGuardado = (v: unknown): Idioma | undefined => (IDIOMAS as readonly unknown[]).includes(v) ? (v as Idioma) : undefined
const unidadeGuardada = (v: unknown): UnidadePeso | undefined => (UNIDADES as readonly unknown[]).includes(v) ? (v as UnidadePeso) : undefined

export interface Dados {
  anamnese?: Anamnese
  plano?: Plano
  sessoes: Sessao[]
  medicoes: Medicao[]
  videos: Record<string, string>
  ultimaExportacao?: string
  /** Só o número: as fotos são pesadas e lêem-se nos ecrãs que as mostram (useFotos). */
  numFotos: number
  perfil: Perfil
  /** F20: última versão cujas novidades foram vistas (fica só no dispositivo). */
  versaoVista?: string
  /** F21: idioma escolhido, ou o do telemóvel se nunca foi escolhido. */
  idioma: Idioma
  /** F22.9: quilos ou libras (os dados ficam sempre em quilos). */
  unidade: UnidadePeso
}

export function useDados(): Dados | undefined {
  return useLiveQuery(async () => {
    const idioma = idiomaGuardado(await db.ler('idioma')) ?? idiomaDoDispositivo(linguasDoDispositivo())
    const unidade = unidadeGuardada(await db.ler('unidade')) ?? unidadeDoDispositivo(linguasDoDispositivo())
    const anamnese = await db.ler<Anamnese>('anamnese')
    const plano = await db.ler<Plano>('plano')
    const resto = {
      sessoes: await db.sessoes.orderBy('inicio').toArray(),
      medicoes: await db.medicoes.orderBy('data').toArray(),
      videos: (await db.ler<Record<string, string>>('videos')) ?? {},
      ultimaExportacao: await db.ler<string>('ultimaExportacao'),
      numFotos: await db.fotos.count(),
      perfil: (await db.ler<Perfil>('perfil')) ?? {},
      versaoVista: await db.ler<string>('versaoVista'),
    }
    // O idioma carrega-se depois das leituras: uma promessa de fora do Dexie a meio deixaria de fora da observação o que se lê a seguir.
    await aplicarIdioma(idioma)
    definirUnidade(unidade)
    return { idioma, unidade, anamnese, plano: plano && planoNoCatalogo(planoNoIdioma(plano, anamnese, catalogo), catalogo), ...resto }
  })
}

/** Fotos de avaliação, lidas à parte para não as reler a cada série gravada. */
export function useFotos(): FotoAvaliacao[] | undefined {
  return useLiveQuery(() => db.fotos.orderBy('data').toArray())
}

export const novoId = () => crypto.randomUUID()
export const agoraIso = () => new Date().toISOString()
export const hojeIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const diasDesde = (iso?: string) => (iso ? (Date.now() - Date.parse(iso)) / 86_400_000 : Infinity)
export const dataCurta = (iso: string) => new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' })
