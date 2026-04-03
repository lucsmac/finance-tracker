import { createRoot } from 'react-dom/client'
import App from './app/App'
import { ThemeProvider } from './app/components/theme-provider'
import { Toaster } from './app/components/ui/sonner'
import './registerServiceWorker'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
    <Toaster richColors />
  </ThemeProvider>,
)
