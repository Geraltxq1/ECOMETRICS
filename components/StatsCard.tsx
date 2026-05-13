interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  color?: string
  icon?: string
}

export default function StatsCard({
  title,
  value,
  description,
  color = '#16a34a',
  icon,
}: StatsCardProps) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 14,
      padding: '24px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
            {title}
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#0f172a', lineHeight: 1, letterSpacing: '-1px' }}>
            {value}
          </div>
          {description && (
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{description}</div>
          )}
        </div>
        {icon && (
          <div style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: `${color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0,
          }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ marginTop: 18, height: 3, borderRadius: 99, background: '#f1f5f9' }}>
        <div style={{
          width: '55%',
          height: '100%',
          background: `linear-gradient(90deg, ${color}, ${color}88)`,
          borderRadius: 99,
        }} />
      </div>
    </div>
  )
}
