export function NoiseOverlay() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <svg className="w-full h-full opacity-[0.06]">
        <filter id="noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>
    </div>
  );
}
