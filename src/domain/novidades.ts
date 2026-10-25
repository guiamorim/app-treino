// F20: novidades de cada versão e o que está em preparação, lidas de src/novidades.json.
import { z } from 'zod'

const versao = z.string().regex(/^\d+\.\d+\.\d+$/)

const esquema = z.strictObject({
  versoes: z
    .array(z.strictObject({ versao, data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), itens: z.array(z.string().min(1).max(300)).min(1).max(10) }))
    .min(1),
  emPreparacao: z.array(z.string().min(1).max(300)).max(10),
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
