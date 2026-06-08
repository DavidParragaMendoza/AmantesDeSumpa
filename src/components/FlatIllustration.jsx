/**
 * FLAT ILLUSTRATION — Componente atómico del diorama 2.5D
 * Módulo 2: Geometría Plana y Materiales
 *
 * Es la unidad fundamental de toda la escena: un rectángulo plano
 * (PlaneGeometry) con una textura PNG pintada encima (MeshBasicMaterial).
 * Con cámara ortográfica, esta técnica produce una ilusión de profundidad
 * perfecta cuando apilamos múltiples capas en el eje Z.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  MODO TEXTURA (url prop presente)                           │
 * │  useTexture carga el PNG → se calcula aspect ratio nativo   │
 * │  → scale = [aspecto × targetHeight, targetHeight, 1]        │
 * ├─────────────────────────────────────────────────────────────┤
 * │  MODO GREYBOX (sin url o url falla)                         │
 * │  Renderiza color sólido con placeholderAspect × targetHeight│
 * └─────────────────────────────────────────────────────────────┘
 *
 * JERARQUÍA DE SUSPENSE:
 *   useTexture() SUSPENDE el componente si la textura no está lista.
 *   React Suspense captura esa suspensión y muestra el fallback.
 *   Por eso FlatIllustration NUNCA debe usarse sin un <Suspense> padre.
 *
 * ⚠️  IMPORTANTE — Dos sub-componentes:
 *   <TexturedPlane>  → se monta solo cuando hay url (usa useTexture)
 *   <ColorPlane>     → fallback puro de color, nunca suspende
 *   <FlatIllustration> → decide cuál de los dos renderizar
 */

import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useInvalidateOnMount } from '../hooks/useInvalidateOnMount'

// ─────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────

/**
 * Aspecto genérico para placeholders de color.
 * Simula un formato panorámico (aprox. 16:9).
 * Cámbialo según la proporción real de tus ilustraciones finales.
 */
const PLACEHOLDER_ASPECT = 16 / 9

/**
 * Configuración de muestreo de textura.
 * anisotropy: cuántos samples para texturas en ángulo oblicuo.
 * Con cámara ortográfica el ángulo es siempre 0°, pero lo dejamos
 * en 4 por si hay ligeras rotaciones futuras.
 */
