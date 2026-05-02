// React hooks for 2-second polling sync to Redis
import { useEffect, useState, useCallback } from 'react';
import { agiState, agentExecutions } from '@/lib/redis-sync';

// Sponzy-style animated section
export function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div 
      className="animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// Polling hook that syncs every 2 seconds
export function usePollingSync<T>(store: { getValue: () => T; startPolling: () => void; stopPolling: () => void }, key: string) {
  const [data, setData] = useState<T>(store.getValue());

  useEffect(() => {
    const unsubscribe = store.subscribe(setData);
    store.startPolling(2000);
    
    return () => {
      unsubscribe();
      store.stopPolling();
    };
  }, [store]);

  const update = useCallback((value: T) => {
    // This triggers local update + Redis sync
    if (key === 'agi-state') {
      agiState.setValue(value as any);
    } else if (key === 'agent-executions') {
      agentExecutions.setValue(value as any);
    }
  }, [key]);

  return [data, update] as const;
}