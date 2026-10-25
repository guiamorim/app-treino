import { locale, t } from '../i18n'
import type { Exercicio, Prescricao, RegistoExercicio } from './types'

export interface Sugestao {
  /** null quando ainda não há histórico. */
  carga: number | null
  reps: number
  motivo: string
  subiu: boolean
  alerta?: 'substituir' | 'parar'
}

export interface Entrada {
  prescricao: Prescricao
  exercicio: Exercicio
  /** Sessões anteriores deste exercício, da mais antiga para a mais recente. */
  historico: RegistoExercicio[]
  readaptacao: boolean
  /** Secção 4.6: semana de descarga. */
  descarga?: boolean
}

const PASSO_SEGUNDOS = 5
const DOR_SEM_SUBIDA = 4
const DOR_PARAR = 7
const INCREMENTO_RELATIVO_MAX = 0.1
const INCREMENTO_MINIMO = 1

const arredondar = (kg: number) => Math.floor(kg * 2) / 2
const fmt = (kg: number) => kg.toLocaleString(locale())

/** Especificação, secção 4 (dupla progressão). */
export function sugerir({ prescricao, exercicio, historico, readaptacao, descarga }: Entrada): Sugestao {
  const [min, max] = prescricao.faixa
  const comSeries = historico.filter((h) => h.series.length > 0)
  const ultima = comSeries.at(-1)
  const unidade = exercicio.medida === 'segundos' ? 's' : 'reps'

  if (!ultima) {
    return {
      carga: null,
      reps: min,
      subiu: false,
      motivo:
        exercicio.medida === 'segundos'
          ? t('Primeira vez: aguenta {min} s com boa técnica.', { min })
          : t('Primeira vez: escolhe uma carga em que terminarias com RIR {a}–{b} (ainda conseguirias fazer {a} a {b} reps).', { a: prescricao.rir[0], b: prescricao.rir[1] }),
    }
  }

  const carga = ultima.series[0]!.carga
  const reps = ultima.series.map((s) => s.reps)
  const maisBaixa = Math.min(...reps)
  const dor = ultima.dor ?? 0

  if (dor >= DOR_PARAR) {
    return {
      carga,
      reps: Math.min(maisBaixa, max),
      subiu: false,
      alerta: 'parar',
      motivo: t('Na última sessão registaste dor {dor}/10. Recomenda-se não fazer este exercício hoje e procurar avaliação de um profissional de saúde.', { dor }),
    }
  }

  if (descarga) {
    return { carga, reps: min, subiu: false, motivo: carga > 0 ? t('Semana de descarga: mantém {carga} kg, faz menos séries e para longe da falha (RIR {a}–{b}).', { carga: fmt(carga), a: prescricao.rir[0], b: prescricao.rir[1] }) : t('Semana de descarga: faz menos séries e para longe da falha (RIR {a}–{b}).', { a: prescricao.rir[0], b: prescricao.rir[1] }) }
  }

  if (exercicio.medida === 'segundos') {
    if (maisBaixa >= max) return { carga, reps: max, subiu: false, motivo: t('Chegaste a {max} s: aumenta a dificuldade (ex.: variação mais difícil) em vez do tempo.', { max }) }
    return { carga, reps: Math.min(maisBaixa + PASSO_SEGUNDOS, max), subiu: false, motivo: t('Tenta +{n} s.', { n: PASSO_SEGUNDOS }) }
  }

  const noTopo = reps.every((r) => r >= max)
  const semFalha = ultima.series.every((s) => s.rir === undefined || s.rir >= 1)

  if (dor >= DOR_SEM_SUBIDA) {
    return {
      carga,
      reps: Math.min(maisBaixa + (noTopo ? 0 : 1), max),
      subiu: false,
      alerta: 'substituir',
      motivo: t('Dor {dor}/10 na última sessão: não subas a carga. Considera trocar por um substituto.', { dor }),
    }
  }

  const duasAbaixo = comSeries.length >= 2 && comSeries.slice(-2).every((h) => h.series.some((s) => s.reps < min))
  if (duasAbaixo) {
    return { carga: arredondar(carga * 0.9), reps: min, subiu: false, motivo: t('Ficaste abaixo de {min} {unidade} em 2 sessões seguidas: baixa a carga 10%.', { min, unidade }) }
  }

  if (noTopo && semFalha) {
    if (readaptacao && comSeries.length < 2) {
      return { carga, reps: max, subiu: false, motivo: t('Fase de readaptação: mantém a carga mais uma sessão antes de subir.') }
    }
    if (exercicio.incrementoKg === 0) {
      return { carga, reps: max, subiu: false, motivo: t('Chegaste a {max} reps em todas as séries: aumenta a dificuldade (ex.: variação mais difícil ou mochila com peso).', { max }) }
    }
    // v1.3: com cargas leves, o incremento normal seria um salto grande demais.
    const leve = exercicio.incrementoKg > carga * INCREMENTO_RELATIVO_MAX
    const incremento = leve ? Math.max(INCREMENTO_MINIMO, Math.round((exercicio.incrementoKg / 2) * 4) / 4) : exercicio.incrementoKg
    const nova = carga + incremento
    return {
      carga: nova,
      reps: min,
      subiu: true,
      motivo: t('Fizeste {max} reps em todas as séries: sobe para {nova} kg e volta a {min} reps.', { max, nova: fmt(nova), min }) + (leve ? ' ' + t('Subida de {kg} kg porque a carga ainda é leve.', { kg: fmt(incremento) }) : ''),
    }
  }

  if (noTopo) {
    return { carga, reps: max, subiu: false, motivo: t('Chegaste ao topo mas até à falha: repete esta carga com 1 rep de reserva antes de subir.') }
  }

  return { carga, reps: Math.min(maisBaixa + 1, max), subiu: false, motivo: t('Mantém {carga} kg e tenta +1 rep na série mais fraca.', { carga: fmt(carga) }) }
}
