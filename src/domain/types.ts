// Linguagem do domínio (especificação, secção 1). Os nomes aqui são os mesmos da interface.

export const GRUPOS_MUSCULARES = [
  'peito',
  'costas',
  'ombros',
  'biceps',
  'triceps',
  'quadriceps',
  'posteriores',
  'gluteos',
  'gemeos',
  'core',
] as const
export type GrupoMuscular = (typeof GRUPOS_MUSCULARES)[number]

export const GRUPOS_GRANDES: readonly GrupoMuscular[] = ['peito', 'costas', 'quadriceps', 'posteriores', 'gluteos']

export const NOMES_GRUPOS: Record<GrupoMuscular, string> = {
  peito: 'Peito',
  costas: 'Costas',
  ombros: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quadriceps: 'Quadríceps',
  posteriores: 'Posteriores da coxa',
  gluteos: 'Glúteos',
  gemeos: 'Gémeos',
  core: 'Core',
}

export const AREAS = ['ombro', 'joelho', 'lombar', 'punho', 'anca', 'cotovelo'] as const
export type Area = (typeof AREAS)[number]

export const EQUIPAMENTOS = ['barra', 'halteres', 'maquina', 'cabo', 'peso-corporal'] as const
export type Equipamento = (typeof EQUIPAMENTOS)[number]

export type TipoExercicio = 'composto' | 'isolado'
export type Medida = 'reps' | 'segundos'

export interface Exercicio {
  id: string
  nome: string
  grupoPrincipal: GrupoMuscular
  gruposSecundarios: GrupoMuscular[]
  tipo: TipoExercicio
  /** Basta ter um destes equipamentos para fazer o exercício. */
  equipamento: Equipamento[]
  medida: Medida
  /** Faixa própria (ex.: prancha em segundos). Sobrepõe-se à faixa do objetivo. */
  faixaFixa?: [number, number]
  incrementoKg: number
  objetivo: string
  pontosChave: string[]
  contraindicacoes: Area[]
  /** Por ordem de preferência. */
  substitutos: string[]
  video?: string
  /** Posição deitada (secção 3.4.1): evitada no 2.º e 3.º trimestres de gravidez. */
  deitado?: 'costas' | 'barriga'
}

export const DIAS_POR_SEMANA = [2, 3, 4, 5, 6, 7] as const
export type DiasPorSemana = (typeof DIAS_POR_SEMANA)[number]

export type Objetivo = 'recomposicao' | 'hipertrofia' | 'forca' | 'saude'
export type Experiencia = 'iniciante' | 'regresso' | 'intermedio'
export type AcessoEquipamento = 'ginasio' | 'halteres' | 'casa'
export type Sexo = 'masculino' | 'feminino' | 'outro'
export const GRAVIDEZ = ['nao', 'gravida-1t', 'gravida-2t3t', 'pos-parto'] as const
export type Gravidez = (typeof GRAVIDEZ)[number]
export const ENFASES = ['equilibrado', 'inferior', 'superior'] as const
export type Enfase = (typeof ENFASES)[number]

export interface Restricao {
  area: Area
  /** Dor habitual 0–10. */
  intensidade: number
  avaliadaPorProfissional: boolean
}

export interface Anamnese {
  idade: number
  alturaCm: number
  pesoKg: number
  cinturaCm?: number
  sexo: Sexo
  objetivo: Objetivo
  diasPorSemana: DiasPorSemana
  duracaoMin: 45 | 60 | 75
  experiencia: Experiencia
  equipamento: AcessoEquipamento
  restricoes: Restricao[]
  aceitaCardio: boolean
  /** Respostas às perguntas gerais do PAR-Q+ (true = "sim"). */
  parq: boolean[]
  /** Secção 3.8; por omissão «equilibrado». */
  enfase?: Enfase
  /** Secção 3.4.1; só com sexo feminino. */
  gravidez?: Gravidez
}

export interface Prescricao {
  /** Identifica a posição no treino, estável entre substituições. */
  id: string
  exercicioId: string
  series: number
  faixa: [number, number]
  rir: [number, number]
  descansoSeg: number
  nota?: string
  /** Secção 3.7: exercícios por ordem de rotação, um por bloco (o primeiro é o do bloco 1). */
  alternativas?: string[]
}

export interface TreinoModelo {
  id: string
  nome: string
  sintese: string
  prescricoes: Prescricao[]
  cardioMin?: number
  duracaoEstimadaMin: number
}

export interface Plano {
  id: string
  criadoEm: string
  versaoRegras: number
  conservador: boolean
  readaptacao: boolean
  /** Secção 3.7: semanas de cada bloco, descarga incluída. Planos antigos não têm (vale 5). */
  semanasBloco?: number
  treinos: TreinoModelo[]
  avisos: string[]
}

export interface Serie {
  carga: number
  reps: number
  rir?: number
}

export interface RegistoExercicio {
  prescricaoId: string
  /** Pode diferir da prescrição quando o exercício foi substituído. */
  exercicioId: string
  series: Serie[]
  dor?: number
  concluido?: boolean
  saltado?: boolean
}

export interface Sessao {
  id: string
  planoId: string
  treinoId: string
  inicio: string
  fim?: string
  exercicios: RegistoExercicio[]
}

export interface Medicao {
  id: string
  data: string
  pesoKg?: number
  cinturaCm?: number
}

export const POSES = ['frente', 'lado', 'costas'] as const
export type Pose = (typeof POSES)[number]

/** F15: foto de avaliação, guardada como JPEG recodificado (sem metadados). */
export interface FotoAvaliacao {
  id: string
  /** AAAA-MM-DD */
  data: string
  pose: Pose
  /** data:image/jpeg;base64,… */
  imagem: string
  nota?: string
}

/** F16 */
export interface Perfil {
  nome?: string
  /** data:image/jpeg;base64,… */
  foto?: string
}

export type EstadoExercicio = 'por-fazer' | 'em-curso' | 'feito' | 'saltado'
