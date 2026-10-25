import { z } from 'zod'
import { AREAS, EQUIPAMENTOS, GRUPOS_MUSCULARES, type Exercicio } from './types'

const grupo = z.enum(GRUPOS_MUSCULARES)

export const esquemaExercicio = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  nome: z.string().min(1),
  grupoPrincipal: grupo,
  gruposSecundarios: z.array(grupo),
  tipo: z.enum(['composto', 'isolado']),
  equipamento: z.array(z.enum(EQUIPAMENTOS)).min(1),
  medida: z.enum(['reps', 'segundos']),
  faixaFixa: z.tuple([z.number().int().positive(), z.number().int().positive()]).optional(),
  incrementoKg: z.number().min(0),
  objetivo: z.string().min(1),
  pontosChave: z.array(z.string()),
  contraindicacoes: z.array(z.enum(AREAS)),
  substitutos: z.array(z.string()),
  video: z.string().url().optional(),
  deitado: z.enum(['costas', 'barriga']).optional(),
})

export type Catalogo = ReadonlyMap<string, Exercicio>

export function carregarCatalogo(dados: unknown): Catalogo {
  const lista = z.array(esquemaExercicio).parse(dados)
  const mapa = new Map<string, Exercicio>()
  for (const ex of lista) {
    if (mapa.has(ex.id)) throw new Error(`Exercício duplicado: ${ex.id}`)
    mapa.set(ex.id, ex)
  }
  for (const ex of lista) {
    for (const s of ex.substitutos) {
      if (!mapa.has(s)) throw new Error(`Substituto inexistente em ${ex.id}: ${s}`)
    }
  }
  return mapa
}

export function obter(catalogo: Catalogo, id: string): Exercicio {
  const ex = catalogo.get(id)
  if (!ex) throw new Error(`Exercício desconhecido: ${id}`)
  return ex
}

/** F21: textos de cada exercício noutro idioma (nome, objetivo e pontos-chave), por id. */
const esquemaTraducao = z.record(z.string(), z.strictObject({ nome: z.string().min(1), objetivo: z.string().min(1), pontosChave: z.array(z.string().min(1)) }))

export function traduzirCatalogo(catalogo: Catalogo, dados: unknown): Catalogo {
  const tr = esquemaTraducao.parse(dados)
  return new Map([...catalogo].map(([id, ex]) => [id, tr[id] ? { ...ex, ...tr[id] } : ex]))
}
