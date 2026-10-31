import { m } from '../i18n'
import type { DiasPorSemana, DivisaoTreino } from './types'

// Treinos-modelo base (especificação, secção 3.1). Cada posição indica o exercício preferido;
// a geração troca-o por um substituto quando há restrições ou falta equipamento.

export interface Posicao {
  exercicioId: string
  /** Exercício principal do treino: recebe uma série extra. */
  principal?: boolean
  /** F31.5 (v1.20): na calistenia, o degrau de partida de quem já tem experiência. */
  intermedio?: string
  /** F31.6: exercício de competência, só com a opção ligada. */
  competencia?: boolean
}

export interface Modelo {
  id: string
  nome: string
  sintese: string
  posicoes: Posicao[]
  tipo: 'superior' | 'inferior' | 'corpo' | 'recuperacao'
}

export const MODELOS: Record<string, Modelo> = {
  'superior-a': {
    id: 'superior-a',
    nome: m('Superior A'),
    tipo: 'superior',
    sintese: m('Empurrar e puxar: foco em peito e costas, com ombros e braços no fim.'),
    posicoes: [
      { exercicioId: 'supino-barra', principal: true },
      { exercicioId: 'remada-cabo-sentado', principal: true },
      { exercicioId: 'puxada-frente' },
      { exercicioId: 'elevacao-lateral' },
      { exercicioId: 'curl-halteres' },
      { exercicioId: 'triceps-corda' },
    ],
  },
  'inferior-a': {
    id: 'inferior-a',
    nome: m('Inferior A'),
    tipo: 'inferior',
    sintese: m('Pernas com foco em quadríceps e posteriores da coxa; core no fim.'),
    posicoes: [
      { exercicioId: 'leg-press', principal: true },
      { exercicioId: 'peso-morto-romeno', principal: true },
      { exercicioId: 'leg-curl-deitado' },
      { exercicioId: 'gemeos-pe' },
      { exercicioId: 'prancha' },
    ],
  },
  'superior-b': {
    id: 'superior-b',
    nome: m('Superior B'),
    tipo: 'superior',
    sintese: m('Peito superior e costas; ombro posterior para equilibrar a postura.'),
    posicoes: [
      { exercicioId: 'supino-inclinado-barra', principal: true },
      { exercicioId: 'remada-halter-unilateral', principal: true },
      { exercicioId: 'puxada-neutra' },
      { exercicioId: 'face-pull' },
      { exercicioId: 'curl-martelo' },
      { exercicioId: 'triceps-polia' },
    ],
  },
  'inferior-b': {
    id: 'inferior-b',
    nome: m('Inferior B'),
    tipo: 'inferior',
    sintese: m('Pernas com foco em glúteos e quadríceps; posteriores sentado, trabalho unilateral e core.'),
    posicoes: [
      { exercicioId: 'agachamento-goblet', principal: true },
      { exercicioId: 'hip-thrust', principal: true },
      { exercicioId: 'agachamento-bulgaro' },
      { exercicioId: 'leg-curl-sentado' },
      { exercicioId: 'dead-bug' },
    ],
  },
  'corpo-a': {
    id: 'corpo-a',
    nome: m('Corpo inteiro A'),
    tipo: 'corpo',
    sintese: m('Corpo inteiro: pernas, empurrar, puxar e dobradiça da anca.'),
    posicoes: [
      { exercicioId: 'leg-press' },
      { exercicioId: 'supino-barra' },
      { exercicioId: 'remada-cabo-sentado' },
      { exercicioId: 'peso-morto-romeno' },
      { exercicioId: 'elevacao-lateral' },
      { exercicioId: 'prancha' },
    ],
  },
  'corpo-b': {
    id: 'corpo-b',
    nome: m('Corpo inteiro B'),
    tipo: 'corpo',
    sintese: m('Corpo inteiro: agachamento, peito superior, puxada vertical e glúteos.'),
    posicoes: [
      { exercicioId: 'agachamento-goblet' },
      { exercicioId: 'supino-inclinado-barra' },
      { exercicioId: 'puxada-frente' },
      { exercicioId: 'hip-thrust' },
      { exercicioId: 'curl-halteres' },
      { exercicioId: 'triceps-corda' },
    ],
  },
  'corpo-c': {
    id: 'corpo-c',
    nome: m('Corpo inteiro C'),
    tipo: 'corpo',
    sintese: m('Corpo inteiro: trabalho unilateral, máquinas e ombro posterior.'),
    posicoes: [
      { exercicioId: 'agachamento-bulgaro' },
      { exercicioId: 'supino-maquina' },
      { exercicioId: 'remada-halter-unilateral' },
      { exercicioId: 'leg-curl-deitado' },
      { exercicioId: 'face-pull' },
      { exercicioId: 'dead-bug' },
    ],
  },
  'empurrar-a': {
    id: 'empurrar-a',
    nome: m('Empurrar A'),
    tipo: 'superior',
    sintese: m('Treino A: empurrar. Peito, ombros e tríceps.'),
    posicoes: [
      { exercicioId: 'supino-barra', principal: true },
      { exercicioId: 'supino-inclinado-halteres' },
      { exercicioId: 'elevacao-lateral' },
      { exercicioId: 'triceps-corda' },
    ],
  },
  'puxar-a': {
    id: 'puxar-a',
    nome: m('Puxar A'),
    tipo: 'superior',
    sintese: m('Treino B: puxar. Costas, ombro posterior e bíceps.'),
    posicoes: [
      { exercicioId: 'remada-cabo-sentado', principal: true },
      { exercicioId: 'puxada-frente' },
      { exercicioId: 'face-pull' },
      { exercicioId: 'curl-halteres' },
    ],
  },
  'pernas-a': {
    id: 'pernas-a',
    nome: m('Pernas A'),
    tipo: 'inferior',
    sintese: m('Treino C: pernas. Quadríceps e posteriores da coxa; core no fim.'),
    posicoes: [
      { exercicioId: 'leg-press', principal: true },
      { exercicioId: 'peso-morto-romeno', principal: true },
      { exercicioId: 'leg-curl-deitado' },
      { exercicioId: 'gemeos-pe' },
      { exercicioId: 'prancha' },
    ],
  },
  'empurrar-b': {
    id: 'empurrar-b',
    nome: m('Empurrar B'),
    tipo: 'superior',
    sintese: m('Treino A: empurrar. Peito superior, ombros e tríceps.'),
    posicoes: [
      { exercicioId: 'supino-inclinado-barra', principal: true },
      { exercicioId: 'supino-maquina' },
      { exercicioId: 'elevacao-lateral' },
      { exercicioId: 'triceps-polia' },
    ],
  },
  'puxar-b': {
    id: 'puxar-b',
    nome: m('Puxar B'),
    tipo: 'superior',
    sintese: m('Treino B: puxar. Costas em puxada vertical, ombro posterior e bíceps.'),
    posicoes: [
      { exercicioId: 'puxada-neutra', principal: true },
      { exercicioId: 'remada-halter-unilateral' },
      { exercicioId: 'crucifixo-invertido' },
      { exercicioId: 'curl-martelo' },
    ],
  },
  'pernas-b': {
    id: 'pernas-b',
    nome: m('Pernas B'),
    tipo: 'inferior',
    sintese: m('Treino C: pernas. Glúteos e quadríceps; posteriores sentado, unilateral e core.'),
    posicoes: [
      { exercicioId: 'agachamento-goblet', principal: true },
      { exercicioId: 'hip-thrust', principal: true },
      { exercicioId: 'agachamento-bulgaro' },
      { exercicioId: 'leg-curl-sentado' },
      { exercicioId: 'dead-bug' },
    ],
  },
  'peito-triceps': {
    id: 'peito-triceps',
    nome: m('Peito e tríceps'),
    tipo: 'superior',
    sintese: m('Treino por grupo muscular: peito em vários ângulos e tríceps no fim.'),
    posicoes: [
      { exercicioId: 'supino-barra', principal: true },
      { exercicioId: 'supino-inclinado-halteres' },
      { exercicioId: 'crucifixo-maquina' },
      { exercicioId: 'triceps-corda' },
      { exercicioId: 'triceps-frances' },
    ],
  },
  'costas-biceps': {
    id: 'costas-biceps',
    nome: m('Costas e bíceps'),
    tipo: 'superior',
    sintese: m('Treino por grupo muscular: puxadas verticais e horizontais e bíceps no fim.'),
    posicoes: [
      { exercicioId: 'puxada-frente', principal: true },
      { exercicioId: 'remada-cabo-sentado' },
      { exercicioId: 'remada-halter-unilateral' },
      { exercicioId: 'curl-halteres' },
      { exercicioId: 'curl-martelo' },
    ],
  },
  'ombros-core': {
    id: 'ombros-core',
    nome: m('Ombros e core'),
    tipo: 'superior',
    sintese: m('Treino por grupo muscular: ombros (frente, lado e trás) e estabilidade do tronco.'),
    posicoes: [
      { exercicioId: 'desenvolvimento-halteres', principal: true },
      { exercicioId: 'elevacao-lateral' },
      { exercicioId: 'face-pull' },
      { exercicioId: 'pallof' },
      { exercicioId: 'prancha-lateral' },
    ],
  },
  recuperacao: {
    id: 'recuperacao',
    nome: m('Recuperação ativa'),
    tipo: 'recuperacao',
    sintese: m('Dia leve para recuperar: caminhada tranquila e core sem esforço. Não é para cansar.'),
    posicoes: [{ exercicioId: 'dead-bug' }, { exercicioId: 'prancha' }],
  },
}

