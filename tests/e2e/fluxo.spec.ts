import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const VERSAO: string = JSON.parse(readFileSync('package.json', 'utf8')).version

async function preencherAnamnese(page: Page) {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Bem-vindo' })).toBeVisible()
  await page.getByLabel('Idade').fill('45')
  await page.getByLabel('Altura (cm)').fill('175')
  await page.getByLabel('Peso (kg)').fill('85')
  await page.getByLabel('Cintura (cm)').fill('92')
  await page.getByLabel('Dias por semana').selectOption('4')
  await page.getByLabel('Ombro').check()
  for (let i = 0; i < 7; i++) await page.locator(`input[name="parq-${i}"]`).nth(1).check()
  await page.getByRole('button', { name: 'Gerar o meu plano' }).click()
}

test('F1–F4: anamnese gera o plano e registo um exercício', async ({ page }) => {
  const erros: string[] = []
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()))
  page.on('pageerror', (e) => erros.push(e.message))

  await preencherAnamnese(page)

  // F3: treino de hoje com síntese, grupos e aviso do ombro.
  await expect(page.getByRole('heading', { name: 'Superior A' })).toBeVisible()
  await expect(page.getByText('foco em peito e costas')).toBeVisible()
  await expect(page.getByText('Supino com halteres, pega neutra')).toBeVisible()
  await expect(page.getByText('Supino reto com barra')).toHaveCount(0)
  await page.getByText(/aviso.* sobre o teu plano/).click()
  await expect(page.getByText(/ombro nunca foi avaliada/)).toBeVisible()

  // F4: registo de séries com sugestão e temporizador.
  await page.getByText('Supino com halteres, pega neutra').click()
  await expect(page.getByRole('heading', { name: 'Supino com halteres, pega neutra' })).toBeVisible()
  await expect(page.getByText(/Hoje: 2 × 6–10 reps · RIR 3–4/)).toBeVisible()
  await expect(page.getByText('Primeira vez')).toBeVisible()
  await page.getByLabel('Carga (kg por halter)').fill('16')
  await page.getByLabel('Repetições').fill('10')
  await page.getByRole('radio', { name: '3' }).click()
  await page.getByRole('button', { name: 'Concluir série' }).click()
  await expect(page.getByRole('timer')).toBeVisible()
  await page.getByRole('button', { name: 'Saltar', exact: true }).first().click()
  await page.getByRole('button', { name: 'Concluir série' }).click()
  await expect(page.getByText('Exercício feito ✓')).toBeVisible()

  // F4.4: dor registada.
  const dor = page.getByLabel(/Dor ou desconforto/)
  await dor.focus()
  for (let i = 0; i < 5; i++) await dor.press('ArrowRight')
  await expect(page.getByText(/Dor moderada/)).toBeVisible()

  // F3.5: estado guardado e visível ao voltar (mesmo depois de recarregar).
  await page.reload()
  await page.getByRole('button', { name: 'Próximo exercício' }).click()
  await expect(page.getByRole('heading', { name: 'Remada sentada no cabo (triângulo)' })).toBeVisible()
  await page.getByRole('link', { name: 'Hoje' }).click()
  await expect(page.getByLabel('feito')).toHaveCount(1)

  // F3.4: saltar o resto completa o treino.
  for (const nome of ['Remada sentada no cabo (triângulo)', 'Puxada à frente na polia alta', 'Elevação lateral com halteres', 'Rosca alternada com halteres', 'Extensão de tríceps na polia com corda']) {
    await page.getByText(nome, { exact: true }).click()
    await page.getByRole('button', { name: 'Saltar', exact: true }).click()
    await page.getByRole('button', { name: /‹ Superior A/ }).click()
  }
  await expect(page.getByText('Treino completo 🎉')).toBeVisible()
  await page.getByRole('button', { name: 'Terminar treino' }).click()
  // F35.4: parabéns com as séries e a conquista obtida neste treino.
  const parabens = page.getByRole('dialog', { name: 'Parabéns' })
  await expect(parabens).toContainText(/série(s)? registada/)
  await expect(parabens).toContainText('Nova conquista:')
  await expect(parabens).toContainText('Primeiro treino')
  await parabens.getByRole('button', { name: 'Continuar' }).click()
  await expect(parabens).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Inferior A' })).toBeVisible()

  // F7: relatório de progressão.
  await page.getByRole('link', { name: 'Relatórios' }).click()
  await expect(page.getByLabel('Exercício')).toHaveValue('supino-halteres-neutro')
  await expect(page.getByText('🏆')).toBeVisible()
  await page.getByRole('tab', { name: 'Semana' }).click()
  await expect(page.getByText(/1 de 16 treinos/)).toBeVisible()

  expect(erros).toEqual([])
})

