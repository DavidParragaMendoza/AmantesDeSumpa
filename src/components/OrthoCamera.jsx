/**
 * CÁMARA ORTOGRÁFICA — OrthoCamera
 * Módulo 1: Setup y animación de la cámara principal
 *
 * PRINCIPIO FUNDAMENTAL:
 * La cámara ortográfica proyecta objetos sin perspectiva.
 * Independientemente de la distancia, los objetos mantienen
 * su tamaño aparente → efecto de "dibujo plano / diorama".
 *
 * CÓMO FUNCIONA EL ASPECT RATIO:
 * Para una cámara ortográfica definimos los planos de recorte
 * (left, right, top, bottom) en función del aspecto de la pantalla.
 * Si usamos un "frustum size" fijo (ej: 10 unidades de alto),
 * el ancho se calcula como: frustumSize * (width / height)
 * Esto garantiza que las ilustraciones NUNCA se deformen.
 *
 * CÓMO FUNCIONA LA ANIMACIÓN:
 * useFrame() es el RAF de Three.js. Lo usamos para leer gsapTarget
 * y aplicar los valores a la cámara. Lerp suaviza microvibraciones.
 */

import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { gsapTarget } from '../animation/gsapTarget'

// ──────────────────────────────────────────────────────────────
// CONSTANTES DE CÁMARA
// ──────────────────────────────────────────────────────────────

/**
 * Unidades de mundo Three.js visibles verticalmente.
 * Todas las ilustraciones se diseñan en base a esta escala:
 * - Un plano de fondo medirá ~FRUSTUM_HEIGHT unidades de alto
 * - Un personaje medirá ~2-3 unidades de alto
 */
const FRUSTUM_HEIGHT = 10

/**
 * Factor de lerp para la cámara.
 * 1.0 = instantáneo, 0.05 = muy lento.
 * 0.08 da un lag cinematográfico sutil.
 */
const CAMERA_LERP_FACTOR = 0.08

/**
 * Posición Z de la cámara ortográfica.
 * Debe estar suficientemente "enfrente" de todas las capas del diorama.
 * El diorama usará capas Z de -2 a +2, así que la cámara va en Z=10.
 */
const CAMERA_Z = 10

// ──────────────────────────────────────────────────────────────
// COMPONENTE: OrthoCamera
// Se monta DENTRO de <Canvas> como cualquier objeto de Three.js
// ──────────────────────────────────────────────────────────────
export function OrthoCamera() {
  const { camera, size, gl, invalidate } = useThree()
  const isInitialized = useRef(false)

  // ── 1. CONFIGURACIÓN INICIAL Y RESIZE ──────────────────────
  useEffect(() => {
    const updateCamera = () => {
      if (size.width === 0 || size.height === 0) return

      const aspect = size.width / size.height
      const halfH  = FRUSTUM_HEIGHT / 2
      const halfW  = halfH * aspect

      // Planos de recorte ortográficos
      camera.left   = -halfW
      camera.right  =  halfW
      camera.top    =  halfH
      camera.bottom = -halfH

      // Planos near/far: seguros y positivos
      camera.near   = 0.1
      camera.far    = 100

      // Posición inicial
      if (!isInitialized.current) {
        camera.position.set(
          gsapTarget.camera.x,
          gsapTarget.camera.y,
          CAMERA_Z
        )
        camera.zoom = gsapTarget.camera.zoom
        isInitialized.current = true
      }

      // CRITICAL: actualizar la matriz de proyección
      camera.updateProjectionMatrix()

      // Informar al renderer del nuevo tamaño del viewport
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Limitar DPR a 2 (rendimiento)
    }

    updateCamera()
  }, [camera, size, gl]) // Se re-ejecuta en resize (size cambia en R3F)


  // ── 2. ANIMACIÓN POR FRAME (LECTURA DE gsapTarget) ─────────
  useFrame(() => {
    /**
     * PATRÓN DUMMY TARGET EN ACCIÓN:
     * GSAP ya actualizó gsapTarget.camera.{x, y, zoom}
     * Aquí simplemente leemos esos valores y los aplicamos
     * a la cámara real de Three.js con un lerp suave.
     *
     * Lerp (interpolación lineal):
     *   camera.position.x += (target.x - camera.position.x) * factor
     * Equivale a: mover el % del camino restante cada frame.
     * Crea desaceleración natural (ease-out "físico").
     */

    // Calcular deltas antes de aplicar el lerp
    const dx = gsapTarget.camera.x - camera.position.x
    const dy = gsapTarget.camera.y - camera.position.y
    const dz = gsapTarget.camera.zoom - camera.zoom

    // Lerp de posición X (paneo horizontal a través del tiempo)
    camera.position.x += dx * CAMERA_LERP_FACTOR

    // Lerp de posición Y (pequeños paneos verticales por escena)
    camera.position.y += dy * CAMERA_LERP_FACTOR

    // Lerp de zoom ortográfico (acercarse a detalles importantes)
    camera.zoom += dz * CAMERA_LERP_FACTOR

    // CRITICAL: actualizar proyección después de cambiar zoom
    camera.updateProjectionMatrix()

    // Con frameloop="demand", necesitamos pedir frames adicionales
    // mientras el lerp no haya convergido. Sin esto, la cámara se
    // mueve 1 paso y se congela hasta el siguiente scroll.
    const EPSILON = 0.001
    if (Math.abs(dx) > EPSILON || Math.abs(dy) > EPSILON || Math.abs(dz) > EPSILON) {
      invalidate()
    }
  })

  // Este componente no renderiza nada visible en la escena
  return null
}
