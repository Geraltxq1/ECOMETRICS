'use client'

import { useEffect } from 'react'
import { AlertIcon, InfoIcon, ZapIcon } from './Icons'

interface ModalConfirmacionProps {
  titulo: string
  mensaje: string
  onConfirmar: () => void
  onCancelar: () => void
  tipo?: 'danger' | 'warning' | 'info'
  cargando?: boolean
}

const TIPO_CONFIG = {
  danger:  { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', btnBg: '#dc2626', btnHover: '#b91c1c', icono: <AlertIcon size={22} color="#dc2626" /> },
  warning: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', btnBg: '#d97706', btnHover: '#b45309', icono: <ZapIcon   size={22} color="#d97706" /> },
  info:    { color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', btnBg: '#0284c7', btnHover: '#0369a1', icono: <InfoIcon  size={22} color="#0284c7" /> },
}

export default function ModalConfirmacion({
  titulo,
  mensaje,
  onConfirmar,
  onCancelar,
  tipo = 'danger',
  cargando = false,
}: ModalConfirmacionProps) {
  const cfg = TIPO_CONFIG[tipo]

  // Cierra con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancelar() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancelar])

  return (
    <div
      onClick={onCancelar}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000, padding: 16, animation: 'fadeIn 0.15s ease',
      }}
    >
      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, padding: '28px 32px',
          width: '100%', maxWidth: 440, boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
          border: `1px solid ${cfg.border}`, animation: 'fadeIn 0.15s ease',
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 12, background: cfg.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, marginBottom: 16,
        }}>
          {cfg.icono}
        </div>

        <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
          {titulo}
        </h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
          {mensaje}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancelar}
            disabled={cargando}
            style={{
              padding: '10px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0',
              background: '#fff', color: '#374151', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', opacity: cargando ? 0.6 : 1,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={cargando}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none',
              background: cfg.btnBg, color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', opacity: cargando ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {cargando ? (
              <>
                <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Procesando…
              </>
            ) : 'Confirmar'}
          </button>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
}
