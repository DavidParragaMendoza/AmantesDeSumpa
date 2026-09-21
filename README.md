# Análisis técnico: Amantes de Sumpa

## 1. Resumen

`Amantes de Sumpa` es una experiencia web interactiva sobre las culturas precolombinas de Santa Elena, Ecuador. La aplicación combina una interfaz React con un recorrido visual 2.5D renderizado con Three.js, animaciones controladas por scroll, un taller de pintura en Canvas 2D y una sección de minijuegos educativos.

El proyecto es una aplicación frontend estática: no se observa backend, API propia, base de datos ni autenticación. El contenido y las imágenes se sirven desde `public/assets`.

## 2. Tecnologías principales

| Tecnología | Versión declarada | Uso |
|---|---:|---|
| JavaScript | ES Modules | Lenguaje principal del proyecto. |
| React | `^19.2.7` | Componentes, estados locales, `Suspense`, carga perezosa y composición de la interfaz. |
| React DOM | `^19.2.7` | Montaje de React en `#root`. |
| Vite | `^8.0.16` | Servidor de desarrollo, resolución de módulos y empaquetado de producción. |
| Three.js | `^0.184.0` | Motor 3D, cámaras, geometrías, texturas, render targets y shaders. |
| React Three Fiber | `^9.6.1` | Integración declarativa de Three.js dentro de React. |
| Drei | `^10.7.7` | Utilidades de R3F como `useTexture`, `useFBO`, `Html` y `useProgress`. |
| GSAP | `^3.15.0` | Timelines, interpolaciones y animaciones vinculadas al scroll. |
| GSAP ScrollTrigger | Incluido en GSAP | Conecta el scroll nativo con la timeline narrativa. |
| Zustand | `^5.0.14` | Estado global de navegación, HUD, logros, minijuegos y audio. |
| CSS | Nativo | Diseño visual, responsive, overlays, transiciones y orientación móvil. |
| WebGL / GLSL | API del navegador | Shader personalizado para el efecto de viaje temporal. |
| Canvas 2D | API del navegador | Lienzo de pintura interactivo. |

### Dependencia adicional

- `sharp` (`^0.35.2`) está declarado en `devDependencies`. No se encontraron imports de `sharp` dentro de `src`, por lo que parece estar destinado a tareas de procesamiento u optimización de imágenes fuera del flujo principal de la aplicación.

## 3. Scripts disponibles

```bash
npm install
npm run dev
npm run build
npm run preview
```

- `npm run dev`: inicia Vite en modo desarrollo.
- `npm run build`: genera la versión optimizada en `dist/`.
- `npm run preview`: sirve localmente el build generado.

No hay scripts de test, lint ni typecheck configurados en `package.json`.

## 4. Estructura del proyecto

```text
/
├── index.html                 # Documento HTML, metadatos, fuentes y precargas
├── package.json               # Dependencias y scripts
├── package-lock.json          # Versiones resueltas por npm
├── vite.config.js             # Plugin React, alias @ y optimización de dependencias
├── public/
│   ├── manifest.json          # Configuración PWA
│   └── assets/                # Imágenes, iconos y material visual
└── src/
    ├── main.jsx               # Punto de entrada
    ├── App.jsx                # Enrutamiento por modos y Canvas principal
    ├── index.css              # Tokens globales y layout base
    ├── animation/
    │   └── gsapTarget.js      # Objeto mutable puente entre GSAP y R3F
    ├── components/             # Escenas, UI, pintura y minijuegos
    ├── hooks/                  # Hooks reutilizables del navegador/R3F
    └── store/
        └── useMuseoStore.js   # Store global Zustand
```

## 5. Flujo de ejecución

1. `index.html` carga metadatos SEO/PWA, las fuentes `Cinzel` e `Inter`, algunas imágenes críticas y `src/main.jsx`.
2. `main.jsx` importa los estilos globales, crea la raíz React y renderiza `<App />` dentro de `StrictMode`.
3. `App.jsx` consulta `useMuseoStore` y decide qué experiencia mostrar mediante `modo`:
   - `landing`: portada y menú principal.
   - `recorrido`: recorrido 2.5D con Canvas WebGL.
   - `pintar`: taller de pintura arqueológica.
   - `minijuegos`: juegos educativos.
4. Las pantallas pesadas se cargan con `React.lazy` y `Suspense`.
5. Al entrar en el recorrido, `DioramaScene` precarga las texturas WebP y monta la escena dentro de R3F.

## 6. Recorrido 2.5D y renderizado

El recorrido no es un modelo 3D tradicional. Se construye con planos rectangulares texturizados:

