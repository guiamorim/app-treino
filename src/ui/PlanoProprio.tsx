// F27: editor do plano próprio.
import { useState } from 'react'
import { db } from '../data/db'
import { motivoIncompatibilidade, semanaDoPlano } from '../domain/plano'
import { MAX_EXERCICIOS, MAX_TREINOS, mover, planoDoRascunho, prescricaoPadrao, rascunhoDe, SEMANAS_BLOCO_POSSIVEIS, SEMANAS_READAPTACAO_POSSIVEIS, validarRascunho, type Rascunho } from '../domain/planoProprio'
import { eProprio } from '../domain/proprios'
import { GRUPOS_MUSCULARES, NOMES_GRUPOS, type Anamnese, type Exercicio, type Plano, type Prescricao, type TreinoModelo } from '../domain/types'
import { locale, t } from '../i18n'
import { agoraIso, catalogo, novoId, type Dados } from './dados'
import { ir } from './rota'

const DESCANSOS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300]
const ATE_DEZ = Array.from({ length: 10 }, (_, i) => i + 1)
const RIRS = [0, 1, 2, 3, 4, 5]

const resumo = (p: Prescricao, ex: Exercicio | undefined) =>
  `${p.series} × ${p.faixa[0]}–${p.faixa[1]} ${ex?.medida === 'segundos' ? 's' : 'reps'} · RIR ${p.rir[0]}–${p.rir[1]} · ${t('descanso {s} s', { s: p.descansoSeg })}`

