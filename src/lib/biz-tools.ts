// Business Automation Tools for Shivver — Offline-First
// Goal: Fully autonomous AI CEO; works without internet

import { callLLM, type LLMMessage } from '@/lib/llm-provider';
import { db, leads, campaigns, email_logs } from '@/lib/db';
import { nanoid } from 'nanoid';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const isSQLite = process.env.SHIVVER_MODE === 'local' || process.env.SHIVVER_MODE === 'offline';

// ── Lead Finder ──────────────────────────────────────────────────────────────
// Offline-first: uses LLM knowledge if no EXA_KEY; else uses Exa
export async function handleLeadFinder(args: any): Promise<any> {
  const query = args.query || args.industry || 'fintech startups';
  const limit = args.limit || args.num_leads || 20;
  const exaKey = process.env.EXA_API_KEY;

  if (exaKey) {
    // Online path (Exa)
    const searchQuery = `companies or people "${query}" contact info founder CEO`;
    const exaResp = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: { 'x-api-key': exaKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: searchQuery,
        numResults: Math.min(limit * 3, 50),
        type: 'neural',
        contents: { text: true, highlights: true },
      }),
    });
    if (!exaResp.ok) throw new Error(`Exa search failed: ${exaResp.statusText}`);
    const data = await exaResp.json();
    const results = data.results || [];
    const snippets = results.slice(0, 30).map((r:any) => `${r.title}\n${r.text?.slice(0,2000) || r.highlights?.join(' ')}`).join('\n\n---\n\n');
    const systemPrompt = `Extract JSON array of leads. Each: name, url, email, company, painPoints[], channel, relevanceScore.`;
    const llmResp = await callLLM([{role:'system',content:systemPrompt},{role:'user',content:`Query: ${query}\nResults:\n${snippets}`}], 'groq', 'llama-3.1-8b-instant');
    let leads: any[] = [];
    try { leads = JSON.parse(llmResp.content); } catch { leads = []; }
    for (const lead of leads) {
      try {
        await db.insert(leads).values({
          userId: 1 as any,
          name: lead.name,
          email: lead.email||null,
          company: lead.company||null,
          website: lead.url,
          sourceChannel: lead.channel||'exa',
          queryUsed: query,
          relevanceScore: lead.relevanceScore||50,
          painPoints: lead.painPoints||[],
          status: 'new',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch {}
    }
    return { count: leads.length, leads };
  }

  // Offline: generate from LLM internal knowledge
  const system = `You are a sales engine. Generate ${limit} plausible B2B leads matching: "${query}". Return JSON array: {name, website, email, company, painPoints:string[], relevanceScore:0-100}.`;
  const llm = await callLLM([{role:'system',content:system},{role:'user',content:query}], 'groq', 'llama-3.1-8b-instant');
  let leads: any[] = [];
  try { leads = JSON.parse(llm.content); } catch {
    const m = llm.content.match(/\[.*\]/s);
    if (m) leads = JSON.parse(m[0]);
  }
  for (const lead of leads) {
    try {
      await db.insert(leads).values({
        userId: 1 as any,
        name: lead.name,
        email: lead.email || null,
        company: lead.company || null,
        website: lead.website || lead.url || `https://${(lead.company||lead.name).toLowerCase().replace(/\s/g,'')}.com`,
        sourceChannel: 'offline_llm',
        queryUsed: query,
        relevanceScore: lead.relevanceScore || 50,
        painPoints: isSQLite ? JSON.stringify(lead.painPoints || []) : (lead.painPoints || []),
        status: 'new',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch {}
  }
  return { count: leads.length, leads, source: 'offline_llm' };
}

// ── Send Email ───────────────────────────────────────────────────────────────
// Queues email locally; actual send when online (Resend) or simulated offline
export async function handleSendEmail(args: {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  fromEmail?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, subject, body } = args;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Shivver AI <${fromEmail || 'onboarding@resend.dev'}>`,
        to, subject, html: body,
      }),
    });
    if (!resp.ok) {
      const err = await resp.text();
      await logEmail(to, subject, body, 'failed', err);
      return { success: false, error: err };
    }
    const data = await resp.json();
    await logEmail(to, subject, body, 'sent', null, data.id);
    return { success: true, messageId: data.id };
  }

  // Offline: queue for later
  await logEmail(to, subject, body, 'queued', null);
  console.log(`[EMAIL QUEUED] ${to} – ${subject}`);
  return { success: true, messageId: 'queued-' + Date.now() };
}

async function logEmail(to: string, subject: string, body: string, status: string, error?: string, msgId?: string) {
  try {
    await db.insert(email_logs).values({
      leadId: null as any,
      campaignId: null as any,
      toEmail: to,
      subject,
      body,
      sentAt: new Date(),
      status,
      error,
      opens: 0,
      clicks: 0,
      metadata: isSQLite ? JSON.stringify({ messageId: msgId }) : { messageId: msgId },
    });
  } catch {}
}

// ── Create Campaign ────────────────────────────────────────────────────────
export async function handleCreateCampaign(args: {
  name: string;
  objective: string;
  targetIcp: string;
  sequence: Array<{ day: number; subject: string; template: string }>;
  dailyLimit?: number;
}): Promise<{ id: string; status: string }> {
  const { name, objective, targetIcp, sequence, dailyLimit = 10 } = args;
  const id = nanoid();
  await db.insert(campaigns).values({
    userId: 1 as any,
    name, objective, targetIcp, sequence: isSQLite ? JSON.stringify(sequence) : (sequence as any),
    dailyLimit,
    status: 'draft', createdAt: new Date(), updatedAt: new Date(),
  });
  return { id, status: 'draft' };
}

// ── Track Metrics ───────────────────────────────────────────────────────────
export async function handleTrackMetrics(args: {
  sources?: string[];
  period?: string;
}): Promise<any> {
  const { sources = ['stripe'], period = '7d' } = args;
  const metrics: any = {};
  if (sources.includes('stripe')) {
    const key = process.env.STRIPE_SECRET_KEY;
    metrics.stripe = key ? { revenue: 0, mrr: 0, arr: 0 } : { error: 'No Stripe key' };
  }
  const prompt = `Metrics: ${JSON.stringify(metrics)}. Summarize insights and top 3 actions.`;
  const llm = await callLLM([{ role: 'user', content: prompt }], 'groq', 'llama-3.3-70b-versatile');
  return { metrics, insights: llm.content };
}

// ── Content Generation ─────────────────────────────────────────────────────
export async function handleContentGen(args: {
  type: 'blog' | 'twitter' | 'linkedin' | 'email' | 'ad';
  topic: string;
  tone?: string;
  length?: string;
}): Promise<{ content: string; variantCount: number }> {
  const { type, topic, tone = 'professional', length = 'medium' } = args;
  const lenMap: Record<string,string> = { blog:'1200-1800 words', twitter:'<280 chars', linkedin:'300-500 words', email:'200-400 words', ad:'10-30 words' };
  const system = `You are a SaaS copywriter. Write a ${type} about "${topic}" in ${tone} tone. Output only content, ${lenMap[type]}.`;
  const resp = await callLLM([{role:'system',content:system},{role:'user',content:`Write ${type} about ${topic}`}], 'groq', 'llama-3.3-70b-versatile');
  return { content: resp.content, variantCount: 1 };
}

// ── Read File ───────────────────────────────────────────────────────────────
export async function handleReadFile(args: { path: string }): Promise<{ content: string; size: number }> {
  const { path: p } = args;
  const workspaceRoot = process.env.WORKSPACE_ROOT || '/root/.openclaw/workspace';
  const absPath = path.resolve(workspaceRoot, p);
  if (!absPath.startsWith(workspaceRoot)) throw new Error('Path outside workspace');
  if (!fs.existsSync(absPath)) throw new Error(`File not found: ${p}`);
  const content = fs.readFileSync(absPath, 'utf-8');
  return { content, size: content.length };
}

// ── Git Diff ────────────────────────────────────────────────────────────────
export async function handleGitDiff(args: { repoPath?: string; file?: string }): Promise<{ diff: string; changedFiles: string[] }> {
  const { repoPath = '/root/.openclaw/workspace/shivver', file } = args;
  try {
    let diffCmd = 'git diff --color=never';
    if (file) diffCmd += ` -- "${file}"`;
    const diff = execSync(diffCmd, { cwd: repoPath, encoding: 'utf-8' });
    const status = execSync('git status --porcelain', { cwd: repoPath, encoding: 'utf-8' });
    const changedFiles = status.split('\n').filter(Boolean).map(l => l.slice(3).trim());
    return { diff, changedFiles };
  } catch (err: any) {
    return { diff: err.message, changedFiles: [] };
  }
}

// ── Deploy Vercel ───────────────────────────────────────────────────────────
export async function handleDeployVercel(args: { projectId?: string; gitCommit?: string }): Promise<{ deploymentUrl?: string; error?: string }> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) return { error: 'VERCEL_TOKEN not configured' };
  try {
    const resp = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!resp.ok) return { error: `Vercel error ${resp.status}` };
    const data = await resp.json();
    return { deploymentUrl: data.url };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ── Self-Improve ─────────────────────────────────────────────────────────────
export async function handleSelfImprove(args: { targetFile?: string; goal?: string }): Promise<{ suggestions: string[]; patchesApplied: number }> {
  const { targetFile, goal = 'general improvements' } = args;
  const logsPath = '/root/.openclaw/workspace/memory';
  let recentErrors: string[] = [];
  try {
    const today = new Date().toISOString().slice(0,10);
    const logFile = `${logsPath}/${today}.md`;
    if (fs.existsSync(logFile)) {
      const content = fs.readFileSync(logFile,'utf-8');
      recentErrors = content.split('\n').filter(l => l.toLowerCase().includes('error') || l.includes('⚠️')).slice(-20);
    }
  } catch {}
  let targetContent = '';
  let targetPath = targetFile;
  if (!targetPath) {
    const status = execSync('git status --porcelain', { cwd:'/root/.openclaw/workspace/shivver', encoding:'utf-8' });
    const changed = status.split('\n').filter(Boolean)[0]?.slice(3).trim();
    if (changed) targetPath = changed;
  }
  if (targetPath) {
    try { targetContent = fs.readFileSync(`/root/.openclaw/workspace/shivver/${targetPath}`,'utf-8'); } catch {}
  }
  const prompt = `You are an expert code reviewer. Goal: ${goal}\nRecent errors: ${recentErrors.join('\n')}\n${targetContent?`File: ${targetPath}\nContent:\n${targetContent.slice(0,5000)}`:'No target file.'}\nProvide 3-5 actionable code-level suggestions. Numbered list.`;
  const llm = await callLLM([{ role:'user', content: prompt }], 'groq', 'llama-3.3-70b-versatile');
  return { suggestions: [llm.content], patchesApplied: 0 };
}

// ── Error Monitor ─────────────────────────────────────────────────────────────
export async function handleErrorMonitor(args: { hoursBack?: number }): Promise<{ errorCount: number; recentErrors: string[]; actionTaken?: string }> {
  const { hoursBack = 1 } = args;
  const cutoff = new Date(Date.now() - hoursBack*60*60*1000);
  const logsDir = '/root/.openclaw/workspace/memory';
  let recentErrors: string[] = [];
  try {
    const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const filePath = `${logsDir}/${file}`;
      const stat = fs.statSync(filePath);
      if (stat.mtime < cutoff) continue;
      const lines = fs.readFileSync(filePath,'utf-8').split('\n');
      lines.forEach(line => {
        if (line.toLowerCase().includes('error') || line.includes('❌') || line.includes('⚠️')) {
          recentErrors.push(`${file}: ${line.trim()}`);
        }
      });
    }
  } catch {}
  const errorCount = recentErrors.length;
  let actionTaken: string | undefined;
  if (errorCount > 5) {
    try {
      const improve = await handleSelfImprove({ goal: 'fix recurring errors' });
      console.log('Self-improve suggestions:', improve.suggestions);
      actionTaken = 'triggered_self_improve';
    } catch {}
  }
  return { errorCount, recentErrors: recentErrors.slice(-10), actionTaken };
}
