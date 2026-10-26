// F21: idiomas da app. O texto em português é a própria chave (como no gettext): o código continua
// legível na linguagem do domínio e en.json/es.json traduzem cada frase. Um teste confirma que todas
// as frases marcadas com t() ou m() têm tradução nos dois ficheiros.
export const IDIOMAS = ['pt', 'en', 'es'] as const
export type Idioma = (typeof IDIOMAS)[number]

export const NOMES_IDIOMAS: Record<Idioma, string> = { pt: 'Português', en: 'English', es: 'Español' }
export const LOCALES: Record<Idioma, string> = { pt: 'pt-PT', en: 'en-GB', es: 'es-ES' }

type Dicionario = Record<string, string>
// F22.12: os dicionários só são carregados quando o idioma é escolhido (ficheiros à parte no build).
const IMPORTAR: Record<Exclude<Idioma, 'pt'>, () => Promise<{ default: Dicionario }>> = {
  en: () => import('./en.json'),
  es: () => import('./es.json'),
}
const DICIONARIOS: Partial<Record<Exclude<Idioma, 'pt'>, Dicionario>> = {}

/** Carrega o dicionário do idioma, se ainda não estiver carregado. */
export async function carregarIdioma(i: Idioma): Promise<void> {
  if (i === 'pt' || DICIONARIOS[i]) return
  DICIONARIOS[i] = (await IMPORTAR[i]()).default
}

let atual: Idioma = 'pt'

export function definirIdioma(i: Idioma) {
  atual = i
  if (typeof document !== 'undefined') document.documentElement.lang = LOCALES[i]
}

export const idiomaAtual = () => atual
export const locale = () => LOCALES[atual]

/** Idioma do telemóvel: português e espanhol quando é o caso, inglês para os restantes. */
export function idiomaDoDispositivo(linguas: readonly string[]): Idioma {
  for (const l of linguas) {
    const base = l.toLowerCase().slice(0, 2)
    if (base === 'pt' || base === 'es' || base === 'en') return base
  }
  return 'en'
}

export type Variaveis = Record<string, string | number>

export const interpolar = (s: string, v?: Variaveis) => (v ? s.replace(/\{(\w+)\}/g, (x, k: string) => (k in v ? String(v[k]) : x)) : s)

/** Traduz uma frase escrita em português para o idioma atual (ou o indicado). Sem dicionário carregado, fica em português. */
export function t(pt: string, v?: Variaveis, idioma: Idioma = atual): string {
  return interpolar(idioma === 'pt' ? pt : (DICIONARIOS[idioma]?.[pt] ?? pt), v)
}

/** Marca uma frase para tradução sem a traduzir já (dados fixos traduzidos mais tarde com t()). */
export const m = (pt: string) => pt

/** Objeto de nomes fixos (marcados com m()) que devolve sempre a tradução no idioma atual. */
export function traduzido<T extends Record<string, string>>(o: T): T {
  const r = {} as T
  for (const k of Object.keys(o) as (keyof T)[]) Object.defineProperty(r, k, { get: () => t(o[k] as string), enumerable: true })
  return r
}