test('F5: vídeo abre num leitor dentro da app, com o domínio sem cookies', async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/**', (r) => r.fulfill({ body: '<html>vídeo</html>', contentType: 'text/html' }))
  await preencherAnamnese(page)
  await page.getByText('Supino com halteres, pega neutra').click()
  await page.getByRole('button', { name: '▶ Ver vídeo' }).click()
  const iframe = page.locator('.modal iframe')
  await expect(iframe).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/3m7-E2Bcotk/)
  await expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation')
  await expect(page.getByRole('link', { name: 'Abrir no YouTube' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=3m7-E2Bcotk')
  await page.getByRole('button', { name: 'Fechar' }).click()
  await expect(page.locator('.modal')).toHaveCount(0)

  // F22.6: Esc fecha a janela e o foco volta ao botão que a abriu.
  await page.getByRole('button', { name: '▶ Ver vídeo' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '▶ Ver vídeo' })).toBeFocused()
})

test('F9 e F10: medições, exportação e importação inválida', async ({ page }) => {
  await preencherAnamnese(page)
  await page.getByRole('link', { name: 'Medições' }).click()
  await page.getByLabel('Peso (kg)').fill('92,4')
  await page.getByLabel('Cintura (cm)').fill('95')
  await page.getByRole('button', { name: 'Guardar medição' }).click()
  await expect(page.getByText('92,4 kg')).toBeVisible()

  await page.getByRole('link', { name: 'Mais' }).click()
  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar cópia (JSON)' }).click()
  expect((await descarga).suggestedFilename()).toMatch(/^treino-\d{4}-\d{2}-\d{2}\.json$/)

  page.on('dialog', (d) => d.accept())
  await page.getByLabel('Ficheiro de cópia').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"formato":"outra"}') })
  await expect(page.getByText('Ficheiro inválido. Nenhum dado foi alterado.')).toBeVisible()
  await page.getByRole('link', { name: 'Medições' }).click()
  await expect(page.getByText('92,4 kg')).toBeVisible()
})

test('F1 v1.2: 7 dias e «Nenhuma» geram Empurrar/Puxar/Pernas com recuperação ativa', async ({ page }) => {
  await page.goto('./')
  await page.getByLabel('Idade').fill('45')
  await page.getByLabel('Altura (cm)').fill('175')
  await page.getByLabel('Peso (kg)').fill('85')
  await page.getByLabel('Dias por semana').selectOption('7')
  await expect(page.getByText(/1 dia de recuperação ativa/)).toBeVisible()
  for (let i = 0; i < 7; i++) await page.locator(`input[name="parq-${i}"]`).nth(1).check()
  await page.getByRole('button', { name: 'Gerar o meu plano' }).click()
  await expect(page.getByText(/marca «Nenhuma» ou pelo menos uma zona/)).toBeVisible()

  await page.getByLabel('Ombro').check()
  await page.getByLabel('Nenhuma').check()
  await expect(page.getByLabel('Ombro')).not.toBeChecked()
  await page.getByRole('button', { name: 'Gerar o meu plano' }).click()

  await expect(page.getByRole('heading', { name: 'Empurrar A' })).toBeVisible()
  await expect(page.getByText('Supino reto com barra')).toBeVisible()
  await expect(page.getByText(/sobre o teu plano/)).toHaveCount(0)
  await expect(page.getByText(/Readaptação, semana 1 de 2/)).toBeVisible()
  await expect(page.getByLabel('Fazer outro treino').locator('option')).toHaveText([
    'Empurrar A (próximo)', 'Puxar A', 'Pernas A', 'Empurrar B', 'Puxar B', 'Pernas B', 'Recuperação ativa',
  ])
})

test('F11 e F12: o Início mostra o painel e as conquistas depois de um treino', async ({ page }) => {
  await preencherAnamnese(page)
  await page.getByRole('link', { name: 'Início' }).click()
  await expect(page.getByRole('heading', { name: /^(Bom dia|Boa tarde|Boa noite)$/ })).toBeVisible()
  await expect(page.locator('figure.frase blockquote')).toHaveText(/^“.+”$/)
  await expect(page.getByText('Superior A · ~')).toBeVisible()
  await expect(page.locator('.indicador').filter({ hasText: 'treinos' }).first()).toContainText('0/4')

  await page.getByRole('button', { name: /Próximo treino/ }).click()
  for (const nome of ['Supino com halteres, pega neutra', 'Remada sentada no cabo (triângulo)', 'Puxada à frente na polia alta', 'Elevação lateral com halteres', 'Rosca alternada com halteres', 'Extensão de tríceps na polia com corda']) {
    await page.getByText(nome, { exact: true }).click()
    await page.getByRole('button', { name: 'Saltar', exact: true }).click()
    await page.getByRole('button', { name: /‹ Superior A/ }).click()
  }
  await page.getByRole('button', { name: 'Terminar treino' }).click()
  // F35.4: treino terminado sem séries registadas não dá parabéns.
  await expect(page.getByRole('dialog', { name: 'Parabéns' })).toHaveCount(0)

  await page.getByRole('link', { name: 'Início' }).click()
  await expect(page.locator('.indicador').filter({ hasText: 'treinos' }).first()).toContainText('1/4')
  await expect(page.getByText('Inferior A · ~')).toBeVisible()
  await expect(page.locator('.conquistas li.obtida')).toHaveText([/Primeiro treino/])
})

test('F1 v1.3: gravidez no 2.º trimestre troca exercícios deitado e só aparece com sexo feminino', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByLabel('Gravidez ou pós-parto')).toHaveCount(0)
  await page.getByLabel('Idade').fill('32')
  await page.getByLabel('Sexo').selectOption('feminino')
  await page.getByLabel('Altura (cm)').fill('165')
  await page.getByLabel('Peso (kg)').fill('62')
  await page.getByLabel('Gravidez ou pós-parto').selectOption('gravida-2t3t')
  await page.getByLabel('Ênfase').selectOption('inferior')
  await page.getByLabel('Dias por semana').selectOption('4')
  await page.getByLabel('Nenhuma').check()
  for (let i = 0; i < 7; i++) await page.locator(`input[name="parq-${i}"]`).nth(1).check()
  await page.getByRole('button', { name: 'Gerar o meu plano' }).click()

  await expect(page.getByRole('heading', { name: 'Superior A' })).toBeVisible()
  await expect(page.getByText('Supino reto com barra')).toHaveCount(0)
  await expect(page.getByText('Supino com halteres, pega neutra')).toHaveCount(0)
  await page.getByText(/aviso.* sobre o teu plano/).click()
  await expect(page.getByText(/obstetra/)).toBeVisible()

  // F18: o desenho dos músculos usa o corpo feminino.
  await page.locator('.lista .item').first().click()
  await expect(page.locator('.corpo-musculos')).toHaveAttribute('data-corpo', 'feminino')
})

// PNG 2×3 válido, só para testes.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAIAAAA2iEnWAAAAEElEQVR4nGP4z8AARAwoFABE0AX7pM/egAAAAABJRU5ErkJggg==', 'base64')

test('F15 e F16: perfil com nome e foto, saudação e fotos de avaliação comparadas', async ({ page }) => {
  await preencherAnamnese(page)
  await page.getByRole('link', { name: 'Mais' }).click()
  await page.getByLabel('Nome').fill('Ana')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Nome guardado.')).toBeVisible()
  await page.getByLabel('Escolher foto de perfil').setInputFiles({ name: 'eu.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByRole('img', { name: 'Foto de perfil' })).toHaveAttribute('src', /^data:image\/jpeg;base64,/)

  await page.getByRole('link', { name: 'Início' }).click()
  await expect(page.getByRole('heading', { name: /^(Bom dia|Boa tarde|Boa noite), Ana$/ })).toBeVisible()

  await page.getByRole('link', { name: 'Medições' }).click()
  for (const [data, peso, cintura] of [['2026-09-15', '90', '98'], ['2026-10-15', '88,5', '96']]) {
    await page.getByLabel('Data').fill(data)
    await page.getByLabel('Peso (kg)').fill(peso)
    await page.getByLabel('Cintura (cm)').fill(cintura)
    await page.getByRole('button', { name: 'Guardar medição' }).click()
    await expect(page.getByText(`${peso} kg`)).toBeVisible()
    await expect(page.getByLabel('Peso (kg)')).toHaveValue('')
  }

  await page.getByRole('link', { name: 'Fotos' }).click()
  await expect(page.getByText('Ainda sem fotos.')).toBeVisible()
  for (const data of ['2026-09-15', '2026-10-15']) {
    await page.getByLabel('Data').fill(data)
    await page.getByLabel('Escolher foto').setInputFiles({ name: 'f.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByRole('button', { name: 'Adicionar foto' })).toBeEnabled()
  }
  await expect(page.locator('.galeria img')).toHaveCount(2)
  await expect(page.getByRole('heading', { name: 'Comparar' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('Diferença: -1,5 kg · -2 cm de cintura')
  await page.getByRole('radio', { name: 'Lado' }).click()
  await expect(page.getByText('Sem foto de lado neste mês')).toHaveCount(2)

  // F15 v1.5: relatório para o PT com as fotos (JPEG) dentro do PDF.
  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Relatório para o PT (PDF)' }).click()
  const relatorio = await descarga
  expect(relatorio.suggestedFilename()).toBe('relatorio-pt-2026-09-2026-10.pdf')
  const pdf = (await import('node:fs')).readFileSync((await relatorio.path())!, 'latin1')
  expect(pdf.startsWith('%PDF-1.4')).toBe(true)
  expect(pdf.match(/\/Filter \/DCTDecode/g)).toHaveLength(2)
})

test('v1.5: modelo por grupo muscular, músculos do exercício, medidas extra e exportação', async ({ page }) => {
  await page.goto('./')
  await page.getByLabel('Idade').fill('45')
  await page.getByLabel('Altura (cm)').fill('175')
  await page.getByLabel('Peso (kg)').fill('85')
  await page.getByLabel('Dias por semana').selectOption('2')
  // 3.1: «Por grupo muscular» só existe de 4 a 6 dias.
  await expect(page.getByLabel('Modelo de treino').locator('option')).toHaveText(['Automático (recomendado)', 'Corpo inteiro', 'A/B: superior e inferior'])
  await page.getByLabel('Dias por semana').selectOption('5')
  await page.getByLabel('Modelo de treino').selectOption({ label: 'Por grupo muscular' })
  await expect(page.getByText(/cerca de 1×\/semana/)).toBeVisible()
  await page.getByLabel('Nenhuma').check()
  for (let i = 0; i < 7; i++) await page.locator(`input[name="parq-${i}"]`).nth(1).check()
  await page.getByRole('button', { name: 'Gerar o meu plano' }).click()

  // F18: desenho do corpo com o grupo principal.
  await expect(page.getByRole('heading', { name: 'Peito e tríceps' })).toBeVisible()
  await page.getByText('Supino reto com barra').click()
  await expect(page.getByRole('img', { name: 'Músculos trabalhados: Peito. Auxiliares 1: Tríceps, Ombros.' })).toBeVisible()
  await expect(page.locator('.musculo.principal[data-grupo="peito"]')).toHaveCount(1)
  await expect(page.locator('.corpo-musculos')).toHaveAttribute('data-corpo', 'masculino')

  // F9 v1.5: medidas extra com instruções.
  await page.getByRole('link', { name: 'Medições' }).click()
  await page.getByText('Mais medidas (opcional)').click()
  await expect(page.getByText(/A meio entre o ombro e o cotovelo/)).toBeVisible()
  await page.getByLabel('Braço (cm)').fill('34,5')
  await page.getByRole('button', { name: 'Guardar medição' }).click()
  await expect(page.getByText('Braço 34,5 cm')).toBeVisible()

  // F17: exportações geradas no dispositivo.
  await page.getByRole('link', { name: 'Mais' }).click()
  const fs = await import('node:fs')
  for (const [botao, ficheiro, inicio] of [['Ficha (PDF)', /^ficha-treino-.*\.pdf$/, '%PDF'], ['Histórico (PDF)', /^historico-treino-.*\.pdf$/, '%PDF'], ['Ficha, histórico e medições (Excel)', /^treino-.*\.xlsx$/, 'PK']] as const) {
    const descarga = page.waitForEvent('download')
    await page.getByRole('button', { name: botao }).click()
    const d = await descarga
    expect(d.suggestedFilename()).toMatch(ficheiro)
    expect(fs.readFileSync((await d.path())!, 'latin1').startsWith(inicio)).toBe(true)
  }
})

test('F19: lembrete de alongamento no fim do treino, alongamento do treino e por grupo muscular', async ({ page }) => {
  page.on('dialog', (d) => d.accept())
  await preencherAnamnese(page)
  for (const [nome, carga] of [['Supino com halteres, pega neutra', '16'], ['Remada sentada no cabo (triângulo)', '30']] as const) {
    await page.getByText(nome, { exact: true }).click()
    await page.getByLabel(/^Carga \(kg/).fill(carga)
    await page.getByLabel('Repetições').fill('10')
    await page.getByRole('button', { name: 'Concluir série' }).click()
    await page.getByRole('button', { name: /‹ Superior A/ }).click()
  }
  await expect(page.getByRole('region', { name: 'Lembrete de alongamento' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Terminar treino' }).click()
  await page.getByRole('dialog', { name: 'Parabéns' }).getByRole('button', { name: 'Continuar' }).click()

  // Lembrete no Hoje e no Início; o peito fica de fora por causa do ombro.
  const lembrete = page.getByRole('region', { name: 'Lembrete de alongamento' })
  await expect(lembrete).toContainText('Hora de alongar')
  await expect(lembrete).toContainText('Costas')
  await page.getByRole('link', { name: 'Início' }).click()
  await page.getByRole('button', { name: 'Alongar agora' }).click()

  await expect(page.getByRole('heading', { name: 'Alongar' })).toBeVisible()
  await expect(page.getByText('Depois de Superior A')).toBeVisible()
  await expect(page.getByText(/Sem alongamento seguro para: Peito/)).toBeVisible()
  const cartao = page.getByRole('region', { name: '1. Costas agarrado a um apoio' })
  await expect(cartao.getByRole('img', { name: /Músculos trabalhados: Costas/ })).toBeVisible()
  await expect(cartao.getByText('2 × 30 s')).toBeVisible()
  await expect(cartao.getByRole('link', { name: 'Procurar no YouTube' })).toHaveAttribute('href', /youtube\.com\/results\?search_query=alongamento/)
  await cartao.getByRole('button', { name: 'Manter 30 s' }).click()
  await expect(cartao.getByRole('timer')).toContainText('Manter')

  await page.getByRole('radio', { name: 'Por grupo muscular' }).click()
  await page.getByRole('radio', { name: 'Gémeos' }).click()
  await expect(page.getByRole('heading', { name: /Gémeos num degrau/ })).toBeVisible()
  await expect(page.locator('.musculo.principal[data-grupo="gemeos"]').first()).toBeVisible()

  await page.getByRole('radio', { name: 'Do treino' }).click()
  await page.getByRole('button', { name: 'Alongamento feito' }).click()
  await expect(page.getByRole('heading', { name: /^(Bom dia|Boa tarde|Boa noite)$/ })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Lembrete de alongamento' })).toHaveCount(0)
})

test('F20: versão, procurar atualizações, novidades depois de atualizar', async ({ page }) => {
  await preencherAnamnese(page)
  await expect(page.getByRole('heading', { name: 'Superior A' })).toBeVisible()

  // Instalação nova: sem cartão de novidades.
  await page.goto('./#/inicio')
  await expect(page.getByRole('region', { name: 'Novidades' })).toHaveCount(0)

  // Mais: versão instalada, procura sem versão nova, em preparação e histórico.
  await page.goto('./#/mais')
  await expect(page.getByText(`Versão instalada: ${VERSAO}`)).toBeVisible()
  await page.getByRole('button', { name: 'Procurar atualizações' }).click()
  await expect(page.getByText('Já tens a versão mais recente.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Em preparação' })).toBeVisible()
  await page.getByText('Novidades de cada versão', { exact: true }).click()
  await expect(page.getByText(/Alongamentos do treino do dia/)).toBeVisible()

  // Quem vinha da 1.6 vê uma vez no Início as novidades de todas as versões desde então.
  // Texto em vez de função: a configuração de TypeScript dos testes não inclui os tipos do navegador.
  await page.evaluate(`new Promise((fim, erro) => {
    const pedido = indexedDB.open('app-treino')
    pedido.onsuccess = () => {
      const t = pedido.result.transaction('valores', 'readwrite')
      t.objectStore('valores').put({ chave: 'versaoVista', valor: '1.6.0' })
      t.oncomplete = () => fim()
      t.onerror = () => erro(t.error)
    }
  })`)
  await page.goto('./#/inicio')
  await page.reload()
  const cartao = page.getByRole('region', { name: 'Novidades' })
  await expect(cartao.getByRole('heading', { name: `Novidades da versão ${VERSAO}` })).toBeVisible()
  await expect(cartao.getByText(/em português, inglês e espanhol/)).toBeVisible()
  await expect(cartao.getByText(/Aviso de versão nova/)).toBeVisible()
  await cartao.getByRole('button', { name: 'Fechar' }).click()
  await expect(cartao).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: /Bom dia|Boa tarde|Boa noite|Olá/ }).first()).toBeVisible()
  await expect(page.getByRole('region', { name: 'Novidades' })).toHaveCount(0)
})

test('F21: escolher inglês e espanhol em «Mais» traduz a navegação, o plano e os avisos', async ({ page }) => {
  await preencherAnamnese(page)
  await expect(page.getByRole('heading', { name: 'Superior A' })).toBeVisible()

  await page.goto('./#/mais')
  const idioma = page.getByRole('radiogroup', { name: /Idioma/ })
  await expect(idioma.getByRole('radio', { name: 'Português' })).toHaveAttribute('aria-checked', 'true')
  await idioma.getByRole('radio', { name: 'English' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB')
  await expect(page.getByRole('heading', { name: 'Your plan' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Main' })
  await expect(nav.getByText('Home')).toBeVisible()
  await nav.getByText('Today').click()
  await expect(page.getByRole('heading', { name: 'Upper A' })).toBeVisible()
  await expect(page.getByText('Dumbbell bench press, neutral grip')).toBeVisible()
  await page.getByText(/warnings? about your plan/).click()
  await expect(page.getByText(/shoulder pain has never been assessed/)).toBeVisible()

  // A escolha fica guardada: depois de recarregar continua em inglês.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Upper A' })).toBeVisible()

  await page.goto('./#/mais')
  await page.getByRole('radio', { name: 'Español' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-ES')
  await expect(page.getByRole('heading', { name: 'Tu plan' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Principal' }).getByText('Hoy').click()
  await expect(page.getByRole('heading', { name: 'Tren superior A' })).toBeVisible()

  await page.goto('./#/mais')
  await page.getByRole('radio', { name: 'Português' }).click()
  await expect(page.getByRole('heading', { name: 'O teu plano' })).toBeVisible()
})

test.describe('F21: telemóvel em inglês', () => {
  test.use({ locale: 'en-GB' })
  test('a primeira abertura segue o idioma do telemóvel', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible()
    await expect(page.getByLabel('Height (cm)')).toBeVisible()
    await expect(page.getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'true')
  })
})

/** Altera um registo guardado na base de dados da app (texto em vez de função: ver o teste F20). */
const alterarNaBase = (page: Page, loja: string, chave: string, codigo: string) =>
  page.evaluate(`new Promise((fim, erro) => {
    const pedido = indexedDB.open('app-treino')
    pedido.onsuccess = () => {
      const tx = pedido.result.transaction('${loja}', 'readwrite')
      const loja = tx.objectStore('${loja}')
      const g = loja.get('${chave}')
      g.onsuccess = () => { const v = g.result; ${codigo}; loja.put(v) }
      tx.oncomplete = () => fim()
      tx.onerror = () => erro(tx.error)
    }
  })`)

test('F22: toque duplo grava uma série, o descanso continua noutros ecrãs, exercício desconhecido e ecrã de erro', async ({ page }) => {
  await preencherAnamnese(page)
  await page.getByText('Supino com halteres, pega neutra').click()
  await page.getByLabel('Carga (kg por halter)').fill('16')

  // F22.2: um toque duplo em «Concluir série» grava uma só série.
  await page.getByRole('button', { name: 'Concluir série' }).dblclick()
  await expect(page.getByRole('button', { name: /^Apagar série/ })).toHaveCount(1)

  // F22.4: o descanso continua visível noutro separador.
  await expect(page.getByRole('timer')).toBeVisible()
  await page.getByRole('link', { name: 'Início' }).click()
  await expect(page.getByRole('timer')).toBeVisible()
  await page.getByRole('timer').getByRole('button', { name: 'Saltar' }).click()
  await expect(page.getByRole('timer')).toHaveCount(0)

  // F22.1: um exercício que o catálogo não conhece sai do plano com um aviso, sem bloquear a app.
  await alterarNaBase(page, 'valores', 'plano', "v.valor.treinos[0].prescricoes[2].exercicioId = 'nao-existe'")
  await page.goto('./#/hoje')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Superior A' })).toBeVisible()
  await page.getByText(/avisos? sobre o teu plano/).click()
  await expect(page.getByText(/1 exercício\(s\) do teu plano deixaram de existir/)).toBeVisible()

  // F22.1: se um ecrã falhar, aparece o erro com «Exportar cópia» em vez de um ecrã em branco.
  const sessoes = await page.evaluate(`new Promise((fim) => {
    const pedido = indexedDB.open('app-treino')
    pedido.onsuccess = () => { const g = pedido.result.transaction('sessoes').objectStore('sessoes').getAllKeys(); g.onsuccess = () => fim(g.result) }
  })`) as string[]
  await alterarNaBase(page, 'sessoes', sessoes[0]!, 'v.exercicios = null')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Algo correu mal' })).toBeVisible()
  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar cópia (JSON)' }).click()
  expect((await descarga).suggestedFilename()).toMatch(/^treino-\d{4}-\d{2}-\d{2}\.json$/)
})

test('F22.9–F22.13: libras, corrigir e desfazer séries, ícones desenhados', async ({ page }) => {
  await preencherAnamnese(page)

  // F22.13: seis ícones desenhados na barra de baixo, sem emojis.
  await expect(page.getByRole('navigation').locator('svg.icone')).toHaveCount(5)

  // F22.9: em libras, escreve-se e mostra-se em lb.
  await page.getByRole('link', { name: 'Mais' }).click()
  await page.getByRole('radio', { name: 'Libras (lb)' }).click()
  await expect(page.getByRole('radio', { name: 'Libras (lb)' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('link', { name: 'Hoje' }).click()
  await page.getByText('Supino com halteres, pega neutra').click()
  await page.getByLabel('Carga (lb por halter)').fill('35')
  await page.getByLabel('Repetições').fill('10')
  await page.getByRole('button', { name: 'Concluir série' }).click()
  await page.getByRole('timer').getByRole('button', { name: 'Saltar' }).click()
  const series = page.locator('.series')
  await expect(series).toContainText('lb')
  await expect(series).toContainText('35')

  // F22.10: corrigir a série.
  await page.getByRole('button', { name: 'Corrigir série 1' }).click()
  const correcao = page.getByRole('form', { name: 'Corrigir série 1' })
  await correcao.getByLabel('Repetições').fill('8')
  await correcao.getByLabel('RIR').selectOption('2')
  await correcao.getByRole('button', { name: 'Guardar' }).click()
  await expect(correcao).toHaveCount(0)
  await expect(series.locator(':scope > span').nth(3)).toHaveText('8')
  await expect(series.locator(':scope > span').nth(4)).toHaveText('2')

  // F22.11: apagar e desfazer.
  await page.getByRole('button', { name: 'Apagar série 1' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Série 1 apagada.' })).toBeVisible()
  await expect(series).toHaveCount(0)
  await page.getByRole('status').getByRole('button', { name: 'Desfazer' }).click()
  await expect(series.locator(':scope > span').nth(3)).toHaveText('8')
  await expect(page.getByText('Série 1 apagada.')).toHaveCount(0)

  // Os dados ficam em quilos: em kg, as mesmas 35 lb aparecem como 15,9 kg.
  await page.getByRole('link', { name: 'Mais' }).click()
  await page.getByRole('radio', { name: 'Quilos (kg)' }).click()
  await page.getByRole('link', { name: 'Hoje' }).click()
  await page.getByText('Supino com halteres, pega neutra').click()
  await expect(series).toContainText('15,9')
})

test.describe('F22.9: telemóvel em inglês dos Estados Unidos', () => {
  test.use({ locale: 'en-US' })
  test('a primeira abertura pede o peso em libras', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByLabel('Weight (lb)')).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Pounds (lb)' })).toHaveAttribute('aria-checked', 'true')
  })
})

test('F23: reserva em segundos na prancha, RIR 0 como falha, descanso à vista e ecrã na horizontal', async ({ page }) => {
  await preencherAnamnese(page)

  // F23.2: o RIR 0 lê-se como «0 (falha)».
  await page.getByText('Supino com halteres, pega neutra').click()
  await expect(page.getByRole('radio', { name: '0 (falha)' })).toBeVisible()
  await expect(page.getByText('0 = até à falha')).toBeVisible()

  // F23.3: o descanso fica fixo em baixo, dentro do ecrã e acima da navegação, mesmo depois de deslizar.
  await page.getByLabel('Carga (kg por halter)').fill('16')
  await page.getByRole('button', { name: 'Concluir série' }).click()
  const temporizador = page.getByRole('timer')
  await expect(temporizador).toBeInViewport()
  await page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
  await expect(temporizador).toBeInViewport()
  const caixa = (await temporizador.boundingBox())!
  const nav = (await page.getByRole('navigation', { name: 'Principal' }).boundingBox())!
  expect(caixa.y + caixa.height).toBeLessThanOrEqual(nav.y)
  await temporizador.getByRole('button', { name: 'Saltar' }).click()

  // F23.1: na prancha escolhe-se a reserva em segundos, e a tabela mostra-a.
  await page.getByRole('link', { name: 'Hoje' }).click()
  await page.getByLabel('Fazer outro treino').selectOption({ label: 'Inferior A' })
  await page.getByText('Prancha', { exact: true }).click()
  await expect(page.getByText(/reserva \+15–30 s|reserva \+30–45 s/)).toBeVisible()
  const reservas = page.getByRole('radiogroup', { name: 'Reserva (opcional)' }).getByRole('radio')
  await expect(reservas).toHaveText(['+15', '+30', '+45', '+60', '+'])
  await page.getByRole('radio', { name: '+30 s' }).click()
  await page.getByRole('button', { name: 'Concluir série' }).click()
  await expect(page.locator('.series').getByText('+30 s')).toBeVisible()

  // F23.4: na horizontal, o descanso continua à vista e os botões não saem do ecrã.
  await page.setViewportSize({ width: 844, height: 390 })
  await expect(page.getByRole('timer')).toBeInViewport()
  await expect(page.getByRole('button', { name: 'Concluir série' })).toBeVisible()
  const largura = (await page.evaluate('document.documentElement.scrollWidth')) as number
  expect(largura).toBeLessThanOrEqual(844)
})

test('F24: rótulo da carga por equipamento, escolha da forma de contar e discos por lado', async ({ page }) => {
  await preencherAnamnese(page)

  // F24.2: gémeos em pé admitem máquina ou halteres; a escolha fica guardada.
  await page.getByLabel('Fazer outro treino').selectOption({ label: 'Inferior A' })
  await page.getByText('Gémeos em pé', { exact: true }).click()
  await expect(page.getByLabel('Carga (kg na máquina)')).toBeVisible()
  await page.getByLabel('Como contas o peso?').selectOption({ label: 'Por halter' })
  await expect(page.getByLabel('Carga (kg por halter)')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Como contas o peso?')).toHaveValue('halter')

  // F24.4: na barra, escrevem-se os discos de cada lado e guarda-se o total.
  await page.getByRole('link', { name: 'Mais' }).click()
  await page.getByRole('radio', { name: '15 kg' }).click()
  await expect(page.getByRole('radio', { name: '15 kg' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('link', { name: 'Hoje' }).click()
  // O treino aberto (Inferior A) continua a ser o de hoje.
  await page.getByText('Peso morto romeno com barra', { exact: true }).click()
  await expect(page.getByLabel('Carga total (kg)')).toBeVisible()
  await page.getByLabel('Escrever discos por lado').check()
  await page.getByLabel('Discos por lado (kg)').fill('10')
  await expect(page.getByText('15 kg barra + 2 × 10 kg = 35 kg')).toBeVisible()
  await page.getByRole('button', { name: 'Concluir série' }).click()
  await expect(page.locator('.series').locator(':scope > span').nth(2)).toHaveText('35')
  // Depois da série, o campo continua em discos por lado.
  await expect(page.getByLabel('Discos por lado (kg)')).toHaveValue('10')
})

test('F25: dias de treino, calendário com o dia de hoje e PDF do dia', async ({ page }) => {
  await preencherAnamnese(page)
  // F25.1: hoje e os três dias seguintes; mudar só os dias não pede para gerar um plano novo.
  let pediuPlano = false
  page.on('dialog', (d) => { pediuPlano = true; void d.dismiss() })
  await page.getByRole('link', { name: 'Mais' }).click()
  await page.getByRole('button', { name: 'Editar anamnese e gerar novo plano' }).click()
  const hoje = (new Date().getDay() + 6) % 7
  const dias = page.getByRole('group', { name: 'Em que dias treinas? (opcional)' }).getByRole('button')
  await dias.nth(hoje).click()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('alert')).toHaveText('Escolhe 4 dias da semana, ou nenhum.')
  for (const d of [1, 2, 3]) await dias.nth((hoje + d) % 7).click()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('heading', { name: 'Superior A' })).toBeVisible()
  expect(pediuPlano).toBe(false)

  // F25.3: o calendário abre no dia de hoje, com o treino previsto.
  await page.getByRole('link', { name: 'Relatórios' }).click()
  await page.getByRole('tab', { name: 'Calendário' }).click()
  const celulaHoje = page.locator('[aria-current="date"]')
  await expect(celulaHoje).toHaveAttribute('aria-label', /treino previsto: Superior A/)
  await expect(page.getByText('Hoje: Superior A')).toBeVisible()
  await expect(page.getByText(/Supino com halteres, pega neutra: 2 × 6–10 reps/)).toBeVisible()
  // Navegar entre meses e voltar.
  await page.getByRole('button', { name: 'Mês seguinte' }).click()
  await page.getByRole('button', { name: 'Mês anterior' }).click()

  // F25.4: PDF do dia.
  const descarga = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Dia (PDF)' }).click()
  expect((await descarga).suggestedFilename()).toMatch(/^treino-do-dia-\d{4}-\d{2}-\d{2}\.pdf$/)

  // F25.3: depois de uma série, o dia de hoje fica «a meio», com o que falta.
  await page.getByRole('link', { name: 'Hoje' }).click()
  await page.getByText('Supino com halteres, pega neutra').click()
  await page.getByLabel('Carga (kg por halter)').fill('16')
  await page.getByRole('button', { name: 'Concluir série' }).click()
  await page.getByRole('link', { name: 'Relatórios' }).click()
  await page.getByRole('tab', { name: 'Calendário' }).click()
  await expect(page.getByText('Treino a meio: Superior A')).toBeVisible()
  await expect(page.getByText(/Supino com halteres, pega neutra: 16 kg × 6/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar treino' })).toBeVisible()
})

test('F26: criar um exercício próprio, usá-lo em «Substituir exercício» e arquivá-lo', async ({ page }) => {
  await preencherAnamnese(page)
  // F26.1: criar, com validação do nome e do link do vídeo.
  await page.getByRole('link', { name: 'Mais' }).click()
  await expect(page.getByText(/Ainda não criaste exercícios/)).toBeVisible()
  await page.getByRole('button', { name: 'Novo exercício' }).click()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('alert')).toHaveText('Indica o nome do exercício.')
  await page.getByLabel('Nome').fill('Supino no banco do meu ginásio')
  await page.getByLabel('Grupo muscular principal').selectOption({ label: 'Peito' })
  await page.getByRole('group', { name: 'Grupos secundários (opcional)' }).getByRole('button', { name: 'Tríceps' }).click()
  await expect(page.getByLabel('Incremento de carga (kg, opcional)')).toHaveAttribute('placeholder', '2')
  await page.getByLabel('Como fazer (opcional, um ponto por linha)').fill('Pés no chão\nDescer devagar')
  await page.getByLabel('Link do vídeo (opcional)').fill('https://exemplo.com/video.mp4')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('alert')).toHaveText('Link não aceite. Usa um link do YouTube ou do Vimeo.')
  await page.getByLabel('Link do vídeo (opcional)').fill('')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('button', { name: /Supino no banco do meu ginásio/ })).toContainText('Peito · Repetições · Por halter')

  // F26.3: aparece em «Substituir exercício» de um exercício de peito e regista-se como os outros.
  await page.getByRole('link', { name: 'Hoje' }).click()
  await page.getByText('Supino com halteres, pega neutra').click()
  await page.getByRole('button', { name: 'Substituir exercício' }).click()
  await page.getByRole('button', { name: /Supino no banco do meu ginásio/ }).click()
  await expect(page.getByRole('heading', { name: 'Supino no banco do meu ginásio' })).toBeVisible()
  // F33.1: na primeira vez, «Músculos, técnica e vídeo» já vem aberto.
  await expect(page.getByText('Descer devagar')).toBeVisible()
  await page.getByLabel('Carga (kg por halter)').fill('18')
  await page.getByRole('button', { name: 'Concluir série' }).click()
  await expect(page.locator('.series')).toContainText('18')

  // F26.4: com registos, a medida fica fixa e apagar arquiva.
  await page.getByRole('link', { name: 'Mais' }).click()
  await page.getByRole('button', { name: /Supino no banco do meu ginásio/ }).click()
  await expect(page.getByLabel('Medida')).toBeDisabled()
  page.once('dialog', (d) => { expect(d.message()).toContain('Este exercício tem registos'); void d.accept() })
  await page.getByRole('button', { name: 'Apagar exercício' }).click()
  await expect(page.getByText(/Ainda não criaste exercícios/)).toBeVisible()
  // O histórico continua a mostrar o nome.
  await page.getByRole('link', { name: 'Relatórios' }).click()
  await page.getByRole('tab', { name: 'Calendário' }).click()
  await expect(page.getByText(/Supino no banco do meu ginásio: 18 kg × 6/)).toBeVisible()
})

test('F27: criar o meu plano a partir do atual, com aviso de dor, sem readaptação nem descarga', async ({ page }) => {
  await preencherAnamnese(page)
  await page.getByRole('link', { name: 'Mais' }).click()
  await page.getByRole('button', { name: 'Criar o meu plano' }).click()
  await expect(page.getByRole('heading', { name: 'Criar o meu plano' })).toBeVisible()

  // F27.2: validação do nome, renomear, juntar e tirar exercícios.
  const primeiro = page.getByLabel('Nome do treino').first()
  await primeiro.fill('')
  await page.getByRole('button', { name: 'Guardar o meu plano' }).click()
  await expect(page.getByRole('alert')).toHaveText('Dá um nome a cada treino.')
  await primeiro.fill('Peito e costas')
  const treino = page.getByRole('region', { name: 'Peito e costas' })
  await treino.getByLabel('Juntar exercício').selectOption('supino-barra')
  // F27.4: o editor mostra porque as regras o evitariam, mas deixa escolher.
  await expect(treino.getByText('As regras evitariam este exercício por causa do ombro.')).toBeVisible()
  await treino.getByLabel('Séries').selectOption('4')
  await treino.getByRole('button', { name: 'Tirar Supino com halteres, pega neutra' }).click()

  // F27.3: sem readaptação e sem descarga, com blocos de 4 semanas.
  await page.getByLabel('Readaptação no início (2 séries, RIR 3–4)').selectOption({ label: 'Sem readaptação' })
  await page.getByLabel(/Semana de descarga no fim de cada bloco/).uncheck()
  await page.getByLabel('Duração de cada bloco').selectOption({ label: '4 semanas' })
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Guardar o meu plano' }).click()

  await expect(page.getByRole('heading', { name: 'Peito e costas' })).toBeVisible()
  await expect(page.getByText(/Bloco 1, semana 1 de 4 · Bloco 2 a partir de/)).toBeVisible()
  await expect(page.getByRole('button', { name: /Supino reto com barra/ })).toContainText('4 × 6–10')
  await expect(page.getByText('Supino com halteres, pega neutra')).toHaveCount(0)

  // O plano próprio fica marcado em «Mais» e volta a abrir no editor.
  await page.getByRole('link', { name: 'Mais' }).click()
  await expect(page.getByText('Estás a usar um plano criado por ti.')).toBeVisible()
  await page.getByRole('button', { name: 'Editar o meu plano' }).click()
  await expect(page.getByLabel('Readaptação no início (2 séries, RIR 3–4)')).toHaveValue('0')
  await expect(page.getByLabel(/Semana de descarga no fim de cada bloco/)).not.toBeChecked()
})

test('F28: lista de equipamento, só barra fixa e halteres até 20 kg', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Bem-vindo' })).toBeVisible()
  await page.getByLabel('Idade').fill('45')
  await page.getByLabel('Altura (cm)').fill('175')
  await page.getByLabel('Peso (kg)').fill('85')
  await page.getByLabel('Dias por semana').selectOption('4')
  // Por omissão está tudo marcado; «Só o peso do corpo» desmarca tudo.
  await expect(page.getByLabel('Máquinas de musculação')).toBeChecked()
  await page.getByRole('button', { name: 'Só o peso do corpo' }).click()
  await expect(page.getByLabel('Máquinas de musculação')).not.toBeChecked()
  await expect(page.getByLabel(/Halter mais pesado/)).toHaveCount(0)
  await page.getByLabel('Barra fixa (elevações)').check()
  await page.getByLabel('Halteres').check()
  await page.getByLabel(/Halter mais pesado/).fill('20')
  await page.getByLabel('Nenhuma').check()
  for (let i = 0; i < 7; i++) await page.locator(`input[name="parq-${i}"]`).nth(1).check()
  await page.getByRole('button', { name: 'Gerar o meu plano' }).click()

  await expect(page.getByRole('heading', { name: 'Superior A' })).toBeVisible()
  await expect(page.getByText('Elevações na barra')).toBeVisible()
  await expect(page.getByText('Remada sentada no cabo (triângulo)')).toHaveCount(0)

  // A anamnese volta a abrir com a lista e o halter mais pesado.
  await page.getByRole('link', { name: 'Mais' }).click()
  await page.getByRole('button', { name: 'Editar anamnese e gerar novo plano' }).click()
  await expect(page.getByLabel('Barra fixa (elevações)')).toBeChecked()
  await expect(page.getByLabel('Polias (cabos)')).not.toBeChecked()
  await expect(page.getByLabel(/Halter mais pesado/)).toHaveValue('20')
})

test('F29: modo férias adapta o treino de hoje e termina sem mudar o plano', async ({ page }) => {
  await preencherAnamnese(page)
  await expect(page.getByText('Supino com halteres, pega neutra')).toBeVisible()

  await page.getByRole('link', { name: 'Mais' }).click()
  await page.getByRole('button', { name: 'Marcar férias' }).click()
  const ferias = page.getByRole('group', { name: 'Que equipamento vais ter' })
  await ferias.getByRole('button', { name: 'Só o peso do corpo' }).click()
  await ferias.getByLabel('Barra fixa (elevações)').check()
  await page.getByRole('button', { name: 'Ativar modo férias' }).click()
  await expect(page.getByText(/Ativo até .*Barra fixa \(elevações\)/)).toBeVisible()

  await page.getByRole('link', { name: 'Hoje' }).click()
  await expect(page.getByText('Flexões de braços')).toBeVisible()
  await expect(page.getByText('Supino com halteres, pega neutra')).toHaveCount(0)
  // A barra fixa serve a remada invertida; as elevações ficam de fora por causa do ombro.
  await expect(page.getByText('Remada invertida (corpo sob uma barra baixa)')).toBeVisible()
  await expect(page.getByText('Elevações na barra')).toHaveCount(0)

  page.on('dialog', (d) => void d.accept())
  await page.getByRole('link', { name: 'Mais' }).click()
  await page.getByRole('button', { name: 'Terminar férias' }).click()
  await expect(page.getByRole('button', { name: 'Marcar férias' })).toBeVisible()
  await page.getByRole('link', { name: 'Hoje' }).click()
  await expect(page.getByText('Supino com halteres, pega neutra')).toBeVisible()
})

test('F30: escada de variações nas flexões, mudança de degrau guardada e peso extra', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Bem-vindo' })).toBeVisible()
  await page.getByLabel('Idade').fill('45')
  await page.getByLabel('Altura (cm)').fill('175')
  await page.getByLabel('Peso (kg)').fill('85')
  await page.getByLabel('Dias por semana').selectOption('4')
  await page.getByRole('button', { name: 'Só o peso do corpo' }).click()
  await page.getByLabel('Nenhuma').check()
  for (let i = 0; i < 7; i++) await page.locator(`input[name="parq-${i}"]`).nth(1).check()
  await page.getByRole('button', { name: 'Gerar o meu plano' }).click()

  await page.getByText('Flexões de braços').first().click()
  await expect(page.getByRole('heading', { name: 'Flexões de braços' })).toBeVisible()
  await expect(page.getByText('Escada «Flexões»: degrau 4 de 9')).toBeVisible()
  await expect(page.getByText(/Primeira vez nesta variação: faz a 1.ª série aqui/)).toBeVisible()
  await page.getByRole('button', { name: 'Mais difícil: Flexões declinadas (pés elevados)' }).click()

  await expect(page.getByRole('heading', { name: 'Flexões declinadas (pés elevados)' })).toBeVisible()
  await expect(page.getByText('Escada «Flexões»: degrau 5 de 9')).toBeVisible()
  await expect(page.getByText('Variação atual (o plano tinha «Flexões de braços»).')).toBeVisible()

  // F30.6: peso extra, com campo de carga próprio.
  await expect(page.getByLabel('Peso extra (kg)')).toHaveCount(0)
  await page.getByLabel('Como contas o peso?').selectOption('peso-extra')
  await expect(page.getByLabel('Peso extra (kg)')).toBeVisible()

  // A mudança fica guardada: o treino de hoje já mostra a variação nova.
  await page.getByRole('link', { name: 'Hoje' }).click()
  await expect(page.getByText('Flexões declinadas (pés elevados)').first()).toBeVisible()
  await expect(page.getByText('Flexões de braços')).toHaveCount(0)
})

test('F31: plano de calistenia com competências, níveis, músculos em três tons e aviso', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Bem-vindo' })).toBeVisible()
  await page.getByLabel('Idade').fill('45')
  await page.getByLabel('Altura (cm)').fill('175')
  await page.getByLabel('Peso (kg)').fill('85')
  await page.getByLabel('Tipo de treino').selectOption('calistenia')
  await expect(page.getByLabel('Ênfase')).toHaveCount(0)
  await expect(page.getByLabel('Modelo de treino')).toHaveCount(0)
  await expect(page.getByText(/não substituem a orientação de um profissional qualificado/)).toBeVisible()
  await page.getByLabel('Incluir competências (pino, front lever, planche)').check()
  await page.getByRole('button', { name: 'Só o peso do corpo' }).click()
  await page.getByLabel('Barra fixa (elevações)').check()
  await page.getByLabel('Nenhuma').check()
  for (let i = 0; i < 7; i++) await page.locator(`input[name="parq-${i}"]`).nth(1).check()
  await page.getByRole('button', { name: 'Gerar o meu plano' }).click()

  await expect(page.getByRole('heading', { name: 'Calistenia A' })).toBeVisible()
  await page.getByText('Pino de costas para a parede').click()
  await expect(page.getByText('Nível: Intermédio')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Músculos trabalhados: Ombros. Auxiliares 1: Tríceps. Auxiliares 2: Core.' })).toBeVisible()
  await expect(page.locator('.musculo.terciario[data-grupo="core"]').first()).toBeAttached()
  await expect(page.getByText('Auxiliar 2', { exact: true })).toBeVisible()
  await expect(page.getByText('Escada «Pino»: degrau 1 de 3')).toBeVisible()
  await expect(page.locator('.letra-pequena')).toContainText('O programador e os responsáveis pela app não assumem responsabilidade')

  await page.getByRole('link', { name: 'Mais' }).click()
  await page.getByRole('button', { name: 'Calistenia: exercícios por nível' }).click()
  await expect(page.getByRole('heading', { name: 'Competência' })).toBeVisible()
  await page.getByText('Planche', { exact: true }).click()
  await expect(page.getByText('Planche, degrau 5 de 5')).toBeVisible()
  await expect(page.locator('.letra-pequena')).toBeVisible()
})

test('F32: teste de nivelamento opcional, aplicado ao plano, e fase por padrão nos relatórios', async ({ page }) => {
  await page.goto('./')
  await page.getByLabel('Idade').fill('45')
  await page.getByLabel('Altura (cm)').fill('175')
  await page.getByLabel('Peso (kg)').fill('85')
  await page.getByLabel('Tipo de treino').selectOption('calistenia')
  await page.getByRole('button', { name: 'Só o peso do corpo' }).click()
  await page.getByLabel('Barra fixa (elevações)').check()
  await page.getByLabel('Nenhuma').check()
  for (let i = 0; i < 7; i++) await page.locator(`input[name="parq-${i}"]`).nth(1).check()
  await page.getByRole('button', { name: 'Gerar o meu plano' }).click()

  // F32.2: o ecrã «Hoje» propõe o teste antes do primeiro treino.
  await expect(page.getByRole('heading', { name: 'Calistenia A' })).toBeVisible()
  await expect(page.getByText('Flexões inclinadas (mãos num banco)')).toBeVisible()
  await page.getByRole('button', { name: 'Fazer o teste' }).click()
  await expect(page.getByRole('heading', { name: 'Teste de nivelamento' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Aplicar ao plano' })).toBeDisabled()

  // F32.3: abaixo do mínimo, pede o degrau de baixo.
  await page.getByLabel('Flexões de braços (repetições)').fill('3')
  await page.getByRole('button', { name: 'Registar' }).first().click()
  await page.getByLabel('Flexões de joelhos (repetições)').fill('8')
  await page.getByRole('button', { name: 'Registar' }).first().click()
  await expect(page.getByText('Ficas em «Flexões de joelhos» (degrau 3 de 9).')).toBeVisible()
  // No topo da faixa, sobe um degrau.
  await page.getByLabel('Elevações na barra (repetições)').fill('15')
  await page.getByRole('button', { name: 'Registar' }).first().click()
  await expect(page.getByText('Ficas em «Elevações ao peito» (degrau 4 de 7).')).toBeVisible()
  await page.getByRole('button', { name: 'Saltar' }).first().click()
  await expect(page.getByText('Saltado: o plano mantém este padrão como está.')).toBeVisible()
  await expect(page.locator('.letra-pequena')).toBeVisible()
  await page.getByRole('button', { name: 'Aplicar ao plano' }).click()
  await expect(page.getByText('Teste guardado. O plano já mostra os degraus do teste.')).toBeVisible()

  // F32.4: o plano mostra os degraus do teste e o cartão do teste deixa de aparecer.
  await page.getByRole('link', { name: 'Hoje' }).click()
  await expect(page.getByText('Flexões de joelhos').first()).toBeVisible()
  await expect(page.getByText('Flexões inclinadas (mãos num banco)')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Fazer o teste' })).toHaveCount(0)

  // F32.5: fase por padrão em «Relatórios».
  await page.getByRole('link', { name: 'Relatórios' }).click()
  await page.getByRole('tab', { name: 'Degraus' }).click()
  await expect(page.getByRole('heading', { name: 'Fase por padrão' })).toBeVisible()
  await expect(page.getByText(/^Nível geral: Base\. Prioridade: /)).toBeVisible()
  await expect(page.getByText('Flexões de joelhos · Base · degrau 3 de 9')).toBeVisible()
  await expect(page.getByText(/Último teste:/)).toBeVisible()
  await expect(page.getByText('Regista treinos para ver a linha temporal dos degraus.')).toBeVisible()
})

test.describe('5. ecrã estreito', () => {
  // iPhone SE (1.ª geração), o ecrã mais estreito que a app suporta.
  test.use({ viewport: { width: 320, height: 568 } })

  async function problemas(page: Page): Promise<string[]> {
    return page.evaluate(() => {
      const g = globalThis as unknown as { document: { scrollingElement: { scrollWidth: number }; querySelectorAll: (s: string) => Iterable<{ tagName: string; textContent: string | null; scrollWidth: number; clientWidth: number; getBoundingClientRect: () => { left: number; right: number; width: number } }> }; innerWidth: number }
      const largura = g.innerWidth
      const r: string[] = []
      if (g.document.scrollingElement.scrollWidth > largura + 1) r.push(`página com ${g.document.scrollingElement.scrollWidth} px`)
      for (const el of g.document.querySelectorAll('button, a, select, input, label, summary, .chip, h1, h2, h3, li, p')) {
        const b = el.getBoundingClientRect()
        if (b.width === 0) continue
        const nome = `${el.tagName.toLowerCase()} «${(el.textContent ?? '').trim().slice(0, 40)}»`
        if (b.right > largura + 1 || b.left < -1) r.push(`fora do ecrã: ${nome}`)
        if (['BUTTON', 'A'].includes(el.tagName) && el.scrollWidth > el.clientWidth + 1) r.push(`texto cortado: ${nome}`)
      }
      return [...new Set(r)]
    })
  }

  for (const [idioma, nome] of [['pt', ''], ['en', 'English'], ['es', 'Español']] as const) {
    test(`5. nada sai do ecrã nem fica cortado (${idioma})`, async ({ page }) => {
      await preencherAnamnese(page)
      await expect(page.locator('ul button.item').first()).toBeVisible()
      if (nome) {
        await page.goto('./#/mais')
        await page.getByRole('radio', { name: nome }).click()
        await expect(page.getByRole('radio', { name: nome })).toHaveAttribute('aria-checked', 'true')
      }
      const encontrados: string[] = []
      const ver = async (onde: string) => { for (const x of await problemas(page)) encontrados.push(`${onde}: ${x}`) }
      for (const rota of ['hoje', 'inicio', 'relatorios', 'medicoes', 'fotos', 'mais', 'calistenia', 'nivelamento', 'meu-plano', 'alongamento', 'anamnese', 'meu-exercicio/novo', 'reportar', 'cardio', 'programas-cardio']) {
        await page.goto(`./#/${rota}`)
        await expect(page.locator('h1').first()).toBeVisible()
        await ver(rota)
        if (rota === 'relatorios') for (const aba of await page.getByRole('tab').all()) { await aba.click(); await ver(`${rota} › ${await aba.textContent()}`) }
        if (rota === 'hoje') { await page.locator('ul button.item').first().click(); await expect(page.locator('h1').first()).toBeVisible(); await ver('exercício') }
      }
      expect(encontrados).toEqual([])
    })
  }
})

test('F33: registo no topo do exercício, 5 separadores e conquistas resumidas', async ({ page }) => {
  await preencherAnamnese(page)
  await expect(page.locator('ul button.item').first()).toBeVisible()

  // F33.2: 5 separadores; as fotos estão dentro de «Medições».
  await expect(page.locator('nav.navegacao a')).toHaveCount(5)
  await page.getByRole('link', { name: 'Medições' }).click()
  await page.getByRole('link', { name: 'Fotos' }).click()
  await expect(page.getByRole('heading', { name: 'Fotos' })).toBeVisible()
  await expect(page.locator('nav.navegacao a[aria-current="page"]')).toHaveText('Medições')
  await page.getByRole('link', { name: 'Medidas' }).click()
  await expect(page.getByRole('heading', { name: 'Medições' })).toBeVisible()

  // F33.3: as 3 seguintes por obter e «Ver todas».
  await page.getByRole('link', { name: 'Início' }).click()
  await expect(page.locator('.conquistas li')).toHaveCount(3)
  await page.getByRole('button', { name: 'Ver todas (12)' }).click()
  await expect(page.locator('.conquistas li')).toHaveCount(12)

  // F33.1: o registo vem antes dos músculos e da técnica, que estão abertos na primeira vez.
  await page.getByRole('link', { name: 'Hoje' }).click()
  await page.locator('ul button.item').first().click()
  const registo = await page.getByRole('button', { name: 'Concluir série' }).boundingBox()
  const tecnica = page.locator('details', { hasText: 'Músculos, técnica e vídeo' })
  await expect(tecnica).toHaveAttribute('open', '')
  expect(registo!.y).toBeLessThan((await tecnica.boundingBox())!.y)
  await expect(tecnica.getByRole('img', { name: /Músculos trabalhados/ })).toBeVisible()
})

test.describe('F34: reportar ou sugerir', () => {
  // No WebKit, um pedido de uma página controlada pelo service worker não passa por page.route e chegava ao serviço real.
  test.use({ serviceWorkers: 'block' })
  test('F34.1–F34.4: do exercício, envia só os campos previstos, confirma e espera 60 s', async ({ page }) => {
    const enviados: Record<string, string>[] = []
    const consola: string[] = []
    page.on('console', (m) => consola.push(m.text()))
    page.on('requestfailed', (r) => consola.push(`falhou ${r.method()} ${r.url()}: ${r.failure()?.errorText}`))
    // O pedido é de outra origem: o WebKit faz a verificação CORS (e a pré-verificação) mesmo com a resposta simulada.
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Accept', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
    await page.route('https://api.web3forms.com/submit', async (r) => {
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors })
      enviados.push(r.request().postDataJSON())
      await r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: '{"success":true}' })
    })
    await preencherAnamnese(page)
    await page.getByText('Supino com halteres, pega neutra').click()
    await page.getByRole('button', { name: 'Reportar um problema neste exercício' }).click()
    await expect(page.getByRole('heading', { name: 'Reportar ou sugerir' })).toBeVisible()
    await expect(page.getByText('Supino com halteres, pega neutra')).toBeVisible()
    await expect(page.getByText(/Nunca os teus dados de saúde/)).toBeVisible()

    await page.getByRole('button', { name: 'Enviar', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('Escolhe um motivo.')
    await page.getByLabel('Outro').check()
    await page.getByRole('button', { name: 'Enviar', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('Descreve o problema ou a sugestão.')

    await page.getByLabel('Vídeo incorreto').check()
    await page.getByLabel('Descrição (opcional)').fill('O vídeo mostra outro exercício.')
    await page.getByRole('button', { name: 'Enviar', exact: true }).click()
    await expect(page.getByRole('status').or(page.getByRole('alert'))).toBeVisible()
    await expect(page.getByRole('alert'), `pedidos intercetados: ${enviados.length}; consola: ${consola.join(' | ')}`).toHaveCount(0)
    await expect(page.getByRole('status')).toContainText('Obrigado! O reporte foi enviado.')
    expect(enviados).toHaveLength(1)
    const corpo = enviados[0]!
    expect(Object.keys(corpo).sort()).toEqual(['access_key', 'botcheck', 'descricao', 'from_name', 'idioma', 'motivo', 'sobre', 'subject', 'tipo', 'versao', 'video'])
    expect(corpo).toMatchObject({ access_key: 'chave-de-teste', tipo: 'exercicio', motivo: 'Vídeo incorreto', descricao: 'O vídeo mostra outro exercício.', versao: VERSAO, idioma: 'pt', botcheck: '' })
    expect(corpo.sobre).toContain('Supino com halteres, pega neutra')
    await expect(page.getByLabel('Descrição (opcional)')).toHaveValue('')

    await page.getByLabel('Instrução pouco clara').check()
    await page.getByRole('button', { name: 'Enviar', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('Acabaste de enviar um reporte. Espera um minuto antes de enviar outro.')
    expect(enviados).toHaveLength(1)
  })

  test('F34.4: sem rede ou com erro, avisa e mantém o texto; F34.1 a partir do treino e de Mais', async ({ page }) => {
    await page.route('https://api.web3forms.com/submit', (r) => r.fulfill({ status: 500, body: '' }))
    await preencherAnamnese(page)
    await page.getByRole('button', { name: 'Reportar um problema neste treino' }).click()
    await expect(page.getByRole('heading', { name: 'Reportar ou sugerir' })).toBeVisible()
    await expect(page.locator('main p').filter({ hasText: 'Superior A' })).toBeVisible()
    await expect(page.getByLabel('Duração ou volume desadequado')).toBeVisible()
    await page.getByLabel('Duração ou volume desadequado').check()
    await page.getByLabel('Descrição (opcional)').fill('Demora mais de uma hora.')
    await page.getByRole('button', { name: 'Enviar', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Não foi possível enviar.')
    await expect(page.getByLabel('Descrição (opcional)')).toHaveValue('Demora mais de uma hora.')

    await page.getByRole('link', { name: 'Mais' }).click()
    await page.getByRole('button', { name: 'Reportar ou sugerir' }).click()
    await expect(page.getByLabel('Sugestão')).toBeVisible()
    await expect(page.getByLabel('Tradução incorreta')).toBeVisible()
    await page.getByLabel('Sugestão').check()
    await expect(page.getByLabel('Descrição', { exact: true })).toBeVisible()
  })
})

test('F35: equipamento escolhido visível, sugestão de instalar e parabéns que se podem desligar', async ({ page }) => {
  await page.goto('./')
  // F35.1: numa anamnese nova vem tudo marcado, e o atalho correspondente fica destacado.
  const completo = page.getByRole('button', { name: 'Ginásio completo' })
  const corpo = page.getByRole('button', { name: 'Só o peso do corpo' })
  await expect(completo).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Escolhido: ginásio completo, com todo o equipamento da lista.')).toBeVisible()
  await corpo.click()
  await expect(corpo).toHaveAttribute('aria-pressed', 'true')
  await expect(completo).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('Escolhido: só o peso do corpo, sem equipamento.')).toBeVisible()
  await page.getByLabel('Halteres', { exact: true }).check()
  await expect(page.getByText('Escolhido: 1 de 8 equipamentos.')).toBeVisible()
  await completo.click()

  await preencherAnamnese(page)
  // F35.2: no iPhone, os passos do Safari; «Agora não» fecha de vez.
  const instalar = page.getByRole('region', { name: 'Instalar a app' })
  await expect(instalar).toContainText('Adicionar ao ecrã principal')
  await instalar.getByRole('button', { name: 'Agora não' }).click()
  await expect(instalar).toHaveCount(0)
  await page.reload()
  await expect(page.locator('ul button.item').first()).toBeVisible()
  await expect(instalar).toHaveCount(0)

  // F35.4: desligado em Mais, terminar o treino não mostra a janela.
  await page.getByRole('link', { name: 'Mais' }).click()
  const opcao = page.getByLabel('Mostrar parabéns ao terminar um treino e ao alcançar metas')
  await expect(opcao).toBeChecked()
  // A caixa reflete o valor guardado, que chega um instante depois do toque.
  await opcao.click()
  await expect(opcao).not.toBeChecked()
  await page.getByRole('link', { name: 'Hoje' }).click()
  await page.locator('ul button.item').first().click()
  await page.getByRole('button', { name: 'Saltar', exact: true }).click()
  await page.getByRole('button', { name: /‹ Superior A/ }).click()
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Terminar treino' }).click()
  await expect(page.getByRole('heading', { name: 'Inferior A' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Parabéns' })).toHaveCount(0)
})

test('F36: registar cardio avulso e como complemento, minutos da semana, calendário e apagar', async ({ page }) => {
  await preencherAnamnese(page)
  // F36.1: avulso, a partir do Início.
  await page.getByRole('link', { name: 'Início' }).click()
  await page.getByRole('button', { name: '♥ Registar cardio' }).click()
  await expect(page.getByRole('heading', { name: 'Registar cardio' })).toBeVisible()
  await expect(page.getByLabel('Modalidade')).toHaveValue('caminhada')
  // F36.2: os minutos são obrigatórios; o teste da fala segue o esforço; as zonas são uma nota.
  await page.getByRole('button', { name: 'Guardar cardio' }).click()
  await expect(page.getByRole('alert')).toHaveText('Indica os minutos, entre 1 e 300.')
  await page.getByLabel('Minutos').fill('40')
  await page.getByLabel(/Esforço: \d+ de 10/).fill('6')
  await expect(page.getByText('Moderado: consegues falar, mas não cantar.')).toBeVisible()
  await page.getByText('Zonas de frequência cardíaca (nota)').click()
  await expect(page.getByText(/frequência máxima estimada é 177 bpm: moderado 113–135 bpm, vigoroso 136–168 bpm/)).toBeVisible()
  await page.getByLabel('FC média em bpm (opcional)').fill('300')
  await page.getByRole('button', { name: 'Guardar cardio' }).click()
  await expect(page.getByRole('alert')).toHaveText('A frequência cardíaca média tem de estar entre 30 e 230 bpm.')
  await page.getByLabel('FC média em bpm (opcional)').fill('128')
  await page.getByRole('button', { name: 'Guardar cardio' }).click()
  // F36.4: confirmação com os minutos da semana.
  const confirmacao = page.getByRole('status').filter({ hasText: 'Cardio registado:' })
  await expect(confirmacao).toContainText('Caminhada rápida · 40 min · esforço 6/10 · 128 bpm')
  await expect(confirmacao).toContainText('Esta semana: 40 de 150 min recomendados.')
  await expect(confirmacao).not.toContainText('🎉')
  // Vigoroso conta a dobrar: 40 + 2 × 60 chega aos 150 da OMS, com a mensagem de parabéns.
  await page.getByLabel('Modalidade').selectOption('corrida')
  await page.getByLabel('Minutos').fill('60')
  await page.getByLabel(/Esforço: \d+ de 10/).fill('8')
  await expect(page.getByText('Vigoroso: só consegues dizer algumas palavras de cada vez.')).toBeVisible()
  await page.getByLabel('Distância em km (opcional)').fill('9,5')
  await page.getByRole('button', { name: 'Guardar cardio' }).click()
  await expect(confirmacao).toContainText('Corrida · 60 min · esforço 8/10 · 9,5 km')
  await expect(confirmacao).toContainText('Esta semana: 160 de 150 min recomendados.')
  await expect(confirmacao).toContainText('Chegaste aos 150 minutos semanais recomendados pela OMS.')

  // F36.3: nos Relatórios, a semana com os minutos equivalentes; apagar um registo.
  await page.getByRole('link', { name: 'Relatórios' }).click()
  await page.getByRole('tab', { name: 'Semana' }).click()
  const cartao = page.locator('.cartao').filter({ has: page.getByRole('heading', { name: /^Cardio/ }) })
  await expect(cartao).toContainText('160 / 150–300')
  await expect(cartao).toContainText('100 min no total: 40 moderados, 60 vigorosos.')
  page.once('dialog', (d) => d.accept())
  await cartao.getByRole('button', { name: /Apagar cardio de/ }).first().click()
  await expect(cartao).toContainText('40 / 150–300')
  await expect(cartao).not.toContainText('Corrida')

  // F36.1: como complemento do treino do dia, a partir da linha de cardio do plano (Inferior A).
  await page.getByRole('link', { name: 'Hoje' }).click()
  await page.getByLabel('Fazer outro treino').selectOption({ label: 'Inferior A' })
  await expect(page.getByRole('heading', { name: 'Inferior A' })).toBeVisible()
  await page.getByRole('button', { name: /Cardio 10 min/ }).click()
  await expect(page.getByText('Junta-se ao treino de hoje: Inferior A.')).toBeVisible()
  await expect(page.getByLabel('Minutos')).toHaveValue('10')
  await expect(page.getByLabel('Modalidade')).toHaveValue('caminhada')
  await page.getByLabel('Modalidade').selectOption('bicicleta')
  await page.getByRole('button', { name: 'Guardar cardio' }).click()
  await expect(confirmacao).toContainText('Bicicleta · 10 min · esforço 5/10')
  await confirmacao.getByRole('button', { name: 'Voltar' }).click()
  await expect(page.getByRole('heading', { name: 'Inferior A' })).toBeVisible()
  const linhaCardio = page.getByRole('button', { name: /Cardio 10 min/ })
  await expect(linhaCardio).toContainText('Bicicleta · 10 min · esforço 5/10')
  await expect(linhaCardio.locator('.estado')).toHaveText('✓')
  await expect(page.getByRole('button', { name: '♥ Acrescentar cardio' })).toBeVisible()

  // F36.6: no calendário, o dia de hoje tem ♥ e o detalhe lista o cardio.
  await page.getByRole('link', { name: 'Relatórios' }).click()
  await page.getByRole('tab', { name: 'Calendário' }).click()
  await expect(page.locator('[aria-current="date"]')).toHaveAttribute('aria-label', /cardio: 50 min/)
  await expect(page.getByText('♥ Caminhada rápida · 40 min · esforço 6/10 · 128 bpm')).toBeVisible()
  await expect(page.getByText('♥ Bicicleta · 10 min · esforço 5/10')).toBeVisible()
})

test('F37: programas de cardio, bloqueio, próxima sessão, personalizado e só cardio', async ({ page }) => {
  await preencherAnamnese(page)
  await page.getByRole('link', { name: 'Mais' }).click()
  await page.getByRole('button', { name: '♥ Programas de cardio' }).click()
  await expect(page.getByRole('heading', { name: 'Programas de cardio', level: 1 })).toBeVisible()
  // F37.1 e F37.3: os cinco programas; sem «sim» no PAR-Q+ e sem dor no joelho, nada fica bloqueado.
  for (const nome of ['Começar a caminhar', 'Baixo impacto', 'Correr 5 km', 'Intervalos para quem já treina', 'Emagrecer com cardio']) {
    await expect(page.getByRole('region', { name: nome }).getByRole('button', { name: 'Começar' })).toBeVisible()
  }
  await expect(page.getByRole('region', { name: 'Emagrecer com cardio' })).toContainText('Sem mudar a alimentação')

  // F37.4: começar «Correr 5 km» mostra a semana e a próxima sessão, que abre o registo já preenchido.
  await page.getByRole('region', { name: 'Correr 5 km' }).getByRole('button', { name: 'Começar' }).click()
  const cartao = page.getByRole('region', { name: '♥ Correr 5 km' })
  await expect(cartao).toContainText('Semana 1 de 9 · 0 de 3 sessões feitas')
  await expect(cartao).toContainText('Corrida · 8 × (1 min a correr + 1,5 min a andar) · com 5 min a andar antes e depois · 29 min · esforço 6–7')
  await expect(page.getByRole('region', { name: 'Correr 5 km', exact: true }).getByRole('button', { name: 'Programa atual' })).toBeDisabled()
  await cartao.getByRole('button', { name: 'Registar esta sessão' }).click()
  await expect(page.getByText('Sessão do programa «Correr 5 km».')).toBeVisible()
  await expect(page.getByLabel('Modalidade')).toHaveValue('corrida')
  await expect(page.getByLabel('Minutos')).toHaveValue('29')
  await expect(page.getByLabel(/Esforço: \d+ de 10/)).toHaveValue('6')
  await page.getByRole('button', { name: 'Guardar cardio' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Cardio registado:' })).toContainText('Corrida · 29 min')
  await page.getByRole('link', { name: 'Início' }).click()
  await expect(page.getByRole('region', { name: '♥ Correr 5 km' })).toContainText('1 de 3 sessões feitas')

  // F37.2: personalizado com aviso de vigoroso acima de 300 min, e troca com confirmação.
  await page.goto('./#/programas-cardio')
  await page.getByRole('button', { name: 'Criar programa personalizado' }).click()
  await page.getByRole('button', { name: 'Começar programa personalizado' }).click()
  await expect(page.getByRole('alert')).toHaveText('Escolhe pelo menos um dia.')
  const dias = page.getByRole('group', { name: 'Dias' }).getByRole('button')
  for (const d of [0, 1, 2, 3, 4]) await dias.nth(d).click()
  for (const d of await page.locator('.sessao-cardio').all()) {
    await d.getByLabel('Minutos').fill('70')
    await d.getByLabel('Esforço (0–10)').selectOption('8')
  }
  await page.getByLabel('Semanas').fill('2')
  await page.getByLabel('Subida por semana').selectOption('0')
  await expect(page.getByText(/Na última semana fazes 350 min de cardio vigoroso/)).toBeVisible()
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Começar programa personalizado' }).click()
  await expect(page.getByRole('region', { name: '♥ Programa personalizado' })).toContainText('Semana 1 de 2')

  // F37.5: só cardio põe o programa antes do treino de força, com a recomendação de força.
  await page.getByLabel(/Só cardio/).click()
  await expect(page.getByLabel(/Só cardio/)).toBeChecked()
  await page.getByRole('link', { name: 'Hoje' }).click()
  const primeiro = page.locator('main section.cartao').first()
  await expect(primeiro).toHaveAccessibleName('♥ Programa personalizado')
  await expect(primeiro).toContainText('Recomendamos 2 sessões curtas de força por semana')

  // F37.6: terminar o programa tira o cartão; os registos de cardio ficam.
  await page.goto('./#/programas-cardio')
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Terminar programa' }).click()
  await expect(page.getByRole('region', { name: '♥ Programa personalizado' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Relatórios' }).click()
  await page.getByRole('tab', { name: 'Semana' }).click()
  await expect(page.getByText('Corrida · 29 min · esforço 6/10')).toBeVisible()
})

test.describe('F37.3: PAR-Q+ com «sim»', () => {
  test('bloqueia correr 5 km e intervalos, com o motivo', async ({ page }) => {
    await page.goto('./')
    await page.getByLabel('Idade').fill('45')
    await page.getByLabel('Altura (cm)').fill('175')
    await page.getByLabel('Peso (kg)').fill('85')
    await page.getByLabel('Nenhuma').check()
    await page.locator('input[name="parq-0"]').nth(0).check()
    for (let i = 1; i < 7; i++) await page.locator(`input[name="parq-${i}"]`).nth(1).check()
    await page.getByRole('button', { name: 'Gerar o meu plano' }).click()
    await expect(page.locator('ul button.item').first()).toBeVisible()
    await page.goto('./#/programas-cardio')
    await expect(page.getByRole('region', { name: 'Correr 5 km' })).toContainText('🔒 Respondeste «sim» no PAR-Q+')
    await expect(page.getByRole('region', { name: 'Intervalos para quem já treina' }).getByRole('button')).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Começar a caminhar' }).getByRole('button', { name: 'Começar' })).toBeVisible()
  })
})

/** Data local, `semanas` semanas (e mais um dia) antes de hoje. */
function semanasAtras(semanas: number) {
  const d = new Date()
  d.setDate(d.getDate() - semanas * 7 - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function anamnesePosParto(page: Page, dataParto: string, autorizacao: boolean) {
  await page.goto('./')
  await page.getByLabel('Idade').fill('34')
  await page.getByLabel('Altura (cm)').fill('165')
  await page.getByLabel('Peso (kg)').fill('68')
  await page.getByLabel('Sexo').selectOption('feminino')
  await page.getByLabel('Gravidez ou pós-parto').selectOption('pos-parto')
  await page.getByLabel('Nenhuma').check()
  for (let i = 0; i < 7; i++) await page.locator(`input[name="parq-${i}"]`).nth(1).check()
  // F38.1: sem os dados do parto, a anamnese não avança.
  await page.getByRole('button', { name: 'Gerar o meu plano' }).click()
  await expect(page.getByRole('alert')).toHaveText('Indica a data do parto (não pode ser no futuro).')
  await page.getByLabel('Data do parto').fill(dataParto)
  await page.locator('input[name="tipo-parto"]').nth(0).check()
  await page.locator('input[name="autorizacao"]').nth(autorizacao ? 0 : 1).check()
  await page.locator('input[name="sintomas-pp"]').nth(1).check()
  await page.getByRole('button', { name: 'Gerar o meu plano' }).click()
}

test.describe('F38: plano pós-parto', () => {
  test('F38.2–F38.4: fase 2 com caminhada e a pergunta dos sintomas; sem autorização fica na fase 2', async ({ page }) => {
    await anamnesePosParto(page, semanasAtras(8), false)
    const cartao = page.getByRole('region', { name: 'Fase 2: reconstruir a base' })
    await expect(cartao).toContainText('8 semanas desde o parto')
    await expect(cartao).toContainText('Sem autorização médica, o plano fica na fase 2.')
    await expect(page.getByRole('heading', { name: 'Base pós-parto A' })).toBeVisible()
    await expect(page.getByText('Pavimento pélvico: contrações longas')).toBeVisible()
    await expect(page.getByText('Cardio 15 min')).toBeVisible()

    // F38.4: ao abrir o treino, a pergunta dos sintomas; o «sim» fica guardado e mostra o que fazer.
    await page.getByText('Pavimento pélvico: contrações longas').click()
    await page.getByRole('link', { name: 'Hoje' }).click()
    await page.locator('input[name^="sintomas-"]').nth(0).click()
    await expect(page.locator('input[name^="sintomas-"]').nth(0)).toBeChecked()
    await expect(page.getByText('A fase não avança enquanto a resposta mais recente for «sim».')).toBeVisible()
  })

  test('F38.5–F38.6: autoteste da diástase e teste de impacto desbloqueiam a corrida', async ({ page }) => {
    await anamnesePosParto(page, semanasAtras(13), true)
    await expect(page.getByRole('region', { name: 'Fase 4: treino de força' })).toContainText('Já podes fazer o teste de impacto')
    await expect(page.locator('ul button.item').first()).toContainText('Pavimento pélvico: contrações longas')

    await page.goto('./#/programas-cardio')
    await expect(page.getByRole('region', { name: 'Correr 5 km' })).toContainText('🔒 No pós-parto, este programa abre quando passares no teste de impacto')

    await page.goto('./#/pos-parto')
    await expect(page.getByRole('region', { name: 'Para e procura ajuda se tiveres' })).toContainText('Perdas de urina ou de fezes')
    const diastase = page.getByRole('region', { name: 'Autoteste da diástase' })
    await diastase.getByLabel('Dedos').fill('2,5')
    await diastase.getByRole('button', { name: 'Guardar' }).click()
    await expect(diastase).toContainText('Último autoteste: 2,5 dedos')
    await expect(diastase).toContainText('Vale a pena pedir uma avaliação')

    const impacto = page.getByRole('region', { name: 'Teste de impacto' })
    for (const c of await impacto.getByRole('checkbox').all()) await c.click()
    await impacto.getByRole('button', { name: 'Guardar o teste' }).click()
    await expect(page.getByRole('region', { name: 'Regresso ao treino' })).toBeVisible()
    await expect(impacto).toContainText('Passaste no teste em')

    await page.goto('./#/programas-cardio')
    await expect(page.getByRole('region', { name: 'Correr 5 km' }).getByRole('button', { name: 'Começar' })).toBeVisible()
  })
})
