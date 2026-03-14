import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AlertProvider } from './contexts/AlertProvider.jsx';
import { ConfirmProvider } from './contexts/ConfirmProvider.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AlertProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </AlertProvider>
  </StrictMode>,
)