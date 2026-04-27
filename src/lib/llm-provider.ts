import { openai } from '@/lib/openai';

// Unified LLM interface
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

// Main dispatcher (currently only OpenAI implemented)
export async function callLLM(
  provider: 'openai' | 'anthropic' | 'groq' | 'gemini' | 'ollama',
  model: string,
  messages: LLMMessage[],
  _apiKey?: string,
  baseURL?: string,
  _tools?: any[]
): Promise<LLMResponse> {
  switch (provider) {
    case 'openai':
      return await callOpenAI(model, messages, baseURL);
    default:
      throw new Error(`Provider ${provider} not yet implemented`);
  }
}

async function callOpenAI(
  model: string,
  messages: LLMMessage[],
  baseURL?: string
): Promise<LLMResponse> {
  const client = baseURL ? new (require('openai').OpenAI)({ baseURL, apiKey: process.env.OPENAI_API_KEY }) : openai;

  const response = await (client || openai).chat.completions.create({
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
    cost: 0, // calculate later
  };
}

// Placeholder stubs for future providers
async function callAnthropic(_model: string, _messages: LLMMessage[], _apiKey: string, _baseURL?: string): Promise<LLMResponse> {
  throw new Error('Anthropic not implemented yet');
}
async function callGroq(_model: string, _messages: LLMMessage[], _apiKey: string): Promise<LLMResponse> {
  throw new Error('Groq not implemented yet');
}
async function callGemini(_model: string, _messages: LLMMessage[], _apiKey: string): Promise<LLMResponse> {
  throw new Error('Gemini not implemented yet');
}
async function callOllama(_model: string, _messages: LLMMessage[], _baseURL?: string): Promise<LLMResponse> {
  throw new Error('Ollama not implemented yet');
}

// Provider auto-detection
export function detectProviders() {
  return [
    { id: 'openai', available: !!process.env.OPENAI_API_KEY, models: ['gpt-4o', 'gpt-4o-mini'] },
    { id: 'anthropic', available: !!process.env.ANTHROPIC_API_KEY, models: ['claude-3-5-sonnet'] },
    { id: 'groq', available: !!process.env.GROQ_API_KEY, models: ['llama-3.3-70b'] },
    { id: 'gemini', available: !!process.env.GOOGLE_API_KEY, models: ['gemini-1.5-pro'] },
    { id: 'ollama', available: true, models: ['llama3.2'] }, // assume local
  ];
}
