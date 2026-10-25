import { useEffect, useState } from 'react'
import { db } from '../data/db'
import { novidadesPorVer, type NovidadesVersao } from '../domain/novidades'
import { atualizar, novidades, novidadesDaVersaoNova, procurarAtualizacao, useAtualizacaoPronta, VERSAO, type Procura } from './versao'
import { dataCurta, type Dados } from './dados'

function ListaNovidades({ versoes }: { versoes: NovidadesVersao[] }) {
  return (
    <>
      {versoes.map((v) => (
        <div key={v.versao}>
          {versoes.length > 1 && <p className="secundario" style={{ marginBottom: 0 }}><strong>Versão {v.versao}</strong> · {dataCurta(v.data)}</p>}
          <ul>{v.itens.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
      ))}
    </>
  )
}

/** F20: aviso no topo quando há versão nova descarregada. «Depois» esconde-o até a app voltar a abrir. */
export function AvisoAtualizacao() {
  const pronta = useAtualizacaoPronta()
  const [adiado, setAdiado] = useState(false)
  const [resumo, setResumo] = useState<NovidadesVersao[] | null>(null)

  useEffect(() => {
    if (pronta) novidadesDaVersaoNova().then(setResumo)
  }, [pronta])

  if (!pronta || adiado) return null
  const titulo = resumo?.[0] ? `Nova versão disponível: ${resumo[0].versao}` : 'Nova versão disponível'
  return (
    <div className="cartao ok-borda" role="region" aria-label="Nova versão">
      <h3>{titulo}</h3>
      {resumo && resumo.length > 0 ? <ListaNovidades versoes={resumo} /> : <p className="secundario">Correções e melhorias.</p>}
      <p className="secundario">Os teus dados ficam no telemóvel; a app só recarrega.</p>
      <div className="linha">
        <button className="primario" onClick={atualizar}>Atualizar agora</button>
        <button onClick={() => setAdiado(true)}>Depois</button>
      </div>
    </div>
  )
}

/** F20: depois de atualizar, o Início mostra uma vez as novidades ainda não vistas. */
export function NovidadesInicio({ dados }: { dados: Dados }) {
  const lista = novidadesPorVer(novidades, dados.versaoVista, !!dados.plano)
  if (lista.length === 0) return null
  return (
    <div className="cartao ok-borda" role="region" aria-label="Novidades">
      <h3>Novidades da versão {VERSAO} ✨</h3>
      <ListaNovidades versoes={lista} />
      <button onClick={() => db.gravar('versaoVista', VERSAO)}>Fechar</button>
    </div>
  )
}

const MENSAGENS: Record<Procura, string> = {
  pronta: 'Nova versão pronta.',
  atual: 'Já tens a versão mais recente.',
  'sem-ligacao': 'Sem ligação à internet. Tenta mais tarde.',
  indisponivel: 'As atualizações só funcionam na app publicada.',
}

/** F20: cartão «Atualizações» em Mais. */
export function CartaoAtualizacoes() {
  const pronta = useAtualizacaoPronta()
  const [estado, setEstado] = useState<'' | 'a-procurar' | Procura>('')

  async function procurar() {
    setEstado('a-procurar')
    setEstado(await procurarAtualizacao())
  }

  return (
    <div className="cartao">
      <h3>Atualizações</h3>
      <p>Versão instalada: <strong>{VERSAO}</strong></p>
      <div className="linha">
        {pronta ? (
          <button className="primario" onClick={atualizar}>Atualizar agora</button>
        ) : (
          <button onClick={procurar} disabled={estado === 'a-procurar'}>{estado === 'a-procurar' ? 'A procurar…' : 'Procurar atualizações'}</button>
        )}
      </div>
      {estado && estado !== 'a-procurar' && <p role="status" className="secundario">{pronta ? MENSAGENS.pronta : MENSAGENS[estado]}</p>}
      {novidades.emPreparacao.length > 0 && (
        <>
          <h4>Em preparação</h4>
          <ul className="secundario">{novidades.emPreparacao.map((i) => <li key={i}>{i}</li>)}</ul>
        </>
      )}
      <details>
        <summary>Novidades de cada versão</summary>
        {novidades.versoes.map((v) => (
          <div key={v.versao}>
            <p style={{ marginBottom: 0 }}><strong>{v.versao}</strong> · <span className="secundario">{dataCurta(v.data)}</span></p>
            <ul className="secundario">{v.itens.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        ))}
      </details>
    </div>
  )
}
