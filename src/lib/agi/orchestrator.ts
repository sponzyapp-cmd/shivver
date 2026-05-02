// AGI Orchestrator - Central decision engine with DSA optimization
// Routes events to specialized agents with sparse attention efficiency

import { callLLM, type LLMMessage } from '@/lib/llm-provider';
import { db, agent_executions } from '@/lib/db';
import { AGENTS, EVENT_ROUTING, ALERT_LEVELS, type AgentProfile } from './agents';
import { agiCore, type AGIIntention } from './agi-core';
import { sparseAttention, type AttentionToken } from './sparse-attention';
import { handleLeadFinder, handleSendEmail, handleCreateCampaign } from '@/lib/biz-tools';
import { nanoid } from 'nanoid';

export type AGIEvent = {
  type: string;
  payload: Record<string, any>;
  timestamp: Date;
  source: 'cron' | 'user' | 'api' | 'system' | 'external';
  severity?: 'critical' | 'high' | 'medium' | 'low';
};

export type AgentExecutionResult = {
  agentId: string;
  success: boolean;
  output: any;
  actionsTaken: Array<{ tool: string; result: any }>;
  telegramMessages: Array<{ text: string; priority: number }>;
  sparseAttention?: {
    tokensSelected: number;
    complexityReduction: string;
  };
};

export async function processEvent(event: AGIEvent): Promise<AgentExecutionResult[]> {
  const results: AgentExecutionResult[] = [];

  const query = `${event.type}: ${JSON.stringify(event.payload).slice(0, 100)}`;
  const { selectedTokens, complexity } = await sparseAttention.reason(query);

  sparseAttention.addToken(query, event.severity === 'critical' ? 1 : 0.5);

  const intention = agiCore.createIntention(query, event.severity || 'normal');

  let candidateAgents: string[] = [];

  if (event.type === 'user_command') {
    const cmd = (event.payload.command || '').toLowerCase();
    if (cmd.match(/lead|customer|prospect/)) candidateAgents.push('sales_empire');
    if (cmd.match(/revenue|money|finance/)) candidateAgents.push('money_control');
    if (cmd.match(/growth|viral|cac|ltv/)) candidateAgents.push('growth_engine');
    if (cmd.match(/product|feature|churn/)) candidateAgents.push('product_command');
    if (cmd.match(/improve|fix|bug|error/)) candidateAgents.push('systems_architect');
    if (candidateAgents.length === 0) candidateAgents = ['knowledge_engine'];
  } else {
    candidateAgents = EVENT_ROUTING[event.type] || ['knowledge_engine'];
  }

  for (const agentId of candidateAgents) {
    const agent = getAgent(agentId);
    if (!agent) continue;

    const result = await runAgentLogic(agent, event, intention, selectedTokens);
    results.push(result);

    if (event.severity === 'critical' || !result.success) {
      const fallbackResult = await runFallback(event, result);
      results.push(fallbackResult);
    }
  }

  return results;
}

async function runAgentLogic(
  agent: AgentProfile, 
  event: AGIEvent, 
  intention: AGIIntention,
  selectedTokens: AttentionToken[]
): Promise<AgentExecutionResult> {
  const actions: Array<{ tool: string; result: any }> = [];
  const telegramMessages: Array<{ text: string; priority: number }> = [];
  let success = true;
  let output: any = null;

  try {
    const wisdom = agiCore.getState().wisdom;
    const context = buildContext(agent, event, wisdom, selectedTokens);
    const plan = await askLLMForPlan(agent, context);

    if (plan.toolCalls && plan.toolCalls.length > 0) {
      for (const call of plan.toolCalls) {
        const result = await executeToolSafely(call.name, call.arguments);
        actions.push({ tool: call.name, result });
        
        if (result && result.success) {
          agiCore.storePattern(call.name, `event:${event.type}`);
        }
      }
    }

    const alert = plan.telegramText || formatAlert(agent, plan.reasoning);
    if (alert) {
      telegramMessages.push({ text: alert, priority: mapSeverityToPriority(event.severity || 'medium') });
    }

    const complexity = sparseAttention.getComplexityReduction(sparseAttention['tokens'].size);

    output = { plan, actions, sparseAttention: { tokensSelected: selectedTokens.length } };
  } catch (err: any) {
    success = false;
    output = { error: err.message };
    telegramMessages.push({
      text: `❌ ${agent.name}: ${err.message}`,
      priority: ALERT_LEVELS.HIGH,
    });
  }

  return { 
    agentId: agent.id, 
    success, 
    output, 
    actionsTaken: actions, 
    telegramMessages,
    sparseAttention: { tokensSelected: selectedTokens.length },
  };
}

