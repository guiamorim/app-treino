import { describe, expect, it } from 'vitest'
import { gerarPlano, prescricaoEfetiva, semanaDoPlano } from './plano'
import { catalogo, perfilExemplo } from './fixtures'
import type { Anamnese, GrupoMuscular, Plano } from './types'
import { GRUPOS_GRANDES } from './types'

const opts = { id: 'p1', agora: '2026-10-20T08:00:00.000Z' }
const gerar = (a: Partial<Anamnese> = {}) => gerarPlano({ ...perfilExemplo, ...a }, catalogo, opts)
const exercicios = (p: Plano) => p.treinos.flatMap((t) => t.prescricoes.map((x) => catalogo.get(x.exercicioId)!))

function volumeSemanal(p: Plano): Record<string, number> {
  const v: Record<string, number> = {}
  for (const t of p.treinos)
    for (const pr of t.prescricoes) {
      const ex = catalogo.get(pr.exercicioId)!
      v[ex.grupoPrincipal] = (v[ex.grupoPrincipal] ?? 0) + pr.series
      for (const g of ex.gruposSecundarios) v[g] = (v[g] ?? 0) + pr.series * 0.5
    }
  return v
}

describe('F2 geração do plano', () => {
  it('F2.1 é determinística', () => {
    expect(gerar()).toEqual(gerar())
  })

  it.each([
    [2, ['Corpo inteiro A', 'Corpo inteiro B']],
    [3, ['Corpo inteiro A', 'Corpo inteiro B', 'Corpo inteiro C']],
    [4, ['Superior A', 'Inferior A', 'Superior B', 'Inferior B']],
    [5, ['Superior A', 'Inferior A', 'Superior B', 'Inferior B', 'Corpo inteiro A']],
  ] as const)('3.1 %i dias por semana gera a divisão certa', (dias, nomes) => {
    expect(gerar({ diasPorSemana: dias }).treinos.map((t) => t.nome)).toEqual(nomes)
  })

  it('3.1 com 4 dias, cada grupo grande é treinado (principal ou secundário) em pelo menos 2 treinos', () => {
    const p = gerar()
    for (const g of GRUPOS_GRANDES) {
      const n = p.treinos.filter((t) =>
        t.prescricoes.some((x) => {
          const ex = catalogo.get(x.exercicioId)!
          return ex.grupoPrincipal === g || ex.gruposSecundarios.includes(g)
        }),
      ).length
      expect(n, g).toBeGreaterThanOrEqual(2)
    }
  })

  it('F2.2 restrição de ombro: nenhum exercício contraindicado; usa o primeiro substituto compatível', () => {
    const p = gerar()
    expect(exercicios(p).filter((e) => e.contraindicacoes.includes('ombro'))).toEqual([])
    const supA = p.treinos[0]!.prescricoes[0]!
    expect(supA.exercicioId).toBe('supino-halteres-neutro')
    expect(supA.nota).toMatch(/Supino reto com barra.*ombro/)
    expect(p.treinos[2]!.prescricoes[0]!.exercicioId).toBe('supino-maquina')
  })

  it('F2.2 sem restrições usa os exercícios base', () => {
    const p = gerar({ restricoes: [] })
    expect(p.treinos[0]!.prescricoes[0]!.exercicioId).toBe('supino-barra')
    expect(p.treinos[0]!.prescricoes[0]!.nota).toBeUndefined()
  })

  it('3.4 não repete o mesmo exercício dentro de um treino', () => {
    for (const a of [{}, { equipamento: 'casa' as const }, { equipamento: 'halteres' as const }]) {
      for (const t of gerar(a).treinos) {
        const ids = t.prescricoes.map((x) => x.exercicioId)
        expect(new Set(ids).size, t.nome).toBe(ids.length)
      }
    }
  })

  it('3.4 respeita o equipamento disponível', () => {
    const casa = exercicios(gerar({ equipamento: 'casa' }))
    expect(casa.length).toBeGreaterThan(0)
    expect(casa.every((e) => e.equipamento.includes('peso-corporal'))).toBe(true)
    const halteres = exercicios(gerar({ equipamento: 'halteres' }))
    expect(halteres.every((e) => e.equipamento.some((q) => q === 'halteres' || q === 'peso-corporal'))).toBe(true)
  })

  it('3.4 avisa quando um grupo fica sem exercício compatível', () => {
    const p = gerar({ equipamento: 'casa' })
    expect(p.avisos.some((a) => a.includes('Costas'))).toBe(true)
  })

  it('F2.3 cada treino cabe na duração declarada', () => {
    for (const duracaoMin of [45, 60, 75] as const)
      for (const diasPorSemana of [2, 3, 4, 5] as const)
        for (const t of gerar({ duracaoMin, diasPorSemana }).treinos)
          expect(t.duracaoEstimadaMin, `${t.nome} ${duracaoMin}`).toBeLessThanOrEqual(duracaoMin)
  })

  it('3.2 parâmetros por objetivo', () => {
    const rec = gerar({ restricoes: [] }).treinos[0]!.prescricoes
    expect(rec[0]).toMatchObject({ faixa: [6, 10], rir: [1, 3], descansoSeg: 120, series: 4 })
    expect(rec.at(-1)).toMatchObject({ faixa: [10, 15], descansoSeg: 60, series: 3 })
    const forca = gerar({ objetivo: 'forca', restricoes: [] }).treinos[0]!.prescricoes[0]
    expect(forca).toMatchObject({ faixa: [3, 6], rir: [1, 2], descansoSeg: 180 })
  })

  it('3.2 exercícios com faixa própria (prancha em segundos) mantêm-na', () => {
    const prancha = gerar().treinos[1]!.prescricoes.find((x) => x.exercicioId === 'prancha')
    expect(prancha?.faixa).toEqual([30, 60])
  })

  it('3.3 volume semanal do teu plano: grupos grandes com pelo menos 8 séries', () => {
    const v = volumeSemanal(gerar())
    for (const g of GRUPOS_GRANDES) expect(v[g as GrupoMuscular], g).toBeGreaterThanOrEqual(8)
  })

  it('3.6 cardio de 10 min nos treinos de inferiores quando aceite', () => {
    const p = gerar()
    expect(p.treinos.map((t) => t.cardioMin)).toEqual([undefined, 10, undefined, 10])
    expect(gerar({ aceitaCardio: false }).treinos.every((t) => t.cardioMin === undefined)).toBe(true)
  })

  it('F1.1 PAR-Q+ com "sim" gera plano conservador e aviso', () => {
    const p = gerar({ parq: [false, true, false, false, false, false, false] })
    expect(p.conservador).toBe(true)
    expect(p.avisos.join(' ')).toMatch(/PAR-Q\+/)
    expect(p.treinos.flatMap((t) => t.prescricoes).every((x) => x.rir[0] >= 3)).toBe(true)
  })

  it('F1.2 restrição nunca avaliada gera recomendação', () => {
    expect(gerar().avisos.join(' ')).toMatch(/ombro.*fisioterapeuta/)
    const avaliada = gerar({ restricoes: [{ area: 'ombro', intensidade: 4, avaliadaPorProfissional: true }] })
    expect(avaliada.avisos.join(' ')).not.toMatch(/fisioterapeuta/)
  })
})

describe('3.3 fase de readaptação', () => {
  const p = gerar()
  const pr = p.treinos[0]!.prescricoes[0]!

  it('regresso após paragem ativa a readaptação; intermédio não', () => {
    expect(p.readaptacao).toBe(true)
    expect(gerar({ experiencia: 'intermedio' }).readaptacao).toBe(false)
  })

  it('semanas 1–2: 2 séries e RIR 3–4; semana 3: parâmetros normais', () => {
    expect(prescricaoEfetiva(pr, p, 1)).toMatchObject({ series: 2, rir: [3, 4] })
    expect(prescricaoEfetiva(pr, p, 2)).toMatchObject({ series: 2, rir: [3, 4] })
    expect(prescricaoEfetiva(pr, p, 3)).toEqual(pr)
  })

  it('semanaDoPlano conta a partir da criação', () => {
    expect(semanaDoPlano(p, '2026-10-20T20:00:00.000Z')).toBe(1)
    expect(semanaDoPlano(p, '2026-10-27T09:00:00.000Z')).toBe(2)
    expect(semanaDoPlano(p, '2026-11-03T09:00:00.000Z')).toBe(3)
  })
})
