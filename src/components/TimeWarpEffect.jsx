/**
 * TIME WARP EFFECT — Efecto de viaje en el tiempo con FBO + Shader GLSL
 *
 * ARQUITECTURA DE DOS PASADAS:
 *
 *   Pasada 1 (useFrame, manual):
 *     gl.render(fboScene, camera) → fbo.texture
 *     fboScene = la escena del diorama (hijos via createPortal)
 *
 *   Pasada 2 (R3F render por defecto):
 *     gl.render(mainScene, camera)
 *     mainScene = solo el quad fullscreen con el warp shader
 *
 * CONTROL DE INTENSIDAD:
 *   gsapTarget.transition.intensity [0, 1]
 *   0 = passthrough perfecto (sin efecto visible)
 *   1 = vórtex máximo + aberración cromática + flash energético
 *
 * EFECTOS DEL SHADER (apilados, todos escalan con uIntensity):
 *   1. Vórtex espiral — rotación de UVs centrada, decae en los bordes
 *   2. Pull de zoom   — píxeles "succionados" hacia el centro
 *   3. Turbulencia    — ruido 2D que distorsiona las UVs
 *   4. Aberración cromática — split RGB radial
 *   5. Viñeta temporal — bordes oscurecidos durante el viaje
 *   6. Destello energético — flash azul-celeste en el pico
 *   7. Grain temporal  — grano cinematográfico durante el viaje
 *
 * RENDIMIENTO:
 *   Con frameloop="demand", timeRef solo avanza y se pide el siguiente
 *   frame mientras intensity > 0. Al terminar la transición, el render
 *   loop vuelve a pausarse automáticamente.
 */

import { useMemo, useRef } from 'react'
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import * as THREE from 'three'
import { gsapTarget } from '../animation/gsapTarget'

// ─────────────────────────────────────────────────────────────────────
// VERTEX SHADER — Quad fullscreen en espacio NDC
//
// PlaneGeometry(2,2) genera vértices con position.xy en [-1, 1],
// que coinciden exactamente con el Normalized Device Coordinate space.
// Al pasar position.xy directamente a gl_Position, el quad cubre
// todo el viewport SIN necesitar ninguna matriz de transformación.
//
// Ventaja: funciona con cualquier configuración de cámara (incluyendo
// nuestra cámara ortográfica de diorama con FRUSTUM_HEIGHT=10).
// ─────────────────────────────────────────────────────────────────────
const VERT = /* glsl */`
  attribute vec3 position;
  attribute vec2 uv;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    // Bypass completo de matrices: position.xy ya está en NDC [-1, 1]
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

// ─────────────────────────────────────────────────────────────────────
// FRAGMENT SHADER — 7 efectos de viaje en el tiempo
// ─────────────────────────────────────────────────────────────────────
const FRAG = /* glsl */`
  precision highp float;

  uniform sampler2D tScene;     // Captura del diorama (FBO texture)
  uniform float     uIntensity; // [0, 1] — intensidad del efecto
  uniform float     uTime;      // Tiempo acumulado (solo avanza con efecto activo)

  varying vec2 vUv;

  #define PI 3.14159265358979

  // ── Hash noise 2D sin textura (rendimiento óptimo) ──────────────
  float hash21(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 17.5453);
    return fract(p.x * p.y);
  }

  float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);   // Cubic smoothstep
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2  center = vec2(0.5, 0.5);
    vec2  uv     = vUv - center;         // UV recentrado en [-0.5, 0.5]
    float dist   = length(uv);
    float angle  = atan(uv.y, uv.x);

    // ══ EFECTO 1: VÓRTEX ESPIRAL ══════════════════════════════════
    // Rotación angular proporcional a la intensidad y la proximidad
    // al centro. smoothstep garantiza que los bordes no roten.
    // uTime añade rotación continua en tiempo real durante el viaje.
    float swirlStrength = uIntensity
      * (1.0 - smoothstep(0.0, 0.65, dist))
      * PI * 3.0;
    float swirlAngle = angle + swirlStrength + uIntensity * uTime * 1.8;
    
    // ══ EFECTO 2: PULL / ZOOM HACIA EL CENTRO ══════════════════════
    // Los píxeles son "succionados" al centro durante el viaje.
    // pullFactor > 1 hace que swirlDist < dist → efecto de succión.
    float pullFactor = 1.0 + uIntensity * dist * 0.7;
    float swirlDist  = dist / pullFactor;
    vec2  swirlUv    = center + vec2(cos(swirlAngle), sin(swirlAngle)) * swirlDist;

    // ══ EFECTO 3: TURBULENCIA DE RUIDO ════════════════════════════
    // Ruido 2D que tiembla las UVs → textura orgánica del viaje.
    float turb = smoothNoise(swirlUv * 7.0 + uTime * 0.6) - 0.5;
    swirlUv   += turb * uIntensity * 0.035;
    swirlUv    = clamp(swirlUv, 0.001, 0.999);  // evitar muestreo fuera de [0,1]

    // ══ EFECTO 4: ABERRACIÓN CROMÁTICA ════════════════════════════
    // Separación radial de los canales R/G/B → energía temporal.
    // La aberración escala con la distancia al centro y la intensidad.
    float aberration = uIntensity * 0.028 * (0.4 + dist * 1.2);
    vec2  aberDir    = normalize(uv + 0.0001);  // +0.0001 evita normalize(0)

    float r = texture2D(tScene, clamp(swirlUv + aberDir * aberration, 0.001, 0.999)).r;
    float g = texture2D(tScene, swirlUv).g;
    float b = texture2D(tScene, clamp(swirlUv - aberDir * aberration, 0.001, 0.999)).b;

    vec3 color = vec3(r, g, b);

    // ══ EFECTO 5: VIÑETA TEMPORAL ══════════════════════════════════
    // Oscurece los bordes para concentrar la energía en el centro.
    float vignette = smoothstep(0.85, 0.22, dist);
    color *= mix(1.0, vignette, uIntensity * 0.75);

    // ══ EFECTO 6: DESTELLO ENERGÉTICO (pico azul-celeste) ══════════
    // Flash de "umbral temporal": el color azul sugiere electricidad
    // y energía cinética al cruzar entre eras.
    float flashAmount = smoothstep(0.55, 1.0, uIntensity) * 0.28;
    vec3  flashColor  = vec3(0.50, 0.82, 1.0);  // azul-celeste temporal
    color = mix(color, flashColor, flashAmount);

    // ══ EFECTO 7: GRAIN TEMPORAL ══════════════════════════════════
    // Grano cinematográfico que aparece con el viaje en el tiempo.
    float grain = (hash21(vUv + fract(uTime * 0.43)) - 0.5) * uIntensity * 0.065;
    color = clamp(color + grain, 0.0, 1.0);

    // CORRECCIÓN DE COLOR (Gamma Correction)
    // RawShaderMaterial omite la conversión automática de Three.js.
    // Como el FBO está en espacio Lineal, debemos convertirlo a sRGB
    // antes de pintar en pantalla para que los colores no se vean oscuros/lavados.
    color = pow(color, vec3(1.0 / 2.2));

    gl_FragColor = vec4(color, 1.0);
  }
