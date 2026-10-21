// F15: fotos de avaliação agrupadas por mês e comparação com as medições.
import type { FotoAvaliacao, Medicao, Pose } from './types'

const DIA_MS = 86_400_000
const MAX_DIAS_MEDICAO = 7

const porDataDesc = (a: FotoAvaliacao, b: FotoAvaliacao) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id)

export function fotosPorMes(fotos: FotoAvaliacao[]): { mes: string; fotos: FotoAvaliacao[] }[] {
  const grupos = new Map<string, FotoAvaliacao[]>()
  for (const f of [...fotos].sort(porDataDesc)) {
    const mes = f.data.slice(0, 7)
    grupos.set(mes, [...(grupos.get(mes) ?? []), f])
  }
  return [...grupos].map(([mes, fotos]) => ({ mes, fotos }))
}

/** Medição mais próxima da data, até 7 dias de diferença. */
export function medicaoProxima(medicoes: Medicao[], data: string): Medicao | undefined {
  const t = Date.parse(data)
  let melhor: Medicao | undefined
  let distancia = Infinity
  for (const m of medicoes) {
    const d = Math.abs(Date.parse(m.data) - t)
    if (d <= MAX_DIAS_MEDICAO * DIA_MS && d < distancia) {
      melhor = m
      distancia = d
    }
  }
  return melhor
}

export interface LadoComparacao {
  foto: FotoAvaliacao
  medicao?: Medicao
}

export interface Comparacao {
  antes?: LadoComparacao
  depois?: LadoComparacao
  difPesoKg?: number
  difCinturaCm?: number
}

/** Última foto de cada mês na pose escolhida, com a medição mais próxima e as diferenças. */
export function compararFotos(fotos: FotoAvaliacao[], medicoes: Medicao[], mesAntes: string, mesDepois: string, pose: Pose): Comparacao {
  const ultima = (mes: string) => fotos.filter((f) => f.pose === pose && f.data.startsWith(mes)).sort(porDataDesc)[0]
  const lado = (f: FotoAvaliacao | undefined): LadoComparacao | undefined => {
    if (!f) return undefined
    const medicao = medicaoProxima(medicoes, f.data)
    return medicao ? { foto: f, medicao } : { foto: f }
  }
  const antes = lado(ultima(mesAntes))
  const depois = lado(ultima(mesDepois))
  const r: Comparacao = {}
  if (antes) r.antes = antes
  if (depois) r.depois = depois
  const dif = (k: 'pesoKg' | 'cinturaCm') => {
    const a = antes?.medicao?.[k]
    const b = depois?.medicao?.[k]
    return a !== undefined && b !== undefined ? Math.round((b - a) * 10) / 10 : undefined
  }
  const p = dif('pesoKg')
  const c = dif('cinturaCm')
  if (p !== undefined) r.difPesoKg = p
  if (c !== undefined) r.difCinturaCm = c
  return r
}
