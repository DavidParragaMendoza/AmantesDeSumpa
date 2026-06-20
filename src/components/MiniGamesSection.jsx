import React, { useState, useEffect } from 'react'
import { useMuseoStore } from '../store/useMuseoStore'
import './MiniGamesSection.css'

// 8 pares de cartas inspirados en las reliquias e historia del museo
const CARD_TEMPLATES = [
  { id: 'rei', img: '/assets/Rei.webp', name: 'Rei la Salamanquesa' },
  { id: 'maquina', img: '/assets/maquinaDelTiempo.webp', name: 'Máquina del Tiempo' },
  { id: 'amantes', img: '/assets/amantesSumpa.webp', name: 'Amantes de Sumpa' },
  { id: 'entierro', img: '/assets/entierroMasivo.webp', name: 'Entierro Masivo' },
  { id: 'esqueleto1', img: '/assets/esqueleto1.webp', name: 'Osamenta Ancestral 1' },
  { id: 'esqueleto2', img: '/assets/esqueleto2.webp', name: 'Osamenta Ancestral 2' },
  { id: 'huesos', img: '/assets/huesoRojos.webp', name: 'Huesos Rojos' },
  { id: 'lasvegas', img: '/assets/Las_Vegas.webp', name: 'Cultura Las Vegas' }
]

const GAMES = [
  {
    id: 'memoria',
    name: 'Memoria Sumpa',
    icon: '🧠',
    image: '/assets/minijuego.webp',
    description: 'Encuentra las parejas de reliquias y personajes del museo y pon a prueba tu memoria arqueológica.',
    playable: true
  },
  {
    id: 'rompecabezas',
    name: 'Rompecabezas Ancestral',
    icon: '🧩',
    image: '/assets/museo.webp',
    description: 'Reconstruye vasijas y piezas ceremoniales de la cultura Valdivia ordenando sus fragmentos.',
    playable: false
  },
  {
    id: 'trivia',
    name: 'Trivia de las Eras',
    icon: '❓',
    image: '/assets/maquinaDelTiempo.webp',
    description: 'Demuestra cuánto has aprendido sobre los ritos funerarios y modos de vida de las culturas precolombinas.',
    playable: false
  }
]

