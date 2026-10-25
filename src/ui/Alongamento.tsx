import { useState } from 'react'
import { db } from '../data/db'
import { alongamentoDoTreino, alongamentosDoGrupo, duracaoMin, exerciciosParaAlongar, lembreteAlongamento, REPETICOES, SEGUNDOS } from '../domain/alongamentos'
import { proximoTreino } from '../domain/sessao'
import { GRUPOS_MUSCULARES, NOMES_GRUPOS, type Alongamento, type Anamnese, type GrupoMuscular, type Plano } from '../domain/types'
import { lerVideo, pesquisaYoutube } from '../domain/video'
import { Corpo } from './Corpo'
import { agoraIso, alongamentos, catalogo, type Dados } from './dados'
import { ir } from './rota'
import { Temporizador } from './Temporizador'
import { VideoModal } from './Video'
import { t } from '../i18n'

type Modo = 'treino' | 'grupo'

/** F19: «Do treino» ou «Por grupo muscular». */
export function AlongamentoEcra({ dados, plano, anamnese, grupo }: { dados: Dados; plano: Plano; anamnese: Anamnese; grupo?: GrupoMuscular }) {
  const [modo, setModo] = useState<Modo>(grupo ? 'grupo' : 'treino')
  const [escolhido, setEscolhido] = useState<GrupoMuscular>(grupo ?? 'peito')
  const agora = agoraIso()
  const alvo = exerciciosParaAlongar(plano, dados.sessoes, agora, proximoTreino(plano, dados.sessoes).treinoId)
  const doTreino = alongamentoDoTreino(alvo.exercicioIds, catalogo, alongamentos, anamnese)
  const doGrupo = alongamentosDoGrupo(escolhido, alongamentos, anamnese)
  const lista = modo === 'treino' ? doTreino : doGrupo
  const pendente = lembreteAlongamento(dados.sessoes, agora)
  const gruposTreino = [...new Set(alvo.exercicioIds.map((id) => catalogo.get(id)?.grupoPrincipal).filter((g) => g !== undefined))].slice(0, 6)
  const semAlongamento = gruposTreino.filter((g) => !doTreino.some((a) => a.grupo === g))

  async function marcar(valor: 'feito' | 'dispensado') {
    if (!pendente) return
    await db.sessoes.update(pendente.id, { alongamento: valor })
    ir('/inicio')
  }

  return (
    <>
      <h1>{t('Alongar')}</h1>
      <p className="secundario">
        {t('Alongamento estático: vai até sentir tensão ligeira, nunca dor, e respira devagar. Melhora a flexibilidade; não evita as dores musculares do dia seguinte.')}
      </p>
      <div className="linha" role="radiogroup" aria-label={t('Tipo de alongamento')}>
        <button role="radio" aria-checked={modo === 'treino'} className={modo === 'treino' ? 'primario' : undefined} onClick={() => setModo('treino')}>{t('Do treino')}</button>
        <button role="radio" aria-checked={modo === 'grupo'} className={modo === 'grupo' ? 'primario' : undefined} onClick={() => setModo('grupo')}>{t('Por grupo muscular')}</button>
      </div>

      {modo === 'treino' ? (
        <p>
          <strong>{alvo.sessao ? t('Depois de {treino}', { treino: alvo.treinoNome }) : t('Para o próximo treino: {treino}', { treino: alvo.treinoNome })}</strong>
          {lista.length > 0 && ` · ~${duracaoMin(lista)} min`}
          {semAlongamento.length > 0 && <><br /><span className="secundario">{t('Sem alongamento seguro para: {grupos} (por causa das tuas restrições).', { grupos: semAlongamento.map((g) => NOMES_GRUPOS[g]).join(', ') })}</span></>}
        </p>
      ) : (
        <>
          <div className="grupos-escolha" role="radiogroup" aria-label={t('Grupo muscular')} style={{ marginTop: 12 }}>
            {GRUPOS_MUSCULARES.map((g) => (
              <button key={g} role="radio" aria-checked={escolhido === g} className={escolhido === g ? 'primario' : undefined} onClick={() => setEscolhido(g)}>{NOMES_GRUPOS[g]}</button>
            ))}
          </div>
          <Corpo ex={{ grupoPrincipal: escolhido, gruposSecundarios: [] }} sexo={anamnese.sexo} />
          {lista.length > 0 && <p><strong>{NOMES_GRUPOS[escolhido]}</strong> · ~{duracaoMin(lista)} min</p>}
        </>
      )}

      {lista.length === 0 && <p className="cartao aviso">{modo === 'treino' ? t('Não há alongamentos compatíveis com as tuas restrições para este treino.') : t('Não há alongamentos compatíveis com as tuas restrições para este grupo.')}</p>}
      {lista.map((a, i) => <CartaoAlongamento key={a.id} a={a} n={i + 1} dados={dados} anamnese={anamnese} />)}

      {modo === 'treino' && pendente && (
        <div className="linha" style={{ marginTop: 12 }}>
          <button className="primario" onClick={() => marcar('feito')}>{t('Alongamento feito')}</button>
          <button onClick={() => marcar('dispensado')}>{t('Hoje não')}</button>
        </div>
      )}
    </>
  )
}

