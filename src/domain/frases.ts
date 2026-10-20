// F13: frases curtas de motivação, uma por dia.
export const FRASES = [
  'Hoje conta. Mesmo que seja só aparecer.',
  'Consistência ganha à intensidade.',
  'Uma série de cada vez.',
  'O treino de hoje é o progresso de amanhã.',
  'Técnica primeiro, carga depois.',
  'Não precisas de motivação, precisas de começar.',
  'Pequenos passos, todas as semanas.',
  'O corpo muda com o que fazes repetidamente.',
  'Descansar também é treinar.',
  'Melhor do que na semana passada: chega.',
  'Faz o simples bem feito.',
  'Uma repetição a mais é uma vitória.',
  'Disciplina é lembrar o que queres.',
  'Treinas para te sentires bem durante décadas.',
  'Começa com o aquecimento; o resto vem.',
  'O progresso não é linear, mas acumula.',
  'Hoje constróis o hábito, não só o músculo.',
  'Respira, concentra-te, executa.',
  'Ninguém se arrepende de um treino feito.',
  'Força é paciência em forma de carga.',
  'Cumpre o plano; o plano cumpre contigo.',
  'Cada sessão é um voto no que queres ser.',
  'Sem pressa e sem pausa.',
  'Dor não é objetivo; qualidade é.',
  'Treino curto é melhor do que nenhum.',
  'A sequência protege-se um treino de cada vez.',
  'Ouve o corpo e respeita a técnica.',
  'Hoje és mais forte do que no primeiro dia.',
  'O teu futuro agradece este treino.',
  'Mantém o ritmo: estás a construir algo.',
]

/** Determinística: o mesmo dia (hora local) dá sempre a mesma frase. */
export function fraseDoDia(data: Date): string {
  const dia = Math.floor(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()) / 86_400_000)
  return FRASES[dia % FRASES.length]!
}
