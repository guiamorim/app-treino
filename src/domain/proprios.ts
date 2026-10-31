// F26: exercícios criados pelo utilizador. Juntam-se ao catálogo com a mesma forma de um exercício do catálogo.
import { z } from 'zod'
import type { Catalogo } from './catalogo'
import { TIPOS_CARGA_PROPRIOS, type TipoCargaProprio } from './carga'
import { GRUPOS_MUSCULARES, type Equipamento, type Exercicio, type GrupoMuscular, type Medida, type Sessao } from './types'
import { lerVideo } from './video'

export interface ExercicioProprio {
  /** Sempre `proprio-…`, para nunca coincidir com um id do catálogo. */
  id: string
  nome: string
  medida: Medida
  tipoCarga: TipoCargaProprio
  grupoPrincipal: GrupoMuscular
  gruposSecundarios: GrupoMuscular[]
  /** Sem valor, vem da forma de contar (F26.1). */
  incrementoKg?: number
  /** «Como fazer», um ponto por linha. */
  comoFazer: string[]
  video?: string
  /** F26.4: arquivado quando tem registos; continua no catálogo para o histórico mostrar o nome. */
  arquivado?: boolean
}

const PREFIXO = 'proprio-'
export const novoIdProprio = (uuid: string) => `${PREFIXO}${uuid.toLowerCase()}`
export const eProprio = (id: string) => id.startsWith(PREFIXO)

/** F26.1: 2 kg por halter, 2,5 kg no total ou na máquina, nada só com o corpo. */
export const incrementoPadrao = (tipo: TipoCargaProprio): number => (tipo === 'halter' ? 2 : tipo === 'corporal' ? 0 : 2.5)

const EQUIPAMENTO: Record<TipoCargaProprio, Equipamento> = { halter: 'halteres', total: 'barra', maquina: 'maquina', corporal: 'peso-corporal' }

export function paraExercicio(p: ExercicioProprio): Exercicio {
  return {
    id: p.id,
    nome: p.nome,
    grupoPrincipal: p.grupoPrincipal,
    gruposSecundarios: p.gruposSecundarios.filter((g) => g !== p.grupoPrincipal),
    tipo: p.gruposSecundarios.length > 0 ? 'composto' : 'isolado',
    equipamento: [EQUIPAMENTO[p.tipoCarga]],
    medida: p.medida,
    incrementoKg: p.tipoCarga === 'corporal' ? 0 : (p.incrementoKg ?? incrementoPadrao(p.tipoCarga)),
    objetivo: '',
    pontosChave: p.comoFazer,
    contraindicacoes: [],
    substitutos: [],
    ...(p.video ? { video: p.video } : {}),
  }
}

/** F26.2: o catálogo (já no idioma da app) com os exercícios próprios, que não se traduzem. */
export function juntarProprios(catalogo: Catalogo, proprios: readonly ExercicioProprio[]): Catalogo {
  if (proprios.length === 0) return catalogo
  const mapa = new Map(catalogo)
  for (const p of proprios) if (!mapa.has(p.id)) mapa.set(p.id, paraExercicio(p))
  return mapa
}

const grupo = z.enum(GRUPOS_MUSCULARES)
export const esquemaProprio = z.strictObject({
  id: z.string().regex(/^proprio-[a-z0-9-]{1,80}$/),
  nome: z.string().trim().min(1).max(80),
  medida: z.enum(['reps', 'segundos']),
  tipoCarga: z.enum(TIPOS_CARGA_PROPRIOS),
  grupoPrincipal: grupo,
  gruposSecundarios: z.array(grupo).max(GRUPOS_MUSCULARES.length),
  incrementoKg: z.number().min(0.25).max(50).optional(),
  comoFazer: z.array(z.string().min(1).max(300)).max(20),
  video: z.string().refine((u) => lerVideo(u) !== null, 'Link de vídeo não permitido').optional(),
  arquivado: z.boolean().optional(),
})
export const esquemaProprios = z.array(esquemaProprio).max(500)

/** Leitura tolerante do que está no dispositivo: ignora entradas inválidas em vez de perder todas. */
export function lerProprios(dados: unknown): ExercicioProprio[] {
  if (!Array.isArray(dados)) return []
  return dados.flatMap((d) => {
    const r = esquemaProprio.safeParse(d)
    return r.success ? [r.data as ExercicioProprio] : []
  })
}

export const temRegistos = (id: string, sessoes: readonly Sessao[]) => sessoes.some((s) => s.exercicios.some((e) => e.exercicioId === id && e.series.length > 0))

/** F26.4: sem registos, sai da lista; com registos ou no plano (F27.5), fica arquivado. */
export function apagarProprio(proprios: readonly ExercicioProprio[], id: string, sessoes: readonly Sessao[], noPlano = false): ExercicioProprio[] {
  if (!noPlano && !temRegistos(id, sessoes)) return proprios.filter((p) => p.id !== id)
  return proprios.map((p) => (p.id === id ? { ...p, arquivado: true } : p))
}

/** F26.3: exercícios próprios que podem substituir `ex` (mesmo grupo principal e mesma medida). */
export function substitutosProprios(proprios: readonly ExercicioProprio[], ex: Pick<Exercicio, 'id' | 'grupoPrincipal' | 'medida'>): string[] {
  return proprios.filter((p) => !p.arquivado && p.id !== ex.id && p.grupoPrincipal === ex.grupoPrincipal && p.medida === ex.medida).map((p) => p.id)
}

/** Grava a versão nova de um exercício (cria-o se não existir). */
export function guardarProprio(proprios: readonly ExercicioProprio[], novo: ExercicioProprio): ExercicioProprio[] {
  const limpo = esquemaProprio.parse(novo) as ExercicioProprio
  return proprios.some((p) => p.id === limpo.id) ? proprios.map((p) => (p.id === limpo.id ? limpo : p)) : [...proprios, limpo]
}
