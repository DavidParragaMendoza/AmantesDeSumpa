import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useMuseoStore } from '../store/useMuseoStore'
import { FullscreenToggle } from './FullscreenToggle'
import './LandingPage.css'

gsap.registerPlugin(ScrollTrigger)

export function LandingPage() {
  const setModo = useMuseoStore(s => s.setModo)
  const containerRef = useRef(null)
  const logoGroupRef = useRef(null)
  const circleRef = useRef(null)
  const bgRef = useRef(null)
  const menuRef = useRef(null)
  const scrollPromptRef = useRef(null)

  useEffect(() => {
    // Forzar scroll arriba al cargar para evitar HMR residuales desalineados
    window.scrollTo(0, 0)

    let ctx;
    const timer = setTimeout(() => {
      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: '#landing-scroll-spacer',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 1.2,
          }
        })

        // Animación de escala de la imagen de fondo (de 1.05 a 1.0)
        tl.to(bgRef.current, {
          scale: 1.6,
          duration: 1,
          ease: 'none'
        }, 0)

        // Animación del radio del círculo de máscara de la plantilla SVG (de 800 a 0)
        tl.to(circleRef.current, {
          attr: { r: 0 },
          duration: 1,
          ease: 'none'
        }, 0)

        // Animación del tamaño (escala) de las letras del logo (de 1.7 a 0.58)
        // Esto hace que las letras no se vayan tan al fondo y terminen en un tamaño grande y legible
        // Manteniendo el SVG de cobertura a tamaño completo (100% de la pantalla)
        tl.fromTo(logoGroupRef.current, {
          scale: 1.7,
          transformOrigin: '50% 50%'
        }, {
          scale: 0.58,
          duration: 1,
          ease: 'none',
          transformOrigin: '50% 50%'
        }, 0)

        // Desvanecimiento del prompt de scroll inicial
        tl.to(scrollPromptRef.current, {
          opacity: 0,
          y: -15,
          duration: 0.35,
          ease: 'power1.out'
        }, 0)

        // Aparición del menú con botones premium
        tl.fromTo(menuRef.current, {
          opacity: 0,
          y: 40,
          scale: 0.96
        }, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: 'power2.out'
        }, 0.5) // Aparece en la segunda mitad del scroll
      }, containerRef)

      ScrollTrigger.refresh()
    }, 50)

    return () => {
      clearTimeout(timer)
      if (ctx) ctx.revert()
      ScrollTrigger.getAll().forEach(t => t.kill())
    }
  }, [])

  const handleStartRecorrido = () => {
    // Animación de salida cinematográfica
    gsap.to(containerRef.current, {
      opacity: 0,
      scale: 1.03,
      duration: 0.7,
      ease: 'power3.inOut',
      onComplete: () => {
        window.scrollTo(0, 0)
        setModo('recorrido')
      }
    })
  }

  return (
    <div ref={containerRef} className="landing-container">
      {/* Capa de Viewport Fijo */}
      <div className="landing-fixed-viewport">
        {/* Controles superiores flotantes (Pantalla Completa) */}
        <div className="landing-top-controls">
          <FullscreenToggle className="landing-fullscreen-btn" />
        </div>

        {/* Contenedor de la Imagen de Fondo (Detrás del SVG de Cobertura) */}
        <div ref={bgRef} className="landing-bg-image-wrapper">
          <img
            src="/assets/PortadoCuento.webp"
            alt="Cuento Amantes de Sumpa"
            className="landing-bg-image"
          />
        </div>

        {/* SVG de Cobertura y Recorte (Enfrente de la Imagen de Fondo) */}
        <svg
          className="landing-cover-svg"
          viewBox="0 0 1000 450"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <mask id="logo-cutout-mask">
              {/* Rectángulo blanco: Todo lo que esté en blanco revela el color oscuro de cobertura */}
              <rect width="1000" height="450" fill="white" />

              {/* Grupo para el logo (textos) que se escala de forma independiente */}
              <g ref={logoGroupRef}>
                {/* Textos negros: Cortan agujeros transparentes en la cobertura para ver la imagen de fondo */}
                <text
                  x="50%"
                  y="170"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  className="svg-title-text"
                  fill="black"
                >
                  AMANTES DE SUMPA
                </text>
                <text
                  x="50%"
                  y="275"
                  dominantBaseline="middle"
                  textAnchor="middle"
                  className="svg-subtitle-text"
                  fill="black"
                  letterSpacing="18"
                >
                  MUSEO DE SITIO
                </text>
              </g>

              {/* Círculo negro: Corta un gran agujero en el centro para revelar toda la pantalla al inicio */}
              <circle
                ref={circleRef}
                cx="500"
                cy="222"
                r="800"
                fill="black"
              />
            </mask>
          </defs>

          {/* El rectángulo de cobertura que pinta el fondo oscuro */}
          <rect
            width="1000"
            height="450"
            fill="#0a0c14"
            mask="url(#logo-cutout-mask)"
          />
        </svg>

        {/* Capa del Menú Flotante */}
        <div ref={menuRef} className="landing-menu-layer">


          <div className="landing-buttons-container">
            <button
              className="landing-btn btn-recorrido"
              onClick={handleStartRecorrido}
              title="Iniciar recorrido temporal interactivo 2.5D"
            >
              <span className="btn-icon">⏳</span>
              <span className="btn-text">Recorrido</span>
            </button>
            <button
              className="landing-btn btn-minijuegos"
              onClick={() => setModo('minijuegos')}
              title="Ir a la sección de minijuegos educativos"
            >
              <span className="btn-icon">🧩</span>
              <span className="btn-text">Minijuegos</span>
            </button>
            <button
              className="landing-btn btn-pintar"
              onClick={() => setModo('pintar')}
              title="Abrir taller creativo de pintura arqueológica"
            >
              <span className="btn-icon">🎨</span>
              <span className="btn-text">Pintar</span>
            </button>
          </div>
        </div>

        {/* Indicador de Scroll */}
        <div ref={scrollPromptRef} className="landing-scroll-prompt">
          <div className="mouse-icon">
            <div className="wheel"></div>
          </div>
          <span>Desliza para comenzar</span>
        </div>
      </div>

      {/* Spacer invisible para generar el recorrido del scroll de GSAP */}
      <div id="landing-scroll-spacer" style={{ height: '300vh' }} className="landing-scroll-spacer" />
    </div>
  )
}
