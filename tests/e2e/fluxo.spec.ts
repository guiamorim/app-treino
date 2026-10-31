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
  await page.getByLabel('Carga (kg)').fill('16')
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
  await expect(page.getByRole('img', { name: 'Músculos trabalhados: Peito; secundários: Tríceps, Ombros.' })).toBeVisible()
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
    await page.getByLabel('Carga (kg)').fill(carga)
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
  await page.getByLabel('Carga (kg)').fill('16')

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
  await page.getByLabel('Carga (lb)').fill('35')
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
  await page.getByLabel('Carga (kg)').fill('16')
  await page.getByRole('button', { name: 'Concluir série' }).click()
  const temporizador = page.getByRole('timer')
  await expect(temporizador).toBeInViewport()
  await page.mouse.wheel(0, 2000)
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
