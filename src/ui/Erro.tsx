import { Component, type ReactNode } from 'react'
import { db } from '../data/db'
import { t } from '../i18n'
import { agoraIso, hojeIso } from './dados'
import { descarregar } from './ficheiros'

/**
 * F22.1: se um ecrã falhar, a app mostra o erro em vez de ficar em branco, e deixa exportar a cópia
 * de segurança (que lê a base de dados diretamente, sem passar pelos ecrãs) e recarregar.
 */
export class ProtecaoErros extends Component<{ children: ReactNode }, { erro: Error | null }> {
  state = { erro: null as Error | null }

  static getDerivedStateFromError(erro: Error) {
    return { erro }
  }

  render() {
    const { erro } = this.state
    if (!erro) return this.props.children
    return (
      <main>
        <h1>{t('Algo correu mal')}</h1>
        <p>{t('Os teus dados continuam guardados neste dispositivo. Exporta uma cópia de segurança antes de tentar outra coisa.')}</p>
        <div className="linha">
          <button className="primario" onClick={exportarCopia}>{t('Exportar cópia (JSON)')}</button>
          <button onClick={() => location.reload()}>{t('Recarregar')}</button>
        </div>
        <details className="cartao">
          <summary>{t('Detalhes do erro')}</summary>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '0.8rem' }}>{erro.message}</pre>
        </details>
      </main>
    )
  }
}

async function exportarCopia() {
  const copia = await db.exportar(agoraIso())
  await descarregar(`treino-${hojeIso()}.json`, JSON.stringify(copia, null, 2), 'application/json')
}
