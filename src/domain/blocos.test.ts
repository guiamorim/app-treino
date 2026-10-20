import { describe, expect, it } from 'vitest'
import { estadoBloco, proximaMudanca, trocasDoBloco } from './blocos'
import { gerarPlano, prescricaoEfetiva, treinoEfetivo } from './plano'
import { catalogo, perfilExemplo } from './fixtures'
import type { Anamnese } from './types'

const agora = '2026-10-20T08:00:00.000Z'
const gerar = (a: Partial<Anamnese> = {}) => gerarPlano({ ...perfilExemplo, ...a }, catalogo, { id: 'p1', agora })

describe('3.7 blocos e descarga', () => {
  it('a duração do bloco depende do objetivo', () => {
    expect(gerar({ objetivo: 'forca' }).semanasBloco).toBe(4)
    expect(gerar({ objetivo: 'recomposicao' }).semanasBloco).toBe(5)
    expect(gerar({ objetivo: 'hipertrofia' }).semanasBloco).toBe(5)
    expect(gerar({ objetivo: 'saude' }).semanasBloco).toBe(6)
  })

  it('com readaptação: semanas 1–2 de readaptação, bloco 1 nas semanas 3–7, descarga na 7', () => {
    const p = gerar()
    expect(estadoBloco(p, 1)).toMatchObject({ fase: 'readaptacao', bloco: 1 })
    expect(estadoBloco(p, 2)).toMatchObject({ fase: 'readaptacao', bloco: 1 })
    expect(estadoBloco(p, 3)).toMatchObject({ fase: 'progressao', bloco: 1, semanaNoBloco: 1, semanasBloco: 5 })
    expect(estadoBloco(p, 6)).toMatchObject({ fase: 'progressao', bloco: 1, semanaNoBloco: 4 })
    expect(estadoBloco(p, 7)).toMatchObject({ fase: 'descarga', bloco: 1, semanaNoBloco: 5 })
    expect(estadoBloco(p, 8)).toMatchObject({ fase: 'progressao', bloco: 2, semanaNoBloco: 1 })
  })

  it('sem readaptação o bloco 1 começa na semana 1', () => {
    const p = gerar({ experiencia: 'intermedio' })
    expect(estadoBloco(p, 1)).toMatchObject({ fase: 'progressao', bloco: 1, semanaNoBloco: 1 })
    expect(estadoBloco(p, 5)).toMatchObject({ fase: 'descarga', bloco: 1 })
    expect(estadoBloco(p, 6)).toMatchObject({ fase: 'progressao', bloco: 2 })
  })

  it('planos antigos sem semanasBloco usam 5', () => {
    const { semanasBloco: _, ...antigo } = gerar({ experiencia: 'intermedio' })
    expect(estadoBloco(antigo, 5).fase).toBe('descarga')
  })

  it('F3 a duração estimada acompanha as séries da semana', () => {
    const p = gerar()
    expect(treinoEfetivo(p.treinos[0]!, p, 1).duracaoEstimadaMin).toBeLessThan(treinoEfetivo(p.treinos[0]!, p, 3).duracaoEstimadaMin)
  })

  it('descarga: metade das séries (arredondada para cima), RIR 3–4, mesmo exercício', () => {
    const p = gerar({ experiencia: 'intermedio', restricoes: [] })
    const principal = p.treinos[0]!.prescricoes[0]!
    expect(prescricaoEfetiva(principal, p, 5)).toMatchObject({ series: 2, rir: [3, 4], exercicioId: principal.exercicioId })
    const isolado = p.treinos[0]!.prescricoes.at(-1)!
    expect(isolado.series).toBe(3)
    expect(prescricaoEfetiva(isolado, p, 5)).toMatchObject({ series: 2, rir: [3, 4] })
  })
})

describe('3.7 rotação de exercícios', () => {
  const p = gerar()

  it('compostos não rodam; isolados com alternativa compatível rodam', () => {
    for (const t of p.treinos)
      for (const x of t.prescricoes) {
        const ex = catalogo.get(x.exercicioId)!
        if (ex.tipo === 'composto') expect(x.alternativas, x.id).toBeUndefined()
        if (x.alternativas) expect(x.alternativas[0]).toBe(x.exercicioId)
      }
  })

  it('bloco 2: curl com halteres passa a curl martelo e corda passa a polia (secção 9)', () => {
    const sup = p.treinos[0]!
    const bloco1 = treinoEfetivo(sup, p, 3).prescricoes.map((x) => x.exercicioId)
    const bloco2 = treinoEfetivo(sup, p, 8).prescricoes.map((x) => x.exercicioId)
    expect(bloco1).toContain('curl-halteres')
    expect(bloco2).toContain('curl-martelo')
    expect(bloco2).toContain('triceps-polia')
    expect(bloco2).not.toContain('curl-halteres')
    expect(treinoEfetivo(sup, p, 8).prescricoes.find((x) => x.exercicioId === 'curl-martelo')?.nota).toMatch(/Bloco 2/)
  })

  it('a rotação nunca repete um exercício no treino nem usa um exercício incompatível', () => {
    for (const dias of [2, 3, 4, 5, 6, 7] as const)
      for (const equipamento of ['ginasio', 'halteres', 'casa'] as const) {
        const a = { ...perfilExemplo, diasPorSemana: dias, equipamento, restricoes: [{ area: 'cotovelo' as const, intensidade: 3, avaliadaPorProfissional: true }] }
        const plano = gerarPlano(a, catalogo, { id: 'p', agora })
        for (const semana of [3, 8, 13, 18])
          for (const t of plano.treinos) {
            const ids = treinoEfetivo(t, plano, semana).prescricoes.map((x) => x.exercicioId)
            expect(new Set(ids).size, `${t.nome} s${semana}`).toBe(ids.length)
            for (const id of ids) expect(catalogo.get(id)!.contraindicacoes).not.toContain('cotovelo')
          }
      }
  })

  it('trocasDoBloco lista o que muda no bloco seguinte', () => {
    const trocas = trocasDoBloco(p, 2)
    expect(trocas).toContainEqual({ treino: 'Superior A', de: 'curl-halteres', para: 'curl-martelo' })
    expect(trocasDoBloco(p, 1)).toEqual([])
  })
})

describe('F14 próxima mudança', () => {
  const p = gerar()

  it('na readaptação: a próxima mudança é o fim da readaptação na semana 3', () => {
    expect(proximaMudanca(p, 1)).toMatchObject({ tipo: 'fim-readaptacao', semana: 3, data: '2026-11-03T08:00:00.000Z' })
  })

  it('em progressão: a próxima mudança é a descarga', () => {
    expect(proximaMudanca(p, 4)).toMatchObject({ tipo: 'descarga', semana: 7 })
  })

  it('na descarga: a próxima mudança é o novo bloco', () => {
    expect(proximaMudanca(p, 7)).toMatchObject({ tipo: 'novo-bloco', semana: 8 })
  })
})
