import * as React from 'react';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';

export function TypingIndicator({ agentName = 'Shivver' }: { agentName?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-3 my-4"
    >
      <div className="shrink-0 mt-0.5">
        <Avatar name={agentName} size="sm" status="online" />
      </div>
      <div className="bg-surface border border-border px-5 py-4 rounded-2xl rounded-bl-md">
        <div className="flex gap-1 items-center h-4">
          <span className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </motion.div>
  );
}