function buildContext(agent: AgentProfile, event: AGIEvent, wisdom: number, tokens: AttentionToken[]): string {
  const tokenContext = tokens.slice(0, 5).map(t => `- ${t.content}`).join('\n');
  
  return [
    `AGI CORE ACTIVE | SPARSE ATTENTION ENABLED`,
    `Wisdom: ${wisdom.toFixed(1)}%`,
    `Agent: ${agent.name}`,
    `Mission: ${agent.mission}`,
    `Event: ${event.type}`,
    '',
    'RELEVANT CONTEXT:',
    tokenContext || '- No relevant context',
    '',
    `Payload: ${JSON.stringify(event.payload)}`,
  ].join('\n');
}

async function runFallback(event: AGIEvent, failedResult: AgentExecutionResult): Promise<AgentExecutionResult> {
  return {
    agentId: 'agi_fallback',
    success: true,
    output: { intervention: true, reason: 'fallback' },
    actionsTaken: [],
    telegramMessages: [{ 
      text: `⚡ AGI FALLBACK - ${failedResult.agentId} failed\nEvent: ${event.type}`, 
      priority: ALERT_LEVELS.CRITICAL 
    }],
  };
}

function formatAlert(agent: AgentProfile, reasoning: string): string {
  return `🧠 ${agent.name} [SPARSE ATTENTION]
${reasoning.slice(0, 100)}`;
}

async function askLLMForPlan(agent: AgentProfile, context: string): Promise<{
  reasoning: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, any> }>;
  telegramText?: string;
}> {
  const systemPrompt = `You are an AGI agent with Sparse Attention: ${agent.name}. ${agent.mission}
Be precise. No fluff.

Context:
${context}

Respond JSON:
{
  "reasoning": "analysis",
  "toolCalls": [{"name": "tool", "arguments": {...}}],
  "telegramText": "ALERT"
}`;

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Execute.' },
  ];

  const resp = await callLLM(messages, 'groq', 'llama-3.3-70b-versatile');

  try {
    return JSON.parse(resp.content);
  } catch {
    const match = resp.content.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { reasoning: resp.content };
  }
}

async function executeToolSafely(toolName: string, args: Record<string, any>): Promise<any> {
  switch (toolName) {
    case 'lead_finder': return await handleLeadFinder(args);
    case 'send_email': return await handleSendEmail(args);
    case 'create_campaign': return await handleCreateCampaign(args);
    default: throw new Error(`Unknown tool: ${toolName}`);
  }
}

function mapSeverityToPriority(severity: string): number {
  switch (severity) {
    case 'critical': return ALERT_LEVELS.CRITICAL;
    case 'high': return ALERT_LEVELS.HIGH;
    default: return ALERT_LEVELS.MEDIUM;
  }
}

function getAgent(id: string): AgentProfile | undefined {
  return AGENTS.find(a => a.id === id);
}

export function getAGIState() {
  return agiCore.getState();
}

export function getSparseAttentionStats() {
  return {
    tokensIndexed: sparseAttention['tokens'].size,
    maxTokens: 2048,
    kSelection: 2048,
  };
}