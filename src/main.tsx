import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// When React has flushed the first paint, show the window (Tauri v2)
queueMicrotask(() => {
  try {
    const win = getCurrentWebviewWindow?.()
    if (win && typeof win.show === 'function') {
      // wait two frames so the first paint is ready
      requestAnimationFrame(() => requestAnimationFrame(() => { win.show() }))
    }
  } catch {}
})