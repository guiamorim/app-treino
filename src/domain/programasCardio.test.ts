import { describe, expect, it } from 'vitest'
import { perfilExemplo } from './fixtures'
import { avisosPersonalizado, bloqueio, DEFINICOES, PROGRAMAS, progresso, semanasPersonalizado, textoSessao, validarPersonalizado, type Personalizado } from './programasCardio'
import type { RegistoCardio } from './cardio'

const minutosSemana = (s: { minutos: number }[]) => s.reduce((n, x) => n + x.minutos, 0)
const decimal = (n: number) => String(n).replace('.', ',')

describe('F37.1 programas definidos', () => {
  it('têm a duração e os extremos do estudo', () => {
    expect(PROGRAMAS.map((p) => DEFINICOES[p].length)).toEqual([8, 8, 9, 6, 12])
    const c = DEFINICOES.caminhar
    expect([c[0]!.length, c[0]![0]!.minutos, c.at(-1)!.length, c.at(-1)![0]!.minutos]).toEqual([3, 20, 5, 45])
    const b = DEFINICOES['baixo-impacto']
    expect([b[0]!.length, b[0]![0]!.minutos, b.at(-1)!.length, b.at(-1)![0]!.minutos]).toEqual([3, 25, 4, 45])
    expect(minutosSemana(DEFINICOES.emagrecer[0]!)).toBe(150)
    expect(minutosSemana(DEFINICOES.emagrecer.at(-1)!)).toBe(250)
  })

  it('o volume nunca desce de uma semana para a seguinte; na corrida, sobe o tempo seguido a correr', () => {
    for (const p of PROGRAMAS.filter((x) => x !== 'correr-5km')) {
      const totais = DEFINICOES[p].map(minutosSemana)
      for (let i = 1; i < totais.length; i++) expect(totais[i], `${p} semana ${i + 1}`).toBeGreaterThanOrEqual(totais[i - 1]!)
    }
    const seguido = DEFINICOES['correr-5km'].map((s) => s[0]!.intervalos?.trabalhoMin ?? s[0]!.minutos - 2 * s[0]!.calmaMin!)
    expect(seguido).toEqual([1, 2, 3, 5, 8, 12, 20, 25, 30])
  })

  it('correr 5 km começa com 8 × (1 + 1,5) e acaba em 30 min seguidos, 3 vezes por semana', () => {
    const r = DEFINICOES['correr-5km']
    expect(r.every((s) => s.length === 3)).toBe(true)
    expect(textoSessao(r[0]![0]!, decimal)).toBe('8 × (1 min a correr + 1,5 min a andar) · com 5 min a andar antes e depois · 29 min · esforço 6–7')
    expect(textoSessao(r.at(-1)![0]!, decimal)).toBe('30 min a correr seguidos · com 5 min a andar antes e depois · 40 min · esforço 6–7')
  })

  it('intervalos: 2 sessões de 4 min a 8/10 com 3 min leves, mais cardio moderado', () => {
    const s = DEFINICOES.intervalos[2]!
    expect(s.filter((x) => x.intervalos).map((x) => [x.intervalos!.series, x.intervalos!.trabalhoMin, x.intervalos!.recuperacaoMin, x.esforco[0]])).toEqual([[4, 4, 3, 8], [4, 4, 3, 8]])
    expect(s.filter((x) => !x.intervalos)).toHaveLength(1)
  })
})

