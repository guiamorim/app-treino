import { describe, expect, it } from 'vitest'
import { EQUIPAMENTO_LEGADO, EQUIPAMENTOS_ESCOLHA, equipamentoDisponivel, gerarPlano, resumoEquipamento } from './plano'
import { sugerir } from './progressao'
import { lerCopia } from './copia'
import { catalogo, perfilExemplo } from './fixtures'
import type { Anamnese, Equipamento, Plano, Prescricao, Serie } from './types'

const opts = { id: 'p', agora: '2026-10-31T10:00:00.000Z' }
const comLista = (equipamentos: Equipamento[], a: Partial<Anamnese> = {}) =>
  gerarPlano({ ...perfilExemplo, restricoes: [], diasPorSemana: 4, equipamento: resumoEquipamento(equipamentos), equipamentos, ...a }, catalogo, opts)
const ids = (p: Plano) => p.treinos.flatMap((t) => t.prescricoes.map((x) => x.exercicioId))

describe('F28 lista de equipamento', () => {
  it('F28.1 o peso do corpo conta sempre e a lista manda sobre o resumo', () => {
    expect(equipamentoDisponivel({ equipamento: 'ginasio', equipamentos: [] })).toEqual(['peso-corporal'])
    expect(equipamentoDisponivel({ equipamento: 'casa', equipamentos: ['barra-fixa'] })).toEqual(['peso-corporal', 'barra-fixa'])
  })

  it('F28.3 respostas antigas convertem-se: ginásio = tudo, só halteres = halteres, casa = nada', () => {
    expect(equipamentoDisponivel({ equipamento: 'ginasio' })).toEqual(['peso-corporal', ...EQUIPAMENTOS_ESCOLHA])
    expect(equipamentoDisponivel({ equipamento: 'halteres' })).toEqual(['peso-corporal', 'halteres'])
    expect(equipamentoDisponivel({ equipamento: 'casa' })).toEqual(['peso-corporal'])
    // O mesmo plano antes e depois da conversão.
    for (const equipamento of ['ginasio', 'halteres', 'casa'] as const) {
      const antigo = gerarPlano({ ...perfilExemplo, equipamento }, catalogo, opts)
      const novo = gerarPlano({ ...perfilExemplo, equipamento, equipamentos: EQUIPAMENTO_LEGADO[equipamento] }, catalogo, opts)
      expect(novo).toEqual(antigo)
    }
  })

  it('F28.3 o resumo guardado segue a lista', () => {
    expect(resumoEquipamento([...EQUIPAMENTOS_ESCOLHA])).toBe('ginasio')
    expect(resumoEquipamento(['halteres', 'barra-fixa'])).toBe('halteres')
    expect(resumoEquipamento(['barra-fixa', 'elasticos'])).toBe('casa')
  })

  it('F28.4 o plano só usa equipamento marcado', () => {
    for (const lista of [['barra-fixa'], ['elasticos', 'caneleiras'], ['halteres', 'barra-fixa'], ['barra', 'halteres']] as Equipamento[][]) {
      for (const id of ids(comLista(lista))) {
        const ex = catalogo.get(id)!
        expect(ex.equipamento.some((q) => q === 'peso-corporal' || lista.includes(q)), `${lista} ${id}`).toBe(true)
      }
    }
  })

  it('F28.4 com barra fixa há elevações; com elásticos há puxada, face pull e curl', () => {
    expect(ids(comLista(['barra-fixa']))).toContain('elevacoes')
    const elasticos = ids(comLista(['elasticos']))
    for (const id of ['puxada-elastico', 'face-pull-elastico', 'curl-elastico']) expect(elasticos).toContain(id)
  })

  it('F28.5 avisos seguem a lista', () => {
    const costas = (p: Plano) => p.avisos.some((x) => x.includes('barra fixa'))
    expect(costas(comLista([]))).toBe(true)
    expect(costas(comLista(['caneleiras']))).toBe(true)
    expect(costas(comLista(['barra-fixa']))).toBe(false)
    expect(costas(comLista(['elasticos']))).toBe(false)
    const forca = (p: Plano) => p.avisos.some((x) => x.includes('força fica limitado'))
    expect(forca(comLista(['halteres', 'barra-fixa'], { objetivo: 'forca' }))).toBe(true)
    expect(forca(comLista(['barra'], { objetivo: 'forca' }))).toBe(false)
  })

  it('F28.2 a sugestão não passa do halter mais pesado', () => {
    const ex = catalogo.get('supino-halteres-neutro')!
    const pr: Prescricao = { id: 'x', exercicioId: ex.id, series: 2, faixa: [8, 12], rir: [1, 3], descansoSeg: 90 }
    const s = (carga: number): Serie => ({ carga, reps: 12, rir: 2 })
    const historico = [{ prescricaoId: 'x', exercicioId: ex.id, series: [s(20), s(20)] }]
    const r = sugerir({ prescricao: pr, exercicio: ex, historico, readaptacao: false, cargaMaxKg: 20 })
    expect(r).toMatchObject({ carga: 20, reps: 12, subiu: false })
    expect(r.motivo).toMatch(/halter mais pesado/)
    expect(sugerir({ prescricao: pr, exercicio: ex, historico, readaptacao: false, cargaMaxKg: 24 })).toMatchObject({ carga: 22, subiu: true })
  })

  it('F28.6 a cópia guarda a lista e o halter mais pesado, e rejeita equipamento desconhecido', () => {
    const base = { formato: 'app-treino', versao: 1, exportadoEm: opts.agora, plano: null, sessoes: [], medicoes: [], videos: {} }
    const anamnese = { ...perfilExemplo, equipamentos: ['halteres', 'barra-fixa'], halteresMaxKg: 22.5 }
    expect(lerCopia({ ...base, anamnese }).anamnese).toEqual(anamnese)
    expect(() => lerCopia({ ...base, anamnese: { ...anamnese, equipamentos: ['trampolim'] } })).toThrow()
  })
})
