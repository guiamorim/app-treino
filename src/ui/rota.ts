import { useEffect, useState } from 'react'

export type Rota =
  | { ecra: 'inicio' }
  | { ecra: 'hoje' }
  | { ecra: 'exercicio'; prescricaoId: string }
  | { ecra: 'relatorios' }
  | { ecra: 'medicoes' }
  | { ecra: 'fotos' }
  | { ecra: 'mais' }
  | { ecra: 'anamnese' }

export function lerRota(hash: string): Rota {
  const [ecra, arg] = hash.replace(/^#\/?/, '').split('/')
  switch (ecra) {
    case 'exercicio':
      return arg ? { ecra: 'exercicio', prescricaoId: decodeURIComponent(arg) } : { ecra: 'hoje' }
    case 'hoje':
    case 'relatorios':
    case 'medicoes':
    case 'fotos':
    case 'mais':
    case 'anamnese':
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