export function PlanoProprio({ dados, plano, anamnese }: { dados: Dados; plano: Plano; anamnese: Anamnese }) {
  const [inicial] = useState(() => rascunhoDe(plano, anamnese.objetivo, semanaDoPlano(plano, agoraIso())))
  const [r, setR] = useState<Rascunho>(inicial)
  const [aberto, setAberto] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [aGravar, setAGravar] = useState(false)

  const arquivados = new Set(dados.proprios.filter((p) => p.arquivado).map((p) => p.id))
  const porNome = (a: Exercicio, b: Exercicio) => a.nome.localeCompare(b.nome, locale())
  const escolhas = [...catalogo.values()].filter((e) => !arquivados.has(e.id))
  const meus = escolhas.filter((e) => eProprio(e.id)).sort(porNome)
  const doCatalogo = escolhas.filter((e) => !eProprio(e.id))

  const mudarTreinos = (f: (ts: TreinoModelo[]) => TreinoModelo[]) => setR((x) => ({ ...x, treinos: f(x.treinos) }))
  const mudarTreino = (id: string, f: (tr: TreinoModelo) => TreinoModelo) => mudarTreinos((ts) => ts.map((tr) => (tr.id === id ? f(tr) : tr)))
  const mudarPrescricao = (treinoId: string, id: string, f: (p: Prescricao) => Prescricao) =>
    mudarTreino(treinoId, (tr) => ({ ...tr, prescricoes: tr.prescricoes.map((p) => (p.id === id ? f(p) : p)) }))

  function juntarExercicio(treinoId: string, exercicioId: string) {
    const ex = catalogo.get(exercicioId)
    if (!ex) return
    const p = prescricaoPadrao(ex, anamnese.objetivo, novoId())
    mudarTreino(treinoId, (tr) => ({ ...tr, prescricoes: [...tr.prescricoes, p] }))
    setAberto(p.id)
  }

  function juntarTreino() {
    const id = `proprio-${novoId()}`
    mudarTreinos((ts) => [...ts, { id, nome: t('Treino {n}', { n: ts.length + 1 }), sintese: '', prescricoes: [], duracaoEstimadaMin: 0 }])
  }

  function apagarTreino(tr: TreinoModelo) {
    if (tr.prescricoes.length > 0 && !confirm(t('Apagar o treino «{treino}»?', { treino: tr.nome }))) return
    mudarTreinos((ts) => ts.filter((x) => x.id !== tr.id))
  }

  function cancelar() {
    if (JSON.stringify(r) !== JSON.stringify(inicial) && !confirm(t('Sair sem guardar as alterações?'))) return
    ir('/mais')
  }

  async function guardar() {
    const problema = validarRascunho(r, catalogo)
    if (problema) return setErro(problema)
    setErro('')
    if (!plano.proprio && !confirm(t('O teu plano passa a ser este. Para voltar a um plano gerado, edita a anamnese em «Mais». Guardar?'))) return
    setAGravar(true)
    try {
      await db.gravar('plano', planoDoRascunho(r, plano, agoraIso()))
      ir('/hoje')
    } finally {
      setAGravar(false)
    }
  }

  return (
    <>
      <button onClick={cancelar} style={{ marginTop: 12 }}>‹ {t('Mais')}</button>
      <h1>{plano.proprio ? t('Editar o meu plano') : t('Criar o meu plano')}</h1>
      <p className="secundario">{t('Começa pelo teu plano atual. Muda os treinos e os exercícios como quiseres; a sugestão de carga, o registo e os relatórios funcionam igual.')}</p>

      {r.treinos.map((tr, ti) => (
        <section key={tr.id} className="cartao" aria-label={tr.nome || t('Treino {n}', { n: ti + 1 })}>
          <label htmlFor={`treino-${tr.id}`}>{t('Nome do treino')}</label>
          <input id={`treino-${tr.id}`} maxLength={100} value={tr.nome} onChange={(e) => mudarTreino(tr.id, (x) => ({ ...x, nome: e.target.value }))} />
          <div className="linha acoes-plano">
            <button type="button" disabled={ti === 0} onClick={() => mudarTreinos((ts) => mover(ts, ti, -1))}>↑ {t('Subir')}</button>
            <button type="button" disabled={ti === r.treinos.length - 1} onClick={() => mudarTreinos((ts) => mover(ts, ti, 1))}>↓ {t('Descer')}</button>
            <button type="button" className="perigo" onClick={() => apagarTreino(tr)}>{t('Apagar treino')}</button>
          </div>

          <ol className="lista plano-exercicios">
            {tr.prescricoes.map((p, pi) => {
              const ex = catalogo.get(p.exercicioId)
              const motivo = ex && motivoIncompatibilidade(ex, anamnese)
              const nome = ex?.nome ?? p.exercicioId
              return (
                <li key={p.id}>
                  <div className="linha plano-exercicio">
                    <span className="corpo">
                      <span className="titulo">{nome}</span><br />
                      <span className="secundario">{resumo(p, ex)}</span>
                    </span>
                    <span className="acoes-serie">
                      <button type="button" disabled={pi === 0} aria-label={t('Subir {exercicio}', { exercicio: nome })} onClick={() => mudarTreino(tr.id, (x) => ({ ...x, prescricoes: mover(x.prescricoes, pi, -1) }))}>↑</button>
                      <button type="button" disabled={pi === tr.prescricoes.length - 1} aria-label={t('Descer {exercicio}', { exercicio: nome })} onClick={() => mudarTreino(tr.id, (x) => ({ ...x, prescricoes: mover(x.prescricoes, pi, 1) }))}>↓</button>
                      <button type="button" aria-expanded={aberto === p.id} aria-label={t('Mudar {exercicio}', { exercicio: nome })} onClick={() => setAberto(aberto === p.id ? null : p.id)}>✎</button>
                      <button type="button" aria-label={t('Tirar {exercicio}', { exercicio: nome })} onClick={() => mudarTreino(tr.id, (x) => ({ ...x, prescricoes: x.prescricoes.filter((y) => y.id !== p.id) }))}>✕</button>
                    </span>
                  </div>
                  {motivo && <p className="secundario aviso-texto">⚠️ {t('As regras evitariam este exercício {motivo}.', { motivo })}</p>}
                  {aberto === p.id && <EditarPrescricao p={p} emSegundos={ex?.medida === 'segundos'} mudar={(f) => mudarPrescricao(tr.id, p.id, f)} />}
                </li>
              )
            })}
          </ol>

          {tr.prescricoes.length < MAX_EXERCICIOS && (
            <>
              <label htmlFor={`juntar-${tr.id}`}>{t('Juntar exercício')}</label>
              <select id={`juntar-${tr.id}`} value="" onChange={(e) => juntarExercicio(tr.id, e.target.value)}>
                <option value="" disabled>{t('Escolhe…')}</option>
                {meus.length > 0 && (
                  <optgroup label={t('Os meus exercícios')}>
                    {meus.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </optgroup>
                )}
                {GRUPOS_MUSCULARES.map((g) => (
                  <optgroup key={g} label={NOMES_GRUPOS[g]}>
                    {doCatalogo.filter((e) => e.grupoPrincipal === g).sort(porNome).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </optgroup>
                ))}
              </select>
            </>
          )}
        </section>
      ))}
      {r.treinos.length < MAX_TREINOS && <button type="button" className="largo" onClick={juntarTreino}>{t('Juntar treino')}</button>}

      <div className="cartao">
        <h3>{t('Readaptação e descarga')}</h3>
        <label htmlFor="plano-readaptacao">{t('Readaptação no início (2 séries, RIR 3–4)')}</label>
        <select id="plano-readaptacao" value={r.semanasReadaptacao} onChange={(e) => setR({ ...r, semanasReadaptacao: Number(e.target.value) })}>
          {SEMANAS_READAPTACAO_POSSIVEIS.map((n) => <option key={n} value={n}>{n === 0 ? t('Sem readaptação') : n === 1 ? t('1 semana') : t('{n} semanas', { n })}</option>)}
        </select>
        <label className="escolha-lado">
          <input type="checkbox" checked={r.descarga} onChange={(e) => setR({ ...r, descarga: e.target.checked })} /> {t('Semana de descarga no fim de cada bloco (metade das séries, RIR 3–4)')}
        </label>
        <label htmlFor="plano-bloco">{t('Duração de cada bloco')}</label>
        <select id="plano-bloco" value={r.semanasBloco} onChange={(e) => setR({ ...r, semanasBloco: Number(e.target.value) })}>
          {[...new Set([...SEMANAS_BLOCO_POSSIVEIS, r.semanasBloco])].sort((a, b) => a - b).map((n) => <option key={n} value={n}>{t('{n} semanas', { n })}</option>)}
        </select>
        <label className="escolha-lado">
          <input type="checkbox" checked={r.recomecar} onChange={(e) => setR({ ...r, recomecar: e.target.checked })} /> {t('Recomeçar a contagem das semanas hoje')}
        </label>
        <p className="secundario">{t('Sem esta opção, as semanas continuam a contar desde o início do plano atual.')}</p>
      </div>

      {erro && <p role="alert" style={{ color: 'var(--perigo)' }}>{erro}</p>}
      <button className="primario largo" disabled={aGravar} onClick={guardar}>{t('Guardar o meu plano')}</button>
      <button className="largo" style={{ marginTop: 8 }} onClick={cancelar}>{t('Cancelar')}</button>
    </>
  )
}

function EditarPrescricao({ p, emSegundos, mudar }: { p: Prescricao; emSegundos: boolean; mudar: (f: (p: Prescricao) => Prescricao) => void }) {
  const n = (s: string) => (s.trim() === '' ? NaN : Number(s))
  return (
    <div className="editar-prescricao">
      <div className="linha">
        <div>
          <label htmlFor={`series-${p.id}`}>{t('Séries')}</label>
          <select id={`series-${p.id}`} value={p.series} onChange={(e) => mudar((x) => ({ ...x, series: Number(e.target.value) }))}>
            {ATE_DEZ.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`min-${p.id}`}>{emSegundos ? t('Segundos mín.') : t('Reps mín.')}</label>
          <input id={`min-${p.id}`} inputMode="numeric" defaultValue={p.faixa[0]} onChange={(e) => mudar((x) => ({ ...x, faixa: [n(e.target.value), x.faixa[1]] }))} />
        </div>
        <div>
          <label htmlFor={`max-${p.id}`}>{emSegundos ? t('Segundos máx.') : t('Reps máx.')}</label>
          <input id={`max-${p.id}`} inputMode="numeric" defaultValue={p.faixa[1]} onChange={(e) => mudar((x) => ({ ...x, faixa: [x.faixa[0], n(e.target.value)] }))} />
        </div>
      </div>
      <div className="linha">
        <div>
          <label htmlFor={`rir-min-${p.id}`}>{t('RIR mín.')}</label>
          <select id={`rir-min-${p.id}`} value={p.rir[0]} onChange={(e) => mudar((x) => ({ ...x, rir: [Number(e.target.value), x.rir[1]] }))}>
            {RIRS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`rir-max-${p.id}`}>{t('RIR máx.')}</label>
          <select id={`rir-max-${p.id}`} value={p.rir[1]} onChange={(e) => mudar((x) => ({ ...x, rir: [x.rir[0], Number(e.target.value)] }))}>
            {RIRS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`descanso-${p.id}`}>{t('Descanso')}</label>
          <select id={`descanso-${p.id}`} value={p.descansoSeg} onChange={(e) => mudar((x) => ({ ...x, descansoSeg: Number(e.target.value) }))}>
            {[...new Set([...DESCANSOS, p.descansoSeg])].sort((a, b) => a - b).map((v) => <option key={v} value={v}>{`${v} s`}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}
