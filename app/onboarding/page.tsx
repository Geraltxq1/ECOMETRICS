'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { BuildingIcon, MapPinIcon, FactoryIcon, UsersIcon, FileTextIcon, CopyIcon, CheckIcon, KeyIcon, ClipboardIcon, LeafIcon } from '@/components/Icons'

const PASOS = [
  { id: 1, titulo: 'Datos de empresa',          descripcion: 'Completa la información de tu empresa para personalizar tu cuenta.', icono: <BuildingIcon size={28} color="#16a34a" /> },
  { id: 2, titulo: 'Primera sede',              descripcion: 'Registra la primera ubicación donde recoges datos de sostenibilidad.', icono: <MapPinIcon size={28} color="#16a34a" /> },
  { id: 3, titulo: 'Primera instalación',        descripcion: 'Dentro de tu sede, agrega la primera instalación (planta, oficina, etc.).', icono: <FactoryIcon size={28} color="#16a34a" /> },
  { id: 4, titulo: 'Invitar a tu equipo',       descripcion: 'Genera un código de invitación para que tu equipo pueda unirse.', icono: <UsersIcon size={28} color="#16a34a" /> },
  { id: 5, titulo: 'Primer registro GRI',        descripcion: 'Crea tu primer registro de datos de sostenibilidad conforme al estándar GRI.', icono: <FileTextIcon size={28} color="#16a34a" /> },
]

