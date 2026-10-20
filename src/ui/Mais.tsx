import { useRef, useState } from 'react'
import { db } from '../data/db'
import { paraCsv } from '../domain/copia'
import { agoraIso, catalogo, dataCurta, diasDesde, hojeIso, type Dados } from './dados'
import { ir } from './rota'

function descarregar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function Mais({ dados }: { dados: Dados }) {
  const ficheiro = useRef<HTMLInputElement>(null)
  const [mensagem, setMensagem] = useState('')
  const dias = diasDesde(dados.ultimaExportacao)

  async function exportar() {
    const copia = await db.exportar(agoraIso())
    descarregar(`treino-${hojeIso()}.json`, JSON.stringify(copia, null, 2), 'application/json')
  }

  async function importar(f: File) {
    if (!confirm('Importar substitui todos os dados deste dispositivo pelos do ficheiro. Continuar?')) return
    try {
      if (f.size > 20_000_000) throw new Error('Ficheiro demasiado grande.')
      await db.importar(JSON.parse(await f.text()))
      setMensagem('Cópia importada com sucesso.')
    } catch {
      setMensagem('Ficheiro inválido. Nenhum dado foi alterado.')
    }
  }

  return (
    <>
      <h1>Mais</h1>
      <div className="cartao">
        <h3>O teu plano</h3>
        <button className="largo" onClick={() => ir('/anamnese')}>Editar anamnese e gerar novo plano</button>
      </div>

      <div className={`cartao ${dias > 14 ? 'aviso' : ''}`}>
        <h3>Cópia de segurança</h3>
        <p className="secundario">
          Os dados existem só neste dispositivo. {dados.ultimaExportacao ? `Última cópia: ${dataCurta(dados.ultimaExportacao)}.` : 'Ainda não fizeste nenhuma cópia.'}
          {dias > 14 && ' Recomenda-se uma cópia a cada 2 semanas (guarda-a no iCloud Drive ou envia-a por email para ti).'}
        </p>
        <button className="primario largo" onClick={exportar}>Exportar cópia (JSON)</button>
        <div className="linha" style={{ marginTop: 8 }}>
          <button onClick={() => descarregar(`treino-historico-${hojeIso()}.csv`, paraCsv(dados.sessoes, catalogo), 'text/csv')}>Exportar histórico (CSV)</button>
          <button onClick={() => ficheiro.current?.click()}>Importar cópia</button>
        </div>
        <input ref={ficheiro} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importar(f); e.target.value = '' }} />
        {mensagem && <p role="status">{mensagem}</p>}
      </div>

      <div className="cartao">
        <h3>Sobre</h3>
        <p className="secundario">
          Plano gerado por regras baseadas em evidência (frequência 2×/semana por grupo, 8+ séries semanais nos grupos grandes, RIR 1–3, dupla progressão).
          Esta app não substitui avaliação médica nem de fisioterapia. Se sentires dor forte, tonturas ou dor no peito, para e procura ajuda.
        </p>
        <p className="secundario">Sem anúncios, sem rastreio, sem servidor. Os vídeos são de terceiros (YouTube/Vimeo).</p>
      </div>
    </>
  )
}
