// F36 (v1.25): registo de cardio, como complemento do treino do dia ou avulso, e minutos da semana.
import { m, traduzido } from '../i18n'

export const MODALIDADES = ['caminhada', 'passadeira', 'bicicleta', 'eliptica', 'remo', 'corrida', 'corda', 'natacao', 'outro'] as const
export type Modalidade = (typeof MODALIDADES)[number]

export const NOMES_MODALIDADES: Record<Modalidade, string> = traduzido({
  caminhada: m('Caminhada rápida'),
  passadeira: m('Passadeira inclinada'),
  bicicleta: m('Bicicleta'),
  eliptica: m('Elíptica'),
  remo: m('Remo'),
  corrida: m('Corrida'),
  corda: m('Saltar à corda'),
  natacao: m('Natação'),
  outro: m('Outro'),
})

export interface RegistoCardio {
  id: string
  /** ISO: o momento do registo, ou o meio-dia local quando é registado num dia anterior. */
  data: string
  modalidade: Modalidade
  minutos: number
  /** Esforço percebido, 0–10 (F36.2). */
  esforco: number
  distanciaKm?: number
  /** Frequência cardíaca média, em batimentos por minuto. */
  fcMedia?: number
  /** F36.1: sessão de força a que o cardio se juntou, quando é complemento do treino do dia. */
  sessaoId?: string
}

export const LIMITES = { minutos: [1, 300], esforco: [0, 10], distanciaKm: [0.1, 300], fcMedia: [30, 230] } as const

export type Intensidade = 'leve' | 'moderada' | 'vigorosa'

/** F36.2: esforço 0–4 leve, 5–6 moderado, 7–10 vigoroso. */
export const intensidade = (esforco: number): Intensidade => (esforco >= 7 ? 'vigorosa' : esforco >= 5 ? 'moderada' : 'leve')

const TESTE_FALA_PT: Record<Intensidade | 'maxima', string> = {
  leve: m('Leve: consegues falar e até cantar.'),
  moderada: m('Moderado: consegues falar, mas não cantar.'),
  vigorosa: m('Vigoroso: só consegues dizer algumas palavras de cada vez.'),
  maxima: m('Quase máximo: não consegues falar.'),
}
const TESTE_FALA = traduzido(TESTE_FALA_PT)

/** F36.2: o teste da fala correspondente ao esforço escolhido. */
export const testeDaFala = (esforco: number) => (esforco >= 9 ? TESTE_FALA.maxima : TESTE_FALA[intensidade(esforco)])

/** F36.3: a OMS (2020) recomenda 150–300 min de intensidade moderada por semana, ou o equivalente. */
export const META_OMS: readonly [number, number] = [150, 300]

/** F36.3: minutos equivalentes a moderado. Vigoroso conta a dobrar (OMS 2020); leve não conta. */
export const minutosEquivalentes = (r: Pick<RegistoCardio, 'minutos' | 'esforco'>) => {
  const i = intensidade(r.esforco)
  return i === 'vigorosa' ? r.minutos * 2 : i === 'moderada' ? r.minutos : 0
}

export interface ResumoCardio {
  registos: RegistoCardio[]
  minutos: number
  moderados: number
  vigorosos: number
  /** Minutos equivalentes a moderado, comparados com a meta da OMS. */
  equivalentes: number
}

/** F36.3: cardio entre `inicio` (incluído) e `fim` (excluído), por ordem de data. */
export function cardioEntre(registos: readonly RegistoCardio[], inicio: Date, fim: Date): ResumoCardio {
  const lista = registos.filter((r) => Date.parse(r.data) >= inicio.getTime() && Date.parse(r.data) < fim.getTime()).sort((a, b) => a.data.localeCompare(b.data))
  const soma = (f: (r: RegistoCardio) => number) => lista.reduce((n, r) => n + f(r), 0)
  return {
    registos: lista,
    minutos: soma((r) => r.minutos),
    moderados: soma((r) => (intensidade(r.esforco) === 'moderada' ? r.minutos : 0)),
    vigorosos: soma((r) => (intensidade(r.esforco) === 'vigorosa' ? r.minutos : 0)),
    equivalentes: soma(minutosEquivalentes),
  }
}

/**
 * F36.2: zonas aproximadas pela idade, só como nota. Frequência máxima pela fórmula de Tanaka (208 − 0,7 × idade);
 * moderado 64–76 % e vigoroso 77–95 % da máxima (ACSM). Erram muito de pessoa para pessoa.
 */
export function zonasFc(idade: number) {
  const max = Math.round(208 - 0.7 * idade)
  const pct = (p: number) => Math.round(max * p)
  return { max, moderada: [pct(0.64), pct(0.76)] as const, vigorosa: [pct(0.77), pct(0.95)] as const }
}

export type ErroCardio = 'modalidade' | 'minutos' | 'esforco' | 'distancia' | 'fc' | 'data'

const dentro = (v: number, [min, max]: readonly [number, number]) => Number.isFinite(v) && v >= min && v <= max

/** F36.2: o primeiro problema do registo, ou null se pode ser gravado. `hoje` é o dia local AAAA-MM-DD. */
export function validarCardio(r: Omit<RegistoCardio, 'id'>, dia: string, hoje: string): ErroCardio | null {
  if (!(MODALIDADES as readonly string[]).includes(r.modalidade)) return 'modalidade'
  if (!Number.isInteger(r.minutos) || !dentro(r.minutos, LIMITES.minutos)) return 'minutos'
  if (!Number.isInteger(r.esforco) || !dentro(r.esforco, LIMITES.esforco)) return 'esforco'
  if (r.distanciaKm !== undefined && !dentro(r.distanciaKm, LIMITES.distanciaKm)) return 'distancia'
  if (r.fcMedia !== undefined && (!Number.isInteger(r.fcMedia) || !dentro(r.fcMedia, LIMITES.fcMedia))) return 'fc'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || dia > hoje) return 'data'
  return null
}
