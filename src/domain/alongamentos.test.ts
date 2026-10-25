import { describe, expect, it } from 'vitest'
import dados from '../catalog/alongamentos.json'
import { alongamentoDoTreino, alongamentosDoGrupo, carregarAlongamentos, duracaoMin, duracaoSeg, exerciciosParaAlongar, lembreteAlongamento } from './alongamentos'
import { catalogo, perfilExemplo } from './fixtures'
import { gerarPlano } from './plano'
import { GRUPOS_MUSCULARES, type Anamnese, type Sessao } from './types'

const cat = carregarAlongamentos(dados)
const semDores: Anamnese = { ...perfilExemplo, restricoes: [] }

describe('F19 alongamentos', () => {
  it('catálogo válido, com pelo menos 2 alongamentos por grupo muscular', () => {
    for (const g of GRUPOS_MUSCULARES) expect([...cat.values()].filter((a) => a.grupo === g).length, g).toBeGreaterThanOrEqual(2)
    expect(() => carregarAlongamentos([{ id: 'x' }])).toThrow()
  })

  it('dose de 2 × 30 s por lado, mais a mudança de posição', () => {
    expect(duracaoSeg(cat.get('ombro-braco-cruzado')!)).toBe(2 * 30 * 2 + 10)
    expect(duracaoSeg(cat.get('postura-crianca')!)).toBe(2 * 30 + 10)
    expect(duracaoMin([cat.get('postura-crianca')!])).toBe(1)
  })

  it('do treino: um alongamento por grupo principal, pela ordem dos exercícios, sem repetir grupos', () => {
    const r = alongamentoDoTreino(['supino-halteres-neutro', 'remada-cabo-sentado', 'supino-inclinado-halteres', 'triceps-corda'], catalogo, cat, semDores)
    expect(r.map((a) => a.grupo)).toEqual(['peito', 'costas', 'triceps'])
  })

  it('no máximo 6 grupos', () => {
    const ids = ['supino-barra', 'puxada-frente', 'desenvolvimento-halteres', 'curl-halteres', 'triceps-corda', 'leg-press', 'gemeos-pe']
    expect(alongamentoDoTreino(ids, catalogo, cat, semDores)).toHaveLength(6)
  })

  it('restrições: zona com dor tira os alongamentos contraindicados', () => {
    const ombro = alongamentosDoGrupo('peito', cat, perfilExemplo)
    expect(ombro.every((a) => !a.contraindicacoes.includes('ombro'))).toBe(true)
    expect(alongamentosDoGrupo('peito', cat, semDores).length).toBeGreaterThan(ombro.length)
  })

  it('gravidez no 2.º e 3.º trimestre: sem alongamentos deitado de costas ou de barriga', () => {
    const gravida: Anamnese = { ...semDores, sexo: 'feminino', gravidez: 'gravida-2t3t' }
    const core = alongamentosDoGrupo('core', cat, gravida)
    expect(core.length).toBeGreaterThan(0)
    expect(core.every((a) => a.posicao !== 'deitado')).toBe(true)
    expect(alongamentosDoGrupo('posteriores', cat, gravida).map((a) => a.id)).not.toContain('posteriores-deitado-toalha')
  })

  describe('lembrete no fim do treino', () => {
    const sessao = (id: string, fim: string | undefined, alongamento?: Sessao['alongamento']): Sessao => ({
      id, planoId: 'p', treinoId: 'superior-a', inicio: '2026-10-25T08:00:00.000Z', ...(fim ? { fim } : {}), ...(alongamento ? { alongamento } : {}),
      exercicios: [{ prescricaoId: 'x', exercicioId: 'supino-halteres-neutro', series: [{ carga: 20, reps: 10 }] }, { prescricaoId: 'y', exercicioId: 'leg-press', series: [], saltado: true }],
    })
    const AGORA = '2026-10-25T10:00:00.000Z'

    it('aparece depois de terminar um treino e desaparece com «Feito» ou «Hoje não»', () => {
      expect(lembreteAlongamento([sessao('a', '2026-10-25T09:00:00.000Z')], AGORA)?.id).toBe('a')
      expect(lembreteAlongamento([sessao('a', '2026-10-25T09:00:00.000Z', 'feito')], AGORA)).toBeUndefined()
      expect(lembreteAlongamento([sessao('a', '2026-10-25T09:00:00.000Z', 'dispensado')], AGORA)).toBeUndefined()
    })

    it('só para treinos terminados nas últimas 12 horas', () => {
      expect(lembreteAlongamento([sessao('a', undefined)], AGORA)).toBeUndefined()
      expect(lembreteAlongamento([sessao('a', '2026-10-24T21:00:00.000Z')], AGORA)).toBeUndefined()
      expect(lembreteAlongamento([sessao('a', '2026-10-24T23:00:00.000Z')], AGORA)?.id).toBe('a')
    })

    it('o alongamento do treino usa os exercícios feitos no treino recente; sem treino recente, o próximo', () => {
      const plano = gerarPlano(perfilExemplo, catalogo, { id: 'p', agora: '2026-10-01T08:00:00.000Z' })
      const r = exerciciosParaAlongar(plano, [sessao('a', '2026-10-25T09:00:00.000Z')], AGORA, 'inferior-a')
      expect(r.exercicioIds).toEqual(['supino-halteres-neutro'])
      expect(r.sessao?.id).toBe('a')
      const p = exerciciosParaAlongar(plano, [], AGORA, 'inferior-a')
      expect(p.treinoNome).toBe(plano.treinos.find((t) => t.id === 'inferior-a')!.nome)
      expect(p.sessao).toBeUndefined()
    })
  })
})
