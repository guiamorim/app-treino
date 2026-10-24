import { useRef, useState } from 'react'
import { db } from '../data/db'
import { paraCsv } from '../domain/copia'
import { excelFichaHistorico, pdfFicha, pdfHistorico } from '../domain/exportar'
import { agoraIso, catalogo, dataCurta, diasDesde, hojeIso, type Dados } from './dados'
import { descarregar, paraExportacao, TIPO_PDF, TIPO_XLSX } from './ficheiros'
import { ir } from './rota'
import { reduzirImagem } from './imagem'

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
      if (f.size > 300_000_000) throw new Error('Ficheiro demasiado grande.')
      await db.importar(JSON.parse(await f.text()))
      setMensagem('Cópia importada com sucesso.')
    } catch {
      setMensagem('Ficheiro inválido. Nenhum dado foi alterado.')
    }
  }

  return (
    <>
      <h1>Mais</h1>
      <PerfilCartao dados={dados} />

      <div className="cartao">
        <h3>O teu plano</h3>
        <button className="largo" onClick={() => ir('/anamnese')}>Editar anamnese e gerar novo plano</button>
      </div>

      <div className="cartao">
        <h3>Exportar</h3>
        <p className="secundario">Ficha de treino e histórico para imprimir, partilhar ou abrir no Excel. O JSON é a cópia de segurança, mais abaixo.</p>
        <div className="linha">
          <button disabled={!dados.plano} onClick={() => descarregar(`ficha-treino-${hojeIso()}.pdf`, pdfFicha(paraExportacao(dados), catalogo, agoraIso()), TIPO_PDF)}>Ficha (PDF)</button>
          <button onClick={() => descarregar(`historico-treino-${hojeIso()}.pdf`, pdfHistorico(paraExportacao(dados), catalogo, agoraIso()), TIPO_PDF)}>Histórico (PDF)</button>
        </div>
        <button className="largo" style={{ marginTop: 8 }} onClick={() => descarregar(`treino-${hojeIso()}.xlsx`, excelFichaHistorico(paraExportacao(dados), catalogo, agoraIso()), TIPO_XLSX)}>Ficha, histórico e medições (Excel)</button>
      </div>

      <div className={`cartao ${dias > 14 ? 'aviso' : ''}`}>
        <h3>Cópia de segurança</h3>
        <p className="secundario">
          Os dados existem só neste dispositivo. {dados.ultimaExportacao ? `Última cópia: ${dataCurta(dados.ultimaExportacao)}.` : 'Ainda não fizeste nenhuma cópia.'}
          {dias > 14 && ' Recomenda-se uma cópia a cada 2 semanas (guarda-a no iCloud Drive ou envia-a por email para ti).'}
        </p>
        {dados.fotos.length > 0 && <p className="secundario">A cópia inclui as tuas {dados.fotos.length} fotos de avaliação: guarda-a num sítio privado.</p>}
        <button className="primario largo" onClick={exportar}>Exportar cópia (JSON)</button>
        <div className="linha" style={{ marginTop: 8 }}>
          <button onClick={() => descarregar(`treino-historico-${hojeIso()}.csv`, paraCsv(dados.sessoes, catalogo), 'text/csv')}>Exportar histórico (CSV)</button>
          <button onClick={() => ficheiro.current?.click()}>Importar cópia</button>
        </div>
        <input ref={ficheiro} type="file" accept="application/json,.json" hidden aria-label="Ficheiro de cópia" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importar(f); e.target.value = '' }} />
        {mensagem && <p role="status">{mensagem}</p>}
      </div>

      <div className="cartao">
        <h3>Sobre</h3>
        <p className="secundario">
          Plano gerado por regras baseadas em evidência (frequência 2×/semana por grupo, 8+ séries semanais nos grupos grandes, RIR 1–3, dupla progressão).
          Esta app não substitui avaliação médica nem de fisioterapia. Se sentires dor forte, tonturas ou dor no peito, para e procura ajuda.
        </p>
        <p className="secundario">Sem anúncios, sem rastreio, sem servidor. Os vídeos são de terceiros (YouTube/Vimeo).</p>
        <p className="secundario">Desenhos dos músculos: react-native-body-highlighter, © 2022 Hicham Elabbassi, licença MIT.</p>
      </div>
    </>
  )
}

/** F16: nome e foto de perfil, usados na saudação do Início. */
function PerfilCartao({ dados }: { dados: Dados }) {
  const ficheiro = useRef<HTMLInputElement>(null)
  const [nome, setNome] = useState(dados.perfil.nome ?? '')
  const [estado, setEstado] = useState('')

  async function gravar(mudanca: { nome?: string; foto?: string | null }) {
    const atual = (await db.ler<{ nome?: string; foto?: string }>('perfil')) ?? {}
    const novo = { ...atual }
    if (mudanca.nome !== undefined) {
      const n = mudanca.nome.trim().slice(0, 40)
      if (n) novo.nome = n
      else delete novo.nome
    }
    if (mudanca.foto === null) delete novo.foto
    else if (mudanca.foto) novo.foto = mudanca.foto
    await db.gravar('perfil', novo)
  }

  async function escolherFoto(f: File) {
    try {
      await gravar({ foto: await reduzirImagem(f, 256) })
      setEstado('Foto de perfil atualizada.')
    } catch {
      setEstado('Não foi possível ler esta imagem.')
    }
  }

  return (
    <div className="cartao">
      <h3>Perfil</h3>
      <div className="linha" style={{ alignItems: 'center' }}>
        {dados.perfil.foto ? <img className="avatar grande" src={dados.perfil.foto} alt="Foto de perfil" /> : <span className="avatar grande vazio" aria-hidden="true">👤</span>}
        <div style={{ flex: 3 }}>
          <button onClick={() => ficheiro.current?.click()}>{dados.perfil.foto ? 'Mudar foto' : 'Adicionar foto'}</button>
          {dados.perfil.foto && <button className="perigo" onClick={() => gravar({ foto: null })} style={{ marginLeft: 8 }}>Remover</button>}
        </div>
      </div>
      <input ref={ficheiro} type="file" accept="image/*" hidden aria-label="Escolher foto de perfil" onChange={(e) => { const f = e.target.files?.[0]; if (f) void escolherFoto(f); e.target.value = '' }} />
      <label htmlFor="perfil-nome">Nome</label>
      <div className="linha">
        <input id="perfil-nome" maxLength={40} autoComplete="given-name" value={nome} onChange={(e) => setNome(e.target.value)} style={{ flex: 3 }} />
        <button onClick={async () => { await gravar({ nome }); setEstado('Nome guardado.') }}>Guardar</button>
      </div>
      {estado && <p role="status" className="secundario">{estado}</p>}
    </div>
  )
}
