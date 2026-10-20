import { describe, expect, it } from 'vitest'
import { lerVideo } from './video'

describe('F5 vídeo: lerVideo', () => {
  it.each([
    ['https://www.youtube.com/watch?v=3m7-E2Bcotk', '3m7-E2Bcotk'],
    ['https://youtube.com/watch?pp=abc&v=fD-yU3c3Fv8', 'fD-yU3c3Fv8'],
    ['https://m.youtube.com/watch?v=M6Y1KMngFGQ', 'M6Y1KMngFGQ'],
    ['https://youtu.be/3m7-E2Bcotk?t=10', '3m7-E2Bcotk'],
    ['https://www.youtube.com/shorts/axcHgrXAIhg', 'axcHgrXAIhg'],
    ['https://www.youtube.com/embed/3m7-E2Bcotk', '3m7-E2Bcotk'],
    ['https://www.youtube-nocookie.com/embed/3m7-E2Bcotk', '3m7-E2Bcotk'],
  ])('F5.1 converte %s num link de incorporação sem cookies', (url, id) => {
    const v = lerVideo(url)
    expect(v).toEqual({
      plataforma: 'youtube',
      id,
      incorporar: `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&modestbranding=1`,
      externo: `https://www.youtube.com/watch?v=${id}`,
    })
  })

  it('F5.1 aceita Vimeo', () => {
    expect(lerVideo('https://vimeo.com/76979871')).toEqual({
      plataforma: 'vimeo',
      id: '76979871',
      incorporar: 'https://player.vimeo.com/video/76979871?playsinline=1',
      externo: 'https://vimeo.com/76979871',
    })
  })

  it.each([
    'http://www.youtube.com/watch?v=3m7-E2Bcotk',
    'https://evil.com/watch?v=3m7-E2Bcotk',
    'https://youtube.com.evil.com/watch?v=3m7-E2Bcotk',
    'javascript:alert(1)',
    'https://www.youtube.com/watch?v=curto',
    'https://www.youtube.com/watch?v=3m7-E2Bcotk"><script>',
    'nada',
    '',
  ])('F5.2 rejeita links fora da lista de domínios permitidos ou mal formados: %s', (url) => {
    expect(lerVideo(url)).toBeNull()
  })
})
