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
 *  Escena 1 → X =  -8   (Las Vegas — 8000 a.C.)
 *  Escena 2 → X = -16   (Valdivia — 3500 a.C.)
 *  Escena 3 → X = -24   (Machalilla — 1500 a.C.)
 *  Escena 4 → X = -32   (Chorrera — 900 a.C.)
 *  Escena 5 → X = -40   (Bahía / Guangala — 500 a.C.)
 *  Escena 6 → X = -48   (Manteño — 800 d.C.)
 *  Escena 7 → X = -56   (Contacto — 1530 d.C.)
 */

import React, { Suspense, useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture, Html } from '@react-three/drei'
import { FlatIllustration } from './FlatIllustration'
import { SceneFallback } from './SceneFallback'
import { gsapTarget } from '../animation/gsapTarget'

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
  rei_gecko:               '/assets/Rei.webp',
  rei_gecko2:              '/assets/Rei2.webp',
  rei_gecko3:              '/assets/Rei3.webp',
  rei_gecko4:              '/assets/Rei4.webp',
  rei_gecko5:              '/assets/Rei5.webp',
  rei_gecko6:              '/assets/Rei6.webp',
  rei_gecko7:              '/assets/Rei7.webp',
  museo_fondo:             '/assets/museo.webp',
  museo_maquintaDelTiempo: '/assets/maquinaDelTiempo.webp',
  estacionamiento:         '/assets/estacionamiento.webp',

  // ── Escena 1: Las Vegas
  lasVegasFondo:             '/assets/Las_Vegas.webp',
  amantesSumpaFondo:         '/assets/amantesSumpa.webp',
  huesoRojosFondo:           '/assets/huesoRojos.webp',
  entierroMasivoFondo:       '/assets/entierroMasivo.webp',
  esqueleto1:                '/assets/esqueleto1.webp',
  esqueleto2:                '/assets/esqueleto2.webp',
  esqueleto3:                '/assets/esqueleto3.webp',
}

