import { db } from '../data/db'
import { IDIOMAS, NOMES_IDIOMAS, type Idioma } from '../i18n'

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
