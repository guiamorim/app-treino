// F35.2 (v1.24): sugestão de instalar a app no ecrã principal, na primeira utilização.
import { useSyncExternalStore } from 'react'
import { db } from '../data/db'
import { t } from '../i18n'

interface PedidoInstalacao extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Android e navegadores Chromium: o pedido de instalação chega uma vez, cedo; guarda-se para o botão «Instalar».
let pedido: PedidoInstalacao | undefined
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((f) => f())
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    pedido = e as PedidoInstalacao
    avisar()
  })
  window.addEventListener('appinstalled', () => {
    pedido = undefined
    void db.gravar('instalacaoVista', true)
  })
}
const usePedido = () => useSyncExternalStore((f) => (ouvintes.add(f), () => ouvintes.delete(f)), () => pedido)

/** Já aberta a partir do ecrã principal (ou como app instalada). */
export const instalada = () =>
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

/** iPhone e iPad (o iPad recente apresenta-se como Mac com ecrã tátil). */
const apple = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

export function SugestaoInstalar() {
  const p = usePedido()
  const fechar = () => db.gravar('instalacaoVista', true)
  async function instalar() {
    if (!p) return
    await p.prompt()
    await p.userChoice.catch(() => undefined)
    pedido = undefined
    avisar()
    await fechar()
  }
  return (
    <div className="cartao aviso" role="region" aria-label={t('Instalar a app')}>
      <h3>📲 {t('Põe a app no ecrã principal')}</h3>
      <p>{t('Abre em ecrã inteiro como uma app, funciona sem internet e os teus dados ficam mais protegidos: o navegador pode apagar os dados de sites que não abres há algum tempo, mas não os das apps no ecrã principal.')}</p>
      {p ? (
        <button className="primario largo" onClick={instalar}>{t('Instalar')}</button>
      ) : apple() ? (
        <ol>
          <li>{t('No Safari, toca em Partilhar (o quadrado com a seta para cima).')}</li>
          <li>{t('Escolhe «Adicionar ao ecrã principal» e confirma.')}</li>
          <li>{t('Abre a app a partir do novo ícone.')}</li>
        </ol>
      ) : (
        <p>{t('No menu do navegador, escolhe «Instalar app» ou «Adicionar ao ecrã principal».')}</p>
      )}
      <button className="largo" style={{ marginTop: 8 }} onClick={fechar}>{t('Agora não')}</button>
    </div>
  )
}
