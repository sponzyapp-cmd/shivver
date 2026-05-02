import { db, agents, agent_executions, tools, tool_executions, messages, sessions } from '@/lib/db';
import { eq, sql, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { supabase } from '@/lib/supabase';
import { executeComputerTool } from '@/lib/computer-tool-executor';
import { planTask } from '@/lib/vision';
import { callLLM, type LLMMessage } from '@/lib/llm-provider';
// Business automation tool handlers
import {
  handleLeadFinder,
  handleSendEmail,
  handleCreateCampaign,
  handleTrackMetrics,
  handleContentGen,
  handleReadFile,
  handleGitDiff,
  handleDeployVercel,
  handleSelfImprove,
  handleErrorMonitor,
} from '@/lib/biz-tools';

export type ToolCall = {
  name: string;
  arguments: Record<string, any>;
};

export type AgentResult = {
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: Array<{ name: string; result: any }>;
  error?: string;
  tokensUsed?: number;
};

// Fetch available tools from DB
export async function getAvailableTools(agentId: number): Promise<Array<{
  name: string;
  description: string;
  parameters: Record<string, any>;
}>> {
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
  });

  if (!agent) return [];

  // If agent has specific tools configured, use those
  if (agent.tools && agent.tools.length > 0) {
    return agent.tools;
  }

  // Otherwise return all active tools
  const allTools = await db.query.tools.findMany({
    where: sql`${tools.isActive} = true`,
    columns: { name: true, description: true, definition: true },
  });

  return allTools.map(t => ({
    name: t.name,
    description: t.description || '',
    parameters: t.definition as Record<string, any>,
  }));
}

// Execute a single tool call
async function executeTool(
  toolName: string,
  args: Record<string, any>,
  agentExecutionId: number,
  agentId: number,
  dbReturn: any
) {
  const toolRecord = await db.query.tools.findFirst({
    where: eq(tools.name, toolName),
  });

  if (!toolRecord) {
    throw new Error(`Tool ${toolName} not found`);
  }

  // Start tool execution log
  const [toolExec] = await db.insert(tool_executions).values({
    agentExecutionId,
    toolId: toolRecord.id,
    input: args,
  }).returning();

  let result: any;
  let error: string | null = null;

  try {
    switch (toolName) {
      case 'web_search': {
        result = await handleWebSearch(args.query as string, args.limit as number);
        break;
      }
      case 'fetch_url': {
        result = await handleFetchUrl(args.url as string, args.maxChars as number);
        break;
      }
      case 'execute_code': {
        result = await handleExecuteCode(args.code as string, args.language as string);
        break;
      }
      case 'tts': {
        result = await handleTTS(args.text as string, args.voiceId as string);
        break;
      }
      case 'stt': {
        result = await handleSTT(args.audioUrl as string);
        break;
      }
      case 'blender_automate': {
        result = await executeComputerTool('blender_automate', args);
        break;
      }
      case 'davinci_automate': {
        result = await executeComputerTool('davinci_automate', args);
        break;
      }
      case 'computer_plan': {
        // Convert to planTask call
        result = await planTask(args.task as string);
        break;
      }
      // Business Automation Toolkit
      case 'lead_finder': {
        result = await handleLeadFinder(args as any);
        break;
      }
      case 'send_email': {
        result = await handleSendEmail(args as any);
        break;
      }
      case 'create_campaign': {
        result = await handleCreateCampaign(args as any);
        break;
      }
      case 'track_metrics': {
        result = await handleTrackMetrics(args as any);
        break;
      }
      case 'generate_content': {
        result = await handleContentGen(args as any);
        break;
      }
      case 'read_file': {
        result = await handleReadFile(args as any);
        break;
      }
      case 'git_diff': {
        result = await handleGitDiff(args as any);
        break;
      }
      case 'deploy_vercel': {
        result = await handleDeployVercel(args as any);
        break;
      }
      case 'self_improve': {
        result = await handleSelfImprove(args as any);
        break;
      }
      case 'monitor_errors': {
        result = await handleErrorMonitor(args as any);
        break;
      }
      default:
        throw new Error(`Tool ${toolName} not implemented yet`);
    }

    // Update tool execution record
    await db.update(tool_executions)
      .set({ output: result, completedAt: new Date() })
      .where(eq(tool_executions.id, toolExec.id));

    return result;
  } catch (err: any) {
    error = err.message;
    await db.update(tool_executions)
      .set({ error, completedAt: new Date() })
      .where(eq(tool_executions.id, toolExec.id));
    throw err;
  }
}

// Tool handlers
async function handleWebSearch(query: string, limit: number = 10) {
  // Use Exa API
  const exaApiKey = process.env.EXA_API_KEY;
  if (!exaApiKey) {
    throw new Error('EXA_API_KEY not configured');
  }

  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'x-api-key': exaApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      numResults: limit,
      type: 'neural',
      contents: { text: true, highlights: true },
    }),
  });

  if (!response.ok) {
    throw new Error(`Exa search failed: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    results: data.results?.map((r: any) => ({
      title: r.title,
      url: r.url,
      text: r.text?.slice(0, 2000),
      highlights: r.highlights,
    })) || [],
  };
}

async function handleFetchUrl(url: string, maxChars: number = 50000) {
  const response = await fetch('/api/proxy/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, maxChars }),
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.statusText}`);
  }

  return response.json();
}

async function handleExecuteCode(code: string, language: string) {
  // Execute in isolated sandbox (Railway/Fly.io worker)
  const workerUrl = process.env.CODE_WORKER_URL || 'http://localhost:8080/execute';
  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, language, timeout: 30000 }),
  });

  if (!response.ok) {
    throw new Error(`Code execution failed: ${response.statusText}`);
  }

  return response.json();
}

