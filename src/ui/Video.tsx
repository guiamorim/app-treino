import { useEffect, useRef } from 'react'
import type { Video } from '../domain/video'
import { t } from '../i18n'
import { Janela } from './Janela'

export function VideoModal({ video, titulo, fechar }: { video: Video; titulo: string; fechar: () => void }) {
  const botao = useRef<HTMLButtonElement>(null)
  useEffect(() => botao.current?.focus(), [])
  return (
    <Janela rotulo={t('Vídeo: {titulo}', { titulo })} fechar={fechar}>
      <div className="moldura">
        <iframe
          src={video.incorporar}
          title={titulo}
          sandbox="allow-scripts allow-same-origin allow-presentation"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
      <div className="acoes">
        <a className="botao" href={video.externo} target="_blank" rel="noopener noreferrer">
          {t('Abrir no {plataforma}', { plataforma: video.plataforma === 'youtube' ? 'YouTube' : 'Vimeo' })}
        </a>
        <button ref={botao} className="primario" onClick={fechar}>{t('Fechar')}</button>
      </div>
      <p className="secundario" style={{ textAlign: 'center', color: '#cbd5e1' }}>{t('Se o vídeo não tocar aqui, o autor bloqueou a incorporação: usa «Abrir no YouTube».')}</p>
      {video.plataforma === 'youtube' && (
        <p className="secundario" style={{ textAlign: 'center', color: '#cbd5e1' }}>{t('Os anúncios são do YouTube e a app não os pode remover. Sem anúncios: YouTube Premium (em «Abrir no YouTube») ou um link do Vimeo.')}</p>
      )}
    </Janela>
  )
}