- `DioramaScene.jsx` distribuye las escenas horizontalmente sobre el eje X.
- `FlatIllustration.jsx` renderiza cada ilustración en un `PlaneGeometry` con `meshBasicMaterial`.
- Las capas se separan sobre el eje Z para producir profundidad visual: cielo, montañas, vegetación, fondo, personajes, primer plano y marco.
- `OrthoCamera.jsx` usa una cámara ortográfica con altura de frustum fija de 10 unidades. Esto evita la deformación por perspectiva y mantiene la estética de diorama.
- El desplazamiento horizontal de la cámara representa el viaje por las distintas eras.
- Las texturas se cargan con `useTexture` y se precargan al importar `DioramaScene`.

### Pipeline de animación

```text
Scroll nativo
    -> ScrollTrigger
    -> timeline de GSAP
    -> gsapTarget (objeto JavaScript mutable)
    -> useFrame() de R3F
    -> cámara/escena Three.js
    -> GPU/WebGL
```

`gsapTarget.js` evita actualizar React en cada frame. Esto es importante porque el Canvas utiliza `frameloop="demand"`: se solicitan frames solamente durante scroll, interpolación de cámara, carga de texturas o transiciones visuales.

## 7. Efecto de viaje temporal

`TimeWarpEffect.jsx` implementa un postprocesado manual en dos pasadas:

1. El diorama se renderiza en una escena secundaria mediante `createPortal`.
2. La escena secundaria se captura en un `WebGLRenderTarget` mediante `useFBO`.
3. Un quad de pantalla completa muestra la textura del FBO con un `RawShaderMaterial`.
4. El shader GLSL aplica vórtex, zoom, turbulencia, aberración cromática, viñeta, destello y grano.

La intensidad del efecto se controla con `gsapTarget.transition.intensity` entre `0` y `1`. Durante el efecto se mantiene activo el render loop; al terminar, vuelve a pausarse.

## 8. Escenas históricas

El store define seis paradas narrativas:

1. Museo / presente.
2. Cultura Las Vegas, aproximadamente `8000 a.C. - 4500 a.C.`.
3. Cultura Valdivia, aproximadamente `3500 a.C. - 1500 a.C.`.
4. Engoroy - Cultura Chorrera, aproximadamente `900 a.C. - 200 a.C.`.
5. Cultura Guangala, aproximadamente `200 a.C. - 800 d.C.`.
6. Señoríos Manteño-Guancavilcas, aproximadamente `800 d.C. - 1530 d.C.`.

Cada parada puede controlar diálogos, sprites de Rei, fondos, transiciones, modales educativos y una posición/zoom de cámara. La duración del scroll se calcula dinámicamente en `ScrollNarrativeSetup.jsx` y se aplica a `#scroll-spacer`.

## 9. Estado global

`src/store/useMuseoStore.js` usa Zustand con `subscribeWithSelector`.

El estado incluye:

- modo actual de la aplicación;
- escena activa y progreso del scroll;
- estado de carga del diorama;
- diálogos de Rei;
- transición activa y modales informativos;
- logros desbloqueados;
- minijuego activo;
- audio habilitado/deshabilitado.

Hay dos patrones de actualización:

- Estado reactivo para cambios poco frecuentes de UI.
- Lecturas directas y objetos mutables (`getState()` y `gsapTarget`) para valores de animación de alta frecuencia.

Al cambiar de modo, el store devuelve el scroll al inicio y reinicia `dioramaListo` cuando corresponde.

## 10. Pantallas y funcionalidades

### Landing page

`LandingPage.jsx` presenta la portada, una máscara SVG con el logotipo y un menú para entrar al recorrido, los minijuegos o el taller de pintura. GSAP anima la portada y registra un `ScrollTrigger` independiente.

### Taller de pintura

`PaintingCanvas.jsx` utiliza Canvas 2D y eventos de mouse/touch. Incluye:

- plantillas arqueológicas;
- paleta de colores;
- pincel y borrador;
- tamaño de pincel configurable;
- zoom;
- limpieza del lienzo;
- cursor SVG dinámico según el tamaño del pincel.

### Minijuegos

`MiniGamesSection.jsx` contiene lógica local para varios juegos educativos: memoria, búsqueda de osamentas, trivia y laberinto. El laberinto se genera con un algoritmo DFS de retroceso. Los logros se guardan en el store mientras la página está abierta; no hay persistencia en servidor ni en `localStorage` visible en el código revisado.

### HUD y controles

`HUD.jsx` se renderiza fuera del Canvas como HTML superpuesto. Muestra la era, progreso, diálogos, botones de modales, audio, pantalla completa y retorno al menú.

