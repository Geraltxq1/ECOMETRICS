'use client'

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

type Sender = 'bot' | 'user'

interface ChatMessage {
  id: number
  sender: Sender
  content: string
  time: string
}

const RESPUESTAS_ESTATICAS: Record<string, string> = {
  '¿Qué es GRI 302?': 'GRI 302 es el estándar de Energía del Global Reporting Initiative. 📊\n\nMide:\n• Consumo energético interno (electricidad, combustibles)\n• Intensidad energética\n• Reducción del consumo\n\nEn ECOMETRICS usamos GRI 302-1 para registrar tu consumo eléctrico en kWh.',
  '¿Cómo calculo CO₂?': 'El cálculo de CO₂ equivalente es simple: 🧮\n\n**Fórmula:**\nValor × Factor de emisión = tCO₂e\n\n**Ejemplo:**\n1,000 kWh × 0.000215 = 0.215 tCO₂e\n\nEl factor 0.000215 viene de la UPME (Unidad de Planeación Minero Energética de Colombia) para la red eléctrica nacional.',
  '¿Qué es el Alcance 1?': 'El Alcance 1 son las **emisiones directas** de tu empresa. 🏭\n\n**Ejemplos:**\n• Combustión de gasolina en vehículos propios\n• Gas natural en calderas\n• Refrigerantes en equipos de frío\n\nSon las emisiones que tu empresa produce directamente, sin intermediarios.',
  'Reducir consumo energético': '¡Excelente meta! Aquí algunas recomendaciones: 💡\n\n1. **Auditoría energética** — identifica qué equipos consumen más\n2. **Iluminación LED** — reduce hasta 70% el consumo de iluminación\n3. **Horarios de uso** — apaga equipos fuera de horario\n4. **Energía solar** — paneles fotovoltaicos reducen Alcance 2\n5. **Monitoreo mensual** — registra en ECOMETRICS para ver tendencias\n\n¿Quieres más detalles sobre alguna?',
  default: 'Entiendo tu pregunta 🤔\n\nPronto tendré acceso a IA avanzada para responder con mayor precisión. Por ahora puedo ayudarte con preguntas sobre:\n\n• Indicadores GRI\n• Cálculo de emisiones CO₂\n• Alcances 1, 2 y 3\n• Recomendaciones básicas de sostenibilidad\n\n¿Hay algo específico sobre estos temas?',
}

const SUGERENCIAS = Object.keys(RESPUESTAS_ESTATICAS).filter((key) => key !== 'default')
const RUTAS_DASHBOARD = ['/dashboard', '/registros', '/indicadores', '/reportes', '/sedes', '/configuracion', '/perfil', '/revision', '/notificaciones', '/empresas']

function horaActual() {
  return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(new Date())
}

function respuestaPara(message: string) {
  const normalized = message.toLocaleLowerCase('es')
  return Object.entries(RESPUESTAS_ESTATICAS).find(([key]) => key !== 'default' && normalized.includes(key.toLocaleLowerCase('es')))?.[1]
    ?? RESPUESTAS_ESTATICAS.default
}

function FormattedText({ text }: { text: string }) {
  return <>{text.split('\n').map((line, index) => <span key={`${line}-${index}`}>{line.split(/(\*\*.*?\*\*)/g).map((part, partIndex) => part.startsWith('**') && part.endsWith('**') ? <strong key={partIndex}>{part.slice(2, -2)}</strong> : part)}{index < text.split('\n').length - 1 && <br />}</span>)}</>
}

