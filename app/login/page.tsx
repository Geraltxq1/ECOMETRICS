'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
          setError('Correo o contraseña incorrectos.')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Debes confirmar tu correo antes de iniciar sesión.')
        } else if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed')) {
          setError('Error de conexión. Verifica tu internet e intenta de nuevo.')
        } else {
          setError(error.message)
        }
        return
      }

      if (!data?.user || !data?.session) {
        setError('No se pudo iniciar sesión. Revisa tus credenciales o confirma tu correo.')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('fetch') || msg.includes('Failed') || msg.includes('network')) {
        setError('Error de conexión con el servidor. Verifica tu internet.')
      } else {
        setError('Error al iniciar sesión. Intenta de nuevo más tarde.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .eco-left { display: none !important; }
        }
        .eco-input:focus {
          border-color: #16a34a !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1) !important;
        }
        .eco-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #15803d, #166534) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(22, 163, 74, 0.35) !important;
        }
        .eco-eye:hover { color: #374151 !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .eco-spin { animation: spin 0.75s linear infinite; }
      `}</style>

      <div style={s.page}>

        {/* ── Left brand panel ── */}
        <div className="eco-left" style={s.left}>
          <div style={s.leftInner}>
            <div style={s.logo}>
              <span style={s.logoMain}>ECØ</span>
              <span style={s.logoSub}>METRICS</span>
            </div>

            <p style={s.tagline}>
              Plataforma de gestión de sostenibilidad empresarial
            </p>

            <div style={s.features}>
              {[
                { label: 'Indicadores GRI y ESG en tiempo real' },
                { label: 'Seguimiento de huella de carbono' },
                { label: 'Reportes automatizados de sostenibilidad' },
                { label: 'Diagramas de GRI y ESG para la toma de Decisiones' },
              ].map((f, i) => (
                <div key={i} style={s.featureRow}>
                  <span style={s.featureDot}>
                    <CheckIcon />
                  </span>
                  <span style={s.featureText}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Decorative rings */}
          <div style={{ ...s.ring, width: 480, height: 480, bottom: -140, right: -140 }} />
          <div style={{ ...s.ring, width: 320, height: 320, bottom: -60, right: -60 }} />
          <div style={{ ...s.ringFill, width: 220, height: 220, top: -80, left: -80 }} />
        </div>

        {/* ── Right form panel ── */}
        <div style={s.right}>
          <div style={s.card}>

            <div style={s.cardHeader}>
              <h1 style={s.title}>Bienvenido de nuevo</h1>
              <p style={s.subtitle}>Ingresa tus credenciales para continuar con el acceso</p>
            </div>

            <form onSubmit={handleLogin} style={s.form}>

              {/* Email */}
              <div style={s.field}>
                <label style={s.label}>Correo electrónico</label>
                <div style={s.inputWrap}>
                  <span style={s.icon}>
                    <MailIcon />
                  </span>
                  <input
                    className="eco-input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="empresa@correo.com"
                    required
                    style={s.input}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={s.field}>
                <label style={s.label}>Contraseña</label>
                <div style={s.inputWrap}>
                  <span style={s.icon}>
                    <LockIcon />
                  </span>
                  <input
                    className="eco-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ ...s.input, paddingRight: 46 }}
                  />
                  <button
                    type="button"
                    className="eco-eye"
                    onClick={() => setShowPassword(v => !v)}
                    style={s.eyeBtn}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={s.errorBox}>
                  <span style={s.errorBullet}>!</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                className="eco-btn"
                type="submit"
                disabled={loading}
                style={loading ? { ...s.btn, ...s.btnLoading } : s.btn}
              >
                {loading
                  ? <span style={s.btnRow}><span className="eco-spin" style={s.spinnerWrap}><SpinnerIcon /></span>Iniciando sesión…</span>
                  : 'Iniciar sesión'}
              </button>
            </form>

            <div style={s.divider}>
              <span style={s.divLine} />
              <span style={s.divText}>¿No tienes cuenta?</span>
              <span style={s.divLine} />
            </div>

            <Link href="/register" style={s.registerBtn}>
              Crear cuenta nueva
            </Link>
          </div>
        </div>

      </div>
    </>
  )
}

/* ── SVG Icons ── */
function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
function SpinnerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M21 12a9 9 0 1 1-6.22-8.56" />
    </svg>
  )
}

/* ── Styles ── */
const s: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },

  /* Left */
  left: {
    width: '44%',
    background: 'linear-gradient(160deg, #052e16 0%, #14532d 55%, #166534 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 52px',
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
  },
  leftInner: {
    position: 'relative',
    zIndex: 1,
  },
  logo: {
    marginBottom: 18,
    lineHeight: 1,
  },
  logoMain: {
    fontSize: 44,
    fontWeight: 800,
    color: '#4ade80',
    letterSpacing: '-1px',
  },
  logoSub: {
    fontSize: 44,
    fontWeight: 300,
    color: 'rgba(255,255,255,0.82)',
    letterSpacing: 5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
    lineHeight: 1.65,
    margin: '0 0 48px',
    maxWidth: 300,
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  featureRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  featureDot: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(74,222,128,0.15)',
    border: '1px solid rgba(74,222,128,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4ade80',
    flexShrink: 0,
  },
  featureText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 1.4,
  },
  ring: {
    position: 'absolute',
    borderRadius: '50%',
    border: '1px solid rgba(74,222,128,0.07)',
  },
  ringFill: {
    position: 'absolute',
    borderRadius: '50%',
    background: 'rgba(74,222,128,0.04)',
  },

  /* Right */
  right: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffff',
    padding: '40px 24px',
  },
  card: {
    width: '100%',
    maxWidth: 420,
  },
  cardHeader: {
    marginBottom: 36,
  },
  title: {
    margin: 0,
    fontSize: 30,
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    margin: '8px 0 0',
    fontSize: 15,
    color: '#64748b',
  },

  /* Form */
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    letterSpacing: '0.2px',
  },
  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    position: 'absolute',
    left: 14,
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 1,
  },
  input: {
    width: '100%',
    padding: '13px 14px 13px 44px',
    borderRadius: 12,
    border: '1.5px solid #e2e8f0',
    fontSize: 14,
    color: '#1f2937',
    background: '#f8fafc',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    transition: 'color 0.15s',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 10,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    fontSize: 13,
  },
  errorBullet: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#dc2626',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },
  btn: {
    padding: '14px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.2px',
    marginTop: 4,
    transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s',
  },
  btnLoading: {
    opacity: 0.75,
    cursor: 'not-allowed',
    transform: 'none',
  },
  btnRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  spinnerWrap: {
    display: 'flex',
    alignItems: 'center',
  },

  /* Divider */
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    margin: '28px 0 20px',
  },
  divLine: {
    flex: 1,
    height: 1,
    background: '#e2e8f0',
    display: 'block',
  },
  divText: {
    fontSize: 13,
    color: '#94a3b8',
    whiteSpace: 'nowrap',
  },

  /* Register button */
  registerBtn: {
    display: 'block',
    textAlign: 'center',
    padding: '13px',
    borderRadius: 12,
    border: '1.5px solid #e2e8f0',
    background: '#f8fafc',
    color: '#374151',
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'border-color 0.2s, background 0.2s',
  },
}
