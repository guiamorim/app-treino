import { describe, expect, it } from 'vitest'
import { gerarPlano } from './plano'
import { catalogo, perfilExemplo } from './fixtures'
import { parabens } from './parabens'
import type { Sessao } from './types'

const plano = gerarPlano({ ...perfilExemplo, experiencia: 'intermedio' }, catalogo, { id: 'p1', agora: '2026-10-05T08:00:00.000Z' })
const agora = new Date('2026-10-21T14:00:00.000Z')
const sessao = (id: string, dia: string, carga: number, minutos = 50): Sessao => ({
  id,
  planoId: 'p1',
  treinoId: 'superior-a',
  inicio: `${dia}T12:00:00.000Z`,
  fim: new Date(Date.parse(`${dia}T12:00:00.000Z`) + minutos * 60_000).toISOString(),
  exercicios: [{ prescricaoId: 'superior-a-1', exercicioId: 'supino-halteres-neutro', series: [{ carga, reps: 10 }, { carga, reps: 10 }, { carga, reps: 8 }] }],
})

describe('F35.4 parabéns ao terminar o treino', () => {
  it('primeiro treino: conquista nova, séries e minutos; sem recorde (o primeiro registo não conta)', () => {
    const p = parabens([sessao('a', '2026-10-20', 20)], 'a', plano, 2, agora)!
    expect(p.series).toBe(3)
    expect(p.minutos).toBe(50)
    expect(p.conquistas.map((c) => c.nome)).toEqual(['Primeiro treino'])
    expect(p.recordes).toEqual([])
    expect(p.metaSemanal).toBe(false)
    expect(p.titulo.length).toBeGreaterThan(0)
  })

  it('recorde pessoal e meta semanal cumprida neste treino; conquistas já obtidas não se repetem', () => {
    const s = [sessao('a', '2026-10-20', 20), sessao('b', '2026-10-21', 22)]
    const p = parabens(s, 'b', plano, 2, agora)!
    expect(p.recordes).toEqual(['supino-halteres-neutro'])
    expect(p.metaSemanal).toBe(true)
    expect(p.conquistas.map((c) => c.nome)).not.toContain('Primeiro treino')
    expect(p.conquistas.map((c) => c.nome)).toContain('Primeiro recorde')
  })

  it('sem séries registadas não há parabéns', () => {
    expect(parabens([{ ...sessao('a', '2026-10-20', 20), exercicios: [] }], 'a', plano, 2, agora)).toBeNull()
  })

  it('sessão por terminar não dá parabéns; duração absurda (sessão esquecida) não aparece', () => {
    expect(parabens([{ ...sessao('a', '2026-10-20', 20), fim: undefined }], 'a', plano, 2, agora)).toBeNull()
    expect(parabens([sessao('a', '2026-10-20', 20, 600)], 'a', plano, 2, agora)!.minutos).toBeUndefined()
  })

  it('o título é o mesmo para a mesma sessão e varia entre sessões', () => {
    const titulos = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => parabens([sessao(id, '2026-10-20', 20)], id, plano, 2, agora)!.titulo))
    expect(titulos.size).toBeGreaterThan(1)
    expect(parabens([sessao('x', '2026-10-20', 20)], 'x', plano, 2, agora)!.titulo).toBe(parabens([sessao('x', '2026-10-20', 20)], 'x', plano, 2, agora)!.titulo)
  })
})
