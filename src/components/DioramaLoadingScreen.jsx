import React, { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'
import './DioramaLoadingScreen.css'

const CURIOSIDADES = [
  "La Cultura Las Vegas es la sociedad de cazadores-recolectores más antigua de la península de Santa Elena (8000 a.C. a 4600 a.C.).",
  "El sitio arqueológico Sumpa alberga a los famosos 'Amantes de Sumpa', un entierro funerario de una pareja sepultada con un tierno abrazo.",
  "Los Amantes de Sumpa fueron cubiertos por piedras grandes para proteger su tumba, sugiriendo un profundo ritual de amor y cuidado.",
  "La Cultura Valdivia (3500 a.C. a 1500 a.C.) es famosa por sus figuras femeninas de cerámica, conocidas como las Venus de Valdivia.",
  "La cultura Engoroy (Chorrera) destacó por su fina cerámica con sonidos de silbato y formas inspiradas en animales y plantas locales.",
  "Los navegantes de la península utilizaban la concha Spondylus como moneda de cambio sagrada y símbolo de fertilidad y lluvia."
]

export function DioramaLoadingScreen({ dioramaListo }) {
  const { progress } = useProgress()
  const [smoothProgress, setSmoothProgress] = useState(0)
  const [curiosidadIndex, setCuriosidadIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  // 1. Interpolación suave de la barra de progreso
  useEffect(() => {
    let animationFrame
    const update = () => {
      setSmoothProgress(prev => {
        if (prev >= progress) return progress
        const step = Math.max(1, (progress - prev) * 0.15)
        const next = prev + step
        if (next >= 100) return 100
        animationFrame = requestAnimationFrame(update)
        return next
      })
    }
    animationFrame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(animationFrame)
  }, [progress])

  // 2. Rotación periódica de las curiosidades con animación de desvanecimiento
  useEffect(() => {
    const interval = setInterval(() => {
      setCuriosidadIndex(prev => (prev + 1) % CURIOSIDADES.length)
    }, 4500)
    return () => clearInterval(interval)
  }, [])

  // 3. Manejo de la animación de salida (fade-out)
  useEffect(() => {
    if (dioramaListo) {
      // Forzar progreso al 100% cuando la escena esté cargada físicamente
      setSmoothProgress(100)
      setFading(true)
      const timer = setTimeout(() => {
        setVisible(false)
      }, 700) // Duración del fadeout en CSS (0.7s)
      return () => clearTimeout(timer)
    }
  }, [dioramaListo])

  // 4. Bloquear el scroll mientras la pantalla de carga esté activa (visible)
  useEffect(() => {
    if (visible) {
      const originalOverflow = document.body.style.overflow
      const originalHtmlOverflow = document.documentElement.style.overflow
      
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'

      return () => {
        document.body.style.overflow = originalOverflow
        document.documentElement.style.overflow = originalHtmlOverflow
      }
    }
  }, [visible])

  if (!visible) return null

  const percentage = Math.floor(smoothProgress)

  return (
    <div className={`diorama-loader ${fading ? 'diorama-loader--fading' : ''}`}>
      <div className="diorama-loader__content">
        {/* Portal de Vórtex Temporal (Efecto Visual Premium) */}
        <div className="diorama-loader__portal-container">
          <div className="diorama-loader__portal-ring ring-outer"></div>
          <div className="diorama-loader__portal-ring ring-middle"></div>
          <div className="diorama-loader__portal-ring ring-inner"></div>
          <div className="diorama-loader__portal-core">⏳</div>
        </div>

        <h2 className="diorama-loader__title">Abriendo Portal Temporal</h2>
        <p className="diorama-loader__subtitle">Sincronizando con la historia de Santa Elena...</p>

        {/* Sección de Curiosidades (Rotativa) */}
        <div className="diorama-loader__card">
          <div className="diorama-loader__card-tag">¿SABÍAS QUÉ?</div>
          <div className="diorama-loader__card-text-container">
            <p key={curiosidadIndex} className="diorama-loader__card-text">
              {CURIOSIDADES[curiosidadIndex]}
            </p>
          </div>
        </div>

        {/* Barra de Progreso */}
        <div className="diorama-loader__progress-container">
          <div className="diorama-loader__progress-bar-wrapper">
            <div 
              className="diorama-loader__progress-bar" 
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="diorama-loader__percentage">{percentage}%</div>
        </div>
      </div>
    </div>
  )
}
