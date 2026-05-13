'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'


export default function AdminLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError(null)

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('Correo o contraseña incorrectos.')
      return
    }

    if (!data?.user) {
      setError('No se pudo iniciar sesión.')
      return
    }

    const role = (data.user.user_metadata as { role?: string })?.role

    if (role === 'admin') {
      await router.push('/admin/dashboard')
      return
    }

    setError('No tienes permisos de administrador.')
  } catch (err) {
    setError('Error al iniciar sesión.')
  } finally {
    setLoading(false)
  }
}

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Admin Panel</h1>
        <p style={styles.subtitle}>Ingresa con tu cuenta de administrador</p>

        <form onSubmit={handleLogin} style={styles.form}>
          <label style={styles.label}>Correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />

          <label style={styles.label}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={loading ? { ...styles.button, ...styles.buttonDisabled } : styles.button}>
            {loading ? 'Iniciando sesión...' : 'Entrar como admin'}
          </button>
        </form>

        <p style={styles.footer}>
          ¿No eres admin? <Link href="/login" style={styles.link}>Usa el inicio de sesión normal</Link>
        </p>
        <p style={styles.footer}>
          ¿Necesitas crear un admin? <Link href="/admin/register" style={styles.link}>Regístrate como admin</Link>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    padding: '20px',
    fontFamily: "'Segoe UI', sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#ffffff',
    borderRadius: '18px',
    padding: '42px 36px',
    boxShadow: '0 18px 60px rgba(15, 23, 42, 0.08)',
    border: '1px solid #e2e8f0',
  },
  title: {
    margin: 0,
    marginBottom: '12px',
    fontSize: '28px',
    fontWeight: 700,
    color: '#111827',
  },
  subtitle: {
    margin: 0,
    marginBottom: '28px',
    color: '#4b5563',
    fontSize: '14px',
  },
  form: {
    display: 'grid',
    gap: '18px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    background: '#f8fafc',
    color: '#1f2937',
  },
  button: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    background: '#0f766e',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  error: {
    margin: 0,
    padding: '12px',
    borderRadius: '10px',
    background: '#fee2e2',
    color: '#b91c1c',
    fontSize: '13px',
  },
  footer: {
    marginTop: '20px',
    color: '#6b7280',
    fontSize: '13px',
  },
  link: {
    color: '#0f766e',
    textDecoration: 'none',
    fontWeight: 600,
  },
}
