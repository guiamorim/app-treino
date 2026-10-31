// F34 (v1.23): reportar um problema ou deixar uma sugestão, sem mostrar o endereço de destino.
import { useState } from 'react'
import { chaveReportes, corpoReporte, enviarReporte, MAX_TEXTO, MOTIVOS, NOMES_MOTIVOS, podeEnviar, textoObrigatorio, validarReporte, type ErroReporte, type Motivo, type TipoReporte } from '../domain/reporte'
import { idiomaAtual, t } from '../i18n'
import { catalogo, type Dados } from './dados'
import { ir } from './rota'
import { VERSAO } from './versao'

const ERROS: Record<ErroReporte, () => string> = {
  motivo: () => t('Escolhe um motivo.'),
  'texto-obrigatorio': () => t('Descreve o problema ou a sugestão.'),
  'texto-longo': () => t('A descrição tem no máximo {n} caracteres.', { n: MAX_TEXTO }),
  email: () => t('O email não parece válido.'),
}

/** Volta ao ecrã anterior; se o reporte foi aberto diretamente, vai para «Mais». */
const voltar = () => (history.length > 1 ? history.back() : ir('/mais'))

// Fora do componente: o intervalo mínimo vale mesmo que a pessoa saia e volte ao ecrã.
let ultimoEnvio: number | undefined

/** F34.1: botão pequeno nos ecrãs do exercício e do treino. */
export function BotaoReportar({ tipo, id }: { tipo: 'exercicio' | 'treino'; id: string }) {
  return (
    <button className="largo reportar" onClick={() => ir(`/reportar/${tipo}/${encodeURIComponent(id)}`)}>
      {tipo === 'exercicio' ? t('Reportar um problema neste exercício') : t('Reportar um problema neste treino')}
    </button>
  )
}

export function ReportarEcra({ dados, tipo, id }: { dados: Dados; tipo: TipoReporte; id?: string }) {
  const [motivo, setMotivo] = useState<Motivo>()
  const [texto, setTexto] = useState('')
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [estado, setEstado] = useState<'' | 'a-enviar' | 'enviado'>('')
  const chave = chaveReportes()

  const exercicio = tipo === 'exercicio' && id ? catalogo.get(id) : undefined
  const treino = tipo === 'treino' && id ? dados.plano?.treinos.find((x) => x.id === id) : undefined
  const contexto = exercicio ? { id: exercicio.id, nome: exercicio.nome } : treino ? { id: treino.id, nome: treino.nome } : undefined
  // Um endereço com um exercício ou treino que já não existe passa a reporte geral.
  const tipoEfetivo: TipoReporte = contexto ? tipo : 'geral'
  const video = exercicio ? (dados.videos[exercicio.id] ?? exercicio.video) : undefined

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const reporte = { tipo: tipoEfetivo, motivo, texto, email, contexto, video }
    const problema = validarReporte(reporte)
    if (problema) return setErro(ERROS[problema]())
    if (!podeEnviar(ultimoEnvio, Date.now())) return setErro(t('Acabaste de enviar um reporte. Espera um minuto antes de enviar outro.'))
    setErro('')
    setEstado('a-enviar')
    const ok = await enviarReporte(corpoReporte(reporte, VERSAO, idiomaAtual(), chave))
    if (!ok) {
      setEstado('')
      return setErro(t('Não foi possível enviar. Verifica a ligação à internet e tenta de novo; o texto fica guardado neste ecrã.'))
    }
    ultimoEnvio = Date.now()
    setEstado('enviado')
    setMotivo(undefined)
    setTexto('')
    setEmail('')
  }

  return (
    <>
      <button onClick={voltar} style={{ marginTop: 12 }}>‹ {t('Voltar')}</button>
      <h1>{t('Reportar ou sugerir')}</h1>
      {contexto && <p><strong>{tipoEfetivo === 'exercicio' ? t('Exercício') : t('Treino')}:</strong> {contexto.nome}</p>}
      {!contexto && <p className="secundario">{t('Encontraste um erro ou tens uma ideia para melhorar a app? Conta-nos aqui.')}</p>}
      {!chave && <p className="cartao aviso">{t('Os reportes ainda não estão ativos nesta versão.')}</p>}
      {estado === 'enviado' && (
        <p className="cartao" role="status">{t('Obrigado! O reporte foi enviado.')} <a href="#/inicio" onClick={(e) => { e.preventDefault(); voltar() }}>{t('Voltar')}</a></p>
      )}
      <form className="cartao" onSubmit={enviar} noValidate>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, padding: 0 }}>{t('Motivo')}</legend>
          {MOTIVOS[tipoEfetivo].map((x) => (
            <label key={x} className="opcao">
              <input type="radio" name="motivo" checked={motivo === x} onChange={() => { setMotivo(x); setEstado('') }} /> {NOMES_MOTIVOS[x]}
            </label>
          ))}
        </fieldset>
        <label htmlFor="reporte-texto">{textoObrigatorio(motivo) ? t('Descrição') : t('Descrição (opcional)')}</label>
        <textarea id="reporte-texto" rows={5} maxLength={MAX_TEXTO} value={texto} onChange={(e) => setTexto(e.target.value)} />
        <p className="secundario" style={{ margin: '4px 0 0', textAlign: 'right' }}>{texto.length}/{MAX_TEXTO}</p>
        <label htmlFor="reporte-email">{t('O teu email, se quiseres resposta (opcional)')}</label>
        <input id="reporte-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <p className="secundario">
          {t('Enviamos só o motivo, a descrição, o email se o indicares, o exercício ou o treino, o link do vídeo (nos motivos de vídeo), a versão da app e o idioma. Nunca os teus dados de saúde, medições, fotos ou registos de treino.')}
        </p>
        {erro && <p role="alert" style={{ color: 'var(--perigo)' }}>{erro}</p>}
        <button type="submit" className="primario largo" disabled={!chave || estado === 'a-enviar'}>
          {estado === 'a-enviar' ? t('A enviar…') : t('Enviar')}
        </button>
      </form>
      {tipoEfetivo !== 'geral' && <button className="largo" onClick={() => ir('/reportar')}>{t('Fazer uma sugestão geral')}</button>}
    </>
  )
}
