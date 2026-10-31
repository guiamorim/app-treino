import { describe, expect, it } from 'vitest'
import { anamneseEmFerias, feriasAtivas, planoEmFerias, validarFerias, type Ferias } from './ferias'
import { lerCopia } from './copia'
import { FAIXA_CORPORAL, gerarPlano, motivoIncompatibilidade } from './plano'
import { catalogo, perfilExemplo } from './fixtures'
import type { Anamnese } from './types'

const a: Anamnese = { ...perfilExemplo, restricoes: [], diasPorSemana: 4 }
const plano = gerarPlano(a, catalogo, { id: 'p', agora: '2026-10-01T10:00:00.000Z' })
const casa: Ferias = { inicio: '2026-11-01', fim: '2026-11-14', equipamentos: [] }
const ids = (p: typeof plano) => p.treinos.flatMap((t) => t.prescricoes.map((x) => x.exercicioId))

describe('F29 modo férias', () => {
  it('F29.1 está ativo entre o início e o fim, inclusive', () => {
    expect(feriasAtivas(casa, '2026-10-31')).toBe(false)
    expect(feriasAtivas(casa, '2026-11-01')).toBe(true)
    expect(feriasAtivas(casa, '2026-11-14')).toBe(true)
    expect(feriasAtivas(casa, '2026-11-15')).toBe(false)
    expect(feriasAtivas(undefined, '2026-11-01')).toBe(false)
  })

  it('F29.1 valida as datas: fim depois do início, no máximo 8 semanas', () => {
    expect(validarFerias(casa)).toBeNull()
    expect(validarFerias({ inicio: '2026-11-10', fim: '2026-11-09' })).toMatch(/igual ou posterior/)
    expect(validarFerias({ inicio: '2026-11-01', fim: '2026-12-26' })).toBeNull()
    expect(validarFerias({ inicio: '2026-11-01', fim: '2026-12-27' })).toMatch(/8 semanas/)
    expect(validarFerias({ inicio: '', fim: '2026-11-09' })).toMatch(/data de início/)
  })

  it('F29.2 cada exercício passa a um compatível com o equipamento das férias, sem repetir no treino', () => {
    const aF = anamneseEmFerias(a, casa)
    const f = planoEmFerias(plano, a, casa, catalogo, 6)
    for (const id of ids(f)) expect(motivoIncompatibilidade(catalogo.get(id)!, aF), id).toBeNull()
    for (const t of f.treinos) expect(new Set(t.prescricoes.map((x) => x.exercicioId)).size).toBe(t.prescricoes.length)
    // A maior parte do treino continua lá.
    expect(ids(f).length).toBeGreaterThanOrEqual(ids(plano).length - 6)
  })

  it('F29.2 as prescrições mantêm o id e as séries; a faixa passa à de peso corporal e a nota diz o que substitui', () => {
    const f = planoEmFerias(plano, a, casa, catalogo, 6)
    const original = plano.treinos[0]!.prescricoes[0]!
    const nova = f.treinos[0]!.prescricoes.find((x) => x.id === original.id)!
    expect(nova.exercicioId).toBe('flexoes')
    expect(nova.series).toBe(original.series)
    expect(nova.faixa).toEqual(FAIXA_CORPORAL.composto)
    expect(nova.nota).toMatch(/Férias: substitui «Supino reto com barra»/)
    expect(nova.alternativas).toBeUndefined()
  })

  it('F29.2 o plano guardado não muda e o aviso diz até quando', () => {
    const copia = structuredClone(plano)
    const f = planoEmFerias(plano, a, casa, catalogo, 6)
    expect(plano).toEqual(copia)
    expect(f.id).toBe(plano.id)
    expect(f.avisos[0]).toMatch(/Modo férias até 2026-11-14/)
  })

  it('F29.2 com o equipamento do ginásio nas férias, os exercícios não mudam', () => {
    const f = planoEmFerias(plano, a, { ...casa, equipamentos: ['barra', 'halteres', 'barra-fixa', 'paralelas', 'maquina', 'cabo', 'elasticos', 'caneleiras'] }, catalogo, 1)
    expect(ids(f)).toEqual(ids(plano))
  })

  it('F29.2 respeita as restrições da anamnese nas férias', () => {
    const comOmbro: Anamnese = { ...a, restricoes: [{ area: 'ombro', intensidade: 4, avaliadaPorProfissional: true }] }
    const p = gerarPlano(comOmbro, catalogo, { id: 'p', agora: '2026-10-01T10:00:00.000Z' })
    for (const id of ids(planoEmFerias(p, comOmbro, casa, catalogo, 6))) expect(catalogo.get(id)!.contraindicacoes, id).not.toContain('ombro')
  })

  it('F29.4 a cópia guarda as férias e rejeita datas mal escritas', () => {
    const base = { formato: 'app-treino', versao: 1, exportadoEm: '2026-10-31T10:00:00.000Z', anamnese: null, plano: null, sessoes: [], medicoes: [], videos: {} }
    expect(lerCopia({ ...base, ferias: casa }).ferias).toEqual(casa)
    expect(() => lerCopia({ ...base, ferias: { ...casa, fim: '14/11/2026' } })).toThrow()
  })
})
