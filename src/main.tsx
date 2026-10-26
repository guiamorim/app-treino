import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import { ProtecaoErros } from './ui/Erro'
import { registarTrabalhador } from './ui/versao'
import './ui/estilo.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProtecaoErros>
      <App />
    </ProtecaoErros>
  </StrictMode>,
)

// Pede ao navegador para não apagar os dados locais (importante no iPhone).
navigator.storage?.persist?.().catch(() => {})

registarTrabalhador()
