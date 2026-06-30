/**
 * DIORAMA SCENE — La escena 2.5D completa
 * Módulo 2: Implementación con FlatIllustration + Suspense
 *
 * ════════════════════════════════════════════════════════════════
 *  ARQUITECTURA DE CAPAS (DIORAMA)
 * ════════════════════════════════════════════════════════════════
 *
 *  La ilusión de profundidad se logra separando planos en el eje Z.
 *  Con cámara ORTOGRÁFICA no hay deformación perspectiva: todos los
 *  planos mantienen su tamaño sin importar su distancia.
 *
 *  MAPA DE CAPAS:
 *   Z = -2.0  ██████  SKY        → Cielo, gradientes de atmósfera
 *   Z = -1.5  ████    MOUNTAINS  → Horizonte lejano, montañas, mar
 *   Z = -1.0  ███     VEGETATION → Vegetación media distancia
 *   Z = -0.5  ██      MIDGROUND  → Terreno medio, arquitectura fondo
 *   Z =  0.0  █       MAIN       → Personajes principales, objetos clave
 *   Z = +0.5  ░       FOREGROUND → Primer plano, plantas, rocas
 *   Z = +1.0  ░░      FRAME      → Marco del diorama, elementos decorativos
 *
 *  SEPARACIÓN MÍNIMA: 0.5 unidades entre capas → Z-fighting imposible
 *
 * ════════════════════════════════════════════════════════════════
 *  ESTRATEGIA DE PRELOAD DE TEXTURAS
 * ════════════════════════════════════════════════════════════════
 *
 *  useTexture.preload() se llama FUERA del árbol de componentes,
 *  al momento de importar el módulo. Esto inicia la descarga de
 *  los PNGs inmediatamente, incluso antes de que React renderice.
 *
 *  Cuando el componente <FlatIllustration url="..."> se monta,
 *  su llamada a useTexture() encuentra el PNG ya en caché → 0 wait.
 *
 *  FLUJO DE CARGA:
 *   1. [módulo importado] → useTexture.preload() inicia fetch de todos los PNGs
 *   2. [React renderiza Canvas] → <Suspense> escucha
 *   3. [FlatIllustration con url monta] → useTexture() busca en caché
 *      a. Caché HIT → renderiza inmediatamente (preload funcionó)
 *      b. Caché MISS → suspende → Suspense muestra <SceneFallback>
 *                   → cuando carga → React re-monta FlatIllustration
 *
 * ════════════════════════════════════════════════════════════════
 *  ESCENAS: Layout horizontal
 * ════════════════════════════════════════════════════════════════
 *
 *  Todas las escenas se distribuyen en el eje X.
 *  La cámara se desplaza horizontalmente con el scroll.
 *
 *  Escena 0 → X =   0   (El Museo — Presente)
 *  Escena 1 → X =  -8   (Las Vegas — 8000 a.C. a 4500 a.C.)
 *  Escena 2 → X = -16   (Valdivia — 3500 a.C. a 1500 a.C.)
 *  Escena 3 → X = -24   (Engoroy - Chorrera — 900 a.C. a 200 a.C.)
 *  Escena 4 → X = -32   (Guangala — 200 a.C. a 800 d.C.)
 *  Escena 5 → X = -40   (Manteño-Guancavilcas — 800 d.C. a 1530 d.C.)
 */

import React, { Suspense, useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture, Html } from '@react-three/drei'
import { FlatIllustration } from './FlatIllustration'
import { SceneFallback } from './SceneFallback'
import { gsapTarget } from '../animation/gsapTarget'
import { useMuseoStore } from '../store/useMuseoStore'

// ─────────────────────────────────────────────────────────────────────
// CONSTANTES DE POSICIONAMIENTO
// ─────────────────────────────────────────────────────────────────────

/**
 * Altura del frustum ortográfico (unidades de mundo).
 * Debe coincidir con FRUSTUM_HEIGHT en OrthoCamera.jsx.
 */
const FRUSTUM_HEIGHT = 10

/** Mapa de capas Z del diorama. Exportado para uso en otros componentes. */
export const LAYER_Z = {
  SKY: -2.0,
  MOUNTAINS: -1.5,
  VEGETATION: -1.0,
  MIDGROUND: -0.5,
  MAIN: 0.0,
  FOREGROUND: 0.5,
  FRAME: 1.0,
}

// ─────────────────────────────────────────────────────────────────────
// HOOK INTERNO: useWorldWidth
// Calcula el ancho del mundo en unidades Three.js de forma consistente.
// Debe usarse en cada componente de escena para garantizar coherencia.
// ─────────────────────────────────────────────────────────────────────
function useWorldWidth() {
  const { size } = useThree()
  return (size.width / size.height) * FRUSTUM_HEIGHT
}

// ─────────────────────────────────────────────────────────────────────
// RUTAS DE ASSETS (Greybox → listos para reemplazar con PNGs reales)
// ─────────────────────────────────────────────────────────────────────
/**
 * CÓMO ACTIVAR TEXTURAS REALES:
 * 1. Coloca tus PNGs en /public/assets/
 * 2. Descomenta las líneas de ASSET_URLS y useTexture.preload()
 * 3. Pasa la url al prop de <FlatIllustration>
 *
 * Convención de nombres: {escena}-{capa}.png
 * Ejemplo: museo-sky.png, las-vegas-mountains.png, valdivia-main.png
 */
export const ASSET_URLS = {
  // ── Escena 0: El Museo
  rei_gecko: '/assets/Rei.webp',
  rei_gecko2: '/assets/Rei2.webp',
  rei_gecko3: '/assets/Rei3.webp',
  rei_gecko4: '/assets/Rei4.webp',
  rei_gecko5: '/assets/Rei5.webp',
  rei_gecko6: '/assets/Rei6.webp',
  rei_gecko7: '/assets/Rei7.webp',
  museo_fondo: '/assets/museo.webp',
  museo_maquintaDelTiempo: '/assets/maquinaDelTiempo.webp',
  estacionamiento: '/assets/estacionamiento.webp',

  // ── Escena 1: Las Vegas
  lasVegasFondo: '/assets/Las_Vegas.webp',
  amantesSumpaFondo: '/assets/amantesSumpa.webp',
  huesoRojosFondo: '/assets/huesoRojos.webp',
  entierroMasivoFondo: '/assets/entierroMasivo.webp',
  lasVegasTransicion: '/assets/fondoTransicion.webp',
  esqueleto1: '/assets/esqueleto1.webp',
  esqueleto2: '/assets/esqueleto2.webp',
  esqueleto3: '/assets/esqueleto3.webp',

  // ── Escena 2: Valdivia
  valdiviaFondo: '/assets/FondoValdivida1.webp',
  valdiviaFondo2: '/assets/FondoValdivida2.webp',
  rei_gecko8: '/assets/Rei8.webp',

  // ── Escena 3: Chorrera
  chorreraFondo: '/assets/chorreraNuevoFondo.webp',

  // ── Escena 4: Guangala
  guangalaFondo: '/assets/FondoGuangala.webp',
  guangalaTransicion: '/assets/fondoTransicion.webp',

  // ── Escena 5: Manteño-Guancavilcas
  mantenoFondo: '/assets/fondoSeñoríosManteño-Guancavilcas.webp',
  mantenoFondo2: '/assets/FondosSeñoríosManteño.webp',
  mantenoTransicion: '/assets/fondoTransicion.webp',
}

// ─────────────────────────────────────────────────────────────────────
// PRELOAD DE TEXTURAS DE FORMA GRADUAL POR ESCENA
// ─────────────────────────────────────────────────────────────────────
export const URLS_ESCENA_INTRO = [
  ASSET_URLS.rei_gecko,
  ASSET_URLS.rei_gecko2,
  ASSET_URLS.rei_gecko3,
  ASSET_URLS.rei_gecko4,
  ASSET_URLS.rei_gecko5,
  ASSET_URLS.rei_gecko6,
  ASSET_URLS.rei_gecko7,
  ASSET_URLS.museo_fondo,
  ASSET_URLS.museo_maquintaDelTiempo,
  ASSET_URLS.estacionamiento,
].filter(Boolean)

export const URLS_ESCENA_LAS_VEGAS = [
  ASSET_URLS.lasVegasFondo,
  ASSET_URLS.amantesSumpaFondo,
  ASSET_URLS.huesoRojosFondo,
  ASSET_URLS.entierroMasivoFondo,
  ASSET_URLS.lasVegasTransicion,
  ASSET_URLS.esqueleto1,
  ASSET_URLS.esqueleto2,
  ASSET_URLS.esqueleto3,
].filter(Boolean)

export const URLS_ESCENA_VALDIVIA = [
  ASSET_URLS.valdiviaFondo,
  ASSET_URLS.valdiviaFondo2,
  ASSET_URLS.rei_gecko8,
].filter(Boolean)

export const URLS_ESCENA_CHORRERA = [
  ASSET_URLS.chorreraFondo,
].filter(Boolean)

export const URLS_ESCENA_GUANGALA = [
  ASSET_URLS.guangalaFondo,
  ASSET_URLS.guangalaTransicion,
].filter(Boolean)

export const URLS_ESCENA_MANTENO = [
  ASSET_URLS.mantenoFondo,
  ASSET_URLS.mantenoFondo2,
  ASSET_URLS.mantenoTransicion,
].filter(Boolean)

