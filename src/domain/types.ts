import { m, traduzido } from '../i18n'

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

export const NOMES_GRUPOS: Record<GrupoMuscular, string> = traduzido({
  peito: m('Peito'),
  costas: m('Costas'),
  ombros: m('Ombros'),
  biceps: m('Bíceps'),
  triceps: m('Tríceps'),
  quadriceps: m('Quadríceps'),
  posteriores: m('Posteriores da coxa'),
  gluteos: m('Glúteos'),
  gemeos: m('Gémeos'),
  core: m('Core'),
})

export const AREAS = ['ombro', 'joelho', 'lombar', 'punho', 'anca', 'cotovelo'] as const
export type Area = (typeof AREAS)[number]
export const NOMES_AREAS: Record<Area, string> = traduzido({
  ombro: m('ombro'),
  joelho: m('joelho'),
  lombar: m('lombar'),
  punho: m('punho'),
  anca: m('anca'),
  cotovelo: m('cotovelo'),
})

/** «barra» é a barra com discos; «barra-fixa» e «paralelas» (v1.16) são os apoios de peso corporal. */
export const EQUIPAMENTOS = ['barra', 'halteres', 'maquina', 'cabo', 'peso-corporal', 'barra-fixa', 'paralelas', 'elasticos', 'caneleiras'] as const
export type Equipamento = (typeof EQUIPAMENTOS)[number]

export type TipoExercicio = 'composto' | 'isolado'
export type Medida = 'reps' | 'segundos'

export interface Exercicio {
  id: string
  nome: string
  grupoPrincipal: GrupoMuscular
  /** Auxiliares 1 (F31.3). */
  gruposSecundarios: GrupoMuscular[]
  /** F31.3 (v1.20): auxiliares 2, os que trabalham menos. */
  gruposTerciarios?: GrupoMuscular[]
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
  /** F31.1 (v1.20): nível de dificuldade geral dos exercícios de calistenia. */
  nivel?: Nivel
}

export const NIVEIS = [1, 2, 3, 4] as const
export type Nivel = (typeof NIVEIS)[number]
export const NOMES_NIVEIS: Record<Nivel, string> = traduzido({ 1: m('Base'), 2: m('Intermédio'), 3: m('Avançado'), 4: m('Competência') })

/** F31.5 (v1.20): musculação (por omissão) ou calistenia. */
export const ESTILOS = ['musculacao', 'calistenia'] as const
export type Estilo = (typeof ESTILOS)[number]

export const DIAS_POR_SEMANA = [2, 3, 4, 5, 6, 7] as const
export type DiasPorSemana = (typeof DIAS_POR_SEMANA)[number]

export type Objetivo = 'recomposicao' | 'hipertrofia' | 'forca' | 'saude'
export type Experiencia = 'iniciante' | 'regresso' | 'intermedio'
/** Resumo do equipamento; desde a v1.17 manda a lista `equipamentos` (F28). */
export type AcessoEquipamento = 'ginasio' | 'halteres' | 'casa'
export type Sexo = 'masculino' | 'feminino' | 'outro'
export const GRAVIDEZ = ['nao', 'gravida-1t', 'gravida-2t3t', 'pos-parto'] as const
export type Gravidez = (typeof GRAVIDEZ)[number]
export const DIVISOES_TREINO = ['automatico', 'corpo', 'ab', 'abc', 'grupos'] as const
export type DivisaoTreino = (typeof DIVISOES_TREINO)[number]
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
  /** Secção 3.1 (v1.5); por omissão «automatico». */
  divisao?: DivisaoTreino
  /** Secção 3.8; por omissão «equilibrado». */
  enfase?: Enfase
  /** Secção 3.4.1; só com sexo feminino. */
  gravidez?: Gravidez
  /** F25.1 (v1.13): dias da semana em que treina, 0 = segunda … 6 = domingo. */
  diasTreino?: number[]
  /**
   * F28.1 (v1.17): equipamento que tem, sem o peso do corpo (que conta sempre). Sem este campo (anamneses
   * anteriores), vale o resumo em `equipamento` (F28.3).
   */
  equipamentos?: Equipamento[]
  /** F28.2: halter mais pesado que tem, em kg. */
  halteresMaxKg?: number
  /** F31.5 (v1.20): tipo de treino; sem valor, musculação. */
  estilo?: Estilo
  /** F31.6: com calistenia, inclui um exercício de competência nos treinos de corpo inteiro e superior. */
  competencias?: boolean
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
  /** F27: plano criado pelo utilizador (não é gerado de novo nem traduzido). */
  proprio?: boolean
  /** F27.3: semanas de readaptação; sem valor, 2 se `readaptacao`, senão 0. */
  semanasReadaptacao?: number
  /** F27.3: `false` tira a semana de descarga do fim de cada bloco. */
  descarga?: boolean
  treinos: TreinoModelo[]
  avisos: string[]
}

