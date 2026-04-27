export type LLMProvider = {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'groq' | 'gemini' | 'ollama' | 'custom' | 'local';
  baseURL: string;
  apiKey?: string;
  models: string[];
  defaultModel: string;
  capabilities: {
    streaming: boolean;
    functions: boolean;
    vision: boolean;
    embedding: boolean;
    fineTuning: boolean;
  };
  pricing?: {
    input: number; // per 1M tokens
    output: number;
  };
  healthStatus: 'healthy' | 'degraded' | 'down' | 'unknown';
  lastChecked: Date;
  rateLimitRemaining?: number;
  rateLimitReset?: Date;
};

export type ProviderConfig = {
  id: string;
  apiKey: string;
  baseURL?: string;
  models?: string[];
  defaultModel?: string;
  priority?: number; // lower = higher priority
  maxRetries?: number;
  timeout?: number;
};

// Registry of all known providers
export const PROVIDER_REGISTRY: Record<string, Omit<LLMProvider, 'healthStatus' | 'lastChecked'>> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    type: 'openai',
    baseURL: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-preview', 'o1-mini'],
    defaultModel: 'gpt-4o-mini',
    capabilities: { streaming: true, functions: true, vision: true, embedding: true, fineTuning: true },
    pricing: { input: 0.15, output: 0.6 }, // $ per 1M tokens (gpt-4o-mini: $0.15/$0.6)
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    models: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    defaultModel: 'claude-3-5-sonnet-20240620',
    capabilities: { streaming: true, functions: false, vision: true, embedding: false, fineTuning: false },
    pricing: { input: 3.0, output: 15.0 },
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    type: 'groq',
    baseURL: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    defaultModel: 'llama-3.1-8b-instant',
    capabilities: { streaming: true, functions: true, vision: false, embedding: false, fineTuning: false },
    pricing: { input: 0, output: 0 }, // free tier
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    type: 'gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro'],
    defaultModel: 'gemini-2.5-flash',
    capabilities: { streaming: true, functions: true, vision: true, embedding: true, fineTuning: false },
    pricing: { input: 0, output: 0 }, // free tier available
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (Local)',
    type: 'ollama',
    baseURL: 'http://localhost:11434/v1',
    models: [], // populated from /api/tags
    defaultModel: 'llama3.2',
    capabilities: { streaming: true, functions: false, vision: false, embedding: false, fineTuning: false },
  },
};

export function createProviderInstance(config: ProviderConfig): LLMProvider {
  const base = PROVIDER_REGISTRY[config.id];
  if (!base) throw new Error(`Unknown provider: ${config.id}`);

  return {
    ...base,
    apiKey: config.apiKey,
    baseURL: config.baseURL || base.baseURL,
    models: config.models || base.models,
    defaultModel: config.defaultModel || base.defaultModel,
    healthStatus: 'unknown',
    lastChecked: new Date(),
  };
}
