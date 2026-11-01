// F37 (v1.26): programas de cardio definidos e personalizado, com progressão semanal.
import { m, t, traduzido } from '../i18n'
import { diaDaSemana, diaLocal, somarDias } from './calendario'
import type { Modalidade, RegistoCardio } from './cardio'
import type { Anamnese } from './types'

export const PROGRAMAS = ['caminhar', 'baixo-impacto', 'correr-5km', 'intervalos', 'emagrecer'] as const
export type IdPrograma = (typeof PROGRAMAS)[number]

/** Intervalos de uma sessão: `series` × (trabalho + recuperação), em minutos. */
export interface Intervalos {
  series: number
  trabalhoMin: number
  recuperacaoMin: number
}

export interface SessaoPrograma {
  minutos: number
  esforco: readonly [number, number]
  /** Modalidade sugerida (pode ser trocada no registo). */
  modalidade: Modalidade
  intervalos?: Intervalos
  /** Minutos a andar antes e depois dos intervalos (aquecimento e retorno à calma). */
  calmaMin?: number
}

export interface Programa {
  id: IdPrograma | 'personalizado'
  semanas: SessaoPrograma[][]
}

const MODERADO = [5, 6] as const

const repetir = (n: number, s: SessaoPrograma) => Array.from({ length: n }, () => s)
const continuo = (modalidade: Modalidade, esforco: readonly [number, number] = MODERADO) => (n: number, minutos: number) => repetir(n, { minutos, esforco, modalidade })

/** Sessão de intervalos com aquecimento e retorno à calma a andar. */
function comIntervalos(modalidade: Modalidade, esforco: readonly [number, number], series: number, trabalhoMin: number, recuperacaoMin: number, calmaMin: number): SessaoPrograma {
  const minutos = calmaMin * 2 + series * trabalhoMin + (series - 1) * recuperacaoMin
  return { minutos: Math.round(minutos), esforco, modalidade, intervalos: { series, trabalhoMin, recuperacaoMin }, calmaMin }
}

const caminhar = continuo('caminhada')
const baixo = continuo('bicicleta')
const correr = (series: number, trabalho: number, recuperacao: number) => repetir(3, comIntervalos('corrida', [6, 7], series, trabalho, recuperacao, 5))
const seguidos = (minutos: number) => repetir(3, { minutos: minutos + 10, esforco: [6, 7] as const, modalidade: 'corrida' as const, calmaMin: 5 })
const fortes = (series: number) => repetir(2, comIntervalos('bicicleta', [8, 8], series, 4, 3, 7))
const emagrecer = continuo('caminhada')

/**
 * F37.1: os cinco programas. As semanas são listas de sessões, pela ordem em que se fazem.
 * Caminhar e baixo impacto sobem o volume aos poucos (até 10–20 % por semana nas primeiras); correr 5 km
 * alterna correr e andar até 30 min seguidos; intervalos 4 × 4 min a 8/10 (com 3 min leves) mais cardio moderado;
 * emagrecer sobe de 150 para 250 min por semana (Donnelly et al., 2009).
 */
export const DEFINICOES: Record<IdPrograma, SessaoPrograma[][]> = {
  caminhar: [caminhar(3, 20), caminhar(3, 25), caminhar(4, 25), caminhar(4, 30), caminhar(4, 35), caminhar(5, 35), caminhar(5, 40), caminhar(5, 45)],
  'baixo-impacto': [baixo(3, 25), baixo(3, 30), baixo(3, 35), baixo(4, 30), baixo(4, 35), baixo(4, 40), baixo(4, 40), baixo(4, 45)],
  'correr-5km': [correr(8, 1, 1.5), correr(6, 2, 1.5), correr(5, 3, 1.5), correr(4, 5, 2), correr(3, 8, 2), correr(2, 12, 2), seguidos(20), seguidos(25), seguidos(30)],
  intervalos: [
    [...fortes(3), ...baixo(1, 30)],
    [...fortes(3), ...baixo(1, 30)],
    [...fortes(4), ...baixo(1, 30)],
    [...fortes(4), ...baixo(1, 35)],
    [...fortes(4), ...baixo(2, 30)],
    [...fortes(4), ...baixo(2, 35)],
  ],
  emagrecer: [emagrecer(5, 30), emagrecer(5, 30), emagrecer(5, 35), emagrecer(5, 35), emagrecer(5, 40), emagrecer(5, 40), emagrecer(5, 45), emagrecer(5, 45), emagrecer(5, 50), emagrecer(5, 50), emagrecer(5, 50), emagrecer(5, 50)],
}