export default function OnboardingPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [pasoActual, setPasoActual] = useState(1)
  const [completados, setCompletados] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  // Datos formulario paso 1
  const [empNombre, setEmpNombre]     = useState('')
  const [empIndustria, setEmpIndustria] = useState('')
  const [empCiudad, setEmpCiudad]     = useState('')
  const [empId, setEmpId]             = useState<string | null>(null)
  const [saving1, setSaving1]         = useState(false)

  // Datos formulario paso 2
  const [sedeNombre, setSedeNombre]   = useState('')
  const [sedeCiudad, setSedeCiudad]   = useState('')
  const [sedeId, setSedeId]           = useState<string | null>(null)
  const [saving2, setSaving2]         = useState(false)

  // Datos formulario paso 3
  const [instNombre, setInstNombre]   = useState('')
  const [instTipo, setInstTipo]       = useState('')
  const [saving3, setSaving3]         = useState(false)

  // Paso 4: código de invitación generado
  const [codigoGenerado, setCodigoGenerado] = useState<string | null>(null)
  const [generando, setGenerando]     = useState(false)
  const [copiado, setCopiado]         = useState(false)

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: p } = await supabase
        .from('perfiles')
        .select('empresa_id, rol')
        .eq('user_id', user.id)
        .single()

      if (!p || p.rol !== 'admin') { router.push('/dashboard'); return }
      if (p.empresa_id) setEmpId(p.empresa_id)

      setLoading(false)
    }
    init()
  }, [supabase, router])

  async function guardarEmpresa(e: React.FormEvent) {
    e.preventDefault()
    if (!empNombre.trim()) return
    setSaving1(true); setError(null)

    const { data, error } = await supabase
      .from('empresas')
      .update({ nombre: empNombre, industria: empIndustria, ciudad: empCiudad } as never)
      .eq('id', empId!)
      .select('id')
      .single()

    if (error) setError(error.message)
    else { completar(1) }
    setSaving1(false)
  }

  async function guardarSede(e: React.FormEvent) {
    e.preventDefault()
    if (!sedeNombre.trim() || !empId) return
    setSaving2(true); setError(null)

    const { data, error } = await supabase
      .from('sedes')
      .insert({ empresa_id: empId, nombre: sedeNombre, ciudad: sedeCiudad } as never)
      .select('id')
      .single()

    if (error) setError(error.message)
    else { setSedeId(data.id); completar(2) }
    setSaving2(false)
  }

  async function guardarInstalacion(e: React.FormEvent) {
    e.preventDefault()
    if (!instNombre.trim() || !sedeId) return
    setSaving3(true); setError(null)

    const { error } = await supabase
      .from('instalaciones')
      .insert({ sede_id: sedeId, nombre: instNombre, tipo: instTipo || null } as never)

    if (error) setError(error.message)
    else completar(3)
    setSaving3(false)
  }

  async function generarCodigo() {
    if (!empId) return
    setGenerando(true); setError(null)

    const res = await fetch('/api/empresa/generar-codigo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rolInv: 'editor' }),
    })
    const result = await res.json()

    if (!res.ok) setError(result.error ?? 'Error al generar el código.')
    else { setCodigoGenerado(result.data.codigo as string); completar(4) }
    setGenerando(false)
  }

  function copiar() {
    if (!codigoGenerado) return
    navigator.clipboard.writeText(codigoGenerado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function completar(paso: number) {
    setCompletados(prev => new Set([...prev, paso]))
    if (paso < 5) setPasoActual(paso + 1)
  }

  const progreso = Math.round((completados.size / 5) * 100)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <span style={{ color: '#94a3b8', fontSize: 14 }}>Cargando…</span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 720, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', padding: '28px 32px', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}><LeafIcon size={20} color="#fff" /> Bienvenido a ECOMETRICS</h1>
            <button
              onClick={() => router.push('/dashboard')}
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '6px 14px', color: '#fff', fontSize: 12, cursor: 'pointer' }}
            >
              Saltar →
            </button>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: 14, opacity: 0.9 }}>Configura tu cuenta en 5 pasos rápidos</p>
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progreso}%`, background: '#fff', borderRadius: 999, transition: 'width 0.4s ease' }} />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, opacity: 0.8 }}>{progreso}% completado · {completados.size} de 5 pasos</p>
        </div>

        <div style={{ display: 'flex', minHeight: 480 }}>

          {/* Sidebar de pasos */}
          <div style={{ width: 200, background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '20px 0' }}>
            {PASOS.map(paso => {
              const hecho = completados.has(paso.id)
              const activo = pasoActual === paso.id
              return (
                <button
                  key={paso.id}
                  onClick={() => setPasoActual(paso.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '12px 16px', textAlign: 'left',
                    background: activo ? '#f0fdf4' : 'transparent',
                    border: 'none', borderLeft: activo ? '3px solid #16a34a' : '3px solid transparent',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: hecho ? '#16a34a' : activo ? '#dcfce7' : '#e2e8f0',
                    color: hecho ? '#fff' : activo ? '#16a34a' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                  }}>
                    {hecho ? '✓' : paso.id}
                  </span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: activo ? '#16a34a' : '#374151' }}>{paso.titulo}</div>
                    {hecho && <div style={{ fontSize: 10, color: '#16a34a' }}>Completado ✓</div>}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Contenido */}
          <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
            {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>{error}</div>}

            {pasoActual === 1 && (
              <form onSubmit={guardarEmpresa}>
                <StepHeader paso={PASOS[0]} />
                <label style={lbl}>Nombre de la empresa *</label>
                <input style={inp} value={empNombre} onChange={e => setEmpNombre(e.target.value)} required placeholder="Ej: Grupo Industrial XYZ" />
                <label style={{ ...lbl, marginTop: 14 }}>Industria</label>
                <select style={inp} value={empIndustria} onChange={e => setEmpIndustria(e.target.value)}>
                  <option value="">Seleccionar…</option>
                  {['Manufactura', 'Servicios', 'Construcción', 'Transporte', 'Energía', 'Agricultura', 'Tecnología', 'Salud', 'Otro'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <label style={{ ...lbl, marginTop: 14 }}>Ciudad</label>
                <input style={inp} value={empCiudad} onChange={e => setEmpCiudad(e.target.value)} placeholder="Bogotá" />
                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={saving1 || !empNombre.trim()} style={btnPrimary}>
                    {saving1 ? 'Guardando…' : 'Guardar y continuar →'}
                  </button>
                </div>
              </form>
            )}

            {pasoActual === 2 && (
              <form onSubmit={guardarSede}>
                <StepHeader paso={PASOS[1]} />
                <label style={lbl}>Nombre de la sede *</label>
                <input style={inp} value={sedeNombre} onChange={e => setSedeNombre(e.target.value)} required placeholder="Ej: Planta Principal" />
                <label style={{ ...lbl, marginTop: 14 }}>Ciudad</label>
                <input style={inp} value={sedeCiudad} onChange={e => setSedeCiudad(e.target.value)} placeholder="Bogotá" />
                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={saving2 || !sedeNombre.trim()} style={btnPrimary}>
                    {saving2 ? 'Guardando…' : 'Guardar y continuar →'}
                  </button>
                </div>
              </form>
            )}

            {pasoActual === 3 && (
              <form onSubmit={guardarInstalacion}>
                <StepHeader paso={PASOS[2]} />
                <label style={lbl}>Nombre de la instalación *</label>
                <input style={inp} value={instNombre} onChange={e => setInstNombre(e.target.value)} required placeholder="Ej: Oficina Administrativa" />
                <label style={{ ...lbl, marginTop: 14 }}>Tipo</label>
                <select style={inp} value={instTipo} onChange={e => setInstTipo(e.target.value)}>
                  <option value="">Seleccionar…</option>
                  {['Planta industrial', 'Oficina', 'Bodega', 'Laboratorio', 'Flota vehicular', 'Centro de datos', 'Otro'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={saving3 || !instNombre.trim()} style={btnPrimary}>
                    {saving3 ? 'Guardando…' : 'Guardar y continuar →'}
                  </button>
                </div>
              </form>
            )}

            {pasoActual === 4 && (
              <div>
                <StepHeader paso={PASOS[3]} />
                {codigoGenerado ? (
                  <div>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '20px 24px', textAlign: 'center', marginBottom: 16 }}>
                      <p style={{ margin: '0 0 8px', fontSize: 12, color: '#16a34a', fontWeight: 600 }}>CÓDIGO GENERADO</p>
                      <code style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: 3 }}>{codigoGenerado}</code>
                    </div>
                    <button onClick={copiar} style={{ ...btnPrimary, width: '100%', marginBottom: 12 }}>
                      {copiado ? <><CheckIcon size={14} /> Copiado!</> : <><CopyIcon size={14} /> Copiar código</>}
                    </button>
                    <button onClick={() => completar(4)} style={{ ...btnSecondary, width: '100%' }}>
                      Continuar →
                    </button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
                      Genera un código único que tus colaboradores podrán usar al registrarse para unirse a tu empresa automáticamente.
                    </p>
                    <button onClick={generarCodigo} disabled={generando} style={{ ...btnPrimary, width: '100%' }}>
                      {generando ? 'Generando…' : <><KeyIcon size={14} /> Generar código de invitación</>}
                    </button>
                  </div>
                )}
              </div>
            )}

            {pasoActual === 5 && (
              <div>
                <StepHeader paso={PASOS[4]} />
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24 }}>
                  Todo está listo. Ahora puedes crear tu primer registro de datos GRI para empezar a medir el impacto de tu empresa.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button
                    onClick={() => router.push('/registros/nuevo')}
                    style={btnPrimary}
                  >
                    <><ClipboardIcon size={14} /> Crear primer registro GRI →</>
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    style={btnSecondary}
                  >
                    Ir al dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StepHeader({ paso }: { paso: typeof PASOS[0] }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ marginBottom: 8 }}>{paso.icono}</div>
      <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
        Paso {paso.id}: {paso.titulo}
      </h2>
      <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{paso.descripcion}</p>
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1f2937', background: '#fafafa', boxSizing: 'border-box', outline: 'none' }
const btnPrimary: React.CSSProperties = { padding: '11px 22px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const btnSecondary: React.CSSProperties = { padding: '11px 22px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 500, cursor: 'pointer' }
