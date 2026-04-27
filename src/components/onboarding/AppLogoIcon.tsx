"use client";

export const AppLogoIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={style}
  >
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0071E3" />
        <stop offset="100%" stopColor="#6366F3" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="url(#grad)" />
    <text x="16" y="22" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white" fontFamily="Inter, sans-serif">S</text>
  </svg>
);
