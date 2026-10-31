// F35.4 (v1.24): janela de parabéns ao terminar o treino.
import { useEffect, useRef } from 'react'
import { db } from '../data/db'
import type { Parabens } from '../domain/parabens'
import { t } from '../i18n'
import { catalogo } from './dados'
import { Janela } from './Janela'

export function JanelaParabens({ p, fechar }: { p: Parabens; fechar: () => void }) {
  const botao = useRef<HTMLButtonElement>(null)
  useEffect(() => botao.current?.focus(), [])
  return (
    <Janela rotulo={t('Parabéns')} fechar={fechar}>
      <div className="cartao parabens">
        <h2>{p.titulo}</h2>
        <p>
          {p.series === 1
            ? p.minutos === undefined ? t('1 série registada.') : t('1 série registada em {min} min.', { min: p.minutos })
            : p.minutos === undefined ? t('{n} séries registadas.', { n: p.series }) : t('{n} séries registadas em {min} min.', { n: p.series, min: p.minutos })}
        </p>
        {p.metaSemanal && <p>🎯 {t('Cumpriste a meta de treinos desta semana.')}</p>}
        {p.recordes.length > 0 && (
          <>
            <p>🏆 {p.recordes.length === 1 ? t('Recorde pessoal:') : t('{n} recordes pessoais:', { n: p.recordes.length })}</p>
            <ul>{p.recordes.map((id) => <li key={id}>{catalogo.get(id)?.nome ?? id}</li>)}</ul>
          </>
        )}
        {p.conquistas.length > 0 && (
          <>
            <p>{p.conquistas.length === 1 ? t('Nova conquista:') : t('Novas conquistas:')}</p>
            <ul className="lista-simples">{p.conquistas.map((c) => <li key={c.nome}><span aria-hidden="true">{c.icone}</span> {c.nome}</li>)}</ul>
          </>
        )}
        <button ref={botao} className="primario largo" onClick={fechar}>{t('Continuar')}</button>
        <p className="secundario" style={{ marginTop: 8 }}>{t('Podes desligar estas mensagens em Mais.')}</p>
      </div>
    </Janela>
  )
}

/** F35.4: opção em «Mais». */
export function CartaoParabens({ ligado }: { ligado: boolean }) {
  return (
    <div className="cartao">
      <h3>{t('Mensagens de parabéns')}</h3>
      <label className="opcao">
        <input type="checkbox" checked={ligado} onChange={(e) => db.gravar('parabens', e.target.checked)} /> {t('Mostrar parabéns ao terminar um treino e ao alcançar metas')}
      </label>
    </div>
  )
}
