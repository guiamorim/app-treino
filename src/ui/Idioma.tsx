import { db } from '../data/db'
import { barrasKg } from '../domain/carga'
import { peso, UNIDADES, type UnidadePeso } from '../domain/unidades'
import { IDIOMAS, NOMES_IDIOMAS, t, type Idioma } from '../i18n'

/** F21: idioma da app; fica guardado só neste dispositivo. */
export function CartaoIdioma({ idioma }: { idioma: Idioma }) {
  return (
    <div className="cartao">
      <h3 id="titulo-idioma" lang="pt">Idioma · <span lang="en">Language</span></h3>
      <div className="linha" role="radiogroup" aria-labelledby="titulo-idioma">
        {IDIOMAS.map((i) => (
          <button key={i} role="radio" aria-checked={idioma === i} lang={i} className={idioma === i ? 'primario' : undefined} onClick={() => db.gravar('idioma', i)}>
            {NOMES_IDIOMAS[i]}
          </button>
        ))}
      </div>
    </div>
  )
}

/** F22.9: quilos ou libras; fica guardado só neste dispositivo. Os dados continuam em quilos. */
export function CartaoUnidade({ unidade }: { unidade: UnidadePeso }) {
  return (
    <div className="cartao">
      <h3 id="titulo-unidade">{t('Quilos ou libras')}</h3>
      <div className="linha" role="radiogroup" aria-labelledby="titulo-unidade">
        {UNIDADES.map((u) => (
          <button key={u} role="radio" aria-checked={unidade === u} className={unidade === u ? 'primario' : undefined} onClick={() => db.gravar('unidade', u)}>
            {u === 'kg' ? t('Quilos (kg)') : t('Libras (lb)')}
          </button>
        ))}
      </div>
    </div>
  )
}

/** F24.4: peso da barra para «Discos por lado» (guardado em quilos). */
export function CartaoBarra({ barraKg, unidade }: { barraKg: number; unidade: UnidadePeso }) {
  return (
    <div className="cartao">
      <h3 id="titulo-barra">{t('Peso da barra')}</h3>
      <p className="secundario">{t('Usado quando escreves os discos de cada lado.')}</p>
      <div className="linha" role="radiogroup" aria-labelledby="titulo-barra">
        {barrasKg(unidade).map((b) => (
          <button key={b} role="radio" aria-checked={Math.abs(barraKg - b) < 0.01} className={Math.abs(barraKg - b) < 0.01 ? 'primario' : undefined} onClick={() => db.gravar('barraKg', b)}>
            {peso(b, unidade)}
          </button>
        ))}
      </div>
    </div>
  )
}
