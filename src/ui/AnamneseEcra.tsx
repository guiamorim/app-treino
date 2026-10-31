import { useState, type FormEvent } from 'react'
import { db } from '../data/db'
import { MODELOS_ESCOLHA } from '../domain/modelos'
import { divisoesPossiveis, EQUIPAMENTOS_ESCOLHA, equipamentoDisponivel, gerarPlano, resumoEquipamento } from '../domain/plano'
import { AREAS, DIAS_POR_SEMANA, type Anamnese, type DiasPorSemana, type DivisaoTreino, type Enfase, type Gravidez, type Area, type Equipamento, type Restricao } from '../domain/types'
import { agoraIso, catalogo, novoId, type Dados } from './dados'
import { ir } from './rota'
import { locale, m, t, traduzido } from '../i18n'
import { CartaoIdioma, CartaoUnidade } from './Idioma'
import { ListaEquipamento } from './Equipamento'
import { deUnidade, paraCampo } from '../domain/unidades'

// Perguntas gerais do PAR-Q+ (versão 2023), adaptadas para português de Portugal.
export const PERGUNTAS_PARQ = [
  m('Algum médico já te disse que tens um problema de coração ou tensão arterial alta?'),
  m('Sentes dor no peito em repouso, no dia a dia ou quando fazes atividade física?'),
  m('Nos últimos 12 meses perdeste o equilíbrio por tonturas ou perdeste a consciência? (Responde «não» se as tonturas foram só por respiração acelerada durante exercício intenso.)'),
  m('Alguma vez te foi diagnosticada outra doença crónica (além de coração ou tensão alta)?'),
  m('Tomas medicação prescrita para uma doença crónica?'),
  m('Tens (ou tiveste nos últimos 12 meses) um problema de ossos, articulações, músculos, ligamentos ou tendões que possa piorar com mais atividade física?'),
  m('Algum médico já te disse que só deves fazer atividade física com supervisão médica?'),
]

const DICA_DIAS: Record<number, string> = traduzido({
  2: m('Corpo inteiro A e B.'),
  3: m('Corpo inteiro A, B e C.'),
  4: m('Superior e inferior, A e B.'),
  5: m('Superior e inferior, A e B, mais corpo inteiro.'),
  6: m('A/B/C duas vezes: empurrar, puxar e pernas.'),
  7: m('A/B/C duas vezes e 1 dia de recuperação ativa (treinar força 7 dias seguidos não é recomendável).'),
})

// 3.1 (v1.5): modelo de treino escolhido pela pessoa.
const NOMES_DIVISOES: Record<DivisaoTreino, string> = traduzido({
  automatico: m('Automático (recomendado)'),
  corpo: m('Corpo inteiro'),
  ab: m('A/B: superior e inferior'),
  abc: m('A/B/C: empurrar, puxar e pernas'),
  grupos: m('Por grupo muscular'),
})

const NOMES_AREAS: Record<Area, string> = traduzido({ ombro: m('Ombro'), joelho: m('Joelho'), lombar: m('Lombar'), punho: m('Punho'), anca: m('Anca'), cotovelo: m('Cotovelo') })

/** Nomes curtos dos dias, de segunda a domingo, no idioma da app (2026-11-02 é segunda-feira). */
const NOMES_DIAS = () => Array.from({ length: 7 }, (_, d) => new Date(2026, 10, 2 + d, 12).toLocaleDateString(locale(), { weekday: 'short' }).replace('.', '').slice(0, 3))

