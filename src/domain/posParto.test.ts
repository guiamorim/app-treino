import { describe, expect, it } from 'vitest'
import { lerCopia } from './copia'
import { catalogo, perfilExemplo } from './fixtures'
import { gerarPlano, motivoIncompatibilidade } from './plano'
import { bloqueio } from './programasCardio'
import { sugerir } from './progressao'
import {
  estadoFase, faseDoCalendario, passouTeste, planoPosParto, posPartoAtivo, semanasDesde, TESTES_IMPACTO, treinosDaFase, ultimosSintomas,
  type EstadoPosParto, type PosParto,
} from './posParto'
import type { Anamnese, Sessao } from './types'

const parto: PosParto = { dataParto: '2026-08-01', tipoParto: 'vaginal', autorizacaoMedica: true, objetivo: 'forca', sintomas: false, atualizadoEm: '2026-08-01T10:00:00.000Z' }
const a = { ...perfilExemplo, sexo: 'feminino', gravidez: 'pos-parto', restricoes: [], posParto: parto } as Anamnese & { posParto: PosParto }
const dia = (semanas: number) => new Date(Date.parse('2026-08-01T12:00:00Z') + semanas * 7 * 86_400_000).toISOString().slice(0, 10)
const sessao = (inicio: string, sintomasPosParto?: boolean): Sessao => ({ id: inicio, planoId: 'p', treinoId: 't', inicio, exercicios: [], ...(sintomasPosParto === undefined ? {} : { sintomasPosParto }) })
const passou: EstadoPosParto = { testeImpacto: { data: dia(13), resultados: TESTES_IMPACTO.map(() => true) } }

describe('F38.1 dados do pós-parto', () => {
  it('só fica ativo com sexo feminino, pós-parto e os dados do parto', () => {
    expect(posPartoAtivo(a)).toBe(true)
    expect(posPartoAtivo({ ...a, posParto: undefined })).toBe(false)
    expect(posPartoAtivo({ ...a, gravidez: 'nao' })).toBe(false)
    expect(posPartoAtivo({ ...a, sexo: 'masculino' })).toBe(false)
  })
})

describe('F38.2 fases pelas semanas desde o parto', () => {
  it('conta semanas completas e muda de fase às 2, 6 e 12 semanas', () => {
    expect(semanasDesde(parto.dataParto, dia(0))).toBe(0)
    expect(semanasDesde(parto.dataParto, '2026-08-07')).toBe(0)
    expect(semanasDesde(parto.dataParto, '2026-08-08')).toBe(1)
    expect([1, 2, 5, 6, 11, 12, 52, 150].map((s) => faseDoCalendario(parto, dia(s)))).toEqual(['f0', 'f1', 'f1', 'f2', 'f2', 'f3', 'f3', 'f3'])
  })

  it('na cesariana, as fases 3 e 4 começam 2 semanas mais tarde', () => {
    const ces: PosParto = { ...parto, tipoParto: 'cesariana' }
    expect([1, 2, 7, 8, 13, 14].map((s) => faseDoCalendario(ces, dia(s)))).toEqual(['f0', 'f1', 'f1', 'f2', 'f2', 'f3'])
  })

  it('não tem limite de tempo: anos depois continua na fase 4 até passar o teste de impacto', () => {
    expect(estadoFase(parto, dia(200), [], undefined).fase).toBe('f3')
  })
})

describe('F38.3 treinos de cada fase', () => {
  const plano = gerarPlano(a, catalogo, { id: 'p', agora: '2026-08-01T10:00:00.000Z' })

  it('as fases 1 a 3 usam os treinos da fase, com caminhada, e o plano guardado não muda', () => {
    const f0 = planoPosParto(plano, a, estadoFase(parto, dia(1), [], undefined), catalogo)
    expect(f0.treinos.map((t) => t.id)).toEqual(['pos-parto-f0'])
    expect(f0.treinos[0]!.prescricoes[0]!.exercicioId).toBe('pavimento-pelvico-longas')
    expect(f0.treinos[0]!.cardioMin).toBe(10)
    expect(planoPosParto(plano, a, estadoFase(parto, dia(3), [], undefined), catalogo).treinos.map((t) => t.id)).toEqual(['pos-parto-f1-a', 'pos-parto-f1-b'])
    expect(planoPosParto(plano, a, estadoFase(parto, dia(8), [], undefined), catalogo).treinos.map((t) => t.cardioMin)).toEqual([20, 20])
    expect(plano.treinos[0]!.id).not.toMatch(/^pos-parto/)
  })

  it('todos os exercícios das fases existem, sem repetidos no mesmo treino, e com esforço leve (RIR 3–4)', () => {
    for (const f of ['f0', 'f1', 'f2'] as const) {
      for (const t of treinosDaFase(f, a, catalogo)) {
        const ids = t.prescricoes.map((p) => p.exercicioId)
        expect(ids.length).toBeGreaterThanOrEqual(5)
        expect(new Set(ids).size).toBe(ids.length)
        for (const p of t.prescricoes) {
          expect(catalogo.get(p.exercicioId)).toBeDefined()
          expect(p.rir).toEqual([3, 4])
        }
      }
    }
  })

  it('respeita as restrições: com dor no ombro, a prancha lateral sai', () => {
    const ombro = { ...a, restricoes: [{ area: 'ombro' as const, intensidade: 4, avaliadaPorProfissional: true }] }
    for (const t of treinosDaFase('f2', ombro, catalogo)) {
      for (const p of t.prescricoes) expect(motivoIncompatibilidade(catalogo.get(p.exercicioId)!, ombro)).toBeNull()
    }
    expect(treinosDaFase('f2', ombro, catalogo).flatMap((t) => t.prescricoes.map((p) => p.exercicioId))).not.toContain('prancha-lateral-joelhos')
  })

  it('na fase 4, o plano de força abre cada treino com o pavimento pélvico', () => {
    const f3 = planoPosParto(plano, a, estadoFase(parto, dia(13), [], undefined), catalogo)
    expect(f3.treinos.map((t) => t.id)).toEqual(plano.treinos.map((t) => t.id))
    for (const t of f3.treinos) expect(t.prescricoes[0]!.exercicioId).toBe('pavimento-pelvico-longas')
  })

  it('no regresso, o plano fica normal, exceto com objetivo de core ou recuperação', () => {
    const regresso = estadoFase(parto, dia(13), [], passou)
    expect(regresso.fase).toBe('regresso')
    expect(planoPosParto(plano, a, regresso, catalogo)).toBe(plano)
    const core = { ...a, posParto: { ...parto, objetivo: 'core' as const } }
    expect(planoPosParto(plano, core, regresso, catalogo).treinos[0]!.prescricoes[0]!.exercicioId).toBe('pavimento-pelvico-longas')
  })
})

