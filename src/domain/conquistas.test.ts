import { describe, expect, it } from 'vitest'
import { conquistas, recordesPessoais, semanasRecordeVolume, sequenciaSemanal, volumeSessao } from './conquistas'
import { gerarPlano } from './plano'
import { catalogo, perfilExemplo } from './fixtures'
import type { Sessao } from './types'

const plano = gerarPlano({ ...perfilExemplo, experiencia: 'intermedio' }, catalogo, { id: 'p1', agora: '2026-10-05T08:00:00.000Z' })

let n = 0
function sessao(dia: string, carga = 50, reps = 10, terminada = true): Sessao {
  const inicio = `${dia}T12:00:00.000Z`
  return {
    id: `s${n++}`,
    planoId: 'p1',
    treinoId: 'superior-a',
    inicio,
    ...(terminada ? { fim: `${dia}T13:00:00.000Z` } : {}),
    exercicios: [{ prescricaoId: 'superior-a-1', exercicioId: 'supino-halteres-neutro', series: [{ carga, reps }, { carga, reps }] }],
  }
}
// Semanas (segunda a domingo): 5–11 out, 12–18 out, 19–25 out 2026.
const agora = new Date('2026-10-21T12:00:00.000Z')

describe('F12 sequência semanal', () => {
  it('conta semanas seguidas com treinos ≥ meta; a semana atual em curso não quebra', () => {
    const s = [sessao('2026-10-06'), sessao('2026-10-08'), sessao('2026-10-13'), sessao('2026-10-15'), sessao('2026-10-20')]
    expect(sequenciaSemanal(s, 2, agora)).toBe(2)
    expect(sequenciaSemanal([...s, sessao('2026-10-21')], 2, agora)).toBe(3)
  })

  it('uma semana anterior falhada quebra a sequência; sessões por terminar não contam', () => {
    const s = [sessao('2026-10-06'), sessao('2026-10-08'), sessao('2026-10-13'), sessao('2026-10-15', 50, 10, false)]
    expect(sequenciaSemanal(s, 2, agora)).toBe(0)
  })
})

describe('F12 recordes e volume', () => {
  it('volume da sessão = soma de carga × reps', () => {
    expect(volumeSessao(sessao('2026-10-06', 40, 8))).toBe(640)
  })

  it('o primeiro registo de um exercício não é recorde; uma subida é', () => {
    const s = [sessao('2026-10-06', 40), sessao('2026-10-13', 40), sessao('2026-10-20', 42)]
    expect(recordesPessoais(s).map((r) => r.data)).toEqual(['2026-10-20T12:00:00.000Z'])
  })

  it('semana com recorde de volume a partir da segunda semana com treinos', () => {
    const s = [sessao('2026-10-06', 40), sessao('2026-10-13', 30), sessao('2026-10-20', 45)]
    expect(semanasRecordeVolume(s).map((d) => d.toISOString().slice(0, 10))).toHaveLength(1)
  })
})

describe('F12 conquistas', () => {
  it('sem sessões nada está obtido', () => {
    expect(conquistas([], plano, 2, agora).every((c) => !c.obtida)).toBe(true)
  })

  it('obtém primeiro treino, primeira semana cumprida, primeiro recorde e recorde de volume', () => {
    const s = [sessao('2026-10-06', 40), sessao('2026-10-08', 40), sessao('2026-10-13', 42)]
    const obtidas = conquistas(s, plano, 2, agora).filter((c) => c.obtida).map((c) => c.id)
    expect(obtidas).toEqual(expect.arrayContaining(['primeiro-treino', 'semana-cumprida', 'primeiro-recorde']))
    expect(obtidas).not.toContain('treinos-10')
  })

  it('10 treinos', () => {
    const dias = ['06', '07', '08', '09', '10', '13', '14', '15', '16', '17']
    const c = conquistas(dias.map((d) => sessao(`2026-10-${d}`)), plano, 4, agora)
    expect(c.find((x) => x.id === 'treinos-10')?.obtida).toBe(true)
  })

  it('bloco completo: pelo menos um treino em cada semana do bloco', () => {
    // Sem readaptação, bloco de 5 semanas a partir de 5 out: 5 out a 8 nov.
    const semanas = ['2026-10-06', '2026-10-13', '2026-10-20', '2026-10-27', '2026-11-03']
    const depois = new Date('2026-11-10T12:00:00.000Z')
    expect(conquistas(semanas.map((d) => sessao(d)), plano, 2, depois).find((x) => x.id === 'bloco-completo')?.obtida).toBe(true)
    expect(conquistas(semanas.slice(0, 4).map((d) => sessao(d)), plano, 2, depois).find((x) => x.id === 'bloco-completo')?.obtida).toBe(false)
  })
})
