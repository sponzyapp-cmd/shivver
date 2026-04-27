import * as React from 'react';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolCalls?: Array<{ name: string; args: Record<string, any> }>;
  agentName?: string;
  agentAvatar?: string;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isTool = message.role === 'tool';
  const isAssistant = message.role === 'assistant';

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex justify-center my-3"
      >
        <span className="text-[11px] text-text-tertiary bg-surface-secondary px-3 py-1.5 rounded-full border border-border/50">
          {message.content}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={cn('flex gap-3 my-4', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {!isUser && (
        <div className="shrink-0 mt-0.5">
          {message.agentAvatar ? (
            <Avatar src={message.agentAvatar} name={message.agentName || 'Shivver'} size="sm" status="online" />
          ) : (
            <Avatar name={message.agentName || 'Shivver'} size="sm" />
          )}
        </div>
      )}

      <div className={cn('flex flex-col max-w-[78%]', isUser ? 'items-end' : 'items-start')}>
        {/* Sender name */}
        {!isUser && message.agentName && (
          <span className="text-[11px] font-semibold text-text-secondary ml-1 mb-0.5">
            {message.agentName}
          </span>
        )}

        <div className={cn(
          'px-4 py-3 shadow-sm',
          isUser
            ? 'bg-accent text-white rounded-2xl rounded-br-md'
            : isTool
              ? 'bg-surface-secondary border border-border text-text-secondary rounded-2xl rounded-bl-md'
              : 'bg-surface border border-border text-text rounded-2xl rounded-bl-md',
        )}>
          {message.content}
          
          {/* Tool calls / actions */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-border/30 pt-2">
              {message.toolCalls.map((tool, i) => (
                <div key={i} className="flex items-center gap-2 text-xs opacity-70">
                  <Spinner size="sm" />
                  <span>Calling {tool.name}…</span>
                  <Badge variant="default" size="sm">{JSON.stringify(tool.args).slice(0, 30)}</Badge>
                </div>
              ))}
            </div>
          )}

          {/* Streaming cursor */}
          {message.isStreaming && (
            <span className="inline-block ml-1 animate-pulse">▌</span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 mx-1">
          <span className="text-[10px] text-text-tertiary">
            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
          </span>
          {message.role === 'assistant' && !message.isStreaming && (
            <span className="text-[10px] text-accent">✓</span>
          )}
        </div>
      </div>

      {isUser && (
        <div className="shrink-0 mt-0.5">
          <Avatar name="You" size="sm" />
        </div>
      )}
    </motion.div>
  );
}
