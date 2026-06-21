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
  const timelineRef = useRef(null)
  const isScrolling = useRef(false)
  const setEscenaActual = useMuseoStore(s => s.setEscenaActual)
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
    const introDuration = 8.0  // Fases de diálogo en el Museo
    const lasVegasDuration = 22.0 // Fases de diálogo en Las Vegas (22 scrolls extra, incluyendo transición)
    const cameraDuration = CAMERA_KEYFRAMES.length - 1  // 7 escenas × 1 unidad
    const totalDuration = introDuration + lasVegasDuration + cameraDuration

    // ── 2. CONFIGURAR EL SPACER DE SCROLL ─────────────────────
    // VH_POR_ESCENA: cuántos vh de scroll consume cada parada narrativa.
    const VH_POR_ESCENA = 100
    const scrollSpacerEl = document.getElementById('scroll-spacer')
    if (scrollSpacerEl) {
      scrollSpacerEl.style.height = `${VH_POR_ESCENA * totalDuration}vh`
    }

    // ── 3. PRIMER FRAME — forzar renderizado inicial ────────────
    invalidate()
    const initialFrameId = requestAnimationFrame(() => invalidate())

    // ── 4. CÁLCULO DE ESPACIADO ─────────────────────────────────
    // Misma fórmula que DioramaScene y OrthoCamera para coherencia absoluta
    const worldWidth = (size.width / size.height) * FRUSTUM_HEIGHT
    const SPACING = worldWidth
    const xPosRei = -worldWidth * 0.35

    // ── 5. RESET DEL DUMMY TARGET ─────────────────────────────
    // Evita que HMR deje valores residuales de sesiones anteriores
    gsapTarget.intro = {
      signOpacity: 1,   // Letrero visible al inicio
      reiOpacity: 0,   // Rei oculto al inicio
      reiScale: 0,   // Rei sin escala al inicio (para pop-in)
      reiPositionX: 0,   // Rei en posición derecha inicial
      dialogueStep: 0,   // Sin diálogo al inicio
      reiLocalX: 0,
      reiLocalY: 0,
      reiIntroScale: 1,
    }
    gsapTarget.camera.x = 0
    gsapTarget.camera.y = 0
    gsapTarget.camera.zoom = 1
    gsapTarget.scene.progress = 0
    gsapTarget.scene.escenaIndex = 0
    gsapTarget.scene.blend = 0
    gsapTarget.transition.intensity = 0  // Efecto warp inactivo al inicio
    gsapTarget.lasVegas = {
      reiOpacity: 0,
      reiScale: 0,
      dialogueStep: 0,
      amantesSumpaX: -1,
      huesoRojosX: -1,
      entierroMasivoX: -1,
      fondoTransicionX: -1,
      reiPositionX: xPosRei,
      maquinaScale: 0,
      maquinaOpacity: 0,
      reiMountedOpacity: 0,
      minigameCompleted: false,
    }

    // ── 6. CONSTRUCCIÓN DE LA TIMELINE MAESTRA ─────────────────
    // paused: true → ScrollTrigger controla el progreso manualmente.
    timelineRef.current = gsap.timeline({ paused: true })

    // ====== INTRO (Fases 2 a 7) — cada fase dura 1 unidad de tiempo ======

    /**
     * FASE 2 (Texto 1 — Rei1.png):
     * Letrero hace fade-out, Rei1 hace pop-in y se desplaza hacia la izquierda.
     */
    timelineRef.current.to(gsapTarget.intro, {
      signOpacity: 0,
      reiScale: 1,
      reiOpacity: 1,
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
     * FASE 6 (Paso de diálogo 4 a 5):
     * Rei5 en el centro del museo. Diálogo 5: "¿Ves que Rei tiene en sus manos globos..."
     */
    timelineRef.current.to(gsapTarget.intro, {
      reiPositionX: -worldWidth * 0.2,
      reiLocalX: 0,
      reiLocalY: 0,
      dialogueStep: 5,
      duration: 1,
      ease: 'power2.inOut',
      onUpdate: () => invalidate(),
    })

    /**
     * FASE 7 (Paso de diálogo 5 a 6):
     * Rei5 en el centro del museo. Diálogo 6: "Hoy quiero llevarte a un viaje maravilloso..."
     */
    timelineRef.current.to(gsapTarget.intro, {
      reiPositionX: -worldWidth * 0.2,
      reiLocalX: 0,
      reiLocalY: 0,
      dialogueStep: 6,
      duration: 1,
      ease: 'power2.inOut',
      onUpdate: () => invalidate(),
    })

    /**
     * FASE 8 (Caminata al Estacionamiento, diálogo 6 a 7):
     * La cámara se desplaza al estacionamiento contiguo en X = worldWidth.
     * Rei se desplaza y al llegar cambia al sprite montado (Rei6.png) al cruzar 6.5.
     * Diálogo 7: "¡Vamos, súbete a mi máquina del tiempo!..."
     */
    timelineRef.current.to(gsapTarget.camera, {
      x: worldWidth,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => invalidate(),
    })
    timelineRef.current.to(gsapTarget.intro, {
      reiPositionX: worldWidth * 0.8,
      reiLocalX: 0,
      reiLocalY: 0,
      dialogueStep: 7,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => invalidate(),
    }, '<')

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
          x: -index * SPACING, // Cada escena está separada por worldWidth
          y: keyframe.y,
          zoom: keyframe.zoom,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        }
      )

      // Si es la primera transición (viaje de intro a Las Vegas), desvanecemos el diálogo de la intro
      if (index === 1) {
        timelineRef.current.to(
          gsapTarget.intro,
          {
            reiOpacity: 0,
            duration: 0.3,
            onUpdate: () => invalidate(),
          },
          '<'
        )
      }

      // ── Tween simultáneo del estado de escena (para el HUD y el store) ──
      // '<' significa "en paralelo con el tween anterior"
      const targetProgress = index / (CAMERA_KEYFRAMES.length - 1)
      timelineRef.current.to(
        gsapTarget.scene,
        {
          progress: targetProgress,
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
          duration: 0.5,
          ease: 'power2.in',
          onUpdate: () => invalidate(),
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
          duration: 0.5,
          ease: 'power2.out',
          onUpdate: () => invalidate(),
        },
        '<+0.5'  // comienza 0.5 unidades después del inicio del ramp-up
      )

      // ── NARRATIVA LAS VEGAS ──────────────────────────────────────
      if (index === 1) {
        // Scroll 1: Aparece Rei en la piedra (sin globo de diálogo)
        timelineRef.current.to(gsapTarget.lasVegas, {
          reiScale: 1,
          reiOpacity: 0,
          dialogueStep: 1,
          reiPositionX: xPosRei,
          duration: 1,
          ease: 'power2.out',
          onUpdate: () => invalidate(),
        })

        // Scroll 2: Aparece globo "¡Al fin hemos llegado!..."
        timelineRef.current.to(gsapTarget.lasVegas, {
          reiOpacity: 1,
          dialogueStep: 2,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 3: Texto "Mira, ahí están los primeros..."
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 3,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 4: Horticultura (Rei3)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 4,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 5: OGSE-80 (Rei4)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 5,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 6: Cazadora recolectora (Rei3)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 6,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 7: Manglares (Rei)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 7,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 8: 200 osamentas (Rei2)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 8,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 9: Amantes de Sumpa (Desaparece Rei, animación fondo)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 9,
          reiOpacity: 0,
          reiScale: 0,
          amantesSumpaX: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 10: Rei reaparece (Texto 8: ¿Conoces a los Amantes...)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 10,
          reiOpacity: 1,
          reiScale: 1,
          duration: 1,
          ease: 'power2.out',
          onUpdate: () => invalidate(),
        })

        // Scroll 11: Texto 9 (Doble primario...)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 11,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 12: Texto 10 (El hombre con su mano derecha...)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 12,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 13: Huesos Rojos (Desaparece Rei, animación fondo)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 13,
          reiOpacity: 0,
          reiScale: 0,
          huesoRojosX: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 14: Rei reaparece (Texto 11: ENTIERRO SECUNDARIO parte 1)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 14,
          reiOpacity: 1,
          reiScale: 1,
          duration: 1,
          ease: 'power2.out',
          onUpdate: () => invalidate(),
        })

        // Scroll 15: Texto 12 (ENTIERRO SECUNDARIO parte 2)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 15,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 16: Entierro Masivo (Desaparece Rei, animación fondo)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 16,
          reiOpacity: 0,
          reiScale: 0,
          entierroMasivoX: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 17: Rei reaparece (Texto 13: ENTIERRO MÚLTIPLE O MASIVO)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 17,
          reiOpacity: 1,
          reiScale: 1,
          duration: 1,
          ease: 'power2.out',
          onUpdate: () => invalidate(),
        })

        // Scroll 18: Minijuego Salamanquesas (Texto 14: Ayudame a encontrar...)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 18,
          maquinaScale: 0,
          maquinaOpacity: 0,
          reiMountedOpacity: 0,
          reiOpacity: 1,
          reiScale: 1,
          reiPositionX: xPosRei,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 19: El fondo de transición se desliza hacia adentro, pero Rei y la máquina siguen ocultos
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 19,
          fondoTransicionX: 0,
          reiOpacity: 0,
          reiScale: 0,
          maquinaScale: 0,
          maquinaOpacity: 0,
          reiMountedOpacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 20: Rei aparece de pie con su diálogo
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 20,
          reiPositionX: -worldWidth * 0.2, // Rei a la izquierda de la máquina
          reiOpacity: 1,
          reiScale: 1,
          maquinaScale: 0,
          maquinaOpacity: 0,
          reiMountedOpacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 21: La máquina del tiempo aparece (Rei sigue de pie y el diálogo puede mantenerse)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 21,
          reiPositionX: -worldWidth * 0.2, // Rei a la izquierda de la máquina
          reiOpacity: 1,
          reiScale: 1,
          maquinaScale: 1,
          maquinaOpacity: 1,
          reiMountedOpacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 22: Rei se sube a la máquina del tiempo (se muestra el sprite montado, se ocultan el Rei individual y la máquina sola)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 22,
          reiPositionX: 0, // Rei se desplaza al centro (donde está la máquina)
          reiOpacity: 0, // Ocultar globo de diálogo al montarse
          maquinaOpacity: 0, // Ocultar la máquina sola (el sprite montado incluye la máquina)
          reiMountedOpacity: 1, // Mostrar Rei montado
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })
      }
    })

    // ── LÓGICA DE BLOQUEO DE SCROLL (MINIJUEGO) ─────────────────
    // Bloquear exactamente al final del último tween de Las Vegas (cuando la cámara llegó a i=1 y ya pasaron todos sus dialogos extra)
    const maxProgressLasVegas = (introDuration + 1 + 18) / totalDuration

    const handleScroll = () => {
      const st = ScrollTrigger.getAll()[0]
      if (!st) return

      // Si el minijuego no se ha completado y tratamos de pasar del paso 18
      if (!gsapTarget.lasVegas.minigameCompleted && st.progress > maxProgressLasVegas) {
        const maxScroll = st.start + (st.end - st.start) * maxProgressLasVegas
        if (window.scrollY > maxScroll) {
          window.scrollTo(0, maxScroll)
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: false })

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
    // Punto tras Fase 7 (Texto 6 en el museo)
    snapPoints.push(6.0 / totalDuration)
    // Punto tras Fase 8 (Texto 7 en el estacionamiento)
    snapPoints.push(7.5 / totalDuration)
    // Punto tras Pausa antes del viaje
    snapPoints.push(introDuration / totalDuration)

    // Puntos de cada escena cultural
    let currentDurationAccum = introDuration;
    for (let i = 1; i < CAMERA_KEYFRAMES.length; i++) {
      currentDurationAccum += 1; // Viaje de cámara de 1 unidad
      snapPoints.push(currentDurationAccum / totalDuration)

      if (i === 1) {
        // 22 puntos de snap adicionales en Las Vegas (incluyendo transición)
        for (let j = 1; j <= 22; j++) {
          currentDurationAccum += 1;
          snapPoints.push(currentDurationAccum / totalDuration)
        }
      }
    }

    // ── 8. SCROLL TRIGGER ──────────────────────────────────────
    ScrollTrigger.create({
      trigger: '#scroll-spacer',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.8,          // Retardo de seguimiento ajustado para ser más responsivo
      animation: timelineRef.current,
      snap: {
        snapTo: snapPoints,
        duration: { min: 0.25, max: 0.85 }, // Duración equilibrada para transiciones de snapping
        delay: 0.3,          // Delay aumentado a 0.3s para evitar interrupción durante el scroll activo
        ease: 'power2.out', // Desaceleración suave al encajar
      },
      onUpdate: (self) => {
        // CRÍTICO: invalidate() en CADA tick de scroll con frameloop="demand"
        invalidate()
        isScrolling.current = true

        // Actualizar el escenaIndex redondeado para el HUD
        const currentEscenaIndex = Math.round(gsapTarget.scene.escenaIndex)
        gsapTarget.scene.blend = gsapTarget.scene.escenaIndex % 1

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
      window.removeEventListener('scroll', handleScroll)
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
