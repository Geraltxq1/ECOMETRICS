'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { CheckCircleIcon } from '@/components/Icons'
import { registrarAuditoria } from '@/lib/auditoria'

interface Empresa      { id: string; nombre: string }
interface Sede         { id: string; empresa_id: string; nombre: string }
interface Instalacion  { id: string; sede_id: string; nombre: string; tipo: string | null }
interface Indicador    { id: string; codigo: string; nombre: string; unidad: string; factor_emision: number | null; categoria: string | null; alcance: string | null }
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
  const [step, setStep]                 = useState<1 | 2 | 3>(1)
  const [archivo, setArchivo]           = useState<File | null>(null)
  const [archivoNombre, setArchivoNombre] = useState('')
  const [saveMode, setSaveMode]         = useState<'borrador' | 'en_revision'>('borrador')
  const formRef                         = useRef<HTMLFormElement | null>(null)

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
        supabase.from('indicadores').select('id, codigo, nombre, unidad, factor_emision, categoria, alcance').order('codigo'),
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
    const valorNum = parseFloat(valor)
    if (!valor || isNaN(valorNum)) { setError('Ingresa un valor medido válido en el paso 2'); setStep(2); return }
    setSaving(true); setError(null)

    const co2 = selectedIndicador?.factor_emision
      ? valorNum * selectedIndicador.factor_emision
      : null

    const { data: insertData, error } = await supabase
      .from('registros_datos')
      .insert({
        empresa_id:     empresaId,
        sede_id:        sedeId || null,
        instalacion_id: instalacionId || null,
        indicador_id:   indicadorId,
        usuario_id:     user!.id,
        valor:          valorNum,
        co2_calculado:  co2,
        mes,
        anio,
        estado: saveMode,
        notas: notas || null,
      } as never)
      .select('id')
      .single()

    if (error) { setError(error.message); setSaving(false); return }

    const registroId = (insertData as { id: string } | null)?.id

    if (registroId) {
      await registrarAuditoria({
        empresaId: empresaId, usuarioId: user!.id, accion: 'creado',
        tabla: 'registros_datos', registroId,
        detalle: { estado_inicial: saveMode },
      })
    }
    if (archivo && registroId) {
      const ext = archivo.name.split('.').pop() ?? 'bin'
      const path = `${empresaId}/${registroId}/${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('Evidencias')
        .upload(path, archivo, { contentType: archivo.type })

      if (uploadError) {
        setError('Registro guardado, pero falló la carga del archivo: ' + uploadError.message)
        setSaving(false); return
      }
      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage.from('Evidencias').getPublicUrl(path)
        await supabase.from('evidencias').insert({
          registro_id:    registroId,
          nombre_archivo: archivo.name,
          url_archivo:    publicUrl,
          tipo_archivo:   archivo.type,
          subido_por:     user!.id,
        } as never)
      }
    }

    setSuccess(true)
    setTimeout(() => router.push('/registros'), 1500)
  }

  if (success) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <Sidebar userEmail={user?.email} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 16, color: '#16a34a' }}><CheckCircleIcon size={52} color="#16a34a" /></div>
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

                <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                    {['Ubicación', 'Indicador', 'Evidencia'].map((label, index) => {
                      const stepNum = index + 1 as 1 | 2 | 3
                      const active = step === stepNum
                      return (
                        <button key={label} type="button" onClick={() => setStep(stepNum)} style={{
                          padding: '10px 18px', borderRadius: 999, border: active ? '1px solid #16a34a' : '1px solid #e2e8f0',
                          background: active ? '#f0fdf4' : '#fff', color: active ? '#16a34a' : '#64748b', fontWeight: active ? 700 : 500,
                          cursor: 'pointer', fontSize: 12,
                        }}>
                          {stepNum}. {label}
                        </button>
                      )
                    })}
                  </div>

                  {step === 1 && (
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
                  )}

                  {step === 2 && (
                    <div style={{ display: 'grid', gap: 20 }}>
                      <div>
                        <label style={lbl}>Categoría</label>
                        <select style={inp} value={selectedIndicador?.categoria ?? ''} disabled>
                          <option>{selectedIndicador?.categoria ?? 'Selecciona un indicador'}</option>
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Indicador GRI *</label>
                        <select style={inp} value={indicadorId} onChange={e => setIndicadorId(e.target.value)} required>
                          <option value="">Seleccionar indicador…</option>
                          {indicadores.map(i => (
                            <option key={i.id} value={i.id}>{i.codigo} — {i.nombre} ({i.unidad})</option>
                          ))}
                        </select>
                      </div>
                      {selectedIndicador && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, alignItems: 'end' }}>
                          <div>
                            <label style={lbl}>Unidad</label>
                            <div style={readOnly}>{selectedIndicador.unidad}</div>
                          </div>
                          <div>
                            <label style={lbl}>Factor de emisión</label>
                            <div style={readOnly}>{selectedIndicador.factor_emision ?? 'No definido'}</div>
                          </div>
                          <div>
                            <label style={lbl}>Alcance</label>
                            <div style={readOnly}>{selectedIndicador.alcance?.replace('_', ' ') ?? '—'}</div>
                          </div>
                        </div>
                      )}
                      <div>
                        <label style={lbl}>Valor medido *{selectedIndicador ? ` (${selectedIndicador.unidad})` : ''}</label>
                        <input style={inp} type="number" min="0" step="any" value={valor} onChange={e => setValor(e.target.value)} required placeholder="0.00" />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
                      </div>
                      <div>
                        <label style={lbl}>Notas / observaciones</label>
                        <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Fuente del dato, metodología…" />
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div style={{ display: 'grid', gap: 20 }}>
                      <div>
                        <label style={lbl}>Evidencia <span style={{ color: '#94a3b8', fontWeight: 400 }}>(PDF o imagen, máx. 10 MB)</span></label>
                        <input type="file" accept=".pdf,image/jpeg,image/png,image/webp" onChange={e => {
                          const file = e.target.files?.[0] ?? null
                          if (file) {
                            const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
                            if (!tiposPermitidos.includes(file.type)) {
                              setError('Tipo de archivo no permitido. Solo PDF, JPG, PNG o WEBP.')
                              e.target.value = ''
                              return
                            }
                            if (file.size > 10 * 1024 * 1024) {
                              setError('El archivo supera el límite de 10 MB.')
                              e.target.value = ''
                              return
                            }
                          }
                          setError(null)
                          setArchivo(file)
                          setArchivoNombre(file?.name ?? '')
                        }} style={{ ...inp, padding: '12px 10px' }} />
                        {archivoNombre && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b' }}>Archivo seleccionado: <strong>{archivoNombre}</strong></p>}
                      </div>
                      {co2Preview && parseFloat(co2Preview) > 0 && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '18px' }}>
                          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>CO₂ equivalente estimado</div>
                          <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>{co2Preview} tCO₂e</div>
                          <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>Calculado con el valor ingresado y el factor de emisión del indicador.</div>
                        </div>
                      )}
                      <div style={{ display: 'grid', gap: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Resumen</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div style={summaryItem}><strong>Empresa</strong><span>{empresas.find(e => e.id === empresaId)?.nombre ?? '—'}</span></div>
                          <div style={summaryItem}><strong>Sede</strong><span>{sedes.find(s => s.id === sedeId)?.nombre ?? '—'}</span></div>
                          <div style={summaryItem}><strong>Indicador</strong><span>{selectedIndicador?.codigo ?? '—'}</span></div>
                          <div style={summaryItem}><strong>Valor</strong><span>{valor || '—'} {selectedIndicador?.unidad ?? ''}</span></div>
                          <div style={summaryItem}><strong>Mes/Año</strong><span>{MESES.find(m => m.v === mes)?.l ?? '—'} {anio}</span></div>
                          <div style={summaryItem}><strong>Evidencia</strong><span>{archivoNombre || 'No cargada'}</span></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13 }}>{error}</div>}

                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {step > 1 && (
                        <button type="button" onClick={() => setStep(step - 1 as 1 | 2 | 3)} style={{ ...btnSecondary, minWidth: 120 }}>
                          Volver
                        </button>
                      )}
                      {step < 3 && (
                        <button type="button" onClick={() => setStep(step + 1 as 1 | 2 | 3)} style={{ ...btnPrimary, minWidth: 120 }}>
                          Continuar
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => { setSaveMode('borrador'); formRef.current?.requestSubmit() }} disabled={saving} style={{ ...btnSecondary, minWidth: 180 }}>
                        {saving && saveMode === 'borrador' ? 'Guardando…' : 'Guardar borrador'}
                      </button>
                      <button type="button" onClick={() => { setSaveMode('en_revision'); formRef.current?.requestSubmit() }} disabled={saving} style={{ ...btnPrimary, minWidth: 200 }}>
                        {saving && saveMode === 'en_revision' ? 'Enviando…' : 'Guardar y enviar a revisión'}
                      </button>
                    </div>
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
const btnPrimary: React.CSSProperties = { padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
const btnSecondary: React.CSSProperties = { padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const readOnly: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontSize: 14 }
const summaryItem: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#374151' }
