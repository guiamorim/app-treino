import { db } from '../data/db'
import type { Plano, RegistoExercicio, Sessao } from '../domain/types'
import { agoraIso, novoId } from './dados'

export function sessaoAberta(sessoes: Sessao[], plano: Plano, treinoId: string): Sessao | undefined {
  return sessoes.filter((s) => s.planoId === plano.id && s.treinoId === treinoId && !s.fim).at(-1)
}

export async function abrirSessao(sessoes: Sessao[], plano: Plano, treinoId: string): Promise<Sessao> {
  const existente = sessaoAberta(sessoes, plano, treinoId)
  if (existente) return existente
  const nova: Sessao = { id: novoId(), planoId: plano.id, treinoId, inicio: agoraIso(), exercicios: [] }
  await db.sessoes.put(nova)
  return nova
}

/** Altera (ou cria) o registo de um exercício dentro de uma sessão. */
export async function alterarRegisto(sessaoId: string, prescricaoId: string, exercicioId: string, f: (r: RegistoExercicio) => RegistoExercicio) {
  await db.transaction('rw', db.sessoes, async () => {
    const s = await db.sessoes.get(sessaoId)
    if (!s) return
    const atual = s.exercicios.find((e) => e.prescricaoId === prescricaoId) ?? { prescricaoId, exercicioId, series: [] }
    const novo = f(atual)
    const exercicios = s.exercicios.some((e) => e.prescricaoId === prescricaoId)
      ? s.exercicios.map((e) => (e.prescricaoId === prescricaoId ? novo : e))
      : [...s.exercicios, novo]
    await db.sessoes.put({ ...s, exercicios })
  })
}

export async function terminarSessao(sessaoId: string) {
  await db.sessoes.update(sessaoId, { fim: agoraIso() })
}
