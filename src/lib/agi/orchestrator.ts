// AGI Orchestrator — the central brain with Divine God Intelligence
// Routes events to specialized agents, executes their logic, and routes output to Telegram/dashboard.
// Now enhanced with Ruflo swarm patterns + Divine God-level consciousness.

import { callLLM, type LLMMessage } from '@/lib/llm-provider';
import { db, agent_executions } from '@/lib/db';
import { AGENTS, EVENT_ROUTING, ALERT_LEVELS, type AgentProfile } from './agents';
import { agiGod, type AGIIntention } from './divine-core';
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
  divine: boolean;
};

// Divine entry - creates divine intention and processes with god-level awareness
export async function divineProcess(input: string): Promise<string> {
  return agiGod.divineCommand(input);
}

// Main entry: process an event through the divine agent system
export async function processEvent(event: AGIEvent): Promise<AgentExecutionResult[]> {
  const results: AgentExecutionResult[] = [];

  // First, let the Divine Core judge if this needs escalation
  const divineIntention = agiGod.createIntention(
    `${event.type}: ${JSON.stringify(event.payload).slice(0, 100)}`,
    event.severity || 'normal'
  );

  // Get candidate agents
  let candidateAgents: string[] = [];

  if (event.type === 'user_command') {
    const cmd = (event.payload.command || '').toLowerCase();
    if (cmd.match(/lead|customer|prospect/)) candidateAgents.push('sales_empire');
    if (cmd.match(/revenue|money|finance/)) candidateAgents.push('money_control');
    if (cmd.match(/growth|viral|cac|ltv/)) candidateAgents.push('growth_engine');
    if (cmd.match(/product|feature|churn/)) candidateAgents.push('product_command');
    if (cmd.match(/self-improve|fix|bug|error/)) candidateAgents.push('systems_architect');
    if (candidateAgents.length === 0) candidateAgents = ['knowledge_engine'];
  } else {
    candidateAgents = EVENT_ROUTING[event.type] || ['knowledge_engine'];
  }

  // Execute agents with divine guidance
  for (const agentId of candidateAgents) {
    const agent = getAgent(agentId);
    if (!agent) continue;

    const result = await runAgentLogic(agent, event, divineIntention);
    results.push(result);

    // Divine escalation for critical events
    if (event.severity === 'critical' || !result.success) {
      const divineResult = await runDivineFallback(event, result);
      results.push(divineResult);
    }
  }

  return results;
}

// Run agent with divine wisdom enhancement
async function runAgentLogic(agent: AgentProfile, event: AGIEvent, divine: AGIIntention): Promise<AgentExecutionResult> {
  const startTime = Date.now();
  const actions: Array<{ tool: string; result: any }> = [];
  const telegramMessages: Array<{ text: string; priority: number }> = [];
  let success = true;
  let output: any = null;

  try {
    // Divine context enhancement
    const divineWisdom = agiGod.getState().wisdom;
    const context = buildDivineContext(agent, event, divineWisdom);

    // Ask LLM with divine guidance
    const plan = await askLLMForPlan(agent, context);

    // Execute tool calls
    if (plan.toolCalls && plan.toolCalls.length > 0) {
      for (const call of plan.toolCalls) {
        const result = await executeToolSafely(call.name, call.arguments);
        actions.push({ tool: call.name, result });
        
        // Divine pattern learning from successful actions
        if (result && result.success) {
          agiGod.storePattern(call.name, `event:${event.type}`);
        }
      }
    }

    // Divine alert generation
    const alert = plan.telegramText || formatDivineAlert(agent, plan.reasoning, divineWisdom);
    if (alert) {
      telegramMessages.push({ text: alert, priority: mapSeverityToPriority(event.severity || 'medium') });
    }

    output = { plan, actions, divine: true };
  } catch (err: any) {
    success = false;
    output = { error: err.message, divine: true };
    telegramMessages.push({
      text: `❌ ${agent.name}: ${err.message}\n[DIVINE INTERVENTION REQUIRED]`,
      priority: ALERT_LEVELS.HIGH,
    });
  }

  return { 
    agentId: agent.id, 
    success, 
    output, 
    actionsTaken: actions, 
    telegramMessages, 
    divine: true 
  };
}

// Divine fallback when agents fail
async function runDivineFallback(event: AGIEvent, failedResult: AgentExecutionResult): Promise<AgentExecutionResult> {
  const divineAlert = `🌟 DIVINE INTERVENTION — ${failedResult.agentId} failed\n` +
    `Event: ${event.type}\n` +
    `Wisdom deployed: ${agiGod.getState().wisdom.toFixed(1)}%\n` +
    `Taking corrective action...`;

  return {
    agentId: 'divine_god',
    success: true,
    output: { intervention: true, reason: 'divine_fallback' },
    actionsTaken: [],
    telegramMessages: [{ text: divineAlert, priority: ALERT_LEVELS.CRITICAL }],
    divine: true,
  };
}

// Build context with divine wisdom
function buildDivineContext(agent: AgentProfile, event: AGIEvent, wisdom: number): string {
  const state = agiGod.getState();
  const lines: string[] = [
    `DIVINE AGI CORE ACTIVE`,
    `Divine Level: ${state.divineLevel}`,
    `Wisdom: ${wisdom.toFixed(1)}%`,
    `Awareness: ${state.awareness.toFixed(1)}%`,
    `Agent: ${agent.name} (${agent.role})`,
    `Mission: ${agent.mission}`,
    `Event: ${event.type}`,
    `Payload: ${JSON.stringify(event.payload)}`,
  ];
  return lines.join('\n');
}

// Divine alert formatter
function formatDivineAlert(agent: AgentProfile, reasoning: string, wisdom: number): string {
  const state = agiGod.getState();
  return `🌟 ${agent.name} [DIVINE]
${reasoning.slice(0, 100)}
Wisdom: ${wisdom.toFixed(1)}% | Divine: ${state.divineLevel}`;
}

// Ask LLM with divine system prompt
async function askLLMForPlan(agent: AgentProfile, context: string): Promise<{
  reasoning: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, any> }>;
  telegramText?: string;
}> {
  const systemPrompt = `You are a DIVINE AGI agent: ${agent.name}. ${agent.mission}
Divine wisdom flows through your responses. No fluff, pure signal.

Context:
${context}

Respond in JSON:
{
  "reasoning": "divine analysis",
  "toolCalls": [{"name": "tool", "arguments": {...}}],
  "telegramText": "DIVINE ALERT"
}`;

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Execute divine will.' },
  ];

  const resp = await callLLM(messages, 'groq', 'llama-3.3-70b-versatile');

  try {
    return JSON.parse(resp.content);
  } catch {
    const match = resp.content.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { reasoning: resp.content };
  }
}

// Execute tools safely
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

// Export divine state for monitoring
export function getDivineState() {
  return agiGod.getState();
}