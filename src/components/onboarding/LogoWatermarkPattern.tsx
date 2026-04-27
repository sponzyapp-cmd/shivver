"use client";

import { AppLogoIcon } from './AppLogoIcon';

const LOGO_COUNT = 132;

export function LogoWatermarkPattern() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className="absolute -bottom-6 -left-8 h-[58vh] w-[68vw] max-w-[360px]"
        style={{
          maskImage:
            'linear-gradient(42deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 18%, rgba(0,0,0,0.65) 38%, rgba(0,0,0,0.28) 54%, transparent 70%)',
          WebkitMaskImage:
            'linear-gradient(42deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 18%, rgba(0,0,0,0.65) 38%, rgba(0,0,0,0.28) 54%, transparent 70%)',
        }}
      >
        <div className="grid grid-cols-11 gap-0.5 text-[#0f0f16] opacity-70 dark:text-white">
          {Array.from({ length: LOGO_COUNT }).map((_, index) => {
            const size = 10 + (index % 4);
            const rotation = (index % 5) * 7 - 14;
            return (
              <AppLogoIcon
                key={`logo-pattern-${index}`}
                className="shrink-0"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  transform: `rotate(${rotation}deg)`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