async function handleTTS(text: string, voiceId?: string) {
  const elevenApiKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenApiKey) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  const voice = voiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': elevenApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.5 },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`TTS failed: ${response.statusText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(audioBuffer).toString('base64');

  // Upload to Supabase Storage
  const fileName = `tts/${nanoid()}.mp3`;
  const { data, error } = await supabase.storage
    .from('shivver-assets')
    .upload(fileName, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('shivver-assets')
    .getPublicUrl(fileName);

  return { audioUrl: urlData.publicUrl, duration: text.length * 0.1 }; // rough estimate
}

async function handleSTT(audioUrl: string) {
  // Download audio from URL and send to Whisper
  const elevenApiKey = process.env.ELEVENLABS_API_KEY;

  const audioResponse = await fetch(audioUrl);
  const audioBlob = await audioResponse.blob();

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.mp3');
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    // Using ElevenLabs STT (they added Whisper)
    method: 'POST',
    headers: {
      'xi-api-key': elevenApiKey!,
    },
    body: formData,
  });

  if (!response.ok) {
    // Try OpenAI Whisper as fallback
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const openaiResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: formData,
      });
      const data = await openaiResp.json();
      return { text: data.text };
    }
    throw new Error('STT failed');
  }

  const data = await response.json();
  return { text: data.text };
}

// Main agent execution function
export async function runAgent(
  sessionId: number,
  messageId: number,
  agentId: number,
  inputMessages: Array<{ role: string; content: string }>,
  toolsEnabled: boolean = true
): Promise<AgentResult> {
  // Create agent execution record
  const [execution] = await db.insert(agent_executions).values({
    sessionId,
    agentId,
    messageId,
    input: { messages: inputMessages },
  }).returning();

  try {
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const tools = toolsEnabled ? await getAvailableTools(agentId) : [];

    // Build OpenAI API call
    const apiMessages: any[] = [
      { role: 'system', content: agent.systemPrompt || 'You are a helpful assistant.' },
      ...inputMessages,
    ];

    // If we have tools, add function definitions
    if (tools.length > 0) {
      // For now, we'll handle tool calls in a simplified way
      // Full implementation would use tool_choice and parse function calls
    }

    // Build LLM messages
    const llmMessages: LLMMessage[] = [
      { role: 'system', content: agent.systemPrompt || 'You are a helpful assistant.' },
      ...inputMessages.map(m => ({ role: m.role as LLMMessage['role'], content: m.content }) as LLMMessage),
    ];

    // Map agent.provider to unified provider ID
    const providerMap: Record<string, any> = {
      openai: 'openai',
      claude: 'anthropic',
      gemini: 'gemini',
      custom: 'groq', // default custom provider
    };
    const preferredProvider = providerMap[agent.provider] || 'openai';

    // Call LLM with smart failover
    const llmResponse = await callLLM(llmMessages, preferredProvider as any, agent.model);

    const content = llmResponse.content;
    const tokensUsed = llmResponse.tokensUsed?.total || 0;
    const costTotal = llmResponse.cost || 0;

    // Update execution record
    await db.update(agent_executions)
      .set({
        output: { content },
        tokensUsed,
        cost: {
          input: 0,
          output: 0,
          total: costTotal,
        },
        completedAt: new Date(),
      })
      .where(eq(agent_executions.id, execution.id));

    return { content, tokensUsed };
  } catch (error: any) {
    await db.update(agent_executions)
      .set({ error: error.message, completedAt: new Date() })
      .where(eq(agent_executions.id, execution.id));
    throw error;
  }
}

// Multi-agent crew execution
export async function runCrew(
  sessionId: number,
  messageId: number,
  task: string,
  agentIds: number[],
  coordinatorAgentId: number = 1 // Shivver coordinates
): Promise<AgentResult> {
  // Coordinator breaks down task and delegates
  const coordinatorPrompt = `
    Break down this task and delegate to the appropriate specialist agents:
    Task: "${task}"

    Available agents: ${agentIds.map(id => `Agent ${id}`).join(', ')}

    Respond with: DELEGATE:[agent_id1,agent_id2,...]:subtasks
  `;

  const coordinatorResult = await runAgent(
    sessionId,
    messageId,
    coordinatorAgentId,
    [{ role: 'user', content: coordinatorPrompt }],
    false
  );

  // Parse delegation (simplified)
  const delegateMatch = coordinatorResult.content.match(/DELEGATE:\[(.+?)\]:(.+)/);
  if (!delegateMatch) {
    return coordinatorResult;
  }

  const agentList = delegateMatch[1].split(',').map(id => parseInt(id.trim()));
  const subtasks = delegateMatch[2].split(';').map(t => t.trim());

  // Run agents in parallel or sequence based on dependencies
  const results: any[] = [];
  for (let i = 0; i < agentList.length; i++) {
    const agentId = agentList[i];
    const subtask = subtasks[i] || task;

    const result = await runAgent(
      sessionId,
      messageId,
      agentId,
      [{ role: 'user', content: subtask }],
      true
    );

    results.push({ agentId, subtask, result });
  }

  // Synthesize final result
  const synthesisPrompt = `
    Synthesize these specialist results into a cohesive final answer:

    ${results.map(r => `Agent ${r.agentId} (${r.subtask}):\n${r.result.content}`).join('\n\n---\n\n')}

    Original task: "${task}"
  `;

  const final = await runAgent(
    sessionId,
    messageId,
    coordinatorAgentId,
    [{ role: 'user', content: synthesisPrompt }],
    false
  );

  return final;
}
