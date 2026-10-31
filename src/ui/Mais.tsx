import { useRef, useState } from 'react'
import { db } from '../data/db'
import { paraCsv } from '../domain/copia'
import { excelFichaHistorico, pdfFicha, pdfHistorico } from '../domain/exportar'
import { agoraIso, catalogo, dataCurta, diasDesde, hojeIso, type Dados } from './dados'
import { descarregar, paraExportacao, TIPO_PDF, TIPO_XLSX } from './ficheiros'
import { ir } from './rota'
import { reduzirImagem } from './imagem'
import { CartaoAtualizacoes } from './Atualizacao'
import { t } from '../i18n'
import { BotoesPdfPlano } from './Calendario'
import { CartaoBarra, CartaoIdioma, CartaoUnidade } from './Idioma'
import { CartaoProprios } from './ExerciciosProprios'
import { CartaoFerias } from './Ferias'

export function Mais({ dados }: { dados: Dados }) {
  const ficheiro = useRef<HTMLInputElement>(null)
  const [mensagem, setMensagem] = useState('')
  const dias = diasDesde(dados.ultimaExportacao)

  async function exportar() {
    const copia = await db.exportar(agoraIso())
    descarregar(`treino-${hojeIso()}.json`, JSON.stringify(copia, null, 2), 'application/json')
  }

  async function importar(f: File) {
    if (!confirm(t('Importar substitui todos os dados deste dispositivo pelos do ficheiro. Continuar?'))) return
    try {
      if (f.size > 300_000_000) throw new Error('Ficheiro demasiado grande.')
      await db.importar(JSON.parse(await f.text()))
      setMensagem(t('Cópia importada com sucesso.'))
    } catch {
      setMensagem(t('Ficheiro inválido. Nenhum dado foi alterado.'))
    }
  }

  return (
    <>
      <h1>{t('Mais')}</h1>
      <CartaoIdioma idioma={dados.idioma} />
      <CartaoUnidade unidade={dados.unidade} />
      <CartaoBarra barraKg={dados.barraKg} unidade={dados.unidade} />
      <PerfilCartao dados={dados} />

      <div className="cartao">
        <h3>{t('O teu plano')}</h3>
        {dados.plano?.proprio && <p className="secundario">{t('Estás a usar um plano criado por ti.')}</p>}
        <button className="largo" onClick={() => ir('/meu-plano')} disabled={!dados.plano}>{dados.plano?.proprio ? t('Editar o meu plano') : t('Criar o meu plano')}</button>
        <button className="largo" style={{ marginTop: 8 }} onClick={() => ir('/anamnese')}>{t('Editar anamnese e gerar novo plano')}</button>
        <button className="largo" style={{ marginTop: 8 }} onClick={() => ir('/calistenia')}>{t('Calistenia: exercícios por nível')}</button>
        <button className="largo" style={{ marginTop: 8 }} onClick={() => ir('/nivelamento')}>{t('Teste de nivelamento (opcional)')}</button>
      </div>
      <CartaoFerias dados={dados} />
      <CartaoProprios dados={dados} />

      <div className="cartao">
        <h3>{t('Exportar')}</h3>
        <p className="secundario">{t('Ficha de treino e histórico para imprimir, partilhar ou abrir no Excel. O JSON é a cópia de segurança, mais abaixo.')}</p>
        <div className="linha">
          <button disabled={!dados.plano} onClick={() => descarregar(`${t('ficha-treino')}-${hojeIso()}.pdf`, pdfFicha(paraExportacao(dados), catalogo, agoraIso()), TIPO_PDF)}>{t('Ficha (PDF)')}</button>
          <button onClick={() => descarregar(`${t('historico-treino')}-${hojeIso()}.pdf`, pdfHistorico(paraExportacao(dados), catalogo, agoraIso()), TIPO_PDF)}>{t('Histórico (PDF)')}</button>
        </div>
        <p className="secundario" style={{ marginTop: 12 }}>{t('Treino para levar no papel, com espaço para escrever:')}</p>
        <BotoesPdfPlano dados={dados} />
        <button className="largo" style={{ marginTop: 8 }} onClick={() => descarregar(`${t('treino')}-${hojeIso()}.xlsx`, excelFichaHistorico(paraExportacao(dados), catalogo, agoraIso()), TIPO_XLSX)}>{t('Ficha, histórico e medições (Excel)')}</button>
      </div>

      <div className={`cartao ${dias > 14 ? 'aviso' : ''}`}>
        <h3>{t('Cópia de segurança')}</h3>
        <p className="secundario">
          {t('Os dados existem só neste dispositivo.')} {dados.ultimaExportacao ? t('Última cópia: {data}.', { data: dataCurta(dados.ultimaExportacao) }) : t('Ainda não fizeste nenhuma cópia.')}
          {dias > 14 && ` ${t('Recomenda-se uma cópia a cada 2 semanas (guarda-a no iCloud Drive ou envia-a por email para ti).')}`}
        </p>
        {dados.numFotos > 0 && <p className="secundario">{t('A cópia inclui as tuas {n} fotos de avaliação: guarda-a num sítio privado.', { n: dados.numFotos })}</p>}
        <button className="primario largo" onClick={exportar}>{t('Exportar cópia (JSON)')}</button>
        <div className="linha" style={{ marginTop: 8 }}>
          <button onClick={() => descarregar(`${t('treino-historico')}-${hojeIso()}.csv`, paraCsv(dados.sessoes, catalogo), 'text/csv')}>{t('Exportar histórico (CSV)')}</button>
          <button onClick={() => ficheiro.current?.click()}>{t('Importar cópia')}</button>
        </div>
        <input ref={ficheiro} type="file" accept="application/json,.json" hidden aria-label={t('Ficheiro de cópia')} onChange={(e) => { const f = e.target.files?.[0]; if (f) void importar(f); e.target.value = '' }} />
        {mensagem && <p role="status">{mensagem}</p>}
      </div>

      <CartaoAtualizacoes />
      <div className="cartao">
        <h3>{t('Sobre')}</h3>
        <p className="secundario">
          {t('Plano gerado por regras baseadas em evidência (frequência 2×/semana por grupo, 8+ séries semanais nos grupos grandes, RIR 1–3, dupla progressão).')}{' '}
          {t('Esta app não substitui avaliação médica nem de fisioterapia. Se sentires dor forte, tonturas ou dor no peito, para e procura ajuda.')}
        </p>
        <p className="secundario">{t('Sem anúncios, sem rastreio, sem servidor. Os vídeos são de terceiros (YouTube/Vimeo).')}</p>
        <p className="secundario">{t('Desenhos dos músculos: react-native-body-highlighter, © 2022 Hicham Elabbassi, licença MIT.')}</p>
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
      setEstado(t('Foto de perfil atualizada.'))
    } catch {
      setEstado(t('Não foi possível ler esta imagem.'))
    }
  }

  return (
    <div className="cartao">
      <h3>{t('Perfil')}</h3>
      <div className="linha" style={{ alignItems: 'center' }}>
        {dados.perfil.foto ? <img className="avatar grande" src={dados.perfil.foto} alt={t('Foto de perfil')} /> : <span className="avatar grande vazio" aria-hidden="true">👤</span>}
        <div style={{ flex: 3 }}>
          <button onClick={() => ficheiro.current?.click()}>{dados.perfil.foto ? t('Mudar foto') : t('Adicionar foto')}</button>
          {dados.perfil.foto && <button className="perigo" onClick={() => gravar({ foto: null })} style={{ marginLeft: 8 }}>{t('Remover')}</button>}
        </div>
      </div>
      <input ref={ficheiro} type="file" accept="image/*" hidden aria-label={t('Escolher foto de perfil')} onChange={(e) => { const f = e.target.files?.[0]; if (f) void escolherFoto(f); e.target.value = '' }} />
      <label htmlFor="perfil-nome">{t('Nome')}</label>
      <div className="linha">
        <input id="perfil-nome" maxLength={40} autoComplete="given-name" value={nome} onChange={(e) => setNome(e.target.value)} style={{ flex: 3 }} />
        <button onClick={async () => { await gravar({ nome }); setEstado(t('Nome guardado.')) }}>{t('Guardar')}</button>
      </div>
      {estado && <p role="status" className="secundario">{estado}</p>}
    </div>
  )
}
