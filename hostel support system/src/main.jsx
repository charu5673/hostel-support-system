import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AlertProvider } from './contexts/alert/AlertProvider.jsx';
import { ConfirmProvider } from './contexts/confirm/ConfirmProvider.jsx';
import { LoadingProvider } from './contexts/loading/LoadingProvider.jsx';
import { UpdateProvider } from './contexts/update/UpdateProvider.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AlertProvider>
      <ConfirmProvider>
        <LoadingProvider>
          <UpdateProvider>
            <App />
          </UpdateProvider>
        </LoadingProvider>
      </ConfirmProvider>
    </AlertProvider>
  </StrictMode>,
)