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

import { Suspense, useRef } from 'react'
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
  rei_gecko:               '/assets/Rei.png',
  museo_fondo:             '/assets/museo.png',
  museo_maquintaDelTiempo: '/assets/maquinaDelTiempo.png',
  // museo_main:           '/assets/museo-main.png',
  // museo_fg:             '/assets/museo-fg.png',

  // ── Escena 1: Las Vegas
  // lasvegas_sky:         '/assets/las-vegas-sky.png',
  // lasvegas_mnt:         '/assets/las-vegas-mountains.png',
  // lasvegas_main:        '/assets/las-vegas-main.png',

  // ── Escena 2: Valdivia
  // valdivia_sky:         '/assets/valdivia-sky.png',
  // valdivia_veg:         '/assets/valdivia-vegetation.png',
  // valdivia_main:        '/assets/valdivia-main.png',
  // valdivia_fg:          '/assets/valdivia-foreground.png',

  // ── Escena 3: Machalilla
  // machalilla_sky:       '/assets/machalilla-sky.png',
  // machalilla_main:      '/assets/machalilla-main.png',

  // ── Escena 4: Chorrera
  // chorrera_sky:         '/assets/chorrera-sky.png',
  // chorrera_main:        '/assets/chorrera-main.png',

  // ── Escena 5: Bahía / Guangala
  // bahia_sky:            '/assets/bahia-sky.png',
  // bahia_main:           '/assets/bahia-main.png',

  // ── Escena 6: Manteño
  // manteno_sky:          '/assets/manteno-sky.png',
  // manteno_main:         '/assets/manteno-main.png',

  // ── Escena 7: Contacto Español
  // contacto_sky:         '/assets/contacto-sky.png',
  // contacto_main:        '/assets/contacto-main.png',
}