// Ahora que todos los assets son WebP (~3MB total), precargamos TODAS las escenas
// inmediatamente a nivel de módulo para eliminación total de pantalla negra.
// Antes con PNGs (~17MB) esto era imposible; ahora es trivial.
const ALL_TEXTURE_URLS = [
  ...URLS_ESCENA_INTRO,
  ...URLS_ESCENA_LAS_VEGAS,
  ...URLS_ESCENA_VALDIVIA,
  ...URLS_ESCENA_CHORRERA,
  ...URLS_ESCENA_GUANGALA,
  ...URLS_ESCENA_MANTENO,
]
if (ALL_TEXTURE_URLS.length > 0) {
  useTexture.preload(ALL_TEXTURE_URLS)
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: EscenaIntroduccion (Escena 0 — Presente)
// ─────────────────────────────────────────────────────────────────────
function EscenaIntroduccion({ xOffset }) {
  const worldWidth = useWorldWidth()

  // xPos: posición horizontal de Rei y Spondylus dentro de la escena.
  // Dividimos por 5 para acercarlos al centro sin salirse del frame.
  const xPos = worldWidth / 5

  const signRef = useRef(null)
  const reiGroupRef = useRef(null)
  const dialogBoxRef = useRef(null)
  const dialogue1Ref = useRef(null)
  const dialogue2Ref = useRef(null)
  const dialogue3Ref = useRef(null)
  const dialogue4Ref = useRef(null)
  const dialogue5Ref = useRef(null)
  const dialogue6Ref = useRef(null)
  const dialogue7Ref = useRef(null) // Nuevo diálogo para la subida
  const rei1Ref = useRef(null)
  const rei2Ref = useRef(null)
  const rei3Ref = useRef(null)
  const rei4Ref = useRef(null)
  const rei5Ref = useRef(null)
  const rei6Ref = useRef(null)
  const reiIndividualGroupRef = useRef(null) // Para desplazar a Rei localmente

  useFrame(() => {
    // 1. Letrero de Bienvenida (Fade out)
    if (signRef.current) {
      signRef.current.style.opacity = gsapTarget.intro.signOpacity
      signRef.current.style.transform = `scale(${0.9 + gsapTarget.intro.signOpacity * 0.1})`
      signRef.current.style.display = gsapTarget.intro.signOpacity < 0.01 ? 'none' : 'block'
    }

    // 2. Rei — posición y escala del grupo
    if (reiGroupRef.current) {
      reiGroupRef.current.position.x = xPos + gsapTarget.intro.reiPositionX
      const rs = gsapTarget.intro.reiScale
      reiGroupRef.current.scale.set(rs, rs, rs)
    }

    // Opacidad del globo de diálogo (controlada por CSS inline)
    if (dialogBoxRef.current) {
      dialogBoxRef.current.style.opacity = gsapTarget.intro.reiOpacity
      dialogBoxRef.current.style.display = gsapTarget.intro.reiOpacity < 0.01 ? 'none' : 'block'
    }

    // 3. Cambio de sprite de Rei según dialogueStep
    const step = gsapTarget.intro.dialogueStep

    // Si ya completamos la caminata, hacemos el switch a Rei montado (step >= 6.5)
    const isMounted = step >= 6.5

    if (reiIndividualGroupRef.current) {
      reiIndividualGroupRef.current.visible = !isMounted
      reiIndividualGroupRef.current.position.x = gsapTarget.intro.reiLocalX
      reiIndividualGroupRef.current.position.y = gsapTarget.intro.reiLocalY
      const scaleRatio = gsapTarget.intro.reiIntroScale
      reiIndividualGroupRef.current.scale.set(scaleRatio, scaleRatio, scaleRatio)
    }

    if (rei6Ref.current) {
      rei6Ref.current.visible = isMounted
    }

    // Visibilidad de los sprites 3D de Rei individual
    if (rei1Ref.current) rei1Ref.current.visible = (step >= 0.5 && step < 1.5)
    if (rei2Ref.current) rei2Ref.current.visible = (step >= 1.5 && step < 2.5)
    if (rei3Ref.current) rei3Ref.current.visible = (step >= 2.5 && step < 3.5)
    if (rei4Ref.current) rei4Ref.current.visible = (step >= 3.5 && step < 4.5)
    if (rei5Ref.current) rei5Ref.current.visible = (step >= 4.5 && step < 6.5) // Rei5 antes de montarse

    // Mostrar/ocultar diálogos HTML según el paso activo
    if (dialogue1Ref.current) dialogue1Ref.current.style.display = (step >= 0.5 && step < 1.5) ? 'block' : 'none'
    if (dialogue2Ref.current) dialogue2Ref.current.style.display = (step >= 1.5 && step < 2.5) ? 'block' : 'none'
    if (dialogue3Ref.current) dialogue3Ref.current.style.display = (step >= 2.5 && step < 3.5) ? 'block' : 'none'
    if (dialogue4Ref.current) dialogue4Ref.current.style.display = (step >= 3.5 && step < 4.5) ? 'block' : 'none'
    if (dialogue5Ref.current) dialogue5Ref.current.style.display = (step >= 4.5 && step < 5.5) ? 'block' : 'none'
    if (dialogue6Ref.current) dialogue6Ref.current.style.display = (step >= 5.5 && step < 6.5) ? 'block' : 'none'
    if (dialogue7Ref.current) dialogue7Ref.current.style.display = (step >= 6.5) ? 'block' : 'none'
  })

  return (
    <Suspense fallback={<SceneFallback />}>
      <group position={[xOffset, 0, 0]}>

        {/* ── CAPA MUSEO Fondo  ── */}
        {/* cropToWidth: limita el ancho al worldWidth de la escena.          */}
        {/* museo.png es panorámica; sin este límite se derrama hacia         */}
        {/* la Escena 1 (Las Vegas). El crop muestra el centro de la imagen. */}
        <FlatIllustration
          url={ASSET_URLS.museo_fondo}
          color="#F2F0E9"
          targetHeight={11}
          placeholderAspect={worldWidth / 11}
          position={[0, 0, LAYER_Z.SKY]}
          renderOrder={0}
          cropToWidth={worldWidth}
        />

        {/* ── CAPA ESTACIONAMIENTO Fondo  ── */}
        <FlatIllustration
          url={ASSET_URLS.estacionamiento}
          color="#E5E7EB"
          targetHeight={11}
          placeholderAspect={worldWidth / 11}
          position={[worldWidth, 0, LAYER_Z.SKY]}
          renderOrder={0}
          cropToWidth={worldWidth}
        />

        {/* ── LETRERO DE BIENVENIDA (Fase 1) ── */}
        <Html position={[0, 0, LAYER_Z.MAIN]} center zIndexRange={[100, 0]}>
          <div ref={signRef} className="scene__welcome-sign">
            <p className="scene__welcome-paragraph">
              Lo que observamos en nuestro entorno es el reflejo de lo que fuimos, somos y queremos llegar a ser.
            </p>
            <p className="scene__welcome-paragraph">
              Nos hemos reunido un grupo de personas que soñamos en un futuro mejor junto a ti, para entregarte un cuento lleno de magia y color.
            </p>
            <p className="scene__welcome-paragraph">
              Es un viaje que emprenderás por la historia de nuestras primeras culturas, que son parte de tu identidad.
            </p>
            <div className="scene__welcome-divider" />
            <p className="scene__welcome-highlight">
              ¡Disfrútalo y comparte tus ideas!
            </p>
          </div>
        </Html>

        {/* ── REI (LA SALAMANQUESA) + Globo de Diálogo (MAIN) ── */}
        <group ref={reiGroupRef} position={[xPos, -1.5, LAYER_Z.MAIN]}>

          <group ref={reiIndividualGroupRef}>
            <group ref={rei1Ref}>
              <FlatIllustration
                url={ASSET_URLS.rei_gecko}
                color="#AA8855"
                targetHeight={5.5}
                position={[0, 0, 0]}
                renderOrder={2}
              />
            </group>

            <group ref={rei2Ref}>
              <FlatIllustration
                url={ASSET_URLS.rei_gecko2}
                color="#AA8855"
                targetHeight={5.5}
                position={[0, 0, 0]}
                renderOrder={2}
              />
            </group>

            <group ref={rei3Ref}>
              <FlatIllustration
                url={ASSET_URLS.rei_gecko3}
                color="#AA8855"
                targetHeight={5.5}
                position={[0, 0, 0]}
                renderOrder={2}
              />
            </group>

            <group ref={rei4Ref}>
              <FlatIllustration
                url={ASSET_URLS.rei_gecko4}
                color="#AA8855"
                targetHeight={5.5}
                position={[0, 0, 0]}
                renderOrder={2}
              />
            </group>

            <group ref={rei5Ref}>
              <FlatIllustration
                url={ASSET_URLS.rei_gecko5}
                color="#AA8855"
                targetHeight={5.5}
                position={[0, 0, 0]}
                renderOrder={2}
              />
            </group>
          </group>

          <group ref={rei6Ref}>
            <FlatIllustration
              url={ASSET_URLS.rei_gecko6}
              color="#AA8855"
              targetHeight={5.5}
              position={[0, 0, 0]}
              renderOrder={2}
            />
          </group>

          <Html position={[0, 3.5, 0]} center zIndexRange={[100, 0]}>
            <div ref={dialogBoxRef} className="scene__dialog-box scene__dialog-box--left" style={{ opacity: 0, display: 'none' }}>

              {/* Diálogo Fase 2 - Texto 1 */}
              <div ref={dialogue1Ref}>
                <p className="scene__dialog-title">
                  ¡Hola! Mi nombre es REI...
                </p>
                <p className="scene__dialog-text">
                  Soy una salamanquesa, comúnmente conocida como gecko. Tal vez me hayas visto en tu casa o en tu jardín merodeando en los rincones. Soy inofensiva para ti y me alimento de insectos.
                </p>
              </div>

              {/* Diálogo Fase 3 - Texto 2 */}
              <div ref={dialogue2Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  El nombre de la especie de la que provengo es muy complejo (<strong className="scene__dialog-highlight">Phyllodactylus reissii</strong>), pero para resumir, <strong className="scene__dialog-highlight">reissii</strong>, en honor a Carl Reiss, un alemán que vive en Ecuador y que investigó sobre mí.
                </p>
              </div>

              {/* Diálogo Fase 4 - Texto 3 */}
              <div ref={dialogue3Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Además, obtendrás información sobre mis ancestros a través de la doctora <strong className="scene__dialog-highlight">Karen Stothert</strong>, quien dejó datos sobre las especies y la fauna encontradas en una de las culturas aborígenes más antiguas y que hallarás al inicio de este cuento.
                </p>
              </div>

              {/* Diálogo Fase 5 - Texto 4 */}
              <div ref={dialogue4Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Observa la imagen y sabrás que el modo de vida de hombres y mujeres en una época marcan la diferencia por la diversidad de características que la representan, como: expresión o lenguaje, comida, arte, creencias, costumbres y tradiciones. Esto es lo que conoces como <strong className="scene__dialog-highlight">CULTURA</strong>, expresada en el hacer, pensar y sentir.
                </p>
              </div>

              {/* Diálogo Fase 6 - Texto 5 */}
              <div ref={dialogue5Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text" style={{ margin: '0 0 6px 0' }}>
                  ¿Ves que Rei tiene en sus manos globos de diversos colores que representan esta diversidad de actividades y disfruta de ellos?
                </p>
                <p className="scene__dialog-text scene__dialog-text--medium">
                  ¿Sabes? ¡Esto me motiva a viajar en el tiempo y conocer qué hicieron nuestros antepasados! ¿Tú también quieres aprender? ¡Si la tierra hablara, imagínate lo que diría!
                </p>
              </div>

              {/* Diálogo Fase 7 - Texto 6 */}
              <div ref={dialogue6Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text scene__dialog-text--medium" style={{ fontSize: 'clamp(12px, 1.4vw, 15px)' }}>
                  Hoy quiero llevarte a un viaje maravilloso del cual mis ancestros fueron partícipes. Un viaje por el tiempo y la historia en tu provincia.
                </p>
              </div>

              {/* Diálogo Fase 8 - Texto 7 */}
              <div ref={dialogue7Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text scene__dialog-text--bold" style={{ color: '#ea580c' }}>
                  ¡Vamos, súbete a mi máquina del tiempo! La programaremos para que nos lleve del 8.000 a.C. al 4.500 a.C.
                </p>
              </div>

              {/* Triangulito del globo */}
              <div className="scene__dialog-arrow"></div>
            </div>
          </Html>
        </group>

      </group>
    </Suspense>
  )
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: EscenaLasVegas (Escena 1 — 8000 a.C.)
// ─────────────────────────────────────────────────────────────────────
function EscenaLasVegas({ xOffset }) {
  const worldWidth = useWorldWidth()

  // Helper to set opacity of all meshes inside a group dynamically
  const setGroupOpacity = (group, opacity) => {
    if (!group) return
    group.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.opacity = opacity
        child.material.transparent = true
      }
    })
  }

  const reiGroupRef = useRef(null)
  const dialogBoxRef = useRef(null)

  // Refs para los fondos
  const lasVegasFondoRef = useRef(null)
  const amantesSumpaFondoRef = useRef(null)
  const huesoRojosFondoRef = useRef(null)
  const entierroMasivoFondoRef = useRef(null)
  const fondoTransicionFondoRef = useRef(null)

  // Refs para los diferentes sprites de Rei
  const rei1Ref = useRef(null)
  const rei2Ref = useRef(null)
  const rei3Ref = useRef(null)
  const rei4Ref = useRef(null)
  const rei6Ref = useRef(null)
  const rei7Ref = useRef(null)

  // Refs para los textos de diálogo
  const dialogue1Ref = useRef(null)
  const dialogue2Ref = useRef(null)
  const dialogue3Ref = useRef(null)
  const dialogue4Ref = useRef(null)
  const dialogue5Ref = useRef(null)
  const dialogue6Ref = useRef(null)
  const dialogue7Ref = useRef(null)
  const dialogue8Ref = useRef(null)
  const dialogue9Ref = useRef(null)
  const dialogue10Ref = useRef(null)
  const dialogue11Ref = useRef(null)
  const dialogue12Ref = useRef(null)
  const dialogue13Ref = useRef(null)
  const dialogue15Ref = useRef(null)

  const maquinaDelTiempoRef = useRef(null)


  useFrame(() => {
    // Rei — escala del grupo
    if (reiGroupRef.current) {
      const rs = gsapTarget.lasVegas.reiScale
      reiGroupRef.current.scale.set(rs, rs, rs)
    }

    // Opacidad del globo de diálogo
    if (dialogBoxRef.current) {
      dialogBoxRef.current.style.opacity = gsapTarget.lasVegas.reiOpacity
      dialogBoxRef.current.style.display = gsapTarget.lasVegas.reiOpacity < 0.01 ? 'none' : 'block'
    }

    // Cambio de diálogo y sprite según dialogueStep
    const step = gsapTarget.lasVegas.dialogueStep

    // Actualizar la posición de Rei en X
    if (reiGroupRef.current) {
      if (step >= 18.5) {
        reiGroupRef.current.position.x = gsapTarget.lasVegas.reiPositionX
      } else {
        reiGroupRef.current.position.x = xPosRei
      }
    }

    // Visibilidad de los sprites de Rei según el scroll:
    if (rei1Ref.current) rei1Ref.current.visible = (step < 3.5) || (step >= 6.5 && step < 7.5) || (step >= 9.5 && step < 11.5) || (step >= 14.5 && step < 15.5) || (step >= 16.5 && step < 17.5) || (step >= 18.5 && step < 22.5)
    if (rei2Ref.current) rei2Ref.current.visible = (step >= 7.5 && step < 8.5)
    if (rei3Ref.current) rei3Ref.current.visible = (step >= 3.5 && step < 4.5) || (step >= 5.5 && step < 6.5) || (step >= 11.5 && step < 12.5)
    if (rei4Ref.current) rei4Ref.current.visible = (step >= 4.5 && step < 5.5) || (step >= 13.5 && step < 14.5)
    if (rei7Ref.current) rei7Ref.current.visible = (step >= 17.5 && step < 18.5)
    if (rei6Ref.current) rei6Ref.current.visible = (step >= 21.5)

    // Aplicar opacidades dinámicas para desvanecimiento suave
    setGroupOpacity(rei1Ref.current, gsapTarget.lasVegas.reiOpacity)
    setGroupOpacity(rei7Ref.current, gsapTarget.lasVegas.reiOpacity)
    setGroupOpacity(rei6Ref.current, gsapTarget.lasVegas.reiMountedOpacity)

    // Visibilidad de los textos
    if (dialogue1Ref.current) dialogue1Ref.current.style.display = (step >= 1.5 && step < 2.5) ? 'block' : 'none'
    if (dialogue2Ref.current) dialogue2Ref.current.style.display = (step >= 2.5 && step < 3.5) ? 'block' : 'none'
    if (dialogue3Ref.current) dialogue3Ref.current.style.display = (step >= 3.5 && step < 4.5) ? 'block' : 'none'
    if (dialogue4Ref.current) dialogue4Ref.current.style.display = (step >= 4.5 && step < 5.5) ? 'block' : 'none'
    if (dialogue5Ref.current) dialogue5Ref.current.style.display = (step >= 5.5 && step < 6.5) ? 'block' : 'none'
    if (dialogue6Ref.current) dialogue6Ref.current.style.display = (step >= 6.5 && step < 7.5) ? 'block' : 'none'
    if (dialogue7Ref.current) dialogue7Ref.current.style.display = (step >= 7.5 && step < 8.5) ? 'block' : 'none'
    if (dialogue8Ref.current) dialogue8Ref.current.style.display = (step >= 9.5 && step < 10.5) ? 'block' : 'none'
    if (dialogue9Ref.current) dialogue9Ref.current.style.display = (step >= 10.5 && step < 11.5) ? 'block' : 'none'
    if (dialogue10Ref.current) dialogue10Ref.current.style.display = (step >= 11.5 && step < 12.5) ? 'block' : 'none'
    if (dialogue11Ref.current) dialogue11Ref.current.style.display = (step >= 13.5 && step < 14.5) ? 'block' : 'none'
    if (dialogue12Ref.current) dialogue12Ref.current.style.display = (step >= 14.5 && step < 15.5) ? 'block' : 'none'
    if (dialogue13Ref.current) dialogue13Ref.current.style.display = (step >= 16.5 && step < 17.5) ? 'block' : 'none'
    if (dialogue15Ref.current) dialogue15Ref.current.style.display = (step >= 18.5 && step < 20.5) ? 'block' : 'none'

    // Animación de los nuevos fondos - se deslizan desde la izquierda
    if (amantesSumpaFondoRef.current) {
      amantesSumpaFondoRef.current.position.x = gsapTarget.lasVegas.amantesSumpaX * worldWidth
    }
    if (huesoRojosFondoRef.current) {
      huesoRojosFondoRef.current.position.x = gsapTarget.lasVegas.huesoRojosX * worldWidth
    }
    if (entierroMasivoFondoRef.current) {
      entierroMasivoFondoRef.current.position.x = gsapTarget.lasVegas.entierroMasivoX * worldWidth
    }
    if (fondoTransicionFondoRef.current) {
      fondoTransicionFondoRef.current.position.x = gsapTarget.lasVegas.fondoTransicionX * worldWidth
    }
    if (maquinaDelTiempoRef.current) {
      const ms = gsapTarget.lasVegas.maquinaScale
      maquinaDelTiempoRef.current.scale.set(ms, ms, ms)
      setGroupOpacity(maquinaDelTiempoRef.current, gsapTarget.lasVegas.maquinaOpacity)
      maquinaDelTiempoRef.current.visible = (step >= 19.5)
    }
  })

  const xPosRei = -worldWidth * 0.35
  const yPosRei = -2.7

  return (
    <Suspense fallback={<SceneFallback />}>
      <group position={[xOffset, 0, 0]}>

        <group ref={lasVegasFondoRef}>
          <FlatIllustration
            url={ASSET_URLS.lasVegasFondo}
            color="#5C2D1A"
            targetHeight={11}
            placeholderAspect={worldWidth / 11}
            position={[0, 0, LAYER_Z.SKY]}
            renderOrder={0}
            cropToWidth={worldWidth}
          />
        </group>

        <group ref={amantesSumpaFondoRef}>
          <FlatIllustration
            url={ASSET_URLS.amantesSumpaFondo}
            color="#5C2D1A"
            targetHeight={11}
            placeholderAspect={worldWidth / 11}
            position={[0, 0, LAYER_Z.SKY + 0.1]}
            renderOrder={0}
            cropToWidth={worldWidth}
          />
        </group>

        <group ref={huesoRojosFondoRef}>
          <FlatIllustration
            url={ASSET_URLS.huesoRojosFondo}
            color="#5C2D1A"
            targetHeight={11}
            placeholderAspect={worldWidth / 11}
            position={[0, 0, LAYER_Z.SKY + 0.2]}
            renderOrder={0}
            cropToWidth={worldWidth}
          />
        </group>

        <group ref={entierroMasivoFondoRef}>
          <FlatIllustration
            url={ASSET_URLS.entierroMasivoFondo}
            color="#5C2D1A"
            targetHeight={11}
            placeholderAspect={worldWidth / 11}
            position={[0, 0, LAYER_Z.SKY + 0.3]}
            renderOrder={0}
            cropToWidth={worldWidth}
          />
        </group>

        <group ref={fondoTransicionFondoRef}>
          <FlatIllustration
            url={ASSET_URLS.lasVegasTransicion}
            color="#5C2D1A"
            targetHeight={11}
            placeholderAspect={worldWidth / 11}
            position={[0, 0, LAYER_Z.SKY + 0.4]}
            renderOrder={0}
            cropToWidth={worldWidth}
          />
          {/* Máquina del tiempo individual visible en Scroll 19 */}
          <group ref={maquinaDelTiempoRef} visible={false}>
            <FlatIllustration
              url={ASSET_URLS.museo_maquintaDelTiempo}
              color="#ffffff"
              targetHeight={3.5}
              position={[0, -2.1, LAYER_Z.MAIN - 0.1]}
              renderOrder={1}
            />
          </group>
        </group>


        {/* ── REI (LA SALAMANQUESA) + Globo de Diálogo (MAIN) ── */}
        <group ref={reiGroupRef} position={[xPosRei, yPosRei, LAYER_Z.MAIN]}>

          <group ref={rei1Ref}>
            <FlatIllustration url={ASSET_URLS.rei_gecko} color="#AA8855" targetHeight={4.0} position={[0, 0, 0]} renderOrder={2} />
          </group>
          <group ref={rei2Ref}>
            <FlatIllustration url={ASSET_URLS.rei_gecko2} color="#AA8855" targetHeight={4.0} position={[0, 0, 0]} renderOrder={2} />
          </group>
          <group ref={rei3Ref}>
            <FlatIllustration url={ASSET_URLS.rei_gecko3} color="#AA8855" targetHeight={4.0} position={[0, 0, 0]} renderOrder={2} />
          </group>
          <group ref={rei4Ref}>
            <FlatIllustration url={ASSET_URLS.rei_gecko4} color="#AA8855" targetHeight={4.0} position={[0, 0, 0]} renderOrder={2} />
          </group>
          <group ref={rei7Ref} visible={false}>
            <FlatIllustration url={ASSET_URLS.rei_gecko7} color="#AA8855" targetHeight={4.0} position={[0, 0, 0]} renderOrder={2} />
          </group>
          <group ref={rei6Ref} visible={false}>
            <FlatIllustration url={ASSET_URLS.rei_gecko6} color="#AA8855" targetHeight={4.5} position={[0, 0.4, 0]} renderOrder={2} />
          </group>

          <Html position={[0, 2.5, 0]} center zIndexRange={[100, 0]}>
            <div ref={dialogBoxRef} className="scene__dialog-box scene__dialog-box--left" style={{ opacity: 0, display: 'none' }}>

              {/* Scroll 2 (Texto 1) */}
              <div ref={dialogue1Ref}>
                <p className="scene__dialog-title">
                  ¡Al fin hemos llegado!
                </p>
                <p className="scene__dialog-text">
                  Estamos en el punto inicial de esta historia.
                </p>
              </div>

              {/* Scroll 3 (Texto 2) */}
              <div ref={dialogue2Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Mira, ahí están los primeros aborígenes que han decidido asentarse en este lugar. Es el paso de una vida nómada a una vida sedentaria. Es decir, van a hacer sus viviendas aquí. Ellos son quienes forman parte de lo que hoy conoces como <strong className="scene__dialog-highlight">Cultura Las Vegas</strong>.
                </p>
              </div>

              {/* Scroll 4 (Texto 3) */}
              <div ref={dialogue3Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Son los primeros en desarrollar la <strong className="scene__dialog-highlight">HORTICULTURA</strong> en América, que es el inicio de la agricultura, realizada en pequeños huertos, no en grandes extensiones de tierra. La mujer se dedica a la siembra de las hortalizas y plantas, como: mate, zapallo, maíz, yuca, hierbas medicinales.
                </p>
              </div>

              {/* Scroll 5 (Texto 4) */}
              <div ref={dialogue4Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  El sitio arqueológico y patrimonial Las Vegas, denominado <strong className="scene__dialog-highlight">OGSE-80</strong>, está ubicado en el Museo Amantes de Sumpa en una pequeña colina, entre dos quebradas que forman el río Las Vegas.
                </p>
              </div>

              {/* Scroll 6 (Texto 5) */}
              <div ref={dialogue5Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Su nombre se debe al asentamiento a la orilla del río. Son parte de una sociedad <strong className="scene__dialog-highlight">cazadora recolectora</strong>. Es decir, subsisten apropiándose de lo que la naturaleza les proporciona: cazan animales y recolectan plantas comestibles.
                </p>
              </div>

              {/* Scroll 7 (Texto 6) */}
              <div ref={dialogue6Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Santa Elena está llena de manglares en donde viven moluscos, cangrejos y peces que les sirven de alimento. Utilizan las conchas prietas no solo para comer sino también para servirse otros alimentos, cual si fuera una cuchara o un plato.
                </p>
              </div>

              {/* Scroll 8 (Texto 7) */}
              <div ref={dialogue7Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Este yacimiento arqueológico tiene <strong className="scene__dialog-highlight">200 osamentas</strong> con formas de enterramientos típicos de la cultura. Vas a ver tres entierros conservados “in situ” (en el sitio), que evidencian sus costumbres funerarias y sus ofrendas.
                </p>
              </div>

              {/* Scroll 10 (Texto 8) - Amantes de Sumpa 1 */}
              <div ref={dialogue8Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  ¿Conoces a los <strong className="scene__dialog-highlight">Amantes de Sumpa</strong>?
                </p>
              </div>

              {/* Scroll 11 (Texto 9) - Amantes de Sumpa 2 */}
              <div ref={dialogue9Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Ellos forman parte del enterramiento denominado <strong className="scene__dialog-highlight">DOBLE PRIMARIO</strong>. Es un entierro directo de un hombre y una mujer, quienes mueren entre los 20 y 25 años de edad y son enterrados cuidadosamente así:
                </p>
              </div>

              {/* Scroll 12 (Texto 10) - Amantes de Sumpa 3 */}
              <div ref={dialogue10Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  El hombre con su mano derecha sobre la cintura de la mujer y con la pierna derecha encima de sus caderas, ella en posición flexionada (fetal), con el brazo sobre su cabeza. Se colocan seis grandes piedras encima, una vez enterrados.
                </p>
              </div>

              {/* Scroll 14 (Texto 11) - Huesos Rojos Parte 1 */}
              <div ref={dialogue11Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-title">
                  ENTIERRO SECUNDARIO:
                </p>
                <p className="scene__dialog-text">
                  Existió la costumbre de desenterrar los esqueletos humanos, llamada también exhumación de los cuerpos.
                </p>
              </div>

              {/* Scroll 15 (Texto 12) - Huesos Rojos Parte 2 */}
              <div ref={dialogue12Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Los huesos sin carne y desarticulados se acomodan en forma de “paquete” y se vuelven a enterrar, se colocan cerca de un familiar muerto y algunos tienen <strong className="scene__dialog-highlight">pigmento de color rojo</strong> como símbolo de protección espiritual.
                </p>
              </div>

              {/* Scroll 17 (Texto 13) - Entierro Masivo */}
              <div ref={dialogue13Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-title">
                  ENTIERRO MÚLTIPLE O MASIVO:
                </p>
                <p className="scene__dialog-text">
                  Es el entierro de un gran número de esqueletos humanos desarticulados en diferentes ubicaciones dentro de un osario o fosa de forma ovalada, donde se acomodan las osamentas.
                </p>
              </div>


              {/* Scroll 19 (Texto 15) - Transición */}
              <div ref={dialogue15Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  ¡Regresamos a la máquina del tiempo! No te preocupes, aún no nos vamos a casa. Esto recién empieza. ¡Si te gustó la cultura Las Vegas, te aseguro que lo que viene te va a encantar! Acompáñame ahora unos <strong className="scene__dialog-highlight">3.500 a.C. a 1.500 a.C.</strong>
                </p>
              </div>

              {/* Triangulito del globo */}
              <div className="scene__dialog-arrow"></div>
            </div>
          </Html>
        </group>

      </group>
    </Suspense>
  )
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: EscenaValdivia (Escena 2 — 3500 a.C.)
// ─────────────────────────────────────────────────────────────────────
function EscenaValdivia({ xOffset }) {
  const worldWidth = useWorldWidth()

  // ─────────────────────────────────────────────────────────────────────
  // VARIABLES DE CONFIGURACIÓN DE REI (MODIFÍCALAS AQUÍ PARA AJUSTAR)
  // ─────────────────────────────────────────────────────────────────────
  const reiScale = 0.35   // Escala/Tamaño de Rei (ej: 0.45 = 45% de la pantalla)
  const reiX = -5.5       // Posición horizontal (negativo = izquierda, positivo = derecha)
  const reiY = -2.5       // Posición vertical (negativo = abajo, positivo = arriba)

  const rei4X = worldWidth * 0.25   // Posición horizontal de Rei 4 (a la derecha)
  const rei4Y = -2.7       // Posición vertical de Rei 4

  const reiValdiviaRef = useRef(null)
  const rei4ValdiviaRef = useRef(null)

  // Diálogos de la primera sección
  const dialogBoxRef = useRef(null)
  const dialogue1Ref = useRef(null)
  const dialogue2Ref = useRef(null)
  const dialogue3Ref = useRef(null)
  const dialogue4Ref = useRef(null)

  // Diálogos de la segunda sección (sobre el segundo fondo)
  const dialogBoxRightRef = useRef(null)
  const dialogueRight1Ref = useRef(null)
  const dialogueRight2Ref = useRef(null)

  const fondoValdivia1Ref = useRef(null)
  const fondoValdivia2Ref = useRef(null)

  // Refs de la máquina del tiempo de Valdivia (réplica)
  const fondoTransicionFondoRef = useRef(null)
  const maquinaDelTiempoRef = useRef(null)
  const reiMaquinaGroupRef = useRef(null)
  const dialogBoxMaquinaRef = useRef(null)
  const dialogueMaquinaRef = useRef(null)
  const reiMaquina1Ref = useRef(null)
  const reiMaquina6Ref = useRef(null)

  const setGroupOpacity = (group, opacity) => {
    if (!group) return
    group.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.opacity = opacity
        child.material.transparent = true
      }
    })
  }

  useFrame(() => {
    // Opacidad de la capa superpuesta de Rei (Rei8.png)
    setGroupOpacity(reiValdiviaRef.current, gsapTarget.valdivia.reiOpacity)

    // Posición del fondo deslizable y opacidad de Rei4
    if (fondoValdivia2Ref.current) {
      fondoValdivia2Ref.current.position.x = gsapTarget.valdivia.fondo2X * worldWidth
    }
    setGroupOpacity(rei4ValdiviaRef.current, gsapTarget.valdivia.rei4Opacity)

    const step = gsapTarget.valdivia.dialogueStep

    // Visibilidad del primer globo de diálogo (se muestra desde step 2 a step 5.99)
    if (dialogBoxRef.current) {
      const showDialog = step >= 2.0 && step < 6.0 && gsapTarget.valdivia.reiOpacity >= 0.01
      dialogBoxRef.current.style.opacity = gsapTarget.valdivia.reiOpacity
      dialogBoxRef.current.style.display = showDialog ? 'block' : 'none'
    }

    // Visibilidad de los textos correspondientes a cada scroll en la primera sección
    if (dialogue1Ref.current) dialogue1Ref.current.style.display = (step >= 2.0 && step < 3.0) ? 'block' : 'none'
    if (dialogue2Ref.current) dialogue2Ref.current.style.display = (step >= 3.0 && step < 4.0) ? 'block' : 'none'
    if (dialogue3Ref.current) dialogue3Ref.current.style.display = (step >= 4.0 && step < 5.0) ? 'block' : 'none'
    if (dialogue4Ref.current) dialogue4Ref.current.style.display = (step >= 5.0 && step < 6.0) ? 'block' : 'none'

    // Visibilidad del globo de diálogo a la derecha (se muestra en step 7 y 8)
    if (dialogBoxRightRef.current) {
      const showDialogRight = step >= 7.0 && step < 9.0 && gsapTarget.valdivia.rei4Opacity >= 0.01
      dialogBoxRightRef.current.style.opacity = gsapTarget.valdivia.rei4Opacity
      dialogBoxRightRef.current.style.display = showDialogRight ? 'block' : 'none'
    }
    if (dialogueRight1Ref.current) dialogueRight1Ref.current.style.display = (step >= 7.0 && step < 8.0) ? 'block' : 'none'
    if (dialogueRight2Ref.current) dialogueRight2Ref.current.style.display = (step >= 8.0 && step < 9.0) ? 'block' : 'none'

    // Desplazamiento del fondo de transición
    if (fondoTransicionFondoRef.current) {
      fondoTransicionFondoRef.current.position.x = gsapTarget.valdivia.fondoTransicionX * worldWidth
    }

    // Máquina del tiempo
    if (maquinaDelTiempoRef.current) {
      const ms = gsapTarget.valdivia.maquinaScale
      maquinaDelTiempoRef.current.scale.set(ms, ms, ms)
      setGroupOpacity(maquinaDelTiempoRef.current, gsapTarget.valdivia.maquinaOpacity)
      maquinaDelTiempoRef.current.visible = (step >= 10.5)
    }

    // Rei en la máquina
    if (reiMaquinaGroupRef.current) {
      if (step >= 9.5) {
        reiMaquinaGroupRef.current.position.x = gsapTarget.valdivia.reiPositionX
      } else {
        reiMaquinaGroupRef.current.position.x = -worldWidth * 0.35 // Posición inicial izquierda
      }
      const rs = gsapTarget.valdivia.reiScale
      reiMaquinaGroupRef.current.scale.set(rs, rs, rs)
    }

    // Visibilidad de los sprites de Rei en la máquina
    if (reiMaquina1Ref.current) reiMaquina1Ref.current.visible = (step < 11.5)
    if (reiMaquina6Ref.current) reiMaquina6Ref.current.visible = (step >= 11.5)

    // Opacidades de Rei en la máquina
    setGroupOpacity(reiMaquina1Ref.current, gsapTarget.valdivia.reiMaquinaOpacity)
    setGroupOpacity(reiMaquina6Ref.current, gsapTarget.valdivia.reiMountedOpacity)

    // Globo de diálogo de la máquina
    if (dialogBoxMaquinaRef.current) {
      dialogBoxMaquinaRef.current.style.opacity = gsapTarget.valdivia.reiMaquinaOpacity
      const showDialogMaquina = step >= 10.0 && step < 11.5 && gsapTarget.valdivia.reiMaquinaOpacity >= 0.01
      dialogBoxMaquinaRef.current.style.display = showDialogMaquina ? 'block' : 'none'
    }
  })

  return (
    <Suspense fallback={<SceneFallback />}>
      <group position={[xOffset, 0, 0]}>

        {/* ── SKY: FondoValdivida1.png como fondo completo de la escena ── */}
        <group ref={fondoValdivia1Ref}>
          <FlatIllustration
            url={ASSET_URLS.valdiviaFondo}
            color="#1A3D2D"
            targetHeight={11}
            placeholderAspect={worldWidth / 11}
            position={[0, 0, LAYER_Z.SKY]}
            renderOrder={0}
            cropToWidth={worldWidth}
          />
        </group>

        {/* ── SKY: FondoValdivida2.png como fondo alternativo de la escena ── */}
        <group ref={fondoValdivia2Ref}>
          <FlatIllustration
            url={ASSET_URLS.valdiviaFondo2}
            color="#1A3D2D"
            targetHeight={11}
            placeholderAspect={worldWidth / 11}
            position={[0, 0, LAYER_Z.SKY + 0.1]}
            renderOrder={1}
            cropToWidth={worldWidth}
          />
        </group>

        {/* ── TRANSICIÓN AL FINAL DE VALDIVIA (Copia de Las Vegas) ── */}
        <group ref={fondoTransicionFondoRef}>
          <FlatIllustration
            url={ASSET_URLS.lasVegasTransicion}
            color="#5C2D1A"
            targetHeight={11}
            placeholderAspect={worldWidth / 11}
            position={[0, 0, LAYER_Z.SKY + 0.2]} // Un nivel arriba del fondo alternativo
            renderOrder={1}
            cropToWidth={worldWidth}
          />
          {/* Máquina del tiempo individual visible en Scroll 11 */}
          <group ref={maquinaDelTiempoRef} visible={false}>
            <FlatIllustration
              url={ASSET_URLS.museo_maquintaDelTiempo}
              color="#ffffff"
              targetHeight={3.5}
              position={[0, -2.1, LAYER_Z.MAIN - 0.1]}
              renderOrder={1}
            />
          </group>
        </group>

        {/* ── REI (En la rama del árbol) ── */}
        <group
          ref={reiValdiviaRef}
          scale={[reiScale, reiScale, 1]}
          position={[reiX, reiY, 0]}
        >
          <FlatIllustration
            url={ASSET_URLS.rei_gecko8}
            targetHeight={11}
            placeholderAspect={worldWidth / 11}
            position={[0, 0, LAYER_Z.MAIN]}
            renderOrder={2}
            cropToWidth={worldWidth}
          />
        </group>

        {/* ── REI 4 (Parado / activo - Reducido a 4.0 de altura y movilizado a la derecha) ── */}
        <group
          ref={rei4ValdiviaRef}
          position={[rei4X, rei4Y, LAYER_Z.MAIN]}
        >
          <FlatIllustration
            url={ASSET_URLS.rei_gecko4}
            targetHeight={4.0}
            position={[0, 0, 0]}
            renderOrder={2}
          />
        </group>

        {/* Globo de Diálogo de la primera parte flotando sobre Rei (izquierda) */}
        <Html position={[reiX + 0.2, reiY + 2.3, LAYER_Z.MAIN]} center zIndexRange={[100, 0]}>
          <div ref={dialogBoxRef} className="scene__dialog-box scene__dialog-box--left" style={{ opacity: 0, display: 'none' }}>

            {/* Scroll 2 (Texto 1) */}
            <div ref={dialogue1Ref}>
              <p className="scene__dialog-title">
                Cultura Valdivia
              </p>
              <p className="scene__dialog-text">
                La cultura Valdivia marca el comienzo de la cultura aldeana, es una sociedad agrícola alfarera. ¿Sabías que ellos dan inicio a la elaboración de tejidos y de cerámica que hoy puedes observar en vasijas de barro y diversas figuras?
              </p>
            </div>

            {/* Scroll 3 (Texto 2) */}
            <div ref={dialogue2Ref} style={{ display: 'none' }}>
              <p className="scene__dialog-text">
                La cultura Valdivia desarrolla técnicas para mejorar sus condiciones de vida: el cultivo de nuevas especies de plantas y manejo de las aguas. Da inicio a la navegación y pesca, así como al intercambio de productos con otras regiones.
              </p>
            </div>

            {/* Scroll 4 (Texto 3) */}
            <div ref={dialogue3Ref} style={{ display: 'none' }}>
              <p className="scene__dialog-text">
                Sus integrantes viven en aldeas permanentes, donde edifican plazas y montículos que evidencian una conformación aldeana con centro ceremonial (estructuras de enterramientos y otras para reuniones).
              </p>
            </div>

            {/* Scroll 5 (Texto 4) */}
            <div ref={dialogue4Ref} style={{ display: 'none' }}>
              <p className="scene__dialog-text">
                Como ejemplo tenemos el asentamiento en el sitio Real Alto, en la parroquia Chanduy.
              </p>
            </div>

            <div className="scene__dialog-arrow"></div>
          </div>
        </Html>

        {/* Globo de Diálogo de la segunda parte flotando sobre Rei 4 (derecha) */}
        <Html position={[rei4X, rei4Y + 2.5, LAYER_Z.MAIN]} center zIndexRange={[100, 0]}>
          <div ref={dialogBoxRightRef} className="scene__dialog-box scene__dialog-box--right" style={{ opacity: 0, display: 'none' }}>

            {/* Scroll 7 (Texto 1 del Fondo 2) */}
            <div ref={dialogueRight1Ref}>
              <p className="scene__dialog-text">
                Los Valdivia también tallan en piedra y formas similares las hacen en barro cocido (cerámica).
              </p>
            </div>

            {/* Scroll 8 (Texto 2 del Fondo 2) */}
            <div ref={dialogueRight2Ref} style={{ display: 'none' }}>
              <p className="scene__dialog-text">
                Su cerámica se caracteriza por la elaboración de figuras con formas femeninas, de ahí la famosa figurina de Valdivia, que es un ícono de la fertilidad y prosperidad, usada como ofrenda votiva (promesa) o como un instrumento chamanístico.
              </p>
            </div>

            <div className="scene__dialog-arrow"></div>
          </div>
        </Html>

        {/* REI + DIÁLOGO para la máquina del tiempo en Valdivia */}
        <group ref={reiMaquinaGroupRef} position={[-worldWidth * 0.35, -2.7, LAYER_Z.MAIN]}>
          <group ref={reiMaquina1Ref}>
            <FlatIllustration url={ASSET_URLS.rei_gecko} color="#AA8855" targetHeight={4.0} position={[0, 0, 0]} renderOrder={2} />
          </group>
          <group ref={reiMaquina6Ref} visible={false}>
            <FlatIllustration url={ASSET_URLS.rei_gecko6} color="#AA8855" targetHeight={4.5} position={[0, 0.4, 0]} renderOrder={2} />
          </group>

          <Html position={[0, 2.5, 0]} center zIndexRange={[100, 0]}>
            <div ref={dialogBoxMaquinaRef} className="scene__dialog-box scene__dialog-box--left" style={{ opacity: 0, display: 'none' }}>
              <div ref={dialogueMaquinaRef}>
                <p className="scene__dialog-text">
                  Ahora vamos a trasladarnos 900 a.C. a 200 a.C.
                </p>
              </div>
              <div className="scene__dialog-arrow"></div>
            </div>
          </Html>
        </group>

      </group>
    </Suspense>
  )
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: EscenaChorrera (Escena 3 — 900 a.C. a 200 a.C.)
// ─────────────────────────────────────────────────────────────────────
function EscenaChorrera({ xOffset }) {
  const worldWidth = useWorldWidth()

  // Refs para cada grupo de Rei en el acantilado
  const rei1GroupRef = useRef(null)
  const rei3GroupRef = useRef(null)
  const rei7GroupRef = useRef(null)
  const rei2GroupRef = useRef(null)

  // Diálogos principales en el acantilado (a la derecha)
  const dialogBoxRef = useRef(null)
  const dialogue1Ref = useRef(null)
  const dialogue2Ref = useRef(null)
  const dialogue3Ref = useRef(null)
  const dialogue4Ref = useRef(null)
  const dialogue6Ref = useRef(null)
  const dialogue8Ref = useRef(null)
  const dialogue10Ref = useRef(null)
  const dialogue12Ref = useRef(null)

  // Elementos para el final de Chorrera (máquina del tiempo y transición)
  const fondoTransicionFondoRef = useRef(null)
  const maquinaDelTiempoRef = useRef(null)
  const reiMaquinaGroupRef = useRef(null)
  const dialogBoxMaquinaRef = useRef(null)
  const dialogueMaquina15Ref = useRef(null)
  const dialogueMaquina16Ref = useRef(null)
  const reiMaquina1Ref = useRef(null)
  const reiMaquina6Ref = useRef(null)

  const setGroupOpacity = (group, opacity) => {
    if (!group) return
    group.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.opacity = opacity
        child.material.transparent = true
      }
    })
  }

  useFrame(() => {
    const baseOpacity = gsapTarget.chorrera.reiOpacity
    // Aplicar las opacidades de cada Rei correspondiente
    setGroupOpacity(rei1GroupRef.current, gsapTarget.chorrera.rei1Opacity * baseOpacity)
    setGroupOpacity(rei3GroupRef.current, gsapTarget.chorrera.rei3Opacity * baseOpacity)
    setGroupOpacity(rei7GroupRef.current, gsapTarget.chorrera.rei7Opacity * baseOpacity)
    setGroupOpacity(rei2GroupRef.current, gsapTarget.chorrera.rei2Opacity * baseOpacity)

    const step = gsapTarget.chorrera.dialogueStep

    // Opacidad y visibilidad del diálogo principal
    if (dialogBoxRef.current) {
      const showDialog = (
        (step >= 1.0 && step < 5.0) ||
        (step >= 6.0 && step < 7.0) ||
        (step >= 8.0 && step < 9.0) ||
        (step >= 10.0 && step < 11.0) ||
        (step >= 12.0 && step < 13.0)
      ) && baseOpacity >= 0.01

      dialogBoxRef.current.style.opacity = baseOpacity
      dialogBoxRef.current.style.display = showDialog ? 'block' : 'none'
    }

    if (dialogue1Ref.current) dialogue1Ref.current.style.display = (step >= 1.0 && step < 2.0) ? 'block' : 'none'
    if (dialogue2Ref.current) dialogue2Ref.current.style.display = (step >= 2.0 && step < 3.0) ? 'block' : 'none'
    if (dialogue3Ref.current) dialogue3Ref.current.style.display = (step >= 3.0 && step < 4.0) ? 'block' : 'none'
    if (dialogue4Ref.current) dialogue4Ref.current.style.display = (step >= 4.0 && step < 5.0) ? 'block' : 'none'
    if (dialogue6Ref.current) dialogue6Ref.current.style.display = (step >= 6.0 && step < 7.0) ? 'block' : 'none'
    if (dialogue8Ref.current) dialogue8Ref.current.style.display = (step >= 8.0 && step < 9.0) ? 'block' : 'none'
    if (dialogue10Ref.current) dialogue10Ref.current.style.display = (step >= 10.0 && step < 11.0) ? 'block' : 'none'
    if (dialogue12Ref.current) dialogue12Ref.current.style.display = (step >= 12.0 && step < 13.0) ? 'block' : 'none'

    // Desplazamiento del fondo de transición
    if (fondoTransicionFondoRef.current) {
      fondoTransicionFondoRef.current.position.x = gsapTarget.chorrera.fondoTransicionX * worldWidth
    }

    // Máquina del tiempo
    if (maquinaDelTiempoRef.current) {
      const ms = gsapTarget.chorrera.maquinaScale
      maquinaDelTiempoRef.current.scale.set(ms, ms, ms)
      setGroupOpacity(maquinaDelTiempoRef.current, gsapTarget.chorrera.maquinaOpacity)
      maquinaDelTiempoRef.current.visible = (step >= 14.5)
    }

    // Rei en la máquina ( standing / walking / mounted )
    if (reiMaquinaGroupRef.current) {
      if (step >= 13.5) {
        reiMaquinaGroupRef.current.position.x = gsapTarget.chorrera.reiPositionX
      } else {
        reiMaquinaGroupRef.current.position.x = -worldWidth * 0.35
      }
      const rs = gsapTarget.chorrera.reiScale
      reiMaquinaGroupRef.current.scale.set(rs, rs, rs)
    }

    // Visibilidad de los sprites de Rei en la máquina
    if (reiMaquina1Ref.current) reiMaquina1Ref.current.visible = (step < 15.5)
    if (reiMaquina6Ref.current) reiMaquina6Ref.current.visible = (step >= 15.5)

    // Opacidades de Rei en la máquina
    setGroupOpacity(reiMaquina1Ref.current, gsapTarget.chorrera.reiMaquinaOpacity)
    setGroupOpacity(reiMaquina6Ref.current, gsapTarget.chorrera.reiMountedOpacity)

    // Globo de diálogo de la máquina
    if (dialogBoxMaquinaRef.current) {
      const showDialogMaquina = step >= 14.0 && step < 17.0
      dialogBoxMaquinaRef.current.style.display = showDialogMaquina ? 'block' : 'none'

      const dialogOpacity = Math.max(gsapTarget.chorrera.reiMaquinaOpacity, gsapTarget.chorrera.reiMountedOpacity)
      dialogBoxMaquinaRef.current.style.opacity = dialogOpacity
    }
    if (dialogueMaquina15Ref.current) dialogueMaquina15Ref.current.style.display = (step >= 14.0 && step < 15.5) ? 'block' : 'none'
    if (dialogueMaquina16Ref.current) dialogueMaquina16Ref.current.style.display = (step >= 15.5 && step < 17.0) ? 'block' : 'none'
  })

  return (
    <Suspense fallback={<SceneFallback />}>
      <group position={[xOffset, 0, 0]}>

        {/* ── Amanecer dorado, cerámica silbante ── */}
        <FlatIllustration
          url={ASSET_URLS.chorreraFondo}
          targetHeight={11}
          placeholderAspect={worldWidth / 11}
          position={[0, 0, LAYER_Z.SKY]}
          renderOrder={0}
          cropToWidth={worldWidth}
        />

        {/* ── TRANSICIÓN AL FINAL DE CHORRERA (Fondo transicion.webp) ── */}
        <group ref={fondoTransicionFondoRef}>
          <FlatIllustration
            url={ASSET_URLS.lasVegasTransicion}
            color="#5C2D1A"
            targetHeight={11}
            placeholderAspect={worldWidth / 11}
            position={[0, 0, LAYER_Z.SKY + 0.2]}
            renderOrder={1}
            cropToWidth={worldWidth}
          />
          {/* Máquina del tiempo replica */}
          <group ref={maquinaDelTiempoRef} visible={false}>
            <FlatIllustration
              url={ASSET_URLS.museo_maquintaDelTiempo}
              targetHeight={3.5}
              position={[0, -1, LAYER_Z.MAIN - 0.1]}
              renderOrder={1}
            />
          </group>
        </group>

        {/* ── REI (En el acantilado/derecha) ── */}
        {/* Usamos grupos separados para cada textura de Rei para poder animar sus opacidades de forma individual */}
        <group ref={rei1GroupRef} position={[-worldWidth * -0.30, -1.3, LAYER_Z.MAIN]}>
          <FlatIllustration
            url={ASSET_URLS.rei_gecko}
            color="#AA8855"
            targetHeight={4.0}
            position={[0, 0, 0]}
            renderOrder={2}
          />
        </group>

        <group ref={rei3GroupRef} position={[-worldWidth * -0.30, -1.3, LAYER_Z.MAIN]}>
          <FlatIllustration
            url={ASSET_URLS.rei_gecko3}
            color="#AA8855"
            targetHeight={4.0}
            position={[0, 0, 0]}
            renderOrder={2}
          />
        </group>

        <group ref={rei7GroupRef} position={[-worldWidth * -0.30, -1.3, LAYER_Z.MAIN]}>
          <FlatIllustration
            url={ASSET_URLS.rei_gecko7}
            color="#AA8855"
            targetHeight={4.0}
            position={[0, 0, 0]}
            renderOrder={2}
          />
        </group>

        <group ref={rei2GroupRef} position={[-worldWidth * -0.30, -1.3, LAYER_Z.MAIN]}>
          <FlatIllustration
            url={ASSET_URLS.rei_gecko2}
            color="#AA8855"
            targetHeight={4.0}
            position={[0, 0, 0]}
            renderOrder={2}
          />
        </group>

        {/* Globo de Diálogo flotando sobre los Reis (derecha) */}
        <group position={[-worldWidth * -0.30, -1.3, LAYER_Z.MAIN]}>
          <Html position={[0, 2.5, 0]} center zIndexRange={[100, 0]}>
            <div ref={dialogBoxRef} className="scene__dialog-box scene__dialog-box--right" style={{ opacity: 0, display: 'none' }}>

              {/* Scroll 1 */}
              <div ref={dialogue1Ref}>
                <p className="scene__dialog-title">Cultura Chorrera (Fase Engoroy)</p>
                <p className="scene__dialog-text">
                  Engoroy se le denomina a una fase de la cultura del período Chorrera.
                </p>
              </div>

              {/* Scroll 2 */}
              <div ref={dialogue2Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  porque fabrica sus vasijas ceremoniales de manera diferente a las de Manabí y la cuenca del Guayas, mantiene su propia cultura.
                </p>
              </div>

              {/* Scroll 3 */}
              <div ref={dialogue3Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Las evidencias arqueológicas demuestran que sus integrantes son buenos pescadores, agricultores con tecnologías eficaces, artesanos excelentes y realizan el intercambio de materiales preciosos como la obsidiana y la concha marina spondylus.
                </p>
              </div>

              {/* Scroll 4 */}
              <div ref={dialogue4Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  En su cerámica representan a seres humanos, animales and plantas, con fines ceremoniales.
                </p>
              </div>

              {/* Scroll 6 */}
              <div ref={dialogue6Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Es en La Libertad donde la comunidad de Engoroy se asienta principalmente sobre el acantilado, cerca de La Caleta.
                </p>
              </div>

              {/* Scroll 8 */}
              <div ref={dialogue8Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  ¿Sabías que ellos construyeron una gran albarrada llamada Achallán, considerada el monumento arqueológico más grande de la Península?
                </p>
              </div>

              {/* Scroll 10 */}
              <div ref={dialogue10Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Una albarrada es una gran estructura de muros de tierra con un amplio pozo de contención, o también llamada hondonada, donde almacenan agua en los tiempos de estación seca (en verano).
                </p>
              </div>

              {/* Scroll 12 */}
              <div ref={dialogue12Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Los cultivos de su alrededor alimentan el subsuelo y enriquecen los pozos de agua, permitiendo la permeabilidad de la lluvia durante la estación del invierno.
                </p>
              </div>

              <div className="scene__dialog-arrow"></div>
            </div>
          </Html>
        </group>

        {/* REI + DIÁLOGO para la máquina del tiempo al final de Chorrera */}
        <group ref={reiMaquinaGroupRef} position={[-worldWidth * 0.25, -1.3, LAYER_Z.MAIN]}>
          <group ref={reiMaquina1Ref}>
            <FlatIllustration url={ASSET_URLS.rei_gecko} color="#AA8855" targetHeight={4.0} position={[0, 0, 0]} renderOrder={2} />
          </group>
          <group ref={reiMaquina6Ref} visible={false}>
            <FlatIllustration url={ASSET_URLS.rei_gecko6} color="#AA8855" targetHeight={4.5} position={[0, 0.4, 0]} renderOrder={2} />
          </group>

          <Html position={[0, 2.5, 0]} center zIndexRange={[100, 0]}>
            <div ref={dialogBoxMaquinaRef} className="scene__dialog-box scene__dialog-box--left" style={{ opacity: 0, display: 'none' }}>
              <div ref={dialogueMaquina15Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Hasta aquí hemos recorrido las sociedades cazadoras recolectoras, Período Precerámico, y las sociedades agricultoras alfareras, denominado Período Formativo.
                </p>
              </div>
              <div ref={dialogueMaquina16Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Ahora te invito a recorrer a nuevas sociedades, mucho más complejas y más organizadas social, política y económicamente.
                </p>
              </div>
              <div className="scene__dialog-arrow"></div>
            </div>
          </Html>
        </group>

      </group>
    </Suspense>
  )
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: EscenaGuangala (Escena 4 — 200 a.C. a 800 d.C.)
// ─────────────────────────────────────────────────────────────────────
function EscenaGuangala({ xOffset }) {
  const worldWidth = useWorldWidth()

  // Refs para cada grupo de Rei (izquierda)
  const rei1GroupRef = useRef(null)
  const rei2GroupRef = useRef(null)

  // Diálogos principales (a la izquierda)
  const dialogBoxRef = useRef(null)
  const dialogue2Ref = useRef(null)
  const dialogue3Ref = useRef(null)
  const dialogue5Ref = useRef(null)
  const dialogue6Ref = useRef(null)
  const dialogue7Ref = useRef(null)

  // Elementos para el final de Guangala (máquina del tiempo y transición)
  const fondoTransicionFondoRef = useRef(null)
  const maquinaDelTiempoRef = useRef(null)
  const reiMaquinaGroupRef = useRef(null)
  const dialogBoxMaquinaRef = useRef(null)
  const dialogueMaquina9Ref = useRef(null)
  const dialogueMaquina10Ref = useRef(null)
  const reiMaquina1Ref = useRef(null)
  const reiMaquina6Ref = useRef(null)

  const setGroupOpacity = (group, opacity) => {
    if (!group) return
    group.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.opacity = opacity
        child.material.transparent = true
      }
    })
  }

  useFrame(() => {
    const baseOpacity = gsapTarget.guangala.reiOpacity
    // Aplicar las opacidades de cada Rei correspondiente (ambos a la izquierda)
    setGroupOpacity(rei1GroupRef.current, gsapTarget.guangala.rei1Opacity * baseOpacity)
    setGroupOpacity(rei2GroupRef.current, gsapTarget.guangala.rei2Opacity * baseOpacity)

    const step = gsapTarget.guangala.dialogueStep

    // Opacidad y visibilidad del diálogo principal
    if (dialogBoxRef.current) {
      const showDialog = (
        (step >= 2.0 && step < 4.0) ||
        (step >= 5.0 && step < 8.0)
      ) && baseOpacity >= 0.01

      dialogBoxRef.current.style.opacity = baseOpacity
      dialogBoxRef.current.style.display = showDialog ? 'block' : 'none'
    }

    if (dialogue2Ref.current) dialogue2Ref.current.style.display = (step >= 2.0 && step < 3.0) ? 'block' : 'none'
    if (dialogue3Ref.current) dialogue3Ref.current.style.display = (step >= 3.0 && step < 4.0) ? 'block' : 'none'
    if (dialogue5Ref.current) dialogue5Ref.current.style.display = (step >= 5.0 && step < 6.0) ? 'block' : 'none'
    if (dialogue6Ref.current) dialogue6Ref.current.style.display = (step >= 6.0 && step < 7.0) ? 'block' : 'none'
    if (dialogue7Ref.current) dialogue7Ref.current.style.display = (step >= 7.0 && step < 8.0) ? 'block' : 'none'

    // Desplazamiento del fondo de transición
    if (fondoTransicionFondoRef.current) {
      fondoTransicionFondoRef.current.position.x = gsapTarget.guangala.fondoTransicionX * worldWidth
    }

    // Máquina del tiempo
    if (maquinaDelTiempoRef.current) {
      const ms = gsapTarget.guangala.maquinaScale
      maquinaDelTiempoRef.current.scale.set(ms, ms, ms)
      setGroupOpacity(maquinaDelTiempoRef.current, gsapTarget.guangala.maquinaOpacity)
      maquinaDelTiempoRef.current.visible = (step >= 9.5)
    }

    // Rei en la máquina ( standing / walking / mounted )
    if (reiMaquinaGroupRef.current) {
      if (step >= 8.5) {
        reiMaquinaGroupRef.current.position.x = gsapTarget.guangala.reiPositionX
      } else {
        reiMaquinaGroupRef.current.position.x = -worldWidth * 0.35
      }
      const rs = gsapTarget.guangala.reiScale
      reiMaquinaGroupRef.current.scale.set(rs, rs, rs)
    }

    // Visibilidad de los sprites de Rei en la máquina
    if (reiMaquina1Ref.current) reiMaquina1Ref.current.visible = (step < 10.5)
    if (reiMaquina6Ref.current) reiMaquina6Ref.current.visible = (step >= 10.5)

    // Opacidades de Rei en la máquina
    setGroupOpacity(reiMaquina1Ref.current, gsapTarget.guangala.reiMaquinaOpacity)
    setGroupOpacity(reiMaquina6Ref.current, gsapTarget.guangala.reiMountedOpacity)

    // Globo de diálogo de la máquina
    if (dialogBoxMaquinaRef.current) {
      const showDialogMaquina = step >= 9.0 && step < 11.0
      dialogBoxMaquinaRef.current.style.display = showDialogMaquina ? 'block' : 'none'

      const dialogOpacity = Math.max(gsapTarget.guangala.reiMaquinaOpacity, gsapTarget.guangala.reiMountedOpacity)
      dialogBoxMaquinaRef.current.style.opacity = dialogOpacity
    }
    if (dialogueMaquina9Ref.current) dialogueMaquina9Ref.current.style.display = (step >= 9.0 && step < 10.0) ? 'block' : 'none'
    if (dialogueMaquina10Ref.current) dialogueMaquina10Ref.current.style.display = (step >= 10.0 && step < 11.0) ? 'block' : 'none'
  })

  return (
    <Suspense fallback={<SceneFallback />}>
      <group position={[xOffset, 0, 0]}>

        {/* ── Cultura Guangala Fondo ── */}
        <FlatIllustration
          url={ASSET_URLS.guangalaFondo}
          targetHeight={11}
          placeholderAspect={worldWidth / 11}
          position={[0, 0, LAYER_Z.SKY]}
          renderOrder={0}
          cropToWidth={worldWidth}
        />

        {/* ── TRANSICIÓN AL FINAL DE GUANGALA (Fondo transicion.webp) ── */}
        <group ref={fondoTransicionFondoRef}>
          <FlatIllustration
            url={ASSET_URLS.guangalaTransicion}
            color="#5C2D1A"
            targetHeight={11}
            placeholderAspect={worldWidth / 11}
            position={[0, 0, LAYER_Z.SKY + 0.2]}
            renderOrder={1}
            cropToWidth={worldWidth}
          />
          {/* Máquina del tiempo replica */}
          <group ref={maquinaDelTiempoRef} visible={false}>
            <FlatIllustration
              url={ASSET_URLS.museo_maquintaDelTiempo}
              targetHeight={3.5}
              position={[0, -2, LAYER_Z.MAIN - 0.1]}
              renderOrder={1}
            />
          </group>
        </group>

        {/* ── REI (En el acantilado/izquierda) ── */}
        {/* Usamos grupos separados para cada textura de Rei para poder animar sus opacidades de forma individual */}
        <group ref={rei2GroupRef} position={[-worldWidth * 0.30, -2.8, LAYER_Z.MAIN]}>
          <FlatIllustration
            url={ASSET_URLS.rei_gecko2}
           
            targetHeight={4.0}
            position={[0, 0, 0]}
            renderOrder={2}
          />
        </group>

        <group ref={rei1GroupRef} position={[-worldWidth * 0.30, -2.8, LAYER_Z.MAIN]}>
          <FlatIllustration
            url={ASSET_URLS.rei_gecko}
            color="#AA8855"
            targetHeight={4.0}
            position={[0, 0, 0]}
            renderOrder={2}
          />
        </group>

        {/* Globo de Diálogo flotando sobre los Reis (izquierda) */}
        <group position={[-worldWidth * 0.30, -2.5, LAYER_Z.MAIN]}>
          <Html position={[0, 2.5, 0]} center zIndexRange={[100, 0]}>
            <div ref={dialogBoxRef} className="scene__dialog-box scene__dialog-box--left" style={{ opacity: 0, display: 'none' }}>

              {/* Scroll 2 */}
              <div ref={dialogue2Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-title">Cultura Guangala</p>
                <p className="scene__dialog-text">
                  En esta cultura llamada Guangala
                </p>
              </div>

              {/* Scroll 3 */}
              <div ref={dialogue3Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  surgen los centros poblados y áreas periféricas, es una sociedad cacical inicial en la que el personaje principal es el cacique chamán con poder y capacidad de convocatoria para realizar obras y organizar la producción, que marcan la existencia de jefes, sacerdotes, especialistas.
                </p>
              </div>

              {/* Scroll 5 */}
              <div ref={dialogue5Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Desarrollan una actividad agrícola a gran escala, surge el trabajo en metales y la fabricación de cerámica con riqueza simbólica.
                </p>
              </div>

              {/* Scroll 6 */}
              <div ref={dialogue6Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Se intensifica el comercio entre la Costa, la Sierra y la Amazonía.
                </p>
              </div>

              {/* Scroll 7 */}
              <div ref={dialogue7Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Los centros ceremoniales son el escenario de sus rituales, donde el felino, la serpiente, el águila y el caimán son las deidades más veneradas
                </p>
              </div>

              <div className="scene__dialog-arrow"></div>
            </div>
          </Html>
        </group>

        {/* REI + DIÁLOGO para la máquina del tiempo al final de Guangala */}
        <group ref={reiMaquinaGroupRef} position={[-worldWidth * 0.25, -1.3, LAYER_Z.MAIN]}>
          <group ref={reiMaquina1Ref}>
            <FlatIllustration url={ASSET_URLS.rei_gecko} color="#AA8855" targetHeight={4.0} position={[0, 0, 0]} renderOrder={2} />
          </group>
          <group ref={reiMaquina6Ref} visible={false}>
            <FlatIllustration url={ASSET_URLS.rei_gecko6} color="#AA8855" targetHeight={4.5} position={[0, 0.4, 0]} renderOrder={2} />
          </group>

          <Html position={[0, 2.5, 0]} center zIndexRange={[100, 0]}>
            <div ref={dialogBoxMaquinaRef} className="scene__dialog-box scene__dialog-box--left" style={{ opacity: 0, display: 'none' }}>
              <div ref={dialogueMaquina9Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Hemos recorrido la cultura Guangala con sus asombrosos desarrollos en cerámica y metalurgia.
                </p>
              </div>
              <div ref={dialogueMaquina10Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  ¡Ahora prepárate para viajar a la época de los señoríos Manteño-Guancavilcas!
                </p>
              </div>
              <div className="scene__dialog-arrow"></div>
            </div>
          </Html>
        </group>

      </group>
    </Suspense>
  )
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: EscenaManteno (Escena 5 — 800 d.C. a 1530 d.C.)
// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: EscenaManteno (Escena 5 — 800 d.C. a 1530 d.C.)
// ─────────────────────────────────────────────────────────────────────
function EscenaManteno({ xOffset }) {
  const worldWidth = useWorldWidth()

  // Refs para cada grupo de Rei (izquierda)
  const rei1GroupRef = useRef(null) // Rei.webp
  const rei2GroupRef = useRef(null) // Rei2.webp
  const rei4GroupRef = useRef(null) // Rei4.webp

  // Diálogos principales (a la izquierda)
  const dialogBoxRef = useRef(null)
  const dialogue2Ref = useRef(null)
  const dialogue3Ref = useRef(null)
  const dialogue5Ref = useRef(null)
  const dialogue6Ref = useRef(null)
  const dialogue7Ref = useRef(null)
  const dialogue8Ref = useRef(null)
  const dialogue9Ref = useRef(null)
  const dialogue12Ref = useRef(null)
  const dialogue13Ref = useRef(null)
  const dialogue14Ref = useRef(null)
  const dialogue15Ref = useRef(null)
  const dialogue16Ref = useRef(null)

  // Elementos para el final de Manteño (máquina del tiempo y transición)
  const fondo2Ref = useRef(null)
  const fondoTransicionFondoRef = useRef(null)
  const maquinaDelTiempoRef = useRef(null)
  const reiMaquinaGroupRef = useRef(null)
  const dialogBoxMaquinaRef = useRef(null)
  const dialogueMaquina17Ref = useRef(null)
  const dialogueMaquina19Ref = useRef(null)
  const reiMaquina5Ref = useRef(null) // Rei5.webp
  const reiMaquinaMountedRef = useRef(null) // Rei6.webp (montado)
  const dialogBoxMaquinaMountedRef = useRef(null) // Globo dialog montado

  const setGroupOpacity = (group, opacity) => {
    if (!group) return
    group.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.opacity = opacity
        child.material.transparent = true
      }
    })
  }

  useFrame(() => {
    const baseOpacity = gsapTarget.manteno.reiOpacity

    // Aplicar las opacidades de cada Rei correspondiente
    setGroupOpacity(rei2GroupRef.current, gsapTarget.manteno.rei2Opacity * baseOpacity)
    setGroupOpacity(rei4GroupRef.current, gsapTarget.manteno.rei4Opacity * baseOpacity)
    setGroupOpacity(rei1GroupRef.current, gsapTarget.manteno.rei1Opacity * baseOpacity)

    // Posición del fondo deslizable 2
    if (fondo2Ref.current) {
      fondo2Ref.current.position.x = gsapTarget.manteno.fondo2X * worldWidth
    }

    // Posición del fondo de transición
    if (fondoTransicionFondoRef.current) {
      fondoTransicionFondoRef.current.position.x = gsapTarget.manteno.fondoTransicionX * worldWidth
    }

    const step = gsapTarget.manteno.dialogueStep

    // Opacidad y visibilidad del diálogo principal
    if (dialogBoxRef.current) {
      const showDialog = (
        (step >= 2.0 && step < 4.0) ||
        (step >= 5.0 && step < 10.0) ||
        (step >= 12.0 && step < 17.0)
      ) && baseOpacity >= 0.01

      dialogBoxRef.current.style.opacity = baseOpacity
      dialogBoxRef.current.style.display = showDialog ? 'block' : 'none'
    }

    if (dialogue2Ref.current) dialogue2Ref.current.style.display = (step >= 2.0 && step < 3.0) ? 'block' : 'none'
    if (dialogue3Ref.current) dialogue3Ref.current.style.display = (step >= 3.0 && step < 4.0) ? 'block' : 'none'
    if (dialogue5Ref.current) dialogue5Ref.current.style.display = (step >= 5.0 && step < 6.0) ? 'block' : 'none'
    if (dialogue6Ref.current) dialogue6Ref.current.style.display = (step >= 6.0 && step < 7.0) ? 'block' : 'none'
    if (dialogue7Ref.current) dialogue7Ref.current.style.display = (step >= 7.0 && step < 8.0) ? 'block' : 'none'
    if (dialogue8Ref.current) dialogue8Ref.current.style.display = (step >= 8.0 && step < 9.0) ? 'block' : 'none'
    if (dialogue9Ref.current) dialogue9Ref.current.style.display = (step >= 9.0 && step < 10.0) ? 'block' : 'none'
    if (dialogue12Ref.current) dialogue12Ref.current.style.display = (step >= 12.0 && step < 13.0) ? 'block' : 'none'
    if (dialogue13Ref.current) dialogue13Ref.current.style.display = (step >= 13.0 && step < 14.0) ? 'block' : 'none'
    if (dialogue14Ref.current) dialogue14Ref.current.style.display = (step >= 14.0 && step < 15.0) ? 'block' : 'none'
    if (dialogue15Ref.current) dialogue15Ref.current.style.display = (step >= 15.0 && step < 16.0) ? 'block' : 'none'
    if (dialogue16Ref.current) dialogue16Ref.current.style.display = (step >= 16.0 && step < 17.0) ? 'block' : 'none'

    // Máquina del tiempo
    if (maquinaDelTiempoRef.current) {
      const ms = gsapTarget.manteno.maquinaScale
      maquinaDelTiempoRef.current.scale.set(ms, ms, ms)
      setGroupOpacity(maquinaDelTiempoRef.current, gsapTarget.manteno.maquinaOpacity)
      maquinaDelTiempoRef.current.visible = (step >= 17.5)
    }

    // Rei en la máquina (standing / mounted)
    if (reiMaquinaGroupRef.current) {
      if (step >= 17.5) {
        reiMaquinaGroupRef.current.position.x = gsapTarget.manteno.reiPositionX
      } else {
        reiMaquinaGroupRef.current.position.x = -worldWidth * 0.35
      }
      const rs = gsapTarget.manteno.reiScale
      reiMaquinaGroupRef.current.scale.set(rs, rs, rs)
    }

    // Visibilidad de los sprites de Rei en la máquina
    if (reiMaquina5Ref.current) reiMaquina5Ref.current.visible = (step < 18.5)
    if (reiMaquinaMountedRef.current) reiMaquinaMountedRef.current.visible = (step >= 18.5)

    // Opacidades de Rei en la máquina
    setGroupOpacity(reiMaquina5Ref.current, gsapTarget.manteno.reiMaquinaOpacity)
    setGroupOpacity(reiMaquinaMountedRef.current, gsapTarget.manteno.reiMountedOpacity)

    // Globo de diálogo de la máquina (parado - X = 7)
    if (dialogBoxMaquinaRef.current) {
      const showDialogMaquina = (step >= 17.0 && step < 18.5)
      dialogBoxMaquinaRef.current.style.display = showDialogMaquina ? 'block' : 'none'
      dialogBoxMaquinaRef.current.style.opacity = gsapTarget.manteno.reiMaquinaOpacity
    }
    if (dialogueMaquina17Ref.current) dialogueMaquina17Ref.current.style.display = (step >= 17.0 && step < 18.5) ? 'block' : 'none'

    // Globo de diálogo de la máquina (montado - X = 0)
    if (dialogBoxMaquinaMountedRef.current) {
      const showDialogMounted = (step >= 18.5 && step <= 20.5)
      dialogBoxMaquinaMountedRef.current.style.display = showDialogMounted ? 'block' : 'none'
      dialogBoxMaquinaMountedRef.current.style.opacity = gsapTarget.manteno.reiMountedOpacity
    }
    if (dialogueMaquina19Ref.current) dialogueMaquina19Ref.current.style.display = (step >= 18.5 && step <= 20.5) ? 'block' : 'none'
  })

  return (
    <Suspense fallback={<SceneFallback />}>
      <group position={[xOffset, 0, 0]}>

        {/* ── Cultura Manteño Fondo ── */}
        <FlatIllustration
          url={ASSET_URLS.mantenoFondo}
          targetHeight={11}
          placeholderAspect={worldWidth / 11}
          position={[0, 0, LAYER_Z.SKY]}
          renderOrder={0}
          cropToWidth={worldWidth}
        />

        {/* ── Cultura Manteño Fondo 2 (Deslizable) ── */}
        <group ref={fondo2Ref}>
          <FlatIllustration
            url={ASSET_URLS.mantenoFondo2}
            targetHeight={11}
            placeholderAspect={worldWidth / 11}
            position={[0, 0, LAYER_Z.SKY + 0.1]}
            renderOrder={1}
            cropToWidth={worldWidth}
          />
        </group>

        {/* ── TRANSICIÓN AL FINAL DE MANTEÑO (Fondo transicion.webp) ── */}
        <group ref={fondoTransicionFondoRef}>
          <FlatIllustration
            url={ASSET_URLS.mantenoTransicion}
            color="#5C2D1A"
            targetHeight={11}
            placeholderAspect={worldWidth / 11}
            position={[0, 0, LAYER_Z.SKY + 0.2]}
            renderOrder={2}
            cropToWidth={worldWidth}
          />
          {/* Máquina del tiempo replica */}
          <group ref={maquinaDelTiempoRef} visible={false}>
            <FlatIllustration
              url={ASSET_URLS.museo_maquintaDelTiempo}
              targetHeight={3.5}
              position={[0, -2, LAYER_Z.MAIN - 0.1]}
              renderOrder={1}
            />
          </group>
        </group>

        {/* ── REI (A la izquierda) ── */}
        <group ref={rei2GroupRef} position={[-worldWidth * 0.30, -2.8, LAYER_Z.MAIN]}>
          <FlatIllustration
            url={ASSET_URLS.rei_gecko2}
            targetHeight={4.0}
            position={[0, 0, 0]}
            renderOrder={2}
          />
        </group>

        <group ref={rei4GroupRef} position={[-worldWidth * 0.30, -2.8, LAYER_Z.MAIN]}>
          <FlatIllustration
            url={ASSET_URLS.rei_gecko4}
            targetHeight={4.0}
            position={[0, 0, 0]}
            renderOrder={2}
          />
        </group>

        <group ref={rei1GroupRef} position={[-worldWidth * 0.30, -2.8, LAYER_Z.MAIN]}>
          <FlatIllustration
            url={ASSET_URLS.rei_gecko}
            targetHeight={4.0}
            position={[0, 0, 0]}
            renderOrder={2}
          />
        </group>

        {/* Globo de Diálogo flotando sobre los Reis (izquierda) */}
        <group position={[-worldWidth * 0.30, -2.5, LAYER_Z.MAIN]}>
          <Html position={[0, 2.5, 0]} center zIndexRange={[100, 0]}>
            <div ref={dialogBoxRef} className="scene__dialog-box scene__dialog-box--left" style={{ opacity: 0, display: 'none' }}>

              {/* Scroll 2 */}
              <div ref={dialogue2Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-title">Señoríos Manteño-Guancavilcas</p>
                <p className="scene__dialog-text">
                  Los Manteño Guancavilcas
                </p>
              </div>

              {/* Scroll 3 */}
              <div ref={dialogue3Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  construyen grandes centros urbanos, separados del sector agrícola.
                </p>
              </div>

              {/* Scroll 5 */}
              <div ref={dialogue5Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Manejan una economía mixta, lo que significa que la proximidad al mar les permite pescar y en las tierras más altas, cazar y cultivar, construyendo terrazas en las laderas de los cerros.
                </p>
              </div>

              {/* Scroll 6 */}
              <div ref={dialogue6Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Continúa la división urbano-rural, en la cual las ciudades están organizadas por gremios (tejedores, escultores, ceramistas). Los navegantes mercaderes constituyen una clase social privilegiada.
                </p>
              </div>

              {/* Scroll 7 */}
              <div ref={dialogue7Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Esta sociedad también desarrolla la agricultura por cultivo de terrazas, facilitando los cultivos para todo el año, aprovechando el agua del verano costeño.
                </p>
              </div>

              {/* Scroll 8 */}
              <div ref={dialogue8Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Perfeccionan el sistema de navegación marítima con grandes balsas usadas para el intercambio y comercio entre lo que hoy es Chile, al sur, y el Golfo de California, al norte, pues el nivel de especialistas en este ámbito consolida una red de intercambio a larga distancia, a través de la Liga de Mercaderes.
                </p>
              </div>

              {/* Scroll 9 */}
              <div ref={dialogue9Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  El principal artículo de intercambio es la concha spondylus, muy codiciada en todas partes.
                </p>
              </div>

              {/* Scroll 12 */}
              <div ref={dialogue12Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Realizan escultura en piedra y madera.
                </p>
              </div>

              {/* Scroll 13 */}
              <div ref={dialogue13Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Su escultura en piedra más destacada: sus asientos en forma de U, que son emblemas de poder de los individuos que los utilizan.
                </p>
              </div>

              {/* Scroll 14 */}
              <div ref={dialogue14Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  En madera realizan los postes tallados de Guasango, en los que aparecen figuras humanas y animales en forma de lagartos.
                </p>
              </div>

              {/* Scroll 15 */}
              <div ref={dialogue15Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Como ejemplo tenemos dos de los postes representativos encontrados en el Cerro Los Santos, en las estribaciones de la cordillera Chongón Colonche.
                </p>
              </div>

              {/* Scroll 16 */}
              <div ref={dialogue16Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  Uno es el poste menor que está en el Museo Amantes de Sumpa, que mide 2,93 m y tiene tres figuras antropomorfas, y el Guasango Mayor, que se encuentra en Guayaquil, en el Museo Municipal, que mide aproximadamente 8,50 m.
                </p>
              </div>

              <div className="scene__dialog-arrow"></div>
            </div>
          </Html>
        </group>

        {/* REI + DIÁLOGO para la máquina del tiempo al final de Manteño */}
        <group ref={reiMaquinaGroupRef} position={[-worldWidth * 0, 0, LAYER_Z.MAIN]}>
          <group ref={reiMaquina5Ref}>
            <FlatIllustration url={ASSET_URLS.rei_gecko5} targetHeight={4.0} position={[7, -2, 0]} renderOrder={2} />
          </group>
          <group ref={reiMaquinaMountedRef} visible={false}>
            <FlatIllustration url={ASSET_URLS.rei_gecko6} targetHeight={4.5} position={[0, -2, 0]} renderOrder={2} />
          </group>

          {/* Globo para Rei parado (X = 7) */}
          <Html position={[7, 0, 0]} center zIndexRange={[100, 0]}>
            <div ref={dialogBoxMaquinaRef} className="scene__dialog-box scene__dialog-box--right" style={{ opacity: 0, display: 'none' }}>
              <div ref={dialogueMaquina17Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  ¡Y esto ha sido todo por nuestro viaje! Muchísimas gracias por acompañarme.
                </p>
              </div>
              <div className="scene__dialog-arrow"></div>
            </div>
          </Html>

          {/* Globo para Rei montado (X = 0) */}
          <Html position={[0, 0, 0]} center zIndexRange={[100, 0]}>
            <div ref={dialogBoxMaquinaMountedRef} className="scene__dialog-box" style={{ opacity: 0, display: 'none' }}>
              <div ref={dialogueMaquina19Ref} style={{ display: 'none' }}>
                <p className="scene__dialog-text">
                  ¡Vamos de regreso a casa!
                </p>
              </div>
              <div className="scene__dialog-arrow"></div>
            </div>
          </Html>
        </group>

      </group>
    </Suspense>
  )
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: SceneReadyNotifier
// Detecta cuándo se han renderizado los primeros fotogramas y levanta el velo.
// ─────────────────────────────────────────────────────────────────────
function SceneReadyNotifier() {
  const setDioramaListo = useMuseoStore(s => s.setDioramaListo)
  const frameCount = useRef(0)

  useFrame(() => {
    if (frameCount.current < 2) {
      frameCount.current++
      if (frameCount.current === 2) {
        setDioramaListo(true)
      }
    }
  })

  return null
}

// ─────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL: DioramaScene
// ─────────────────────────────────────────────────────────────────────
/**
 * Orquesta todas las escenas del diorama.
 * La cámara ortográfica se desplaza; los grupos permanecen fijos.
 *
 * useFrame lee gsapTarget.scene.blend para el parallax vertical sutil
 * entre escenas — completamente fuera del estado de React.
 */
export function DioramaScene() {
  const groupRef = useRef()
  const { size } = useThree()

  // Usamos la MISMA fórmula que en ScrollNarrativeSetup para garantizar consistencia absoluta
  const spacing = (size.width / size.height) * FRUSTUM_HEIGHT

  // Ya no se necesita precarga diferida: ALL_TEXTURE_URLS preload a nivel de módulo
  // cubre todas las escenas porque los WebP son suficientemente livianos (~3MB total).

  useFrame(() => {
    if (!groupRef.current) return

    /**
     * PATRÓN DUMMY TARGET (lectura transitoria):
     * blend ∈ [0,1] es la mezcla entre la escena actual y la siguiente.
     * Sin gsapTarget esto requeriría estado de React → re-renders.
     * Con gsapTarget → solo escritura directa en Three.js → 0 re-renders.
     */
    const blend = gsapTarget.scene.blend
    // Parallax vertical sutil: las capas "flotan" levemente al transicionar
    groupRef.current.position.y = Math.sin(blend * Math.PI) * 0.04
  })

  return (
    <group ref={groupRef}>
      {/*
        Dividimos cada era/escena en su propio límite de Suspense.
        Esto permite que la EscenaIntroduccion (El Museo) se pinte inmediatamente
        en cuanto terminen de cargarse sus propios recursos, sin tener que esperar
        a que se completen las descargas de las escenas posteriores (que ocurren
        de fondo de forma asíncrona).
      */}
      <Suspense fallback={null}>
        <EscenaIntroduccion xOffset={-0 * spacing} />
        <SceneReadyNotifier />
      </Suspense>
      <Suspense fallback={null}>
        <EscenaLasVegas xOffset={-1 * spacing} />
      </Suspense>
      <Suspense fallback={null}>
        <EscenaValdivia xOffset={-2 * spacing} />
      </Suspense>
      <Suspense fallback={null}>
        <EscenaChorrera xOffset={-3 * spacing} />
      </Suspense>
      <Suspense fallback={null}>
        <EscenaGuangala xOffset={-4 * spacing} />
      </Suspense>
      <Suspense fallback={null}>
        <EscenaManteno xOffset={-5 * spacing} />
      </Suspense>
    </group>
  )
}

