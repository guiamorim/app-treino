// F19: alongamentos depois do treino ou por grupo muscular.
import { z } from 'zod'
import type { Catalogo } from './catalogo'
import { AREAS, GRUPOS_MUSCULARES, POSICOES_ALONGAMENTO, type Alongamento, type Anamnese, type GrupoMuscular, type Plano, type Sessao } from './types'

/** Dose: 2 repetições de 30 s por músculo (ACSM: 10–30 s, cerca de 60 s por músculo). */
export const REPETICOES = 2
export const SEGUNDOS = 30
const TRANSICAO_SEG = 10
const MAX_GRUPOS = 6
const JANELA_LEMBRETE_MS = 12 * 3_600_000

const esquema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  nome: z.string().min(1),
  grupo: z.enum(GRUPOS_MUSCULARES),
  gruposSecundarios: z.array(z.enum(GRUPOS_MUSCULARES)),
  posicao: z.enum(POSICOES_ALONGAMENTO),
  lados: z.union([z.literal(1), z.literal(2)]),
  passos: z.array(z.string().min(1)).min(2),
  cuidados: z.array(z.string().min(1)),
  contraindicacoes: z.array(z.enum(AREAS)),
  video: z.string().url().optional(),
})

export type CatalogoAlongamentos = ReadonlyMap<string, Alongamento>

export function carregarAlongamentos(dados: unknown): CatalogoAlongamentos {
  const lista = z.array(esquema).parse(dados) as Alongamento[]
  const mapa = new Map(lista.map((a) => [a.id, a]))
  if (mapa.size !== lista.length) throw new Error('Ids de alongamento repetidos.')
  return mapa
}

/** Segundos de um alongamento: as repetições de cada lado e a mudança de posição. */
export const duracaoSeg = (a: Alongamento) => REPETICOES * SEGUNDOS * a.lados + TRANSICAO_SEG

export function duracaoMin(lista: Alongamento[]): number {
  return Math.max(1, Math.round(lista.reduce((s, a) => s + duracaoSeg(a), 0) / 60))
}

/** Contraindicado numa zona com dor, ou deitado de costas ou de barriga no 2.º e 3.º trimestre. */
export function alongamentoCompativel(a: Alongamento, anamnese: Anamnese): boolean {
  if (a.contraindicacoes.some((c) => anamnese.restricoes.some((r) => r.area === c))) return false
  if (a.posicao === 'deitado' && anamnese.sexo === 'feminino' && anamnese.gravidez === 'gravida-2t3t') return false
  return true
}

export function alongamentosDoGrupo(grupo: GrupoMuscular, cat: CatalogoAlongamentos, anamnese: Anamnese): Alongamento[] {
  return [...cat.values()].filter((a) => a.grupo === grupo && alongamentoCompativel(a, anamnese))
}

/** Um alongamento por grupo principal dos exercícios, pela ordem em que aparecem, até 6 grupos. */
export function alongamentoDoTreino(exercicioIds: string[], catalogo: Catalogo, cat: CatalogoAlongamentos, anamnese: Anamnese): Alongamento[] {
  const grupos = [...new Set(exercicioIds.map((id) => catalogo.get(id)?.grupoPrincipal).filter((g) => g !== undefined))]
  return grupos.flatMap((g) => alongamentosDoGrupo(g, cat, anamnese).slice(0, 1)).slice(0, MAX_GRUPOS)
}

/** Última sessão terminada nas últimas 12 horas, se ainda não respondeu ao lembrete de alongamento. */
export function sessaoRecente(sessoes: Sessao[], agora: string): Sessao | undefined {
  const t = Date.parse(agora)
  return sessoes
    .filter((s) => s.fim && t - Date.parse(s.fim) >= 0 && t - Date.parse(s.fim) <= JANELA_LEMBRETE_MS)
    .sort((a, b) => a.fim!.localeCompare(b.fim!))
    .at(-1)
}

export function lembreteAlongamento(sessoes: Sessao[], agora: string): Sessao | undefined {
  const s = sessaoRecente(sessoes, agora)
  return s && !s.alongamento ? s : undefined
}

/** Exercícios do treino a alongar: os feitos no treino recente; se não houver, os do próximo treino. */
export function exerciciosParaAlongar(plano: Plano, sessoes: Sessao[], agora: string, proximoTreinoId: string): { treinoNome: string; exercicioIds: string[]; sessao?: Sessao } {
  const s = sessaoRecente(sessoes, agora)
  if (s) {
    const feitos = s.exercicios.filter((e) => !e.saltado && e.series.length > 0).map((e) => e.exercicioId)
    const treino = plano.treinos.find((t) => t.id === s.treinoId)
    const ids = feitos.length ? feitos : (treino?.prescricoes.map((p) => p.exercicioId) ?? [])
    return { treinoNome: treino?.nome ?? 'Treino', exercicioIds: ids, sessao: s }
  }
  const t = plano.treinos.find((x) => x.id === proximoTreinoId) ?? plano.treinos[0]!
  return { treinoNome: t.nome, exercicioIds: t.prescricoes.map((p) => p.exercicioId) }
}
