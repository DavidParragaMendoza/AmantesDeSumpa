/**
 * STORE DE ZUSTAND — Museo Amantes de Sumpa
 * Módulo 1: Configuración inicial del estado global
 *
 * ARQUITECTURA DE ESTADO:
 * Separamos el estado en dos categorías:
 *
 * 1. ESTADO REACTIVO (suscripciones normales de React):
 *    Para datos que cambian poco: escena activa, UI flags, etc.
 *    Los componentes se suscriben con selectores granulares.
 *
 * 2. ESTADO TRANSITORIO (transient updates via getState()):
 *    Para datos que cambian 60 veces por segundo (posición de scroll,
 *    progreso de animación). Se lee dentro de useFrame() SIN provocar
 *    re-renders de React.
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// ──────────────────────────────────────────────────────────────
// CONSTANTES DE ESCENAS
// Cada escena representa una era cultural de Santa Elena
// ──────────────────────────────────────────────────────────────
export const ESCENAS = [
  { id: 'intro',     era: null,        titulo: 'El Museo',               color: '#0a0c14' },
  { id: 'las-vegas', era: '8000 a.C.', titulo: 'Cultura Las Vegas',      color: '#1a0a05' },
  { id: 'valdivia',  era: '3500 a.C.', titulo: 'Cultura Valdivia',       color: '#0a1a0a' },
  { id: 'machalilla',era: '1500 a.C.', titulo: 'Cultura Machalilla',     color: '#0a0f1a' },
  { id: 'chorrera',  era: '900 a.C.',  titulo: 'Cultura Chorrera',       color: '#1a0a15' },
  { id: 'bahia',     era: '500 a.C.',  titulo: 'Cultura Bahía / Guangala',color: '#0a1515' },
  { id: 'manteno',   era: '800 d.C.',  titulo: 'Cultura Manteño',        color: '#150a00' },
  { id: 'contacto',  era: '1530 d.C.', titulo: 'La Llegada Española',    color: '#0a0a1a' },
]

// ──────────────────────────────────────────────────────────────
// STORE PRINCIPAL
// Usamos subscribeWithSelector para permitir suscripciones
// granulares: solo re-renderiza cuando cambia el slice exacto.
// ──────────────────────────────────────────────────────────────
export const useMuseoStore = create(
  subscribeWithSelector((set, get) => ({

    // ── ESTADO DE NAVEGACIÓN ──────────────────────────────────
    /**
     * Índice de la escena actualmente visible.
     * Deriva de scrollProgress en el componente ScrollNarrative.
     * Cambiar esto SÍ provoca re-render (es intencional para la UI).
     */
    escenaActual: 0,
    setEscenaActual: (index) => set({ escenaActual: index }),

    /**
     * Progreso de scroll global normalizado [0, 1].
     *
     * ⚠️ TRANSIENT UPDATE PATTERN:
     * Este valor cambia 60 veces/segundo. Para leerlo en useFrame()
     * sin re-renders, usa:
     *   const progress = useMuseoStore.getState().scrollProgress
     * en lugar de:
     *   const { scrollProgress } = useMuseoStore() ← ¡EVITAR en useFrame!
     *
     * Solo se actualiza en el store para que otros sistemas
     * (como minijuegos) puedan consultarlo en cualquier momento.
     */
    scrollProgress: 0,
    setScrollProgress: (value) => set({ scrollProgress: value }),


    // ── ESTADO DE UI / HUD ────────────────────────────────────
    /** Muestra/oculta el panel de diálogo de Rei */
    dialogoReiVisible: false,
    setDialogoReiVisible: (visible) => set({ dialogoReiVisible: visible }),

    /** Texto actual en el bocadillo de diálogo de Rei */
    dialogoReiTexto: '',
    setDialogoReiTexto: (texto) => set({ dialogoReiTexto: texto }),

    /** Indica si estamos en transición entre escenas (bloquea interacción) */
    enTransicion: false,
    setEnTransicion: (estado) => set({ enTransicion: estado }),


    // ── ESTADO DE MINIJUEGOS ──────────────────────────────────
    /**
     * Map de logros desbloqueados por escena.
     * Key: id de escena, Value: boolean
     */
    logros: Object.fromEntries(ESCENAS.map(e => [e.id, false])),
    desbloquearLogro: (escenaId) =>
      set(state => ({
        logros: { ...state.logros, [escenaId]: true }
      })),

    /** Minijuego actualmente activo (null = ninguno) */
    minijuegoActivo: null,
    setMinijuegoActivo: (id) => set({ minijuegoActivo: id }),


    // ── ESTADO DE AUDIO ───────────────────────────────────────
    audioHabilitado: true,
    toggleAudio: () => set(state => ({ audioHabilitado: !state.audioHabilitado })),


    // ── SELECTORES DERIVADOS (helpers) ───────────────────────
    /**
     * Devuelve los datos de la escena actual.
     * Usar como: useMuseoStore(s => s.getEscenaData())
     */
    getEscenaData: () => {
      const { escenaActual } = get()
      return ESCENAS[escenaActual] ?? ESCENAS[0]
    },
  }))
)

// ──────────────────────────────────────────────────────────────
// SUSCRIPCIONES EXTERNAS (fuera de React)
// Para efectos secundarios que no necesitan componentes
// ──────────────────────────────────────────────────────────────

/**
 * Ejemplo: cuando cambia la escena, podemos disparar
 * efectos de audio, analytics, etc. sin tocar React.
 */
useMuseoStore.subscribe(
  (state) => state.escenaActual,
  (escenaIndex) => {
    const escena = ESCENAS[escenaIndex]
    if (escena) {
      // Aquí irá: audioManager.cambiarAmbiente(escena.id)
      console.log(`[Museo] Viajando a: ${escena.titulo} (${escena.era ?? 'Presente'})`)
    }
  }
)
