/**
 * APLICACIÓN PRINCIPAL — App.jsx
 * Módulo 2: Actualizado con Suspense para carga de texturas
 *
 * JERARQUÍA DE COMPONENTES:
 *
 *   <App>
 *   ├── <div #canvas-container>        ← Canvas fijo en pantalla
 *   │   └── <Canvas>                   ← R3F, frameloop="demand", orthographic
 *   │       ├── <OrthoCamera>          ← Setup + animación de cámara
 *   │       ├── <ScrollNarrativeSetup> ← GSAP ScrollTrigger + Dummy Target
 *   │       └── <DioramaScene>         ← Las capas 2.5D (planos PNG)
 *   │
 *   ├── <div #hud-layer>               ← UI superpuesta (HTML puro)
 *   │   └── <HUD>                      ← Era, Progreso, Rei, Audio
 *   │
 *   └── <div #scroll-spacer>           ← Altura para el scroll (invisible)
 *
 * FLUJO DE DATOS:
 *   Scroll → ScrollTrigger → GSAP → gsapTarget → useFrame → Three.js → GPU
 *                                             ↘ Zustand Store → React UI
 */

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { OrthoCamera } from './components/OrthoCamera'
import { ScrollNarrativeSetup } from './components/ScrollNarrativeSetup'
import { DioramaScene } from './components/DioramaScene'
import { SceneFallback } from './components/SceneFallback'
import { HUD } from './components/HUD'

export default function App() {
  return (
    <>
      {/* ══════════════════════════════════════════════════════
          CANVAS R3F — Fijo en pantalla, cubre todo el viewport
         ══════════════════════════════════════════════════════ */}
      <div id="canvas-container">
        <Canvas
          /**
           * CONFIGURACIÓN DE RENDIMIENTO CRÍTICA:
           *
           * frameloop="demand":
           *   Three.js solo re-renderiza cuando algo cambia.
           *   Normalmente Three.js renderiza 60fps constante (innecesario).
           *   Con "demand", el loop se pausa cuando no hay movimiento.
           *   → Ahorro significativo de batería en móviles.
           *   → invalidate() activa un frame cuando es necesario.
           *
           *   La cadena de invalidación está cubierta por:
           *   1. ScrollNarrativeSetup: invalidate() inicial + rAF retardado
           *   2. useInvalidateOnMount: frame post-Suspense en TexturedPlane
           *   3. OrthoCamera: auto-invalidate durante convergencia del lerp
           * frameloop="always":
           *   Three.js renderiza 60fps constante.
           *
           * gl.outputColorSpace = THREE.SRGBColorSpace:
           *   Corrige el mapeo de color para que las texturas PNG
           *   se vean con los colores correctos (sin sobreexposición).
           *   Sin esto, los colores parecen "lavados" o muy brillantes.
           */
          orthographic
          frameloop="demand"
          gl={{
            outputColorSpace: THREE.SRGBColorSpace,
            antialias: true,
            alpha: false,             // Fondo opaco (sin transparencia del canvas)
            powerPreference: 'default', // Deja que el SO decida GPU discreta vs integrada
          }}
          camera={{
            // Cámara ortográfica manual (OrthoCamera.jsx la reconfigura)
            // Estos valores son temporales hasta el primer render
            left:   -8,
            right:   8,
            top:     5,
            bottom: -5,
            near:  -50,
            far:    50,
            position: [0, 0, 10],
          }}
          // El canvas no captura events del scroll (el body los maneja)
          // pero sí captura clicks/hover para el Raycast de Three.js
          style={{ width: '100%', height: '100%' }}
        >
          {/* Luz ambiental básica para MeshBasicMaterial no es necesaria,
              pero la dejamos para cuando usemos materiales que la requieran */}
          <ambientLight intensity={1} />

          {/* Setup de la cámara ortográfica con manejo de aspect ratio */}
          <OrthoCamera />

          {/* Controlador de scroll: GSAP → gsapTarget → Zustand */}
          <ScrollNarrativeSetup />

          {/*
            ESTRATEGIA DE SUSPENSE EN DOS NIVELES:

            Nivel 1 (este): <Suspense> global dentro del Canvas.
            → Captura cualquier suspensión que escape de los Suspense
              internos de DioramaScene (ej. error inesperado).
            → Muestra SceneFallback mientras carga la escena inicial.

            Nivel 2 (en DioramaScene): un <Suspense> por cada escena cultural.
            → Si falla una textura de Valdivia, solo esa escena muestra fallback.
            → Las demás 7 escenas siguen visibles y funcionales.

            NUNCA pongas <Suspense> FUERA del <Canvas>:
            Los componentes R3F (meshes, geometrías) solo existen dentro
            del contexto de Canvas. SceneFallback también es un mesh.
          */}
          <Suspense fallback={<SceneFallback />}>
            <DioramaScene />
          </Suspense>
        </Canvas>
      </div>

      {/* ══════════════════════════════════════════════════════
          HUD LAYER — Overlay HTML fijo sobre el canvas
         ══════════════════════════════════════════════════════ */}
      <HUD />

      {/* ══════════════════════════════════════════════════════
          SCROLL SPACER — Da altura a la página para ScrollTrigger
          Su altura es configurada dinámicamente por ScrollNarrativeSetup
         ══════════════════════════════════════════════════════ */}
      <div id="scroll-spacer" aria-hidden="true" />
    </>
  )
}
