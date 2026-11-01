import { useState } from 'react'
import { conquistas, conquistasVisiveis, recordesPessoais, sequenciaSemanal, volumeSessao } from '../domain/conquistas'
import { fraseDoDia } from '../domain/frases'
import { saudacao } from '../domain/perfil'
import { horasTreino, inicioMes, tendenciaPeso, treinosEntre } from '../domain/painel'
import { semanaDoPlano, treinoEfetivo } from '../domain/plano'
import { aderencia, inicioSemana } from '../domain/relatorios'
import { proximoTreino } from '../domain/sessao'
import type { Anamnese, Plano, Sessao } from '../domain/types'
import { decimal, peso as textoPeso } from '../domain/unidades'
import type { Dados } from './dados'
import { LembreteAlongamento } from './Alongamento'
import { NovidadesInicio } from './Atualizacao'
import { textoFase, TrocasProximoBloco } from './Fase'
import { ir } from './rota'
import { BotaoCardio } from './Cardio'
import { CartaoProgramaCardio } from './ProgramasCardio'
import { CartaoPosParto } from './PosParto'
import { t } from '../i18n'

const somaDias = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const horas = (h: number) => `${decimal(Math.round(h * 10) / 10)} h`
const volumeEntre = (sessoes: Sessao[], ini: Date, fim: Date) =>
  sessoes.filter((s) => Date.parse(s.inicio) >= ini.getTime() && Date.parse(s.inicio) < fim.getTime()).reduce((t, s) => t + volumeSessao(s), 0)

function Indicador({ valor, nome }: { valor: string; nome: string }) {
  return (
    <div className="indicador">
      <span className="valor">{valor}</span>
      <span className="secundario">{nome}</span>
    </div>
  )
}

export function Inicio({ dados, plano, anamnese }: { dados: Dados; plano: Plano; anamnese: Anamnese }) {
  const agora = new Date()
  const meta = anamnese.diasPorSemana
  const semanaIni = inicioSemana(agora)
  const semanaFim = somaDias(semanaIni, 7)
  const anteriorIni = somaDias(semanaIni, -7)
  const mesIni = inicioMes(agora)
  const mesFim = new Date(mesIni.getFullYear(), mesIni.getMonth() + 1, 1)
  const s = dados.sessoes

  const treinosSemana = treinosEntre(s, semanaIni, semanaFim)
  const volume = volumeEntre(s, semanaIni, semanaFim)
  const volumeAnterior = volumeEntre(s, anteriorIni, semanaIni)
  const variacao = volumeAnterior > 0 ? Math.round(((volume - volumeAnterior) / volumeAnterior) * 100) : null
  const recordesMes = recordesPessoais(s).filter((r) => Date.parse(r.data) >= mesIni.getTime()).length
  const sequencia = sequenciaSemanal(s, meta, agora)
  const ad = aderencia(s, meta, agora)
  const peso = tendenciaPeso(dados.medicoes)
  const lista = conquistas(s, plano, meta, agora)
  const [todas, setTodas] = useState(false)
  const visiveis = conquistasVisiveis(lista)
  const obtidas = lista.filter((c) => c.obtida).length
  const semana = semanaDoPlano(plano, agora.toISOString())
  const frase = fraseDoDia(agora)
  const proximo = treinoEfetivo(plano.treinos.find((t) => t.id === proximoTreino(plano, s).treinoId) ?? plano.treinos[0]!, plano, semana)

  return (
    <>
      <div className="saudacao">
        {dados.perfil.foto && <img className="avatar" src={dados.perfil.foto} alt="" />}
        <h1>{saudacao(agora, dados.perfil.nome)}</h1>
      </div>
      <figure className="frase">
        <blockquote>“{frase.texto}”</blockquote>
        {frase.autor && <figcaption>{frase.autor}</figcaption>}
      </figure>

      <NovidadesInicio dados={dados} />
      <LembreteAlongamento dados={dados} anamnese={anamnese} />
      {/* F37.5: num plano só de cardio, o programa vem antes do treino de força. */}
      {dados.programaCardio?.soCardio && <CartaoProgramaCardio dados={dados} />}
      <CartaoPosParto dados={dados} />
      <button className="cartao proximo" onClick={() => ir('/hoje')}>
        <span className="secundario">{t('Próximo treino')}</span>
        <span className="titulo">{proximo.nome} · ~{proximo.duracaoEstimadaMin} min</span>
        <span className="secundario">{textoFase(plano, semana)}</span>
      </button>
      <TrocasProximoBloco plano={plano} semana={semana} />
      {dados.programaCardio && !dados.programaCardio.soCardio && <CartaoProgramaCardio dados={dados} />}
      <div className="linha">
        <button onClick={() => ir('/alongamento')}>🧘 {t('Alongamentos')}</button>
        <BotaoCardio largo={false} />
      </div>

      <h2>{t('Esta semana')}</h2>
      <div className="cartao indicadores">
        <Indicador valor={`${treinosSemana}/${meta}`} nome={t('treinos')} />
        <Indicador valor={horas(horasTreino(s, semanaIni, semanaFim))} nome={t('de treino')} />
        <Indicador valor={variacao === null ? '–' : `${variacao > 0 ? '+' : ''}${variacao}%`} nome={t('volume vs anterior')} />
      </div>

      <h2>{t('Este mês')}</h2>
      <div className="cartao indicadores">
        <Indicador valor={String(treinosEntre(s, mesIni, mesFim))} nome={t('treinos')} />
        <Indicador valor={horas(horasTreino(s, mesIni, mesFim))} nome={t('de treino')} />
        <Indicador valor={String(recordesMes)} nome={recordesMes === 1 ? t('recorde') : t('recordes')} />
      </div>

      <h2>{t('Constância')}</h2>
      <div className="cartao indicadores">
        <Indicador valor={`🔥 ${sequencia}`} nome={sequencia === 1 ? t('semana seguida') : t('semanas seguidas')} />
        <Indicador valor={`${Math.round((ad.feitas / ad.planeadas) * 100)}%`} nome={t('aderência 4 semanas')} />
        <Indicador valor={peso === null ? '–' : `${peso > 0 ? '+' : ''}${textoPeso(peso)}`} nome={t('peso em 4 semanas')} />
      </div>

      <h2>{t('Conquistas')} <span className="secundario">{t('{n} de {total}', { n: obtidas, total: lista.length })}</span></h2>
      {/* F33.3: as obtidas e as 3 seguintes por obter; as restantes com «Ver todas». */}
      <ul className="conquistas">
        {lista.filter((c) => todas || visiveis.has(c.id)).map((c) => (
          <li key={c.id} className={c.obtida ? 'obtida' : undefined} title={c.descricao}>
            <span aria-hidden="true">{c.icone}</span>
            <span>{c.nome}</span>
            <span className="visualmente-oculto">{c.obtida ? t('obtida') : t('por obter')}: {c.descricao}</span>
          </li>
        ))}
      </ul>
      {visiveis.size < lista.length && (
        <button className="largo" style={{ marginTop: 8 }} aria-expanded={todas} onClick={() => setTodas(!todas)}>
          {todas ? t('Ver menos') : t('Ver todas ({n})', { n: lista.length })}
        </button>
      )}
    </>
  )
}
