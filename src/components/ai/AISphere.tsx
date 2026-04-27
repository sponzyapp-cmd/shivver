'use client';

import { useEffect, useRef } from 'react';
import { motion, animate, useMotionValue, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

type VoiceState = 'idle' | 'listening' | 'speaking' | 'processing';

interface AISphereProps {
  state: VoiceState;
  size?: number;
  className?: string;
}

export default function AISphere({ state, size = 64, className }: AISphereProps) {
  const scale = useMotionValue(1);
  const opacity = useMotionValue(0.6);

  // Color based on state
  const colorMap = {
    idle: '#6366f1', // indigo
    listening: '#22c55e', // green
    speaking: '#a855f7', // purple
    processing: '#f59e0b', // amber
  };
  const color = colorMap[state];

  // Pulse animation based on state
  useEffect(() => {
    const intensity = state === 'idle' ? 0.1 : state === 'processing' ? 0.3 : 0.2;
    const frequency = state === 'idle' ? 2 : state === 'processing' ? 4 : 3;

    const anim = animate(scale, [1, 1 + intensity, 1], {
      duration: 1 / frequency,
      repeat: Infinity,
      ease: 'easeInOut',
    });

    return () => anim.stop();
  }, [state, scale]);

  // Generate dots (positions on sphere surface using golden spiral)
  const dots = useDotsOnSphere(30);

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full blur-xl"
        style={{
          backgroundColor: color,
          opacity,
          scale: useTransform(scale, [1, 1.2], [1, 1.2]),
        }}
      />

      {/* Dot sphere */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 drop-shadow-lg">
        <defs>
          <radialGradient id="sphere-gradient" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={color} stopOpacity={0.9} />
            <stop offset="100%" stopColor={color} stopOpacity={0.3} />
          </radialGradient>
        </defs>
        {/* Dots */}
        {dots.map(([x, y, r], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={r}
            fill={color}
            fillOpacity={0.7 + 0.3 * Math.sin(Date.now() / 500 + i)}
            className={cn(
              'transition-all',
              state === 'listening' && 'animate-pulse',
              state === 'speaking' && 'animate-bounce'
            )}
          />
        ))}
        {/* Inner sphere shading */}
        <circle cx="50" cy="50" r="35" fill="url(#sphere-gradient)" opacity="0.15" />
      </svg>
    </div>
  );
}

// Generate points on sphere using Fibonacci spiral
function useDotsOnSphere(count: number): Array<[number, number, number]> {
  const points: Array<[number, number, number]> = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < count; i++) {
    const t = i / count;
    const inclination = Math.acos(1 - 2 * t);
    const azimuth = 2 * Math.PI * t * goldenRatio;

    const x = 50 + 35 * Math.sin(inclination) * Math.cos(azimuth);
    const y = 50 + 35 * Math.sin(inclination) * Math.sin(azimuth);
    const r = 1.5 + 1.5 * Math.sin(inclination); // smaller dots near poles
    points.push([x, y, r]);
  }

  return points;
}
