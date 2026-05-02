// AGI Orchestrator — the central brain
// Routes events to specialized agents, executes their logic, and routes output to Telegram/dashboard.

import { callLLM, type LLMMessage } from '@/lib/llm-provider';
import { db, agent_executions, messages, sessions, tools, tool_executions } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { AGENTS, EVENT_ROUTING, ALERT_LEVELS, type AgentProfile } from './agents';
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
  nextSteps?: string[];
};

// Main entry: process an event through the agent system
export async function processEvent(event: AGIEvent, sessionId?: number): Promise<AgentExecutionResult[]> {
  const results: AgentExecutionResult[] = [];

  let candidateAgents: string[] = [];

  if (event.type === 'user_command') {
    const cmd = (event.payload.command || '').toLowerCase();
    if (cmd.match(/lead|customer|prospect|outreach/)) candidateAgents.push('sales_empire');
    if (cmd.match(/revenue|money|finance|burn|runway/)) candidateAgents.push('money_control');
    if (cmd.match(/growth|viral|cac|ltv|retention/)) candidateAgents.push('growth_engine');
    if (cmd.match(/product|feature|churn|onboarding/)) candidateAgents.push('product_command');
    if (cmd.match(/competitor|competition|market/)) candidateAgents.push('competitor_war');
    if (cmd.match(/self-improve|fix|bug|error/)) candidateAgents.push('systems_architect');
    // Fallback to knowledge engine if nothing matched
    if (candidateAgents.length === 0) candidateAgents = ['knowledge_engine'];
  } else {
    candidateAgents = EVENT_ROUTING[event.type] || [];
  }

  if (candidateAgents.length === 0) {
    const knowledgeAgent = getAgent('knowledge_engine');
    if (knowledgeAgent) {
      const result = await runAgentLogic(knowledgeAgent, event);
      results.push(result);
    }
    return results;
  }

  // Execute each relevant agent in priority order
  for (const agentId of candidateAgents) {
    const agent = getAgent(agentId);
    if (!agent) continue;

    const result = await runAgentLogic(agent, event);
    results.push(result);

    // If critical alert, also escalate to founder personal assistant mode
    if (event.severity === 'critical' || result.telegramMessages.some(m => m.priority >= ALERT_LEVELS.CRITICAL)) {
      const personalAgent = getAgent('personal_perf');
      if (personalAgent) {
        const personalResult = await runAgentLogic(personalAgent, {
          ...event,
          payload: { ...event.payload, escalate: true, sourceAgent: agentId },
        });
        results.push(personalResult);
      }
      break; // stop further agents after critical alert
    }
  }

  return results;
}

// Execute a single agent's logic for an event
async function runAgentLogic(agent: AgentProfile, event: AGIEvent): Promise<AgentExecutionResult> {
  const startTime = Date.now();
  const actions: Array<{ tool: string; result: any }> = [];
  const telegramMessages: Array<{ text: string; priority: number }> = [];
  let success = true;
  let output: any = null;

  try {
    // Build context for LLM
    const context = buildAgentContext(agent, event);

    // Ask LLM what to do (chain-of-thought planning)
    const plan = await askLLMForPlan(agent, context);

    // Execute planned tool calls (if any)
    if (plan.toolCalls && plan.toolCalls.length > 0) {
      for (const call of plan.toolCalls) {
        const result = await executeToolSafely(call.name, call.arguments);
        actions.push({ tool: call.name, result });
      }
    }

    // Generate Telegram alert based on result
    const alert = formatTelegramAlert(agent, event, plan, actions);
    if (alert) {
      telegramMessages.push({
        text: alert,
        priority: mapSeverityToPriority(event.severity || 'medium'),
      });
    }

    output = { plan, actions };
  } catch (err: any) {
    success = false;
    output = { error: err.message };
    telegramMessages.push({
      text: `❌ ${agent.name} crashed: ${err.message}`,
      priority: ALERT_LEVELS.HIGH,
    });
  }

  // Log execution
  await logAgentExecution(agent, event, output, actions, Date.now() - startTime);

  return { agentId: agent.id, success, output, actionsTaken: actions, telegramMessages };
}

// Build a concise context string for the LLM
function buildAgentContext(agent: AgentProfile, event: AGIEvent): string {
  const lines: string[] = [
    `Agent: ${agent.name} (${agent.role})`,
    `Mission: ${agent.mission}`,
    `Event Type: ${event.type}`,
    `Source: ${event.source}`,
    `Timestamp: ${event.timestamp.toISOString()}`,
    `Payload: ${JSON.stringify(event.payload, null, 2)}`,
  ];

  // Add recent relevant history from DB (last 5 related agent runs)
  // (would fetch from agent_executions table)

  return lines.join('\n');
}

