import React from 'react'
import { useFullscreen } from '../hooks/useFullscreen'

export function FullscreenToggle({ className }) {
  const { isFullscreen, toggleFullscreen, isSupported } = useFullscreen()

  if (!isSupported) return null

  return (
    <button
      id="fullscreen-toggle-btn"
      className={className || "hud__fullscreen-btn"}
      onClick={toggleFullscreen}
      aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
      title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
    >
      {isFullscreen ? (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
          <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
          <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      )}
    </button>
  )
}
