import { z } from 'zod'
import type { Catalogo } from './catalogo'
import { AREAS, DIAS_POR_SEMANA, EQUIPAMENTOS, DIVISOES_TREINO, ENFASES, ESTILOS, GRAVIDEZ, INFO_MEDIDAS, MEDIDAS_CM, POSES, type MedidaCm } from './types'
import { TIPOS_CARGA, type TipoCarga } from './carga'
import type { Degraus } from './escadas'
import type { Anamnese, FotoAvaliacao, Medicao, Perfil, Plano, Sessao } from './types'
import { lerVideo } from './video'
import { esquemaProprios, type ExercicioProprio } from './proprios'
import type { Ferias } from './ferias'
import { PADROES, type Nivelamento } from './nivelamento'
import { LIMITES, MODALIDADES, type RegistoCardio } from './cardio'
import { LIMITES_PERSONALIZADO, PROGRAMAS, type ProgramaAtivo } from './programasCardio'

const inteiro = (min: number, max: number) => z.number().int().min(min).max(max)
const data = z.string().min(10).max(40)
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const id = z.string().min(1).max(100)

const serie = z.strictObject({ carga: z.number().min(0).max(1000), reps: inteiro(0, 1000), rir: inteiro(0, 10).optional(), reservaSeg: inteiro(0, 600).optional() })
const registo = z.strictObject({
  prescricaoId: id,
  exercicioId: id,
  series: z.array(serie).max(50),
  dor: inteiro(0, 10).optional(),
  tipoCarga: z.enum(TIPOS_CARGA).optional(),
  concluido: z.boolean().optional(),
  saltado: z.boolean().optional(),
})
const sessao = z.strictObject({ id, planoId: id, treinoId: id, inicio: data, fim: data.optional(), exercicios: z.array(registo).max(50), alongamento: z.enum(['feito', 'dispensado']).optional() })
const medicao = z.strictObject({
  id,
  data,
  pesoKg: z.number().min(20).max(400).optional(),
  ...(Object.fromEntries(MEDIDAS_CM.map((k) => [k, z.number().min(INFO_MEDIDAS[k].min).max(INFO_MEDIDAS[k].max).optional()])) as Record<MedidaCm, z.ZodOptional<z.ZodNumber>>),
})

const cardio = z.strictObject({
  id,
  data,
  modalidade: z.enum(MODALIDADES),
  minutos: inteiro(...LIMITES.minutos),
  esforco: inteiro(...LIMITES.esforco),
  distanciaKm: z.number().min(LIMITES.distanciaKm[0]).max(LIMITES.distanciaKm[1]).optional(),
  fcMedia: inteiro(...LIMITES.fcMedia).optional(),
  sessaoId: id.optional(),
})

const anamnese = z.strictObject({
  idade: inteiro(14, 110),
  alturaCm: z.number().min(100).max(250),
  pesoKg: z.number().min(20).max(400),
  cinturaCm: z.number().min(30).max(250).optional(),
  sexo: z.enum(['masculino', 'feminino', 'outro']),
  objetivo: z.enum(['recomposicao', 'hipertrofia', 'forca', 'saude']),
  diasPorSemana: z.union(DIAS_POR_SEMANA.map((d) => z.literal(d))),
  duracaoMin: z.union([z.literal(45), z.literal(60), z.literal(75)]),
  experiencia: z.enum(['iniciante', 'regresso', 'intermedio']),
  equipamento: z.enum(['ginasio', 'halteres', 'casa']),
  restricoes: z.array(z.strictObject({ area: z.enum(AREAS), intensidade: inteiro(0, 10), avaliadaPorProfissional: z.boolean() })).max(AREAS.length),
  aceitaCardio: z.boolean(),
  parq: z.array(z.boolean()).length(7),
  enfase: z.enum(ENFASES).optional(),
  divisao: z.enum(DIVISOES_TREINO).optional(),
  gravidez: z.enum(GRAVIDEZ).optional(),
  diasTreino: z.array(inteiro(0, 6)).max(7).optional(),
  equipamentos: z.array(z.enum(EQUIPAMENTOS)).max(EQUIPAMENTOS.length).optional(),
  halteresMaxKg: z.number().min(0.5).max(200).optional(),
  estilo: z.enum(ESTILOS).optional(),
  competencias: z.boolean().optional(),
})

const faixa = z.tuple([z.number().int().min(0), z.number().int().min(0)])
const plano = z.strictObject({
  id,
  criadoEm: data,
  versaoRegras: z.number().int(),
  conservador: z.boolean(),
  readaptacao: z.boolean(),
  semanasBloco: inteiro(2, 12).optional(),
  proprio: z.boolean().optional(),
  semanasReadaptacao: inteiro(0, 8).optional(),
  descarga: z.boolean().optional(),
  avisos: z.array(z.string().max(500)).max(50),
  treinos: z.array(z.strictObject({
    id,
    nome: z.string().max(100),
    sintese: z.string().max(500),
    cardioMin: z.number().int().min(0).max(120).optional(),
    duracaoEstimadaMin: z.number().int().min(0).max(300),
    prescricoes: z.array(z.strictObject({
      id,
      exercicioId: id,
      series: inteiro(1, 10),
      faixa,
      rir: faixa,
      descansoSeg: inteiro(0, 600),
      nota: z.string().max(500).optional(),
      alternativas: z.array(id).min(1).max(10).optional(),
    })).max(20),
  })).max(7),
})

