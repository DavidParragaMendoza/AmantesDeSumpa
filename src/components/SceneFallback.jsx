/**
 * SCENE FALLBACK — Indicador de carga para texturas
 * Módulo 2: Fallback visual durante el Suspense
 *
 * Este componente se renderiza DENTRO del Canvas de R3F
 * mientras React Suspense está esperando que carguen las texturas.
 *
 * A diferencia de un spinner HTML, este existe en el mundo 3D:
 * es un mesh que pulsa suavemente para indicar actividad.
 * Así el canvas nunca queda en negro mientras carga.
 *
 * CUÁNDO SE MUESTRA:
 *   <Suspense fallback={<SceneFallback />}>
 *     <TexturedPlane url="..." />   ← suspende aquí
 *   </Suspense>
 *   → mientras el PNG carga → SceneFallback visible
 *   → cuando termina → SceneFallback se desmonta, TexturedPlane aparece
 */

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export function SceneFallback() {
  const meshRef = useRef()

  // Pulso sutil en la opacidad usando el tiempo del reloj de Three.js
  useFrame(({ clock }) => {
    if (!meshRef.current) return
    // Oscila entre 0.15 y 0.45 de opacidad — sutil, no distractor
    meshRef.current.material.opacity =
      0.3 + Math.sin(clock.getElapsedTime() * 2) * 0.15
  })

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      {/* Un plano grande que cubre toda la vista mientras carga */}
      <planeGeometry args={[20, 12]} />
      <meshBasicMaterial
        color="#1a1a2e"
        transparent={true}
        opacity={0.3}
        depthWrite={false}
      />
    </mesh>
  )
}
