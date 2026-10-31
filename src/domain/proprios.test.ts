import { describe, expect, it } from 'vitest'
import { tiposCarga } from './carga'
import { lerCopia } from './copia'
import { catalogo } from './fixtures'
import { apagarProprio, guardarProprio, juntarProprios, lerProprios, novoIdProprio, paraExercicio, substitutosProprios, type ExercicioProprio } from './proprios'
import { sugerir } from './progressao'
import { volumeSemanal } from './relatorios'
import type { Sessao } from './types'

const remada: ExercicioProprio = {
  id: novoIdProprio('A1B2'),
  nome: 'Remada no banco do meu ginásio',
  medida: 'reps',
  tipoCarga: 'halter',
  grupoPrincipal: 'costas',
  gruposSecundarios: ['biceps'],
  comoFazer: ['Costas direitas', 'Puxar o cotovelo para trás'],
  video: 'https://www.youtube.com/watch?v=abcdefghijk',
}
const pranchaBola: ExercicioProprio = { id: novoIdProprio('b2'), nome: 'Prancha na bola', medida: 'segundos', tipoCarga: 'corporal', grupoPrincipal: 'core', gruposSecundarios: [], comoFazer: [] }

const sessao = (exercicioId: string, series = [{ carga: 16, reps: 10 }]): Sessao => ({
  id: 's1', planoId: 'p1', treinoId: 't1', inicio: '2026-10-20T10:00:00.000Z', fim: '2026-10-20T11:00:00.000Z',
  exercicios: [{ prescricaoId: 'x', exercicioId, series }],
})

describe('F26 exercícios personalizados', () => {
  it('F26.1 o id é sempre «proprio-…» e o incremento vem da forma de contar', () => {
    expect(remada.id).toBe('proprio-a1b2')
    expect(paraExercicio(remada).incrementoKg).toBe(2)
    expect(paraExercicio({ ...remada, tipoCarga: 'total' }).incrementoKg).toBe(2.5)
    expect(paraExercicio({ ...remada, tipoCarga: 'maquina' }).incrementoKg).toBe(2.5)
    expect(paraExercicio({ ...remada, incrementoKg: 1 }).incrementoKg).toBe(1)
    expect(paraExercicio({ ...remada, tipoCarga: 'corporal', incrementoKg: 5 }).incrementoKg).toBe(0)
  })

  it('F26.1 a forma de contar escolhida é a única que o exercício admite', () => {
    expect(tiposCarga(paraExercicio(remada))).toEqual(['halter'])
    expect(tiposCarga(paraExercicio({ ...remada, tipoCarga: 'total' }))).toEqual(['total'])
    expect(tiposCarga(paraExercicio(pranchaBola))).toEqual([])
  })

  it('F26.1 nome obrigatório e link de vídeo só do YouTube ou do Vimeo', () => {
    expect(() => guardarProprio([], { ...remada, nome: '  ' })).toThrow()
    expect(() => guardarProprio([], { ...remada, video: 'https://exemplo.com/v.mp4' })).toThrow()
    expect(guardarProprio([], remada)).toHaveLength(1)
    expect(guardarProprio([remada], { ...remada, nome: 'Remada' })).toEqual([{ ...remada, nome: 'Remada' }])
  })

  it('F26.2 juntam-se ao catálogo sem tradução e sem substituir exercícios do catálogo', () => {
    const junto = juntarProprios(catalogo, [remada])
    expect(junto.size).toBe(catalogo.size + 1)
    expect(junto.get(remada.id)?.nome).toBe('Remada no banco do meu ginásio')
    expect(junto.get(remada.id)?.pontosChave).toEqual(remada.comoFazer)
    expect(juntarProprios(catalogo, [])).toBe(catalogo)
  })

  it('F26.2 contam no volume semanal (principal 1 série, secundários 0,5)', () => {
    const v = volumeSemanal([sessao(remada.id, [{ carga: 16, reps: 10 }, { carga: 16, reps: 9 }])], juntarProprios(catalogo, [remada]), new Date('2026-10-19T00:00:00Z'), new Date('2026-10-26T00:00:00Z'))
    expect(v.costas).toBe(2)
    expect(v.biceps).toBe(1)
  })

  it('F26.2 a sugestão de carga usa o incremento do exercício próprio', () => {
    const p = { id: 'x', exercicioId: remada.id, series: 2, faixa: [8, 12] as [number, number], rir: [1, 3] as [number, number], descansoSeg: 90 }
    const topo = [{ carga: 30, reps: 12, rir: 2 }, { carga: 30, reps: 12, rir: 2 }]
    const r = sugerir({ prescricao: p, exercicio: paraExercicio(remada), historico: [{ prescricaoId: 'x', exercicioId: remada.id, series: topo }], readaptacao: false })
    expect(r.carga).toBe(32)
  })

  it('F26.3 substitutos: mesmo grupo principal e mesma medida, sem arquivados', () => {
    const outra = { ...remada, id: novoIdProprio('c3'), medida: 'segundos' as const }
    const arquivada = { ...remada, id: novoIdProprio('d4'), arquivado: true }
    const remadaCatalogo = catalogo.get('remada-halter-unilateral')!
    expect(substitutosProprios([remada, outra, arquivada, pranchaBola], remadaCatalogo)).toEqual([remada.id])
    expect(substitutosProprios([remada], paraExercicio(remada))).toEqual([])
  })

  it('F26.4 sem registos apaga; com registos arquiva e o nome continua no catálogo', () => {
    expect(apagarProprio([remada, pranchaBola], remada.id, [])).toEqual([pranchaBola])
    expect(apagarProprio([remada], remada.id, [sessao(remada.id, [])])).toEqual([])
    // F27.5: no plano, arquiva mesmo sem registos.
    expect(apagarProprio([remada], remada.id, [], true)).toEqual([{ ...remada, arquivado: true }])
    const arquivados = apagarProprio([remada], remada.id, [sessao(remada.id)])
    expect(arquivados).toEqual([{ ...remada, arquivado: true }])
    expect(juntarProprios(catalogo, arquivados).get(remada.id)?.nome).toBe(remada.nome)
  })

  it('F26.5 entram na cópia; cópias sem eles continuam válidas; entradas inválidas são ignoradas na leitura', () => {
    const base = { formato: 'app-treino', versao: 1, exportadoEm: '2026-10-31T10:00:00.000Z', anamnese: null, plano: null, sessoes: [], medicoes: [], videos: {} }
    expect(lerCopia(base).exerciciosProprios).toBeUndefined()
    expect(lerCopia({ ...base, exerciciosProprios: [remada] }).exerciciosProprios).toEqual([remada])
    expect(() => lerCopia({ ...base, exerciciosProprios: [{ ...remada, id: 'supino-barra' }] })).toThrow()
    expect(lerProprios([remada, { id: 'x' }, 'lixo'])).toEqual([remada])
    expect(lerProprios(undefined)).toEqual([])
  })
})
