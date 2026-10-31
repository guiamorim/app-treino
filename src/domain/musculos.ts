import type { Exercicio, GrupoMuscular } from './types'

// F18: o desenho do corpo destaca o grupo principal e, mais claro, os secundários. F31.3 (v1.20): os auxiliares 2 ainda mais claros.
/** «secundario» é o auxiliar 1 e «terciario» o auxiliar 2. */
export type Destaque = 'principal' | 'secundario' | 'terciario'
const FORCA: Record<Destaque, number> = { principal: 3, secundario: 2, terciario: 1 }
type ComGrupos = Pick<Exercicio, 'grupoPrincipal' | 'gruposSecundarios' | 'gruposTerciarios'>

/** Regiões do desenho do corpo (nomes da biblioteca de origem) que formam cada grupo muscular. */
export const REGIOES_POR_GRUPO: Record<GrupoMuscular, readonly string[]> = {
  peito: ['chest'],
  costas: ['upper-back', 'trapezius'],
  ombros: ['deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  quadriceps: ['quadriceps'],
  posteriores: ['hamstring'],
  gluteos: ['gluteal'],
  gemeos: ['calves'],
  core: ['abs', 'obliques', 'lower-back'],
}

export function destaques(ex: ComGrupos): Partial<Record<GrupoMuscular, Destaque>> {
  const d: Partial<Record<GrupoMuscular, Destaque>> = {}
  for (const g of ex.gruposTerciarios ?? []) d[g] = 'terciario'
  for (const g of ex.gruposSecundarios) d[g] = 'secundario'
  d[ex.grupoPrincipal] = 'principal'
  return d
}

/** Destaque de cada região do desenho; regiões sem destaque ficam de fora. */
export function destaquesPorRegiao(ex: ComGrupos): Map<string, { grupo: GrupoMuscular; destaque: Destaque }> {
  const r = new Map<string, { grupo: GrupoMuscular; destaque: Destaque }>()
  for (const [grupo, destaque] of Object.entries(destaques(ex)) as [GrupoMuscular, Destaque][])
    for (const regiao of REGIOES_POR_GRUPO[grupo]) {
      const atual = r.get(regiao)
      if (!atual || FORCA[atual.destaque] < FORCA[destaque]) r.set(regiao, { grupo, destaque })
    }
  return r
}