/**
 * F31.5 (v1.20): modelos de calistenia. Cada posição é um padrão de movimento: o exercício é o degrau de partida
 * de iniciantes e de quem regressa; `intermedio`, o de quem tem experiência. As competências só entram com a F31.6.
 */
export const MODELOS_CALISTENIA: Record<string, Modelo> = {
  'cal-corpo-a': {
    id: 'cal-corpo-a',
    nome: m('Calistenia A'),
    tipo: 'corpo',
    sintese: m('Corpo inteiro com o peso do corpo: flexões, elevações, agachamento, ponte e core.'),
    posicoes: [
      { exercicioId: 'pino-parede-costas', competencia: true },
      { exercicioId: 'flexoes-inclinadas', intermedio: 'flexoes-declinadas', principal: true },
      { exercicioId: 'elevacoes-negativas', intermedio: 'elevacoes', principal: true },
      { exercicioId: 'agachamento-peso-corporal', intermedio: 'agachamento-bulgaro' },
      { exercicioId: 'ponte-gluteos', intermedio: 'hip-thrust-unilateral' },
      { exercicioId: 'hollow-fletido', intermedio: 'hollow' },
    ],
  },
  'cal-corpo-b': {
    id: 'cal-corpo-b',
    nome: m('Calistenia B'),
    tipo: 'corpo',
    sintese: m('Corpo inteiro com o peso do corpo: mergulhos, remada invertida, afundos, posteriores e core.'),
    posicoes: [
      { exercicioId: 'front-lever-encolhido', competencia: true },
      { exercicioId: 'fundos-banco', intermedio: 'paralelas', principal: true },
      { exercicioId: 'remada-invertida-alta', intermedio: 'remada-invertida-pes-elevados', principal: true },
      { exercicioId: 'afundo-recuado', intermedio: 'pistol-assistido' },
      { exercicioId: 'curl-deslizante', intermedio: 'nordico-negativo' },
      { exercicioId: 'dead-bug', intermedio: 'elevacao-joelhos-barra' },
    ],
  },
  'cal-corpo-c': {
    id: 'cal-corpo-c',
    nome: m('Calistenia C'),
    tipo: 'corpo',
    sintese: m('Corpo inteiro com o peso do corpo: empurrar na vertical, puxar, pernas a uma perna e core.'),
    posicoes: [
      { exercicioId: 'planche-lean', competencia: true },
      { exercicioId: 'flexoes-pike', intermedio: 'flexoes-pike-elevadas', principal: true },
      { exercicioId: 'remada-invertida', intermedio: 'elevacoes', principal: true },
      { exercicioId: 'afundo-recuado', intermedio: 'agachamento-bulgaro' },
      { exercicioId: 'ponte-gluteos-unilateral', intermedio: 'hip-thrust-unilateral' },
      { exercicioId: 'prancha', intermedio: 'l-sit-encolhido' },
    ],
  },
  'cal-superior-a': {
    id: 'cal-superior-a',
    nome: m('Calistenia superior A'),
    tipo: 'superior',
    sintese: m('Empurrar e puxar com o peso do corpo, na horizontal e na vertical.'),
    posicoes: [
      { exercicioId: 'pino-parede-costas', competencia: true },
      { exercicioId: 'flexoes-inclinadas', intermedio: 'flexoes-declinadas', principal: true },
      { exercicioId: 'elevacoes-negativas', intermedio: 'elevacoes', principal: true },
      { exercicioId: 'flexoes-pike', intermedio: 'flexoes-pike-elevadas' },
      { exercicioId: 'remada-invertida-alta', intermedio: 'remada-invertida-pes-elevados' },
      { exercicioId: 'fundos-banco', intermedio: 'paralelas' },
      { exercicioId: 'hollow-fletido', intermedio: 'hollow' },
    ],
  },
  'cal-superior-b': {
    id: 'cal-superior-b',
    nome: m('Calistenia superior B'),
    tipo: 'superior',
    sintese: m('Tríceps, remada e ombros com o peso do corpo; core com as mãos no chão.'),
    posicoes: [
      { exercicioId: 'front-lever-encolhido', competencia: true },
      { exercicioId: 'flexoes-joelhos', intermedio: 'flexoes-diamante', principal: true },
      { exercicioId: 'remada-invertida', intermedio: 'remada-invertida-pes-elevados', principal: true },
      { exercicioId: 'suspensao-ativa', intermedio: 'elevacoes' },
      { exercicioId: 'flexoes-pike', intermedio: 'flexoes-pike-elevadas' },
      { exercicioId: 'dead-bug', intermedio: 'l-sit-encolhido' },
    ],
  },
  'cal-inferior-a': {
    id: 'cal-inferior-a',
    nome: m('Calistenia inferior A'),
    tipo: 'inferior',
    sintese: m('Pernas com o peso do corpo: agachamento, ponte, afundos e posteriores.'),
    posicoes: [
      { exercicioId: 'agachamento-peso-corporal', intermedio: 'agachamento-bulgaro', principal: true },
      { exercicioId: 'ponte-gluteos', intermedio: 'hip-thrust-unilateral', principal: true },
      { exercicioId: 'afundo-recuado', intermedio: 'pistol-assistido' },
      { exercicioId: 'curl-deslizante', intermedio: 'nordico-negativo' },
      { exercicioId: 'gemeos-pe' },
      { exercicioId: 'dead-bug', intermedio: 'elevacao-joelhos-barra' },
    ],
  },
  'cal-inferior-b': {
    id: 'cal-inferior-b',
    nome: m('Calistenia inferior B'),
    tipo: 'inferior',
    sintese: m('Pernas a uma perna com o peso do corpo, posteriores e core.'),
    posicoes: [
      { exercicioId: 'afundo-recuado', intermedio: 'pistol-assistido', principal: true },
      { exercicioId: 'ponte-gluteos-unilateral', intermedio: 'hip-thrust-unilateral', principal: true },
      { exercicioId: 'agachamento-peso-corporal', intermedio: 'agachamento-bulgaro' },
      { exercicioId: 'curl-deslizante', intermedio: 'nordico-negativo' },
      { exercicioId: 'cadeira-isometrica' },
      { exercicioId: 'hollow-fletido', intermedio: 'hollow' },
    ],
  },
}

