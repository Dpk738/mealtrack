

interface MinimalistLogoProps {
  size?: number;
  showText?: boolean;
}

export default function MinimalistLogo({ size = 24, showText = true }: MinimalistLogoProps) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Radium color box background */}
        <rect width="24" height="24" rx="6" fill="#cbf600" />
        {/* Minimalist black circle cutout */}
        <circle cx="12" cy="12" r="5" fill="#000000" />
        {/* Central radium dot */}
        <circle cx="12" cy="12" r="2.5" fill="#cbf600" />
      </svg>
      {showText && (
        <span
          style={{
            color: '#cbf600',
            fontWeight: 800,
            fontSize: size >= 28 ? '22px' : '18px',
            letterSpacing: '-1px',
            textTransform: 'uppercase',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          }}
        >
          NutriTrack
        </span>
      )}
    </div>
  );
}
