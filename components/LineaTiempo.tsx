import { FileTextIcon, SendIcon, CheckCircleIcon, XCircleIcon, GlobeIcon } from './Icons'

export interface EventoTimeline {
  id: string
  accion: string
  usuario: string
  fecha: string
  comentario?: string | null
}

const ACCION_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  creado:      { label: 'Creado por',          color: '#64748b', bg: '#f8fafc', icon: <FileTextIcon size={14} color="#64748b" /> },
  en_revision: { label: 'Enviado a revisión por', color: '#d97706', bg: '#fffbeb', icon: <SendIcon size={14} color="#d97706" /> },
  aprobado:    { label: 'Aprobado por',        color: '#16a34a', bg: '#f0fdf4', icon: <CheckCircleIcon size={14} color="#16a34a" /> },
  rechazado:   { label: 'Rechazado por',       color: '#dc2626', bg: '#fef2f2', icon: <XCircleIcon size={14} color="#dc2626" /> },
  publicado:   { label: 'Publicado por',       color: '#2563eb', bg: '#eff6ff', icon: <GlobeIcon size={14} color="#2563eb" /> },
}

export default function LineaTiempo({ eventos }: { eventos: EventoTimeline[] }) {
  if (eventos.length === 0) {
    return <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Sin actividad registrada para este registro.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {eventos.map((ev, i) => {
        const cfg = ACCION_CFG[ev.accion] ?? { label: ev.accion, color: '#64748b', bg: '#f8fafc', icon: <FileTextIcon size={14} color="#64748b" /> }
        const isLast = i === eventos.length - 1
        return (
          <div key={ev.id} style={{ display: 'flex', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{
                width: 30, height: 30, borderRadius: '50%',
                background: cfg.bg, border: `1.5px solid ${cfg.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {cfg.icon}
              </span>
              {!isLast && <span style={{ width: 1.5, flex: 1, background: '#e2e8f0', minHeight: 24 }} />}
            </div>
            <div style={{ paddingBottom: isLast ? 0 : 22 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#0f172a' }}>
                <strong>{cfg.label}</strong> {ev.usuario}
              </p>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {new Date(ev.fecha).toLocaleString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              {ev.comentario && (
                <p style={{
                  margin: '8px 0 0', fontSize: 12, color: '#475569',
                  background: cfg.bg, border: `1px solid ${cfg.color}30`,
                  borderRadius: 8, padding: '8px 12px',
                }}>
                  Comentario: &quot;{ev.comentario}&quot;
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
