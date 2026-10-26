import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import alongamentosPt from '../catalog/alongamentos.json'
import exerciciosPt from '../catalog/exercicios.json'
import alongamentosEn from '../catalog/i18n/alongamentos.en.json'
import alongamentosEs from '../catalog/i18n/alongamentos.es.json'
import exerciciosEn from '../catalog/i18n/exercicios.en.json'
import exerciciosEs from '../catalog/i18n/exercicios.es.json'
import { carregarAlongamentos, traduzirAlongamentos } from '../domain/alongamentos'
import { catalogo, perfilExemplo } from '../domain/fixtures'
import { carregarNovidades, novidadesNoIdioma } from '../domain/novidades'
import { gerarPlano, planoNoIdioma } from '../domain/plano'
import { traduzirCatalogo } from '../domain/catalogo'
import { NOMES_GRUPOS } from '../domain/types'
import novidades from '../novidades.json'
import en from './en.json'
import es from './es.json'
import { carregarIdioma, definirIdioma, idiomaDoDispositivo, t } from '.'

/** Todas as frases marcadas com t('…') ou m('…') no código da app. */
const codigo = import.meta.glob<string>(['../**/*.{ts,tsx}', '!../**/*.test.*'], { query: '?raw', import: 'default', eager: true })
function frasesDoCodigo(): Set<string> {
  const r = new Set<string>()
  for (const fonte of Object.values(codigo)) {
    for (const [, f] of fonte.matchAll(/\b[tm]\('((?:[^'\\]|\\.)*)'/g)) r.add(f!.replace(/\\'/g, "'"))
  }
  return r
}

const variaveis = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort()
const frases = frasesDoCodigo()

afterEach(() => definirIdioma('pt'))

// Corre antes do bloco F21, que carrega os dois dicionários.
describe('F22.12 idiomas a pedido', () => {
  it('sem o dicionário carregado a frase fica em português; depois de carregado, traduz', async () => {
    definirIdioma('es')
    expect(t('Série {n} de {total}', { n: 2, total: 3 })).toBe('Série 2 de 3')
    await carregarIdioma('es')
    expect(t('Série {n} de {total}', { n: 2, total: 3 })).toBe('Serie 2 de 3')
  })
})

describe('F21 idiomas', () => {
  beforeAll(() => Promise.all([carregarIdioma('en'), carregarIdioma('es')]))

  it.each([['en', en], ['es', es]] as const)('todas as frases da app têm tradução em %s, com as mesmas variáveis', (_, dic: Record<string, string>) => {
    const faltam = [...frases].filter((f) => !(f in dic))
    expect(faltam).toEqual([])
    for (const f of frases) expect(variaveis(dic[f]!), f).toEqual(variaveis(f))
    // Sem traduções órfãs de frases que já não existem.
    expect(Object.keys(dic).filter((k) => !frases.has(k))).toEqual([])
  })

  it('o idioma por omissão segue o telemóvel: português, espanhol ou, nos restantes, inglês', () => {
    expect(idiomaDoDispositivo(['pt-BR'])).toBe('pt')
    expect(idiomaDoDispositivo(['es-MX', 'en'])).toBe('es')
    expect(idiomaDoDispositivo(['fr-FR', 'es-ES'])).toBe('es')
    expect(idiomaDoDispositivo(['de-DE'])).toBe('en')
    expect(idiomaDoDispositivo([])).toBe('en')
  })

  it('traduz e preenche variáveis; nomes fixos seguem o idioma atual', () => {
    expect(t('Série {n} de {total}', { n: 2, total: 3 })).toBe('Série 2 de 3')
    definirIdioma('en')
    expect(t('Série {n} de {total}', { n: 2, total: 3 })).toBe('Set 2 of 3')
    expect(NOMES_GRUPOS.peito).toBe('Chest')
    definirIdioma('es')
    expect(NOMES_GRUPOS.peito).toBe('Pecho')
  })

  it('catálogos: cada exercício e alongamento tem nome e textos nos dois idiomas, com o mesmo número de pontos', () => {
    for (const [dic, nome] of [[exerciciosEn, 'en'], [exerciciosEs, 'es']] as const) {
      const tr = traduzirCatalogo(catalogo, dic)
      for (const ex of exerciciosPt) {
        const d = (dic as Record<string, { nome: string; pontosChave: string[] }>)[ex.id]
        expect(d, `${nome} ${ex.id}`).toBeDefined()
        expect(d!.pontosChave).toHaveLength(ex.pontosChave.length)
        expect(tr.get(ex.id)!.nome).toBe(d!.nome)
      }
    }
    const al = carregarAlongamentos(alongamentosPt)
    for (const dic of [alongamentosEn, alongamentosEs]) {
      const tr = traduzirAlongamentos(al, dic)
      for (const a of al.values()) {
        expect(tr.get(a.id)!.passos).toHaveLength(a.passos.length)
        expect(tr.get(a.id)!.cuidados).toHaveLength(a.cuidados.length)
      }
    }
  })

  it('novidades: todas as versões e «em preparação» traduzidas', () => {
    const n = carregarNovidades(novidades)
    for (const i of ['en', 'es'] as const) {
      for (const v of n.versoes) expect(v.traducoes?.[i]?.itens, `${i} ${v.versao}`).toHaveLength(v.itens.length)
      expect(n.traducoes?.[i]?.emPreparacao).toHaveLength(n.emPreparacao.length)
      expect(novidadesNoIdioma(n, i).versoes[0]!.itens).toEqual(n.versoes[0]!.traducoes![i]!.itens)
    }
  })

  it('plano guardado em português aparece no idioma escolhido: nomes, avisos e notas', () => {
    const plano = gerarPlano(perfilExemplo, catalogo, { id: 'p', agora: '2026-10-20T08:00:00.000Z' })
    expect(plano.treinos[0]!.nome).toBe('Superior A')
    const nota = plano.treinos.flatMap((x) => x.prescricoes).find((p) => p.nota)!
    expect(nota.nota).toMatch(/^Substitui «/)
    definirIdioma('en')
    const emIngles = planoNoIdioma(plano, perfilExemplo, traduzirCatalogo(catalogo, exerciciosEn))
    expect(emIngles.treinos[0]!.nome).toBe('Upper A')
    expect(emIngles.avisos.join(' ')).toMatch(/shoulder pain has never been assessed/)
    expect(emIngles.treinos.flatMap((x) => x.prescricoes).find((p) => p.id === nota.id)!.nota).toMatch(/^Replaces “Barbell bench press”/)
    // O plano guardado não muda.
    expect(plano.treinos[0]!.nome).toBe('Superior A')
  })
})
