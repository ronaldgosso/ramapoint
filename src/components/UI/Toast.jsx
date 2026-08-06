import { useEffect } from 'react'
import { useApp } from '../../context/AppContext.jsx'

export default function Toast() {
  const { state, dispatch, ACTIONS } = useApp()
  const { toast } = state

  useEffect(() => {
    if (toast && toast.visible) {
      const timer = setTimeout(() => {
        dispatch({ type: ACTIONS.HIDE_TOAST })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [toast?.visible, toast?.message, dispatch, ACTIONS])

  if (!toast || !toast.visible || !toast.message) return null

  const typeColors = {
    success: 'linear-gradient(135deg, #10B981, #059669)',
    error: 'linear-gradient(135deg, #EF4444, #DC2626)',
    info: 'linear-gradient(135deg, #3B82F6, #2563EB)',
    warn: 'linear-gradient(135deg, #FBBF24, #D97706)',
  }

  const background = typeColors[toast.type] || typeColors.info

  return (
    <div
      className="toast-container animate-toast-in"
      style={{
        position: 'fixed',
        bottom: '60px',
        right: '24px',
        zIndex: 9999,
        background,
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontWeight: 500,
        fontSize: '14px',
        pointerEvents: 'auto',
      }}
    >
      <span style={{ fontSize: '16px' }}>
        {toast.type === 'success' && '✅'}
        {toast.type === 'error' && '❌'}
        {toast.type === 'info' && 'ℹ️'}
        {toast.type === 'warn' && '⚠️'}
      </span>
      <span>{toast.message}</span>
      <button
        onClick={() => dispatch({ type: ACTIONS.HIDE_TOAST })}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          padding: '0 0 0 8px',
          fontWeight: 'bold',
          opacity: 0.8,
          fontSize: '14px',
        }}
      >
        ✕
      </button>
    </div>
  )
}
