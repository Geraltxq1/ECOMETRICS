'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

interface Empresa      { id: string; nombre: string }
interface Sede         { id: string; empresa_id: string; nombre: string }
interface Instalacion  { id: string; sede_id: string; nombre: string; tipo: string | null }
interface Indicador    { id: string; codigo: string; nombre: string; unidad: string; factor_emision: number | null; categoria: string | null }
interface User         { id: string; email?: string }

const MESES = [
  { v: 1, l: 'Enero' }, { v: 2, l: 'Febrero' }, { v: 3, l: 'Marzo' },
  { v: 4, l: 'Abril' }, { v: 5, l: 'Mayo' }, { v: 6, l: 'Junio' },
  { v: 7, l: 'Julio' }, { v: 8, l: 'Agosto' }, { v: 9, l: 'Septiembre' },
  { v: 10, l: 'Octubre' }, { v: 11, l: 'Noviembre' }, { v: 12, l: 'Diciembre' },
]
const ANIOS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i)

export default function NuevoRegistroPage() {
  const router   = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [user, setUser]               = useState<User | null>(null)
  const [empresas, setEmpresas]       = useState<Empresa[]>([])
  const [sedes, setSedes]             = useState<Sede[]>([])
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([])
  const [indicadores, setIndicadores] = useState<Indicador[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [success, setSuccess]         = useState(false)

  const [empresaId, setEmpresaId]       = useState('')
  const [sedeId, setSedeId]             = useState('')
  const [instalacionId, setInstalacionId] = useState('')
  const [indicadorId, setIndicadorId]   = useState('')
  const [valor, setValor]               = useState('')
  const [mes, setMes]                   = useState<number>(new Date().getMonth() + 1)
  const [anio, setAnio]                 = useState<number>(new Date().getFullYear())
  const [notas, setNotas]               = useState('')
  const [estado, setEstado]             = useState('borrador')

  const selectedIndicador = indicadores.find(i => i.id === indicadorId)
  const co2Preview = selectedIndicador?.factor_emision && valor
    ? (parseFloat(valor) * selectedIndicador.factor_emision).toFixed(6)
    : null

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      const [empRes, indRes] = await Promise.all([
        supabase.from('empresas').select('id, nombre').eq('user_id', user.id).order('nombre'),
        supabase.from('indicadores').select('id, codigo, nombre, unidad, factor_emision, categoria').order('codigo'),
      ])

      if (empRes.data) { setEmpresas(empRes.data); if (empRes.data[0]) setEmpresaId(empRes.data[0].id) }
      if (indRes.data) { setIndicadores(indRes.data); if (indRes.data[0]) setIndicadorId(indRes.data[0].id) }
      setLoading(false)
    }
    load()
  }, [supabase])

  // Cargar sedes al cambiar empresa
  useEffect(() => {
    if (!empresaId) { setSedes([]); setSedeId(''); return }
    supabase.from('sedes').select('id, empresa_id, nombre').eq('empresa_id', empresaId).order('nombre')
      .then(({ data }) => { setSedes(data ?? []); setSedeId(data?.[0]?.id ?? '') })
  }, [empresaId, supabase])

  // Cargar instalaciones al cambiar sede
  useEffect(() => {
    if (!sedeId) { setInstalaciones([]); setInstalacionId(''); return }
    supabase.from('instalaciones').select('id, sede_id, nombre, tipo').eq('sede_id', sedeId).order('nombre')
      .then(({ data }) => { setInstalaciones(data ?? []); setInstalacionId(data?.[0]?.id ?? '') })
  }, [sedeId, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaId || !indicadorId) { setError('Selecciona empresa e indicador'); return }
    setSaving(true); setError(null)

    const co2 = selectedIndicador?.factor_emision
      ? parseFloat(valor) * selectedIndicador.factor_emision
      : null

    const { error } = await supabase.from('registros_datos').insert({
      empresa_id:     empresaId,
      sede_id:        sedeId || null,
      instalacion_id: instalacionId || null,
      indicador_id:   indicadorId,
      usuario_id:     user!.id,
      valor:          parseFloat(valor),
      co2_calculado:  co2,
      mes,
      anio,
      estado,
      notas: notas || null,
    } as never)

    if (error) { setError(error.message); setSaving(false) }
    else { setSuccess(true); setTimeout(() => router.push('/registros'), 1500) }
  }

  if (success) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <Sidebar userEmail={user?.email} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Registro guardado</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>Redirigiendo…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar userEmail={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title="Nuevo registro" email={user?.email}
          breadcrumb={[{ label: 'Registros', href: '/registros' }, { label: 'Nuevo registro' }]} />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', fontSize: 14 }}>Cargando…</div>
          ) : (
            <div style={{ maxWidth: 720 }}>
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '32px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Captura de datos GRI</h2>
                <p style={{ margin: '0 0 28px', fontSize: 13, color: '#64748b' }}>El CO₂ equivalente se calcula automáticamente.</p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                  {/* Empresa / Sede / Instalación */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={lbl}>Empresa *</label>
                      <select style={inp} value={empresaId} onChange={e => setEmpresaId(e.target.value)} required>
                        <option value="">Seleccionar…</option>
                        {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Sede</label>
                      <select style={inp} value={sedeId} onChange={e => setSedeId(e.target.value)}>
                        <option value="">Sin sede</option>
                        {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Instalación</label>
                      <select style={inp} value={instalacionId} onChange={e => setInstalacionId(e.target.value)} disabled={!sedeId || instalaciones.length === 0}>
                        <option value="">Sin instalación</option>
                        {instalaciones.map(i => <option key={i.id} value={i.id}>{i.nombre}{i.tipo ? ` (${i.tipo})` : ''}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Indicador */}
                  <div>
                    <label style={lbl}>Indicador GRI *</label>
                    <select style={inp} value={indicadorId} onChange={e => setIndicadorId(e.target.value)} required>
                      <option value="">Seleccionar indicador…</option>
                      {indicadores.map(i => (
                        <option key={i.id} value={i.id}>{i.codigo} — {i.nombre} ({i.unidad})</option>
                      ))}
                    </select>
                  </div>

                  {/* Valor */}
                  <div>
                    <label style={lbl}>Valor medido *{selectedIndicador ? ` (${selectedIndicador.unidad})` : ''}</label>
                    <input style={inp} type="number" min="0" step="any" value={valor} onChange={e => setValor(e.target.value)} required placeholder="0.00" />
                  </div>

                  {/* Preview CO2 */}
                  {co2Preview && parseFloat(co2Preview) > 0 && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>🌍</span>
                      <div>
                        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>CO₂ equivalente calculado</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>{co2Preview} tCO₂e</div>
                      </div>
                    </div>
                  )}

                  {/* Período + Estado */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={lbl}>Mes</label>
                      <select style={inp} value={mes} onChange={e => setMes(Number(e.target.value))}>
                        {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Año *</label>
                      <select style={inp} value={anio} onChange={e => setAnio(Number(e.target.value))} required>
                        {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Estado</label>
                      <select style={inp} value={estado} onChange={e => setEstado(e.target.value)}>
                        <option value="borrador">Borrador</option>
                        <option value="en_revision">En revisión</option>
                        <option value="aprobado">Aprobado</option>
                      </select>
                    </div>
                  </div>

                  {/* Notas */}
                  <div>
                    <label style={lbl}>Notas / observaciones</label>
                    <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Fuente del dato, metodología…" />
                  </div>

                  {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13 }}>{error}</div>}

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                    <Link href="/registros" style={{ padding: '11px 22px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                      Cancelar
                    </Link>
                    <button type="submit" disabled={saving} style={{ padding: '11px 28px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                      {saving ? 'Guardando…' : 'Guardar registro'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1f2937', background: '#fafafa', boxSizing: 'border-box', outline: 'none' }