describe('F38.4 autorização médica e sintomas', () => {
  it('sem autorização médica, fica no máximo na fase 2', () => {
    const sem = { ...parto, autorizacaoMedica: false }
    expect(estadoFase(sem, dia(1), [], undefined)).toMatchObject({ fase: 'f0' })
    expect(estadoFase(sem, dia(10), [], undefined)).toMatchObject({ fase: 'f1', travada: 'autorizacao', podeTestar: false })
    expect(estadoFase(sem, dia(20), [], passou).fase).toBe('f1')
  })

  it('a resposta mais recente conta, seja da anamnese ou de um treino', () => {
    expect(ultimosSintomas(parto, []).sim).toBe(false)
    const sessoes = [sessao(`${dia(4)}T10:00:00.000Z`, true), sessao(`${dia(5)}T10:00:00.000Z`)]
    expect(ultimosSintomas(parto, sessoes)).toEqual({ data: dia(4), sim: true })
    expect(ultimosSintomas({ ...parto, atualizadoEm: `${dia(6)}T10:00:00.000Z` }, sessoes).sim).toBe(false)
  })

  it('com sintomas, a fase não passa da que tinha nesse dia; responder «não» volta à do calendário', () => {
    const comSintomas = [sessao(`${dia(5)}T10:00:00.000Z`, true)]
    expect(estadoFase(parto, dia(9), comSintomas, undefined)).toMatchObject({ fase: 'f1', travada: 'sintomas' })
    const depois = [...comSintomas, sessao(`${dia(9)}T10:00:00.000Z`, false)]
    expect(estadoFase(parto, dia(9), depois, undefined).fase).toBe('f2')
  })
})

describe('F38.6 teste de impacto', () => {
  it('passa só com os 7 testes feitos sem sintomas', () => {
    expect(passouTeste(passou)).toBe(true)
    expect(passouTeste({ testeImpacto: { data: dia(13), resultados: [true, true, true, true, true, true, false] } })).toBe(false)
    expect(passouTeste(undefined)).toBe(false)
  })

  it('só se pode fazer na fase 4 do calendário, sem sintomas', () => {
    expect(estadoFase(parto, dia(11), [], undefined).podeTestar).toBe(false)
    expect(estadoFase(parto, dia(12), [], undefined).podeTestar).toBe(true)
    expect(estadoFase(parto, dia(12), [sessao(`${dia(12)}T10:00:00.000Z`, true)], undefined).podeTestar).toBe(false)
  })

  it('sintomas depois de passar voltam à fase 4', () => {
    expect(estadoFase(parto, dia(16), [sessao(`${dia(15)}T10:00:00.000Z`, true)], passou).fase).toBe('f3')
  })

  it('a corrida e os intervalos abrem no regresso', () => {
    expect(bloqueio('correr-5km', a)).toContain('teste de impacto')
    expect(bloqueio('intervalos', a, true)).toBeNull()
    expect(bloqueio('correr-5km', { ...a, gravidez: 'gravida-1t' }, true)).toContain('gravidez')
  })
})

describe('F38.8 cópia de segurança', () => {
  it('a cópia de segurança aceita os dados do parto, a resposta dos sintomas e o estado dos testes', () => {
    const copia = {
      formato: 'app-treino', versao: 1, exportadoEm: '2026-11-01T10:00:00.000Z', anamnese: a, plano: null,
      sessoes: [sessao('2026-11-01T10:00:00.000Z', true)], medicoes: [], videos: {},
      posParto: { ...passou, diastase: [{ data: '2026-10-01', dedos: 2.5 }] },
    }
    expect(lerCopia(copia).posParto?.diastase?.[0]?.dedos).toBe(2.5)
    expect(() => lerCopia({ ...copia, posParto: { testeImpacto: { data: '2026-10-01', resultados: [true] } } })).toThrow()
    expect(() => lerCopia({ ...copia, anamnese: { ...a, posParto: { ...parto, tipoParto: 'outro' } } })).toThrow()
  })
})

describe('F38.3 primeira sugestão sem carga', () => {
  it('no pavimento pélvico não fala em carga', () => {
    const ex = catalogo.get('pavimento-pelvico-longas')!
    const r = sugerir({ prescricao: { id: 'x', exercicioId: ex.id, series: 2, faixa: [8, 10], rir: [3, 4], descansoSeg: 30 }, exercicio: ex, historico: [], readaptacao: false, descarga: false })
    expect(r.motivo).toBe('Primeira vez: faz 8 a 10 reps com boa técnica e para quando ainda conseguirias fazer mais 3 a 4.')
  })
})
