'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Pause, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export function VoiceWaveform({ active, size = 'md' }: { active: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const bars = 5;

  const sizes = {
    sm: { height: 16, width: 3 },
    md: { height: 24, width: 4 },
    lg: { height: 32, width: 5 },
  };

  if (!active) return null;

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(bars)].map((_, i) => (
        <motion.div
          key={i}
          className="bg-accent rounded-full"
          style={{
            height: `${sizes[size].height}px`,
            width: `${sizes[size].width}px`,
          }}
          animate={{
            scaleY: [0.4, 1, 0.4],
            y: [sizes[size].height * 0.3, 0, sizes[size].height * 0.3],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export interface VoiceButtonProps {
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  isRecording: boolean;
  isProcessing?: boolean;
  disabled?: boolean;
  className?: string;
}

export function VoiceButton({
  onStartRecording,
  onStopRecording,
  isRecording,
  isProcessing,
  disabled,
  className,
}: VoiceButtonProps) {
  return (
    <Button
      variant={isRecording ? 'danger' : 'secondary'}
      size="lg"
      onClick={isRecording ? onStopRecording : onStartRecording}
      disabled={disabled || (!isRecording && isProcessing)}
      className={cn(
        'rounded-full shadow-lg transition-all duration-300 relative overflow-hidden',
        isRecording && 'animate-pulse',
        className
      )}
    >
      {isProcessing && !isRecording ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span>Processing...</span>
        </>
      ) : isRecording ? (
        <>
          <Square className="mr-2 h-5 w-5 fill-current" />
          <span>Stop</span>
          <VoiceWaveform active size="sm" />
        </>
      ) : (
        <>
          <Mic className="mr-2 h-5 w-5" />
          <span>Speak</span>
        </>
      )}
    </Button>
  );
}

export function VoiceIndicator({ listening, speaking }: { listening?: boolean; speaking?: boolean }) {
  if (!listening && !speaking) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
    >
      <div className="glass px-4 py-2 rounded-full flex items-center gap-3 border border-border/60">
        {listening && (
          <>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <span className="text-xs text-text-secondary">Listening</span>
            </div>
            <VoiceWaveform active size="sm" />
          </>
        )}
        {speaking && !listening && (
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-accent" />
            <span className="text-xs text-text-secondary">Playing...</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Voice chat mode floating button
export function VoiceChatFAB({
  onToggle,
  active,
  disabled,
}: {
  onToggle: () => void;
  active: boolean;
  disabled?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'fixed bottom-24 right-6 z-30 h-14 w-14 rounded-full flex items-center justify-center shadow-xl',
        'bg-gradient-to-br from-accent to-indigo-600 text-white',
        'hover:shadow-2xl transition-shadow duration-300',
        disabled && 'opacity-50 cursor-not-allowed',
        active && 'ring-4 ring-accent/30'
      )}
    >
      {active ? (
        <MicOff className="h-6 w-6" />
      ) : (
        <Mic className="h-6 w-6" />
      )}
    </motion.button>
  );
}