export const DIVISOES_CALISTENIA: Record<DiasPorSemana, string[]> = {
  2: ['cal-corpo-a', 'cal-corpo-b'],
  3: ['cal-corpo-a', 'cal-corpo-b', 'cal-corpo-c'],
  4: ['cal-superior-a', 'cal-inferior-a', 'cal-superior-b', 'cal-inferior-b'],
  5: ['cal-superior-a', 'cal-inferior-a', 'cal-superior-b', 'cal-inferior-b', 'cal-corpo-a'],
  6: ['cal-superior-a', 'cal-inferior-a', 'cal-superior-b', 'cal-inferior-b', 'cal-corpo-a', 'cal-corpo-b'],
  7: ['cal-superior-a', 'cal-inferior-a', 'cal-superior-b', 'cal-inferior-b', 'cal-corpo-a', 'cal-corpo-b', 'recuperacao'],
}

export const DIVISOES: Record<DiasPorSemana, string[]> = {
  2: ['corpo-a', 'corpo-b'],
  3: ['corpo-a', 'corpo-b', 'corpo-c'],
  4: ['superior-a', 'inferior-a', 'superior-b', 'inferior-b'],
  5: ['superior-a', 'inferior-a', 'superior-b', 'inferior-b', 'corpo-a'],
  6: ['empurrar-a', 'puxar-a', 'pernas-a', 'empurrar-b', 'puxar-b', 'pernas-b'],
  7: ['empurrar-a', 'puxar-a', 'pernas-a', 'empurrar-b', 'puxar-b', 'pernas-b', 'recuperacao'],
}