// Ask LLM for a plan (tool calls + reasoning)
async function askLLMForPlan(agent: AgentProfile, context: string): Promise<{
  reasoning: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, any> }>;
  telegramText?: string;
}> {
  const systemPrompt = `You are ${agent.name}, ${agent.role}. ${agent.mission}

Your thinking style: direct, brutal clarity. No fluff. No safe suggestions.

Given the event context, decide:
1. What is the real problem?
2. What is the highest-leverage action?
3. Which tools (if any) do you need to call? (tool names: ${agent.tools.join(', ')})
4. What Telegram alert (max 3 lines, financially relevant, action-driven) should be sent?

Answer in this exact JSON structure:
{
  "reasoning": "short analysis",
  "toolCalls": [{"name": "tool_name", "arguments": {...}}],
  "telegramText": "SHORT ALERT LINE 1\nLINE 2 (impact)\nLINE 3 (action: YES/NO or specific command)"
}

If no tool calls are needed, set toolCalls = [].
Telegram text must be <= 160 words, brutal tone, high signal.`;

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: context },
  ];

  // Use Groq for low-latency decisions (can be per-agent configurable)
  const resp = await callLLM(messages, 'groq', 'llama-3.3-70b-versatile');

  try {
    const parsed = JSON.parse(resp.content);
    return parsed;
  } catch (e) {
    // If LLM did not return pure JSON, extract JSON block
    const match = resp.content.match(/\{.*\}/s);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        return { reasoning: resp.content, telegramText: resp.content.slice(0, 200) };
      }
    }
    return { reasoning: resp.content };
  }
}

// Execute a tool with DB logging
async function executeToolSafely(toolName: string, args: Record<string, any>): Promise<any> {
  // Import agent engine's executeTool or re-implement minimal version here
  // For now, delegate to local handlers directly (matching agent-engine switch)
  switch (toolName) {
    case 'lead_finder':
      return await handleLeadFinder(args);
    case 'send_email':
      return await handleSendEmail(args);
    case 'create_campaign':
      return await handleCreateCampaign(args);
    case 'track_metrics':
      return await handleTrackMetrics(args);
    case 'generate_content':
      return await handleContentGen(args);
    case 'read_file':
      return await handleReadFile(args);
    case 'git_diff':
      return await handleGitDiff(args);
    case 'deploy_vercel':
      return await handleDeployVercel(args);
    case 'self_improve':
      return await handleSelfImprove(args);
    case 'monitor_errors':
      return await handleErrorMonitor(args);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Format a Telegram alert from agent reasoning
function formatTelegramAlert(agent: AgentProfile, event: AGIEvent, plan: any, actions: any[]): string | null {
  // If LLM already provided telegramText, use it
  if (plan.telegramText) {
    return plan.telegramText;
  }

  // Otherwise construct generic alert
  const urgency = event.severity?.toUpperCase() || 'INFO';
  const lines: string[] = [];

  if (urgency === 'CRITICAL') {
    lines.push(`🚨 CRITICAL — ${agent.name}`);
  } else if (urgency === 'HIGH') {
    lines.push(`⚠️ HIGH — ${agent.name}`);
  } else {
    lines.push(`ℹ️ ${agent.name}`);
  }

  lines.push(`Event: ${event.type}`);
  if (actions.length > 0) {
    lines.push(`Actions: ${actions.map(a => a.tool).join(', ')}`);
  } else {
    lines.push(`Recommendation: ${(plan.reasoning || 'Review required').slice(0, 100)}`);
  }

  return lines.join('\n');
}

function mapSeverityToPriority(severity: string): number {
  switch (severity) {
    case 'critical': return ALERT_LEVELS.CRITICAL;
    case 'high': return ALERT_LEVELS.HIGH;
    case 'medium': return ALERT_LEVELS.MEDIUM;
    default: return ALERT_LEVELS.LOW;
  }
}

// Log the agent execution to DB (asynchronously)
async function logAgentExecution(
  agent: AgentProfile,
  event: AGIEvent,
  output: any,
  actions: any[],
  durationMs: number
) {
  try {
    const sessionId = 1; // TODO: get actual default session or create system session
    await db.insert(agent_executions).values({
      sessionId,
      agentId: 1, // TODO: map agent.id to agents table row
      messageId: null,
      input: { event: event.type, payload: event.payload },
      output,
      toolCalls: actions.map(a => ({ tool: a.tool, result: a.result })),
      tokensUsed: 0,
      cost: {},
      startedAt: new Date(Date.now() - durationMs),
      completedAt: new Date(),
    });
  } catch (e) {
    // ignore logging failures
  }
}

function getAgent(id: string): AgentProfile | undefined {
  return AGENTS.find(a => a.id === id);
}

// Utility: send Telegram message (directly via OpenClaw channel routing would be different)
// For now, this returns messages that the caller can send through OpenClaw message tool
export function formatTelegramBroadcast(messages: Array<{ text: string; priority: number }>): string {
  // Sort by priority descending
  const sorted = messages.sort((a, b) => b.priority - a.priority);
  return sorted.map(m => m.text).join('\n\n');
}
