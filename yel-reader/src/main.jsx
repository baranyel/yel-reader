import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ToastProvider } from './components/ui.jsx'
import './index.css'
import { ensureSeeded, removeLegacyKeys } from './utils/storage.js'

ensureSeeded()
removeLegacyKeys()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
)
