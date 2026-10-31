// F31.4 (v1.20): os exercícios de calistenia por nível de dificuldade geral e, dentro de cada nível, por escada.
import { useState } from 'react'
import { escadas } from '../domain/escadas'
import { NIVEIS, NOMES_AREAS, NOMES_NIVEIS, type Exercicio } from '../domain/types'
import { lerVideo, pesquisaYoutube } from '../domain/video'
import { t } from '../i18n'
import { AvisoResponsabilidade } from './AvisoResponsabilidade'
import { Corpo } from './Corpo'
import { catalogo, type Dados } from './dados'
import { ir } from './rota'
import { VideoModal } from './Video'

interface Item { ex: Exercicio; escada: string; degrau: number; total: number }

export function CalisteniaEcra({ dados }: { dados: Dados }) {
  const itens: Item[] = escadas().flatMap((e) =>
    e.degraus.flatMap((id, i) => {
      const ex = catalogo.get(id)
      return ex?.nivel ? [{ ex, escada: e.nome, degrau: i + 1, total: e.degraus.length }] : []
    }),
  )
  return (
    <>
      <button onClick={() => ir('/mais')} style={{ marginTop: 12 }}>‹ {t('Mais')}</button>
      <h1>{t('Calistenia')}</h1>
      <p className="secundario">{t('Exercícios por nível de dificuldade geral e, em cada nível, pela escada a que pertencem. O nível é uma orientação, não um diagnóstico.')}</p>
      {NIVEIS.map((n) => (
        <section key={n}>
          <h2>{NOMES_NIVEIS[n]}</h2>
          {itens.filter((x) => x.ex.nivel === n).map((x) => <ExercicioCalistenia key={x.ex.id} item={x} dados={dados} />)}
        </section>
      ))}
      <AvisoResponsabilidade />
    </>
  )
}

function ExercicioCalistenia({ item: { ex, escada, degrau, total }, dados }: { item: Item; dados: Dados }) {
  const [verVideo, setVerVideo] = useState(false)
  const link = dados.videos[ex.id] ?? ex.video
  const video = link ? lerVideo(link) : null
  return (
    <details className="cartao">
      <summary>
        <strong>{ex.nome}</strong>
        <br />
        <span className="secundario">{t('{escada}, degrau {n} de {total}', { escada, n: degrau, total })}</span>
      </summary>
      <Corpo ex={ex} sexo={dados.anamnese?.sexo} />
      <p>{ex.objetivo}</p>
      <ul>{ex.pontosChave.map((k) => <li key={k}>{k}</li>)}</ul>
      {ex.contraindicacoes.length > 0 && <p className="secundario">{t('Cuidado se tiveres dor em: {zonas}.', { zonas: ex.contraindicacoes.map((a) => NOMES_AREAS[a]).join(', ') })}</p>}
      {video ? (
        <button onClick={() => setVerVideo(true)}>▶ {t('Ver vídeo')}</button>
      ) : (
        <a className="botao" href={pesquisaYoutube(ex.nome)} target="_blank" rel="noopener noreferrer">{t('Procurar no YouTube')}</a>
      )}
      {verVideo && video && <VideoModal video={video} titulo={ex.nome} fechar={() => setVerVideo(false)} />}
    </details>
  )
}