const NOMES_PT: Record<IdPrograma | 'personalizado', { nome: string; descricao: string }> = {
  caminhar: { nome: m('Começar a caminhar'), descricao: m('8 semanas de caminhada rápida, de 3 × 20 min até 5 × 45 min. Para quem começa do zero, tem excesso de peso ou está a voltar ao exercício.') },
  'baixo-impacto': { nome: m('Baixo impacto'), descricao: m('8 semanas de bicicleta, elíptica ou natação, de 3 × 25 min até 4 × 45 min. Para quem tem dores nos joelhos ou nas costas, ou muito peso a perder.') },
  'correr-5km': { nome: m('Correr 5 km'), descricao: m('9 semanas, 3 vezes por semana: alternas correr e andar até correres 30 min seguidos.') },
  intervalos: { nome: m('Intervalos para quem já treina'), descricao: m('6 semanas: 2 sessões por semana de 3–4 × 4 min a esforço 8/10, com 3 min leves entre cada, e 1–2 sessões de cardio moderado.') },
  emagrecer: { nome: m('Emagrecer com cardio'), descricao: m('12 semanas: sobe de 150 para 250 min de cardio moderado por semana, em 5 sessões.') },
  personalizado: { nome: m('Programa personalizado'), descricao: m('Escolhes os dias, a modalidade, os minutos e o esforço, e quanto sobe por semana.') },
}
export const NOMES_PROGRAMAS = Object.fromEntries(Object.entries(NOMES_PT).map(([k, v]) => [k, traduzido(v)])) as typeof NOMES_PT

/** Programa personalizado (F37.2): uma sessão por dia escolhido, igual todas as semanas, com progressão. */
export interface SessaoPersonalizada {
  /** 0 = segunda … 6 = domingo. */
  dia: number
  modalidade: Modalidade
  minutos: number
  esforco: number
}
export interface Personalizado {
  sessoes: SessaoPersonalizada[]
  semanas: number
  /** Aumento dos minutos por semana, em %, de 0 a 10. */
  progressaoPct: number
}

export const LIMITES_PERSONALIZADO = { semanas: [2, 16], progressaoPct: [0, 10], minutos: [5, 180] } as const

/** F37.2: as semanas do programa personalizado; os minutos sobem a percentagem escolhida, arredondados ao minuto. */
export function semanasPersonalizado(p: Personalizado): SessaoPrograma[][] {
  const ordenadas = [...p.sessoes].sort((a, b) => a.dia - b.dia)
  return Array.from({ length: p.semanas }, (_, i) =>
    ordenadas.map((s) => ({ minutos: Math.min(300, Math.round(s.minutos * (1 + p.progressaoPct / 100) ** i)), esforco: [s.esforco, s.esforco] as const, modalidade: s.modalidade })),
  )
}

/** F37.2: avisos do personalizado. Um total vigoroso acima de 300 min por semana pede cuidado. */
export function avisosPersonalizado(p: Personalizado): string[] {
  const ultima = semanasPersonalizado(p).at(-1) ?? []
  const vigoroso = ultima.filter((s) => s.esforco[0] >= 7).reduce((n, s) => n + s.minutos, 0)
  return vigoroso > 300 ? [t('Na última semana fazes {min} min de cardio vigoroso. Mais de 300 min por semana aumenta o risco de lesão e de cansaço; considera trocar algumas sessões por moderadas.', { min: vigoroso })] : []
}

export type ErroPersonalizado = 'sem-sessoes' | 'dia-repetido' | 'minutos' | 'esforco' | 'semanas' | 'progressao'

export function validarPersonalizado(p: Personalizado): ErroPersonalizado | null {
  if (p.sessoes.length === 0) return 'sem-sessoes'
  if (new Set(p.sessoes.map((s) => s.dia)).size !== p.sessoes.length || p.sessoes.some((s) => !Number.isInteger(s.dia) || s.dia < 0 || s.dia > 6)) return 'dia-repetido'
  if (p.sessoes.some((s) => !Number.isInteger(s.minutos) || s.minutos < LIMITES_PERSONALIZADO.minutos[0] || s.minutos > LIMITES_PERSONALIZADO.minutos[1])) return 'minutos'
  if (p.sessoes.some((s) => !Number.isInteger(s.esforco) || s.esforco < 0 || s.esforco > 10)) return 'esforco'
  if (!Number.isInteger(p.semanas) || p.semanas < LIMITES_PERSONALIZADO.semanas[0] || p.semanas > LIMITES_PERSONALIZADO.semanas[1]) return 'semanas'
  if (!Number.isInteger(p.progressaoPct) || p.progressaoPct < 0 || p.progressaoPct > 10) return 'progressao'
  return null
}

/** O programa escolhido, guardado no dispositivo e na cópia. */
export interface ProgramaAtivo {
  id: IdPrograma | 'personalizado'
  /** Dia local em que começou (AAAA-MM-DD); as semanas do programa contam a partir dele. */
  inicio: string
  personalizado?: Personalizado
  /** F37.5: plano só de cardio (o treino de força fica como recomendação). */
  soCardio?: boolean
}

