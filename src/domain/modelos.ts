// Treinos-modelo base (especificação, secção 3.1). Cada posição indica o exercício preferido;
// a geração troca-o por um substituto quando há restrições ou falta equipamento.

export interface Posicao {
  exercicioId: string
  /** Exercício principal do treino: recebe uma série extra. */
  principal?: boolean
}

export interface Modelo {
  id: string
  nome: string
  sintese: string
  posicoes: Posicao[]
  tipo: 'superior' | 'inferior' | 'corpo'
}

export const MODELOS: Record<string, Modelo> = {
  'superior-a': {
    id: 'superior-a',
    nome: 'Superior A',
    tipo: 'superior',
    sintese: 'Empurrar e puxar: foco em peito e costas, com ombros e braços no fim.',
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
    nome: 'Inferior A',
    tipo: 'inferior',
    sintese: 'Pernas com foco em quadríceps e posteriores da coxa; core no fim.',
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
    nome: 'Superior B',
    tipo: 'superior',
    sintese: 'Peito superior e costas; ombro posterior para equilibrar a postura.',
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
    nome: 'Inferior B',
    tipo: 'inferior',
    sintese: 'Pernas com foco em glúteos e quadríceps; posteriores sentado, trabalho unilateral e core.',
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
    nome: 'Corpo inteiro A',
    tipo: 'corpo',
    sintese: 'Corpo inteiro: pernas, empurrar, puxar e dobradiça da anca.',
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
    nome: 'Corpo inteiro B',
    tipo: 'corpo',
    sintese: 'Corpo inteiro: agachamento, peito superior, puxada vertical e glúteos.',
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
    nome: 'Corpo inteiro C',
    tipo: 'corpo',
    sintese: 'Corpo inteiro: trabalho unilateral, máquinas e ombro posterior.',
    posicoes: [
      { exercicioId: 'agachamento-bulgaro' },
      { exercicioId: 'supino-maquina' },
      { exercicioId: 'remada-halter-unilateral' },
      { exercicioId: 'leg-curl-deitado' },
      { exercicioId: 'face-pull' },
      { exercicioId: 'dead-bug' },
    ],
  },
}

export const DIVISOES: Record<2 | 3 | 4 | 5, string[]> = {
  2: ['corpo-a', 'corpo-b'],
  3: ['corpo-a', 'corpo-b', 'corpo-c'],
  4: ['superior-a', 'inferior-a', 'superior-b', 'inferior-b'],
  5: ['superior-a', 'inferior-a', 'superior-b', 'inferior-b', 'corpo-a'],
}
