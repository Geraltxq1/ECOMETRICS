'use client'

import { useEffect, useState } from 'react'
import { CheckCircleIcon, XCircleIcon } from './Icons'

interface ModalRevisionProps {
  accion: 'aprobado' | 'rechazado'
  onConfirmar: (comentario: string) => void
  onCancelar: () => void
  cargando?: boolean
}

const CFG = {
  aprobado: {
    titulo: 'Aprobar registro', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0',
    btnLabel: 'Confirmar aprobación', icono: <CheckCircleIcon size={22} color="#16a34a" />,
    obligatorio: false, fallback: 'Aprobado sin comentarios adicionales.',
    placeholder: 'Comentario (opcional)...',
  },
  rechazado: {
    titulo: 'Rechazar registro', color: '#dc2626', bg: '#fef2f2', border: '#fecaca',
    btnLabel: 'Confirmar rechazo', icono: <XCircleIcon size={22} color="#dc2626" />,
    obligatorio: true, fallback: '',
    placeholder: 'Explica por qué se rechaza este registro…',
  },
}

export default function ModalRevision({ accion, onConfirmar, onCancelar, cargando = false }: ModalRevisionProps) {
  const [comentario, setComentario] = useState('')
  const cfg = CFG[accion]
  const puedeConfirmar = cfg.obligatorio ? comentario.trim().length > 0 : true

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancelar() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancelar])

  function confirmar() {
    if (!puedeConfirmar) return
    onConfirmar(comentario.trim() || cfg.fallback)
  }

  return (
    <div
      onClick={onCancelar}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000, padding: 16,
      }}
    >
      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, padding: '28px 32px',
          width: '100%', maxWidth: 460, boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
          border: `1px solid ${cfg.border}`, animation: 'fadeIn 0.15s ease',
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 12, background: cfg.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}>
          {cfg.icono}
        </div>

        <h3 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
          {cfg.titulo}
        </h3>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
          Comentario {cfg.obligatorio ? '(obligatorio)' : '(opcional)'}
        </label>
        <textarea
          autoFocus
          value={comentario}
          onChange={e => setComentario(e.target.value)}
          placeholder={cfg.placeholder}
          style={{
            width: '100%', minHeight: 100, borderRadius: 10, border: '1.5px solid #e2e8f0',
            padding: 12, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
          }}
        />

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
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
            onClick={confirmar}
            disabled={cargando || !puedeConfirmar}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none',
              background: cfg.color, color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: cargando || !puedeConfirmar ? 'not-allowed' : 'pointer',
              opacity: cargando || !puedeConfirmar ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {cargando ? (
              <>
                <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                Procesando…
              </>
            ) : cfg.btnLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
