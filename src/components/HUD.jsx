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
import { FullscreenToggle } from './FullscreenToggle'
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

// ── Botón de Volver al Menú ────────────────────────────────────
function BackToMenu() {
  const setModo = useMuseoStore(s => s.setModo)

  return (
    <button
      id="hud-back-btn"
      className="hud__back-btn"
      onClick={() => setModo('landing')}
      aria-label="Volver al menú principal"
      title="Volver al menú"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    </button>
  )
}

// ── Componente Principal HUD ───────────────────────────────────
export function HUD() {
  // enTransicion se activa cuando el vórtex alcanza intensity > 0.05.
  // Al hacer fade-out del HUD, evitamos que los textos HTML queden
  // estáticos sobre la pantalla deformada por el shader.
  const enTransicion = useMuseoStore(s => s.enTransicion)
  const modalMapaActivo = useMuseoStore(s => s.modalMapaActivo)
  const setModalMapaActivo = useMuseoStore(s => s.setModalMapaActivo)
  const mostrarBotonValdivia = useMuseoStore(s => s.mostrarBotonValdivia)
  const mostrarBotonChorrera = useMuseoStore(s => s.mostrarBotonChorrera)
  const mostrarBotonGuangala = useMuseoStore(s => s.mostrarBotonGuangala)
  const mostrarBotonManteno = useMuseoStore(s => s.mostrarBotonManteno)

  return (
    <>
      <div
        id="hud-layer"
        aria-label="Interfaz del viaje"
        style={{
          opacity:    enTransicion ? 0 : 1,
          transition: 'opacity 0.2s ease-out',  // fade suave, no abrupto
        }}
      >
        <EraIndicator />
        <JourneyProgress />
        <ReiDialog />
        <div className="hud__top-controls">
          <BackToMenu />
          <FullscreenToggle />
          <AudioToggle />
        </div>

        {/* Botón flotante para ver la Figurina de Valdivia */}
        {mostrarBotonValdivia && (
          <button 
            onClick={() => setModalMapaActivo('valdivia')} 
            className="hud__valdivia-button"
            id="valdivia-figurina-btn"
          >
            Ver Figurina
          </button>
        )}

        {/* Botón flotante para ver la Cerámica Engoroy */}
        {mostrarBotonChorrera && (
          <button 
            onClick={() => setModalMapaActivo('chorrera')} 
            className="hud__chorrera-button"
            id="chorrera-ceramica-btn"
          >
            Ver Cerámica
          </button>
        )}

        {/* Botón flotante para ver la Foto de Recuerdo */}
        {mostrarBotonGuangala && (
          <button 
            onClick={() => setModalMapaActivo('guangala')} 
            className="hud__guangala-button"
            id="guangala-foto-btn"
          >
            Foto de Recuerdo
          </button>
        )}

        {/* Botón flotante para ver la Cerámica Manteño-Guancavilca */}
        {mostrarBotonManteno && (
          <button 
            onClick={() => setModalMapaActivo('manteno')} 
            className="hud__manteno-button"
            id="manteno-ceramica-btn"
          >
            Ver Cerámica
          </button>
        )}
      </div>

      {/* ── VENTANA MODAL PARA MAPAS (Renderizada a nivel superior de DOM) ── */}
      {modalMapaActivo && (
        <div 
          className="map-modal-overlay" 
          onClick={(e) => {
            if (e.target.className === 'map-modal-overlay') {
              setModalMapaActivo(null)
            }
          }}
        >
          <div className="map-modal-content">
            <div className="map-modal-header">
              <h3 className="map-modal-title">
                {modalMapaActivo === 'amantes' && 'Mapa Amantes de Sumpa'}
                {modalMapaActivo === 'etnografica' && 'Mapa Área Etnográfica'}
                {modalMapaActivo === 'cronologia' && 'Línea de Tiempo de la Época Aborigen'}
                {modalMapaActivo === 'estratigrafia' && 'Diagrama Estratigráfico'}
                {modalMapaActivo === 'valdivia' && 'Figurina de Valdivia'}
                {modalMapaActivo === 'chorrera' && 'Cerámica Engoroy'}
                {modalMapaActivo === 'guangala' && 'Foto de Recuerdo'}
                {modalMapaActivo === 'manteno' && 'Cerámica Manteño-Guancavilca'}
              </h3>
              <button onClick={() => setModalMapaActivo(null)} className="map-modal-close-btn" aria-label="Cerrar modal">
                &times;
              </button>
            </div>
            <div className="map-modal-body">
              <img 
                src={
                  modalMapaActivo === 'amantes' ? '/assets/mapaAmantesSumpa.webp' :
                  modalMapaActivo === 'etnografica' ? '/assets/mapaAreaEtnografica.webp' :
                  modalMapaActivo === 'cronologia' ? '/assets/diagramaEpocas.webp' :
                  modalMapaActivo === 'estratigrafia' ? '/assets/diagramaEpocas2.webp' :
                  modalMapaActivo === 'valdivia' ? '/assets/valdivia.webp' :
                  modalMapaActivo === 'chorrera' ? '/assets/ceramicaEngoroy.webp' :
                  modalMapaActivo === 'guangala' ? '/assets/fotorecuerdo.webp' :
                  '/assets/mantenoGuancavilcaCeramica.webp'
                } 
                alt={
                  modalMapaActivo === 'amantes' ? 'Mapa Amantes de Sumpa' :
                  modalMapaActivo === 'etnografica' ? 'Mapa Área Etnográfica' :
                  modalMapaActivo === 'cronologia' ? 'Línea de Tiempo de la Época Aborigen' :
                  modalMapaActivo === 'estratigrafia' ? 'Diagrama Estratigráfico' :
                  modalMapaActivo === 'valdivia' ? 'Figurina de Valdivia' :
                  modalMapaActivo === 'chorrera' ? 'Cerámica Engoroy' :
                  modalMapaActivo === 'guangala' ? 'Foto de Recuerdo' :
                  'Cerámica Manteño-Guancavilca'
                } 
                className="map-modal-image"
              />
            </div>
            <div className="map-modal-footer">
              {modalMapaActivo === 'guangala' && (
                <a 
                  href="/assets/fotorecuerdo.webp" 
                  download="FotoRecuerdo.webp" 
                  className="map-modal-btn-download"
                  style={{ marginRight: '12px' }}
                >
                  Descargar
                </a>
              )}
              <button onClick={() => setModalMapaActivo(null)} className="map-modal-btn-close">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
