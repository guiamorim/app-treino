import type { EstadoExercicio, Plano, Prescricao, RegistoExercicio, Sessao, TreinoModelo } from './types'

export function estadoExercicio(reg: RegistoExercicio | undefined, p: Prescricao): EstadoExercicio {
  if (!reg) return 'por-fazer'
  if (reg.saltado) return 'saltado'
  if (reg.concluido || reg.series.length >= p.series) return 'feito'
  return reg.series.length > 0 ? 'em-curso' : 'por-fazer'
}

export function registoDe(sessao: Sessao, prescricaoId: string): RegistoExercicio | undefined {
  return sessao.exercicios.find((e) => e.prescricaoId === prescricaoId)
}

export function estadoSessao(sessao: Sessao, treino: TreinoModelo) {
  let feitos = 0
  let saltados = 0
  for (const p of treino.prescricoes) {
    const e = estadoExercicio(registoDe(sessao, p.id), p)
    if (e === 'feito') feitos++
    if (e === 'saltado') saltados++
  }
  const total = treino.prescricoes.length
  return { feitos, saltados, total, completa: feitos + saltados === total }
}

const porData = (a: Sessao, b: Sessao) => a.inicio.localeCompare(b.inicio)

/** F3: rotação pela sequência do plano; retoma uma sessão por terminar. */
export function proximoTreino(plano: Plano, sessoes: Sessao[]): { treinoId: string; sessaoId?: string } {
  const ids = plano.treinos.map((t) => t.id)
  const ultima = sessoes.filter((s) => s.planoId === plano.id && ids.includes(s.treinoId)).sort(porData).at(-1)
  if (!ultima) return { treinoId: ids[0]! }
  if (!ultima.fim) return { treinoId: ultima.treinoId, sessaoId: ultima.id }
  return { treinoId: ids[(ids.indexOf(ultima.treinoId) + 1) % ids.length]! }
}

/** Registos anteriores de um exercício (com séries), do mais antigo para o mais recente. */
export function historicoExercicio(sessoes: Sessao[], exercicioId: string, excluirSessaoId?: string): RegistoExercicio[] {
  return [...sessoes]
    .filter((s) => s.id !== excluirSessaoId)
    .sort(porData)
    .flatMap((s) => s.exercicios.filter((e) => e.exercicioId === exercicioId && e.series.length > 0))
}
