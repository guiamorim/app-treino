// F12: conquistas, sequência semanal e recordes, calculados a partir do histórico.
import { semanaInicioBloco, estadoBloco } from './blocos'
import { semanaDoPlano } from './plano'
import { inicioSemana, progressaoExercicio } from './relatorios'
import type { Plano, Sessao } from './types'

const SEMANA_MS = 7 * 86_400_000
const chaveSemana = (iso: string) => inicioSemana(new Date(iso)).getTime()

/** Semanas seguidas com treinos terminados ≥ meta; a semana atual só conta quando cumprida. */
export function sequenciaSemanal(sessoes: Sessao[], meta: number, agora: Date): number {
  const porSemana = new Map<number, number>()
  for (const s of sessoes) if (s.fim) porSemana.set(chaveSemana(s.inicio), (porSemana.get(chaveSemana(s.inicio)) ?? 0) + 1)
  const cumprida = (k: number) => (porSemana.get(k) ?? 0) >= meta
  let semana = inicioSemana(agora)
  let n = cumprida(semana.getTime()) ? 1 : 0
  for (;;) {
    // Recua uma semana pelo calendário (seguro com mudanças de hora).
    semana = inicioSemana(new Date(semana.getTime() - SEMANA_MS / 2))
    if (!cumprida(semana.getTime())) return n
    n++
  }
}

export const volumeSessao = (s: Sessao) => s.exercicios.reduce((t, e) => t + e.series.reduce((u, x) => u + x.carga * x.reps, 0), 0)

/** Volume (carga × reps) por semana, da mais antiga para a mais recente. */
export function volumesSemanais(sessoes: Sessao[]): { semana: Date; volume: number }[] {
  const v = new Map<number, number>()
  for (const s of sessoes) v.set(chaveSemana(s.inicio), (v.get(chaveSemana(s.inicio)) ?? 0) + volumeSessao(s))
  return [...v].sort((a, b) => a[0] - b[0]).map(([k, volume]) => ({ semana: new Date(k), volume }))
}

/** Semanas cujo volume supera todas as anteriores (a partir da segunda semana com treinos). */
export function semanasRecordeVolume(sessoes: Sessao[]): Date[] {
  let maximo = -Infinity
  const recordes: Date[] = []
  volumesSemanais(sessoes).forEach(({ semana, volume }, i) => {
    if (i > 0 && volume > maximo && volume > 0) recordes.push(semana)
    maximo = Math.max(maximo, volume)
  })
  return recordes
}

/** Recordes pessoais (1RM estimado ou melhor série), sem contar o primeiro registo de cada exercício. */
export function recordesPessoais(sessoes: Sessao[]): { data: string; exercicioId: string }[] {
  const ids = new Set(sessoes.flatMap((s) => s.exercicios.filter((e) => e.series.length > 0).map((e) => e.exercicioId)))
  return [...ids]
    .flatMap((id) => progressaoExercicio(sessoes, id).slice(1).filter((p) => p.recorde).map((p) => ({ data: p.data, exercicioId: id })))
    .sort((a, b) => a.data.localeCompare(b.data))
}

/** Pelo menos um treino terminado em cada semana de um bloco já acabado ou em curso. */
function blocoCompleto(sessoes: Sessao[], plano: Plano, agora: Date): boolean {
  const semanas = new Set(sessoes.filter((s) => s.fim && s.planoId === plano.id).map((s) => semanaDoPlano(plano, s.inicio)))
  const atual = semanaDoPlano(plano, agora.toISOString())
  const m = estadoBloco(plano, atual).semanasBloco
  for (let b = 1; semanaInicioBloco(plano, b) + m - 1 <= atual; b++) {
    const ini = semanaInicioBloco(plano, b)
    if (Array.from({ length: m }, (_, i) => ini + i).every((s) => semanas.has(s))) return true
  }
  return false
}

export interface Conquista {
  id: string
  nome: string
  descricao: string
  icone: string
  obtida: boolean
}

export function conquistas(sessoes: Sessao[], plano: Plano | undefined, meta: number, agora: Date): Conquista[] {
  const feitos = sessoes.filter((s) => s.fim).length
  const melhorSequencia = maiorSequencia(sessoes, meta)
  const recordes = recordesPessoais(sessoes).length
  const c = (id: string, icone: string, nome: string, descricao: string, obtida: boolean): Conquista => ({ id, icone, nome, descricao, obtida })
  return [
    c('primeiro-treino', '🌱', 'Primeiro treino', 'Terminaste o primeiro treino.', feitos >= 1),
    c('treinos-10', '🔟', '10 treinos', 'Terminaste 10 treinos.', feitos >= 10),
    c('treinos-25', '🥉', '25 treinos', 'Terminaste 25 treinos.', feitos >= 25),
    c('treinos-50', '🥈', '50 treinos', 'Terminaste 50 treinos.', feitos >= 50),
    c('treinos-100', '🥇', '100 treinos', 'Terminaste 100 treinos.', feitos >= 100),
    c('semana-cumprida', '✅', 'Semana cumprida', 'Fizeste todos os treinos de uma semana.', melhorSequencia >= 1),
    c('sequencia-4', '🔥', '4 semanas seguidas', '4 semanas seguidas cumpridas.', melhorSequencia >= 4),
    c('sequencia-12', '🏅', '12 semanas seguidas', '12 semanas seguidas cumpridas.', melhorSequencia >= 12),
    c('primeiro-recorde', '🏆', 'Primeiro recorde', 'Bateste um recorde pessoal.', recordes >= 1),
    c('recordes-10', '💪', '10 recordes', 'Bateste 10 recordes pessoais.', recordes >= 10),
    c('volume-recorde', '📈', 'Recorde de volume', 'Uma semana com mais volume do que todas as anteriores.', semanasRecordeVolume(sessoes).length >= 1),
    c('bloco-completo', '🧱', 'Bloco completo', 'Treinaste em todas as semanas de um bloco, descarga incluída.', !!plano && blocoCompleto(sessoes, plano, agora)),
  ]
}

/** Maior sequência de semanas cumpridas em todo o histórico. */
function maiorSequencia(sessoes: Sessao[], meta: number): number {
  const porSemana = new Map<number, number>()
  for (const s of sessoes) if (s.fim) porSemana.set(chaveSemana(s.inicio), (porSemana.get(chaveSemana(s.inicio)) ?? 0) + 1)
  const cumpridas = [...porSemana].filter(([, n]) => n >= meta).map(([k]) => k).sort((a, b) => a - b)
  let melhor = 0
  let atual = 0
  cumpridas.forEach((k, i) => {
    // Semanas consecutivas distam ~7 dias (6,9 a 7,1 com mudança de hora).
    atual = i > 0 && Math.abs(k - cumpridas[i - 1]! - SEMANA_MS) < 3_600_000 * 2 ? atual + 1 : 1
    melhor = Math.max(melhor, atual)
  })
  return melhor
}
