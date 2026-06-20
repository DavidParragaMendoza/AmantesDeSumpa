/**
 * ROTATE PROMPT — Indicador de rotación para móviles
 *
 * Aparece SOLO cuando:
 *   - El dispositivo es móvil/táctil (max-width: 768px)
 *   - La orientación es portrait (vertical)
 *
 * Desaparece automáticamente al rotar a landscape (horizontal).
 * Usa CSS @media (orientation) para mostrarse/ocultarse sin JS extra.
 */

import './RotatePrompt.css'

export function RotatePrompt() {
  return (
    <div className="rotate-prompt" role="dialog" aria-label="Gira tu dispositivo">
      {/* Ícono del teléfono con animación de rotación */}
      <div className="rotate-prompt__icon-wrapper">
        <div className="rotate-prompt__phone" aria-hidden="true" />

        {/* Flecha curva de rotación (SVG inline) */}
        <svg
          className="rotate-prompt__arrow"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M8 20 A14 14 0 0 1 32 20"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <polyline
            points="28,14 32,20 26,22"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Texto descriptivo */}
      <div className="rotate-prompt__text">
        <p className="rotate-prompt__title">Gira tu dispositivo</p>
        <p className="rotate-prompt__subtitle">
          Para una mejor experiencia,<br />
          usa el modo horizontal
        </p>
      </div>

      {/* Ornamento decorativo precolombino */}
      <div className="rotate-prompt__ornament" aria-hidden="true">
        <span className="rotate-prompt__line" />
        <span className="rotate-prompt__diamond" />
        <span className="rotate-prompt__line" />
      </div>
    </div>
  )
}
