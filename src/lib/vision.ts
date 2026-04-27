import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface VisionAnalysis {
  description: string;
  uiElements: Array<{
    type: 'button' | 'text_field' | 'menu' | 'icon' | 'window';
    label?: string;
    boundingBox?: { x: number; y: number; width: number; height: number };
    confidence: number;
  }>;
  suggestedActions: Array<{
    action: 'click' | 'type' | 'scroll' | 'drag' | 'wait';
    coordinates?: { x: number; y: number };
    text?: string;
    reason: string;
  }>;
  obstacles: string[];
}

export async function analyzeScreen(
  screenshotBase64: string,
  context: string = ''
): Promise<VisionAnalysis> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a computer vision assistant that analyzes screenshots and suggests precise actions.
Output JSON with:
- description: what you see
- uiElements: list of interactive elements with estimated positions (0-100 x/y percentages)
- suggestedActions: ordered list of actions to achieve the user's goal
- obstacles: anything that might block the task
Be precise. Coordinates are percentages from top-left.`,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: context || 'Analyze this screen and suggest how to interact with it.' },
          {
            type: 'image_url',
            image_url: { url: screenshotBase64, detail: 'high' },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  return JSON.parse(content || '{}') as VisionAnalysis;
}

export async function planTask(
  task: string,
  screenshotBase64?: string
): Promise<Array<{
  step: number;
  action: string;
  parameters: Record<string, any>;
  expectedResult: string;
}>> {
  const messages: any[] = [
    {
      role: 'system',
      content: `Break down tasks into executable computer actions.
Available actions: click(x,y), type(text), scroll(direction, amount), keypress(key), run(command), open(app), focus(app), wait(seconds)
Coordinates are percentages (0-100) from top-left.
Return a JSON array of steps.`,
    },
    { role: 'user', content: `Task: ${task}` },
  ];

  if (screenshotBase64) {
    messages[1].content.push({
      type: 'image_url',
      image_url: { url: screenshotBase64 },
    });
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    response_format: { type: 'json_object' },
  });

  const data = JSON.parse(response.choices[0].message.content || '{}');
  return data.steps || [];
}
