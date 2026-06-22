'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { SearchIcon, FileTextIcon, BarChartIcon, BuildingIcon } from './Icons'

interface Resultado {
  tipo: 'registro' | 'indicador' | 'sede'
  id: string
  titulo: string
  subtitulo: string
  href: string
}

export default function BusquedaGlobal() {
  const supabase = createClient()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [cargando, setCargando] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const [indice, setIndice] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResultados([]); setAbierto(false); return }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscar(query.trim()), 280)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  async function buscar(q: string) {
    setCargando(true)
    const term = `%${q}%`

    const [regRes, indRes, sedeRes] = await Promise.all([
      supabase.from('registros_datos')
        .select('id, anio, mes, estado, indicadores(nombre, codigo)')
        .ilike('indicadores.nombre', term)
        .limit(4),
      supabase.from('indicadores')
        .select('id, codigo, nombre')
        .or(`nombre.ilike.${term},codigo.ilike.${term}`)
        .limit(4),
      supabase.from('sedes')
        .select('id, nombre, ciudad')
        .ilike('nombre', term)
        .limit(3),
    ])

    const items: Resultado[] = []

    regRes.data?.forEach(r => {
      const ind = Array.isArray(r.indicadores) ? r.indicadores[0] : r.indicadores
      if (ind) items.push({
        tipo: 'registro', id: r.id,
        titulo: ind.nombre ?? ind.codigo,
        subtitulo: `Registro · ${r.anio}${r.mes ? `/${r.mes}` : ''} · ${r.estado}`,
        href: `/registros/${r.id}`,
      })
    })

    indRes.data?.forEach(i => items.push({
      tipo: 'indicador', id: i.id,
      titulo: i.nombre,
      subtitulo: `Indicador · ${i.codigo}`,
      href: `/indicadores`,
    }))

    sedeRes.data?.forEach(s => items.push({
      tipo: 'sede', id: s.id,
      titulo: s.nombre,
      subtitulo: `Sede · ${s.ciudad ?? ''}`,
      href: `/sedes`,
    }))

    setResultados(items)
    setIndice(0)
    setAbierto(items.length > 0)
    setCargando(false)
  }

  function navegar(href: string) {
    setQuery('')
    setAbierto(false)
    router.push(href)
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndice(i => Math.min(i + 1, resultados.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setIndice(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && resultados[indice]) navegar(resultados[indice].href)
    if (e.key === 'Escape') { setAbierto(false); inputRef.current?.blur() }
  }

  const TIPO_ICONO: Record<string, React.ReactNode> = {
    registro:  <FileTextIcon size={14} color="#64748b" />,
    indicador: <BarChartIcon size={14} color="#64748b" />,
    sede:      <BuildingIcon size={14} color="#64748b" />,
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: 280 }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex' }}>
          <SearchIcon size={14} color="#94a3b8" />
        </span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (resultados.length > 0) setAbierto(true) }}
          onKeyDown={onKey}
          placeholder="Buscar registros, indicadores…"
          style={{
            width: '100%', padding: '8px 12px 8px 32px', borderRadius: 8,
            border: '1.5px solid #e2e8f0', fontSize: 13, color: '#1f2937',
            background: '#f8fafc', outline: 'none', boxSizing: 'border-box',
            transition: 'border 0.15s',
          }}
        />
        {cargando && (
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#94a3b8' }}>
            …
          </span>
        )}
      </div>

      {abierto && resultados.length > 0 && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, right: 0,
          background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          border: '1px solid #e2e8f0', zIndex: 9999, overflow: 'hidden',
        }}>
          {resultados.map((r, i) => (
            <button
              key={`${r.tipo}-${r.id}`}
              onClick={() => navegar(r.href)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                width: '100%', padding: '10px 14px', textAlign: 'left',
                background: i === indice ? '#f0fdf4' : '#fff',
                border: 'none', borderBottom: '1px solid #f8fafc',
                cursor: 'pointer', transition: 'background 0.1s',
              }}
              onMouseEnter={() => setIndice(i)}
            >
              <span style={{ fontSize: 16, marginTop: 1 }}>{TIPO_ICONO[r.tipo]}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{r.titulo}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.subtitulo}</div>
              </div>
            </button>
          ))}
          <div style={{ padding: '6px 14px', fontSize: 11, color: '#cbd5e1', background: '#f8fafc', textAlign: 'right' }}>
            ↑↓ navegar · Enter seleccionar · Esc cerrar
          </div>
        </div>
      )}
    </div>
  )
}
