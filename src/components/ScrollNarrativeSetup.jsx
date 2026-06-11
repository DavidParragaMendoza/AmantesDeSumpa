/**
 * SCROLL NARRATIVE — Controlador de scroll GSAP + ScrollTrigger
 * Módulo 3: Sistema de Scroll y Animación con Intro Narrativa (Escena 0)
 *
 * RESPONSABILIDADES:
 * 1. Crear la línea de tiempo principal (GSAP Timeline)
 * 2. Registrar ScrollTrigger vinculado al scroll nativo del body
 * 3. Fases 1–7: Animación introductoria de la Escena 0 (Museo)
 *    - Fase 1: Letrero de bienvenida visible (estado inicial)
 *    - Fase 2: Letrero fade-out → Rei1 aparece → diálogo "¡Hola! Soy REI"
 *    - Fase 3: Rei2 → diálogo "Phyllodactylus reissii"
 *    - Fase 4: Rei3 → diálogo "Karen Stothert"
 *    - Fase 5: Rei4 se mueve a la derecha → diálogo "¿Qué es CULTURA?"
 *    - Fase 6: Rei5 al centro → diálogo "¡Viajar en el tiempo!"
 *    - Fase 7: Rei6.png (Rei + máquina en una sola imagen) + diálogo "¡Súbete!"
 * 4. Fase 8+: Cámara viaja en el eje X por las épocas culturales
 * 5. Notificar al store de Zustand cuando cambia la escena activa
 *
 * RESTRICCIONES TÉCNICAS:
 * - frameloop="demand": onUpdate de CADA tween DEBE llamar invalidate()
 * - scrub: true → la intro retrocede si el usuario sube en el scroll
 * - snap: ajusta al punto de narrativa más cercano
 *
 * NO hace:
 * ✗ No modifica estado de React directamente en cada frame
 * ✗ No usa <ScrollControls> de Drei
 * ✗ No usa el scroll virtual de Drei
 */

import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { gsapTarget, CAMERA_KEYFRAMES } from '../animation/gsapTarget'
import { useMuseoStore, ESCENAS } from '../store/useMuseoStore'

// Registrar el plugin una sola vez
gsap.registerPlugin(ScrollTrigger)

// Altura del frustum ortográfico — debe coincidir con OrthoCamera.jsx
const FRUSTUM_HEIGHT = 10

