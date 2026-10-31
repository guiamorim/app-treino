// F35.4 (v1.24): mensagem de parabéns ao terminar um treino, com as metas alcançadas nesse treino.
import { m, t } from '../i18n'
import { chaveSemana, conquistas, recordesPessoais } from './conquistas'
import type { Plano, Sessao } from './types'

const TITULOS = [
  m('Treino feito! 💪'),
  m('Excelente trabalho! 🎉'),
  m('Mais um para a conta! ✅'),
  m('Missão cumprida! 🏁'),
  m('Muito bem! Estás a construir o hábito. 🌱'),
  m('Boa! O teu eu do futuro agradece. 🙌'),
]

export interface Parabens {
  titulo: string
  series: number
  minutos?: number
  /** Conquistas obtidas com este treino. */
  conquistas: { icone: string; nome: string }[]
  /** Exercícios (ids) com recorde pessoal neste treino. */
  recordes: string[]
  /** True se este treino completou a meta de treinos da semana. */
  metaSemanal: boolean
}

/**
 * Compara o histórico sem e com o treino terminado. `sessoes` já tem a sessão com `fim`.
 * O título varia de treino para treino (escolhido pelo id da sessão, sempre o mesmo para a mesma sessão).
 */
export function parabens(sessoes: Sessao[], sessaoId: string, plano: Plano | undefined, meta: number, agora: Date): Parabens | null {
  const s = sessoes.find((x) => x.id === sessaoId)
  if (!s?.fim) return null
  const series = s.exercicios.reduce((n, e) => n + e.series.length, 0)
  // Um treino terminado sem nenhuma série registada não merece parabéns (seria falso).
  if (series === 0) return null
  const antes = sessoes.filter((x) => x.id !== sessaoId)
  const jaTinha = new Set(conquistas(antes, plano, meta, agora).filter((c) => c.obtida).map((c) => c.id))
  const novas = conquistas(sessoes, plano, meta, agora).filter((c) => c.obtida && !jaTinha.has(c.id))
  const recordes = recordesPessoais(sessoes).filter((r) => r.data === s.inicio).map((r) => r.exercicioId)
  const semana = chaveSemana(s.inicio)
  const naSemana = sessoes.filter((x) => x.fim && chaveSemana(x.inicio) === semana).length
  const minutos = Math.round((Date.parse(s.fim) - Date.parse(s.inicio)) / 60_000)
  const indice = [...s.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % TITULOS.length
  return {
    titulo: t(TITULOS[indice]!),
    series,
    // Uma sessão aberta e esquecida durante horas não mostra a duração.
    ...(minutos > 0 && minutos <= 240 ? { minutos } : {}),
    conquistas: novas.map((c) => ({ icone: c.icone, nome: c.nome })),
    recordes,
    metaSemanal: naSemana === meta,
  }
}