// ─────────────────────────────────────────────────────────────────────
// PRELOAD DE TEXTURAS
// ─────────────────────────────────────────────────────────────────────
const allUrls = Object.values(ASSET_URLS).filter(Boolean)
if (allUrls.length > 0) {
  useTexture.preload(allUrls)
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: EscenaIntroduccion (Escena 0 — Presente)
// ─────────────────────────────────────────────────────────────────────
function EscenaIntroduccion({ xOffset }) {
  const worldWidth = useWorldWidth()

  // xPos: posición horizontal de Rei y Spondylus dentro de la escena.
  // Dividimos por 5 para acercarlos al centro sin salirse del frame.
  const xPos = worldWidth / 5

  const signRef       = useRef(null)
  const reiGroupRef   = useRef(null)
  const dialogBoxRef  = useRef(null)
  const dialogue1Ref  = useRef(null)
  const dialogue2Ref  = useRef(null)
  const dialogue3Ref  = useRef(null)
  const dialogue4Ref  = useRef(null)
  const dialogue5Ref  = useRef(null)
  const dialogue6Ref  = useRef(null)
  const dialogue7Ref  = useRef(null) // Nuevo diálogo para la subida
  const rei1Ref       = useRef(null)
  const rei2Ref       = useRef(null)
  const rei3Ref       = useRef(null)
  const rei4Ref       = useRef(null)
  const rei5Ref       = useRef(null)
  const rei6Ref       = useRef(null)
  const reiIndividualGroupRef = useRef(null) // Para desplazar a Rei localmente

  useFrame(() => {
    // 1. Letrero de Bienvenida (Fade out)
    if (signRef.current) {
      signRef.current.style.opacity   = gsapTarget.intro.signOpacity
      signRef.current.style.transform = `scale(${0.9 + gsapTarget.intro.signOpacity * 0.1})`
      signRef.current.style.display   = gsapTarget.intro.signOpacity < 0.01 ? 'none' : 'block'
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
          <div ref={signRef} style={{
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            padding: '35px 45px',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            textAlign: 'center',
            width: '500px',
            fontFamily: '"Outfit", "Inter", system-ui, sans-serif',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.6)',
            transformOrigin: 'center',
            color: '#1f2937',
            lineHeight: '1.6'
          }}>
            <p style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#374151', fontWeight: '500' }}>
              Lo que observamos en nuestro entorno es el reflejo de lo que fuimos, somos y queremos llegar a ser.
            </p>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#4b5563' }}>
              Nos hemos reunido un grupo de personas que soñamos en un futuro mejor junto a ti, para entregarte un cuento lleno de magia y color.
            </p>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#4b5563' }}>
              Es un viaje que emprenderás por la historia de nuestras primeras culturas, que son parte de tu identidad.
            </p>
            <div style={{ height: '1px', backgroundColor: '#ea580c', opacity: '0.2', margin: '15px 0' }} />
            <p style={{ margin: 0, color: '#ea580c', fontSize: '16px', fontWeight: '700', letterSpacing: '0.5px' }}>
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
            <div ref={dialogBoxRef} style={{
              opacity: 0,
              display: 'none',
              backgroundColor: '#ffffff',
              color: '#111827',
              padding: '18px 20px',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              border: '2px solid #f3f4f6',
              width: '360px',
              textAlign: 'center',
              fontFamily: 'system-ui, sans-serif',
              position: 'relative'
            }}>

              {/* Diálogo Fase 2 - Texto 1 */}
              <div ref={dialogue1Ref}>
                <p style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px', color: '#ea580c', margin: '0 0 8px 0' }}>
                  ¡Hola! Mi nombre es REI...
                </p>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  Soy una salamanquesa, comúnmente conocida como gecko. Tal vez me hayas visto en tu casa o en tu jardín merodeando en los rincones. Soy inofensiva para ti y me alimento de insectos.
                </p>
              </div>

              {/* Diálogo Fase 3 - Texto 2 */}
              <div ref={dialogue2Ref} style={{ display: 'none' }}>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  El nombre de la especie de la que provengo es muy complejo (<strong style={{ color: '#ea580c' }}>Phyllodactylus reissii</strong>), pero para resumir, <strong style={{ color: '#ea580c' }}>reissii</strong>, en honor a Carl Reiss, un alemán que vive en Ecuador y que investigó sobre mí.
                </p>
              </div>

              {/* Diálogo Fase 4 - Texto 3 */}
              <div ref={dialogue3Ref} style={{ display: 'none' }}>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  Además, obtendrás información sobre mis ancestros a través de la doctora <strong style={{ color: '#ea580c' }}>Karen Stothert</strong>, quien dejó datos sobre las especies y la fauna encontradas en una de las culturas aborígenes más antiguas y que hallarás al inicio de este cuento.
                </p>
              </div>

              {/* Diálogo Fase 5 - Texto 4 */}
              <div ref={dialogue4Ref} style={{ display: 'none' }}>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  Observa la imagen y sabrás que el modo de vida de hombres y mujeres en una época marcan la diferencia por la diversidad de características que la representan, como: expresión o lenguaje, comida, arte, creencias, costumbres y tradiciones. Esto es lo que conoces como <strong style={{ color: '#ea580c' }}>CULTURA</strong>, expresada en el hacer, pensar y sentir.
                </p>
              </div>

              {/* Diálogo Fase 6 - Texto 5 */}
              <div ref={dialogue5Ref} style={{ display: 'none' }}>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: '0 0 8px 0' }}>
                  ¿Ves que Rei tiene en sus manos globos de diversos colores que representan esta diversidad de actividades y disfruta de ellos?
                </p>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0, fontWeight: '500' }}>
                  ¿Sabes? ¡Esto me motiva a viajar en el tiempo y conocer qué hicieron nuestros antepasados! ¿Tú también quieres aprender? ¡Si la tierra hablara, imagínate lo que diría!
                </p>
              </div>

              {/* Diálogo Fase 7 - Texto 6 */}
              <div ref={dialogue6Ref} style={{ display: 'none' }}>
                <p style={{ fontSize: '15px', color: '#374151', lineHeight: '1.5', margin: 0, fontWeight: '500' }}>
                  Hoy quiero llevarte a un viaje maravilloso del cual mis ancestros fueron partícipes. Un viaje por el tiempo y la historia en tu provincia.
                </p>
              </div>

              {/* Diálogo Fase 8 - Texto 7 */}
              <div ref={dialogue7Ref} style={{ display: 'none' }}>
                <p style={{ fontSize: '14px', color: '#ea580c', lineHeight: '1.5', margin: 0, fontWeight: 'bold' }}>
                  ¡Vamos, súbete a mi máquina del tiempo! La programaremos para que nos lleve del 8.000 a.C. al 4.500 a.C.
                </p>
              </div>

              {/* Triangulito del globo */}
              <div style={{
                position: 'absolute',
                width: '16px',
                height: '16px',
                backgroundColor: '#ffffff',
                borderBottom: '2px solid #f3f4f6',
                borderRight: '2px solid #f3f4f6',
                transform: 'rotate(45deg) translateX(-50%)',
                bottom: '-12px',
                left: '50%'
              }}></div>
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

  const reiGroupRef = useRef(null)
  const dialogBoxRef = useRef(null)
  
  // Refs para los fondos
  const lasVegasFondoRef = useRef(null)
  const amantesSumpaFondoRef = useRef(null)
  const huesoRojosFondoRef = useRef(null)
  const entierroMasivoFondoRef = useRef(null)
  
  // Refs para los diferentes sprites de Rei
  const rei1Ref = useRef(null)
  const rei2Ref = useRef(null)
  const rei3Ref = useRef(null)
  const rei4Ref = useRef(null)
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
  const dialogue14Ref = useRef(null)

  const minigameGroupRef = useRef(null)
  const hudRef = useRef(null)

  // ESTADO DEL MINIJUEGO
  const [foundStatus, setFoundStatus] = useState([false, false, false])
  const geckosFound = foundStatus.filter(Boolean).length

  // Sincronizar el estado con gsapTarget para bloquear/liberar scroll
  useEffect(() => {
    if (geckosFound === 3) {
      gsapTarget.lasVegas.minigameCompleted = true
    }
  }, [geckosFound])

  const handleGeckoClick = (index) => {
    if (!foundStatus[index]) {
      const newStatus = [...foundStatus]
      newStatus[index] = true
      setFoundStatus(newStatus)
    }
  }

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

    // Visibilidad de los sprites de Rei según el scroll:
    if (rei1Ref.current) rei1Ref.current.visible = (step < 3.5) || (step >= 6.5 && step < 7.5) || (step >= 9.5 && step < 11.5) || (step >= 14.5 && step < 15.5) || (step >= 16.5 && step < 17.5)
    if (rei2Ref.current) rei2Ref.current.visible = (step >= 7.5 && step < 8.5)
    if (rei3Ref.current) rei3Ref.current.visible = (step >= 3.5 && step < 4.5) || (step >= 5.5 && step < 6.5) || (step >= 11.5 && step < 12.5)
    if (rei4Ref.current) rei4Ref.current.visible = (step >= 4.5 && step < 5.5) || (step >= 13.5 && step < 14.5)
    if (rei7Ref.current) rei7Ref.current.visible = (step >= 17.5)

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
    if (dialogue14Ref.current) dialogue14Ref.current.style.display = (step >= 17.5) ? 'block' : 'none'

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
    if (minigameGroupRef.current) {
      minigameGroupRef.current.position.x = gsapTarget.lasVegas.entierroMasivoX * worldWidth
      minigameGroupRef.current.visible = (step >= 15.5)
    }
    if (hudRef.current) {
      hudRef.current.style.display = (step >= 15.5) ? 'block' : 'none'
    }
  })

  const xPosRei = -worldWidth * 0.25
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

        {/* ── MINIJUEGO SALAMANQUESAS (Solo visible en Scroll 16+) ── */}
        <group ref={minigameGroupRef} position={[0, 0, LAYER_Z.SKY + 0.35]} visible={false}>
          {[0, 1, 2].map((i) => (
            <group key={i} 
                   onClick={(e) => { e.stopPropagation(); handleGeckoClick(i); }} 
                   onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
                   onPointerOut={(e) => { e.stopPropagation(); document.body.style.cursor = 'auto'; }}
                   visible={!foundStatus[i]}>
              <FlatIllustration 
                url={i === 0 ? ASSET_URLS.esqueleto1 : i === 1 ? ASSET_URLS.esqueleto2 : ASSET_URLS.esqueleto3} 
                targetHeight={2} 
                position={[(i - 1) * 2, i === 1 ? 1 : -2, LAYER_Z.MAIN]} 
              />
            </group>
          ))}
          {/* Anillos visibles una vez encontrados */}
          {[0, 1, 2].map((i) => (
            <group key={`ring-${i}`} visible={foundStatus[i]} position={[(i - 1) * 2, i === 1 ? 1 : -2, LAYER_Z.MAIN - 0.1]}>
              <mesh>
                <ringGeometry args={[1, 1.2, 32]} />
                <meshBasicMaterial color="#ea580c" transparent opacity={0.8} />
              </mesh>
            </group>
          ))}
        </group>

        {/* HUD del Minijuego */}
        <Html position={[0, 3.5, LAYER_Z.MAIN]} center>
          <div ref={hudRef} style={{ display: 'none', padding: '10px', background: 'rgba(255,255,255,0.8)', borderRadius: '8px', border: '2px solid #ea580c', fontWeight: 'bold', color: '#ea580c', whiteSpace: 'nowrap' }}>
            Salamanquesas encontradas: {geckosFound} / 3
          </div>
        </Html>

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

          <Html position={[0, 2.5, 0]} center zIndexRange={[100, 0]}>
            <div ref={dialogBoxRef} style={{
              opacity: 0,
              display: 'none',
              backgroundColor: '#ffffff',
              color: '#111827',
              padding: '18px 20px',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              border: '2px solid #f3f4f6',
              width: '360px',
              textAlign: 'center',
              fontFamily: 'system-ui, sans-serif',
              position: 'relative'
            }}>

              {/* Scroll 2 (Texto 1) */}
              <div ref={dialogue1Ref}>
                <p style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px', color: '#ea580c', margin: '0 0 8px 0' }}>
                  ¡Al fin hemos llegado!
                </p>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  Estamos en el punto inicial de esta historia.
                </p>
              </div>

              {/* Scroll 3 (Texto 2) */}
              <div ref={dialogue2Ref} style={{ display: 'none' }}>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  Mira, ahí están los primeros aborígenes que han decidido asentarse en este lugar. Es el paso de una vida nómada a una vida sedentaria. Es decir, van a hacer sus viviendas aquí. Ellos son quienes forman parte de lo que hoy conoces como <strong style={{ color: '#ea580c' }}>Cultura Las Vegas</strong>.
                </p>
              </div>

              {/* Scroll 4 (Texto 3) */}
              <div ref={dialogue3Ref} style={{ display: 'none' }}>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  Son los primeros en desarrollar la <strong style={{ color: '#ea580c' }}>HORTICULTURA</strong> en América, que es el inicio de la agricultura, realizada en pequeños huertos, no en grandes extensiones de tierra. La mujer se dedica a la siembra de las hortalizas y plantas, como: mate, zapallo, maíz, yuca, hierbas medicinales.
                </p>
              </div>

              {/* Scroll 5 (Texto 4) */}
              <div ref={dialogue4Ref} style={{ display: 'none' }}>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  El sitio arqueológico y patrimonial Las Vegas, denominado <strong style={{ color: '#ea580c' }}>OGSE-80</strong>, está ubicado en el Museo Amantes de Sumpa en una pequeña colina, entre dos quebradas que forman el río Las Vegas.
                </p>
              </div>

              {/* Scroll 6 (Texto 5) */}
              <div ref={dialogue5Ref} style={{ display: 'none' }}>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  Su nombre se debe al asentamiento a la orilla del río. Son parte de una sociedad <strong style={{ color: '#ea580c' }}>cazadora recolectora</strong>. Es decir, subsisten apropiándose de lo que la naturaleza les proporciona: cazan animales y recolectan plantas comestibles.
                </p>
              </div>

              {/* Scroll 7 (Texto 6) */}
              <div ref={dialogue6Ref} style={{ display: 'none' }}>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  Santa Elena está llena de manglares en donde viven moluscos, cangrejos y peces que les sirven de alimento. Utilizan las conchas prietas no solo para comer sino también para servirse otros alimentos, cual si fuera una cuchara o un plato.
                </p>
              </div>

              {/* Scroll 8 (Texto 7) */}
              <div ref={dialogue7Ref} style={{ display: 'none' }}>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  Este yacimiento arqueológico tiene <strong style={{ color: '#ea580c' }}>200 osamentas</strong> con formas de enterramientos típicos de la cultura. Vas a ver tres entierros conservados “in situ” (en el sitio), que evidencian sus costumbres funerarias y sus ofrendas.
                </p>
              </div>

              {/* Scroll 10 (Texto 8) - Amantes de Sumpa 1 */}
              <div ref={dialogue8Ref} style={{ display: 'none' }}>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  ¿Conoces a los <strong style={{ color: '#ea580c' }}>Amantes de Sumpa</strong>?
                </p>
              </div>

              {/* Scroll 11 (Texto 9) - Amantes de Sumpa 2 */}
              <div ref={dialogue9Ref} style={{ display: 'none' }}>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  Ellos forman parte del enterramiento denominado <strong style={{ color: '#ea580c' }}>DOBLE PRIMARIO</strong>. Es un entierro directo de un hombre y una mujer, quienes mueren entre los 20 y 25 años de edad y son enterrados cuidadosamente así:
                </p>
              </div>

              {/* Scroll 12 (Texto 10) - Amantes de Sumpa 3 */}
              <div ref={dialogue10Ref} style={{ display: 'none' }}>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  El hombre con su mano derecha sobre la cintura de la mujer y con la pierna derecha encima de sus caderas, ella en posición flexionada (fetal), con el brazo sobre su cabeza. Se colocan seis grandes piedras encima, una vez enterrados.
                </p>
              </div>

              {/* Scroll 14 (Texto 11) - Huesos Rojos Parte 1 */}
              <div ref={dialogue11Ref} style={{ display: 'none' }}>
                <p style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px', color: '#ea580c', margin: '0 0 8px 0' }}>
                  ENTIERRO SECUNDARIO:
                </p>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  Existió la costumbre de desenterrar los esqueletos humanos, llamada también exhumación de los cuerpos.
                </p>
              </div>

              {/* Scroll 15 (Texto 12) - Huesos Rojos Parte 2 */}
              <div ref={dialogue12Ref} style={{ display: 'none' }}>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  Los huesos sin carne y desarticulados se acomodan en forma de “paquete” y se vuelven a enterrar, se colocan cerca de un familiar muerto y algunos tienen <strong style={{ color: '#ea580c' }}>pigmento de color rojo</strong> como símbolo de protección espiritual.
                </p>
              </div>

              {/* Scroll 17 (Texto 13) - Entierro Masivo */}
              <div ref={dialogue13Ref} style={{ display: 'none' }}>
                <p style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px', color: '#ea580c', margin: '0 0 8px 0' }}>
                  ENTIERRO MÚLTIPLE O MASIVO:
                </p>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  Es el entierro de un gran número de esqueletos humanos desarticulados en diferentes ubicaciones dentro de un osario o fosa de forma ovalada, donde se acomodan las osamentas.
                </p>
              </div>

              {/* Scroll 18 (Texto 14) - Minijuego */}
              <div ref={dialogue14Ref} style={{ display: 'none' }}>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  Este es un entierro masivo. Ayúdame a encontrar a mis ancestros. ¡Están escondidas tres salamanquesas, rodéalas en un círculo!
                </p>
                <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#fff7ed', borderRadius: '6px', border: '1px solid #fdba74' }}>
                  {geckosFound === 3 && (
                    <p style={{ margin: '0', fontSize: '14px', color: '#16a34a', textAlign: 'center', fontWeight: 'bold' }}>
                      ¡Excelente! Has encontrado a los tres ancestros. Puedes continuar tu viaje.
                    </p>
                  )}
                  {geckosFound < 3 && (
                     <p style={{ margin: 0, fontSize: '13px', color: '#ea580c', textAlign: 'center' }}>
                       Haz clic en los esqueletos escondidos...
                     </p>
                  )}
                </div>
              </div>

              {/* Triangulito del globo */}
              <div style={{
                position: 'absolute',
                width: '16px',
                height: '16px',
                backgroundColor: '#ffffff',
                borderBottom: '2px solid #f3f4f6',
                borderRight: '2px solid #f3f4f6',
                transform: 'rotate(45deg) translateX(-50%)',
                bottom: '-12px',
                left: '50%'
              }}></div>
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
  return (
    <Suspense fallback={<SceneFallback />}>
      <group position={[xOffset, 0, 0]}>

        {/* ── SKY: Cielo tropical exuberante ── */}
        <FlatIllustration
          // url={ASSET_URLS.valdivia_sky}
          color="#1A3D2D"
          targetHeight={11}
          placeholderAspect={worldWidth / 11}
          position={[0, 0, LAYER_Z.SKY]}
          renderOrder={0}
        />

        {/* ── MOUNTAINS: Vegetación costera densa ── */}
        <FlatIllustration
          color="#2A5C3A"
          targetHeight={5}
          placeholderAspect={worldWidth / 5}
          position={[0, -2, LAYER_Z.MOUNTAINS]}
          renderOrder={1}
        />

        {/* ── VEGETATION: Capa media de selva y maizales ── */}
        <FlatIllustration
          // url={ASSET_URLS.valdivia_veg}
          color="#336B45"
          targetHeight={3}
          placeholderAspect={worldWidth / 3}
          position={[0, -3.5, LAYER_Z.VEGETATION]}
          renderOrder={2}
        />

        {/* ── MAIN: La Venus de Valdivia, cerámica, aldea ── */}
        <FlatIllustration
          // url={ASSET_URLS.valdivia_main}
          color="#C9841C"
          targetHeight={3.5}
          placeholderAspect={2.5 / 3.5}
          position={[-0.5, -0.8, LAYER_Z.MAIN]}
          renderOrder={3}
        />

        {/* ── Vasija cerámica Valdivia ── */}
        <FlatIllustration
          color="#B87333"
          targetHeight={1.5}
          placeholderAspect={1}
          position={[2, -2.5, LAYER_Z.MAIN]}
          renderOrder={3}
        />

        {/* ── FOREGROUND: Plantas tropicales primer plano ── */}
        <FlatIllustration
          // url={ASSET_URLS.valdivia_fg}
          color="#1F4D2C"
          targetHeight={2.5}
          placeholderAspect={worldWidth / 2.5}
          position={[0, -4.8, LAYER_Z.FOREGROUND]}
          renderOrder={4}
        />

      </group>
    </Suspense>
  )
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: EscenaMachalilla (Escena 3 — 1500 a.C.)
// ─────────────────────────────────────────────────────────────────────
function EscenaMachalilla({ xOffset }) {
  const worldWidth = useWorldWidth()
  return (
    <Suspense fallback={<SceneFallback />}>
      <group position={[xOffset, 0, 0]}>

        <FlatIllustration
          // url={ASSET_URLS.machalilla_sky}
          color="#1A2B4A"
          targetHeight={11}
          placeholderAspect={worldWidth / 11}
          position={[0, 0, LAYER_Z.SKY]}
          renderOrder={0}
        />

        {/* Costa rocosa, primera cultura ceramista del litoral ── */}
        <FlatIllustration
          color="#2E3F6B"
          targetHeight={4}
          placeholderAspect={worldWidth / 4}
          position={[0, -2.5, LAYER_Z.MOUNTAINS]}
          renderOrder={1}
        />

        <FlatIllustration
          color="#4A5E8A"
          targetHeight={2}
          placeholderAspect={worldWidth / 2}
          position={[0, -4.5, LAYER_Z.MIDGROUND]}
          renderOrder={2}
        />

        {/* ── MAIN: Figura Machalilla, cántaro "botijuela" ── */}
        <FlatIllustration
          // url={ASSET_URLS.machalilla_main}
          color="#7A8BB0"
          targetHeight={3.8}
          placeholderAspect={2.5 / 3.8}
          position={[0, -0.5, LAYER_Z.MAIN]}
          renderOrder={3}
        />

        {/* ── Cántaro de cuello largo ── */}
        <FlatIllustration
          color="#6B7A9E"
          targetHeight={2}
          placeholderAspect={0.8}
          position={[2.5, -2, LAYER_Z.MAIN]}
          renderOrder={3}
        />

        <FlatIllustration
          color="#1A2B4A"
          targetHeight={2}
          placeholderAspect={worldWidth / 2}
          position={[0, -5, LAYER_Z.FOREGROUND]}
          renderOrder={4}
        />

      </group>
    </Suspense>
  )
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: EscenaChorrera (Escena 4 — 900 a.C.)
// ─────────────────────────────────────────────────────────────────────
function EscenaChorrera({ xOffset }) {
  const worldWidth = useWorldWidth()
  return (
    <Suspense fallback={<SceneFallback />}>
      <group position={[xOffset, 0, 0]}>

        {/* ── Amanecer dorado, cerámica silbante ── */}
        <FlatIllustration
          color="#2D1A00"
          targetHeight={11}
          placeholderAspect={worldWidth / 11}
          position={[0, 0, LAYER_Z.SKY]}
          renderOrder={0}
        />

        <FlatIllustration
          color="#4A2E05"
          targetHeight={4}
          placeholderAspect={worldWidth / 4}
          position={[0, -2.5, LAYER_Z.MOUNTAINS]}
          renderOrder={1}
        />

        <FlatIllustration
          color="#7A5020"
          targetHeight={2}
          placeholderAspect={worldWidth / 2}
          position={[0, -4.5, LAYER_Z.MIDGROUND]}
          renderOrder={2}
        />

        {/* ── MAIN: La cerámica silbante de Chorrera ── */}
        <FlatIllustration
          color="#C97A2A"
          targetHeight={3.5}
          placeholderAspect={2.5 / 3.5}
          position={[0, -0.8, LAYER_Z.MAIN]}
          renderOrder={3}
        />

        {/* ── Figura antropomorfa-zoomorfa silbante ── */}
        <FlatIllustration
          color="#E8A040"
          targetHeight={2.2}
          placeholderAspect={1.2}
          position={[2.2, -2, LAYER_Z.MAIN]}
          renderOrder={3}
        />

        <FlatIllustration
          color="#3D2200"
          targetHeight={2}
          placeholderAspect={worldWidth / 2}
          position={[0, -5, LAYER_Z.FOREGROUND]}
          renderOrder={4}
        />

      </group>
    </Suspense>
  )
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: EscenaBahia (Escena 5 — 500 a.C.)
// ─────────────────────────────────────────────────────────────────────
function EscenaBahia({ xOffset }) {
  const worldWidth = useWorldWidth()
  return (
    <Suspense fallback={<SceneFallback />}>
      <group position={[xOffset, 0, 0]}>

        {/* ── Cultura Bahía: navegantes, el Spondylus ── */}
        <FlatIllustration
          color="#0A2A3D"
          targetHeight={11}
          placeholderAspect={worldWidth / 11}
          position={[0, 0, LAYER_Z.SKY]}
          renderOrder={0}
        />

        {/* ── Mar abierto, la "ruta del Spondylus" ── */}
        <FlatIllustration
          color="#0F3D5C"
          targetHeight={5}
          placeholderAspect={worldWidth / 5}
          position={[0, -1.5, LAYER_Z.MOUNTAINS]}
          renderOrder={1}
        />

        <FlatIllustration
          color="#1A5A7A"
          targetHeight={2.5}
          placeholderAspect={worldWidth / 2.5}
          position={[0, -4, LAYER_Z.MIDGROUND]}
          renderOrder={2}
        />

        {/* ── MAIN: Balsa de navegación + comerciante ── */}
        <FlatIllustration
          color="#2E7A9E"
          targetHeight={3}
          placeholderAspect={5 / 3}
          position={[0, -1.5, LAYER_Z.MAIN]}
          renderOrder={3}
        />

        {/* ── La concha Spondylus (la protagonista) ── */}
        <FlatIllustration
          color="#C84B6B"
          targetHeight={1.8}
          placeholderAspect={1.2}
          position={[2.5, -0.5, LAYER_Z.MAIN]}
          renderOrder={3}
        />

        <FlatIllustration
          color="#0A1F2D"
          targetHeight={2}
          placeholderAspect={worldWidth / 2}
          position={[0, -5, LAYER_Z.FOREGROUND]}
          renderOrder={4}
        />

      </group>
    </Suspense>
  )
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: EscenaManteno (Escena 6 — 800 d.C.)
// ─────────────────────────────────────────────────────────────────────
function EscenaManteno({ xOffset }) {
  const worldWidth = useWorldWidth()
  return (
    <Suspense fallback={<SceneFallback />}>
      <group position={[xOffset, 0, 0]}>

        {/* ── Cultura Manteño: sillas en U, orfebrería ── */}
        <FlatIllustration
          color="#1A0A00"
          targetHeight={11}
          placeholderAspect={worldWidth / 11}
          position={[0, 0, LAYER_Z.SKY]}
          renderOrder={0}
        />

        <FlatIllustration
          color="#3D1F00"
          targetHeight={4}
          placeholderAspect={worldWidth / 4}
          position={[0, -2.5, LAYER_Z.MOUNTAINS]}
          renderOrder={1}
        />

        <FlatIllustration
          color="#5C3010"
          targetHeight={2.5}
          placeholderAspect={worldWidth / 2.5}
          position={[0, -4, LAYER_Z.MIDGROUND]}
          renderOrder={2}
        />

        {/* ── MAIN: La silla-U manteña, señor principal ── */}
        <FlatIllustration
          color="#C9A84C"
          targetHeight={4}
          placeholderAspect={3 / 4}
          position={[-1, -0.5, LAYER_Z.MAIN]}
          renderOrder={3}
        />

        {/* ── Orfebrería: pectoral dorado ── */}
        <FlatIllustration
          color="#E8C060"
          targetHeight={1.5}
          placeholderAspect={1.8}
          position={[2.5, -1.5, LAYER_Z.MAIN]}
          renderOrder={3}
        />

        <FlatIllustration
          color="#2D1500"
          targetHeight={2}
          placeholderAspect={worldWidth / 2}
          position={[0, -5, LAYER_Z.FOREGROUND]}
          renderOrder={4}
        />

      </group>
    </Suspense>
  )
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENTE: EscenaContacto (Escena 7 — 1530 d.C.)
// ─────────────────────────────────────────────────────────────────────
function EscenaContacto({ xOffset }) {
  const worldWidth = useWorldWidth()
  return (
    <Suspense fallback={<SceneFallback />}>
      <group position={[xOffset, 0, 0]}>

        {/* ── La llegada española: dos mundos, un horizonte ── */}
        <FlatIllustration
          color="#0F1A2A"
          targetHeight={11}
          placeholderAspect={worldWidth / 11}
          position={[0, 0, LAYER_Z.SKY]}
          renderOrder={0}
        />

        <FlatIllustration
          color="#1F2E4A"
          targetHeight={4}
          placeholderAspect={worldWidth / 4}
          position={[0, -2, LAYER_Z.MOUNTAINS]}
          renderOrder={1}
        />

        {/* ── Costa de Santa Elena, la carabela en el mar ── */}
        <FlatIllustration
          color="#2A3E5C"
          targetHeight={3}
          placeholderAspect={5 / 3}
          position={[0, -2.5, LAYER_Z.MIDGROUND]}
          renderOrder={2}
        />

        {/* ── MAIN: Figura indígena mirando la costa ── */}
        <FlatIllustration
          color="#8B6914"
          targetHeight={4}
          placeholderAspect={2.5 / 4}
          position={[-2, -0.5, LAYER_Z.MAIN]}
          renderOrder={3}
        />

        {/* ── Soldado español / Spondylus último intercambio ── */}
        <FlatIllustration
          color="#C84B6B"
          targetHeight={1.5}
          placeholderAspect={1}
          position={[2, -1, LAYER_Z.MAIN]}
          renderOrder={3}
        />

        <FlatIllustration
          color="#0A1220"
          targetHeight={2}
          placeholderAspect={worldWidth / 2}
          position={[0, -5, LAYER_Z.FOREGROUND]}
          renderOrder={4}
        />

      </group>
    </Suspense>
  )
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
        NOTA SOBRE <Suspense> Y frameloop="demand":
        Cuando una textura carga y Suspense re-monta un componente,
        R3F con frameloop="demand" necesita un invalidate() para pintar el frame.
        useTexture de Drei llama a invalidate() automáticamente al resolver.
        → No necesitamos manejarlo manualmente aquí.
      */}
      <EscenaIntroduccion xOffset={-0 * spacing} />
      <EscenaLasVegas     xOffset={-1 * spacing} />
      <EscenaValdivia     xOffset={-2 * spacing} />
      <EscenaMachalilla   xOffset={-3 * spacing} />
      <EscenaChorrera     xOffset={-4 * spacing} />
      <EscenaBahia        xOffset={-5 * spacing} />
      <EscenaManteno      xOffset={-6 * spacing} />
      <EscenaContacto     xOffset={-7 * spacing} />
    </group>
  )
}
