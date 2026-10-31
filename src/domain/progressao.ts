import { locale, t } from '../i18n'
import { DIAS_MIN_DEGRAU } from './escadas'
import type { Exercicio, Prescricao, RegistoExercicio, Serie } from './types'
import { deUnidade, KG_POR_LB, paraUnidade, peso, unidadePeso, type UnidadePeso } from './unidades'

export interface Sugestao {
  /** null quando ainda não há histórico. */
  carga: number | null
  reps: number
  motivo: string
  subiu: boolean
  alerta?: 'substituir' | 'parar'
  /** F30.3/F30.5: variação para onde a regra 8 manda passar. */
  variacao?: { exercicioId: string; nome: string; sentido: 'subir' | 'descer' }
}

/** F30: posição numa escada de variações, só quando o exercício é feito sem carga. */
export interface NaEscada {
  anterior?: Pick<Exercicio, 'id' | 'nome'>
  seguinte?: Pick<Exercicio, 'id' | 'nome'>
  /** Dias desde que está nesta variação (sem valor: ainda não há registo). */
  diasNoDegrau?: number
  /** F30.6: o exercício admite peso extra. */
  pesoExtra: boolean
}

export interface Entrada {
  prescricao: Prescricao
  exercicio: Exercicio
  /** Sessões anteriores deste exercício, da mais antiga para a mais recente. */
  historico: RegistoExercicio[]
  readaptacao: boolean
  /** Secção 4.6: semana de descarga. */
  descarga?: boolean
  /** F28.2: carga mais alta que a pessoa tem (halter mais pesado), em kg. */
  cargaMaxKg?: number
  /** F30 (v1.19): escada de variações; ignorada quando o exercício tem carga. */
  escada?: NaEscada
}

const PASSO_SEGUNDOS = 5
const DOR_SEM_SUBIDA = 4
const DOR_PARAR = 7
const INCREMENTO_RELATIVO_MAX = 0.1
const INCREMENTO_MINIMO = 1
/** F22.9: em libras, os passos são múltiplos de 2,5 lb (o disco mais pequeno comum). */
const PASSO_LB = 2.5

/** Arredonda para baixo a 0,5 da unidade. */
const arredondar = (kg: number, u: UnidadePeso) => deUnidade(Math.floor(paraUnidade(kg, u) * 2) / 2, u)
const multiploLb = (lb: number) => Math.max(PASSO_LB, Math.round(lb / PASSO_LB) * PASSO_LB)

/** Incremento na unidade: o do exercício em kg, ou o equivalente em libras redondas (2,5 kg → 5 lb). Com carga leve, metade. */
function incremento(incrementoKg: number, carga: number, u: UnidadePeso): { valor: number; leve: boolean } {
  const normal = u === 'kg' ? incrementoKg : multiploLb(incrementoKg / KG_POR_LB)
  // v1.3: com cargas leves, o incremento normal seria um salto grande demais.
  const leve = normal > paraUnidade(carga, u) * INCREMENTO_RELATIVO_MAX
  if (!leve) return { valor: normal, leve }
  return { valor: u === 'kg' ? Math.max(INCREMENTO_MINIMO, Math.round((normal / 2) * 4) / 4) : multiploLb(normal / 2), leve }
}

/** Especificação, secção 4 (dupla progressão). */
/** Regra 8 da secção 4: todas as séries no topo e sem falha. */
const topoSemFalha = (series: Serie[], max: number) => series.length > 0 && series.every((s) => s.reps >= max) && series.every((s) => s.rir === undefined || s.rir >= 1)

/** Regra 8: subir de degrau (ou passar a peso extra no último), quando o topo se repete e o degrau já tem dias. */
function subirDegrau(escada: NaEscada, comSeries: RegistoExercicio[], carga: number, max: number, unidade: string): Sugestao {
  const base = { carga, reps: max, subiu: false }
  const { seguinte } = escada
  if (!seguinte) {
    return { ...base, motivo: escada.pesoExtra ? t('Chegaste ao último degrau da escada: acrescenta peso extra (colete ou mochila) e escolhe «Peso extra» em «Como contas o peso?».') : t('Chegaste ao último degrau da escada: em vez de mais {unidade}, desce em 3 s em cada repetição ou faz uma pausa a meio.', { unidade }) }
  }
  const anterior = comSeries.at(-2)
  if (!anterior || !topoSemFalha(anterior.series, max)) {
    return { ...base, motivo: t('Chegaste a {max} {unidade} em todas as séries. Mais uma sessão assim e passas para «{nome}».', { max, unidade, nome: seguinte.nome }) }
  }
  const faltam = DIAS_MIN_DEGRAU - (escada.diasNoDegrau ?? 0)
  if (faltam > 0) {
    return { ...base, motivo: t('Pronto para «{nome}» daqui a {n} dia(s): tendões e articulações adaptam-se mais devagar do que o músculo. Até lá, desce em 3 s em cada repetição.', { nome: seguinte.nome, n: faltam }) }
  }
  return { ...base, variacao: { exercicioId: seguinte.id, nome: seguinte.nome, sentido: 'subir' }, motivo: t('Chegaste a {max} {unidade} em todas as séries em 2 sessões seguidas: passa para «{nome}».', { max, unidade, nome: seguinte.nome }) }
}

