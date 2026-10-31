// F34 (v1.23): reportar um problema ou deixar uma sugestão, enviado por um serviço de formulários.
import { m, traduzido } from '../i18n'

/**
 * Chave pública do Web3Forms (F34.4). Não é um segredo: só permite enviar mensagens para o
 * endereço guardado na conta do serviço, que nunca aparece na app nem no repositório.
 * Vazia = reportes não ativos (F34.4).
 */
export const CHAVE_REPORTES = '3200393b-c8d7-416d-b35d-5e13c34b4e7d'
/** A chave em uso. Os testes ponta a ponta constroem a app com VITE_CHAVE_REPORTES e intercetam o envio. */
export const chaveReportes = (): string => (import.meta.env.VITE_CHAVE_REPORTES as string | undefined) || CHAVE_REPORTES
export const ENDERECO_ENVIO = 'https://api.web3forms.com/submit'
export const MAX_TEXTO = 1000
export const INTERVALO_MIN_MS = 60_000

export const TIPOS_REPORTE = ['exercicio', 'treino', 'geral'] as const
export type TipoReporte = (typeof TIPOS_REPORTE)[number]

export type Motivo =
  | 'video-incorreto'
  | 'video-pouco-explicativo'
  | 'instrucao-pouco-clara'
  | 'exercicio-desadequado'
  | 'duracao-volume'
  | 'exercicio-em-falta'
  | 'sugestao'
  | 'erro-app'
  | 'traducao'
  | 'outro'

/** F34.2: motivos por tipo, pela ordem em que aparecem. */
export const MOTIVOS: Record<TipoReporte, readonly Motivo[]> = {
  exercicio: ['video-incorreto', 'video-pouco-explicativo', 'instrucao-pouco-clara', 'exercicio-desadequado', 'outro'],
  treino: ['instrucao-pouco-clara', 'duracao-volume', 'exercicio-em-falta', 'outro'],
  geral: ['sugestao', 'erro-app', 'traducao', 'outro'],
}

const NOMES_PT: Record<Motivo, string> = {
  'video-incorreto': m('Vídeo incorreto'),
  'video-pouco-explicativo': m('Vídeo pouco explicativo'),
  'instrucao-pouco-clara': m('Instrução pouco clara'),
  'exercicio-desadequado': m('Exercício desadequado para mim'),
  'duracao-volume': m('Duração ou volume desadequado'),
  'exercicio-em-falta': m('Exercício em falta ou a mais'),
  sugestao: m('Sugestão'),
  'erro-app': m('Erro na app'),
  traducao: m('Tradução incorreta'),
  outro: m('Outro'),
}
/** Nomes dos motivos no idioma atual. */
export const NOMES_MOTIVOS = traduzido(NOMES_PT)

const COM_TEXTO: readonly Motivo[] = ['outro', 'sugestao', 'erro-app']
const DE_VIDEO: readonly Motivo[] = ['video-incorreto', 'video-pouco-explicativo']

export interface Reporte {
  tipo: TipoReporte
  motivo?: Motivo
  texto: string
  email: string
  /** Exercício ou treino a que o reporte se refere. */
  contexto?: { id: string; nome: string }
  /** Link do vídeo atual do exercício, enviado só nos motivos de vídeo. */
  video?: string
}

export type ErroReporte = 'motivo' | 'texto-obrigatorio' | 'texto-longo' | 'email'

export const textoObrigatorio = (motivo?: Motivo) => !!motivo && COM_TEXTO.includes(motivo)

/** F34.2: o primeiro problema do formulário, ou null se pode ser enviado. */
export function validarReporte(r: Reporte): ErroReporte | null {
  if (!r.motivo || !MOTIVOS[r.tipo].includes(r.motivo)) return 'motivo'
  const texto = r.texto.trim()
  if (textoObrigatorio(r.motivo) && !texto) return 'texto-obrigatorio'
  if (texto.length > MAX_TEXTO) return 'texto-longo'
  const email = r.email.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'email'
  return null
}

/**
 * F34.3/F34.4: o que é enviado ao serviço. Só estes campos: nunca anamnese, medições,
 * fotos, registos nem o nome do perfil. Os nomes dos motivos vão em português, para quem lê.
 */
export function corpoReporte(r: Reporte, versao: string, idioma: string, chave: string): Record<string, string> {
  const motivo = NOMES_PT[r.motivo!]
  const sobre = r.contexto ? `${r.contexto.nome} (${r.contexto.id})` : ''
  const corpo: Record<string, string> = {
    access_key: chave,
    subject: `App de treino · ${motivo}${r.contexto ? ` · ${r.contexto.nome}` : ''}`,
    from_name: 'App de treino',
    tipo: r.tipo,
    motivo,
    descricao: r.texto.trim(),
    versao,
    idioma,
    botcheck: '',
  }
  if (sobre) corpo.sobre = sobre
  if (r.video && DE_VIDEO.includes(r.motivo!)) corpo.video = r.video
  const email = r.email.trim()
  if (email) corpo.replyto = email
  return corpo
}

/** F34.4: true se o serviço confirmou a receção. Erros de rede contam como falha. */
export async function enviarReporte(corpo: Record<string, string>, enviar: typeof fetch = fetch): Promise<boolean> {
  try {
    const resposta = await enviar(ENDERECO_ENVIO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(corpo),
    })
    if (!resposta.ok) return false
    const json = (await resposta.json()) as { success?: boolean }
    return json.success === true
  } catch {
    return false
  }
}

/** F34.4: intervalo mínimo entre envios. */
export const podeEnviar = (ultimoEnvio: number | undefined, agora: number) => ultimoEnvio === undefined || agora - ultimoEnvio >= INTERVALO_MIN_MS