export default function EcoBot() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const messageId = useRef(0)
  const endOfMessages = useRef<HTMLDivElement>(null)

  const isDashboardRoute = RUTAS_DASHBOARD.some((route) => pathname === route || pathname.startsWith(`${route}/`))

  useEffect(() => {
    const wasOpened = window.localStorage.getItem('ecobot-opened') === 'true'
    setHasUnread(!wasOpened)
    messageId.current += 1
    setMessages([{ id: messageId.current, sender: 'bot', time: horaActual(), content: '¡Hola! 👋 Soy **EcoBot**, tu asistente de sostenibilidad en ECOMETRICS.\n\nPuedo ayudarte con:\n🌱 Entender tus indicadores GRI\n📊 Analizar tus datos de emisiones\n💡 Recomendaciones para reducir tu huella\n📋 Explicar estándares ambientales\n\n¿En qué te puedo ayudar hoy?' }])
  }, [])

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isTyping, isOpen, isMinimized])

  if (!isDashboardRoute) return null

  const openChat = () => {
    setIsOpen(true)
    setIsMinimized(false)
    setHasUnread(false)
    window.localStorage.setItem('ecobot-opened', 'true')
  }

  const sendMessage = async (value = inputValue) => {
    const content = value.trim()
    if (!content || isTyping) return
    messageId.current += 1
    setMessages((current) => [...current, { id: messageId.current, sender: 'user', content, time: horaActual() }])
    setInputValue('')
    setIsTyping(true)
    try {
      const [response] = await Promise.all([
        fetch('/api/ecobot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content }),
        }),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ])
      const result = await response.json() as { answer?: string; error?: string }
      messageId.current += 1
      setMessages((current) => [...current, {
        id: messageId.current,
        sender: 'bot',
        content: response.ok && result.answer ? result.answer : result.error ?? 'EcoBot no pudo responder. Inténtalo de nuevo.',
        time: horaActual(),
      }])
    } catch {
      messageId.current += 1
      setMessages((current) => [...current, { id: messageId.current, sender: 'bot', content: 'No fue posible conectar con EcoBot. Revisa tu conexión e inténtalo de nuevo.', time: horaActual() }])
    } finally {
      setIsTyping(false)
    }
  }

  const submit = (event: FormEvent) => { event.preventDefault(); sendMessage() }
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage() }
  }

  if (!isOpen) return (
    <button className="ecobot-launcher ecobot-pulse" onClick={openChat} aria-label="Abrir EcoBot">
      <span aria-hidden="true">🌱</span>{hasUnread && <span className="ecobot-unread">1</span>}
    </button>
  )

  return (
    <section className={`ecobot-window ecobot-slide-up${isMinimized ? ' ecobot-minimized' : ''}`} aria-label="Chat con EcoBot">
      <header className="ecobot-header">
        <div className="ecobot-heading">
          <span className="ecobot-avatar" aria-hidden="true">🌱</span>
          <div><strong>EcoBot</strong><span>Asistente de sostenibilidad <i aria-label="En línea" /></span></div>
        </div>
        <div className="ecobot-actions">
          <button onClick={() => setIsMinimized((value) => !value)} aria-label={isMinimized ? 'Expandir chat' : 'Minimizar chat'}>{isMinimized ? '□' : '−'}</button>
          <button onClick={() => { setIsOpen(false); setIsMinimized(false) }} aria-label="Cerrar chat">×</button>
        </div>
      </header>
      {!isMinimized && <>
        <div className="ecobot-messages">
          {messages.map((message, index) => <div className={`ecobot-message ecobot-${message.sender}`} key={message.id}>
            {message.sender === 'bot' && <span className="ecobot-message-avatar" aria-hidden="true">🌱</span>}
            <div className="ecobot-bubble"><FormattedText text={message.content} /><time>{message.time}</time></div>
            {index === 0 && message.sender === 'bot' && <div className="ecobot-suggestions">{SUGERENCIAS.map((suggestion) => <button key={suggestion} onClick={() => sendMessage(suggestion)} disabled={isTyping}>{suggestion}</button>)}</div>}
          </div>)}
          {isTyping && <div className="ecobot-message ecobot-bot"><span className="ecobot-message-avatar" aria-hidden="true">🌱</span><div className="ecobot-bubble ecobot-typing" aria-label="EcoBot está escribiendo"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div></div>}
          <div ref={endOfMessages} />
        </div>
        <form className="ecobot-input-area" onSubmit={submit}>
          <textarea value={inputValue} onChange={(event) => setInputValue(event.target.value)} onKeyDown={onKeyDown} placeholder="Escribe tu pregunta..." rows={1} aria-label="Mensaje para EcoBot" />
          <button type="submit" disabled={!inputValue.trim() || isTyping} aria-label="Enviar mensaje">↑</button>
        </form>
        <footer>Powered by ECOMETRICS · IA Ambiental</footer>
      </>}
    </section>
  )
}