export function MiniGamesSection() {
  const setModo = useMuseoStore(s => s.setModo)
  const audioHabilitado = useMuseoStore(s => s.audioHabilitado)

  const [activeGame, setActiveGame] = useState(null)
  const [cards, setCards] = useState([])
  const [flippedIndices, setFlippedIndices] = useState([])
  const [matchedIds, setMatchedIds] = useState([])
  const [moves, setMoves] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [showWinPopup, setShowWinPopup] = useState(false)

  // Inicializar y barajar el tablero
  const initializeGame = () => {
    // Duplicar las plantillas para crear parejas
    const deck = [...CARD_TEMPLATES, ...CARD_TEMPLATES].map((card, index) => ({
      ...card,
      uniqueId: index, // Identificador único de instancia de carta en el tablero
      isFlipped: false,
      isMatched: false
    }))

    // Barajar aleatoriamente usando algoritmo Fisher-Yates
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]]
    }

    setCards(deck)
    setFlippedIndices([])
    setMatchedIds([])
    setMoves(0)
    setIsLocked(false)
    setShowWinPopup(false)
  }

  // Barajar cuando se inicia el juego de memoria
  useEffect(() => {
    if (activeGame === 'memoria') {
      initializeGame()
    }
  }, [activeGame])

  // Manejar click en carta
  const handleCardClick = (index) => {
    // Restricciones: tablero bloqueado, misma carta ya volteada, o ya emparejada
    if (isLocked) return
    if (flippedIndices.includes(index)) return
    if (cards[index].isMatched) return

    // Voltear la carta
    const newFlipped = [...flippedIndices, index]
    setFlippedIndices(newFlipped)

    // Si es la segunda carta volteada
    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1)
      setIsLocked(true)

      const firstCard = cards[newFlipped[0]]
      const secondCard = cards[newFlipped[1]]

      // Verificar coincidencia
      if (firstCard.id === secondCard.id) {
        // Coincidencia! Marcar ambas como emparejadas
        setTimeout(() => {
          setCards(prevCards => {
            const updated = [...prevCards]
            updated[newFlipped[0]].isMatched = true
            updated[newFlipped[1]].isMatched = true
            return updated
          })
          
          setMatchedIds(prev => {
            const next = [...prev, firstCard.id]
            // Verificar si ganó (8 parejas emparejadas)
            if (next.length === CARD_TEMPLATES.length) {
              setShowWinPopup(true)
            }
            return next
          })

          setFlippedIndices([])
          setIsLocked(false)
        }, 500)
      } else {
        // No coinciden. Voltear boca abajo después de 1.1s
        setTimeout(() => {
          setFlippedIndices([])
          setIsLocked(false)
        }, 1100)
      }
    }
  }

  if (!activeGame) {
    return (
      <div className="games-selection-screen">
        <header className="games-selection-header">
          <div className="games-selection-title-area">
            <span className="games-badge">Sala de Juegos</span>
            <h1 className="games-selection-title">Minijuegos Interactivos</h1>
            <p className="games-selection-subtitle">
              Diviértete y refuerza tus conocimientos sobre la arqueología e historia de la península de Santa Elena.
            </p>
          </div>
          <button className="games-back-btn" onClick={() => setModo('landing')}>
            Volver al Menú
          </button>
        </header>

        <div className="games-selection-container">
          <div className="games-templates-grid">
            {GAMES.map((game) => (
              <div
                key={game.id}
                className={`games-template-selection-card ${!game.playable ? 'locked' : ''}`}
                onClick={() => {
                  if (game.playable) {
                    setActiveGame(game.id)
                  }
                }}
              >
                <div className="games-template-card-preview">
                  <img src={game.image} alt={game.name} className="games-preview-img" />
                  <div className="games-card-overlay">
                    {game.playable ? (
                      <span className="games-card-action-text">Jugar Ahora</span>
                    ) : (
                      <span className="games-card-action-text locked-text">🔐 Próximamente</span>
                    )}
                  </div>
                </div>
                <div className="games-template-card-footer">
                  <span className="games-template-card-emoji">{game.icon}</span>
                  <div className="games-template-card-text">
                    <div className="games-card-title-row">
                      <h3 className="games-template-card-name">{game.name}</h3>
                      {!game.playable && <span className="games-locked-badge">Próximamente</span>}
                    </div>
                    <p className="games-template-card-desc">{game.description}</p>
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
    <div className="games-overlay-container">
      {/* Header */}
      <header className="games-header">
        <div className="games-title-area">
          <h2>Memoria Sumpa</h2>
          <p>Encuentra las parejas de reliquias precolombinas del museo</p>
        </div>
        <div className="games-header-actions">
          <button className="games-change-btn" onClick={() => setActiveGame(null)}>
            🎮 Cambiar Juego
          </button>
          <button className="games-close-btn" onClick={() => setModo('landing')}>
            Volver al Menú
          </button>
        </div>
      </header>

      {/* Workspace */}
      <div className="games-workspace">
        {/* Sidebar Estadísticas */}
        <aside className="games-sidebar">
          <div className="games-stats-area">
            <div className="games-stat-card">
              <span className="games-stat-label">Movimientos</span>
              <span className="games-stat-value">{moves}</span>
            </div>
            
            <div className="games-stat-card" style={{ marginTop: '1rem' }}>
              <span className="games-stat-label">Parejas</span>
              <span className="games-stat-value">{matchedIds.length} / {CARD_TEMPLATES.length}</span>
            </div>
          </div>

          <div className="games-instructions">
            <h4>¿Cómo jugar?</h4>
            <p>Pon a prueba tu memoria arqueológica:</p>
            <ul>
              <li>Haz clic en una carta para voltearla y ver la reliquia.</li>
              <li>Busca su pareja idéntica en el tablero.</li>
              <li>Si fallas, las cartas volverán a voltearse. ¡Memoriza sus posiciones!</li>
            </ul>
          </div>

          <button className="games-reset-btn" onClick={initializeGame}>
            🔄 Reiniciar Juego
          </button>
        </aside>

        {/* Tablero de Cartas */}
        <main className="games-board-container">
          <div className="memory-grid">
            {cards.map((card, index) => {
              const isFlipped = flippedIndices.includes(index) || card.isMatched
              
              return (
                <div 
                  key={card.uniqueId}
                  className={`memory-card ${isFlipped ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`}
                  onClick={() => handleCardClick(index)}
                >
                  <div className="card-inner">
                    {/* Frente de la carta (Imagen de la reliquia) */}
                    <div className="card-front">
                      <img 
                        src={card.img} 
                        alt={card.name} 
                        className="card-image"
                        draggable="false"
                      />
                    </div>
                    {/* Reverso de la carta */}
                    <div className="card-back">
                      <div className="card-back-pattern">
                        <span>🏺</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Modal de Felicitación al ganar */}
          {showWinPopup && (
            <div className="win-popup-overlay">
              <div className="win-popup">
                <div className="win-icon">🎉</div>
                <h3>¡Excelente Memoria!</h3>
                <p>Has encontrado todas las reliquias arqueológicas del Museo Amantes de Sumpa.</p>
                
                <div className="win-stats">
                  <div className="win-stat-item">
                    <span className="games-stat-label">Intentos</span>
                    <span className="win-stat-num">{moves}</span>
                  </div>
                  <div className="win-stat-item">
                    <span className="games-stat-label">Precisión</span>
                    <span className="win-stat-num">
                      {Math.round((CARD_TEMPLATES.length / moves) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="win-actions">
                  <button className="win-btn btn-win-replay" onClick={initializeGame}>
                    Jugar de Nuevo
                  </button>
                  <button className="win-btn btn-win-menu" onClick={() => setModo('landing')}>
                    Volver al Menú
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