export function AnamneseEcra({ dados }: { dados: Dados }) {
  const a = dados.anamnese
  const [f, setF] = useState({
    idade: a?.idade.toString() ?? '',
    alturaCm: a?.alturaCm.toString() ?? '',
    pesoKg: a ? paraCampo(a.pesoKg) : '',
    cinturaCm: a?.cinturaCm?.toString() ?? '',
    sexo: a?.sexo ?? 'masculino',
    objetivo: a?.objetivo ?? 'recomposicao',
    diasPorSemana: String(a?.diasPorSemana ?? 3),
    duracaoMin: String(a?.duracaoMin ?? 60),
    experiencia: a?.experiencia ?? 'regresso',
    halteresMaxKg: a?.halteresMaxKg ? paraCampo(a.halteresMaxKg) : '',
    aceitaCardio: a?.aceitaCardio ?? true,
    enfase: a?.enfase ?? 'equilibrado',
    gravidez: a?.gravidez ?? 'nao',
    divisao: a?.divisao ?? 'automatico',
  })
  // F28.1: lista de equipamento; uma anamnese antiga abre com a lista que valia (F28.3).
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>(a ? equipamentoDisponivel(a).filter((q) => q !== 'peso-corporal') : [...EQUIPAMENTOS_ESCOLHA])
  const [restricoes, setRestricoes] = useState<Restricao[]>(a?.restricoes ?? [])
  // F1 (v1.2): «Nenhuma» é uma resposta explícita, para não confundir com «esqueci-me de responder».
  const [semDores, setSemDores] = useState(!!a && a.restricoes.length === 0)
  const [parq, setParq] = useState<(boolean | null)[]>(a?.parq ?? PERGUNTAS_PARQ.map(() => null))
  const [erro, setErro] = useState('')
  // F25.1: dias da semana em que treina (opcional).
  const [diasTreino, setDiasTreino] = useState<number[]>(a?.diasTreino ?? [])
  const alternarDia = (d: number) => setDiasTreino((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d].sort()))
  const dias = Number(f.diasPorSemana) as DiasPorSemana
  const possiveis = divisoesPossiveis(dias)
  // Se os dias mudarem e o modelo deixar de servir, volta ao automático.
  const divisao = possiveis.includes(f.divisao) ? f.divisao : 'automatico'

  const campo = (k: keyof typeof f) => ({
    value: String(f[k]),
    onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value }),
  })

  const alternarArea = (area: Area) => {
    setSemDores(false)
    setRestricoes((r) => (r.some((x) => x.area === area) ? r.filter((x) => x.area !== area) : [...r, { area, intensidade: 3, avaliadaPorProfissional: false }]))
  }
  const marcarNenhuma = (v: boolean) => {
    setSemDores(v)
    if (v) setRestricoes([])
  }
  const mudarRestricao = (area: Area, mudanca: Partial<Restricao>) => setRestricoes((r) => r.map((x) => (x.area === area ? { ...x, ...mudanca } : x)))

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const num = (s: string) => Number(s.replace(',', '.'))
    const idade = num(f.idade), alturaCm = num(f.alturaCm), pesoKg = deUnidade(num(f.pesoKg)), cintura = num(f.cinturaCm)
    if (!(idade >= 14 && idade <= 110)) return setErro(t('Indica uma idade entre 14 e 110.'))
    if (!(alturaCm >= 100 && alturaCm <= 250)) return setErro(t('Indica a altura em centímetros (ex.: 175).'))
    if (!(pesoKg >= 20 && pesoKg <= 400)) return setErro(t('Indica o peso em {u}.', { u: dados.unidade }))
    if (f.cinturaCm && !(cintura >= 30 && cintura <= 250)) return setErro(t('Indica a cintura em centímetros ou deixa em branco.'))
    if (!semDores && restricoes.length === 0) return setErro(t('Nas dores ou limitações, marca «Nenhuma» ou pelo menos uma zona.'))
    if (parq.some((x) => x === null)) return setErro(t('Responde a todas as perguntas de saúde (PAR-Q+).'))
    if (diasTreino.length > 0 && diasTreino.length !== Number(f.diasPorSemana)) return setErro(t('Escolhe {n} dias da semana, ou nenhum.', { n: f.diasPorSemana }))
    const comHalteres = equipamentos.includes('halteres')
    const halteresMaxKg = comHalteres && f.halteresMaxKg.trim() ? deUnidade(num(f.halteresMaxKg)) : undefined
    if (halteresMaxKg !== undefined && !(halteresMaxKg >= 0.5 && halteresMaxKg <= 200)) return setErro(t('Indica o halter mais pesado em {u}, ou deixa em branco.', { u: dados.unidade }))

    const nova: Anamnese = {
      idade, alturaCm, pesoKg,
      ...(f.cinturaCm ? { cinturaCm: cintura } : {}),
      sexo: f.sexo as Anamnese['sexo'],
      objetivo: f.objetivo as Anamnese['objetivo'],
      diasPorSemana: Number(f.diasPorSemana) as Anamnese['diasPorSemana'],
      duracaoMin: Number(f.duracaoMin) as Anamnese['duracaoMin'],
      experiencia: f.experiencia as Anamnese['experiencia'],
      equipamento: resumoEquipamento(equipamentos),
      equipamentos,
      ...(halteresMaxKg !== undefined ? { halteresMaxKg } : {}),
      restricoes,
      aceitaCardio: f.aceitaCardio,
      parq: parq as boolean[],
      enfase: f.enfase as Enfase,
      ...(divisao !== 'automatico' ? { divisao } : {}),
      ...(f.sexo === 'feminino' ? { gravidez: f.gravidez as Gravidez } : {}),
      ...(diasTreino.length ? { diasTreino } : {}),
    }
    await db.gravar('anamnese', nova)
    // F1.3: alterar a anamnese pergunta antes de substituir o plano; o histórico mantém-se.
    // F25.1: mudar só os dias de treino não mexe no plano.
    const semDias = (x: Anamnese) => JSON.stringify({ ...x, diasTreino: undefined })
    const soDias = !!a && semDias(a) === semDias(nova)
    const gerar = !dados.plano || (!soDias && confirm(dados.plano.proprio ? t('Gerar um novo plano com estes dados substitui o plano que criaste. O histórico de treinos mantém-se.') : t('Gerar um novo plano com estes dados? O histórico de treinos mantém-se.')))
    if (gerar) await db.gravar('plano', gerarPlano(nova, catalogo, { id: novoId(), agora: agoraIso() }))
    ir('/hoje')
  }

  return (
    <form onSubmit={guardar} noValidate>
      <h1>{a ? t('Anamnese') : t('Bem-vindo')}</h1>
      {!a && <p className="secundario">{t('Responde a estas perguntas para gerar o teu plano. Os dados ficam só neste dispositivo.')}</p>}
      {!a && <CartaoIdioma idioma={dados.idioma} />}
      {!a && <CartaoUnidade unidade={dados.unidade} />}

      <h2>{t('Sobre ti')}</h2>
      <div className="linha">
        <div><label htmlFor="idade">{t('Idade')}</label><input id="idade" inputMode="numeric" {...campo('idade')} /></div>
        <div><label htmlFor="sexo">{t('Sexo')}</label>
          <select id="sexo" {...campo('sexo')}><option value="masculino">{t('Masculino')}</option><option value="feminino">{t('Feminino')}</option><option value="outro">{t('Outro')}</option></select>
        </div>
      </div>
      <div className="linha">
        <div><label htmlFor="altura">{t('Altura (cm)')}</label><input id="altura" inputMode="decimal" {...campo('alturaCm')} /></div>
        <div><label htmlFor="peso">{t('Peso ({u})', { u: dados.unidade })}</label><input id="peso" inputMode="decimal" {...campo('pesoKg')} /></div>
        <div><label htmlFor="cintura">{t('Cintura (cm)')}</label><input id="cintura" inputMode="decimal" placeholder={t('opcional')} {...campo('cinturaCm')} /></div>
      </div>

      {f.sexo === 'feminino' && (
        <>
          <label htmlFor="gravidez">{t('Gravidez ou pós-parto')}</label>
          <select id="gravidez" {...campo('gravidez')}>
            <option value="nao">{t('Não')}</option>
            <option value="gravida-1t">{t('Grávida, 1.º trimestre')}</option>
            <option value="gravida-2t3t">{t('Grávida, 2.º ou 3.º trimestre')}</option>
            <option value="pos-parto">{t('Pós-parto (menos de 12 meses)')}</option>
          </select>
        </>
      )}

      <h2>{t('Objetivo e disponibilidade')}</h2>
      <label htmlFor="objetivo">{t('Objetivo')}</label>
      <select id="objetivo" {...campo('objetivo')}>
        <option value="recomposicao">{t('Recomposição (perder gordura e manter/ganhar músculo)')}</option>
        <option value="hipertrofia">{t('Ganhar massa muscular')}</option>
        <option value="forca">{t('Ganhar força')}</option>
        <option value="saude">{t('Saúde geral')}</option>
      </select>
      <label htmlFor="enfase">{t('Ênfase')}</label>
      <select id="enfase" {...campo('enfase')}>
        <option value="equilibrado">{t('Equilibrado')}</option>
        <option value="inferior">{t('Mais pernas e glúteos')}</option>
        <option value="superior">{t('Mais tronco (peito, costas, ombros, braços)')}</option>
      </select>
      <div className="linha">
        <div><label htmlFor="dias">{t('Dias por semana')}</label>
          <select id="dias" {...campo('diasPorSemana')}>{DIAS_POR_SEMANA.map((d) => <option key={d} value={d}>{d}</option>)}</select>
        </div>
        <div><label htmlFor="duracao">{t('Minutos por treino')}</label>
          <select id="duracao" {...campo('duracaoMin')}>{[45, 60, 75].map((d) => <option key={d} value={d}>{d}</option>)}</select>
        </div>
      </div>
      <label id="titulo-dias-treino">{t('Em que dias treinas? (opcional)')}</label>
      <div className="linha dias-treino" role="group" aria-labelledby="titulo-dias-treino">
        {NOMES_DIAS().map((nome, d) => (
          <button key={d} type="button" aria-pressed={diasTreino.includes(d)} className={diasTreino.includes(d) ? 'primario' : ''} onClick={() => alternarDia(d)}>{nome}</button>
        ))}
      </div>
      <p className="secundario">{t('Com os dias escolhidos, o calendário mostra os próximos treinos.')}</p>
      <label htmlFor="divisao">{t('Modelo de treino')}</label>
      <select id="divisao" value={divisao} onChange={(e) => setF({ ...f, divisao: e.target.value as DivisaoTreino })}>
        {possiveis.map((d) => <option key={d} value={d}>{NOMES_DIVISOES[d]}</option>)}
      </select>
      {divisao === 'automatico' ? (
        <p className="secundario">{DICA_DIAS[dias]}</p>
      ) : MODELOS_ESCOLHA[divisao].umaVezPorSemana(dias) ? (
        <p className="secundario">{t('Com este modelo, cada grupo muscular é treinado cerca de 1×/semana. A evidência favorece 2×/semana; o automático garante-o.')}</p>
      ) : null}
      <label htmlFor="experiencia">{t('Experiência')}</label>
      <select id="experiencia" {...campo('experiencia')}>
        <option value="iniciante">{t('Iniciante')}</option>
        <option value="regresso">{t('A regressar após paragem')}</option>
        <option value="intermedio">{t('Treino regularmente há mais de 1 ano')}</option>
      </select>
      <ListaEquipamento valor={equipamentos} mudar={setEquipamentos} titulo={t('Que equipamento tens')} nome="equipamento" />
      {equipamentos.includes('halteres') && (
        <>
          <label htmlFor="halteresMaxKg">{t('Halter mais pesado que tens ({u}, opcional)', { u: dados.unidade })}</label>
          <input id="halteresMaxKg" inputMode="decimal" {...campo('halteresMaxKg')} />
        </>
      )}
      <label className="opcao"><input type="checkbox" checked={f.aceitaCardio} onChange={(e) => setF({ ...f, aceitaCardio: e.target.checked })} /> {t('Aceito 10 min de cardio no fim de alguns treinos')}</label>

      <h2>{t('Dores ou limitações')}</h2>
      <p className="secundario">{t('Marca as zonas onde costumas ter dor. O plano evita os exercícios que as sobrecarregam.')}</p>
      <label className="opcao"><input type="checkbox" checked={semDores} onChange={(e) => marcarNenhuma(e.target.checked)} /> {t('Nenhuma')}</label>
      {AREAS.map((area) => {
        const r = restricoes.find((x) => x.area === area)
        return (
          <div key={area} className={r ? 'cartao' : undefined}>
            <label className="opcao"><input type="checkbox" checked={!!r} onChange={() => alternarArea(area)} /> {NOMES_AREAS[area]}</label>
            {r && (
              <>
                <label htmlFor={`int-${area}`}>{t('Dor habitual: {n}/10', { n: r.intensidade })}</label>
                <input id={`int-${area}`} type="range" min={0} max={10} value={r.intensidade} aria-valuetext={t('{dor} de 10', { dor: r.intensidade })} onChange={(e) => mudarRestricao(area, { intensidade: Number(e.target.value) })} />
                <label className="opcao"><input type="checkbox" checked={r.avaliadaPorProfissional} onChange={(e) => mudarRestricao(area, { avaliadaPorProfissional: e.target.checked })} /> {t('Já foi avaliada por médico ou fisioterapeuta')}</label>
              </>
            )}
          </div>
        )
      })}

      <h2>{t('Saúde (PAR-Q+)')}</h2>
      <p className="secundario">{t('Rastreio internacional antes de começar atividade física.')}</p>
      {PERGUNTAS_PARQ.map((q, i) => (
        <fieldset key={i} className="cartao" style={{ margin: '8px 0' }}>
          <legend className="visualmente-oculto">{t('Pergunta {n}', { n: i + 1 })}</legend>
          <p>{t(q)}</p>
          <div className="linha">
            {[true, false].map((v) => (
              <label key={String(v)} className="opcao"><input type="radio" name={`parq-${i}`} checked={parq[i] === v} onChange={() => setParq(parq.map((x, j) => (j === i ? v : x)))} /> {v ? t('Sim') : t('Não')}</label>
            ))}
          </div>
        </fieldset>
      ))}

      {erro && <p role="alert" className="cartao perigo-borda">{erro}</p>}
      <p className="secundario">{t('Esta app não substitui avaliação médica nem de fisioterapia.')}</p>
      <div className="linha" style={{ marginTop: 16 }}>
        {a && dados.plano && <button type="button" onClick={() => ir('/mais')}>{t('Cancelar')}</button>}
        <button type="submit" className="primario">{a ? t('Guardar') : t('Gerar o meu plano')}</button>
      </div>
    </form>
  )
}