export function sugerir({ prescricao, exercicio, historico, readaptacao, descarga, cargaMaxKg, escada: escadaEntrada }: Entrada): Sugestao {
  // F30: a escada só conta quando o exercício é feito sem carga.
  const escada = exercicio.incrementoKg === 0 ? escadaEntrada : undefined
  const u = unidadePeso()
  const [min, max] = prescricao.faixa
  const comSeries = historico.filter((h) => h.series.length > 0)
  const ultima = comSeries.at(-1)
  const unidade = exercicio.medida === 'segundos' ? 's' : 'reps'

  if (!ultima) {
    if (escada?.anterior) {
      return { carga: null, reps: min, subiu: false, motivo: t('Primeira vez nesta variação: faz a 1.ª série aqui e, se não chegares a {min} {unidade}, faz as restantes em «{nome}».', { min, unidade, nome: escada.anterior.nome }) }
    }
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
    return { carga, reps: min, subiu: false, motivo: carga > 0 ? t('Semana de descarga: mantém {carga}, faz menos séries e para longe da falha (RIR {a}–{b}).', { carga: peso(carga), a: prescricao.rir[0], b: prescricao.rir[1] }) : t('Semana de descarga: faz menos séries e para longe da falha (RIR {a}–{b}).', { a: prescricao.rir[0], b: prescricao.rir[1] }) }
  }

  const naSubida = () => readaptacao && comSeries.length < 2 ? undefined : escada && subirDegrau(escada, comSeries, carga, max, unidade)

  if (exercicio.medida === 'segundos') {
    const subir = maisBaixa >= max && dor < DOR_SEM_SUBIDA ? naSubida() : undefined
    if (subir) return subir
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
  if (duasAbaixo && escada?.anterior) {
    return { carga, reps: min, subiu: false, variacao: { exercicioId: escada.anterior.id, nome: escada.anterior.nome, sentido: 'descer' }, motivo: t('Ficaste abaixo de {min} {unidade} em 2 sessões seguidas: volta a «{nome}» por agora.', { min, unidade, nome: escada.anterior.nome }) }
  }
  if (duasAbaixo && exercicio.incrementoKg === 0) {
    return { carga, reps: min, subiu: false, motivo: t('Ficaste abaixo de {min} {unidade} em 2 sessões seguidas: usa uma variação mais fácil ou faz menos amplitude até voltares à faixa.', { min, unidade }) }
  }
  if (duasAbaixo) {
    return { carga: arredondar(carga * 0.9, u), reps: min, subiu: false, motivo: t('Ficaste abaixo de {min} {unidade} em 2 sessões seguidas: baixa a carga 10%.', { min, unidade }) }
  }

  if (noTopo && semFalha) {
    if (readaptacao && comSeries.length < 2) {
      return { carga, reps: max, subiu: false, motivo: t('Fase de readaptação: mantém a carga mais uma sessão antes de subir.') }
    }
    if (escada) return subirDegrau(escada, comSeries, carga, max, unidade)
    if (exercicio.incrementoKg === 0) {
      return { carga, reps: max, subiu: false, motivo: t('Chegaste a {max} reps em todas as séries: aumenta a dificuldade (ex.: variação mais difícil ou mochila com peso).', { max }) }
    }
    const inc = incremento(exercicio.incrementoKg, carga, u)
    const nova = deUnidade(paraUnidade(carga, u) + inc.valor, u)
    if (cargaMaxKg !== undefined && nova > cargaMaxKg + 0.01) {
      return { carga, reps: max, subiu: false, motivo: t('Já usas o halter mais pesado que tens: em vez de subir a carga, desce em 3 s em cada repetição, ou faz mais repetições com uma perna ou um braço de cada vez.') }
    }
    return {
      carga: nova,
      reps: min,
      subiu: true,
      motivo: t('Fizeste {max} reps em todas as séries: sobe para {nova} e volta a {min} reps.', { max, nova: peso(nova), min }) + (inc.leve ? ' ' + t('Subida de {incremento} porque a carga ainda é leve.', { incremento: `${inc.valor.toLocaleString(locale())} ${u}` }) : ''),
    }
  }

  if (noTopo) {
    return { carga, reps: max, subiu: false, motivo: t('Chegaste ao topo mas até à falha: repete esta carga com 1 rep de reserva antes de subir.') }
  }

  return { carga, reps: Math.min(maisBaixa + 1, max), subiu: false, motivo: t('Mantém {carga} e tenta +1 rep na série mais fraca.', { carga: peso(carga) }) }
}
