import { getRolLabel, getRolColor } from '@/lib/permissions'

interface RoleBadgeProps {
  rol: string
  size?: 'sm' | 'md'
}

export default function RoleBadge({ rol, size = 'md' }: RoleBadgeProps) {
  const label = getRolLabel(rol)
  const color = getRolColor(rol)
  const pad = size === 'sm' ? '2px 7px' : '3px 10px'
  const fs  = size === 'sm' ? 10 : 11

  return (
    <span style={{
      display: 'inline-block',
      padding: pad,
      borderRadius: 6,
      fontSize: fs,
      fontWeight: 700,
      color,
      background: `${color}1A`,
      border: `1px solid ${color}33`,
      letterSpacing: '0.3px',
      textTransform: 'uppercase',
    }}>
      {label}
    </span>
  )
}