`

// ─────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL: TimeWarpEffect
// ─────────────────────────────────────────────────────────────────────
export function TimeWarpEffect({ children }) {
  const { invalidate } = useThree()

  // ── Escena secundaria (offscreen) para el diorama ──────────────
  // useMemo garantiza que la misma instancia THREE.Scene se reutiliza
  // entre renders de React. Recrearla sería muy costoso.
  const fboScene = useMemo(() => {
    const scene = new THREE.Scene()
    scene.background = null
    return scene
  }, [])

  // ── FBO — render target que coincide con el tamaño del canvas ──
  // useFBO de Drei crea y gestiona automáticamente el WebGLRenderTarget.
  // Sin args de tamaño, se sincroniza con el canvas en resize.
  const fbo = useFBO({ stencilBuffer: false, depthBuffer: true })

  // ── Refs para actualizaciones sin re-render ─────────────────────
  const meshRef  = useRef()
  const timeRef  = useRef(0)  // Tiempo acumulado, solo avanza con efecto activo

  // ── Uniforms — objeto estable para evitar recreaciones ──────────
  const uniforms = useMemo(() => ({
    tScene:     { value: null },
    uIntensity: { value: 0   },
    uTime:      { value: 0   },
  }), [])

  // ── Pasada FBO + actualización de uniforms ───────────────────────
  useFrame(({ gl, camera }, delta) => {
    const intensity = gsapTarget.transition.intensity

    // 1. Capturar el diorama (fboScene) al render target
    gl.setRenderTarget(fbo)
    gl.clear()
    gl.render(fboScene, camera)
    gl.setRenderTarget(null)  // volver al canvas

    // 2. Actualizar uniforms del shader
    if (meshRef.current) {
      const mat = meshRef.current.material
      mat.uniforms.tScene.value     = fbo.texture
      mat.uniforms.uIntensity.value = intensity

      // El tiempo solo avanza cuando hay efecto activo
      // → La espiral solo rota durante el viaje, no cuando está estático
      if (intensity > 0.001) {
        timeRef.current += delta
      }
      mat.uniforms.uTime.value = timeRef.current
    }

    // 3. Con frameloop="demand", solicitar el siguiente frame solo si
    //    hay efecto activo → render loop continuo SOLO durante el viaje
    if (intensity > 0.001) {
      invalidate()
    }
  })

  return (
    <>
      {/*
        PORTAL — Los hijos (DioramaScene) se renderizan en fboScene.
        createPortal de R3F (no ReactDOM) mantiene el contexto de Three.js:
        - useThree(), useFrame(), useTexture() siguen funcionando dentro
        - La cámara compartida del Canvas es accesible desde fboScene
        - Los eventos de R3F (raycasting) también siguen funcionando
      */}
      {createPortal(children, fboScene)}

      {/*
        QUAD FULLSCREEN — En la escena principal del Canvas.
        El RawShaderMaterial con vertex shader propio bypasea la cámara
        ortográfica del diorama y siempre cubre todo el viewport.

        Configuración crítica:
        - frustumCulled={false}: evita que la cámara ortográfica descarte
          el quad porque su bounding box podría estar "fuera" del frustum
        - depthTest/depthWrite={false}: no interactúa con el depth buffer
          (no hay profundidad en un postproceso fullscreen)
        - renderOrder={999}: se dibuja después de cualquier otro mesh
      */}
      <mesh
        ref={meshRef}
        renderOrder={999}
        frustumCulled={false}
      >
        {/* PlaneGeometry(2,2): vértices en [-1,1] = espacio NDC perfecto */}
        <planeGeometry args={[2, 2]} />
        <rawShaderMaterial
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={uniforms}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}
