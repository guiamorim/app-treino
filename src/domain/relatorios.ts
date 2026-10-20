import type { Catalogo } from './catalogo'
import { GRUPOS_GRANDES, GRUPOS_MUSCULARES, type GrupoMuscular, type Medicao, type Serie, type Sessao } from './types'

/** 1RM estimado (Epley). Só faz sentido para séries de 1 a 12 repetições com carga. */
export function e1rm(carga: number, reps: number): number | null {
  if (carga <= 0 || reps < 1 || reps > 12) return null
  if (reps === 1) return carga
  return carga * (1 + reps / 30)
}

export interface PontoProgressao {
  data: string
  melhor: Serie
  e1rm: number | null
  dor: number
  recorde: boolean
}

export function progressaoExercicio(sessoes: Sessao[], exercicioId: string): PontoProgressao[] {
  let recordeAtual = -Infinity
  const pontos: PontoProgressao[] = []
  for (const s of [...sessoes].sort((a, b) => a.inicio.localeCompare(b.inicio))) {
    const reg = s.exercicios.find((e) => e.exercicioId === exercicioId && e.series.length > 0)
    if (!reg) continue
    const valor = (x: Serie) => e1rm(x.carga, x.reps) ?? x.carga * 0.0001 + x.reps * 1e-6
    const melhor = reg.series.reduce((a, b) => (valor(b) > valor(a) ? b : a))
    const v = valor(melhor)
    const recorde = v > recordeAtual
    if (recorde) recordeAtual = v
    pontos.push({ data: s.inicio, melhor: { carga: melhor.carga, reps: melhor.reps }, e1rm: e1rm(melhor.carga, melhor.reps), dor: reg.dor ?? 0, recorde })
  }
  return pontos
}

export function volumeSemanal(sessoes: Sessao[], catalogo: Catalogo, inicio: Date, fim: Date): Record<GrupoMuscular, number> {
  const v = Object.fromEntries(GRUPOS_MUSCULARES.map((g) => [g, 0])) as Record<GrupoMuscular, number>
  for (const s of sessoes) {
    const t = Date.parse(s.inicio)
    if (t < inicio.getTime() || t >= fim.getTime()) continue
    for (const e of s.exercicios) {
      const ex = catalogo.get(e.exercicioId)
      if (!ex) continue
      v[ex.grupoPrincipal] += e.series.length
      for (const g of ex.gruposSecundarios) v[g] += e.series.length * 0.5
    }
  }
  return v
}

/** Especificação, secção 3.3. */
export function alvoVolume(g: GrupoMuscular): [number, number] {
  return GRUPOS_GRANDES.includes(g) ? [8, 14] : [6, 10]
}

export function aderencia(sessoes: Sessao[], diasPorSemana: number, agora: Date, semanas = 4) {
  const desde = agora.getTime() - semanas * 7 * 86_400_000
  const feitas = sessoes.filter((s) => s.fim && Date.parse(s.inicio) >= desde && Date.parse(s.inicio) <= agora.getTime()).length
  return { feitas, planeadas: diasPorSemana * semanas }
}

/** Média móvel do peso: cada ponto usa as pesagens dos 7 dias anteriores (inclusive). */
export function mediaMovel(medicoes: Medicao[], dias = 7) {
  const pesos = medicoes
    .filter((m): m is Medicao & { pesoKg: number } => m.pesoKg !== undefined)
    .sort((a, b) => a.data.localeCompare(b.data))
  return pesos.map((m) => {
    const t = Date.parse(m.data)
    const janela = pesos.filter((x) => Date.parse(x.data) <= t && t - Date.parse(x.data) < dias * 86_400_000)
    const media = janela.reduce((s, x) => s + x.pesoKg, 0) / janela.length
    return { data: m.data, valor: m.pesoKg, media: Math.round(media * 10) / 10 }
  })
}

/** Segunda-feira 00:00 (hora local) da semana de `data`. */
export function inicioSemana(data: Date): Date {
  const d = new Date(data.getFullYear(), data.getMonth(), data.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}
