// F25: dias de treino, previsão dos próximos treinos e grelha do calendário. Datas locais «AAAA-MM-DD».
import { estadoBloco } from './blocos'
import { semanaDoPlano } from './plano'
import { proximoTreino } from './sessao'
import type { Plano, Sessao } from './types'

const doisDigitos = (n: number) => String(n).padStart(2, '0')

/** Dia local de uma data (um treino às 23:30 conta no dia em que foi feito, não no dia UTC). */
export const diaLocal = (d: Date | string) => {
  const x = typeof d === 'string' ? new Date(d) : d
  return `${x.getFullYear()}-${doisDigitos(x.getMonth() + 1)}-${doisDigitos(x.getDate())}`
}
const paraData = (dia: string) => {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(a!, m! - 1, d!, 12)
}
export const somarDias = (dia: string, n: number) => {
  const d = paraData(dia)
  d.setDate(d.getDate() + n)
  return diaLocal(d)
}
/** 0 = segunda … 6 = domingo. */
export const diaDaSemana = (dia: string) => (paraData(dia).getDay() + 6) % 7
/** Meio-dia local do dia, em ISO, para as contas de semana do plano. */
export const meioDia = (dia: string) => paraData(dia).toISOString()

/** Sessões com algo registado ou terminadas, no dia local em que começaram. */
export function sessoesDoDia(sessoes: Sessao[], dia: string): Sessao[] {
  return sessoes.filter((s) => diaLocal(s.inicio) === dia && (s.fim || s.exercicios.some((e) => e.series.length > 0)))
}

export interface Previsto {
  dia: string
  treinoId: string
}

/**
 * F25.2: põe a rotação nos dias de treino, de `hoje` até `ate` (inclusive), a partir do próximo treino.
 * Se hoje já houve um treino terminado, começa amanhã. Sem dias escolhidos, não há previsão com datas.
 */
export function previsao(plano: Plano, sessoes: Sessao[], diasTreino: readonly number[] | undefined, hoje: string, ate: string): Previsto[] {
  if (!diasTreino?.length) return []
  const ids = plano.treinos.map((t) => t.id)
  let i = ids.indexOf(proximoTreino(plano, sessoes).treinoId)
  const terminadoHoje = sessoes.some((s) => s.planoId === plano.id && s.fim && diaLocal(s.inicio) === hoje)
  const r: Previsto[] = []
  for (let dia = terminadoHoje ? somarDias(hoje, 1) : hoje; dia <= ate; dia = somarDias(dia, 1)) {
    if (!diasTreino.includes(diaDaSemana(dia))) continue
    r.push({ dia, treinoId: ids[i]! })
    i = (i + 1) % ids.length
  }
  return r
}

/** F25.2: os próximos n treinos pela ordem da rotação (sem datas). */
export function proximosTreinos(plano: Plano, sessoes: Sessao[], n: number): string[] {
  const ids = plano.treinos.map((t) => t.id)
  const i = ids.indexOf(proximoTreino(plano, sessoes).treinoId)
  return Array.from({ length: n }, (_, k) => ids[(i + k) % ids.length]!)
}

/** Grelha do mês (mes de 1 a 12), em semanas de segunda a domingo; os dias de fora do mês são null. */
export function grelhaMes(ano: number, mes: number): (string | null)[][] {
  const primeiro = `${ano}-${doisDigitos(mes)}-01`
  const dias = new Date(ano, mes, 0).getDate()
  const celulas: (string | null)[] = [...Array<null>(diaDaSemana(primeiro)).fill(null)]
  for (let d = 1; d <= dias; d++) celulas.push(`${ano}-${doisDigitos(mes)}-${doisDigitos(d)}`)
  while (celulas.length % 7) celulas.push(null)
  return Array.from({ length: celulas.length / 7 }, (_, k) => celulas.slice(k * 7, k * 7 + 7))
}

/** Semana do plano e fase nesse dia (para marcar a descarga no calendário). */
export const faseDoDia = (plano: Plano, dia: string) => estadoBloco(plano, semanaDoPlano(plano, meioDia(dia)))

/** Segunda-feira da semana do dia. */
export const segundaDaSemana = (dia: string) => somarDias(dia, -diaDaSemana(dia))
