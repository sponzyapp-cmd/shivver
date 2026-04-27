import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function streamChat(
  messages: Array<{ role: string; content: string }>,
  onChunk: (chunk: string) => void
) {
  const stream = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: messages as any,
    stream: true,
    temperature: 0.7,
    max_tokens: 2048,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) onChunk(content);
  }
}

export async function chatComplete(
  messages: Array<{ role: string; content: string }>
) {
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 2048,
  });
  return response.choices[0].message.content || '';
}
