import React from 'react';

/**
 * WAVE Brand Logo SVG
 * Reproduces the geometric "WAVE - Climb the Coast" brand mark.
 * Rendered in 100% pure bright white (#FFFFFF) with unclipped geometry.
 */
export const WaveLogoSVG: React.FC<{ className?: string; color?: string }> = ({
  className = "w-8 h-8",
  color = "#FFFFFF",
}) => (
  <svg
    viewBox="0 0 110 105"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-label="WAVE Logo"
  >
    <g fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round">
      {/* 1st Diagonal Bar (Left) */}
      <path d="M 22 85 L 52 28" />
      {/* 2nd Diagonal Bar (Middle) */}
      <path d="M 46 85 L 76 28" />
      {/* 3rd Diagonal Bar (Top Right) */}
      <path d="M 70 48 L 85 19.5" />
    </g>
    {/* Bottom Right Rounded Square Dot */}
    <rect x="69" y="69" width="17" height="17" rx="5" fill={color} />
  </svg>
);

export const WaveFullLogoSVG: React.FC<{ className?: string; color?: string }> = ({
  className = "h-8 w-auto",
  color = "#FFFFFF",
}) => (
  <svg
    viewBox="0 0 320 105"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-label="WAVE - Climb the Coast Logo"
  >
    {/* Symbol Mark */}
    <g fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 22 85 L 52 28" />
      <path d="M 46 85 L 76 28" />
      <path d="M 70 48 L 85 19.5" />
    </g>
    <rect x="69" y="69" width="17" height="17" rx="5" fill={color} />

    {/* Text: WAVE */}
    <text
      x="108"
      y="52"
      fill={color}
      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      fontWeight="900"
      fontSize="44"
      letterSpacing="3"
    >
      WAVE
    </text>

    {/* Subtitle Text: Climb the Coast */}
    <text
      x="110"
      y="78"
      fill={color}
      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      fontWeight="400"
      fontSize="18"
      letterSpacing="1.5"
      opacity="0.95"
    >
      Climb the Coast
    </text>
  </svg>
);
