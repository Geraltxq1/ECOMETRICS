'use client'

import { useEffect } from 'react'
import { CheckCircleIcon, XCircleIcon, InfoIcon } from './Icons'

export interface ToastData {
  id: number
  mensaje: string
  tipo?: 'success' | 'error' | 'info'
}

interface ToastStackProps {
  toasts: ToastData[]
  onDismiss: (id: number) => void
}

const TIPO_CFG = {
  success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
  error:   { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
  info:    { bg: '#f0f9ff', border: '#bae6fd', color: '#0284c7' },
}

export default function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 10001,
      display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360,
    }}>
      {toasts.map(t => <Toast key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  )
}

function Toast({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: number) => void }) {
  const cfg = TIPO_CFG[toast.tipo ?? 'success']

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3500)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderRadius: 10, minWidth: 260,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
      fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      animation: 'toastIn 0.2s ease',
    }}>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}`}</style>
      <span style={{ display: 'flex', flexShrink: 0 }}>
        {toast.tipo === 'error'
          ? <XCircleIcon size={16} color={cfg.color} />
          : toast.tipo === 'info'
          ? <InfoIcon size={16} color={cfg.color} />
          : <CheckCircleIcon size={16} color={cfg.color} />}
      </span>
      <span style={{ flex: 1 }}>{toast.mensaje}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Cerrar"
        style={{
          border: 'none', background: 'transparent', color: cfg.color,
          cursor: 'pointer', fontSize: 14, lineHeight: 1, opacity: 0.6, padding: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}
