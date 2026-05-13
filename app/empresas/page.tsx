'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

interface Empresa {
  id: string
  nombre: string
  ciudad: string | null
  pais: string | null
  sector: string | null
  created_at: string
}

interface User {
  id: string
  email?: string
}

const SECTORES = [
  'Manufactura', 'Servicios', 'Construcción', 'Transporte', 'Energía',
  'Agricultura', 'Minería', 'Tecnología', 'Salud', 'Educación', 'Otro',
]

export default function EmpresasPage() {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser]       = useState<User | null>(null)
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading]  = useState(true)
  const [error, setError]      = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]    = useState(false)

  const [nombre, setNombre]   = useState('')
  const [ciudad, setCiudad]   = useState('')
  const [pais, setPais]       = useState('Colombia')
  const [sector, setSector]   = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const { data, error } = await supabase
        .from('empresas')
        .select('id, nombre, ciudad, pais, sector, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) setError(error.message)
      else setEmpresas(data ?? [])
      setLoading(false)
    }
    load()
  }, [supabase])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { data, error } = await supabase
      .from('empresas')
      .insert({ nombre, ciudad, pais, sector, user_id: user!.id } as never)
      .select()
      .single()

    if (error) {
      setError(error.message)
    } else {
      setEmpresas(prev => [data as Empresa, ...prev])
      setShowForm(false)
      setNombre(''); setCiudad(''); setPais('Colombia'); setSector('')
    }
    setSaving(false)
  }

  const pageContent = () => {
    if (loading) return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, color: '#94a3b8', fontSize: 14 }}>
        Cargando empresas…
      </div>
    )

    return (
      <>
        {/* Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Empresas</h2>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
              {empresas.length} empresa{empresas.length !== 1 ? 's' : ''} registrada{empresas.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {showForm ? '✕ Cancelar' : '+ Nueva empresa'}
          </button>
        </div>

        {/* Formulario */}
        {showForm && (
          <div style={{
            background: '#fff',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            padding: '28px',
            marginBottom: 24,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Crear empresa</h3>
            <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Nombre de la empresa *</label>
                <input style={inp} value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Ej: Industrias del Eje Cafetero" />
              </div>
              <div>
                <label style={lbl}>Ciudad</label>
                <input style={inp} value={ciudad} onChange={e => setCiudad(e.target.value)} placeholder="Medellín" />
              </div>
              <div>
                <label style={lbl}>País</label>
                <input style={inp} value={pais} onChange={e => setPais(e.target.value)} placeholder="Colombia" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Sector</label>
                <select style={inp} value={sector} onChange={e => setSector(e.target.value)}>
                  <option value="">Seleccionar sector…</option>
                  {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {error && (
                <div style={{ gridColumn: '1 / -1', padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13 }}>
                  {error}
                </div>
              )}
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ ...btnSecondary }}>Cancelar</button>
                <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Guardando…' : 'Crear empresa'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabla */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {empresas.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🏢</div>
              <p style={{ margin: 0, fontSize: 14 }}>No hay empresas registradas. Crea la primera.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Nombre', 'Ciudad', 'Sector', 'Fecha de registro'].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {empresas.map(emp => (
                  <tr key={emp.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={td}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{emp.nombre}</span>
                    </td>
                    <td style={td}>{emp.ciudad ?? '—'}</td>
                    <td style={td}>
                      {emp.sector ? (
                        <span style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
                          {emp.sector}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={td}>{new Date(emp.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar userEmail={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title="Empresas" email={user?.email} />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {pageContent()}
        </main>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1f2937', background: '#fafafa', boxSizing: 'border-box', outline: 'none' }
const th: React.CSSProperties  = { padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }
const td: React.CSSProperties  = { padding: '14px 20px', fontSize: 14, color: '#374151' }
const btnPrimary: React.CSSProperties = { padding: '10px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const btnSecondary: React.CSSProperties = { padding: '10px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 500, cursor: 'pointer' }
