import type { Exercicio, GrupoMuscular } from './types'

// F18: o desenho do corpo destaca o grupo principal e, mais claro, os secundários.
export type Destaque = 'principal' | 'secundario'
export type Vista = 'frente' | 'costas'

export const GRUPOS_POR_VISTA: Record<Vista, readonly GrupoMuscular[]> = {
  frente: ['ombros', 'peito', 'biceps', 'core', 'quadriceps'],
  costas: ['ombros', 'costas', 'triceps', 'core', 'gluteos', 'posteriores', 'gemeos'],
}

export function destaques(ex: Pick<Exercicio, 'grupoPrincipal' | 'gruposSecundarios'>): Partial<Record<GrupoMuscular, Destaque>> {
  const d: Partial<Record<GrupoMuscular, Destaque>> = {}
  for (const g of ex.gruposSecundarios) d[g] = 'secundario'
  d[ex.grupoPrincipal] = 'principal'
  return d
}
