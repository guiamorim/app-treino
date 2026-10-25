// F20: novidades de cada versão e o que está em preparação, lidas de src/novidades.json.
import { z } from 'zod'
import type { Idioma } from '../i18n'

const versao = z.string().regex(/^\d+\.\d+\.\d+$/)

// z.object (não estrito): versões futuras podem acrescentar campos (ex.: traduções) sem partir o aviso desta.
const itens = z.array(z.string().min(1).max(300)).max(10)
// F21: o texto principal é em português; «traducoes» tem o mesmo texto em inglês e espanhol.
const traducoes = <T extends z.ZodRawShape>(forma: T) => z.object({ en: z.object(forma).optional(), es: z.object(forma).optional() }).optional()
const esquema = z.object({
  versoes: z
    .array(z.object({ versao, data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), itens: itens.min(1), traducoes: traducoes({ itens: itens.min(1) }) }))
    .min(1),
  emPreparacao: itens,
  traducoes: traducoes({ emPreparacao: itens }),
})

export type Novidades = z.infer<typeof esquema>
export type NovidadesVersao = Novidades['versoes'][number]

/** O ficheiro do repositório tem de ser válido; o que vem da rede pode não ser, e aí devolve null. */
export function carregarNovidades(dados: unknown): Novidades {
  return esquema.parse(dados)
}

export function lerNovidades(dados: unknown): Novidades | null {
  const r = esquema.safeParse(dados)
  return r.success ? r.data : null
}

export function compararVersoes(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return (pa[i] ?? 0) - (pb[i] ?? 0)
  return 0
}

/** A versão mais recente do ficheiro é a versão da app. */
export const versaoAtual = (n: Novidades) => n.versoes[0]!.versao

/** Versões mais recentes do que `versao`, da mais nova para a mais antiga. */
export const novidadesDepois = (n: Novidades, versao: string) => n.versoes.filter((v) => compararVersoes(v.versao, versao) > 0)

/**
 * O que o Início mostra depois de atualizar. Sem versão vista guardada: numa instalação nova (sem plano)
 * não há nada a mostrar; quem já usava a app antes de existir este registo vê as novidades da versão atual.
 */
export function novidadesPorVer(n: Novidades, vista: string | undefined, temPlano: boolean): NovidadesVersao[] {
  if (vista === undefined) return temPlano ? [n.versoes[0]!] : []
  return novidadesDepois(n, vista)
}

/** F21: as novidades no idioma pedido; sem tradução, ficam em português. */
export function novidadesNoIdioma(n: Novidades, idioma: Idioma): Novidades {
  if (idioma === 'pt') return n
  return {
    ...n,
    versoes: n.versoes.map((v) => ({ ...v, itens: v.traducoes?.[idioma]?.itens ?? v.itens })),
    emPreparacao: n.traducoes?.[idioma]?.emPreparacao ?? n.emPreparacao,
  }
}
