'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabaseClient'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { TrendingUpIcon } from '@/components/Icons'
import BannerInfo from '@/components/BannerInfo'

interface Indicador {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  categoria: string | null
  unidad: string
  factor_emision: number | null
  alcance: string | null
}

type CatFilter = 'Todos' | 'energia' | 'agua' | 'residuos' | 'emisiones'

const CAT_LABELS: Record<string, string> = {
  energia: 'Energía', agua: 'Agua', residuos: 'Residuos', emisiones: 'Emisiones',
}

const CATEGORIA_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  energia:   { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  agua:      { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  residuos:  { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
  emisiones: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
}

const ALCANCE_LABELS: Record<string, string> = {
  alcance_1: 'Alcance 1', alcance_2: 'Alcance 2', alcance_3: 'Alcance 3',
}

export default function IndicadoresPage() {
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser]               = useState<{ email?: string } | null>(null)
  const [indicadores, setIndicadores] = useState<Indicador[]>([])
  const [filtro, setFiltro]           = useState<CatFilter>('Todos')
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
      const { data } = await supabase
        .from('indicadores')
        .select('id, codigo, nombre, descripcion, categoria, unidad, factor_emision, alcance')
        .order('codigo')
      setIndicadores(data ?? [])
      setLoading(false)
    }
    load()
  }, [supabase])

  const categorias: CatFilter[] = ['Todos', 'energia', 'agua', 'residuos', 'emisiones']
  const filtrados = filtro === 'Todos' ? indicadores : indicadores.filter(i => i.categoria === filtro)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Sidebar userEmail={user?.email} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header title="Indicadores GRI" email={user?.email}
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Indicadores GRI' }]} />
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', fontSize: 14 }}>Cargando indicadores…</div>
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Indicadores GRI</h2>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
                  {filtrados.length} indicador{filtrados.length !== 1 ? 'es' : ''} disponible{filtrados.length !== 1 ? 's' : ''}
                </p>
              </div>

              <BannerInfo tipo="info">
                Mostrando 12 de 400+ indicadores GRI disponibles. ECØMETRICS prioriza los indicadores de
                mayor impacto para pymes en fase inicial de gestión de sostenibilidad. El catálogo está
                diseñado para escalar sin cambios de arquitectura — agregar nuevos indicadores es una
                inserción en base de datos, no una reescritura del sistema.
              </BannerInfo>

              {/* Filtros */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {categorias.map(cat => (
                  <button key={cat} onClick={() => setFiltro(cat)}
                    style={{
                      padding: '7px 16px', borderRadius: 999, fontSize: 13, cursor: 'pointer',
                      border: `1.5px solid ${filtro === cat ? '#16a34a' : '#e2e8f0'}`,
                      background: filtro === cat ? '#16a34a' : '#fff',
                      color: filtro === cat ? '#fff' : '#64748b',
                      fontWeight: filtro === cat ? 600 : 400, transition: 'all 0.15s',
                    }}
                  >
                    {cat === 'Todos' ? 'Todos' : CAT_LABELS[cat]}
                  </button>
                ))}
              </div>

              {filtrados.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 24px', color: '#94a3b8' }}>
                  <div style={{ marginBottom: 12 }}><TrendingUpIcon size={44} color="#cbd5e1" /></div>
                  <p style={{ margin: 0, fontSize: 14 }}>Sin indicadores en esta categoría.</p>
                  <p style={{ margin: '6px 0 0', fontSize: 12 }}>Ejecuta sql/schema.sql en Supabase para cargar los 12 indicadores GRI.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                  {filtrados.map(ind => {
                    const colors = CATEGORIA_COLORS[ind.categoria ?? ''] ?? { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' }
                    return (
                      <div key={ind.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 9px', borderRadius: 6 }}>
                            {ind.codigo}
                          </span>
                          {ind.categoria && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: colors.text, background: colors.bg, border: `1px solid ${colors.border}`, padding: '3px 9px', borderRadius: 6 }}>
                              {CAT_LABELS[ind.categoria] ?? ind.categoria}
                            </span>
                          )}
                        </div>

                        <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.35 }}>{ind.nombre}</h3>

                        {ind.descripcion && (
                          <p style={{ margin: '0 0 14px', fontSize: 12, color: '#64748b', lineHeight: 1.55 }}>{ind.descripcion}</p>
                        )}

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, color: '#374151' }}>
                            <span style={{ color: '#94a3b8' }}>Unidad: </span><strong>{ind.unidad}</strong>
                          </span>
                          {ind.factor_emision != null && ind.factor_emision > 0 && (
                            <span style={{ fontSize: 12, color: '#374151' }}>
                              <span style={{ color: '#94a3b8' }}>Factor CO₂: </span><strong>{ind.factor_emision}</strong>
                            </span>
                          )}
                          {ind.alcance && (
                            <span style={{ fontSize: 12, color: '#374151' }}>
                              <span style={{ color: '#94a3b8' }}>Alcance: </span><strong>{ALCANCE_LABELS[ind.alcance] ?? ind.alcance}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
