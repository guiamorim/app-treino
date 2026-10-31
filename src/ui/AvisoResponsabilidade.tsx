import { t } from '../i18n'

/** F31.7 (v1.20): aviso de responsabilidade, em letra pequena para não pesar no ecrã. */
export function AvisoResponsabilidade() {
  return (
    <p className="letra-pequena">
      {t('As sugestões de exercícios e progressões desta app são de carácter geral e não substituem a orientação de um profissional qualificado. Recomenda-se o acompanhamento por um profissional especializado para aprender e consolidar a técnica de cada exercício. O programador e os responsáveis pela app não assumem responsabilidade por lesões ou danos resultantes da execução incorreta ou inadequada dos exercícios.')}
    </p>
  )
}
