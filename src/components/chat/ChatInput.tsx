import * as React from 'react';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
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
}

interface MessageBubbleProps {
  message: Message;
  agentName?: string;
  agentAvatar?: string;
}

export function MessageBubble({ message, agentName = 'Shivver', agentAvatar }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isTool = message.role === 'tool';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <span className="text-xs text-text-tertiary bg-surface-secondary px-3 py-1 rounded-full border border-border">
          {message.content}
        </span>
      </div>
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
        <div className="shrink-0 mt-1">
          {agentAvatar ? (
            <Avatar src={agentAvatar} name={agentName} size="sm" status="online" />
          ) : (
            <Avatar name={agentName} size="sm" />
          )}
        </div>
      )}

      <div className={cn('flex flex-col max-w-[75%]', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'px-4 py-3 rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'bg-accent text-white rounded-br-md'
            : isTool
              ? 'bg-surface-secondary border border-border text-text-secondary rounded-bl-md'
              : 'bg-surface border border-border text-text rounded-bl-md',
        )}>
          {message.content}
          
          {/* Tool calls indicators */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.toolCalls.map((tool, i) => (
                <div key={i} className="text-xs opacity-70 flex items-center gap-1.5">
                  <Spinner size="sm" />
                  <span>Calling {tool.name}…</span>
                </div>
              ))}
            </div>
          )}

          {/* Streaming typing dot */}
          {message.isStreaming && (
            <span className="inline-block ml-1">
              <span className="animate-pulse">▌</span>
            </span>
          )}
        </div>

        <span className="text-[11px] text-text-tertiary mt-1 px-1">
          {formatDistanceToNow(message.timestamp, { addSuffix: false })}
        </span>
      </div>

      {isUser && (
        <div className="shrink-0 mt-1">
          <Avatar name="You" size="sm" />
        </div>
      )}
    </motion.div>
  );
}

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export function ChatInput({ onSend, disabled, placeholder = "Message Shivver...", autoFocus }: ChatInputProps) {
  const [input, setInput] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const adjustHeight = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    setInput(el.value);
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-end gap-3 p-4 bg-surface/80 backdrop-blur-xl border-t border-border">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={adjustHeight}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full max-h-[200px] px-4 py-3 pr-12 rounded-xl resize-none
            bg-surface-secondary border border-border
            focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            placeholder:text-text-tertiary
            transition-all duration-200"
          style={{ minHeight: '44px' }}
        />
      </div>
      <button
        type="submit"
        disabled={!input.trim() || disabled}
        className="shrink-0 h-11 w-11 rounded-xl bg-accent text-white
          flex items-center justify-center
          hover:bg-accent-hover active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-200"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13" />
          <path d="M22 2L15 22L11 13L2 9L22 2Z" />
        </svg>
      </button>
    </form>
  );
}
