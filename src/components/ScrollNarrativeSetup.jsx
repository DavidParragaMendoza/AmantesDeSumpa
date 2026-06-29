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
import { useMuseoStore } from '../store/useMuseoStore'

// Registrar el plugin una sola// Altura del frustum ortográfico — debe coincidir con OrthoCamera.jsx
const FRUSTUM_HEIGHT = 10

// Activar para omitir las escenas iniciales (Intro y Las Vegas) durante el desarrollo para evitar scroll largo
const OMITIR_HASTA_LAS_VEGAS = false

// ──────────────────────────────────────────────────────────────
// HOOK: useScrollNarrative
// Se usa DENTRO de la escena R3F (requiere contexto de Three.js)
// ──────────────────────────────────────────────────────────────
export function useScrollNarrative() {
  const { camera, viewport, invalidate, size } = useThree()
  const timelineRef = useRef(null)
  const isScrolling = useRef(false)
  const isReturning = useRef(false)
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
   * isScrolling is true, formando un loop solo durante el scroll.
   */
  useFrame(() => {
    if (isScrolling.current) {
      invalidate() // Mantiene el loop vivo mientras hay scroll
    }
  })

  useEffect(() => {
    if (viewport.width === 0 || viewport.height === 0) return

    // ── 1. DURACIONES DE LA LÍNEA DE TIEMPO ───────────────────
    const introDuration = OMITIR_HASTA_LAS_VEGAS ? 0.0 : 8.0  // Fases de diálogo en el Museo
    const lasVegasDuration = OMITIR_HASTA_LAS_VEGAS ? 0.0 : 21.0 // Fases de diálogo en Las Vegas (21 scrolls extra, incluyendo transición)
    const valdiviaDuration = 12.0 // Fases de diálogo en Valdivia (12 scrolls extra)
    const chorreraDuration = 16.0 // Fases de diálogo en Chorrera (16 scrolls extra)
    const guangalaDuration = 11.0 // Fases de diálogo en Guangala (11 scrolls extra)
    const mantenoDuration = 20.0 // Fases de diálogo en Manteño (20 scrolls extra)
    const cameraDuration = CAMERA_KEYFRAMES.length - 1 - (OMITIR_HASTA_LAS_VEGAS ? 1 : 0)  // 7 escenas × 1 unidad
    const totalDuration = introDuration + lasVegasDuration + valdiviaDuration + chorreraDuration + guangalaDuration + mantenoDuration + cameraDuration

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
      signOpacity: OMITIR_HASTA_LAS_VEGAS ? 0 : 1,   // Letrero visible al inicio
      reiOpacity: 0,   // Rei oculto al inicio
      reiScale: 0,   // Rei sin escala al inicio (para pop-in)
      reiPositionX: 0,   // Rei en posición derecha inicial
      dialogueStep: 0,   // Sin diálogo al inicio
      reiLocalX: 0,
      reiLocalY: 0,
      reiIntroScale: 1,
    }
    gsapTarget.camera.x = OMITIR_HASTA_LAS_VEGAS ? -2 * SPACING : 0
    gsapTarget.camera.y = OMITIR_HASTA_LAS_VEGAS ? CAMERA_KEYFRAMES[2].y : 0
    gsapTarget.camera.zoom = OMITIR_HASTA_LAS_VEGAS ? CAMERA_KEYFRAMES[2].zoom : 1
    gsapTarget.scene.progress = OMITIR_HASTA_LAS_VEGAS ? 2 / (CAMERA_KEYFRAMES.length - 1) : 0
    gsapTarget.scene.escenaIndex = OMITIR_HASTA_LAS_VEGAS ? 2 : 0
    gsapTarget.scene.blend = 0
    gsapTarget.transition.intensity = 0  // Efecto warp inactivo al inicio
    gsapTarget.lasVegas = {
      reiOpacity: 0,
      reiScale: 0,
      dialogueStep: 0,
      amantesSumpaX: OMITIR_HASTA_LAS_VEGAS ? 0 : -1,
      huesoRojosX: OMITIR_HASTA_LAS_VEGAS ? 0 : -1,
      entierroMasivoX: OMITIR_HASTA_LAS_VEGAS ? 0 : -1,
      fondoTransicionX: OMITIR_HASTA_LAS_VEGAS ? 0 : -1,
      reiPositionX: xPosRei,
      maquinaScale: 0,
      maquinaOpacity: 0,
      reiMountedOpacity: 0,
      minigameCompleted: false,
    }
    gsapTarget.valdivia = {
      reiOpacity: 0,
      reiScale: 1,
      dialogueStep: 0,
      fondo2X: -1,
      rei4Opacity: 0,
      fondoTransicionX: -1,
      maquinaScale: 0,
      maquinaOpacity: 0,
      reiMaquinaOpacity: 0,
      reiMountedOpacity: 0,
      reiPositionX: xPosRei,
    }
    gsapTarget.chorrera = {
      reiOpacity: 0,
      reiScale: 1,
      dialogueStep: 0,
      rei1Opacity: 0,
      rei3Opacity: 0,
      rei7Opacity: 0,
      rei2Opacity: 0,
      fondoTransicionX: -1,
      maquinaScale: 0,
      maquinaOpacity: 0,
      reiMountedOpacity: 0,
      reiPositionX: xPosRei,
      reiMaquinaOpacity: 0,
    }
    gsapTarget.guangala = {
      reiOpacity: 0,
      reiScale: 1,
      dialogueStep: 0,
      rei1Opacity: 0,
      rei2Opacity: 0,
      fondoTransicionX: -1,
      maquinaScale: 0,
      maquinaOpacity: 0,
      reiMountedOpacity: 0,
      reiPositionX: xPosRei,
      reiMaquinaOpacity: 0,
    }
    gsapTarget.manteno = {
      reiOpacity: 0,
      reiScale: 1,
      dialogueStep: 0,
      rei1Opacity: 0,
      rei2Opacity: 0,
      rei4Opacity: 0,
      rei5Opacity: 0,
      fondo2X: -1,
      fondoTransicionX: -1,
      maquinaScale: 0,
      maquinaOpacity: 0,
      reiMountedOpacity: 0,
      reiPositionX: xPosRei,
      reiMaquinaOpacity: 0,
    }

    if (OMITIR_HASTA_LAS_VEGAS) {
      useMuseoStore.getState().setEscenaActual(2)
    } else {
      useMuseoStore.getState().setEscenaActual(0)
    }

    // ── 6. CONSTRUCCIÓN DE LA TIMELINE MAESTRA ─────────────────
    // paused: true → ScrollTrigger controla el progreso manualmente.
    timelineRef.current = gsap.timeline({ paused: true })

    // ====== INTRO (Fases 2 a 7) — cada fase dura 1 unidad de tiempo ======
    if (!OMITIR_HASTA_LAS_VEGAS) {
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
    }

    // ====== FASE 8+: VIAJE EN EL TIEMPO — la cámara se mueve en X ======
    // Iteramos sobre los CAMERA_KEYFRAMES (saltando el índice 0 = intro)
    CAMERA_KEYFRAMES.forEach((keyframe, index) => {
      if (index === 0) return // El índice 0 ya está representado por el estado inicial
      if (OMITIR_HASTA_LAS_VEGAS && index === 1) return // Omitimos Las Vegas

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

      // ── TIME WARP: ramp UP y DOWN (viaje entre escenas) ──────────
      // Si omitimos las primeras escenas y estamos en Valdivia (index === 2), no aplicamos vórtex inicial
      if (!(OMITIR_HASTA_LAS_VEGAS && index === 2)) {
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
      }

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

        // Scroll 18: El fondo de transición se desliza hacia adentro, pero Rei y la máquina siguen ocultos
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 18,
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

        // Scroll 19: Rei aparece de pie con su diálogo
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 19,
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

        // Scroll 20: La máquina del tiempo aparece (Rei sigue de pie y el diálogo puede mantenerse)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 20,
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

        // Scroll 21: Rei se sube a la máquina del tiempo (se muestra el sprite montado, se ocultan el Rei individual y la máquina sola)
        timelineRef.current.to(gsapTarget.lasVegas, {
          dialogueStep: 21,
          reiPositionX: 0, // Rei se desplaza al centro (donde está la máquina)
          reiOpacity: 0, // Ocultar globo de diálogo al montarse
          maquinaOpacity: 0, // Ocultar la máquina sola (el sprite montado incluye la máquina)
          reiMountedOpacity: 1, // Mostrar Rei montado
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })
      }

      if (index === 2) {
        if (!OMITIR_HASTA_LAS_VEGAS) {
          // Al viajar a Valdivia, desvanecemos a Rei montado de Las Vegas
          timelineRef.current.to(
            gsapTarget.lasVegas,
            {
              reiMountedOpacity: 0,
              duration: 0.5,
              onUpdate: () => invalidate(),
            },
            '<'
          )
        }

        // Scroll 1: Aparece Rei en la rama (suave fade-in)
        timelineRef.current.to(gsapTarget.valdivia, {
          reiOpacity: 1,
          dialogueStep: 1,
          duration: 1,
          ease: 'power2.out',
          onUpdate: () => invalidate(),
        })

        // Scroll 2: Primer diálogo de Valdivia
        timelineRef.current.to(gsapTarget.valdivia, {
          dialogueStep: 2,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 3: Segundo diálogo
        timelineRef.current.to(gsapTarget.valdivia, {
          dialogueStep: 3,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 4: Tercer diálogo
        timelineRef.current.to(gsapTarget.valdivia, {
          dialogueStep: 4,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 5: Cuarto diálogo (Real Alto / Chanduy)
        timelineRef.current.to(gsapTarget.valdivia, {
          dialogueStep: 5,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 6: Transición a FondoValdivida2.png (deslizamiento como en Las Vegas)
        timelineRef.current.to(gsapTarget.valdivia, {
          dialogueStep: 6,
          fondo2X: 0,
          reiOpacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 7: Aparece Rei4.webp con el primer diálogo del segundo fondo
        timelineRef.current.to(gsapTarget.valdivia, {
          dialogueStep: 7,
          rei4Opacity: 1,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 8: Segundo diálogo del segundo fondo
        timelineRef.current.to(gsapTarget.valdivia, {
          dialogueStep: 8,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 9: Se desliza el fondo de transición, ocultando a Rei4
        timelineRef.current.to(gsapTarget.valdivia, {
          dialogueStep: 9,
          fondoTransicionX: 0,
          rei4Opacity: 0,
          reiOpacity: 0,
          reiMaquinaOpacity: 0,
          maquinaScale: 0,
          maquinaOpacity: 0,
          reiMountedOpacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 10: Aparece Rei parado junto a la máquina con el diálogo
        timelineRef.current.to(gsapTarget.valdivia, {
          dialogueStep: 10,
          reiPositionX: -worldWidth * 0.2,
          reiOpacity: 0,
          reiMaquinaOpacity: 1,
          reiScale: 1,
          maquinaScale: 0,
          maquinaOpacity: 0,
          reiMountedOpacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 11: Aparece la máquina del tiempo
        timelineRef.current.to(gsapTarget.valdivia, {
          dialogueStep: 11,
          reiPositionX: -worldWidth * 0.2,
          reiOpacity: 0,
          reiMaquinaOpacity: 1,
          reiScale: 1,
          maquinaScale: 1,
          maquinaOpacity: 1,
          reiMountedOpacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 12: Rei se sube a la máquina del tiempo
        timelineRef.current.to(gsapTarget.valdivia, {
          dialogueStep: 12,
          reiPositionX: 0,
          reiOpacity: 0,
          reiMaquinaOpacity: 0,
          maquinaOpacity: 0,
          reiMountedOpacity: 1,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })
      }

      if (index === 3) {
        // Al viajar de Valdivia a Chorrera, desvanecemos todo lo de Valdivia (incluyendo máquina y montado)
        timelineRef.current.to(
          gsapTarget.valdivia,
          {
            reiOpacity: 0,
            rei4Opacity: 0,
            fondo2X: 0, // ← CRÍTICO: mantener en 0 (Valdivia) para que no tape a Chorrera (que está en X=-3)
            fondoTransicionX: 0, // ← CRÍTICO: mantener en 0 (Valdivia) para que no tape a Chorrera (que está en X=-3)
            reiMaquinaOpacity: 0,
            reiMountedOpacity: 0,
            maquinaOpacity: 0,
            duration: 0.5,
            onUpdate: () => invalidate(),
          },
          '<'
        )

        // Scroll 1: Aparece Rei a la derecha con el diálogo
        timelineRef.current.to(gsapTarget.chorrera, {
          reiOpacity: 1,
          rei1Opacity: 1,
          dialogueStep: 1,
          duration: 1,
          ease: 'power2.out',
          onUpdate: () => invalidate(),
        })

        // Scroll 2: Se mantiene visible con Diálogo 2
        timelineRef.current.to(gsapTarget.chorrera, {
          dialogueStep: 2,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 3: Se mantiene visible con Diálogo 3
        timelineRef.current.to(gsapTarget.chorrera, {
          dialogueStep: 3,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 4: Se mantiene visible con Diálogo 4
        timelineRef.current.to(gsapTarget.chorrera, {
          dialogueStep: 4,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 5: Cambia Rei a Rei3.webp (rei1Opacity -> 0, rei3Opacity -> 1)
        timelineRef.current.to(gsapTarget.chorrera, {
          dialogueStep: 5,
          rei1Opacity: 0,
          rei3Opacity: 1,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 6: Diálogo 6 (Es en La Libertad...)
        timelineRef.current.to(gsapTarget.chorrera, {
          dialogueStep: 6,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 7: Cambia Rei a Rei7.webp (rei3Opacity -> 0, rei7Opacity -> 1)
        timelineRef.current.to(gsapTarget.chorrera, {
          dialogueStep: 7,
          rei3Opacity: 0,
          rei7Opacity: 1,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 8: Diálogo 8 (¿Sabías que ellos...)
        timelineRef.current.to(gsapTarget.chorrera, {
          dialogueStep: 8,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 9: Cambia Rei a Rei2.webp (rei7Opacity -> 0, rei2Opacity -> 1)
        timelineRef.current.to(gsapTarget.chorrera, {
          dialogueStep: 9,
          rei7Opacity: 0,
          rei2Opacity: 1,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 10: Diálogo 10 (Una albarrada es...)
        timelineRef.current.to(gsapTarget.chorrera, {
          dialogueStep: 10,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 11: Cambia Rei a Rei.webp (rei2Opacity -> 0, rei1Opacity -> 1)
        timelineRef.current.to(gsapTarget.chorrera, {
          dialogueStep: 11,
          rei2Opacity: 0,
          rei1Opacity: 1,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 12: Diálogo 12 (Los cultivos de su...)
        timelineRef.current.to(gsapTarget.chorrera, {
          dialogueStep: 12,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 13: Se desliza el fondo de transición, ocultando a Rei normal
        timelineRef.current.to(gsapTarget.chorrera, {
          dialogueStep: 13,
          fondoTransicionX: 0,
          reiOpacity: 0,
          rei1Opacity: 0,
          reiMaquinaOpacity: 0,
          maquinaScale: 0,
          maquinaOpacity: 0,
          reiMountedOpacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 14: Aparece Rei parado junto a la máquina con el diálogo
        timelineRef.current.to(gsapTarget.chorrera, {
          dialogueStep: 14,
          reiPositionX: -worldWidth * 0.2,
          reiOpacity: 0,
          reiMaquinaOpacity: 1,
          reiScale: 1,
          maquinaScale: 0,
          maquinaOpacity: 0,
          reiMountedOpacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 15: Aparece la máquina del tiempo
        timelineRef.current.to(gsapTarget.chorrera, {
          dialogueStep: 15,
          reiPositionX: -worldWidth * 0.2,
          reiOpacity: 0,
          reiMaquinaOpacity: 1,
          reiScale: 1,
          maquinaScale: 1,
          maquinaOpacity: 1,
          reiMountedOpacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 16: Rei se sube a la máquina del tiempo
        timelineRef.current.to(gsapTarget.chorrera, {
          dialogueStep: 16,
          reiPositionX: 0,
          reiOpacity: 0,
          reiMaquinaOpacity: 0,
          maquinaOpacity: 0,
          reiMountedOpacity: 1,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })
      }

      if (index === 4) {
        // Al viajar de Chorrera a Guangala, desvanecemos a Rei de Chorrera
        timelineRef.current.to(
          gsapTarget.chorrera,
          {
            reiOpacity: 0,
            rei3Opacity: 0,
            rei7Opacity: 0,
            rei2Opacity: 0,
            rei1Opacity: 0,
            fondoTransicionX: 0, // ← CRÍTICO: mantener en 0 para no tapar a Guangala
            reiMaquinaOpacity: 0,
            reiMountedOpacity: 0,
            maquinaOpacity: 0,
            duration: 0.5,
            onUpdate: () => invalidate(),
          },
          '<'
        )

        // ── NARRATIVA GUANGALA ──────────────────────────────────────
        // Scroll 1: Aparece Rei en el 1er scroll a la izquierda
        timelineRef.current.to(gsapTarget.guangala, {
          reiOpacity: 1,
          rei2Opacity: 1,
          rei1Opacity: 0,
          dialogueStep: 1,
          duration: 1,
          ease: 'power2.out',
          onUpdate: () => invalidate(),
        })

        // Scroll 2: Texto 2
        timelineRef.current.to(gsapTarget.guangala, {
          dialogueStep: 2,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 3: Texto 3
        timelineRef.current.to(gsapTarget.guangala, {
          dialogueStep: 3,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 4: Cambia sprite a Rei.webp
        timelineRef.current.to(gsapTarget.guangala, {
          dialogueStep: 4,
          rei2Opacity: 0,
          rei1Opacity: 1,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 5: Texto 5
        timelineRef.current.to(gsapTarget.guangala, {
          dialogueStep: 5,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 6: Texto 6
        timelineRef.current.to(gsapTarget.guangala, {
          dialogueStep: 6,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 7: Texto 7
        timelineRef.current.to(gsapTarget.guangala, {
          dialogueStep: 7,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 8: Desliza el fondo de transición, ocultando a Rei normal
        timelineRef.current.to(gsapTarget.guangala, {
          dialogueStep: 8,
          fondoTransicionX: 0,
          reiOpacity: 0,
          rei1Opacity: 0,
          rei2Opacity: 0,
          reiMaquinaOpacity: 0,
          maquinaScale: 0,
          maquinaOpacity: 0,
          reiMountedOpacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 9: Aparece Rei parado junto a la máquina con el diálogo
        timelineRef.current.to(gsapTarget.guangala, {
          dialogueStep: 9,
          reiPositionX: -worldWidth * 0.25,
          reiOpacity: 0,
          reiMaquinaOpacity: 1,
          reiScale: 1,
          maquinaScale: 0,
          maquinaOpacity: 0,
          reiMountedOpacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 10: Aparece la máquina del tiempo
        timelineRef.current.to(gsapTarget.guangala, {
          dialogueStep: 10,
          reiPositionX: -worldWidth * 0.25,
          reiOpacity: 0,
          reiMaquinaOpacity: 1,
          reiScale: 1,
          maquinaScale: 1,
          maquinaOpacity: 1,
          reiMountedOpacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 11: Rei se sube a la máquina del tiempo
        timelineRef.current.to(gsapTarget.guangala, {
          dialogueStep: 11,
          reiPositionX: 0,
          reiOpacity: 0,
          reiMaquinaOpacity: 0,
          maquinaOpacity: 0,
          reiMountedOpacity: 1,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })
      }

      if (index === 5) {
        // Al viajar de Guangala a Manteño, desvanecemos todo lo de Guangala
        timelineRef.current.to(
          gsapTarget.guangala,
          {
            reiOpacity: 0,
            rei2Opacity: 0,
            rei1Opacity: 0,
            fondoTransicionX: 0, // ← CRÍTICO: mantener en 0 para no tapar a Manteño (que está en X = -5)
            reiMaquinaOpacity: 0,
            reiMountedOpacity: 0,
            maquinaOpacity: 0,
            duration: 0.5,
            onUpdate: () => invalidate(),
          },
          '<'
        )

        // ── NARRATIVA MANTEÑO-GUANCAVILCAS ──────────────────────────
        // Scroll 1: Aparece Rei2.webp a la izquierda de la pantalla
        timelineRef.current.to(gsapTarget.manteno, {
          reiOpacity: 1,
          rei2Opacity: 1,
          rei4Opacity: 0,
          rei1Opacity: 0,
          rei5Opacity: 0,
          dialogueStep: 1,
          duration: 1,
          ease: 'power2.out',
          onUpdate: () => invalidate(),
        })

        // Scroll 2: Los Manteño Guancavilcas
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 2,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 3: construyen grandes centros urbanos, separados del sector agrícola.
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 3,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 4: cambiamos a rei con el scroll 4: Rei4.webp
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 4,
          rei2Opacity: 0,
          rei4Opacity: 1,
          rei1Opacity: 0,
          rei5Opacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 5: Manejan una economía mixta...
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 5,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 6: Continúa la división urbano-rural...
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 6,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 7: Esta sociedad también desarrolla la agricultura...
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 7,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 8: Perfeccionan el sistema de navegación marítima...
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 8,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 9: El principal artículo de intercambio es la concha spondylus, muy codiciada en todas partes.
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 9,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 10: se cambia de fondo a: FondosSeñoríosManteño.webp
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 10,
          fondo2X: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 11: se cambia a rei (Rei.webp)
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 11,
          rei2Opacity: 0,
          rei4Opacity: 0,
          rei1Opacity: 1,
          rei5Opacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 12: Realizan escultura en piedra y madera
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 12,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 13: Su escultura en piedra más destacada
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 13,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 14: En madera realizan los postes tallados...
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 14,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 15: Como ejemplo tenemos dos de los postes...
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 15,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 16: Uno es el poste menor...
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 16,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 17: va a aparecer: fondoTransicion.webp y Rei5.webp diciendo que esto ha sido todo y dando las gracias
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 17,
          fondoTransicionX: 0,
          reiOpacity: 0,
          rei1Opacity: 0,
          rei2Opacity: 0,
          rei4Opacity: 0,
          rei5Opacity: 1,
          reiMaquinaOpacity: 1,
          maquinaScale: 0,
          maquinaOpacity: 0,
          reiMountedOpacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 18: Se sube a su máquina del tiempo (aparece la máquina del tiempo)
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 18,
          reiPositionX: -worldWidth * 0.25,
          maquinaScale: 1,
          maquinaOpacity: 1,
          reiMaquinaOpacity: 1,
          reiMountedOpacity: 0,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 19: Dice "¡Vamos de regreso a casa!" y se monta en la máquina
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 19,
          reiPositionX: 0,
          maquinaOpacity: 0,
          reiMaquinaOpacity: 0,
          reiMountedOpacity: 1,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })

        // Scroll 20: Pausa/espera para que el usuario pueda leer
        timelineRef.current.to(gsapTarget.manteno, {
          dialogueStep: 20,
          reiPositionX: 0,
          maquinaOpacity: 0,
          reiMaquinaOpacity: 0,
          reiMountedOpacity: 1,
          duration: 1,
          ease: 'power2.inOut',
          onUpdate: () => invalidate(),
        })
      }
    })


    // ── 7. PUNTOS DE SNAP ───────────────────────────────────────
    const snapPoints = []

    if (!OMITIR_HASTA_LAS_VEGAS) {
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
    } else {
      // Punto 0: inicio absoluto en Valdivia
      snapPoints.push(0)
    }

    // Puntos de cada escena cultural
    let currentDurationAccum = OMITIR_HASTA_LAS_VEGAS ? 0 : introDuration;
    for (let i = 1; i < CAMERA_KEYFRAMES.length; i++) {
      if (OMITIR_HASTA_LAS_VEGAS && i === 1) continue;

      currentDurationAccum += 1; // Viaje de cámara de 1 unidad
      snapPoints.push(currentDurationAccum / totalDuration)

      if (i === 1) {
        // 22 puntos de snap adicionales en Las Vegas (incluyendo transición)
        for (let j = 1; j <= 22; j++) {
          currentDurationAccum += 1;
          snapPoints.push(currentDurationAccum / totalDuration)
        }
      }

      if (i === 2) {
        // 12 puntos de snap adicionales en Valdivia
        for (let j = 1; j <= 12; j++) {
          currentDurationAccum += 1;
          snapPoints.push(currentDurationAccum / totalDuration)
        }
      }

      if (i === 3) {
        // 2 puntos de snap adicionales en Chorrera
        for (let j = 1; j <= chorreraDuration; j++) {
          currentDurationAccum += 1;
          snapPoints.push(currentDurationAccum / totalDuration)
        }
      }

      if (i === 4) {
        // 11 puntos de snap adicionales en Guangala
        for (let j = 1; j <= guangalaDuration; j++) {
          currentDurationAccum += 1;
          snapPoints.push(currentDurationAccum / totalDuration)
        }
      }

      if (i === 5) {
        // 19 puntos de snap adicionales en Manteño
        for (let j = 1; j <= mantenoDuration; j++) {
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
      scrub: 0.4,          // Retardo de seguimiento reducido para que se sienta mucho más rápido y responsivo
      animation: timelineRef.current,
      snap: {
        snapTo: snapPoints,
        duration: { min: 0.15, max: 0.55 }, // Transiciones de snapping más rápidas para evitar lentitud
        delay: 0.3,          // Evita interrupción durante el scroll activo
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

        // Si llegamos al final del scroll de Manteño (progress >= 0.999), disparamos el regreso a casa
        if (self.progress >= 0.999 && !isReturning.current) {
          isReturning.current = true
          isScrolling.current = false

          // 1. Activar vórtex
          gsap.to(gsapTarget.transition, {
            intensity: 1,
            duration: 0.8,
            ease: 'power2.in',
            onUpdate: () => invalidate(),
            onComplete: () => {
              // 2. Animar scroll nativo a 0
              const scrollObj = { y: window.scrollY }
              gsap.to(scrollObj, {
                y: 0,
                duration: 5.0,
                ease: 'power2.inOut',
                onUpdate: () => {
                  window.scrollTo(0, scrollObj.y)
                  gsapTarget.transition.intensity = 1 // forzar vortex durante viaje de retorno
                  invalidate()
                },
                onComplete: () => {
                  // 3. Desvanecer vórtex al llegar a la intro
                  gsap.to(gsapTarget.transition, {
                    intensity: 0,
                    duration: 1.2,
                    ease: 'power2.out',
                    onUpdate: () => invalidate(),
                    onComplete: () => {
                      isReturning.current = false
                    }
                  })
                }
              })
            }
          })
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