const TEXTURE_ANISOTROPY = 4

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE INTERNO: TexturedPlane
// Solo se usa cuando `url` está definida. SUSPENDE mientras carga.
// ─────────────────────────────────────────────────────────────────────
function TexturedPlane({ url, position, targetHeight, renderOrder, alphaThreshold, color, cropToWidth }) {
  // Necesitamos invalidate() para que frameloop="demand" re-renderice
  // cuando la textura termina de cargar.
  const { invalidate } = useThree()

  // Frame garantizado al salir de Suspense (ver useInvalidateOnMount.js)
  useInvalidateOnMount()

  const texture = useTexture(url, (tex) => {
    tex.colorSpace  = THREE.SRGBColorSpace
    tex.minFilter   = THREE.LinearMipmapLinearFilter
    tex.magFilter   = THREE.LinearFilter
    tex.anisotropy  = TEXTURE_ANISOTROPY
    tex.needsUpdate = true
    // ← CRÍTICO para frameloop="demand": fuerza un frame nuevo al cargar
    invalidate()
  })

  const scale = useMemo(() => {
    // ── Extraer dimensiones del source de la textura ──────────
    // Three.js v0.184+ usa ImageBitmapLoader por defecto.
    // ImageBitmap expone .width/.height (no .naturalWidth/.naturalHeight).
    // HTMLImageElement expone ambos. El source puede vivir en:
    //   - texture.image       (camino normal)
    //   - texture.source.data (acceso interno de Three.js)
    const img = texture.image ?? texture.source?.data
    if (!img) return [PLACEHOLDER_ASPECT * targetHeight, targetHeight, 1]

    const imgW = img.naturalWidth  ?? img.width  ?? 0
    const imgH = img.naturalHeight ?? img.height ?? 0

    if (imgW === 0 || imgH === 0) return [PLACEHOLDER_ASPECT * targetHeight, targetHeight, 1]

    const aspect    = imgW / imgH
    const fullWidth = aspect * targetHeight

    /**
     * CROP CENTRADO (cropToWidth):
     * Si la imagen es más ancha que el límite deseado, mostramos solo
     * la porción central usando UV repeat/offset — sin distorsión.
     *
     * visibleFraction = cuánta fracción del ancho total de la textura
     * se muestra (ej: 0.6 → solo el 60% central de la imagen).
     * texture.repeat.x  = visibleFraction  → zoom-in en X
     * texture.offset.x  = (1-visibleFraction)/2 → centrar en X
     */
    if (cropToWidth != null && fullWidth > cropToWidth) {
      const visibleFraction = cropToWidth / fullWidth
      texture.repeat.set(visibleFraction, 1)
      texture.offset.set((1 - visibleFraction) / 2, 0)
      texture.needsUpdate = true
      return [cropToWidth, targetHeight, 1]
    }

    // Sin crop: restaurar UVs por defecto (por si el prop se quitó en HMR)
    texture.repeat.set(1, 1)
    texture.offset.set(0, 0)
    return [fullWidth, targetHeight, 1]
  }, [texture, targetHeight, cropToWidth])

  return (
    <mesh
      position={position}
      scale={scale}
      renderOrder={renderOrder}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        color="#ffffff"
        transparent={true}
        depthWrite={false}
        depthTest={true}
        /*
         * alphaTest={alphaThreshold} — DESACTIVADO para sprites transparentes.
         * alphaTest descarta pixels cuyo alpha < threshold de forma binaria.
         * Para el gecko con contornos suaves esto cortaría los bordes translúcidos.
         * Usamos solo transparent=true para canal alpha completo.
         */
        side={THREE.FrontSide}
        toneMapped={false}
      />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE INTERNO: ColorPlane
// Placeholder de color sólido. NUNCA suspende. Sin useTexture.
// ─────────────────────────────────────────────────────────────────────
function ColorPlane({ color, position, targetHeight, placeholderAspect, renderOrder }) {
  const width = placeholderAspect * targetHeight

  return (
    <mesh
      position={position}
      renderOrder={renderOrder}
    >
      <planeGeometry args={[width, targetHeight]} />
      <meshBasicMaterial
        color={color}
        transparent={true}
        depthWrite={false}
        depthTest={true}
        toneMapped={false}
      />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────
// COMPONENTE PÚBLICO: FlatIllustration
// ─────────────────────────────────────────────────────────────────────

/**
 * @param {string}   [url]              - Ruta al PNG (ej. '/assets/cielo-valdivia.png')
 *                                        Si se omite → renderiza el color de fallback.
 * @param {string}   [color='#444444']  - Color hexadecimal del placeholder greybox
 * @param {number}   [targetHeight=5]   - Altura deseada en unidades del mundo Three.js
 * @param {number[]} position           - [x, y, z] posición en la escena
 * @param {number}   [renderOrder=0]    - Orden de renderizado (mayor = encima)
 * @param {number}   [placeholderAspect=PLACEHOLDER_ASPECT]
 *                                      - Relación ancho/alto del placeholder sin textura
 * @param {number}   [alphaThreshold=0.01]
 *                                      - Valor mínimo de alpha para descartar pixel
 */
export function FlatIllustration({
  url,
  color             = '#444444',
  targetHeight      = 5,
  position          = [0, 0, 0],
  renderOrder       = 0,
  placeholderAspect = PLACEHOLDER_ASPECT,
  alphaThreshold    = 0.01,
  cropToWidth       = null,   // ← máximo ancho en unidades de mundo; recorta el centro de la textura
}) {
  /*
   * DECISIÓN DE RENDERIZADO:
   * Si `url` existe → TexturedPlane (puede suspender, necesita <Suspense>)
   * Si no hay `url` → ColorPlane (seguro, nunca suspende)
   *
   * Esta separación en dos sub-componentes es clave:
   * Si pusiéramos useTexture condicionalmente dentro de un solo componente,
   * violaríamos las Reglas de Hooks de React.
   */
  if (url) {
    return (
      <TexturedPlane
        url={url}
        color={color}
        position={position}
        targetHeight={targetHeight}
        renderOrder={renderOrder}
        alphaThreshold={alphaThreshold}
        cropToWidth={cropToWidth}
      />
    )
  }

  return (
    <ColorPlane
      color={color}
      position={position}
      targetHeight={targetHeight}
      placeholderAspect={placeholderAspect}
      renderOrder={renderOrder}
    />
  )
}
