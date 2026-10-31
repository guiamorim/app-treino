import { EQUIPAMENTOS_ESCOLHA } from '../domain/plano'
import type { Equipamento } from '../domain/types'
import { m, t, traduzido } from '../i18n'

// F28.1 (v1.17): equipamento que se pode marcar.
export const NOMES_EQUIPAMENTO: Record<(typeof EQUIPAMENTOS_ESCOLHA)[number], string> = traduzido({
  barra: m('Barra com discos e suporte'),
  halteres: m('Halteres'),
  'barra-fixa': m('Barra fixa (elevações)'),
  paralelas: m('Paralelas ou argolas'),
  maquina: m('Máquinas de musculação'),
  cabo: m('Polias (cabos)'),
  elasticos: m('Elásticos de resistência'),
  caneleiras: m('Caneleiras'),
})

/** F28.1 e F29.1: lista de equipamento com os atalhos «Ginásio completo» e «Só o peso do corpo». */
export function ListaEquipamento({ valor, mudar, titulo, nome }: { valor: Equipamento[]; mudar: (v: Equipamento[]) => void; titulo: string; nome: string }) {
  const alternar = (q: Equipamento) => mudar(valor.includes(q) ? valor.filter((y) => y !== q) : EQUIPAMENTOS_ESCOLHA.filter((y) => y === q || valor.includes(y)))
  return (
    <fieldset className="equipamento">
      <legend>{titulo}</legend>
      <p className="secundario">{t('O peso do corpo conta sempre. Marca o que tens onde treinas.')}</p>
      <div className="linha">
        <button type="button" onClick={() => mudar([...EQUIPAMENTOS_ESCOLHA])}>{t('Ginásio completo')}</button>
        <button type="button" onClick={() => mudar([])}>{t('Só o peso do corpo')}</button>
      </div>
      {EQUIPAMENTOS_ESCOLHA.map((q) => (
        <label key={q} className="opcao"><input type="checkbox" name={nome} checked={valor.includes(q)} onChange={() => alternar(q)} /> {NOMES_EQUIPAMENTO[q]}</label>
      ))}
    </fieldset>
  )
}
