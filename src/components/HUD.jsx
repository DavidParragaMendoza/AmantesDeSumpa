/**
 * HUD (Heads-Up Display) — Overlay de UI
 * Módulo 1: Indicadores de progreso y era temporal
 *
 * Este componente vive FUERA del Canvas de R3F (es HTML puro).
 * Se superpone sobre el canvas mediante position: fixed.
 *
 * SUSCRIPCIÓN GRANULAR A ZUSTAND:
 * Cada componente hijo se suscribe SOLO a lo que necesita.
 * Si escenaActual cambia, solo re-renderiza el indicador de era,
 * NO todo el árbol del HUD.
 */

import { useMuseoStore, ESCENAS } from '../store/useMuseoStore'
import './HUD.css'

// ── Indicador de Era Temporal ─────────────────────────────────
function EraIndicator() {
  // Selector granular: solo re-renderiza cuando cambia escenaActual
  const escenaActual = useMuseoStore(s => s.escenaActual)
  const escena = ESCENAS[escenaActual] ?? ESCENAS[0]

  return (
    <div className="hud__era" id="hud-era-indicator">
      <span className="hud__era-year">{escena.era ?? 'Presente'}</span>
      <span className="hud__era-title">{escena.titulo}</span>
    </div>
  )
}

// ── Barra de Progreso del Viaje ────────────────────────────────
function JourneyProgress() {
  // Otro selector granular independiente
  const escenaActual = useMuseoStore(s => s.escenaActual)
  const totalEscenas = ESCENAS.length

  return (
    <div className="hud__progress" id="hud-journey-progress" role="progressbar"
      aria-valuenow={escenaActual}
      aria-valuemin={0}
      aria-valuemax={totalEscenas - 1}
      aria-label="Progreso del viaje en el tiempo"
    >
      {ESCENAS.map((escena, index) => (
        <div
          key={escena.id}
          className={`hud__progress-dot ${index <= escenaActual ? 'hud__progress-dot--active' : ''}`}
          title={`${escena.titulo}${escena.era ? ` · ${escena.era}` : ''}`}
        />
      ))}
    </div>
  )
}

// ── Bocadillo de Rei ───────────────────────────────────────────
function ReiDialog() {
  // Suscripciones independientes — si cambia solo el texto, solo re-renderiza este
  const visible = useMuseoStore(s => s.dialogoReiVisible)
  const texto   = useMuseoStore(s => s.dialogoReiTexto)

  if (!visible || !texto) return null

  return (
    <div className="hud__rei-dialog" id="hud-rei-dialog" role="dialog" aria-label="Rei habla">
      <div className="hud__rei-bubble">
        <p>{texto}</p>
      </div>
    </div>
  )
}

// ── Toggle de Audio ────────────────────────────────────────────
function AudioToggle() {
  const audioHabilitado = useMuseoStore(s => s.audioHabilitado)
  const toggleAudio = useMuseoStore(s => s.toggleAudio)

  return (
    <button
      id="hud-audio-toggle"
      className="hud__audio-btn"
      onClick={toggleAudio}
      aria-label={audioHabilitado ? 'Silenciar audio' : 'Activar audio'}
      title={audioHabilitado ? 'Silenciar' : 'Activar sonido'}
    >
      {audioHabilitado ? '🔊' : '🔇'}
    </button>
  )
}

// ── Componente Principal HUD ───────────────────────────────────
export function HUD() {
  return (
    <div id="hud-layer" aria-label="Interfaz del viaje">
      <EraIndicator />
      <JourneyProgress />
      <ReiDialog />
      <AudioToggle />
    </div>
  )
}
