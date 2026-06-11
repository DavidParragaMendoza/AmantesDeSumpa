/**
 * OBJETO DUMMY TARGET — Patrón de animación GSAP + R3F
 * Módulo 1: Puente entre el scroll nativo y el universo 3D
 *
 * ¿POR QUÉ EXISTE ESTE ARCHIVO?
 * ─────────────────────────────
 * El problema clásico: GSAP vive fuera de React, R3F vive dentro.
 * Si GSAP modifica estado de React → re-renders innecesarios → 60fps imposible.
 *
 * La solución: GSAP anima UN OBJETO JAVASCRIPT PLANO (el "dummy").
 * useFrame() de R3F lee ese objeto directamente en el loop de Three.js.
 * React nunca se entera → 0 re-renders → animación suave garantizada.
 *
 * DIAGRAMA DE FLUJO:
 *   [Scroll del usuario]
 *        │
 *        ▼
 *   [ScrollTrigger] detecta progreso
 *        │
 *        ▼
 *   [GSAP] anima `gsapTarget.camera.x`, `gsapTarget.scene.progress`, etc.
 *        │ (objeto JS plano, sin React)
 *        ▼
 *   [useFrame() en R3F] lee gsapTarget cada frame
 *        │
 *        ▼
 *   [Three.js] mueve la cámara y los objetos 3D → GPU → pantalla
 */

// ──────────────────────────────────────────────────────────────
// EL DUMMY TARGET
// Objeto mutable compartido. ES INTENCIONAL que sea mutable:
// GSAP necesita poder escribir en él en cada frame de animación.
// ──────────────────────────────────────────────────────────────
export const gsapTarget = {
  /**
   * CÁMARA ORTOGRÁFICA
   * Coordenadas del punto al que debe moverse la cámara.
   * Los valores iniciales corresponden a la posición "intro".
   */
  camera: {
    x: 0,      // Desplazamiento horizontal (paneo lateral)
    y: 0,      // Desplazamiento vertical (paneo vertical)
    zoom: 1,   // Zoom ortográfico (1 = normal, >1 = acercar)
  },

  /**
   * ESCENA / NARRATIVA
   * Control del progreso narrativo global [0, 1].
   * 0 = inicio del viaje (Museo actual)
   * 1 = final del viaje (1530 d.C.)
   */
  scene: {
    progress: 0,       // Progreso scroll normalizado [0, 1]
    escenaIndex: 0,    // Índice de escena actual (número entero)
    blend: 0,          // Mezcla entre escena actual y siguiente [0, 1]
  },

  /**
   * EFECTOS VISUALES
   * Valores para shaders y post-procesado (Módulo futuro).
   */
  fx: {
    vignetteIntensity: 0.3,  // Viñeta en los bordes
    grainAmount: 0.0,         // Grano de película
    colorShift: 0,            // Cambio de temperatura de color
  },

  /**
   * INTRO NARRATIVE (Escena 0)
   * Animación de elementos antes de que la cámara comience a moverse.
   */
  intro: {
    signOpacity:  1,   // Letrero de bienvenida [1=visible, 0=oculto]
    reiOpacity:   0,   // Opacidad del globo de diálogo de Rei
    reiScale:     0,   // Escala de Rei (0=invisible → 1=tamaño completo)
    reiPositionX: 0,   // Desplazamiento X adicional de Rei en la escena
    dialogueStep: 0,   // Paso de diálogo activo: 0=letrero, 1–6=fases Rei
  },

  /**
   * TRANSICIÓN DE VIAJE EN EL TIEMPO (TimeWarpEffect)
   * Controla la intensidad del shader de deformación entre escenas.
   *
   * GSAP anima intensity 0 → 1 → 0 durante cada transición de escena:
   *   0   = passthrough perfecto (sin efecto)
   *   0.5 = vórtex parcial + aberración visible
   *   1   = vórtex máximo + flash de energía azul-celeste
   *
   * TimeWarpEffect.jsx lee este valor en useFrame() via getState-like
   * acceso directo al objeto (sin suscripción React → 0 re-renders).
   */
  transition: {
    intensity: 0,   // [0, 1] — intensidad del efecto warp
  },
}

// ──────────────────────────────────────────────────────────────
// POSICIONES DE CÁMARA POR ESCENA
// Define el "keyframe" de cámara para cada era cultural.
// GSAP interpolará entre estos valores según el scroll.
// ──────────────────────────────────────────────────────────────
export const CAMERA_KEYFRAMES = [
  // Escena 0 — Intro: El Museo
  { y: 0,    zoom: 1.0,  label: 'intro'      },
  // Escena 1 — 8000 a.C.: Las Vegas
  { y: 0,    zoom: 1.0,  label: 'las-vegas'  },
  // Escena 2 — 3500 a.C.: Valdivia
  { y: 0,    zoom: 1.1,  label: 'valdivia'   },
  // Escena 3 — 1500 a.C.: Machalilla
  { y: 0,    zoom: 1.0,  label: 'machalilla' },
  // Escena 4 — 900 a.C.: Chorrera
  { y: 1,    zoom: 1.15, label: 'chorrera'   },
  // Escena 5 — 500 a.C.: Bahía / Guangala
  { y: 0,    zoom: 1.0,  label: 'bahia'      },
  // Escena 6 — 800 d.C.: Manteño
  { y: -1,   zoom: 1.2,  label: 'manteno'    },
  // Escena 7 — 1530 d.C.: Contacto
  { y: 0,    zoom: 1.0,  label: 'contacto'   },
]