// ──────────────────────────────────────────────────────────────
// HOOK: useScrollNarrative
// Se usa DENTRO de la escena R3F (requiere contexto de Three.js)
// ──────────────────────────────────────────────────────────────
export function useScrollNarrative() {
  const { camera, viewport, invalidate, size } = useThree()
  const timelineRef   = useRef(null)
  const isScrolling   = useRef(false)
  const setEscenaActual   = useMuseoStore(s => s.setEscenaActual)
  const setScrollProgress = useMuseoStore(s => s.setScrollProgress)

  /**
   * FIX PRINCIPAL — frameloop="demand" + scroll:
   * useFrame corre SOLO mientras R3F está renderizando frames.
   * Con frameloop="demand", el primer frame hay que pedirlo manualmente.
   * Luego, mientras el scroll esté activo, pedimos frames continuamente.
   *
   * isScrolling.current se pone true en el onUpdate del ScrollTrigger y
   * false cuando el scroll para. useFrame llama invalidate() mientras
   * isScrolling es true, formando un loop solo durante el scroll.
   */
  useFrame(() => {
    if (isScrolling.current) {
      invalidate() // Mantiene el loop vivo mientras hay scroll
    }
  })

  useEffect(() => {
    if (viewport.width === 0 || viewport.height === 0) return

    // ── 1. DURACIONES DE LA LÍNEA DE TIEMPO ───────────────────
    const introDuration   = 6.5  // Fases 2 a 7 + pausa
    const cameraDuration  = CAMERA_KEYFRAMES.length - 1  // 7 escenas × 1 unidad
    const totalDuration   = introDuration + cameraDuration

    // ── 2. CONFIGURAR EL SPACER DE SCROLL ─────────────────────
    // VH_POR_ESCENA: cuántos vh de scroll consume cada parada narrativa.
    const VH_POR_ESCENA   = 100
    const scrollSpacerEl  = document.getElementById('scroll-spacer')
    if (scrollSpacerEl) {
      scrollSpacerEl.style.height = `${VH_POR_ESCENA * totalDuration}vh`
    }

    // ── 3. PRIMER FRAME — forzar renderizado inicial ────────────
    invalidate()
    const initialFrameId = requestAnimationFrame(() => invalidate())

    // ── 4. CÁLCULO DE ESPACIADO ─────────────────────────────────
    // Misma fórmula que DioramaScene y OrthoCamera para coherencia absoluta
    const worldWidth = (size.width / size.height) * FRUSTUM_HEIGHT
    const SPACING    = worldWidth

    // ── 5. RESET DEL DUMMY TARGET ─────────────────────────────
    // Evita que HMR deje valores residuales de sesiones anteriores
    gsapTarget.intro = {
      signOpacity:   1,   // Letrero visible al inicio
      reiOpacity:    0,   // Rei oculto al inicio
      reiScale:      0,   // Rei sin escala al inicio (para pop-in)
      reiPositionX:  0,   // Rei en posición derecha inicial
      dialogueStep:  0,   // Sin diálogo al inicio (0=letrero, 1-6=fases Rei)
    }
    gsapTarget.camera.x    = 0
    gsapTarget.camera.y    = 0
    gsapTarget.camera.zoom = 1
    gsapTarget.scene.progress    = 0
    gsapTarget.scene.escenaIndex = 0
    gsapTarget.scene.blend       = 0
    gsapTarget.transition.intensity = 0  // Efecto warp inactivo al inicio

    // ── 6. CONSTRUCCIÓN DE LA TIMELINE MAESTRA ─────────────────
    // paused: true → ScrollTrigger controla el progreso manualmente.
    timelineRef.current = gsap.timeline({ paused: true })

    // ====== INTRO (Fases 2 a 7) — cada fase dura 1 unidad de tiempo ======

    /**
     * FASE 2 (Texto 1 — Rei1.png):
     * Letrero hace fade-out, Rei1 hace pop-in y se desplaza hacia la izquierda.
     */
    timelineRef.current.to(gsapTarget.intro, {
      signOpacity:  0,
      reiScale:     1,
      reiOpacity:   1,
      reiPositionX: -worldWidth * 0.4,
      dialogueStep: 1,
      duration: 1,
      ease: 'power2.inOut',
      onUpdate: () => invalidate(),
    })

    /**
     * FASE 3 (Texto 2 — Rei2.png):
     * Rei2 aparece quieto en la izquierda. Diálogo: Phyllodactylus reissii.
     */
    timelineRef.current.to(gsapTarget.intro, {
      reiPositionX: -worldWidth * 0.4,
      dialogueStep: 2,
      duration: 1,
      ease: 'power2.inOut',
      onUpdate: () => invalidate(),
    })

    /**
     * FASE 4 (Texto 3 — Rei3.png):
     * Rei3 aparece quieto en la izquierda. Diálogo: Karen Stothert.
     */
    timelineRef.current.to(gsapTarget.intro, {
      reiPositionX: -worldWidth * 0.4,
      dialogueStep: 3,
      duration: 1,
      ease: 'power2.inOut',
      onUpdate: () => invalidate(),
    })

    /**
     * FASE 5 (Texto 4 — Rei4.png):
     * Rei4 se mueve hacia la derecha. Diálogo: ¿Qué es CULTURA?
     */
    timelineRef.current.to(gsapTarget.intro, {
      reiPositionX: 0,
      dialogueStep: 4,
      duration: 1,
      ease: 'power2.inOut',
      onUpdate: () => invalidate(),
    })

    /**
     * FASE 6 (Texto 5 — Rei5.png):
     * Rei5 queda al centro. Diálogo: ¡Esto me motiva a viajar!
     */
    timelineRef.current.to(gsapTarget.intro, {
      reiPositionX: -worldWidth * 0.2,
      dialogueStep: 5,
      duration: 1,
      ease: 'power2.inOut',
      onUpdate: () => invalidate(),
    })

    /**
     * FASE 7 (Texto 6 — Rei6.png):
     * Rei6 ya combina a Rei montado sobre la máquina del tiempo en una sola imagen.
     * Diálogo: ¡Vamos, súbete a mi máquina del tiempo!
     */
    timelineRef.current.to(gsapTarget.intro, {
      reiPositionX: -worldWidth * 0.2,
      dialogueStep: 6,
      duration: 1,
      ease: 'back.out(1.5)',
      onUpdate: () => invalidate(),
    })

    /**
     * PAUSA NARRATIVA: breve espera antes de comenzar el viaje en el tiempo.
     */
    timelineRef.current.to({}, { duration: 0.5 })

    // ====== FASE 8+: VIAJE EN EL TIEMPO — la cámara se mueve en X ======
    // Iteramos sobre los CAMERA_KEYFRAMES (saltando el índice 0 = intro)
    CAMERA_KEYFRAMES.forEach((keyframe, index) => {
      if (index === 0) return // El índice 0 ya está representado por el estado inicial

      // ── Tween de cámara: mueve la posición target en X (y ajusta Y y zoom) ──
      timelineRef.current.to(
        gsapTarget.camera,
        {
          x:    -index * SPACING, // Cada escena está separada por worldWidth
          y:    keyframe.y,
          zoom: keyframe.zoom,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        }
      )

      // ── Tween simultáneo del estado de escena (para el HUD y el store) ──
      // '<' significa "en paralelo con el tween anterior"
      const targetProgress = index / (CAMERA_KEYFRAMES.length - 1)
      timelineRef.current.to(
        gsapTarget.scene,
        {
          progress:    targetProgress,
          escenaIndex: index,
          duration: 1,
        },
        '<'
      )

      // ── TIME WARP: ramp UP (primera mitad) ───────────────────────
      // intensity: 0 → 1 durante la primera mitad del viaje entre escenas.
      // '<' lo posiciona en paralelo con el inicio del tween de cámara.
      timelineRef.current.to(
        gsapTarget.transition,
        {
          intensity: 1,
          duration:  0.5,
          ease:      'power2.in',
          onUpdate:  () => invalidate(),
        },
        '<'    // paralelo con el inicio del viaje
      )

      // ── TIME WARP: ramp DOWN (segunda mitad) ──────────────────────
      // intensity: 1 → 0 durante la segunda mitad. Comienza cuando el
      // ramp-up termina ('<+0.5' = inicio del ramp-up + 0.5 unidades).
      // Resultado: vórtex máximo exactamente a la mitad del viaje.
      timelineRef.current.to(
        gsapTarget.transition,
        {
          intensity: 0,
          duration:  0.5,
          ease:      'power2.out',
          onUpdate:  () => invalidate(),
        },
        '<+0.5'  // comienza 0.5 unidades después del inicio del ramp-up
      )
    })

    // ── 7. PUNTOS DE SNAP ───────────────────────────────────────
    const snapPoints = []

    // Punto 0: inicio absoluto (letrero visible)
    snapPoints.push(0)
    // Punto tras Fase 2 (Texto 1)
    snapPoints.push(1 / totalDuration)
    // Punto tras Fase 3 (Texto 2)
    snapPoints.push(2 / totalDuration)
    // Punto tras Fase 4 (Texto 3)
    snapPoints.push(3 / totalDuration)
    // Punto tras Fase 5 (Texto 4)
    snapPoints.push(4 / totalDuration)
    // Punto tras Fase 6 (Texto 5)
    snapPoints.push(5 / totalDuration)
    // Punto tras Fase 7 + pausa (Texto 6 / Spondylus + Pausa)
    snapPoints.push(introDuration / totalDuration)
    // Puntos de cada escena cultural
    for (let i = 1; i < CAMERA_KEYFRAMES.length; i++) {
      snapPoints.push((introDuration + i) / totalDuration)
    }

    // ── 8. SCROLL TRIGGER ──────────────────────────────────────
    ScrollTrigger.create({
      trigger: '#scroll-spacer',
      start:   'top top',
      end:     'bottom bottom',
      scrub:   1.5,          // Retardo de seguimiento (suavizado)
      animation: timelineRef.current,
      snap: {
        snapTo:   snapPoints,
        duration: { min: 0.2, max: 0.8 },
        delay:    0.1,
        ease:     'power1.inOut',
      },
      onUpdate: (self) => {
        // CRÍTICO: invalidate() en CADA tick de scroll con frameloop="demand"
        invalidate()
        isScrolling.current = true

        // Actualizar el escenaIndex redondeado para el HUD
        const currentEscenaIndex = Math.round(gsapTarget.scene.escenaIndex)
        gsapTarget.scene.blend   = gsapTarget.scene.escenaIndex % 1

        const escenaActualEnStore = useMuseoStore.getState().escenaActual
        if (currentEscenaIndex !== escenaActualEnStore) {
          setEscenaActual(currentEscenaIndex)
        }
        setScrollProgress(self.progress)

        // Actualizar enTransicion en Zustand para el fade del HUD.
        // El HUD hace fade-out cuando el vórtex supera el umbral de 0.05.
        // La comparación evita setState repetido cuando el valor no cambia.
        const isWarping = gsapTarget.transition.intensity > 0.05
        if (isWarping !== useMuseoStore.getState().enTransicion) {
          useMuseoStore.getState().setEnTransicion(isWarping)
        }
      },

      // Cuando el scroll para, dejamos de pedir frames extras
      onScrubComplete: () => { isScrolling.current = false },
    })

    return () => {
      cancelAnimationFrame(initialFrameId)
      timelineRef.current?.kill()
      ScrollTrigger.getAll().forEach(st => st.kill())
      // Resetear el efecto warp y el estado de transición al desmontar
      gsapTarget.transition.intensity = 0
      useMuseoStore.getState().setEnTransicion(false)
    }
  }, [camera, viewport.width, viewport.height, invalidate, setEscenaActual, setScrollProgress])
}

// ──────────────────────────────────────────────────────────────
// COMPONENTE: ScrollNarrativeSetup
// Wrapper vacío para llamar al hook dentro del contexto R3F.
// Se renderiza dentro de <Canvas> como un nodo vacío.
// ──────────────────────────────────────────────────────────────
export function ScrollNarrativeSetup() {
  useScrollNarrative()
  return null // No renderiza nada en Three.js
}
