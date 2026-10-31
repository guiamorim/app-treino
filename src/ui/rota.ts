import { useEffect, useState } from 'react'
import type { TipoReporte } from '../domain/reporte'
import { GRUPOS_MUSCULARES, type GrupoMuscular } from '../domain/types'

export type Rota =
  | { ecra: 'inicio' }
  | { ecra: 'hoje' }
  | { ecra: 'exercicio'; prescricaoId: string }
  | { ecra: 'relatorios' }
  | { ecra: 'medicoes' }
  | { ecra: 'fotos' }
  | { ecra: 'mais' }
  | { ecra: 'anamnese' }
  | { ecra: 'alongamento'; grupo?: GrupoMuscular }
  /** F26: `novo` ou o id de um exercício próprio. */
  | { ecra: 'meu-exercicio'; id: string }
  /** F27: editor do plano próprio. */
  | { ecra: 'meu-plano' }
  /** F31.4: exercícios de calistenia por nível. */
  | { ecra: 'calistenia' }
  /** F32.2: teste de nivelamento. */
  | { ecra: 'nivelamento' }
  /** F34.1: reportar ou sugerir, com o exercício ou o treino quando vem do botão desse ecrã. */
  | { ecra: 'reportar'; tipo: TipoReporte; id?: string }

export function lerRota(hash: string): Rota {
  const [ecra, arg, arg2] = hash.replace(/^#\/?/, '').split('/')
  switch (ecra) {
    case 'reportar':
      return (arg === 'exercicio' || arg === 'treino') && arg2 ? { ecra, tipo: arg, id: decodeURIComponent(arg2) } : { ecra, tipo: 'geral' }
    case 'exercicio':
      return arg ? { ecra: 'exercicio', prescricaoId: decodeURIComponent(arg) } : { ecra: 'hoje' }
    case 'alongamento':
      return (GRUPOS_MUSCULARES as readonly string[]).includes(arg ?? '') ? { ecra: 'alongamento', grupo: arg as GrupoMuscular } : { ecra: 'alongamento' }
    case 'meu-exercicio':
      return arg ? { ecra: 'meu-exercicio', id: decodeURIComponent(arg) } : { ecra: 'mais' }
    case 'hoje':
    case 'relatorios':
    case 'medicoes':
    case 'fotos':
    case 'mais':
    case 'anamnese':
    case 'meu-plano':
    case 'calistenia':
    case 'nivelamento':
      return { ecra }
    default:
      return { ecra: 'inicio' }
  }
}

export const ir = (caminho: string) => {
  location.hash = caminho
  window.scrollTo(0, 0)
}

export function useRota(): Rota {
  const [rota, setRota] = useState(() => lerRota(location.hash))
  useEffect(() => {
    const f = () => setRota(lerRota(location.hash))
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return rota
}