// ─────────────────────────────────────────────────────────────────────
// PRELOAD DE TEXTURAS
// ─────────────────────────────────────────────────────────────────────
const allUrls = Object.values(ASSET_URLS).filter(Boolean)
if (allUrls.length > 0) {
  // useTexture.preload(allUrls)
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
  const spondylusRef  = useRef(null)

  useFrame(() => {
    // 1. Letrero de Bienvenida (Fade out)
    if (signRef.current) {
      signRef.current.style.opacity   = gsapTarget.intro.signOpacity
      signRef.current.style.transform = `scale(${0.9 + gsapTarget.intro.signOpacity * 0.1})`
      signRef.current.style.display   = gsapTarget.intro.signOpacity < 0.01 ? 'none' : 'block'
    }

    // 2. Rei (Aparece y se mueve)
    if (reiGroupRef.current) {
      reiGroupRef.current.position.x = xPos + gsapTarget.intro.reiPositionX
      const rs = gsapTarget.intro.reiScale
      reiGroupRef.current.scale.set(rs, rs, rs)
    }

    if (dialogBoxRef.current) {
      dialogBoxRef.current.style.opacity = gsapTarget.intro.reiOpacity
      dialogBoxRef.current.style.display = gsapTarget.intro.reiOpacity < 0.01 ? 'none' : 'block'
    }

    // 3. Cambio de diálogo de Rei
    if (dialogue1Ref.current && dialogue2Ref.current) {
      const step = gsapTarget.intro.dialogueStep
      dialogue1Ref.current.style.display = step < 1.5 ? 'block' : 'none'
      dialogue2Ref.current.style.display = step >= 1.5 ? 'block' : 'none'
    }

    // 4. Spondylus (Máquina del tiempo)
    if (spondylusRef.current) {
      const ss = gsapTarget.intro.spondylusScale
      spondylusRef.current.scale.set(ss, ss, ss)
    }
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

        {/* ── LETRERO DE BIENVENIDA (Fase 1) ── */}
        <Html position={[0, 0, LAYER_Z.MAIN]} center zIndexRange={[100, 0]}>
          <div ref={signRef} style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '30px 40px',
            borderRadius: '12px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            textAlign: 'center',
            width: '450px',
            fontFamily: 'system-ui, sans-serif',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.5)',
            transformOrigin: 'center'
          }}>
            <h1 style={{ margin: '0 0 10px 0', color: '#1f2937', fontSize: '24px', letterSpacing: '1px' }}>
              MUSEO LOS AMANTES DE SUMPA
            </h1>
            <h2 style={{ margin: '0 0 10px 0', color: '#ea580c', fontSize: '16px', fontWeight: '600' }}>
              SITIO ARQUEOLÓGICO
            </h2>
            <p style={{ margin: '0 0 10px 0', color: '#4b5563', fontSize: '14px', letterSpacing: '0.5px' }}>
              HISTORIA DE LA PENÍNSULA DE SANTA ELENA
            </p>
            <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '15px 0' }} />
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px', fontStyle: 'italic' }}>
              CASA CAMPESINA
            </p>
          </div>
        </Html>

        {/* ── SPONDYLUS: La máquina del tiempo ── */}
        <group ref={spondylusRef} position={[xPos, -2, LAYER_Z.FOREGROUND]}>
          <FlatIllustration
            url={ASSET_URLS.museo_maquintaDelTiempo}
            color="#E05B7C"
            targetHeight={4.8}
            placeholderAspect={1.1}
            position={[0, 0, 0]}
            renderOrder={1}
          />
        </group>

        {/* ── REI (LA SALAMANQUESA) + Globo de Diálogo (MAIN) ── */}
        <group ref={reiGroupRef} position={[xPos, -1.5, LAYER_Z.MAIN]}>
          <FlatIllustration
            url={ASSET_URLS.rei_gecko}
            color="#AA8855"
            targetHeight={5.5}
            position={[0, 0, 0]}
            renderOrder={2}
          />
          <Html position={[0, 3.5, 0]} center zIndexRange={[100, 0]}>
            <div ref={dialogBoxRef} style={{
              opacity: 0,
              display: 'none',
              backgroundColor: '#ffffff',
              color: '#111827',
              padding: '16px',
              borderRadius: '16px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              border: '2px solid #f3f4f6',
              width: '280px',
              textAlign: 'center',
              fontFamily: 'system-ui, sans-serif',
              position: 'relative'
            }}>

              {/* Diálogo Fase 2 */}
              <div ref={dialogue1Ref}>
                <p style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px', color: '#ea580c', margin: '0 0 8px 0' }}>
                  ¡Hola! Mi nombre es REI...
                </p>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', margin: 0 }}>
                  Soy una salamanquesa. Hoy quiero llevarte a un viaje maravilloso.
                </p>
              </div>

              {/* Diálogo Fase 3 */}
              <div ref={dialogue2Ref} style={{ display: 'none' }}>
                <p style={{ fontSize: '16px', color: '#374151', lineHeight: '1.5', margin: 0, fontWeight: '500' }}>
                  Vamos, súbete a mi máquina del tiempo...
                </p>
                <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.5', margin: '8px 0 0 0' }}>
                  (La concha Spondylus)
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

  return (
    <Suspense fallback={<SceneFallback />}>
      <group position={[xOffset, 0, 0]}>

        {/* ── SKY: Amanecer rojizo del Pleistoceno tardío ── */}
        <FlatIllustration
          // url={ASSET_URLS.lasvegas_sky}
          color="#5C2D1A"
          targetHeight={11}
          placeholderAspect={worldWidth / 11}
          position={[0, 0, LAYER_Z.SKY]}
          renderOrder={0}
        />

        {/* ── MOUNTAINS: Llanura costera árida, colinas bajas ── */}
        <FlatIllustration
          // url={ASSET_URLS.lasvegas_mnt}
          color="#7C4E2A"
          targetHeight={4}
          placeholderAspect={worldWidth / 4}
          position={[0, -3, LAYER_Z.MOUNTAINS]}
          renderOrder={1}
        />

        {/* ── MIDGROUND: Zona de campamento, fogones ── */}
        <FlatIllustration
          color="#4A2E0F"
          targetHeight={2.5}
          placeholderAspect={worldWidth / 2.5}
          position={[0, -4, LAYER_Z.MIDGROUND]}
          renderOrder={2}
        />

        {/* ── MAIN: Figura humana de Las Vegas, recolectores ── */}
        <FlatIllustration
          // url={ASSET_URLS.lasvegas_main}
          color="#8B6914"
          targetHeight={4}
          placeholderAspect={3 / 4}
          position={[-1, -1, LAYER_Z.MAIN]}
          renderOrder={3}
        />

        {/* ── Segunda figura — pareja / familia ── */}
        <FlatIllustration
          color="#7A5C10"
          targetHeight={3.5}
          placeholderAspect={2.5 / 3.5}
          position={[1.5, -1.2, LAYER_Z.MAIN]}
          renderOrder={3}
        />

        {/* ── FOREGROUND: Gramíneas y conchas del litoral ── */}
        <FlatIllustration
          color="#6B4E1A"
          targetHeight={1.8}
          placeholderAspect={worldWidth / 1.8}
          position={[0, -5, LAYER_Z.FOREGROUND]}
          renderOrder={4}
        />

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
