import React from 'react'
import ReactDOM from 'react-dom/client'
import Lume from './Lume.jsx'

// Storage shim: usa localStorage como backend
// (mesma API que o window.storage do Claude)
window.storage = {
  get: async (key) => {
    const val = localStorage.getItem(key)
    return val ? { key, value: val } : null
  },
  set: async (key, value) => {
    localStorage.setItem(key, value)
    return { key, value }
  },
  delete: async (key) => {
    localStorage.removeItem(key)
    return { key, deleted: true }
  },
  list: async (prefix) => {
    const keys = Object.keys(localStorage)
      .filter(k => !prefix || k.startsWith(prefix))
    return { keys }
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Lume />
  </React.StrictMode>
)