function CartaoAlongamento({ a, n, dados, anamnese }: { a: Alongamento; n: number; dados: Dados; anamnese: Anamnese }) {
  const [fimEm, setFimEm] = useState<number | null>(null)
  const [verVideo, setVerVideo] = useState(false)
  const link = dados.videos[`alongamento:${a.id}`] ?? a.video
  const video = link ? lerVideo(link) : null

  async function mudarVideo() {
    const chave = `alongamento:${a.id}`
    const novo = prompt(t('Cola o link do vídeo (YouTube ou Vimeo). Deixa vazio para remover.'), dados.videos[chave] ?? '')
    if (novo === null) return
    const videos = { ...dados.videos }
    if (novo.trim() === '') delete videos[chave]
    else if (lerVideo(novo)) videos[chave] = novo.trim()
    else return alert(t('Link não aceite. Usa um link do YouTube ou do Vimeo.'))
    await db.gravar('videos', videos)
  }

  return (
    <section className="cartao" aria-labelledby={`al-${a.id}`}>
      <div className="alongamento-topo">
        <Corpo ex={{ grupoPrincipal: a.grupo, gruposSecundarios: a.gruposSecundarios }} sexo={anamnese.sexo} compacto />
        <div>
          <h3 id={`al-${a.id}`}>{n}. {a.nome}</h3>
          <p className="secundario">{REPETICOES} × {SEGUNDOS} s{a.lados === 2 ? ` ${t('por lado')}` : ''} · <span className="chip">{NOMES_GRUPOS[a.grupo]}</span></p>
        </div>
      </div>
      <ol>{a.passos.map((p) => <li key={p}>{p}</li>)}</ol>
      {a.cuidados.length > 0 && <p className="secundario">{a.cuidados.join('. ')}.</p>}
      {fimEm && <Temporizador fimEm={fimEm} fechar={() => setFimEm(null)} rotulos={[t('Manter'), a.lados === 2 ? t('Muda de lado') : t('Solta devagar')]} />}
      <div className="linha">
        <button className="primario" onClick={() => setFimEm(Date.now() + SEGUNDOS * 1000)}>{t('Manter {s} s', { s: SEGUNDOS })}</button>
        {video ? (
          <button onClick={() => setVerVideo(true)}>▶ {t('Ver vídeo')}</button>
        ) : (
          <a className="botao" href={pesquisaYoutube(`${t('alongamento')} ${a.nome}`, t('como fazer'))} target="_blank" rel="noopener noreferrer">{t('Procurar no YouTube')}</a>
        )}
        <button onClick={mudarVideo} aria-label={t('Mudar vídeo de {nome}', { nome: a.nome })}>{t('Mudar vídeo')}</button>
      </div>
      {verVideo && video && <VideoModal video={video} titulo={a.nome} fechar={() => setVerVideo(false)} />}
    </section>
  )
}

/** F19: aviso «Hora de alongar» depois de terminar um treino, no Início e no Hoje. */
export function LembreteAlongamento({ dados, anamnese }: { dados: Dados; anamnese: Anamnese }) {
  const s = lembreteAlongamento(dados.sessoes, agoraIso())
  if (!s) return null
  const feitos = s.exercicios.filter((e) => !e.saltado && e.series.length > 0).map((e) => e.exercicioId)
  const lista = alongamentoDoTreino(feitos, catalogo, alongamentos, anamnese)
  if (lista.length === 0) return null
  return (
    <div className="cartao ok-borda" role="region" aria-label={t('Lembrete de alongamento')}>
      <h3>{t('Hora de alongar')} 🧘</h3>
      <p className="secundario">{t('~{min} min para os músculos que treinaste: {grupos}.', { min: duracaoMin(lista), grupos: [...new Set(lista.map((a) => NOMES_GRUPOS[a.grupo]))].join(', ') })}</p>
      <div className="linha">
        <button className="primario" onClick={() => ir('/alongamento')}>{t('Alongar agora')}</button>
        <button onClick={() => db.sessoes.update(s.id, { alongamento: 'dispensado' })}>{t('Hoje não')}</button>
      </div>
    </div>
  )
}
