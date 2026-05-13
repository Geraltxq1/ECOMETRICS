import { ROLES, type Role } from '@/lib/permissions'

interface RoleBadgeProps {
  rol: string
  size?: 'sm' | 'md'
}

export default function RoleBadge({ rol, size = 'md' }: RoleBadgeProps) {
  const config = ROLES[rol as Role] ?? { label: rol, color: '#64748b', bg: '#f8fafc' }
  const pad = size === 'sm' ? '2px 7px' : '3px 10px'
  const fs  = size === 'sm' ? 10 : 11

  return (
    <span style={{
      display: 'inline-block',
      padding: pad,
      borderRadius: 6,
      fontSize: fs,
      fontWeight: 700,
      color: config.color,
      background: config.bg,
      border: `1px solid ${config.color}33`,
      letterSpacing: '0.3px',
      textTransform: 'uppercase',
    }}>
      {config.label}
    </span>
  )
}
