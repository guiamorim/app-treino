import { t } from '../i18n'

export interface Video {
  plataforma: 'youtube' | 'vimeo'
  id: string
  /** URL para o iframe (domínios permitidos pela CSP). */
  incorporar: string
  /** URL para abrir fora da app quando a incorporação falha. */
  externo: string
}

const YOUTUBE = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'])
const VIMEO = new Set(['vimeo.com', 'www.vimeo.com'])
const ID_YOUTUBE = /^[A-Za-z0-9_-]{11}$/
const ID_VIMEO = /^\d{6,12}$/

function youtube(id: string): Video {
  return {
    plataforma: 'youtube',
    id,
    incorporar: `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&modestbranding=1`,
    externo: `https://www.youtube.com/watch?v=${id}`,
  }
}

/** Só aceita https e domínios da lista; devolve null para tudo o resto. */
export function lerVideo(texto: string): Video | null {
  let url: URL
  try {
    url = new URL(texto.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null
  const host = url.hostname.toLowerCase()
  const partes = url.pathname.split('/').filter(Boolean)

  if (host === 'youtu.be') {
    const id = partes[0] ?? ''
    return ID_YOUTUBE.test(id) ? youtube(id) : null
  }
  if (YOUTUBE.has(host)) {
    let id = ''
    if (partes[0] === 'watch') id = url.searchParams.get('v') ?? ''
    else if (partes[0] === 'shorts' || partes[0] === 'embed') id = partes[1] ?? ''
    return ID_YOUTUBE.test(id) ? youtube(id) : null
  }
  if (VIMEO.has(host)) {
    const id = partes[0] ?? ''
    if (!ID_VIMEO.test(id)) return null
    return {
      plataforma: 'vimeo',
      id,
      incorporar: `https://player.vimeo.com/video/${id}?playsinline=1`,
      externo: `https://vimeo.com/${id}`,
    }
  }
  return null
}

/** Pesquisa no YouTube, para quando um exercício não tem vídeo. */
export function pesquisaYoutube(nomeExercicio: string, sufixo = t('execução')): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${nomeExercicio} ${sufixo}`)}`
}
