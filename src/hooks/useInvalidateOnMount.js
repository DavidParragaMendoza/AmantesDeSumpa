/**
 * useInvalidateOnMount — Fuerza un frame al montar post-Suspense
 *
 * CONTEXTO:
 * Con frameloop="demand", R3F solo renderiza cuando algo llama a
 * invalidate(). Cuando Suspense resuelve y re-monta un componente
 * con texturas, necesitamos forzar un frame para que el contenido
 * nuevo sea visible.
 *
 * ¿POR QUÉ requestAnimationFrame?
 * El useEffect de React se ejecuta después del commit al DOM,
 * pero Three.js tiene su propio batch de actualizaciones al
 * scene graph. El rAF asegura que el mesh ya está en el scene
 * graph de Three.js cuando R3F renderice el frame solicitado.
 *
 * USAR EN: cualquier componente que salga de un boundary <Suspense>.
 */

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

export function useInvalidateOnMount() {
  const { invalidate } = useThree()

  useEffect(() => {
    // requestAnimationFrame garantiza que Three.js ya procesó
    // el montaje del componente en su scene graph.
    // Sin este RAF, el invalidate() puede llegar antes de que
    // el mesh esté realmente en la escena.
    const frameId = requestAnimationFrame(() => {
      invalidate()
    })
    return () => cancelAnimationFrame(frameId)
  }, [invalidate])
}
