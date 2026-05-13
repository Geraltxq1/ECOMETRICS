interface HeaderProps {
  title: string
  email?: string
  empresa?: string
  breadcrumb?: { label: string; href?: string }[]
}

export default function Header({ title, email, empresa, breadcrumb }: HeaderProps) {
  return (
    <div style={{
      minHeight: 62,
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      flexShrink: 0,
      gap: 16,
    }}>
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            {breadcrumb.map((b, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span style={{ color: '#cbd5e1', fontSize: 11 }}>›</span>}
                {b.href ? (
                  <a href={b.href} style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'none', fontWeight: 500 }}>{b.label}</a>
                ) : (
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{b.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' }}>
          {title}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        {empresa && (
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#374151',
            background: '#f1f5f9',
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid #e2e8f0',
          }}>
            {empresa}
          </span>
        )}
        <span style={{
          background: '#f0fdf4',
          color: '#16a34a',
          border: '1px solid #bbf7d0',
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: 100,
          letterSpacing: '0.4px',
          textTransform: 'uppercase',
        }}>
          Sistema activo
        </span>
        {email && (
          <span style={{
            fontSize: 13,
            color: '#64748b',
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {email}
          </span>
        )}
      </div>
    </div>
  )
}
