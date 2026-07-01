

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
        {/* Minimalist black flame cutout representing fat burning / streak */}
        <path
          d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
          fill="#000000"
        />
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
