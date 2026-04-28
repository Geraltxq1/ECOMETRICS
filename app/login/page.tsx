'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [feedback, setFeedback] = useState('')

  const handleLogin = async (e: any) => {
    e.preventDefault()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setFeedback(error.message)
    } else {
      setFeedback('Login exitoso 🚀')
    }
  }

  const handleRegister = async (e: any) => {
    e.preventDefault()

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setFeedback(error.message)
    } else {
      setFeedback('Revisa tu correo 📩')
    }
  }

  return (
    <main className="auth-container">
      <section className="card">
        <h1>Bienvenido a ECOMETRICS</h1>
        <p className="subtitle">Inicia sesión o crea una cuenta nueva</p>

        <div className="tabs">
          <button
            className={`tab-button ${tab === 'login' ? 'active' : ''}`}
            onClick={() => setTab('login')}
          >
            Iniciar sesión
          </button>

          <button
            className={`tab-button ${tab === 'register' ? 'active' : ''}`}
            onClick={() => setTab('register')}
          >
            Registrarse
          </button>
        </div>

        {tab === 'login' && (
          <form className="auth-form active" onSubmit={handleLogin}>
            <label>Correo</label>
            <input
              type="email"
              placeholder="tucorreo@ejemplo.com"
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Contraseña</label>
            <input
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit">Entrar</button>
          </form>
        )}

        {tab === 'register' && (
          <form className="auth-form active" onSubmit={handleRegister}>
            <label>Correo</label>
            <input
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Contraseña</label>
            <input
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit">Crear cuenta</button>
          </form>
        )}

        <p className="feedback">{feedback}</p>
      </section>
    </main>
  )
}