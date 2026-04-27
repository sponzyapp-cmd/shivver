import OpenAI from 'openai';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
}

export interface LLMResponse {
  content: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, any> }>;
  model: string;
  provider: string;
  tokensUsed?: { prompt: number; completion: number; total: number };
  cost?: number;
}

type ProviderId = 'openai' | 'groq' | 'anthropic' | 'gemini' | 'ollama';

interface ProviderConfig {
  id: ProviderId;
  name: string;
  keyEnv: string;
  keysEnv: string;
  modelEnv: string;
  baseUrlEnv?: string;
  models: string[];
  defaultModel: string;
  baseURL?: string; // static override if needed
}

interface GlobalApiKeyEntry {
  provider: ProviderId;
  key: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    keyEnv: 'OPENAI_API_KEY',
    keysEnv: 'OPENAI_KEYS',
    modelEnv: 'OPENAI_MODEL',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o-mini',
  },
  {
    id: 'groq',
    name: 'Groq',
    keyEnv: 'GROQ_API_KEY',
    keysEnv: 'GROQ_KEYS',
    modelEnv: 'GROQ_MODEL',
    baseUrlEnv: 'GROQ_BASE_URL',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    defaultModel: 'llama-3.3-70b-versatile',
    baseURL: 'https://api.groq.com/openai/v1',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    keyEnv: 'ANTHROPIC_API_KEY',
    keysEnv: 'ANTHROPIC_KEYS',
    modelEnv: 'ANTHROPIC_MODEL',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
    defaultModel: 'claude-3-5-sonnet-20241022',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    keyEnv: 'GEMINI_API_KEY',
    keysEnv: 'GEMINI_KEYS',
    modelEnv: 'GEMINI_MODEL',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    defaultModel: 'gemini-2.0-flash',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    keyEnv: '', // no key
    keysEnv: '',
    modelEnv: 'OLLAMA_MODEL',
    baseUrlEnv: 'OLLAMA_BASE_URL',
    models: ['llama3:70b', 'codellama:70b', 'mistral'],
    defaultModel: 'llama3:70b',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getEnvArray(envVar: string): string[] {
  const val = process.env[envVar];
  if (!val) return [];
  return val.split(',').map(v => v.trim()).filter(Boolean);
}

function getProviderConfig(providerId: ProviderId): ProviderConfig {
  return PROVIDERS.find(p => p.id === providerId)!;
}

function detectProviderFromApiKey(key: string): ProviderId | null {
  const trimmed = key.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('gsk_')) return 'groq';
  if (trimmed.startsWith('sk-ant-')) return 'anthropic';
  if (trimmed.startsWith('AIza')) return 'gemini';
  if (trimmed.startsWith('sk-')) return 'openai';

  return null;
}

function getGlobalApiKeyEntries(): GlobalApiKeyEntry[] {
  const rawKeys = [
    process.env.GLOBAL_LLM_API_KEY,
    process.env.GLOBAL_LLM_API_KEYS,
    process.env.LLM_API_KEY,
    process.env.LLM_API_KEYS,
  ]
    .filter(Boolean)
    .join(',');

  if (!rawKeys) return [];

  return rawKeys
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
    .map((key): GlobalApiKeyEntry | null => {
      const provider = detectProviderFromApiKey(key);
      if (!provider) return null;
      return { provider, key };
    })
    .filter((entry): entry is GlobalApiKeyEntry => Boolean(entry));
}

function getAllProvidersInOrder(): ProviderId[] {
  const orderEnv = process.env.LLM_PROVIDER_ORDER;
  const ordered: ProviderId[] = orderEnv
    ? (orderEnv.split(',').map(p => p.trim().toLowerCase() as ProviderId).filter(Boolean) as ProviderId[])
    : ['openai', 'groq', 'anthropic', 'gemini', 'ollama'];
  // Ensure all known providers present
  for (const p of PROVIDERS) {
    if (!ordered.includes(p.id)) ordered.push(p.id);
  }
  return ordered;
}

function getDefaultProvider(): ProviderId {
  const def = process.env.DEFAULT_LLM_PROVIDER?.toLowerCase();
  if (def && PROVIDERS.find(p => p.id === def)) return def as ProviderId;
  return 'openai';
}

// ── Smart Failover Dispatcher ─────────────────────────────────────────────────

