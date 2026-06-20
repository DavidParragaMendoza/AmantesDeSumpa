import React, { useRef, useState, useEffect } from 'react'
import { useMuseoStore } from '../store/useMuseoStore'
import './PaintingCanvas.css'

const PRECOLOMBIAN_PALETTE = [
  { name: 'Terracota', value: '#b85c38', description: 'Cerámica tradicional' },
  { name: 'Oro', value: '#c9a84c', description: 'Orfebrería precolombina' },
  { name: 'Océano', value: '#2a6b8a', description: 'Agua y concha spondylus azul' },
  { name: 'Spondylus', value: '#c84b6b', description: 'Rosa sagrado de concha' },
  { name: 'Arena', value: '#e8d5a3', description: 'Desierto costero de Santa Elena' },
  { name: 'Carbón', value: '#1f2937', description: 'Pintura negra de arcilla' },
  { name: 'Cal', value: '#f9fafb', description: 'Blanco mineral' },
  { name: 'Ocre', value: '#d97706', description: 'Tierra arcillosa oxidada' }
]

const PAINT_TEMPLATES = [
  {
    id: 'rei',
    name: 'Rei Explorador',
    thumb: '🦎',
    src: '/assets/PintarRei.webp',
    reference: '/assets/Rei.webp',
    isGrayscale: false,
    defaultAspect: 1600 / 872
  },
  {
    id: 'maquina',
    name: 'Máquina del Tiempo',
    thumb: '⏳',
    src: '/assets/maquinaDelTiempo.webp',
    reference: '/assets/maquinaDelTiempo.webp',
    isGrayscale: true,
    defaultAspect: 1600 / 872
  }
]

