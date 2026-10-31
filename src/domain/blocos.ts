// Blocos, descarga e rotação de exercícios (especificação, secção 3.7) e próxima mudança (F14).
import type { Objetivo, Plano } from './types'

export const SEMANAS_BLOCO: Record<Objetivo, number> = { forca: 4, recomposicao: 5, hipertrofia: 5, saude: 6 }
export const SEMANAS_BLOCO_ANTIGO = 5
const SEMANAS_READAPTACAO = 2

export type Fase = 'readaptacao' | 'progressao' | 'descarga'

export interface EstadoBloco {
  semana: number
  fase: Fase
  /** Começa em 1; a readaptação pertence ao bloco 1. */
  bloco: number
  /** 0 durante a readaptação. */
  semanaNoBloco: number
  semanasBloco: number
}

/** F27.3: o plano próprio escolhe as semanas de readaptação; os gerados têm 2 ou nenhuma. */
export const semanasReadaptacao = (p: Plano) => p.semanasReadaptacao ?? (p.readaptacao ? SEMANAS_READAPTACAO : 0)
const offset = semanasReadaptacao

export function estadoBloco(plano: Plano, semana: number): EstadoBloco {
  const semanasBloco = plano.semanasBloco ?? SEMANAS_BLOCO_ANTIGO
  if (semana <= offset(plano)) return { semana, fase: 'readaptacao', bloco: 1, semanaNoBloco: 0, semanasBloco }
  const s = semana - offset(plano) - 1
  const semanaNoBloco = (s % semanasBloco) + 1
  return {
    semana,
    fase: semanaNoBloco === semanasBloco && plano.descarga !== false ? 'descarga' : 'progressao',
    bloco: Math.floor(s / semanasBloco) + 1,
    semanaNoBloco,
    semanasBloco,
  }
}

/** Primeira semana do bloco n. */
export const semanaInicioBloco = (plano: Plano, bloco: number) =>
  offset(plano) + (bloco - 1) * (plano.semanasBloco ?? SEMANAS_BLOCO_ANTIGO) + 1

/** Exercício da prescrição no bloco n. */
export function exercicioNoBloco(alternativas: string[] | undefined, exercicioId: string, bloco: number): string {
  if (!alternativas?.length) return exercicioId
  return alternativas[(bloco - 1) % alternativas.length]!
}

export interface Troca {
  treino: string
  de: string
  para: string
}

/** Exercícios que mudam ao entrar no bloco n (em relação ao bloco anterior). */
export function trocasDoBloco(plano: Plano, bloco: number): Troca[] {
  if (bloco <= 1) return []
  return plano.treinos.flatMap((t) =>
    t.prescricoes.flatMap((p) => {
      const de = exercicioNoBloco(p.alternativas, p.exercicioId, bloco - 1)
      const para = exercicioNoBloco(p.alternativas, p.exercicioId, bloco)
      return de === para ? [] : [{ treino: t.nome, de, para }]
    }),
  )
}

export interface Mudanca {
  tipo: 'fim-readaptacao' | 'descarga' | 'novo-bloco'
  semana: number
  /** Início da semana da mudança (contada a partir da criação do plano). */
  data: string
  bloco: number
}

export function proximaMudanca(plano: Plano, semana: number): Mudanca {
  const e = estadoBloco(plano, semana)
  const data = (s: number) => new Date(Date.parse(plano.criadoEm) + (s - 1) * 7 * 86_400_000).toISOString()
  if (e.fase === 'readaptacao') {
    const s = offset(plano) + 1
    return { tipo: 'fim-readaptacao', semana: s, data: data(s), bloco: 1 }
  }
  // F27.3: sem descarga, a mudança seguinte é o bloco novo.
  if (e.fase === 'progressao' && plano.descarga === false) {
    const s = semana + (e.semanasBloco - e.semanaNoBloco) + 1
    return { tipo: 'novo-bloco', semana: s, data: data(s), bloco: e.bloco + 1 }
  }
  if (e.fase === 'progressao') {
    const s = semana + (e.semanasBloco - e.semanaNoBloco)
    return { tipo: 'descarga', semana: s, data: data(s), bloco: e.bloco }
  }
  return { tipo: 'novo-bloco', semana: semana + 1, data: data(semana + 1), bloco: e.bloco + 1 }
}