export async function callLLM(
  messages: LLMMessage[],
  preferredProvider?: ProviderId,
  preferredModel?: string
): Promise<LLMResponse> {
  const defaultProv = getDefaultProvider();
  const primaryProvider = preferredProvider || defaultProv;
  const providerOrder = getAllProvidersInOrder();

  // Reorder: try primary first, then others in configured order
  const tryOrder: ProviderId[] = [primaryProvider];
  for (const p of providerOrder) {
    if (p !== primaryProvider && !tryOrder.includes(p)) tryOrder.push(p);
  }

  let lastError: Error | null = null;
  const globalEntries = getGlobalApiKeyEntries();

  for (const providerId of tryOrder) {
    const cfg = getProviderConfig(providerId);

    // Build key list
    const keys: string[] = [];
    const primaryKey = process.env[cfg.keyEnv];
    if (primaryKey) keys.push(primaryKey);
    const extraKeys = getEnvArray(cfg.keysEnv);
    keys.push(...extraKeys);
    const globalProviderKeys = globalEntries
      .filter(entry => entry.provider === providerId)
      .map(entry => entry.key);
    keys.push(...globalProviderKeys);

    // If no key and provider requires one, skip (except ollama)
    if (keys.length === 0 && providerId !== 'ollama') {
      continue;
    }

    // Determine model
    const model = preferredModel || process.env[cfg.modelEnv] || cfg.defaultModel;

    // Try each key
    for (const key of keys) {
      try {
        let result: LLMResponse;

        if (providerId === 'openai') {
          result = await callOpenAI(model, messages, undefined, key);
        } else if (providerId === 'groq') {
          result = await callGroq(model, messages, key);
        } else if (providerId === 'anthropic') {
          result = await callAnthropic(model, messages, key);
        } else if (providerId === 'gemini') {
          result = await callGemini(model, messages, key);
        } else if (providerId === 'ollama') {
          result = await callOllama(model, messages, process.env[cfg.baseUrlEnv || 'OLLAMA_BASE_URL']);
        } else {
          continue;
        }

        return result;
      } catch (err: any) {
        // Rate limit (429) → try next key
        if (err.status === 429 || err.code === 'rate_limit' || err.message?.toLowerCase().includes('rate limit')) {
          continue;
        }
        // Other errors (auth, not found) — break keys loop, try next provider
        lastError = err;
        break;
      }
    }
  }

  throw lastError || new Error('No LLM providers available or all keys exhausted');
}

// ── Provider Implementations ─────────────────────────────────────────────────

async function callOpenAI(
  model: string,
  messages: LLMMessage[],
  _baseURL?: string,
  apiKey?: string
): Promise<LLMResponse> {
  const client = new OpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY,
    baseURL: _baseURL,
  });

  const response = await client.chat.completions.create({
    model,
    messages: messages as any,
  });

  const choice = response.choices[0];
  return {
    content: choice.message.content || '',
    model: response.model,
    provider: 'openai',
    tokensUsed: {
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    },
    cost: estimateOpenAICost(response.model, response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0),
  };
}

async function callGroq(
  model: string,
  messages: LLMMessage[],
  apiKey: string
): Promise<LLMResponse> {
  const client = new OpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  const response = await client.chat.completions.create({
    model,
    messages: messages as any,
  });

  const choice = response.choices[0];
  return {
    content: choice.message.content || '',
    model: response.model,
    provider: 'groq',
    tokensUsed: {
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    },
    cost: 0, // Groq is free
  };
}

async function callAnthropic(
  model: string,
  messages: LLMMessage[],
  apiKey: string
): Promise<LLMResponse> {
  // Placeholder — would use @anthropic-ai/sdk
  throw new Error('Anthropic not yet implemented — coming soon');
}

async function callGemini(
  model: string,
  messages: LLMMessage[],
  apiKey: string
): Promise<LLMResponse> {
  // Placeholder — would use @google/generative-ai
  throw new Error('Gemini not yet implemented — coming soon');
}

async function callOllama(
  model: string,
  messages: LLMMessage[],
  baseURL?: string
): Promise<LLMResponse> {
  const url = `${baseURL || 'http://localhost:11434'}/api/chat`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: messages.map(m => ({ role: m.role, content: m.content })), stream: false }),
  });

  if (!resp.ok) throw new Error(`Ollama error: ${resp.statusText}`);

  const data = await resp.json();
  return {
    content: data.message?.content || '',
    model,
    provider: 'ollama',
    tokensUsed: { prompt: 0, completion: 0, total: 0 }, // Ollama doesn't always return counts
    cost: 0,
  };
}

// ── Cost Estimation ───────────────────────────────────────────────────────────

function estimateOpenAICost(model: string, promptTokens: number, completionTokens: number): number {
  // Prices per 1K tokens (approx, check OpenAI pricing)
  const prices: Record<string, { prompt: number; completion: number }> = {
    'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
    'gpt-4o': { prompt: 0.005, completion: 0.015 },
    'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
    'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
  };
  const price = prices[model];
  if (!price) return 0;
  return (promptTokens / 1000) * price.prompt + (completionTokens / 1000) * price.completion;
}
