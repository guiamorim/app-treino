import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import { registarTrabalhador } from './ui/versao'
import './ui/estilo.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Pede ao navegador para não apagar os dados locais (importante no iPhone).
navigator.storage?.persist?.().catch(() => {})

registarTrabalhador()
