// F13: frases curtas de motivação, uma por dia. O autor só aparece quando a autoria está bem documentada;
// frases de autoria duvidosa ficam sem autor (secção F13, v1.4).
import { m, t } from '../i18n'

export interface Frase {
  texto: string
  autor?: string
}

export const FRASES: Frase[] = [
  { texto: m('Mente sã em corpo são.'), autor: m('Juvenal') },
  { texto: m('Hoje conta. Mesmo que seja só aparecer.') },
  { texto: m('A jornada de mil milhas começa com um único passo.'), autor: m('Lao Tsé') },
  { texto: m('Consistência ganha à intensidade.') },
  { texto: m('Caminhante, não há caminho, faz-se caminho ao andar.'), autor: m('António Machado') },
  { texto: m('Uma série de cada vez.') },
  { texto: m('Tudo vale a pena se a alma não é pequena.'), autor: m('Fernando Pessoa') },
  { texto: m('O treino de hoje é o progresso de amanhã.') },
  { texto: m('Deus quer, o homem sonha, a obra nasce.'), autor: m('Fernando Pessoa') },
  { texto: m('Técnica primeiro, carga depois.') },
  { texto: m('Primeiro estranha-se, depois entranha-se.'), autor: m('Fernando Pessoa') },
  { texto: m('Não precisas de motivação, precisas de começar.') },
  { texto: m('Somos aquilo que fazemos repetidamente. A excelência não é um ato, mas um hábito.'), autor: m('Will Durant') },
  { texto: m('Pequenos passos, todas as semanas.') },
  { texto: m('Quem acha que não tem tempo para exercício terá, mais cedo ou mais tarde, de arranjar tempo para a doença.'), autor: m('Edward Stanley, conde de Derby') },
  { texto: m('O corpo muda com o que fazes repetidamente.') },
  { texto: m('A vida é como andar de bicicleta: para manter o equilíbrio, é preciso continuar em movimento.'), autor: m('Albert Einstein') },
  { texto: m('Descansar também é treinar.') },
  { texto: m('Gota a gota, a água cava a pedra.'), autor: m('Ovídio') },
  { texto: m('Melhor do que na semana passada: chega.') },
  { texto: m('O que fazemos todos os dias importa mais do que o que fazemos de vez em quando.'), autor: m('Gretchen Rubin') },
  { texto: m('Faz o simples bem feito.') },
  { texto: m('Hoje é o primeiro dia do resto da tua vida.'), autor: m('Charles Dederich') },
  { texto: m('Uma repetição a mais é uma vitória.') },
  { texto: m('Fazer é a melhor maneira de dizer.'), autor: m('José Martí') },
  { texto: m('Disciplina é lembrar o que queres.') },
  { texto: m('Cai sete vezes, levanta-te oito.'), autor: m('Provérbio japonês') },
  { texto: m('Treinas para te sentires bem durante décadas.') },
  { texto: m('Devagar se vai ao longe.'), autor: m('Provérbio popular') },
  { texto: m('Começa com o aquecimento; o resto vem.') },
  { texto: m('O progresso não é linear, mas acumula.') },
  { texto: m('Hoje constróis o hábito, não só o músculo.') },
  { texto: m('Respira, concentra-te, executa.') },
  { texto: m('Ninguém se arrepende de um treino feito.') },
  { texto: m('Força é paciência em forma de carga.') },
  { texto: m('Cumpre o plano; o plano cumpre contigo.') },
  { texto: m('Cada sessão é um voto no que queres ser.') },
  { texto: m('Sem pressa e sem pausa.') },
  { texto: m('Dor não é objetivo; qualidade é.') },
  { texto: m('Treino curto é melhor do que nenhum.') },
  { texto: m('A sequência protege-se um treino de cada vez.') },
  { texto: m('Ouve o corpo e respeita a técnica.') },
  { texto: m('Hoje és mais forte do que no primeiro dia.') },
  { texto: m('O teu futuro agradece este treino.') },
  { texto: m('Mantém o ritmo: estás a construir algo.') },
]

/** Determinística: o mesmo dia (hora local) dá sempre a mesma frase. */
export function fraseDoDia(data: Date): Frase {
  const dia = Math.floor(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()) / 86_400_000)
  const f = FRASES[dia % FRASES.length]!
  return { texto: t(f.texto), ...(f.autor ? { autor: t(f.autor) } : {}) }
}
