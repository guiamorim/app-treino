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
  await expect(page.getByRole('navigation').locator('svg.icone')).toHaveCount(6)

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
  await page.getByText('Como fazer').click()
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
      for (const rota of ['hoje', 'inicio', 'relatorios', 'medicoes', 'fotos', 'mais', 'calistenia', 'nivelamento', 'meu-plano', 'alongamento', 'anamnese', 'meu-exercicio/novo']) {
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
