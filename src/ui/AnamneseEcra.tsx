import { useState, type FormEvent } from 'react'
import { db } from '../data/db'
import { gerarPlano } from '../domain/plano'
import { AREAS, type Anamnese, type Area, type Restricao } from '../domain/types'
import { agoraIso, catalogo, novoId, type Dados } from './dados'
import { ir } from './rota'

// Perguntas gerais do PAR-Q+ (versão 2023), adaptadas para português de Portugal.
export const PERGUNTAS_PARQ = [
  'Algum médico já te disse que tens um problema de coração ou tensão arterial alta?',
  'Sentes dor no peito em repouso, no dia a dia ou quando fazes atividade física?',
  'Nos últimos 12 meses perdeste o equilíbrio por tonturas ou perdeste a consciência? (Responde «não» se as tonturas foram só por respiração acelerada durante exercício intenso.)',
  'Alguma vez te foi diagnosticada outra doença crónica (além de coração ou tensão alta)?',
  'Tomas medicação prescrita para uma doença crónica?',
  'Tens (ou tiveste nos últimos 12 meses) um problema de ossos, articulações, músculos, ligamentos ou tendões que possa piorar com mais atividade física?',
  'Algum médico já te disse que só deves fazer atividade física com supervisão médica?',
]

const NOMES_AREAS: Record<Area, string> = { ombro: 'Ombro', joelho: 'Joelho', lombar: 'Lombar', punho: 'Punho', anca: 'Anca', cotovelo: 'Cotovelo' }

