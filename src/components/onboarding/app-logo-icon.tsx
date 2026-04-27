import React from 'react';

export const AppLogoIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <img
    src="/icon.svg"
    alt="Sponzy logo"
    className={['object-contain', className].filter(Boolean).join(' ')}
    style={style}
    loading="lazy"
    decoding="async"
  />
);
