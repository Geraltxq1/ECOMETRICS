'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'

function traducirError(msg: string): string {
  if (msg.includes('Password should be at least')) return 'La contraseña debe tener mínimo 6 caracteres.'
  if (msg.includes('User already registered') || msg.includes('already registered')) return 'Este correo ya está registrado. Intenta iniciar sesión.'
  if (msg.includes('Invalid email')) return 'El correo electrónico no es válido.'
  if (msg.includes('Email not confirmed')) return 'Debes confirmar tu correo antes de continuar.'
  if (msg.includes('signup is disabled')) return 'El registro está deshabilitado temporalmente.'
  if (msg.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos.'
  return 'Error al crear la cuenta. Intenta de nuevo.'
}

export default function RegisterPage() {
  const router  = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [nombre, setNombre]             = useState('')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [usaCodigoInv, setUsaCodigoInv] = useState(false)
  const [codigoInv, setCodigoInv]       = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [esperando, setEsperando]       = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 1. Crear cuenta en Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre, role: usaCodigoInv ? 'editor' : 'admin' } },
    })

    if (authError) { setError(traducirError(authError.message)); setLoading(false); return }
    if (!authData.user) { setError('No se pudo crear la cuenta. Intenta de nuevo.'); setLoading(false); return }

    // Email sin confirmar
    if (!authData.session) { setEsperando(true); setLoading(false); return }

    const userId = authData.user.id

    if (usaCodigoInv && codigoInv.trim()) {
      // 2a. Validar código de invitación
      const { data: codigo, error: codErr } = await supabase
        .from('codigos_invitacion')
        .select('id, empresa_id, rol_asignado')
        .eq('codigo', codigoInv.trim().toUpperCase())
        .eq('usado', false)
        .gt('expira_en', new Date().toISOString())
        .single()

      if (codErr || !codigo) {
        setError('Código de invitación inválido o expirado.')
        setLoading(false)
        return
      }

      // Crear perfil vinculado a empresa existente
      await supabase.from('perfiles').insert({
        user_id:    userId,
        empresa_id: codigo.empresa_id,
        nombre,
        email,
        rol:        codigo.rol_asignado ?? 'editor',
        activo:     true,
      } as never)

      // Marcar código como usado
      await supabase
        .from('codigos_invitacion')
        .update({ usado: true, usado_por: userId } as never)
        .eq('id', codigo.id)

    } else {
      // 2b. Crear empresa nueva + perfil admin
      const { data: empresa, error: empErr } = await supabase
        .from('empresas')
        .insert({ nombre: nombre + ' Corp', user_id: userId } as never)
        .select('id')
        .single()

      if (empErr || !empresa) {
        setError('Cuenta creada, pero hubo un problema al guardar la empresa. Inicia sesión e intenta de nuevo.')
        setLoading(false)
        return
      }

      await supabase.from('perfiles').insert({
        user_id:    userId,
        empresa_id: empresa.id,
        nombre,
        email,
        rol:        'admin',
        activo:     true,
      } as never)
    }

    router.push('/dashboard')
  }

  if (esperando) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.successIcon}>✉</div>
          <h2 style={s.successTitle}>Confirma tu correo</h2>
          <p style={s.successText}>
            Enviamos un enlace de activación a <strong>{email}</strong>.
            Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
          </p>
          <Link href="/login" style={s.linkBlock}>Ir al inicio de sesión</Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        .eco-input:focus { border-color: #16a34a !important; box-shadow: 0 0 0 3px rgba(22,163,74,0.1) !important; }
        .eco-btn:hover:not(:disabled) { background: linear-gradient(135deg,#15803d,#166534) !important; transform: translateY(-1px); }
        .eco-toggle:checked { accent-color: #16a34a; }
      `}</style>

      <div style={s.page}>
        <div style={s.card}>

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#16a34a' }}>ECØ</span>
              <span style={{ fontSize: 26, fontWeight: 300, color: '#15803d', letterSpacing: 2 }}>METRICS</span>
            </Link>
            <p style={s.subtitle}>Crea tu cuenta para comenzar</p>
          </div>

          <form onSubmit={handleRegister} style={s.form}>

            <div style={s.field}>
              <label style={s.label}>Tu nombre</label>
              <input className="eco-input" style={s.input} type="text" value={nombre}
                onChange={e => setNombre(e.target.value)} placeholder="Juan García" required />
            </div>

            <div style={s.field}>
              <label style={s.label}>Correo electrónico</label>
              <input className="eco-input" style={s.input} type="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="juan@empresa.com" required />
            </div>

            <div style={s.field}>
              <label style={s.label}>Contraseña</label>
              <input className="eco-input" style={s.input} type="password" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
            </div>

            {/* Toggle código de invitación */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', borderRadius: 10, background: usaCodigoInv ? '#f0fdf4' : '#f8fafc', border: `1.5px solid ${usaCodigoInv ? '#bbf7d0' : '#e2e8f0'}`, transition: 'all 0.15s' }}>
              <input
                type="checkbox"
                className="eco-toggle"
                checked={usaCodigoInv}
                onChange={e => setUsaCodigoInv(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: usaCodigoInv ? '#16a34a' : '#374151' }}>
                ¿Tienes código de invitación?
              </span>
            </label>

            {usaCodigoInv && (
              <div style={s.field}>
                <label style={s.label}>Código de invitación</label>
                <input
                  className="eco-input"
                  style={{ ...s.input, letterSpacing: 2, textTransform: 'uppercase' }}
                  type="text"
                  value={codigoInv}
                  onChange={e => setCodigoInv(e.target.value)}
                  placeholder="ECO-2025-XXXX"
                  required={usaCodigoInv}
                />
                <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  Te unirás a una empresa existente con el rol asignado.
                </span>
              </div>
            )}

            {!usaCodigoInv && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                  🏢 Sin código: se creará una empresa nueva y serás el administrador.
                </p>
              </div>
            )}

            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button className="eco-btn" type="submit" disabled={loading}
              style={{ ...s.button, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Creando cuenta...' : (usaCodigoInv ? 'Unirse a empresa' : 'Crear cuenta y empresa')}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#64748b' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" style={{ color: '#16a34a', fontWeight: 600, textDecoration: 'none' }}>Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)',
    padding: 20, fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    background: '#fff', borderRadius: 16, padding: '44px 40px',
    width: '100%', maxWidth: 440,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0',
  },
  subtitle: { textAlign: 'center', color: '#64748b', fontSize: 14, margin: '8px 0 0' },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: {
    padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
    fontSize: 14, color: '#1f2937', background: '#fafafa', outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  button: {
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: '#fff', padding: '13px', borderRadius: 10,
    border: 'none', fontSize: 15, fontWeight: 600, transition: 'all 0.15s',
  },
  successIcon: {
    width: 64, height: 64, borderRadius: '50%', background: '#dcfce7',
    color: '#16a34a', fontSize: 28, display: 'flex', alignItems: 'center',
    justifyContent: 'center', margin: '0 auto 16px',
  },
  successTitle: { textAlign: 'center', color: '#16a34a', fontSize: 22, margin: '0 0 8px' },
  successText: { textAlign: 'center', color: '#64748b', fontSize: 14, lineHeight: 1.6 },
  linkBlock: {
    display: 'block', textAlign: 'center', marginTop: 20,
    color: '#16a34a', fontWeight: 600, textDecoration: 'none', fontSize: 14,
  },
}
