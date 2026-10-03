// The app icon: the guide itself, an arrowhead over three dashes that widen
// toward you as if painted on the street, on white-to-gray glass. Opaque and
// full-bleed: iOS applies its own corner mask and fills transparency with black.
export function IconArt({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: "linear-gradient(160deg, #ffffff 0%, #f4f4f7 45%, #e4e4e9 100%)",
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 100 100">
        <path d="M50 8 L69 33 L31 33 Z" fill="#1d1d1f" stroke="#1d1d1f" strokeWidth="6" strokeLinejoin="round" />
        <rect x="46" y="41" width="8" height="14" rx="4" fill="#1d1d1f" />
        <rect x="45" y="61" width="10" height="15" rx="5" fill="#1d1d1f" />
        <rect x="43.5" y="81" width="13" height="16" rx="6" fill="#1d1d1f" />
      </svg>
    </div>
  );
}
