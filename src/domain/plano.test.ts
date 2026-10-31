import { describe, expect, it } from 'vitest'
import { divisoesPossiveis, FAIXA_CORPORAL, gerarPlano, planoNoCatalogo, prescricaoEfetiva, semanaDoPlano } from './plano'
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
    [6, ['Empurrar A', 'Puxar A', 'Pernas A', 'Empurrar B', 'Puxar B', 'Pernas B']],
    [7, ['Empurrar A', 'Puxar A', 'Pernas A', 'Empurrar B', 'Puxar B', 'Pernas B', 'Recuperação ativa']],
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

  it('3.1 com 6 dias (A/B/C duas vezes), cada grupo grande é treinado em pelo menos 2 treinos e tem 8+ séries', () => {
    const p = gerar({ diasPorSemana: 6 })
    for (const g of GRUPOS_GRANDES) {
      const n = p.treinos.filter((t) => t.prescricoes.some((x) => catalogo.get(x.exercicioId)!.grupoPrincipal === g || catalogo.get(x.exercicioId)!.gruposSecundarios.includes(g))).length
      expect(n, g).toBeGreaterThanOrEqual(2)
      expect(volumeSemanal(p)[g as GrupoMuscular], g).toBeGreaterThanOrEqual(8)
    }
  })

  it('3.1 com 7 dias o sétimo é recuperação ativa: leve, com caminhada, sem compostos', () => {
    const rec = gerar({ diasPorSemana: 7, aceitaCardio: false }).treinos.at(-1)!
    expect(rec.cardioMin).toBe(20)
    expect(rec.prescricoes.length).toBeGreaterThan(0)
    for (const x of rec.prescricoes) {
      expect(x).toMatchObject({ series: 2, rir: [3, 4] })
      expect(catalogo.get(x.exercicioId)!.tipo).toBe('isolado')
    }
  })

  it('F1 «Nenhuma» restrição: exercícios base e sem avisos de avaliação', () => {
    const p = gerar({ restricoes: [] })
    expect(p.avisos).toEqual([])
    expect(p.treinos.flatMap((t) => t.prescricoes).every((x) => x.nota === undefined)).toBe(true)
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
    expect(p.avisos.some((a) => a.includes('Bíceps'))).toBe(true)
  })

  it('3.9 em casa cada treino tem pelo menos 4 exercícios e treina empurrar, puxar e pernas na semana', () => {
    for (const diasPorSemana of [2, 3, 4, 5] as const) {
      const p = gerar({ equipamento: 'casa', restricoes: [], diasPorSemana })
      for (const t of p.treinos) expect(t.prescricoes.length, `${diasPorSemana} ${t.nome}`).toBeGreaterThanOrEqual(4)
      const grupos = new Set(exercicios(p).map((e) => e.grupoPrincipal))
      for (const g of ['peito', 'costas', 'quadriceps', 'posteriores', 'gluteos'] as const) expect(grupos.has(g), `${diasPorSemana} ${g}`).toBe(true)
    }
  })

  it('3.9 elevações, paralelas e remada invertida só aparecem com barra fixa, paralelas ou barra', () => {
    for (const equipamento of ['casa', 'halteres'] as const) {
      const ids = exercicios(gerar({ equipamento, restricoes: [], diasPorSemana: 6 })).map((e) => e.id)
      expect(ids).not.toContain('elevacoes')
      expect(ids).not.toContain('paralelas')
      expect(ids).not.toContain('remada-invertida')
    }
  })

  it('3.9 exercícios feitos só com o peso do corpo usam a faixa de peso corporal', () => {
    const p = gerar({ equipamento: 'casa', restricoes: [], diasPorSemana: 3 })
    const corpoA = p.treinos[0]!.prescricoes
    expect(corpoA.find((x) => x.exercicioId === 'flexoes')?.faixa).toEqual(FAIXA_CORPORAL.composto)
    // O búlgaro também se faz com halteres: em casa é sem carga, com halteres segue o objetivo.
    expect(corpoA.find((x) => x.exercicioId === 'agachamento-bulgaro')?.faixa).toEqual(FAIXA_CORPORAL.composto)
    const comHalteres = gerar({ equipamento: 'halteres', restricoes: [], diasPorSemana: 3 }).treinos[2]!.prescricoes
    expect(comHalteres.find((x) => x.exercicioId === 'agachamento-bulgaro')?.faixa).toEqual([6, 10])
    // A faixa própria do catálogo continua a mandar (prancha em segundos).
    expect(corpoA.find((x) => x.exercicioId === 'prancha')?.faixa).toEqual([30, 60])
  })

  it('3.9 avisa dos limites do treino sem carga', () => {
    expect(gerar({ equipamento: 'casa' }).avisos.some((a) => a.includes('barra fixa'))).toBe(true)
    expect(gerar({ equipamento: 'halteres' }).avisos.some((a) => a.includes('barra fixa'))).toBe(false)
    expect(gerar({ equipamento: 'halteres', objetivo: 'forca' }).avisos.some((a) => a.includes('força fica limitado'))).toBe(true)
    expect(gerar({ objetivo: 'forca' }).avisos.some((a) => a.includes('força fica limitado'))).toBe(false)
  })

  it('F2.3 cada treino cabe na duração declarada', () => {
    for (const duracaoMin of [45, 60, 75] as const)
      for (const diasPorSemana of [2, 3, 4, 5, 6, 7] as const)
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

describe('3.4.1 sexo, gravidez e pós-parto', () => {
  it('o plano base é igual para homens e mulheres', () => {
    expect(gerar({ sexo: 'feminino' }).treinos).toEqual(gerar({ sexo: 'masculino' }).treinos)
  })

  it('2.º/3.º trimestre: sem exercícios deitado, plano conservador e aviso', () => {
    for (const dias of [2, 3, 4, 5, 6, 7] as const) {
      const p = gerar({ sexo: 'feminino', gravidez: 'gravida-2t3t', diasPorSemana: dias, restricoes: [] })
      expect(exercicios(p).filter((e) => e.deitado), `${dias} dias`).toEqual([])
      expect(p.conservador).toBe(true)
      expect(p.treinos.flatMap((t) => t.prescricoes).every((x) => x.rir[0] >= 3)).toBe(true)
      for (const t of p.treinos) for (const x of t.prescricoes) for (const id of x.alternativas ?? []) expect(catalogo.get(id)!.deitado, id).toBeUndefined()
    }
    const p = gerar({ sexo: 'feminino', gravidez: 'gravida-2t3t', restricoes: [] })
    expect(p.avisos.join(' ')).toMatch(/obstetra/)
    expect(p.treinos[0]!.prescricoes[0]!.nota).toMatch(/gravidez/)
  })

  it('1.º trimestre e pós-parto: conservador e aviso, sem trocas por posição', () => {
    const t1 = gerar({ sexo: 'feminino', gravidez: 'gravida-1t', restricoes: [] })
    expect(t1.conservador).toBe(true)
    expect(t1.treinos[0]!.prescricoes[0]!.exercicioId).toBe('supino-barra')
    const pp = gerar({ sexo: 'feminino', gravidez: 'pos-parto', restricoes: [] })
    expect(pp.conservador).toBe(true)
    expect(pp.avisos.join(' ')).toMatch(/pavimento pélvico/)
  })

  it('«não» não altera o plano', () => {
    expect(gerar({ sexo: 'feminino', gravidez: 'nao' })).toEqual(gerar({ sexo: 'feminino' }))
  })
})

describe('3.8 ênfase', () => {
  const INFERIORES: GrupoMuscular[] = ['quadriceps', 'posteriores', 'gluteos', 'gemeos']
  const SUPERIORES: GrupoMuscular[] = ['peito', 'costas', 'ombros', 'biceps', 'triceps']
  const soma = (v: Record<string, number>, gs: GrupoMuscular[]) => gs.reduce((t, g) => t + (v[g] ?? 0), 0)

  it.each([2, 3, 4, 5, 6] as const)('%i dias: «mais pernas» dá mais volume de pernas; «mais tronco» mais de tronco', (dias) => {
    const eq = volumeSemanal(gerar({ diasPorSemana: dias, experiencia: 'intermedio' }))
    const inf = volumeSemanal(gerar({ diasPorSemana: dias, experiencia: 'intermedio', enfase: 'inferior' }))
    const sup = volumeSemanal(gerar({ diasPorSemana: dias, experiencia: 'intermedio', enfase: 'superior' }))
    expect(soma(inf, INFERIORES) - soma(inf, SUPERIORES)).toBeGreaterThan(soma(eq, INFERIORES) - soma(eq, SUPERIORES))
    expect(soma(sup, SUPERIORES) - soma(sup, INFERIORES)).toBeGreaterThan(soma(eq, SUPERIORES) - soma(eq, INFERIORES))
  })

  it('a ênfase respeita a duração e os limites de séries', () => {
    for (const enfase of ['inferior', 'superior'] as const)
      for (const duracaoMin of [45, 60, 75] as const)
        for (const t of gerar({ enfase, duracaoMin }).treinos) {
          expect(t.duracaoEstimadaMin).toBeLessThanOrEqual(duracaoMin)
          for (const x of t.prescricoes) expect(x.series).toBeGreaterThanOrEqual(2)
          for (const x of t.prescricoes) expect(x.series).toBeLessThanOrEqual(5)
        }
  })

  it('«equilibrado» é igual a não indicar ênfase', () => {
    expect(gerar({ enfase: 'equilibrado' })).toEqual(gerar())
  })
})

describe('3.1 v1.5 escolha do modelo de treino', () => {
  it('só oferece combinações coerentes com os dias', () => {
    expect(divisoesPossiveis(2)).toEqual(['automatico', 'corpo', 'ab'])
    expect(divisoesPossiveis(3)).toEqual(['automatico', 'corpo', 'ab', 'abc'])
    expect(divisoesPossiveis(4)).toEqual(['automatico', 'corpo', 'ab', 'abc', 'grupos'])
    expect(divisoesPossiveis(5)).toEqual(['automatico', 'ab', 'abc', 'grupos'])
    expect(divisoesPossiveis(7)).toEqual(['automatico', 'abc'])
  })

  it.each([
    ['corpo', 4, ['Corpo inteiro A', 'Corpo inteiro B', 'Corpo inteiro C']],
    ['corpo', 2, ['Corpo inteiro A', 'Corpo inteiro B']],
    ['ab', 3, ['Superior A', 'Inferior A', 'Superior B', 'Inferior B']],
    ['ab', 2, ['Superior A', 'Inferior A']],
    ['abc', 3, ['Empurrar A', 'Puxar A', 'Pernas A', 'Empurrar B', 'Puxar B', 'Pernas B']],
    ['grupos', 4, ['Peito e tríceps', 'Costas e bíceps', 'Pernas A', 'Ombros e core']],
    ['grupos', 5, ['Peito e tríceps', 'Costas e bíceps', 'Pernas A', 'Ombros e core', 'Pernas B']],
  ] as const)('%s com %i dias', (divisao, dias, nomes) => {
    expect(gerar({ divisao, diasPorSemana: dias }).treinos.map((t) => t.nome)).toEqual(nomes)
  })

  it('«automatico» é igual a não escolher', () => {
    expect(gerar({ divisao: 'automatico' })).toEqual(gerar())
  })

  it('frequência de 1×/semana gera aviso; combinação incoerente usa o automático com aviso', () => {
    expect(gerar({ divisao: 'grupos', diasPorSemana: 4 }).avisos.join(' ')).toMatch(/1×\/semana/)
    expect(gerar({ divisao: 'abc', diasPorSemana: 3 }).avisos.join(' ')).toMatch(/1×\/semana/)
    expect(gerar({ divisao: 'ab', diasPorSemana: 4 }).avisos.join(' ')).not.toMatch(/1×\/semana/)
    const p = gerar({ divisao: 'corpo', diasPorSemana: 6 })
    expect(p.treinos.map((t) => t.nome)).toEqual(gerar({ diasPorSemana: 6 }).treinos.map((t) => t.nome))
    expect(p.avisos.join(' ')).toMatch(/modelo automático/)
  })

  it('todas as combinações possíveis cabem na duração e não repetem exercícios', () => {
    for (const dias of [2, 3, 4, 5, 6, 7] as const)
      for (const divisao of divisoesPossiveis(dias))
        for (const duracaoMin of [45, 60, 75] as const)
          for (const t of gerar({ divisao, diasPorSemana: dias, duracaoMin }).treinos) {
            expect(t.duracaoEstimadaMin, `${divisao} ${dias} ${t.nome}`).toBeLessThanOrEqual(duracaoMin)
            const ids = t.prescricoes.map((x) => x.exercicioId)
            expect(new Set(ids).size).toBe(ids.length)
          }
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

describe('F22.1 exercício que deixou de existir no catálogo', () => {
  const plano = gerarPlano(perfilExemplo, catalogo, { id: 'p', agora: '2026-10-26T10:00:00.000Z' })

  it('um plano só com exercícios conhecidos fica igual', () => {
    expect(planoNoCatalogo(plano, catalogo)).toBe(plano)
  })

  it('retira a prescrição desconhecida, limpa alternativas desconhecidas e acrescenta um aviso', () => {
    const tr = plano.treinos[0]!
    const comAlternativas = tr.prescricoes.find((p) => p.alternativas)!
    const estragado: Plano = {
      ...plano,
      treinos: [{
        ...tr,
        prescricoes: tr.prescricoes.map((p, i) =>
          i === 0 ? { ...p, exercicioId: 'nao-existe' } : p === comAlternativas ? { ...p, alternativas: [...p.alternativas!, 'tambem-nao'] } : p),
      }, ...plano.treinos.slice(1)],
    }
    const r = planoNoCatalogo(estragado, catalogo)
    expect(r.treinos[0]!.prescricoes).toHaveLength(tr.prescricoes.length - 1)
    expect(r.treinos[0]!.prescricoes.flatMap((p) => [p.exercicioId, ...(p.alternativas ?? [])]).every((id) => catalogo.has(id))).toBe(true)
    expect(r.treinos.slice(1)).toEqual(plano.treinos.slice(1))
    expect(r.avisos.at(-1)).toMatch(/^1 exercício\(s\) do teu plano deixaram de existir/)
  })
})