export function PaintingCanvas() {
  const setModo = useMuseoStore(s => s.setModo)
  const canvasRef = useRef(null)
  const [color, setColor] = useState(PRECOLOMBIAN_PALETTE[0].value)
  const [brushSize, setBrushSize] = useState(12)
  const [tool, setTool] = useState('brush') // 'brush', 'eraser'
  const [isDrawing, setIsDrawing] = useState(false)
  const [zoom, setZoom] = useState(1.0)
  const [activeTemplate, setActiveTemplate] = useState(null)
  const [aspectRatio, setAspectRatio] = useState(1600 / 872)
  const lastPos = useRef({ x: 0, y: 0 })
  const [cursorStyle, setCursorStyle] = useState('crosshair')

  // Generar cursor circular dinámico según el grosor del pincel
  useEffect(() => {
    const size = brushSize
    const radius = size / 2
    const center = radius + 2
    const totalSize = size + 4

    // SVG con círculo de alto contraste (borde blanco y negro) para ser visible sobre cualquier fondo
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalSize}" height="${totalSize}" viewBox="0 0 ${totalSize} ${totalSize}"><circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="white" stroke-width="1.5"/><circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="black" stroke-width="0.75"/></svg>`.trim()

    const encodedSvg = encodeURIComponent(svg)
      .replace(/'/g, "%27")
      .replace(/"/g, "%22")
    const cursorUrl = `url("data:image/svg+xml;utf8,${encodedSvg}") ${center} ${center}, crosshair`
    setCursorStyle(cursorUrl)
  }, [brushSize])

  // Cargar relación de aspecto de la imagen de plantilla dinámicamente
  useEffect(() => {
    if (!activeTemplate) return
    const img = new Image()
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight
      setAspectRatio(ratio || activeTemplate.defaultAspect)
    }
    img.src = activeTemplate.src
  }, [activeTemplate])

  // Inicializar Canvas con fondo blanco y configurar listeners
  useEffect(() => {
    if (!activeTemplate) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // Configurar resoluciones lógicas basadas en la relación de aspecto dinámica
    canvas.width = 800
    canvas.height = Math.round(800 / aspectRatio)

    // Pintar fondo inicial
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [activeTemplate, aspectRatio])

  // Obtener coordenadas relativas al Canvas (soporta Touch y Mouse)
  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()

    // Soporte para touch events
    if (e.touches && e.touches.length > 0) {
      return {
        x: ((e.touches[0].clientX - rect.left) / rect.width) * canvas.width,
        y: ((e.touches[0].clientY - rect.top) / rect.height) * canvas.height
      }
    }

    // Soporte para mouse events
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height
    }
  }

  // Iniciar trazo
  const startDrawing = (e) => {
    e.preventDefault()
    const coords = getCoordinates(e)
    if (!coords) return
    setIsDrawing(true)
    lastPos.current = coords

    // Pintar un punto inmediatamente al hacer click
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
    ctx.lineTo(coords.x, coords.y)
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    ctx.closePath()
  }

  // Dibujar
  const draw = (e) => {
    if (!isDrawing) return
    e.preventDefault()

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const coords = getCoordinates(e)

    if (!canvas || !ctx || !coords) return

    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(coords.x, coords.y)

    // Configurar tipo de trazo
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.stroke()
    ctx.closePath()

    lastPos.current = coords
  }

  // Parar trazo
  const stopDrawing = () => {
    setIsDrawing(false)
  }

  // Limpiar lienzo
  const handleClear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  // Fusionar Canvas + Imagen y Descargar
  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Crear canvas temporal
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    const tempCtx = tempCanvas.getContext('2d')

    // 1. Dibujar el fondo y lo que el usuario pintó
    tempCtx.drawImage(canvas, 0, 0)

    // 2. Dibujar la imagen de plantilla encima usando multiplicación de colores
    const image = new Image()
    image.onload = () => {
      tempCtx.globalCompositeOperation = 'multiply'

      // Aplicar filtro de escala de grises si la plantilla lo requiere
      if (activeTemplate.isGrayscale) {
        tempCtx.filter = 'grayscale(100%) contrast(150%)'
      }

      tempCtx.drawImage(image, 0, 0, canvas.width, canvas.height)

      // Descargar la fusión
      const link = document.createElement('a')
      link.download = `${activeTemplate.id}-pintado.png`
      link.href = tempCanvas.toDataURL('image/png')
      link.click()
    }
    image.src = activeTemplate.src
  }

  if (!activeTemplate) {
    return (
      <div className="paint-selection-screen">
        <header className="paint-selection-header">
          <div className="paint-selection-title-area">
            <span className="paint-badge">Taller Creativo</span>
            <h1 className="paint-selection-title">Elige tu Lienzo Ancestral</h1>
            <p className="paint-selection-subtitle">
              Selecciona una pieza arqueológica o personaje histórico de la cultura Sumpa para comenzar a darle vida con color.
            </p>
          </div>
          <button className="paint-back-btn" onClick={() => setModo('landing')}>
            Volver al Menú
          </button>
        </header>

        <div className="paint-selection-container">
          <div className="paint-templates-grid">
            {PAINT_TEMPLATES.map((t) => (
              <div
                key={t.id}
                className="paint-template-selection-card"
                onClick={() => setActiveTemplate(t)}
              >
                <div className="paint-template-card-preview">
                  <img src={t.reference} alt={t.name} className="paint-preview-img" />
                  <div className="paint-card-overlay">
                    <span className="paint-card-action-text">Comenzar a Pintar</span>
                  </div>
                </div>
                <div className="paint-template-card-footer">
                  <span className="paint-template-card-emoji">{t.thumb}</span>
                  <div className="paint-template-card-text">
                    <h3 className="paint-template-card-name">{t.name}</h3>
                    <p className="paint-template-card-desc">
                      {t.id === 'rei'
                        ? 'Colorea a Rei, el intrépido lagarto explorador y guía del museo Amantes de Sumpa.'
                        : 'Una ilustración de la enigmática máquina que nos transporta a través del tiempo y las eras.'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="paint-overlay-container">
      {/* Header */}
      <header className="paint-header">
        <div className="paint-title-area">
          <h2>Taller de Pintura Ancestral</h2>
          <p>Coloreando: <strong>{activeTemplate.name}</strong></p>
        </div>
        <div className="paint-header-actions">
          <button className="paint-change-btn" onClick={() => setActiveTemplate(null)}>
            🎨 Cambiar Lienzo
          </button>
          <button className="paint-close-btn" onClick={() => setModo('landing')}>
            Volver al Menú
          </button>
        </div>
      </header>

      {/* Workspace */}
      <div className="paint-workspace">
        {/* Panel de herramientas (izquierda) */}
        <aside className="paint-tool-panel">

          {/* Seleccionar Herramienta */}
          <div className="tool-section">
            <h3 className="panel-section-title">Herramientas</h3>
            <div className="tool-grid">
              <button
                className={`tool-btn ${tool === 'brush' ? 'active' : ''}`}
                onClick={() => setTool('brush')}
              >
                <span className="tool-btn-icon">🖌️</span>
                <span>Pincel</span>
              </button>
              <button
                className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
                onClick={() => setTool('eraser')}
              >
                <span className="tool-btn-icon">🧹</span>
                <span>Borrador</span>
              </button>
            </div>
          </div>

          {/* Grosor de Pincel */}
          <div className="tool-section">
            <h3 className="panel-section-title">Grosor</h3>
            <input
              type="range"
              min="3"
              max="40"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="brush-size-slider"
            />
            <div className="size-preview">
              <span>Fino</span>
              <span>{brushSize}px</span>
              <span>Grueso</span>
            </div>
          </div>

          {/* Acciones del Lienzo (justo debajo del grosor) */}
          <div className="paint-actions-panel">
            <button className="action-btn btn-clear" onClick={handleClear}>
              <span>🗑️</span> Limpiar
            </button>
            <button className="action-btn btn-download" onClick={handleDownload}>
              <span>💾</span> Descargar
            </button>
          </div>

          {/* Guía de Referencia */}
          <div className="tool-section reference-section">
            <h3 className="panel-section-title">Referencia</h3>
            <div className="reference-box">
              <img
                src={activeTemplate.reference}
                alt="Guía de Referencia"
                className="reference-img"
              />
            </div>
          </div>
        </aside>

        {/* Zona del Lienzo de Dibujo */}
        <main className="canvas-holder">
          {/* Controles de Zoom Flotantes */}
          <div className="zoom-controls">
            <button
              className="zoom-btn"
              onClick={() => setZoom(z => Math.max(1.0, z - 0.25))}
              disabled={zoom <= 1.0}
              title="Alejar"
            >
              ➖
            </button>
            <span className="zoom-text">{Math.round(zoom * 100)}%</span>
            <button
              className="zoom-btn"
              onClick={() => setZoom(z => Math.min(2.5, z + 0.25))}
              disabled={zoom >= 2.5}
              title="Acercar"
            >
              ➕
            </button>
          </div>

          <div
            className="canvas-wrapper"
            style={{
              '--scale': zoom,
              aspectRatio: aspectRatio
            }}
          >
            <canvas
              ref={canvasRef}
              className="drawing-canvas"
              style={{ cursor: cursorStyle }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />

            {/* Imagen superpuesta al Canvas (no captura eventos táctiles/click) */}
            <img
              src={activeTemplate.src}
              className={`canvas-image-overlay ${activeTemplate.isGrayscale ? 'grayscale-effect' : ''}`}
              alt={activeTemplate.name}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                objectFit: 'contain'
              }}
            />
          </div>
        </main>

        {/* Panel de colores (derecha) */}
        <aside className="paint-color-panel">
          <h3 className="panel-section-title">Paleta</h3>
          <div className="color-grid">
            {PRECOLOMBIAN_PALETTE.map((c, i) => (
              <button
                key={i}
                className={`color-swatch ${color === c.value && tool === 'brush' ? 'active' : ''}`}
                style={{ backgroundColor: c.value }}
                onClick={() => {
                  setColor(c.value)
                  setTool('brush') // Cambiar automáticamente a pincel
                }}
                title={`${c.name}: ${c.description}`}
              />
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
