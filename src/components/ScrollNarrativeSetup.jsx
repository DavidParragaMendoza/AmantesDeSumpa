/**
 * SCROLL NARRATIVE — Controlador de scroll GSAP + ScrollTrigger
 * Módulo 3: Sistema de Scroll y Animación con Intro Narrativa (Escena 0)
 *
 * RESPONSABILIDADES:
 * 1. Crear la línea de tiempo principal (GSAP Timeline)
 * 2. Registrar ScrollTrigger vinculado al scroll nativo del body
 * 3. Fases 1–4: Animación introductoria de la Escena 0 (Museo)
 *    - Fase 1: Letrero de bienvenida visible (estado inicial)
 *    - Fase 2: Letrero fade-out → Rei aparece con diálogo "¡Hola!"
 *    - Fase 3: Rei se desplaza → diálogo cambia a "Súbete a mi máquina"
 *    - Fase 4: Spondylus aparece en escena
 * 4. Fase 5+: Cámara viaja en el eje X por las épocas culturales
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
   * isScrolling.ref se pone true en el onUpdate del ScrollTrigger y
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

    // ── 1. CONFIGURAR EL SPACER DE SCROLL ─────────────────────
    // VH_POR_ESCENA: cuántos vh de scroll consume cada parada narrativa.
    // 3 fases de intro + 1 pausa + N escenas culturales.
    const VH_POR_ESCENA   = 100
    const scrollSpacerEl  = document.getElementById('scroll-spacer')
    if (scrollSpacerEl) {
      // Intro (4 pasos) + pausa (1) + escenas de cámara (N-1)
      const totalStops = 4 + 1 + (CAMERA_KEYFRAMES.length - 1)
      scrollSpacerEl.style.height = `${VH_POR_ESCENA * totalStops}vh`
    }

    // ── 2. PRIMER FRAME — forzar renderizado inicial ────────────
    invalidate()
    const initialFrameId = requestAnimationFrame(() => invalidate())

    // ── 3. CÁLCULO DE ESPACIADO ─────────────────────────────────
    // Misma fórmula que DioramaScene y OrthoCamera para coherencia absoluta
    const worldWidth = (size.width / size.height) * FRUSTUM_HEIGHT
    const SPACING    = worldWidth

    // ── 4. RESET DEL DUMMY TARGET ───────────────────────────────
    // Evita que HMR deje valores residuales de sesiones anteriores
    gsapTarget.intro = {
      signOpacity:   1,   // Letrero visible al inicio
      reiOpacity:    0,   // Rei oculto al inicio
      reiScale:      0,   // Rei sin escala al inicio (para pop-in)
      reiPositionX:  0,   // Rei en posición derecha inicial
      spondylusScale: 0,  // Spondylus oculto al inicio
      dialogueStep:  0,   // Sin diálogo al inicio
    }
    gsapTarget.camera.x    = 0
    gsapTarget.camera.y    = 0
    gsapTarget.camera.zoom = 1
    gsapTarget.scene.progress    = 0
    gsapTarget.scene.escenaIndex = 0
    gsapTarget.scene.blend       = 0

    // ── 5. CONSTRUCCIÓN DE LA TIMELINE MAESTRA ─────────────────
    // paused: true → ScrollTrigger controla el progreso manualmente.
    timelineRef.current = gsap.timeline({ paused: true })

    // ====== INTRO (Fases 2, 3, 4) — cada fase dura 1 unidad de tiempo ======

    /**
     * FASE 2: Letrero hace fade-out, Rei hace pop-in con diálogo 1.
     * signOpacity: 1 → 0
     * reiScale:    0 → 1 (pop-in con back.out)
     * reiOpacity:  0 → 1
     * dialogueStep: 0 → 1
     */
    timelineRef.current.to(gsapTarget.intro, {
      signOpacity:  0,
      reiScale:     1,
      reiOpacity:   1,
      dialogueStep: 1,
      duration: 1,
      ease: 'power2.inOut',
      onUpdate: () => invalidate(),
    })

    /**
     * FASE 3: Rei se desplaza hacia la izquierda, diálogo cambia a frase 2.
     * reiPositionX: 0 → -SPACING*0.4 (se mueve desde derecha hacia centro)
     * dialogueStep: 1 → 2
     */
    timelineRef.current.to(gsapTarget.intro, {
      reiPositionX: -worldWidth * 0.4,
      dialogueStep: 2,
      duration: 1,
      ease: 'power2.inOut',
      onUpdate: () => invalidate(),
    })

    /**
     * FASE 4: Spondylus aparece con efecto de escala (back.out = rebote).
     * spondylusScale: 0 → 1
     */
    timelineRef.current.to(gsapTarget.intro, {
      spondylusScale: 1,
      duration: 1,
      ease: 'back.out(1.5)',
      onUpdate: () => invalidate(),
    })

    /**
     * PAUSA NARRATIVA: breve espera antes de comenzar el viaje.
     * Equivale a que el usuario tenga un momento para "leer la escena".
     */
    timelineRef.current.to({}, { duration: 0.5 })

    // ====== FASE 5+: VIAJE EN EL TIEMPO — la cámara se mueve en X ======
    // Iteramos sobre los CAMERA_KEYFRAMES (saltando el índice 0 = intro)
    CAMERA_KEYFRAMES.forEach((keyframe, index) => {
      if (index === 0) return // El índice 0 ya está representado por el estado inicial

      // Tween de cámara: mueve la posición target en X (y ajusta Y y zoom)
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

      // Tween simultáneo del estado de escena (para el HUD y el store)
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
    })

    // ── 6. PUNTOS DE SNAP ───────────────────────────────────────
    // Calculamos los puntos exactos en la timeline donde hacer snap.
    // Las duraciones son: Fase2(1) + Fase3(1) + Fase4(1) + Pausa(0.5) + Escenas(N-1 * 1)
    const introDuration   = 3.5  // Fases 2+3+4 + pausa = 3.5 unidades
    const cameraDuration  = CAMERA_KEYFRAMES.length - 1  // 7 escenas × 1 unidad
    const totalDuration   = introDuration + cameraDuration

    const snapPoints = []

    // Punto 0: inicio absoluto
    snapPoints.push(0)
    // Punto tras Fase 2 (1/totalDuration)
    snapPoints.push(1 / totalDuration)
    // Punto tras Fase 3 (2/totalDuration)
    snapPoints.push(2 / totalDuration)
    // Punto tras Fase 4 + pausa (3.5/totalDuration)
    snapPoints.push(introDuration / totalDuration)
    // Puntos de cada escena cultural
    for (let i = 1; i < CAMERA_KEYFRAMES.length; i++) {
      snapPoints.push((introDuration + i) / totalDuration)
    }

    // ── 7. SCROLL TRIGGER ──────────────────────────────────────
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
      },

      // Cuando el scroll para, dejamos de pedir frames extras
      onScrubComplete: () => { isScrolling.current = false },
    })

    return () => {
      cancelAnimationFrame(initialFrameId)
      timelineRef.current?.kill()
      ScrollTrigger.getAll().forEach(st => st.kill())
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