export function AnamneseEcra({ dados }: { dados: Dados }) {
  const a = dados.anamnese
  const [f, setF] = useState({
    idade: a?.idade.toString() ?? '',
    alturaCm: a?.alturaCm.toString() ?? '',
    pesoKg: a?.pesoKg.toString() ?? '',
    cinturaCm: a?.cinturaCm?.toString() ?? '',
    sexo: a?.sexo ?? 'masculino',
    objetivo: a?.objetivo ?? 'recomposicao',
    diasPorSemana: String(a?.diasPorSemana ?? 3),
    duracaoMin: String(a?.duracaoMin ?? 60),
    experiencia: a?.experiencia ?? 'regresso',
    equipamento: a?.equipamento ?? 'ginasio',
    aceitaCardio: a?.aceitaCardio ?? true,
  })
  const [restricoes, setRestricoes] = useState<Restricao[]>(a?.restricoes ?? [])
  const [parq, setParq] = useState<(boolean | null)[]>(a?.parq ?? PERGUNTAS_PARQ.map(() => null))
  const [erro, setErro] = useState('')

  const campo = (k: keyof typeof f) => ({
    value: String(f[k]),
    onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value }),
  })

  const alternarArea = (area: Area) =>
    setRestricoes((r) => (r.some((x) => x.area === area) ? r.filter((x) => x.area !== area) : [...r, { area, intensidade: 3, avaliadaPorProfissional: false }]))
  const mudarRestricao = (area: Area, m: Partial<Restricao>) => setRestricoes((r) => r.map((x) => (x.area === area ? { ...x, ...m } : x)))

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const num = (s: string) => Number(s.replace(',', '.'))
    const idade = num(f.idade), alturaCm = num(f.alturaCm), pesoKg = num(f.pesoKg), cintura = num(f.cinturaCm)
    if (!(idade >= 14 && idade <= 110)) return setErro('Indica uma idade entre 14 e 110.')
    if (!(alturaCm >= 100 && alturaCm <= 250)) return setErro('Indica a altura em centímetros (ex.: 175).')
    if (!(pesoKg >= 20 && pesoKg <= 400)) return setErro('Indica o peso em kg.')
    if (f.cinturaCm && !(cintura >= 30 && cintura <= 250)) return setErro('Indica a cintura em centímetros ou deixa em branco.')
    if (parq.some((x) => x === null)) return setErro('Responde a todas as perguntas de saúde (PAR-Q+).')

    const nova: Anamnese = {
      idade, alturaCm, pesoKg,
      ...(f.cinturaCm ? { cinturaCm: cintura } : {}),
      sexo: f.sexo as Anamnese['sexo'],
      objetivo: f.objetivo as Anamnese['objetivo'],
      diasPorSemana: Number(f.diasPorSemana) as Anamnese['diasPorSemana'],
      duracaoMin: Number(f.duracaoMin) as Anamnese['duracaoMin'],
      experiencia: f.experiencia as Anamnese['experiencia'],
      equipamento: f.equipamento as Anamnese['equipamento'],
      restricoes,
      aceitaCardio: f.aceitaCardio,
      parq: parq as boolean[],
    }
    await db.gravar('anamnese', nova)
    // F1.3: alterar a anamnese pergunta antes de substituir o plano; o histórico mantém-se.
    const gerar = !dados.plano || confirm('Gerar um novo plano com estes dados? O histórico de treinos mantém-se.')
    if (gerar) await db.gravar('plano', gerarPlano(nova, catalogo, { id: novoId(), agora: agoraIso() }))
    ir('/hoje')
  }

  return (
    <form onSubmit={guardar} noValidate>
      <h1>{a ? 'Anamnese' : 'Bem-vindo'}</h1>
      {!a && <p className="secundario">Responde a estas perguntas para gerar o teu plano. Os dados ficam só neste dispositivo.</p>}

      <h2>Sobre ti</h2>
      <div className="linha">
        <div><label htmlFor="idade">Idade</label><input id="idade" inputMode="numeric" {...campo('idade')} /></div>
        <div><label htmlFor="sexo">Sexo</label>
          <select id="sexo" {...campo('sexo')}><option value="masculino">Masculino</option><option value="feminino">Feminino</option><option value="outro">Outro</option></select>
        </div>
      </div>
      <div className="linha">
        <div><label htmlFor="altura">Altura (cm)</label><input id="altura" inputMode="decimal" {...campo('alturaCm')} /></div>
        <div><label htmlFor="peso">Peso (kg)</label><input id="peso" inputMode="decimal" {...campo('pesoKg')} /></div>
        <div><label htmlFor="cintura">Cintura (cm)</label><input id="cintura" inputMode="decimal" placeholder="opcional" {...campo('cinturaCm')} /></div>
      </div>

      <h2>Objetivo e disponibilidade</h2>
      <label htmlFor="objetivo">Objetivo</label>
      <select id="objetivo" {...campo('objetivo')}>
        <option value="recomposicao">Recomposição (perder gordura e manter/ganhar músculo)</option>
        <option value="hipertrofia">Ganhar massa muscular</option>
        <option value="forca">Ganhar força</option>
        <option value="saude">Saúde geral</option>
      </select>
      <div className="linha">
        <div><label htmlFor="dias">Dias por semana</label>
          <select id="dias" {...campo('diasPorSemana')}>{[2, 3, 4, 5].map((d) => <option key={d} value={d}>{d}</option>)}</select>
        </div>
        <div><label htmlFor="duracao">Minutos por treino</label>
          <select id="duracao" {...campo('duracaoMin')}>{[45, 60, 75].map((d) => <option key={d} value={d}>{d}</option>)}</select>
        </div>
      </div>
      <label htmlFor="experiencia">Experiência</label>
      <select id="experiencia" {...campo('experiencia')}>
        <option value="iniciante">Iniciante</option>
        <option value="regresso">A regressar após paragem</option>
        <option value="intermedio">Treino regularmente há mais de 1 ano</option>
      </select>
      <label htmlFor="equipamento">Onde treinas</label>
      <select id="equipamento" {...campo('equipamento')}>
        <option value="ginasio">Ginásio completo</option>
        <option value="halteres">Só halteres</option>
        <option value="casa">Em casa, sem equipamento</option>
      </select>
      <label className="opcao"><input type="checkbox" checked={f.aceitaCardio} onChange={(e) => setF({ ...f, aceitaCardio: e.target.checked })} /> Aceito 10 min de cardio no fim de alguns treinos</label>

      <h2>Dores ou limitações</h2>
      <p className="secundario">Marca as zonas onde costumas ter dor. O plano evita os exercícios que as sobrecarregam.</p>
      {AREAS.map((area) => {
        const r = restricoes.find((x) => x.area === area)
        return (
          <div key={area} className={r ? 'cartao' : undefined}>
            <label className="opcao"><input type="checkbox" checked={!!r} onChange={() => alternarArea(area)} /> {NOMES_AREAS[area]}</label>
            {r && (
              <>
                <label htmlFor={`int-${area}`}>Dor habitual: {r.intensidade}/10</label>
                <input id={`int-${area}`} type="range" min={0} max={10} value={r.intensidade} onChange={(e) => mudarRestricao(area, { intensidade: Number(e.target.value) })} />
                <label className="opcao"><input type="checkbox" checked={r.avaliadaPorProfissional} onChange={(e) => mudarRestricao(area, { avaliadaPorProfissional: e.target.checked })} /> Já foi avaliada por médico ou fisioterapeuta</label>
              </>
            )}
          </div>
        )
      })}

      <h2>Saúde (PAR-Q+)</h2>
      <p className="secundario">Rastreio internacional antes de começar atividade física.</p>
      {PERGUNTAS_PARQ.map((q, i) => (
        <fieldset key={i} className="cartao" style={{ margin: '8px 0' }}>
          <legend className="visualmente-oculto">Pergunta {i + 1}</legend>
          <p>{q}</p>
          <div className="linha">
            {[true, false].map((v) => (
              <label key={String(v)} className="opcao"><input type="radio" name={`parq-${i}`} checked={parq[i] === v} onChange={() => setParq(parq.map((x, j) => (j === i ? v : x)))} /> {v ? 'Sim' : 'Não'}</label>
            ))}
          </div>
        </fieldset>
      ))}

      {erro && <p role="alert" className="cartao perigo-borda">{erro}</p>}
      <p className="secundario">Esta app não substitui avaliação médica nem de fisioterapia.</p>
      <div className="linha" style={{ marginTop: 16 }}>
        {a && dados.plano && <button type="button" onClick={() => ir('/mais')}>Cancelar</button>}
        <button type="submit" className="primario">{a ? 'Guardar' : 'Gerar o meu plano'}</button>
      </div>
    </form>
  )
}
