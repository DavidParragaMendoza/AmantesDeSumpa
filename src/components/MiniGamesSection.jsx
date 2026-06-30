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
    id: 'esqueletos',
    name: 'Búsqueda de Osamentas',
    icon: '💀',
    image: '/assets/entierroMasivo.webp',
    description: 'Ayuda a Rei a encontrar las tres osamentas ancestrales de la cultura Las Vegas escondidas en el entierro masivo.',
    playable: true
  },
 
  {
    id: 'trivia',
    name: 'Trivia de las Eras',
    icon: '❓',
    image: '/assets/maquinaDelTiempo.webp',
    description: 'Demuestra cuánto has aprendido sobre los ritos funerarios y modos de vida de las culturas precolombinas.',
    playable: true
  }
]

const TRIVIA_QUESTIONS = [
  {
    era: 'Cultura Las Vegas',
    title: 'Los Primeros Habitantes',
    question: 'En la Cultura Las Vegas, se descubrió un entierro muy famoso donde un hombre y una mujer fueron sepultados juntos, abrazados, y con grandes piedras colocadas sobre ellos. ¿Cómo se conoce a este hallazgo?',
    options: [
      { key: 'A', text: 'Los Navegantes del Guayas.' },
      { key: 'B', text: 'Los Amantes de Sumpa.' },
      { key: 'C', text: 'Los Chamanes de la Costa.' }
    ],
    correctAnswer: 'B',
    explanation: 'Son los "Amantes de Sumpa". Es un entierro directo (primario) de un hombre y una mujer jóvenes. Fueron acomodados cuidadosamente y se colocaron grandes piedras sobre ellos en lugares específicos, una vez enterrados.'
  },
  {
    era: 'Cultura Las Vegas',
    title: 'El Color de la Protección',
    question: 'A veces, los habitantes de Las Vegas desenterraban a sus muertos mucho tiempo después, tomaban los huesos sueltos y los armaban en forma de un "paquete". ¿Qué color de pintura les ponían a estos huesos y por qué?',
    options: [
      { key: 'A', text: 'Color rojo, como símbolo de vida, sangre y protección espiritual.' },
      { key: 'B', text: 'Color azul, para representar el agua del mar y los ríos.' },
      { key: 'C', text: 'No los pintaban, los envolvían en hojas de maíz.' }
    ],
    correctAnswer: 'A',
    explanation: 'Esta es la tradición de los huesos rojos. Se aplicaba en los "entierros secundarios", donde se usaba pigmento de color rojo ocre sobre los huesos desarticulados para brindarles protección espiritual en el más allá.'
  },
  {
    era: 'Cultura Valdivia y Machalilla',
    title: 'El Inicio de las Aldeas',
    question: 'Cuando las sociedades dejaron de ser nómadas y construyeron las primeras aldeas, sus costumbres cambiaron. ¿Dónde acostumbraban las culturas Valdivia y Machalilla a enterrar a sus muertos?',
    options: [
      { key: 'A', text: 'En altas pirámides de piedra.' },
      { key: 'B', text: 'En fosas masivas alejadas de la aldea.' },
      { key: 'C', text: 'Debajo o dentro de sus propias casas.' }
    ],
    correctAnswer: 'C',
    explanation: 'Tanto los Valdivianos como la cultura Machalilla tenían la costumbre de sepultar a sus difuntos debajo de sus casas. En ocasiones, los colocaban junto a una ofrenda o dentro de vasijas de barro.'
  },
  {
    era: 'Cultura Valdivia',
    title: 'El Símbolo de la Fertilidad',
    question: 'La Cultura Valdivia fue pionera en el trabajo del barro (cerámica). ¿Cuál es su figura más representativa, que simboliza el poder femenino, la fertilidad y la prosperidad?',
    options: [
      { key: 'A', text: 'El poste tallado de Guasango.' },
      { key: 'B', text: 'La Figurina (o Venus) de Valdivia.' },
      { key: 'C', text: 'La vasija silbato.' }
    ],
    correctAnswer: 'B',
    explanation: 'Las famosas figurinas de Valdivia. Iniciaron tallándolas en piedra y luego en arcilla, y son un ícono fundamental de la mujer, la fertilidad de la tierra y la reproducción, además de usarse como promesas u ofrendas.'
  },
  {
    era: 'Cultura Guangala',
    title: 'Magia y Liderazgo',
    question: 'En la sociedad Guangala crecieron los centros poblados. En esta época, ¿quién era el personaje principal, que tenía el poder para organizar la producción y comunicarse con los espíritus?',
    options: [
      { key: 'A', text: 'El Cacique Chamán.' },
      { key: 'B', text: 'El Cazador Recolector.' },
      { key: 'C', text: 'El Navegante Mercader.' }
    ],
    correctAnswer: 'A',
    explanation: 'El Cacique Chamán. Era la figura principal de esta sociedad cacical inicial. Dirigía los rituales en los centros ceremoniales donde veneraban a deidades de la naturaleza como el felino, la serpiente, el águila y el caimán.'
  },
  {
    era: 'Cultura Manteño-Guancavilca',
    title: 'Los Señores del Mar',
    question: 'Los Manteño-Guancavilcas fueron grandes navegantes que viajaban en inmensas balsas con velas de algodón. ¿Cuál era el principal artículo marino, considerado símbolo de lluvia y fertilidad, que intercambiaban en sus viajes?',
    options: [
      { key: 'A', text: 'Dientes de animales salvajes.' },
      { key: 'B', text: 'La concha Spondylus.' },
      { key: 'C', text: 'Vasijas de piedra.' }
    ],
    correctAnswer: 'B',
    explanation: 'La concha Spondylus. Era un artículo sumamente valioso e importante, codiciado en todas partes desde Chile hasta México, que utilizaban como bien de prestigio y ofrenda mediante su Liga de Mercaderes.'
  },
  {
    era: 'Cultura Manteño-Guancavilca',
    title: 'El Viaje Final',
    question: 'Para los Manteños, la muerte era vista como un viaje al mundo de abajo. ¿En dónde colocaban el cuerpo de sus difuntos para este viaje?',
    options: [
      { key: 'A', text: 'En urnas o vasijas de cerámica.' },
      { key: 'B', text: 'Los dejaban en balsas navegando a la deriva.' },
      { key: 'C', text: 'En cuevas subterráneas.' }
    ],
    correctAnswer: 'A',
    explanation: 'Tenían la costumbre de colocar el cuerpo en vasijas, y el tamaño de la misma dependía del rango que tuvo la persona en vida. Las decoraban con líneas en zig-zag que aludían a los portales entre los mundos, y los acompañaban con pertenencias para su travesía.'
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

  // Estado para el minijuego de las Osamentas (esqueletos)
  const [esqueletosEncontrados, setEsqueletosEncontrados] = useState([false, false, false])
  const [intentosEsqueletos, setIntentosEsqueletos] = useState(0)
  const [showEsqueletosWin, setShowEsqueletosWin] = useState(false)

  // Estado para el minijuego de Trivia
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState(null)
  const [score, setScore] = useState(0)
  const [showTriviaWin, setShowTriviaWin] = useState(false)
  const [triviaAnswered, setTriviaAnswered] = useState(false)

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

  // Inicializar el minijuego de las Osamentas
  const initializeEsqueletos = () => {
    setEsqueletosEncontrados([false, false, false])
    setIntentosEsqueletos(0)
    setShowEsqueletosWin(false)
  }

  // Inicializar el minijuego de Trivia
  const initializeTrivia = () => {
    setCurrentQuestionIndex(0)
    setSelectedOption(null)
    setScore(0)
    setShowTriviaWin(false)
    setTriviaAnswered(false)
  }

  // Barajar/Inicializar cuando cambia el juego activo
  useEffect(() => {
    if (activeGame === 'memoria') {
      initializeGame()
    } else if (activeGame === 'esqueletos') {
      initializeEsqueletos()
    } else if (activeGame === 'trivia') {
      initializeTrivia()
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

  if (activeGame === 'esqueletos') {
    const esqueletosFoundCount = esqueletosEncontrados.filter(Boolean).length

    const handleEsqueletoClick = (index) => {
      if (!esqueletosEncontrados[index]) {
        const next = [...esqueletosEncontrados]
        next[index] = true
        setEsqueletosEncontrados(next)
        if (next.every(Boolean)) {
          setShowEsqueletosWin(true)
        }
      }
    }

    return (
      <div className="games-overlay-container">
        {/* Header */}
        <header className="games-header">
          <div className="games-title-area">
            <h2>Búsqueda de Osamentas</h2>
            <p>Encuentra los tres ancestros de Rei escondidos en el entierro masivo</p>
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
                <span className="games-stat-label">Clics Totales</span>
                <span className="games-stat-value">{intentosEsqueletos}</span>
              </div>
              
              <div className="games-stat-card" style={{ marginTop: '1rem' }}>
                <span className="games-stat-label">Encontrados</span>
                <span className="games-stat-value">{esqueletosFoundCount} / 3</span>
              </div>
            </div>

            <div className="games-instructions">
              <h4>¿Cómo jugar?</h4>
              <p>Ayuda a Rei la Salamanquesa a encontrar los restos óseos de sus ancestros:</p>
              <ul>
                <li>Observa detenidamente la fosa del entierro masivo.</li>
                <li>Busca las siluetas de las 3 osamentas de salamanquesas escondidas en la tierra.</li>
                <li>Haz clic sobre cada una para revelarla y rodearla con un círculo.</li>
              </ul>
            </div>

            <button className="games-reset-btn" onClick={initializeEsqueletos}>
              🔄 Reiniciar Juego
            </button>
          </aside>

          {/* Tablero de Búsqueda */}
          <main className="esqueletos-board-container">
            <div className="esqueletos-search-area" onClick={() => setIntentosEsqueletos(prev => prev + 1)}>
              <img 
                src="/assets/entierroMasivo.webp" 
                alt="Fosa de Entierro Masivo" 
                className="esqueletos-bg-image"
                draggable="false"
              />
              
              {/* Esqueleto 1 */}
              <div 
                className={`esqueleto-hotspot esqueleto-1 ${esqueletosEncontrados[0] ? 'found' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  handleEsqueletoClick(0)
                }}
              >
                <img 
                  src="/assets/esqueleto1.webp" 
                  alt="Osamenta Ancestral 1" 
                  className="esqueleto-img"
                  draggable="false"
                />
                {esqueletosEncontrados[0] && <div className="esqueleto-ring"></div>}
              </div>

              {/* Esqueleto 2 */}
              <div 
                className={`esqueleto-hotspot esqueleto-2 ${esqueletosEncontrados[1] ? 'found' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  handleEsqueletoClick(1)
                }}
              >
                <img 
                  src="/assets/esqueleto2.webp" 
                  alt="Osamenta Ancestral 2" 
                  className="esqueleto-img"
                  draggable="false"
                />
                {esqueletosEncontrados[1] && <div className="esqueleto-ring"></div>}
              </div>

              {/* Esqueleto 3 */}
              <div 
                className={`esqueleto-hotspot esqueleto-3 ${esqueletosEncontrados[2] ? 'found' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  handleEsqueletoClick(2)
                }}
              >
                <img 
                  src="/assets/esqueleto3.webp" 
                  alt="Osamenta Ancestral 3" 
                  className="esqueleto-img"
                  draggable="false"
                />
                {esqueletosEncontrados[2] && <div className="esqueleto-ring"></div>}
              </div>
            </div>

            {/* Modal de Felicitación al ganar */}
            {showEsqueletosWin && (
              <div className="win-popup-overlay">
                <div className="win-popup">
                  <div className="win-icon">💀✨</div>
                  <h3>¡Excelente Vista!</h3>
                  <p>Has encontrado todas las osamentas ancestrales de la cultura Las Vegas.</p>
                  
                  <div className="win-stats">
                    <div className="win-stat-item">
                      <span className="games-stat-label">Clics Totales</span>
                      <span className="win-stat-num">{intentosEsqueletos}</span>
                    </div>
                    <div className="win-stat-item">
                      <span className="games-stat-label">Precisión</span>
                      <span className="win-stat-num">
                        {intentosEsqueletos > 0 ? Math.round((3 / intentosEsqueletos) * 100) : 100}%
                      </span>
                    </div>
                  </div>

                  <div className="win-actions">
                    <button className="win-btn btn-win-replay" onClick={initializeEsqueletos}>
                      Jugar de Nuevo
                    </button>
                    <button className="win-btn btn-win-menu" onClick={() => setActiveGame(null)}>
                      Cambiar de Juego
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

  if (activeGame === 'trivia') {
    const currentQuestion = TRIVIA_QUESTIONS[currentQuestionIndex]

    const handleOptionClick = (optionKey) => {
      if (triviaAnswered) return
      setSelectedOption(optionKey)
      setTriviaAnswered(true)
      if (optionKey === currentQuestion.correctAnswer) {
        setScore(prev => prev + 1)
      }
    }

    const handleNextQuestion = () => {
      setSelectedOption(null)
      setTriviaAnswered(false)
      if (currentQuestionIndex < TRIVIA_QUESTIONS.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1)
      } else {
        setShowTriviaWin(true)
      }
    }

    return (
      <div className="games-overlay-container">
        {/* Header */}
        <header className="games-header">
          <div className="games-title-area">
            <h2>Trivia de las Eras</h2>
            <p>Demuestra tus conocimientos sobre el Ecuador precolombino</p>
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
                <span className="games-stat-label">Pregunta</span>
                <span className="games-stat-value">{currentQuestionIndex + 1} / {TRIVIA_QUESTIONS.length}</span>
              </div>
              
              <div className="games-stat-card" style={{ marginTop: '1rem' }}>
                <span className="games-stat-label">Puntaje</span>
                <span className="games-stat-value">{score} / {TRIVIA_QUESTIONS.length}</span>
              </div>
            </div>

            <div className="games-instructions">
              <h4>¿Cómo jugar?</h4>
              <p>Pon a prueba lo aprendido en el recorrido:</p>
              <ul>
                <li>Lee con atención cada pregunta histórica.</li>
                <li>Selecciona la opción que creas correcta (A, B o C).</li>
                <li>Verás la respuesta y una explicación arqueológica al instante.</li>
              </ul>
            </div>

            <button className="games-reset-btn" onClick={initializeTrivia}>
              🔄 Reiniciar Trivia
            </button>
          </aside>

          {/* Tablero de Trivia */}
          <main className="trivia-board-container">
            {!showTriviaWin ? (
              <div className="trivia-question-card">
                <div className="trivia-question-header">
                  <span className="trivia-era-badge">{currentQuestion.era}</span>
                  <h3 className="trivia-question-title">{currentQuestion.title}</h3>
                </div>

                <p className="trivia-question-text">{currentQuestion.question}</p>

                <div className="trivia-options-grid">
                  {currentQuestion.options.map((opt) => {
                    const isSelected = selectedOption === opt.key
                    const isCorrect = opt.key === currentQuestion.correctAnswer
                    const showSuccess = triviaAnswered && isCorrect
                    const showDanger = triviaAnswered && isSelected && !isCorrect

                    let btnClass = ""
                    if (showSuccess) btnClass = "correct"
                    else if (showDanger) btnClass = "incorrect"
                    else if (triviaAnswered) btnClass = "disabled"

                    return (
                      <button
                        key={opt.key}
                        className={`trivia-option-btn ${btnClass}`}
                        onClick={() => handleOptionClick(opt.key)}
                        disabled={triviaAnswered}
                      >
                        <span className="option-key">{opt.key}</span>
                        <span className="option-text">{opt.text}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Explicación y botón Siguiente */}
                {triviaAnswered && (
                  <div className="trivia-feedback-area">
                    <div className={`trivia-feedback-heading ${selectedOption === currentQuestion.correctAnswer ? 'success' : 'danger'}`}>
                      {selectedOption === currentQuestion.correctAnswer ? '🎉 ¡Correcto!' : '❌ ¡Incorrecto!'}
                    </div>
                    <p className="trivia-explanation-text">{currentQuestion.explanation}</p>
                    <button className="trivia-next-btn" onClick={handleNextQuestion}>
                      {currentQuestionIndex < TRIVIA_QUESTIONS.length - 1 ? 'Siguiente Pregunta ➡️' : 'Ver Resultados 🏆'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Modal de Felicitación al ganar */
              <div className="win-popup-overlay">
                <div className="win-popup">
                  <div className="win-icon">🏆✨</div>
                  <h3>¡Trivia Completada!</h3>
                  <p>Has respondido todas las preguntas de las eras precolombinas.</p>
                  
                  <div className="win-stats">
                    <div className="win-stat-item">
                      <span className="games-stat-label">Puntaje Final</span>
                      <span className="win-stat-num">{score} / {TRIVIA_QUESTIONS.length}</span>
                    </div>
                    <div className="win-stat-item">
                      <span className="games-stat-label">Rendimiento</span>
                      <span className="win-stat-num">
                        {Math.round((score / TRIVIA_QUESTIONS.length) * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="win-actions">
                    <button className="win-btn btn-win-replay" onClick={initializeTrivia}>
                      Jugar de Nuevo
                    </button>
                    <button className="win-btn btn-win-menu" onClick={() => setActiveGame(null)}>
                      Cambiar de Juego
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
