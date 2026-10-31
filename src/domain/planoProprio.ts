// F27: plano criado pelo utilizador. Tem a mesma forma de um plano gerado, para o registo, a progressão,
// os relatórios e as exportações funcionarem igual.
import { t } from '../i18n'
import { estadoBloco, exercicioNoBloco, SEMANAS_BLOCO } from './blocos'
import type { Catalogo } from './catalogo'
import { duracaoEstimadaMin, PARAMETROS } from './plano'
import type { Exercicio, Objetivo, Plano, Prescricao, TreinoModelo } from './types'

export const MAX_TREINOS = 7
export const MAX_EXERCICIOS = 20
export const SEMANAS_READAPTACAO_POSSIVEIS = [0, 1, 2, 3, 4] as const
export const SEMANAS_BLOCO_POSSIVEIS = [3, 4, 5, 6, 7, 8] as const
const FAIXA_SEGUNDOS: [number, number] = [20, 45]

export interface Rascunho {
  treinos: TreinoModelo[]
  /** F27.3: 0 = sem readaptação. */
  semanasReadaptacao: number
  descarga: boolean
  semanasBloco: number
  /** F27.3: as semanas (readaptação e blocos) voltam a contar a partir de hoje. */
  recomecar: boolean
}

/** F27.2: valores por omissão de um exercício acabado de juntar, pelas regras do objetivo (secção 3.2). */
export function prescricaoPadrao(ex: Exercicio, objetivo: Objetivo, id: string): Prescricao {
  const p = PARAMETROS[objetivo][ex.tipo]
  return {
    id,
    exercicioId: ex.id,
    series: 3,
    faixa: ex.faixaFixa ?? (ex.medida === 'segundos' ? FAIXA_SEGUNDOS : p.faixa),
    rir: p.rir,
    descansoSeg: p.descansoSeg,
  }
}

/**
 * F27.1: o rascunho parte do plano atual. Os exercícios ficam os do bloco atual, sem a rotação entre blocos.
 * Num plano gerado, a readaptação e a descarga vêm ligadas (2 semanas e um bloco do objetivo).
 */
export function rascunhoDe(plano: Plano, objetivo: Objetivo, semana: number): Rascunho {
  const bloco = estadoBloco(plano, semana).bloco
  const doBloco = ({ alternativas, ...p }: Prescricao): Prescricao => {
    const exercicioId = exercicioNoBloco(alternativas, p.exercicioId, bloco)
    if (exercicioId === p.exercicioId) return p
    const { nota: _, ...resto } = p
    return { ...resto, exercicioId }
  }
  return {
    treinos: plano.treinos.map((tr) => ({ ...tr, prescricoes: tr.prescricoes.map(doBloco) })),
    semanasReadaptacao: plano.proprio ? (plano.semanasReadaptacao ?? 0) : 2,
    descarga: plano.proprio ? plano.descarga !== false : true,
    semanasBloco: plano.semanasBloco ?? SEMANAS_BLOCO[objetivo],
    recomecar: false,
  }
}

/** F27.2: devolve a mensagem do primeiro problema, ou null se o rascunho pode ser guardado. */
export function validarRascunho(r: Rascunho, catalogo: Catalogo): string | null {
  if (r.treinos.length === 0) return t('Junta pelo menos um treino.')
  if (r.treinos.length > MAX_TREINOS) return t('No máximo {n} treinos.', { n: MAX_TREINOS })
  for (const tr of r.treinos) {
    const nome = tr.nome.trim()
    if (!nome) return t('Dá um nome a cada treino.')
    if (tr.prescricoes.length === 0) return t('«{treino}» não tem exercícios.', { treino: nome })
    if (tr.prescricoes.length > MAX_EXERCICIOS) return t('«{treino}» tem mais de {n} exercícios.', { treino: nome, n: MAX_EXERCICIOS })
    for (const p of tr.prescricoes) {
      const ex = catalogo.get(p.exercicioId)
      if (!ex) return t('«{treino}» tem um exercício que já não existe.', { treino: nome })
      const [min, max] = p.faixa
      const inteiro = (n: number, a: number, b: number) => Number.isInteger(n) && n >= a && n <= b
      const unidade = ex.medida === 'segundos' ? t('segundos') : t('repetições')
      if (!inteiro(p.series, 1, 10)) return t('{exercicio}: as séries vão de 1 a 10.', { exercicio: ex.nome })
      if (!inteiro(min, 1, 600) || !inteiro(max, 1, 600) || min > max) return t('{exercicio}: indica as {unidade} mínimas e máximas.', { exercicio: ex.nome, unidade })
      if (!inteiro(p.rir[0], 0, 5) || !inteiro(p.rir[1], 0, 5) || p.rir[0] > p.rir[1]) return t('{exercicio}: o RIR vai de 0 a 5, o mínimo primeiro.', { exercicio: ex.nome })
      if (!inteiro(p.descansoSeg, 0, 600)) return t('{exercicio}: o descanso vai de 0 a 600 segundos.', { exercicio: ex.nome })
    }
  }
  return null
}

/**
 * F27: o plano a gravar. Mantém o id do plano atual, para a rotação e o histórico continuarem;
 * só recomeça a contar as semanas se o utilizador o pedir.
 */
export function planoDoRascunho(r: Rascunho, atual: Plano, agora: string): Plano {
  const treinos = r.treinos.map((tr) => ({
    ...tr,
    nome: tr.nome.trim().slice(0, 100),
    duracaoEstimadaMin: duracaoEstimadaMin(tr.prescricoes, tr.cardioMin ?? 0),
  }))
  return {
    id: atual.id,
    criadoEm: r.recomecar ? agora : atual.criadoEm,
    versaoRegras: atual.versaoRegras,
    conservador: atual.conservador,
    readaptacao: r.semanasReadaptacao > 0,
    semanasReadaptacao: r.semanasReadaptacao,
    descarga: r.descarga,
    semanasBloco: r.semanasBloco,
    proprio: true,
    treinos,
    avisos: atual.avisos,
  }
}

/** Troca dois elementos de posição (para subir e descer), sem sair da lista. */
export function mover<T>(lista: readonly T[], i: number, delta: -1 | 1): T[] {
  const j = i + delta
  if (j < 0 || j >= lista.length) return [...lista]
  const nova = [...lista]
  ;[nova[i], nova[j]] = [nova[j]!, nova[i]!]
  return nova
}

/** F26.4 com F27: um exercício próprio está no plano se alguma prescrição o usa. */
export const noPlano = (plano: Plano | undefined, exercicioId: string) =>
  !!plano?.treinos.some((tr) => tr.prescricoes.some((p) => p.exercicioId === exercicioId || p.alternativas?.includes(exercicioId)))
