import { useEffect, useRef } from 'react'
import type { Video } from '../domain/video'

export function VideoModal({ video, titulo, fechar }: { video: Video; titulo: string; fechar: () => void }) {
  const botao = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    botao.current?.focus()
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [fechar])
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={`Vídeo: ${titulo}`} onClick={fechar}>
      <div className="moldura" onClick={(e) => e.stopPropagation()}>
        <iframe
          src={video.incorporar}
          title={titulo}
          sandbox="allow-scripts allow-same-origin allow-presentation"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
      <div className="acoes" onClick={(e) => e.stopPropagation()}>
        <a className="botao" href={video.externo} target="_blank" rel="noopener noreferrer">
          Abrir no {video.plataforma === 'youtube' ? 'YouTube' : 'Vimeo'}
        </a>
        <button ref={botao} className="primario" onClick={fechar}>Fechar</button>
      </div>
      <p className="secundario" style={{ textAlign: 'center', color: '#cbd5e1' }}>Se o vídeo não tocar aqui, o autor bloqueou a incorporação: usa «Abrir no YouTube».</p>
      {video.plataforma === 'youtube' && (
        <p className="secundario" style={{ textAlign: 'center', color: '#cbd5e1' }}>Os anúncios são do YouTube e a app não os pode remover. Sem anúncios: YouTube Premium (em «Abrir no YouTube») ou um link do Vimeo.</p>
      )}
    </div>
  )
}
