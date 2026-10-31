import { describe, expect, it } from 'vitest'
import { estadoBloco, proximaMudanca } from './blocos'
import { lerCopia } from './copia'
import { catalogo, perfilExemplo } from './fixtures'
import { avisosAnamnese, gerarPlano, planoNoIdioma, prescricaoEfetiva } from './plano'
import { mover, noPlano, planoDoRascunho, prescricaoPadrao, rascunhoDe, validarRascunho, type Rascunho } from './planoProprio'

const agora = '2026-10-01T08:00:00.000Z'
const gerado = gerarPlano(perfilExemplo, catalogo, { id: 'p1', agora })
const hoje = '2026-10-31T09:00:00.000Z'
const comTreinos = (r: Rascunho, f: (tr: Rascunho['treinos']) => Rascunho['treinos']): Rascunho => ({ ...r, treinos: f(r.treinos) })

describe('F27 plano próprio', () => {
  it('F27.1 o rascunho parte do plano atual, sem rotação, com readaptação e descarga ligadas', () => {
    const r = rascunhoDe(gerado, perfilExemplo.objetivo, 1)
    expect(r.treinos.map((x) => x.nome)).toEqual(gerado.treinos.map((x) => x.nome))
    expect(r.treinos.flatMap((x) => x.prescricoes).some((p) => p.alternativas)).toBe(false)
    expect(r).toMatchObject({ semanasReadaptacao: 2, descarga: true, semanasBloco: gerado.semanasBloco, recomecar: false })
    // No bloco 2, os exercícios com rotação são os do bloco 2.
    const comRotacao = gerado.treinos.flatMap((x) => x.prescricoes).find((p) => p.alternativas)!
    const semanaBloco2 = 2 + gerado.semanasBloco! + 1
    const r2 = rascunhoDe(gerado, perfilExemplo.objetivo, semanaBloco2)
    expect(r2.treinos.flatMap((x) => x.prescricoes).find((p) => p.id === comRotacao.id)?.exercicioId).toBe(comRotacao.alternativas![1])
  })

  it('F27.2 um exercício acabado de juntar vem com os valores das regras do objetivo', () => {
    const supino = catalogo.get('supino-halteres-neutro')!
    expect(prescricaoPadrao(supino, 'hipertrofia', 'x')).toEqual({ id: 'x', exercicioId: supino.id, series: 3, faixa: [6, 10], rir: [1, 3], descansoSeg: 120 })
    expect(prescricaoPadrao(supino, 'forca', 'x').faixa).toEqual([3, 6])
    const prancha = [...catalogo.values()].find((e) => e.medida === 'segundos')!
    expect(prescricaoPadrao(prancha, 'saude', 'x').faixa).toEqual(prancha.faixaFixa ?? [20, 45])
  })

  it('F27.2 validação: treinos com nome e exercícios, faixas e RIR coerentes', () => {
    const r = rascunhoDe(gerado, perfilExemplo.objetivo, 1)
    expect(validarRascunho(r, catalogo)).toBeNull()
    expect(validarRascunho({ ...r, treinos: [] }, catalogo)).toBe('Junta pelo menos um treino.')
    expect(validarRascunho(comTreinos(r, (ts) => [{ ...ts[0]!, nome: ' ' }]), catalogo)).toBe('Dá um nome a cada treino.')
    expect(validarRascunho(comTreinos(r, (ts) => [{ ...ts[0]!, prescricoes: [] }]), catalogo)).toMatch(/não tem exercícios/)
    const p0 = r.treinos[0]!.prescricoes[0]!
    const com = (p: Partial<typeof p0>) => comTreinos(r, (ts) => [{ ...ts[0]!, prescricoes: [{ ...p0, ...p }] }])
    expect(validarRascunho(com({ faixa: [12, 8] }), catalogo)).toMatch(/mínimas e máximas/)
    expect(validarRascunho(com({ rir: [3, 1] }), catalogo)).toMatch(/RIR/)
    expect(validarRascunho(com({ series: 0 }), catalogo)).toMatch(/séries/)
    expect(validarRascunho(com({ exercicioId: 'nao-existe' }), catalogo)).toMatch(/já não existe/)
  })

  it('F27 o plano próprio mantém o id e a contagem das semanas, a menos que se recomece', () => {
    const r = rascunhoDe(gerado, perfilExemplo.objetivo, 1)
    const p = planoDoRascunho(r, gerado, hoje)
    expect(p).toMatchObject({ id: 'p1', criadoEm: agora, proprio: true, semanasReadaptacao: 2, descarga: true })
    expect(planoDoRascunho({ ...r, recomecar: true }, gerado, hoje).criadoEm).toBe(hoje)
    expect(lerCopia({ formato: 'app-treino', versao: 1, exportadoEm: hoje, anamnese: null, plano: p, sessoes: [], medicoes: [], videos: {} }).plano).toEqual(p)
  })

  it('F27.3 readaptação e descarga personalizáveis', () => {
    const r = rascunhoDe(gerado, perfilExemplo.objetivo, 1)
    const tres = planoDoRascunho({ ...r, semanasReadaptacao: 3, semanasBloco: 4 }, gerado, hoje)
    expect(estadoBloco(tres, 3).fase).toBe('readaptacao')
    expect(estadoBloco(tres, 4)).toMatchObject({ fase: 'progressao', bloco: 1, semanaNoBloco: 1 })
    expect(estadoBloco(tres, 7).fase).toBe('descarga')
    const semNada = planoDoRascunho({ ...r, semanasReadaptacao: 0, descarga: false, semanasBloco: 4 }, gerado, hoje)
    expect(semNada.readaptacao).toBe(false)
    expect(estadoBloco(semNada, 1)).toMatchObject({ fase: 'progressao', bloco: 1, semanaNoBloco: 1 })
    expect(estadoBloco(semNada, 4).fase).toBe('progressao')
    expect(proximaMudanca(semNada, 2)).toMatchObject({ tipo: 'novo-bloco', semana: 5, bloco: 2 })
    const p = semNada.treinos[0]!.prescricoes[0]!
    expect(prescricaoEfetiva(p, semNada, 4).series).toBe(p.series)
  })

  it('F27.4 o plano próprio não é traduzido nem gerado de novo; os avisos da pessoa não falam do plano conservador', () => {
    const r = rascunhoDe(gerado, perfilExemplo.objetivo, 1)
    const p = planoDoRascunho(comTreinos(r, (ts) => ts.map((x, i) => ({ ...x, nome: `O meu treino ${i + 1}` }))), gerado, hoje)
    const a = { ...perfilExemplo, parq: [true, false, false, false, false, false, false] }
    const noIdioma = planoNoIdioma(p, a, catalogo)
    expect(noIdioma.treinos).toBe(p.treinos)
    expect(noIdioma.avisos).toEqual(avisosAnamnese(a, true))
    expect(noIdioma.avisos.join(' ')).not.toMatch(/conservador/)
    expect(avisosAnamnese(a).join(' ')).toMatch(/conservador/)
  })

  it('F27.5 um exercício está no plano se uma prescrição o usa; mover não sai da lista', () => {
    expect(noPlano(gerado, gerado.treinos[0]!.prescricoes[0]!.exercicioId)).toBe(true)
    expect(noPlano(gerado, 'proprio-x')).toBe(false)
    expect(mover([1, 2, 3], 0, -1)).toEqual([1, 2, 3])
    expect(mover([1, 2, 3], 0, 1)).toEqual([2, 1, 3])
  })
})
