// Redis + Polling Sync - High-performance data layer
// Local storage changes sync to Redis every 2 seconds

import { Redis } from '@upstash/redis';

// Redis client for Vercel
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Local storage with 2-second polling
export class PollingStore<T> {
  private key: string;
  private defaultValue: T;
  private subscribers: Set<(value: T) => void> = new Set();
  private interval: NodeJS.Timeout | null = null;

  constructor(key: string, defaultValue: T) {
    this.key = key;
    this.defaultValue = defaultValue;
  }

  private getLocalValue(): T {
    if (typeof window === 'undefined') return this.defaultValue;
    try {
      const stored = localStorage.getItem(this.key);
      return stored ? JSON.parse(stored) : this.defaultValue;
    } catch {
      return this.defaultValue;
    }
  }

  private setLocalValue(value: T) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.key, JSON.stringify(value));
    this.subscribers.forEach(cb => cb(value));
  }

  getValue(): T {
    return this.getLocalValue();
  }

  setValue(value: T) {
    this.setLocalValue(value);
    this.syncToRedis(value);
  }

  subscribe(callback: (value: T) => void) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private async syncToRedis(value: T) {
    try {
      await redis.setex(`shivver:${this.key}`, 3600, JSON.stringify(value));
    } catch (err) {
      console.error('Redis sync failed:', err);
    }
  }

  async loadFromRedis(): Promise<T> {
    try {
      const stored = await redis.get<string>(`shivver:${this.key}`);
      if (stored) {
        const value = JSON.parse(stored);
        this.setLocalValue(value);
        return value;
      }
    } catch (err) {
      console.error('Redis load failed:', err);
    }
    return this.getLocalValue();
  }

  startPolling(intervalMs = 2000) {
    if (typeof window === 'undefined') return;
    
    this.interval = setInterval(async () => {
      const local = this.getLocalValue();
      await this.syncToRedis(local);
    }, intervalMs);
  }

  stopPolling() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

// Singleton instances
export const agiState = new PollingStore('agi-state', {
  awareness: 0,
  wisdom: 0,
  totalActions: 0,
  successfulActions: 0,
  patternCount: 0,
  intentionQueue: 0,
  intelligenceLevel: 'INITIALIZING',
});

export const agentExecutions = new PollingStore('agent-executions', []);