describe('F37.3 bloqueios por segurança', () => {
  it('PAR-Q com «sim», gravidez ou pós-parto bloqueiam correr 5 km e intervalos', () => {
    expect(bloqueio('correr-5km', perfilExemplo)).toBeNull()
    const parq = { ...perfilExemplo, parq: [true, false, false, false, false, false, false] }
    expect(bloqueio('correr-5km', parq)).toContain('PAR-Q')
    expect(bloqueio('intervalos', parq)).toContain('PAR-Q')
    expect(bloqueio('caminhar', parq)).toBeNull()
    const pos = { ...perfilExemplo, sexo: 'feminino' as const, gravidez: 'pos-parto' as const }
    expect(bloqueio('intervalos', pos)).toContain('pós-parto')
    expect(bloqueio('emagrecer', pos)).toBeNull()
  })

  it('dor no joelho ou na anca bloqueia só a corrida', () => {
    const joelho = { ...perfilExemplo, restricoes: [{ area: 'joelho' as const, intensidade: 3, avaliadaPorProfissional: true }] }
    expect(bloqueio('correr-5km', joelho)).toContain('joelho')
    expect(bloqueio('intervalos', joelho)).toBeNull()
  })
})

describe('F37.2 programa personalizado', () => {
  const p: Personalizado = { sessoes: [{ dia: 3, modalidade: 'eliptica', minutos: 30, esforco: 6 }, { dia: 0, modalidade: 'caminhada', minutos: 40, esforco: 5 }], semanas: 4, progressaoPct: 10 }

  it('sobe a percentagem escolhida por semana, por ordem dos dias', () => {
    const s = semanasPersonalizado(p)
    expect(s).toHaveLength(4)
    expect(s.map((x) => x.map((y) => y.minutos))).toEqual([[40, 30], [44, 33], [48, 36], [53, 40]])
    expect(s[0]![0]!.modalidade).toBe('caminhada')
  })

  it('valida dias, minutos, semanas e progressão (no máximo 10 %)', () => {
    expect(validarPersonalizado(p)).toBeNull()
    expect(validarPersonalizado({ ...p, sessoes: [] })).toBe('sem-sessoes')
    expect(validarPersonalizado({ ...p, sessoes: [p.sessoes[0]!, p.sessoes[0]!] })).toBe('dia-repetido')
    expect(validarPersonalizado({ ...p, sessoes: [{ ...p.sessoes[0]!, minutos: 2 }] })).toBe('minutos')
    expect(validarPersonalizado({ ...p, semanas: 20 })).toBe('semanas')
    expect(validarPersonalizado({ ...p, progressaoPct: 15 })).toBe('progressao')
  })

  it('avisa quando o vigoroso passa de 300 min por semana', () => {
    expect(avisosPersonalizado(p)).toEqual([])
    const muito: Personalizado = { sessoes: [0, 1, 2, 3, 4].map((dia) => ({ dia, modalidade: 'corrida' as const, minutos: 70, esforco: 8 })), semanas: 2, progressaoPct: 0 }
    expect(avisosPersonalizado(muito)[0]).toContain('350 min')
  })
})

describe('F37.4 progresso do programa', () => {
  const reg = (id: string, dia: string): RegistoCardio => ({ id, data: `${dia}T10:00:00`, modalidade: 'caminhada', minutos: 20, esforco: 5 })
  const ativo = { id: 'caminhar' as const, inicio: '2026-11-02' }

  it('conta a semana a partir do início e as sessões registadas nessa semana', () => {
    expect(progresso(ativo, [], '2026-11-02')).toMatchObject({ semana: 1, total: 8, feitas: 0, terminado: false })
    const p = progresso(ativo, [reg('a', '2026-11-01'), reg('b', '2026-11-03'), reg('c', '2026-11-08'), reg('d', '2026-11-09')], '2026-11-08')
    expect(p).toMatchObject({ semana: 1, feitas: 2 })
    expect(p.proxima?.minutos).toBe(20)
    expect(progresso(ativo, [reg('d', '2026-11-09')], '2026-11-09')).toMatchObject({ semana: 2, feitas: 1 })
  })

  it('sem próxima sessão quando a semana está cumprida, e terminado depois da última semana', () => {
    const tres = ['2026-11-02', '2026-11-04', '2026-11-06'].map((d, i) => reg(String(i), d))
    expect(progresso(ativo, tres, '2026-11-07').proxima).toBeUndefined()
    expect(progresso(ativo, [], '2026-12-28')).toMatchObject({ semana: 8, terminado: true })
  })
})
