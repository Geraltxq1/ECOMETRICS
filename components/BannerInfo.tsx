import { InfoIcon, AlertIcon, CheckCircleIcon } from './Icons'

type TipoBanner = 'info' | 'warning' | 'success'

const TIPO_CFG: Record<TipoBanner, { bg: string; border: string; color: string; icon: React.ReactNode }> = {
  info:    { bg: '#eff6ff', border: '#3b82f6', color: '#1d4ed8', icon: <InfoIcon size={18} color="#1d4ed8" /> },
  warning: { bg: '#fffbeb', border: '#f59e0b', color: '#b45309', icon: <AlertIcon size={18} color="#b45309" /> },
  success: { bg: '#f0fdf4', border: '#16a34a', color: '#15803d', icon: <CheckCircleIcon size={18} color="#15803d" /> },
}

export default function BannerInfo({ tipo = 'info', children }: { tipo?: TipoBanner; children: React.ReactNode }) {
  const cfg = TIPO_CFG[tipo]
  return (
    <div style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 12, padding: '14px 18px', marginBottom: 24,
    }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
      <p style={{ margin: 0, fontSize: 13, color: cfg.color, lineHeight: 1.6 }}>{children}</p>
    </div>
  )
}
