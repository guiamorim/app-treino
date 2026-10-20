// F11: indicadores do painel Início.
import { mediaMovel } from './relatorios'
import type { Medicao, Sessao } from './types'

const MAX_HORAS_SESSAO = 3
const terminadaEntre = (s: Sessao, inicio: Date, fim: Date) => {
  const t = Date.parse(s.inicio)
  return !!s.fim && t >= inicio.getTime() && t < fim.getTime()
}

/** Horas de treino das sessões terminadas; cada sessão conta no máximo 3 h. */
export function horasTreino(sessoes: Sessao[], inicio: Date, fim: Date): number {
  return sessoes
    .filter((s) => terminadaEntre(s, inicio, fim))
    .reduce((t, s) => t + Math.min(MAX_HORAS_SESSAO, Math.max(0, (Date.parse(s.fim!) - Date.parse(s.inicio)) / 3_600_000)), 0)
}

export const treinosEntre = (sessoes: Sessao[], inicio: Date, fim: Date) => sessoes.filter((s) => terminadaEntre(s, inicio, fim)).length

/** Dia 1 do mês (hora local). */
export const inicioMes = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)

/** Variação da média de 7 dias do peso em relação à de há `dias` dias (null sem dados suficientes). */
export function tendenciaPeso(medicoes: Medicao[], dias = 28): number | null {
  const pontos = mediaMovel(medicoes)
  const ultimo = pontos.at(-1)
  if (!ultimo) return null
  const limite = Date.parse(ultimo.data) - dias * 86_400_000
  const antes = pontos.filter((p) => Date.parse(p.data) <= limite).at(-1)
  return antes ? Math.round((ultimo.media - antes.media) * 10) / 10 : null
}