export function programa(a: ProgramaAtivo): Programa {
  return { id: a.id, semanas: a.id === 'personalizado' ? semanasPersonalizado(a.personalizado!) : DEFINICOES[a.id] }
}

/**
 * F37.3: bloqueios por segurança. Correr 5 km pede PAR-Q sem «sim», sem gravidez nem pós-parto e sem dor no
 * joelho ou na anca; intervalos pedem PAR-Q sem «sim» e sem gravidez nem pós-parto. F38.6: no pós-parto,
 * abrem depois de passar o teste de impacto (`regressoPosParto`).
 */
export function bloqueio(id: IdPrograma, a: Anamnese, regressoPosParto = false): string | null {
  const gravidez = a.sexo === 'feminino' ? (a.gravidez ?? 'nao') : 'nao'
  if (id !== 'correr-5km' && id !== 'intervalos') return null
  if (a.parq.some(Boolean)) return t('Respondeste «sim» no PAR-Q+: fala primeiro com o médico.')
  if (gravidez === 'pos-parto' && !regressoPosParto) return t('No pós-parto, este programa abre quando passares no teste de impacto (ecrã Pós-parto).')
  if (gravidez !== 'nao' && gravidez !== 'pos-parto') return t('Na gravidez, este programa fica para depois (ver o aviso do teu plano).')
  if (id === 'correr-5km' && a.restricoes.some((r) => (r.area === 'joelho' || r.area === 'anca') && r.intensidade > 0)) return t('Com dor no joelho ou na anca, a corrida pode piorá-la: o baixo impacto é a melhor escolha.')
  return null
}

export interface Progresso {
  /** Semana do programa, a partir de 1. */
  semana: number
  total: number
  /** Sessões registadas nesta semana do programa. */
  feitas: number
  sessoes: SessaoPrograma[]
  /** A próxima sessão desta semana, se ainda falta alguma. */
  proxima?: SessaoPrograma
  terminado: boolean
  /** Dias até começar a semana seguinte do programa (1–7). */
  faltamDias: number
}

/**
 * F37.4: em que semana vai o programa e quantas sessões tem feitas. Cada registo de cardio desde o início da
 * semana do programa conta como uma sessão feita (até ao número de sessões da semana).
 */
export function progresso(a: ProgramaAtivo, registos: readonly RegistoCardio[], hoje: string): Progresso {
  const semanas = programa(a).semanas
  const dias = Math.max(0, Math.round((Date.parse(`${hoje}T12:00:00Z`) - Date.parse(`${a.inicio}T12:00:00Z`)) / 86_400_000))
  const n = Math.floor(dias / 7) + 1
  const terminado = n > semanas.length
  const semana = Math.min(n, semanas.length)
  const sessoes = semanas[semana - 1]!
  const ini = somarDias(a.inicio, (semana - 1) * 7)
  const fim = somarDias(ini, 7)
  const feitas = Math.min(sessoes.length, registos.filter((r) => diaLocal(r.data) >= ini && diaLocal(r.data) < fim).length)
  return { semana, total: semanas.length, feitas, sessoes, ...(terminado || feitas >= sessoes.length ? {} : { proxima: sessoes[feitas] }), terminado, faltamDias: 7 - (dias % 7) }
}

/** F37.2: no personalizado, a sessão de hoje só existe nos dias escolhidos. */
export const diaDoPersonalizado = (p: Personalizado, hoje: string) => p.sessoes.some((s) => s.dia === diaDaSemana(hoje))

/** Texto curto de uma sessão: «6 × (2 min a correr + 1,5 min a andar) · 31 min · esforço 6–7». */
export function textoSessao(s: SessaoPrograma, decimal: (n: number) => string): string {
  const esforco = s.esforco[0] === s.esforco[1] ? t('esforço {n}', { n: s.esforco[0] }) : t('esforço {a}–{b}', { a: s.esforco[0], b: s.esforco[1] })
  const corpo = s.intervalos
    ? s.modalidade === 'corrida'
      ? t('{n} × ({a} min a correr + {b} min a andar)', { n: s.intervalos.series, a: decimal(s.intervalos.trabalhoMin), b: decimal(s.intervalos.recuperacaoMin) })
      : t('{n} × ({a} min forte + {b} min leve)', { n: s.intervalos.series, a: decimal(s.intervalos.trabalhoMin), b: decimal(s.intervalos.recuperacaoMin) })
    : s.calmaMin
      ? t('{min} min a correr seguidos', { min: s.minutos - s.calmaMin * 2 })
      : ''
  // Na corrida, aquecimento e retorno à calma a andar; nas outras modalidades, a ritmo leve.
  const calma = !s.calmaMin ? '' : s.modalidade === 'corrida' ? t('com {min} min a andar antes e depois', { min: s.calmaMin }) : t('com {min} min leves antes e depois', { min: s.calmaMin })
  return [corpo, calma, t('{min} min', { min: s.minutos }), esforco].filter(Boolean).join(' · ')
}
