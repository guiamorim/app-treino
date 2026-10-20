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

const arredondar = (kg: number) => Math.floor(kg * 2) / 2
const fmt = (kg: number) => kg.toLocaleString('pt-PT')

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
          ? `Primeira vez: aguenta ${min} s com boa técnica.`
          : `Primeira vez: escolhe uma carga em que terminarias com RIR ${prescricao.rir[0]}–${prescricao.rir[1]} (ainda conseguirias fazer ${prescricao.rir[0]} a ${prescricao.rir[1]} reps).`,
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
      motivo: `Na última sessão registaste dor ${dor}/10. Recomenda-se não fazer este exercício hoje e procurar avaliação de um profissional de saúde.`,
    }
  }

  if (descarga) {
    return { carga, reps: min, subiu: false, motivo: `Semana de descarga: ${carga > 0 ? `mantém ${fmt(carga)} kg, ` : ''}faz menos séries e para longe da falha (RIR ${prescricao.rir[0]}–${prescricao.rir[1]}).` }
  }

  if (exercicio.medida === 'segundos') {
    if (maisBaixa >= max) return { carga, reps: max, subiu: false, motivo: `Chegaste a ${max} s: aumenta a dificuldade (ex.: variação mais difícil) em vez do tempo.` }
    return { carga, reps: Math.min(maisBaixa + PASSO_SEGUNDOS, max), subiu: false, motivo: `Tenta +${PASSO_SEGUNDOS} s.` }
  }

  const noTopo = reps.every((r) => r >= max)
  const semFalha = ultima.series.every((s) => s.rir === undefined || s.rir >= 1)

  if (dor >= DOR_SEM_SUBIDA) {
    return {
      carga,
      reps: Math.min(maisBaixa + (noTopo ? 0 : 1), max),
      subiu: false,
      alerta: 'substituir',
      motivo: `Dor ${dor}/10 na última sessão: não subas a carga. Considera trocar por um substituto.`,
    }
  }

  const duasAbaixo = comSeries.length >= 2 && comSeries.slice(-2).every((h) => h.series.some((s) => s.reps < min))
  if (duasAbaixo) {
    return { carga: arredondar(carga * 0.9), reps: min, subiu: false, motivo: `Ficaste abaixo de ${min} ${unidade} em 2 sessões seguidas: baixa a carga 10%.` }
  }

  if (noTopo && semFalha) {
    if (readaptacao && comSeries.length < 2) {
      return { carga, reps: max, subiu: false, motivo: 'Fase de readaptação: mantém a carga mais uma sessão antes de subir.' }
    }
    if (exercicio.incrementoKg === 0) {
      return { carga, reps: max, subiu: false, motivo: `Chegaste a ${max} reps em todas as séries: aumenta a dificuldade (ex.: variação mais difícil ou mochila com peso).` }
    }
    const nova = carga + exercicio.incrementoKg
    return { carga: nova, reps: min, subiu: true, motivo: `Fizeste ${max} reps em todas as séries: sobe para ${fmt(nova)} kg e volta a ${min} reps.` }
  }

  if (noTopo) {
    return { carga, reps: max, subiu: false, motivo: 'Chegaste ao topo mas até à falha: repete esta carga com 1 rep de reserva antes de subir.' }
  }

  return { carga, reps: Math.min(maisBaixa + 1, max), subiu: false, motivo: `Mantém ${fmt(carga)} kg e tenta +1 rep na série mais fraca.` }
}
