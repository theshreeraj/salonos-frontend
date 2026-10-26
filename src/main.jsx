import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AppProvider } from './app/AppProvider.jsx'
import ErrorToast from './components/ErrorToast.jsx'
import './index.css'
import { PortalProvider } from './portal/PortalProvider.jsx'
import { CatalogProvider } from './store/CatalogProvider.jsx'
import { StoreProvider } from './store/StoreProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <CatalogProvider>
        <StoreProvider>
          <AppProvider>
            <PortalProvider>
              <App />
              <ErrorToast />
            </PortalProvider>
          </AppProvider>
        </StoreProvider>
      </CatalogProvider>
    </BrowserRouter>
  </StrictMode>,
)