/** Secção 3.1 (v1.5): modelos que o utilizador pode escolher e os dias em que fazem sentido. */
const PPL = ['empurrar-a', 'puxar-a', 'pernas-a', 'empurrar-b', 'puxar-b', 'pernas-b']
export const MODELOS_ESCOLHA: Record<Exclude<DivisaoTreino, 'automatico'>, { dias: [number, number]; treinos: (dias: number) => string[]; umaVezPorSemana: (dias: number) => boolean }> = {
  corpo: { dias: [2, 4], treinos: (d) => (d === 2 ? ['corpo-a', 'corpo-b'] : ['corpo-a', 'corpo-b', 'corpo-c']), umaVezPorSemana: () => false },
  ab: { dias: [2, 6], treinos: (d) => (d === 2 ? ['superior-a', 'inferior-a'] : ['superior-a', 'inferior-a', 'superior-b', 'inferior-b']), umaVezPorSemana: (d) => d === 2 },
  abc: { dias: [3, 7], treinos: (d) => (d === 7 ? [...PPL, 'recuperacao'] : PPL), umaVezPorSemana: (d) => d === 3 },
  grupos: {
    dias: [4, 6],
    treinos: (d) => (d === 4 ? ['peito-triceps', 'costas-biceps', 'pernas-a', 'ombros-core'] : ['peito-triceps', 'costas-biceps', 'pernas-a', 'ombros-core', 'pernas-b']),
    umaVezPorSemana: () => true,
  },
}
