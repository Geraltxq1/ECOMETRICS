const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  borrador:    { label: 'Borrador',    color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  en_revision: { label: 'En revisión', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  aprobado:    { label: 'Aprobado',    color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  rechazado:   { label: 'Rechazado',   color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  publicado:   { label: 'Publicado',   color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
}

interface EstadoBadgeProps {
  estado: string
  size?: 'sm' | 'md'
}

export default function EstadoBadge({ estado, size = 'md' }: EstadoBadgeProps) {
  const cfg = ESTADO_CONFIG[estado] ?? { label: estado, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' }
  const pad = size === 'sm' ? '2px 7px' : '4px 10px'
  const fs  = size === 'sm' ? 10 : 11

  return (
    <span style={{
      display: 'inline-block',
      padding: pad,
      borderRadius: 6,
      fontSize: fs,
      fontWeight: 700,
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      letterSpacing: '0.2px',
      whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  )
}
