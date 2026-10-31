import { describe, expect, it, vi } from 'vitest'
import { corpoReporte, enviarReporte, ENDERECO_ENVIO, MOTIVOS, podeEnviar, validarReporte, type Reporte } from './reporte'

const base: Reporte = { tipo: 'exercicio', motivo: 'video-incorreto', texto: '', email: '', contexto: { id: 'supino-halteres', nome: 'Supino com halteres' }, video: 'https://youtu.be/abc' }

describe('F34 reportar ou sugerir', () => {
  it('F34.2 motivos por tipo, com «outro» em todos', () => {
    expect(MOTIVOS.exercicio).toEqual(['video-incorreto', 'video-pouco-explicativo', 'instrucao-pouco-clara', 'exercicio-desadequado', 'outro'])
    expect(MOTIVOS.treino).toContain('duracao-volume')
    expect(MOTIVOS.geral).toEqual(['sugestao', 'erro-app', 'traducao', 'outro'])
  })

  it('F34.2 motivo obrigatório e do tipo certo; descrição obrigatória em outro, sugestão e erro; máximo 1000; email válido', () => {
    expect(validarReporte({ ...base, motivo: undefined })).toBe('motivo')
    expect(validarReporte({ ...base, motivo: 'sugestao' })).toBe('motivo')
    expect(validarReporte(base)).toBeNull()
    expect(validarReporte({ ...base, motivo: 'outro', texto: '   ' })).toBe('texto-obrigatorio')
    expect(validarReporte({ ...base, tipo: 'geral', motivo: 'sugestao', texto: '' })).toBe('texto-obrigatorio')
    expect(validarReporte({ ...base, tipo: 'geral', motivo: 'erro-app', texto: 'O botão não responde' })).toBeNull()
    expect(validarReporte({ ...base, texto: 'a'.repeat(1001) })).toBe('texto-longo')
    expect(validarReporte({ ...base, texto: 'a'.repeat(1000) })).toBeNull()
    expect(validarReporte({ ...base, email: 'nao-e-email' })).toBe('email')
    expect(validarReporte({ ...base, email: ' ana@exemplo.pt ' })).toBeNull()
  })

  it('F34.3 envia só motivo, descrição, contexto, vídeo nos motivos de vídeo, versão e idioma; nada mais (lista fechada de campos)', () => {
    const corpo = corpoReporte({ ...base, texto: ' Mostra outro exercício ', email: 'ana@exemplo.pt' }, '1.23.0', 'en', 'chave')
    expect(corpo).toEqual({
      access_key: 'chave',
      subject: 'App de treino · Vídeo incorreto · Supino com halteres',
      from_name: 'App de treino',
      tipo: 'exercicio',
      motivo: 'Vídeo incorreto',
      descricao: 'Mostra outro exercício',
      sobre: 'Supino com halteres (supino-halteres)',
      video: 'https://youtu.be/abc',
      replyto: 'ana@exemplo.pt',
      versao: '1.23.0',
      idioma: 'en',
      botcheck: '',
    })
    const semVideo = corpoReporte({ ...base, motivo: 'instrucao-pouco-clara' }, '1.23.0', 'pt', 'chave')
    expect(semVideo.video).toBeUndefined()
    expect(semVideo.replyto).toBeUndefined()
    expect(corpoReporte({ tipo: 'geral', motivo: 'sugestao', texto: 'Modo escuro', email: '' }, '1.23.0', 'pt', 'k').sobre).toBeUndefined()
  })

  it('F34.4 envio por POST em JSON; sucesso só com confirmação do serviço; rede em baixo conta como falha', async () => {
    const ok = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }))
    expect(await enviarReporte({ a: '1' }, ok as typeof fetch)).toBe(true)
    expect(ok).toHaveBeenCalledWith(ENDERECO_ENVIO, expect.objectContaining({ method: 'POST', body: '{"a":"1"}' }))
    expect(await enviarReporte({}, (async () => new Response(JSON.stringify({ success: false }), { status: 200 })) as typeof fetch)).toBe(false)
    expect(await enviarReporte({}, (async () => new Response('', { status: 429 })) as typeof fetch)).toBe(false)
    expect(await enviarReporte({}, (async () => { throw new TypeError('offline') }) as typeof fetch)).toBe(false)
  })

  it('F34.4 intervalo mínimo de 60 s entre envios', () => {
    expect(podeEnviar(undefined, 0)).toBe(true)
    expect(podeEnviar(1000, 60_999)).toBe(false)
    expect(podeEnviar(1000, 61_000)).toBe(true)
  })
})