// F15/F16: só JPEG em base64 (o que a app produz); nada de SVG ou outros formatos com código.
const jpeg = (maxBytes: number) => z.string().max(Math.ceil(maxBytes * 4 / 3) + 30).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/)
const foto = z.strictObject({ id, data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), pose: z.enum(POSES), imagem: jpeg(3_000_000), nota: z.string().max(200).optional() })
const perfil = z.strictObject({ nome: z.string().max(40).optional(), foto: jpeg(300_000).optional() })

const esquemaCopia = z.strictObject({
  formato: z.literal('app-treino'),
  versao: z.literal(1),
  exportadoEm: data,
  anamnese: anamnese.nullable(),
  plano: plano.nullable(),
  sessoes: z.array(sessao).max(10_000),
  medicoes: z.array(medicao).max(10_000),
  videos: z.record(id, z.string().refine((u) => lerVideo(u) !== null, 'Link de vídeo não permitido')),
  fotos: z.array(foto).max(2000).optional(),
  cardio: z.array(cardio).max(20_000).optional(),
  perfil: perfil.optional(),
  carga: z.strictObject({ barraKg: z.number().min(5).max(30).optional(), tipos: z.record(id, z.enum(TIPOS_CARGA)).optional() }).optional(),
  exerciciosProprios: esquemaProprios.optional(),
  ferias: z.strictObject({ inicio: dia, fim: dia, equipamentos: z.array(z.enum(EQUIPAMENTOS)).max(EQUIPAMENTOS.length) }).optional(),
  degraus: z.record(id, z.strictObject({ exercicioId: id, desde: dia })).optional(),
  programaCardio: z.strictObject({
    id: z.enum([...PROGRAMAS, 'personalizado']),
    inicio: dia,
    soCardio: z.boolean().optional(),
    personalizado: z.strictObject({
      sessoes: z.array(z.strictObject({ dia: inteiro(0, 6), modalidade: z.enum(MODALIDADES), minutos: inteiro(...LIMITES_PERSONALIZADO.minutos), esforco: inteiro(0, 10) })).min(1).max(7),
      semanas: inteiro(...LIMITES_PERSONALIZADO.semanas),
      progressaoPct: inteiro(...LIMITES_PERSONALIZADO.progressaoPct),
    }).optional(),
  }).refine((p) => (p.id === 'personalizado') === !!p.personalizado, 'Programa personalizado sem sessões').optional(),
  nivelamento: z.strictObject({
    data: dia,
    resultados: z.partialRecord(z.enum(PADROES), z.strictObject({ tentativas: z.array(z.strictObject({ exercicioId: id, valor: z.number().int().min(0).max(3600) })).max(2), exercicioId: id })),
  }).optional(),
})

export interface Copia {
  formato: 'app-treino'
  versao: 1
  exportadoEm: string
  anamnese: Anamnese | null
  plano: Plano | null
  sessoes: Sessao[]
  medicoes: Medicao[]
  /** Links de vídeo escolhidos por ti, por id de exercício. */
  videos: Record<string, string>
  /** v1.4; cópias antigas não têm. */
  fotos?: FotoAvaliacao[]
  /** F36 (v1.25): registos de cardio; cópias antigas não têm. */
  cardio?: RegistoCardio[]
  perfil?: Perfil
  /** F24 (v1.12): peso da barra e forma de contar escolhida por exercício. */
  carga?: { barraKg?: number; tipos?: Record<string, TipoCarga> }
  /** F26 (v1.14): exercícios criados por ti. */
  exerciciosProprios?: ExercicioProprio[]
  /** F29 (v1.18): modo férias. */
  ferias?: Ferias
  /** F30 (v1.19): variação atual de cada exercício do plano. */
  degraus?: Degraus
  /** F32 (v1.21): o último teste de nivelamento. */
  nivelamento?: Nivelamento
  /** F37 (v1.26): programa de cardio escolhido. */
  programaCardio?: ProgramaAtivo
}

/** F10.2: valida um ficheiro importado; lança erro se não for uma cópia válida. */
export function lerCopia(dados: unknown): Copia {
  return esquemaCopia.parse(dados) as Copia
}

const csvCampo = (v: string | number | undefined) => {
  const s = v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function paraCsv(sessoes: Sessao[], catalogo: Catalogo): string {
  const linhas = ['data,treino,exercicio,serie,carga_kg,reps,rir,dor,reserva_s,tipo_carga']
  for (const s of [...sessoes].sort((a, b) => a.inicio.localeCompare(b.inicio)))
    for (const e of s.exercicios)
      e.series.forEach((x, i) => {
        const nome = catalogo.get(e.exercicioId)?.nome ?? e.exercicioId
        linhas.push([s.inicio, s.treinoId, nome, i + 1, x.carga, x.reps, x.rir, e.dor, x.reservaSeg, e.tipoCarga].map(csvCampo).join(','))
      })
  return linhas.join('\n')
}
