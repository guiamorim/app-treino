import { describe, expect, it } from 'vitest'
import { lerCopia, type Copia } from './copia'
import { escadaDe, escadas } from './escadas'
import { catalogo, perfilExemplo } from './fixtures'
import { DIVISOES_CALISTENIA, MODELOS_CALISTENIA } from './modelos'
import { gerarPlano, motivoIncompatibilidade } from './plano'
import { DIAS_POR_SEMANA, type Anamnese } from './types'

const cal: Anamnese = { ...perfilExemplo, restricoes: [], estilo: 'calistenia', equipamento: 'casa', equipamentos: ['barra-fixa', 'paralelas'] }
const gerar = (a: Anamnese) => gerarPlano(a, catalogo, { id: 'p', agora: '2026-11-01T08:00:00.000Z' })
const exercicios = (a: Anamnese) => gerar(a).treinos.flatMap((t) => t.prescricoes.map((p) => p.exercicioId))

describe('F31 calistenia', () => {
  it('F31.1 cada degrau das escadas tem nível, e só os degraus têm nível', () => {
    const degraus = new Set(escadas().flatMap((e) => e.degraus))
    for (const id of degraus) expect(catalogo.get(id)!.nivel, id).toBeDefined()
    for (const ex of catalogo.values()) if (ex.nivel && ex.id !== 'prancha') expect(degraus.has(ex.id), ex.id).toBe(true)
    // Os degraus seguem o nível: nunca um degrau mais difícil com nível mais baixo do que o anterior.
    for (const e of escadas()) {
      const niveis = e.degraus.map((id) => catalogo.get(id)!.nivel!)
      expect(niveis, e.id).toEqual([...niveis].sort())
    }
    // Todas as competências entram (exceto a bandeira humana, sem equipamento na lista).
    for (const id of ['pino-livre', 'front-lever', 'back-lever', 'planche', 'muscle-up', 'elevacoes-um-braco', 'flexoes-um-braco', 'pistol', 'v-sit', 'dragon-flag', 'nordico']) {
      expect(catalogo.get(id)?.nivel, id).toBe(id === 'pistol' ? 3 : 4)
    }
  })

  it('F31.2 as escadas da especificação, com os degraus por ordem', () => {
    expect(escadas().map((e) => e.nome)).toEqual(['Flexões', 'Empurrar na vertical', 'Mergulhos', 'Puxar na vertical', 'Puxar na horizontal', 'Pernas, joelho', 'Pernas, anca', 'Posteriores', 'Core', 'Core na barra', 'Dragon flag', 'Pino', 'Front lever', 'Back lever', 'Planche'])
    expect(escadaDe('flexoes')!.degraus).toEqual(['flexoes-parede', 'flexoes-inclinadas', 'flexoes-joelhos', 'flexoes', 'flexoes-declinadas', 'flexoes-diamante', 'flexoes-arqueiro', 'flexoes-pseudo-planche', 'flexoes-um-braco'])
    expect(escadaDe('muscle-up')!.id).toBe('puxar-vertical')
  })

  it('F31.3 auxiliares 2 nunca repetem o principal nem os auxiliares 1', () => {
    for (const ex of catalogo.values()) {
      for (const g of ex.gruposTerciarios ?? []) {
        expect(g, ex.id).not.toBe(ex.grupoPrincipal)
        expect(ex.gruposSecundarios, ex.id).not.toContain(g)
      }
    }
  })

  it('F31.5 calistenia usa os modelos próprios para 2 a 7 dias, sem modelo escolhido nem ênfase', () => {
    for (const dias of DIAS_POR_SEMANA) {
      const plano = gerar({ ...cal, diasPorSemana: dias, divisao: 'grupos', enfase: 'inferior' })
      expect(plano.treinos.map((t) => t.id), String(dias)).toEqual(DIVISOES_CALISTENIA[dias])
    }
    const semEnfase = gerar({ ...cal, diasPorSemana: 4 })
    expect(gerar({ ...cal, diasPorSemana: 4, enfase: 'inferior' }).treinos).toEqual(semEnfase.treinos)
    expect(semEnfase.avisos.join(' ')).not.toMatch(/modelo escolhido/)
  })

  it('F31.5 o degrau de partida segue a experiência; modo conservador começa na base', () => {
    const iniciante = exercicios({ ...cal, diasPorSemana: 2, experiencia: 'iniciante' })
    expect(iniciante).toContain('flexoes-inclinadas')
    expect(iniciante).toContain('elevacoes-negativas')
    const intermedio = exercicios({ ...cal, diasPorSemana: 2, experiencia: 'intermedio' })
    expect(intermedio).toContain('flexoes-declinadas')
    expect(intermedio).toContain('elevacoes')
    const conservador = exercicios({ ...cal, diasPorSemana: 2, experiencia: 'intermedio', parq: [true, false, false, false, false, false, false] })
    expect(conservador).toContain('flexoes-inclinadas')
  })

  it('F31.5 faixas de calistenia: 6–15 nos compostos (4–8 em força), 10–20 nos isolados, salvo a faixa própria', () => {
    const p = gerar({ ...cal, diasPorSemana: 2 }).treinos[0]!.prescricoes
    expect(p.find((x) => x.exercicioId === 'agachamento-peso-corporal')!.faixa).toEqual([12, 25])
    expect(p.find((x) => x.exercicioId === 'flexoes-inclinadas')!.faixa).toEqual([6, 15])
    expect(p.find((x) => x.exercicioId === 'ponte-gluteos')!.faixa).toEqual([6, 15])
    expect(p.find((x) => x.exercicioId === 'elevacoes-negativas')!.faixa).toEqual([3, 8])
    const forca = gerar({ ...cal, diasPorSemana: 2, objetivo: 'forca' }).treinos[0]!.prescricoes
    expect(forca.find((x) => x.exercicioId === 'flexoes-inclinadas')!.faixa).toEqual([4, 8])
  })

  it('F31.5 restrições e equipamento valem: sem barra fixa, puxar passa aos substitutos; com dor no ombro, sem elevações', () => {
    const semBarra = exercicios({ ...cal, diasPorSemana: 4, equipamentos: [] })
    for (const id of semBarra) expect(motivoIncompatibilidade(catalogo.get(id)!, { ...cal, equipamentos: [] }), id).toBeNull()
    expect(semBarra).toContain('remada-mochila')
    const ombro = exercicios({ ...cal, diasPorSemana: 4, restricoes: [{ area: 'ombro', intensidade: 3, avaliadaPorProfissional: true }] })
    expect(ombro.some((id) => catalogo.get(id)!.contraindicacoes.includes('ombro'))).toBe(false)
  })

  it('F31.6 competências só com a opção: no início dos treinos de corpo inteiro e superior, no primeiro degrau, 3 séries', () => {
    const sem = gerar({ ...cal, diasPorSemana: 4 })
    expect(sem.treinos.flatMap((t) => t.prescricoes).some((p) => catalogo.get(p.exercicioId)!.nivel === 4 || p.exercicioId.startsWith('pino'))).toBe(false)
    const com = gerar({ ...cal, diasPorSemana: 4, competencias: true })
    expect(com.treinos.find((t) => t.id === 'cal-superior-a')!.prescricoes[0]).toMatchObject({ exercicioId: 'pino-parede-costas', series: 3, faixa: [20, 60] })
    expect(com.treinos.find((t) => t.id === 'cal-superior-b')!.prescricoes[0]).toMatchObject({ exercicioId: 'front-lever-encolhido', series: 3 })
    expect(com.treinos.find((t) => t.id === 'cal-inferior-a')!.prescricoes[0]!.exercicioId).toBe('agachamento-peso-corporal')
    // Em musculação, a opção não faz nada.
    expect(gerar({ ...perfilExemplo, competencias: true })).toEqual(gerar(perfilExemplo))
    // As competências de cada modelo estão no primeiro degrau da escada.
    for (const m of Object.values(MODELOS_CALISTENIA)) {
      for (const pos of m.posicoes.filter((x) => x.competencia)) expect(escadaDe(pos.exercicioId)!.degraus[0], m.id).toBe(pos.exercicioId)
    }
  })

  it('F31.8 a cópia guarda o tipo de treino e as competências', () => {
    const copia: Copia = { formato: 'app-treino', versao: 1, exportadoEm: '2026-11-01T12:00:00.000Z', anamnese: { ...cal, competencias: true }, plano: null, sessoes: [], medicoes: [], videos: {} }
    expect(lerCopia(JSON.parse(JSON.stringify(copia)))).toEqual(copia)
    expect(() => lerCopia({ ...copia, anamnese: { ...cal, estilo: 'crossfit' } })).toThrow()
  })
})
