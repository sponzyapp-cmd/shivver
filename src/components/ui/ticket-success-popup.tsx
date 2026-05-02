'use client';

import {CheckCircle, XCircle} from 'lucide-react';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';

interface TicketSuccessPopupProps {
  open: boolean;
  onClose: () => void;
}

// Confetti piece component
function ConfettiPiece({delay, duration, color}: {delay: string; duration: string; color: string}) {
  const left = `${Math.random() * 100}%`;
  return (
    <span
      className="absolute top-0 h-3 w-2 rounded-sm"
      style={{
        left,
        backgroundColor: color,
        animation: `ticket-confetti-fall ${duration} ease-out ${delay} forwards`,
      }}
    />
  );
}

export function TicketSuccessPopup({open, onClose}: TicketSuccessPopupProps) {
  if (!open) return null;

  const colors = ['#f59e0b', '#22c55e', '#ec4899', '#3b82f6', '#a855f7'];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border bg-background p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({length: 20}).map((_, index) => (
            <ConfettiPiece
              key={index}
              delay={`${(index % 7) * 0.1}s`}
              duration={`${2.2 + (index % 5) * 0.3}s`}
              color={colors[index % colors.length]}
            />
          ))}
        </div>
        <div className="relative z-10 space-y-3">
          <CheckCircle className="mx-auto h-10 w-10 text-green-500" strokeWidth={1.8} />
          <h2 className="text-lg tracking-tight">Tickets successfully purchased 🎉</h2>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Your tickets are ready. View them in E-Manager.
          </p>
          <Button onClick={onClose} className="mt-2 h-10 rounded-xl px-6 text-[11px] tracking-widest inline-flex items-center gap-2">
            View tickets <span className="text-lg">→</span>
          </Button>
        </div>
      </div>
      <style jsx global>{`
        @keyframes ticket-confetti-fall {
          0% { transform: translateY(-15px) rotate(0deg) scale(0.8); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(340px) rotate(780deg) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}