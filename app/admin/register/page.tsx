'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function AdminRegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, code }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Error al crear el usuario admin.')
        return
      }

      setMessage(result.message)
      setEmail('')
      setPassword('')
      setCode('')
    } catch (err) {
      setError('No se pudo completar el registro. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Registrar Admin</h1>
        <p style={styles.subtitle}>Crea una cuenta administrativa usando el código secreto.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
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
            minLength={6}
            style={styles.input}
          />

          <label style={styles.label}>Código de administrador</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            style={styles.input}
          />

          {error && <p style={styles.error}>{error}</p>}
          {message && <p style={styles.success}>{message}</p>}

          <button type="submit" disabled={loading} style={loading ? { ...styles.button, ...styles.buttonDisabled } : styles.button}>
            {loading ? 'Creando admin...' : 'Crear admin'}
          </button>
        </form>

        <p style={styles.footer}>
          ¿Ya tienes cuenta admin? <Link href="/admin" style={styles.link}>Inicia sesión</Link>
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
    maxWidth: '460px',
    borderRadius: '18px',
    padding: '40px',
    background: '#ffffff',
    boxShadow: '0 18px 60px rgba(15, 23, 42, 0.08)',
    border: '1px solid #e2e8f0',
  },
  title: {
    margin: 0,
    fontSize: '30px',
    fontWeight: 700,
    color: '#111827',
  },
  subtitle: {
    marginTop: '12px',
    marginBottom: '28px',
    color: '#475569',
    fontSize: '15px',
  },
  form: {
    display: 'grid',
    gap: '18px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
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
    padding: '12px',
    borderRadius: '10px',
    background: '#fee2e2',
    color: '#991b1b',
  },
  success: {
    padding: '12px',
    borderRadius: '10px',
    background: '#dcfce7',
    color: '#166534',
  },
  footer: {
    marginTop: '18px',
    color: '#475569',
    fontSize: '13px',
  },
  link: {
    color: '#0f766e',
    textDecoration: 'none',
    fontWeight: 600,
  },
}