export interface Serie {
  carga: number
  reps: number
  rir?: number
  /** F23.1: só nos exercícios por tempo; segundos que ainda aguentaria (61 = mais de 60). */
  reservaSeg?: number
}

export interface RegistoExercicio {
  prescricaoId: string
  /** Pode diferir da prescrição quando o exercício foi substituído. */
  exercicioId: string
  series: Serie[]
  dor?: number
  /** F24.3: como se contou o peso nesta sessão (sem campo nos registos anteriores à v1.12). */
  tipoCarga?: 'halter' | 'total' | 'maquina' | 'corporal' | 'peso-extra'
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
  /** F19 (v1.6): resposta ao lembrete de alongamento no fim do treino. */
  alongamento?: 'feito' | 'dispensado'
}

/** F19 (v1.6): alongamento estático do catálogo. */
export const POSICOES_ALONGAMENTO = ['pe', 'sentado', 'joelhos', 'lado', 'deitado'] as const
export type PosicaoAlongamento = (typeof POSICOES_ALONGAMENTO)[number]

export interface Alongamento {
  id: string
  nome: string
  grupo: GrupoMuscular
  gruposSecundarios: GrupoMuscular[]
  /** «deitado» é de costas ou de barriga; «lado» é deitado de lado. */
  posicao: PosicaoAlongamento
  /** 2 quando se faz um lado de cada vez. */
  lados: 1 | 2
  passos: string[]
  cuidados: string[]
  contraindicacoes: Area[]
  video?: string
}

/** F9: perímetros opcionais, em cm. */
export const MEDIDAS_CM = ['cinturaCm', 'peitoCm', 'bracoCm', 'ancaCm', 'coxaCm'] as const
export type MedidaCm = (typeof MEDIDAS_CM)[number]

const MEDIDAS_PT: Record<MedidaCm, { nome: string; min: number; max: number; onde: string }> = {
  cinturaCm: { nome: m('Cintura'), min: 30, max: 250, onde: m('À altura do umbigo, no fim de uma expiração normal, sem encolher a barriga.') },
  peitoCm: { nome: m('Peito'), min: 50, max: 250, onde: m('Na linha dos mamilos, com os braços descontraídos ao lado do corpo.') },
  bracoCm: { nome: m('Braço'), min: 15, max: 80, onde: m('A meio entre o ombro e o cotovelo, braço relaxado; mede sempre o mesmo lado.') },
  ancaCm: { nome: m('Anca'), min: 50, max: 250, onde: m('Na parte mais larga dos glúteos, com os pés juntos.') },
  coxaCm: { nome: m('Coxa'), min: 25, max: 120, onde: m('A meio entre a virilha e o joelho, de pé; mede sempre a mesma perna.') },
}

/** Nome e instruções de cada medida, no idioma atual (F21). */
export const INFO_MEDIDAS = Object.fromEntries(
  MEDIDAS_CM.map((k) => [k, { ...traduzido({ nome: MEDIDAS_PT[k].nome, onde: MEDIDAS_PT[k].onde }), min: MEDIDAS_PT[k].min, max: MEDIDAS_PT[k].max }]),
) as typeof MEDIDAS_PT

export interface Medicao extends Partial<Record<MedidaCm, number>> {
  id: string
  data: string
  pesoKg?: number
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
