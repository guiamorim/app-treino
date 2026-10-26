import { db } from '../data/db'
import { UNIDADES, type UnidadePeso } from '../domain/unidades'
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
