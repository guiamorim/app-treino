// F13: frases curtas de motivação, uma por dia. O autor só aparece quando a autoria está bem documentada;
// frases de autoria duvidosa ficam sem autor (secção F13, v1.4).
export interface Frase {
  texto: string
  autor?: string
}

export const FRASES: Frase[] = [
  { texto: 'Mente sã em corpo são.', autor: 'Juvenal' },
  { texto: 'Hoje conta. Mesmo que seja só aparecer.' },
  { texto: 'A jornada de mil milhas começa com um único passo.', autor: 'Lao Tsé' },
  { texto: 'Consistência ganha à intensidade.' },
  { texto: 'Caminhante, não há caminho, faz-se caminho ao andar.', autor: 'António Machado' },
  { texto: 'Uma série de cada vez.' },
  { texto: 'Tudo vale a pena se a alma não é pequena.', autor: 'Fernando Pessoa' },
  { texto: 'O treino de hoje é o progresso de amanhã.' },
  { texto: 'Deus quer, o homem sonha, a obra nasce.', autor: 'Fernando Pessoa' },
  { texto: 'Técnica primeiro, carga depois.' },
  { texto: 'Primeiro estranha-se, depois entranha-se.', autor: 'Fernando Pessoa' },
  { texto: 'Não precisas de motivação, precisas de começar.' },
  { texto: 'Somos aquilo que fazemos repetidamente. A excelência não é um ato, mas um hábito.', autor: 'Will Durant' },
  { texto: 'Pequenos passos, todas as semanas.' },
  { texto: 'Quem acha que não tem tempo para exercício terá, mais cedo ou mais tarde, de arranjar tempo para a doença.', autor: 'Edward Stanley, conde de Derby' },
  { texto: 'O corpo muda com o que fazes repetidamente.' },
  { texto: 'A vida é como andar de bicicleta: para manter o equilíbrio, é preciso continuar em movimento.', autor: 'Albert Einstein' },
  { texto: 'Descansar também é treinar.' },
  { texto: 'Gota a gota, a água cava a pedra.', autor: 'Ovídio' },
  { texto: 'Melhor do que na semana passada: chega.' },
  { texto: 'O que fazemos todos os dias importa mais do que o que fazemos de vez em quando.', autor: 'Gretchen Rubin' },
  { texto: 'Faz o simples bem feito.' },
  { texto: 'Hoje é o primeiro dia do resto da tua vida.', autor: 'Charles Dederich' },
  { texto: 'Uma repetição a mais é uma vitória.' },
  { texto: 'Fazer é a melhor maneira de dizer.', autor: 'José Martí' },
  { texto: 'Disciplina é lembrar o que queres.' },
  { texto: 'Cai sete vezes, levanta-te oito.', autor: 'Provérbio japonês' },
  { texto: 'Treinas para te sentires bem durante décadas.' },
  { texto: 'Devagar se vai ao longe.', autor: 'Provérbio popular' },
  { texto: 'Começa com o aquecimento; o resto vem.' },
  { texto: 'O progresso não é linear, mas acumula.' },
  { texto: 'Hoje constróis o hábito, não só o músculo.' },
  { texto: 'Respira, concentra-te, executa.' },
  { texto: 'Ninguém se arrepende de um treino feito.' },
  { texto: 'Força é paciência em forma de carga.' },
  { texto: 'Cumpre o plano; o plano cumpre contigo.' },
  { texto: 'Cada sessão é um voto no que queres ser.' },
  { texto: 'Sem pressa e sem pausa.' },
  { texto: 'Dor não é objetivo; qualidade é.' },
  { texto: 'Treino curto é melhor do que nenhum.' },
  { texto: 'A sequência protege-se um treino de cada vez.' },
  { texto: 'Ouve o corpo e respeita a técnica.' },
  { texto: 'Hoje és mais forte do que no primeiro dia.' },
  { texto: 'O teu futuro agradece este treino.' },
  { texto: 'Mantém o ritmo: estás a construir algo.' },
]

/** Determinística: o mesmo dia (hora local) dá sempre a mesma frase. */
export function fraseDoDia(data: Date): Frase {
  const dia = Math.floor(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()) / 86_400_000)
  return FRASES[dia % FRASES.length]!
}
