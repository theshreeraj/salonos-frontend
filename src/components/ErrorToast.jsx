import { useEffect, useState } from 'react'
import Icon from './Icon'

// Shows failures reported by reportError() in src/api.js
export default function ErrorToast() {
  const [message, setMessage] = useState(null)

  useEffect(() => {
    let timer
    const onError = (e) => {
      setMessage(e.detail)
      clearTimeout(timer)
      timer = setTimeout(() => setMessage(null), 6000)
    }
    window.addEventListener('salonos:error', onError)
    return () => {
      window.removeEventListener('salonos:error', onError)
      clearTimeout(timer)
    }
  }, [])

  if (!message) return null
  return (
    <div className="error-toast" role="alert">
      <Icon name="info" size={18} />
      <span>{message}</span>
      <button type="button" className="icon-btn" onClick={() => setMessage(null)} aria-label="Dismiss">
        <Icon name="x" size={16} />
      </button>
    </div>
  )
}