## 11. Assets y contenido estático

Los recursos están en `public/assets` y se referencian con rutas absolutas como `/assets/Rei.webp`.

Tipos encontrados:

- WebP: fondos, personajes, objetos, plantillas y material de minijuegos.
- PNG: iconos o recursos heredados.
- SVG: máscara del logotipo.

`index.html` precarga imágenes críticas y carga las fuentes de Google Fonts. `manifest.json` configura la aplicación como PWA en orientación `landscape`.

Consideraciones al agregar o reemplazar assets:

- Mantener exactamente la ruta y el uso de mayúsculas/minúsculas esperado por el código.
- Revisar la relación de aspecto: `FlatIllustration` calcula el ancho a partir del tamaño real de la textura.
- Respetar la separación Z de las capas para evitar problemas visuales.
- Considerar el peso total: `DioramaScene` precarga todas las texturas de las escenas cuando el módulo se importa.
- Comprobar que los recursos se sirvan correctamente tanto en desarrollo como en una aplicación desplegada bajo una ruta base distinta de `/`.

## 12. Responsive, dispositivos y navegador

- La experiencia está diseñada prioritariamente para orientación horizontal.
- `RotatePrompt` muestra un aviso en móviles en orientación vertical.
- Se contemplan safe areas mediante `env(safe-area-inset-left/right)`.
- El canvas limita el pixel ratio a `2` para evitar un coste excesivo en GPU.
- El navegador debe soportar WebGL, Canvas 2D, Pointer/Touch events, Fullscreen API y ES Modules.
- La experiencia puede consumir bastante memoria si se precargan muchas imágenes en dispositivos móviles.
- Las fuentes de Google requieren conexión externa, salvo que se incorporen localmente.

## 13. Configuración de Vite

`vite.config.js`:

- activa `@vitejs/plugin-react`;
- define el alias `@` apuntando a `src`;
- solicita la optimización previa de `three`, R3F, Drei, GSAP y Zustand.

El proyecto usa `type: "module"`, por lo que la configuración y los imports siguen ESM.

## 14. Puntos importantes para mantenimiento

1. Si se modifica el recorrido, revisar conjuntamente `DioramaScene.jsx`, `ScrollNarrativeSetup.jsx`, `OrthoCamera.jsx`, `gsapTarget.js` y `useMuseoStore.js`. La escala del mundo, el frustum y las posiciones horizontales deben mantenerse coordinados.
2. Si se añade una fase animada con `frameloop="demand"`, debe llamar a `invalidate()` durante la animación; de lo contrario, la escena puede quedarse congelada.
3. Los componentes que llaman `useTexture()` deben permanecer bajo un `Suspense` adecuado.
4. Las animaciones de alta frecuencia no deberían pasar por estado React si pueden resolverse con `gsapTarget`, refs o lecturas transitorias de Zustand.
5. Las operaciones sobre `window`, `document`, Fullscreen API y Canvas deben probarse en navegador real; no existe renderizado del lado del servidor configurado.
6. Al cambiar las imágenes de las escenas, actualizar las constantes de URLs y las listas de precarga en `DioramaScene.jsx`.
7. React está en `StrictMode`; los efectos deben tener limpieza correcta para evitar timelines o listeners duplicados durante desarrollo.
8. `dist/` y `node_modules/` están ignorados por Git, por lo que deben regenerarse con npm en cada entorno.

## 15. Estado de calidad observable

- Existe configuración de build y preview con Vite.
- No se observan pruebas automatizadas, linting ni typechecking configurados.
- La validación principal actual debería ser `npm run build` y una revisión manual en navegador de los cuatro modos.
- Para una validación más sólida convendría añadir pruebas de interacción para el store, el taller de pintura, la trivia/laberinto y un smoke test de carga del Canvas WebGL.

## 16. Resumen para empezar a trabajar

Para entender rápidamente el sistema, leer en este orden:

1. `package.json` y `vite.config.js` para conocer el entorno.
2. `main.jsx` y `App.jsx` para el arranque y los cuatro modos.
3. `useMuseoStore.js` para el estado y la navegación.
4. `DioramaScene.jsx` y `FlatIllustration.jsx` para la composición visual.
5. `ScrollNarrativeSetup.jsx`, `gsapTarget.js` y `OrthoCamera.jsx` para la animación narrativa.
6. `TimeWarpEffect.jsx` para el pipeline FBO/GLSL.
7. `PaintingCanvas.jsx` y `MiniGamesSection.jsx` para las experiencias educativas auxiliares.
8. Los archivos CSS correspondientes para layout, responsive y overlays.
