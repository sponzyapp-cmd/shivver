// AGI Agent Definitions & Specialization
// Each agent has a clear mission, triggers, and output channels.

export type AgentMode = 'founder' | 'executive' | 'autonomous';

export interface AgentProfile {
  id: string;
  name: string;
  role: string; // e.g. 'Sales Empire Agent'
  mission: string; // one-sentence purpose
  triggers: string[]; // events that activate this agent
  frequency?: 'continuous' | 'hourly' | 'daily' | 'weekly' | 'on-demand';
  tools: string[]; // allowed tool calls
  outputChannels: ('telegram' | 'dashboard' | 'email' | 'log')[];
  priority: number; // 1-100, higher = more urgent
  kpis: string[]; // key metrics this agent owns
}

export const AGENTS: AgentProfile[] = [
  // 1. SALES EMPIRE
  {
    id: 'sales_empire',
    name: 'Sales Empire Agent',
    role: 'CEO of Revenue',
    mission: 'Generate qualified leads, automate outreach, and close high-value deals.',
    triggers: ['new_lead', 'lead_qualified', 'outbound_campaign', 'pipeline_gap'],
    frequency: 'continuous',
    tools: ['lead_finder', 'send_email', 'create_campaign', 'track_metrics'],
    outputChannels: ['telegram', 'dashboard'],
    priority: 95,
    kpis: ['leads_generated', 'emails_sent', 'pipeline_value', 'closed_revenue'],
  },
  // 2. GROWTH ENGINE
  {
    id: 'growth_engine',
    name: 'Growth Engine Agent',
    role: 'CGO (Chief Growth Officer)',
    mission: 'Own distribution, viral loops, and retention optimization.',
    triggers: ['signup_spike', 'retention_drop', 'viral_coeff_change', 'cac_shift'],
    frequency: 'hourly',
    tools: ['track_metrics', 'generate_content', 'web_search'],
    outputChannels: ['telegram', 'dashboard'],
    priority: 90,
    kpis: ['viral_coefficient', 'cac', 'ltv', 'activation_rate'],
  },
  // 3. PRODUCT COMMAND
  {
    id: 'product_command',
    name: 'Product Command Agent',
    role: 'CPO (Chief Product Officer)',
    mission: 'Ensure every feature move improves retention and reduces friction.',
    triggers: ['churn_spike', 'feature_usage_drop', 'onboarding_dropoff', 'support_ticket_surge'],
    frequency: 'daily',
    tools: ['read_file', 'git_diff', 'track_metrics', 'web_search'],
    outputChannels: ['telegram', 'dashboard'],
    priority: 85,
    kpis: ['churn_rate', 'nps', 'feature_adoption', 'time_to_value'],
  },
  // 4. MONEY CONTROL
  {
    id: 'money_control',
    name: 'Money Control Agent',
    role: 'CFO (Chief Financial Officer)',
    mission: 'Protect revenue, margin, and runway. No leaks.',
    triggers: ['payment_failure', 'mr Change', 'burn_alert', 'cash_low'],
    frequency: 'hourly',
    tools: ['track_metrics', 'send_email'],
    outputChannels: ['telegram', 'email'],
    priority: 98,
    kpis: ['mrr', 'arr', 'runway_months', 'gross_margin', 'collection_rate'],
  },
  // 5. COMPETITOR WAR ROOM
  {
    id: 'competitor_war',
    name: 'Competitor War Room',
    role: 'Strategic Warfare Officer',
    mission: 'Monitor, analyze, and neutralize competitive threats.',
    triggers: ['competitor_launch', 'pricing_change', 'feature_parity', 'press_mention'],
    frequency: 'daily',
    tools: ['web_search', 'track_metrics'],
    outputChannels: ['telegram', 'dashboard'],
    priority: 80,
    kpis: ['market_share', 'pricing_gap', 'feature_gap', 'sentiment_score'],
  },
  // 6. HIRING + AGENT EMPLOYEES
  {
    id: 'hiring_director',
    name: 'Hiring Director',
    role: 'Chief Talent Officer',
    mission: 'Decide who to hire, who to fire, and which AI agents to create.',
    triggers: ['team_gap', 'performance_issue', 'scale_event', 'cost_overrun'],
    frequency: 'weekly',
    tools: ['read_file', 'web_search', 'generate_content'],
    outputChannels: ['telegram', 'dashboard'],
    priority: 75,
    kpis: ['team_velocity', 'cost_per_employee', 'automation_ratio'],
  },
  // 7. EXECUTION ENFORCER
  {
    id: 'execution_enforcer',
    name: 'Execution Enforcer',
    role: 'Chief Operating Officer',
    mission: 'Ensure deadlines are met, priorities are clear, and low-value work is killed.',
    triggers: ['deadline_approaching', 'priority_conflict', 'task_stalled', 'fake_productivity'],
    frequency: 'continuous',
    tools: ['read_file', 'git_diff', 'self_improve'],
    outputChannels: ['telegram', 'dashboard'],
    priority: 93,
    kpis: ['on_time_delivery', 'priority_alignment', 'meeting_efficiency'],
  },
  // 8. CUSTOMER INTELLIGENCE
  {
    id: 'customer_intel',
    name: 'Customer Intelligence Agent',
    role: 'Chief Customer Officer',
    mission: 'Track sentiment, predict churn, identify expansion opportunities.',
    triggers: ['support_ticket', 'churn_risk', 'nps_change', 'usage_drop'],
    frequency: 'hourly',
    tools: ['track_metrics', 'web_search', 'send_email'],
    outputChannels: ['telegram', 'dashboard'],
    priority: 88,
    kpis: ['churn_rate', 'nps', 'expansion_mrr', 'support_tat'],
  },
  // 9. OPPORTUNITY HUNTER
  {
    id: 'opportunity_hunter',
    name: 'Opportunity Hunter',
    role: 'Strategic Development Officer',
    mission: 'Find hidden leverage: partnerships, acquisitions, distribution shortcuts.',
    triggers: ['market_gap', 'competitor_weakness', 'partnership_lead', 'arbitrage_opportunity'],
    frequency: 'daily',
    tools: ['web_search', 'lead_finder', 'track_metrics'],
    outputChannels: ['telegram', 'dashboard'],
    priority: 82,
    kpis: ['opportunities_identified', 'partnerships_closed', 'acquired_customers'],
  },
  // 10. PERSONAL PERFORMANCE
  {
    id: 'personal_perf',
    name: 'Personal Performance Agent',
    role: 'Founder’s Chief of Staff + High-Performance Coach',
    mission: 'Optimize founder energy, focus, sleep, and decision quality.',
    triggers: ['schedule_conflict', 'sleep_debt', 'meeting_overload', 'energy_dip'],
    frequency: 'continuous',
    tools: ['read_file', 'generate_content', 'send_email'],
    outputChannels: ['telegram', 'dashboard'],
    priority: 97,
    kpis: ['deep_work_hours', 'decision_quality', 'energy_score', 'burnout_risk'],
  },
  // 11. KNOWLEDGE + DECISION ENGINE
  {
    id: 'knowledge_engine',
    name: 'Knowledge + Decision Engine',
    role: 'Founder’s Strategic Brain',
    mission: 'Provide first-principles analysis, mental models, investor-grade framing.',
    triggers: ['strategic_decision', 'investment_question', 'market_entry', 'pricing_decision'],
    frequency: 'on-demand',
    tools: ['web_search', 'generate_content', 'read_file'],
    outputChannels: ['telegram', 'dashboard'],
    priority: 96,
    kpis: ['decision_accuracy', 'strategic_win_rate', 'learning_velocity'],
  },
  // 12. SYSTEMS ARCHITECT (self-monitoring)
  {
    id: 'systems_architect',
    name: 'Systems Architect',
    role: 'CTO + Infrastructure Owner',
    mission: 'Keep the AGI system itself healthy, scalable, and error-free.',
    triggers: ['system_error', 'build_failure', 'performance_degradation', 'security_alert'],
    frequency: 'continuous',
    tools: ['monitor_errors', 'self_improve', 'deploy_vercel', 'git_diff'],
    outputChannels: ['telegram', 'dashboard'],
    priority: 99,
    kpis: ['system_uptime', 'error_rate', 'deployment_success', 'tech_debt'],
  },
];

// Quick lookup
export function getAgent(id: string): AgentProfile | undefined {
  return AGENTS.find(a => a.id === id);
}

// Routing: map event types to agent IDs that should handle them
export const EVENT_ROUTING: Record<string, string[]> = {
  new_lead: ['sales_empire', 'opportunity_hunter'],
  lead_qualified: ['sales_empire', 'customer_intel'],
  outbound_campaign: ['sales_empire', 'growth_engine'],
  pipeline_gap: ['sales_empire', 'execution_enforcer'],
  signup_spike: ['growth_engine', 'customer_intel'],
  retention_drop: ['growth_engine', 'product_command', 'customer_intel'],
  viral_coeff_change: ['growth_engine'],
  cac_shift: ['growth_engine', 'money_control'],
  churn_spike: ['product_command', 'customer_intel', 'money_control'],
  feature_usage_drop: ['product_command'],
  onboarding_dropoff: ['product_command', 'customer_intel'],
  support_ticket_surge: ['customer_intel', 'product_command'],
  payment_failure: ['money_control', 'customer_intel'],
  mr_change: ['money_control', 'sales_empire'],
  burn_alert: ['money_control', 'execution_enforcer'],
  cash_low: ['money_control', 'founder_alert'],
  competitor_launch: ['competitor_war', 'growth_engine', 'product_command'],
  pricing_change: ['competitor_war', 'money_control'],
  feature_parity: ['competitor_war', 'product_command'],
  press_mention: ['competitor_war', 'growth_engine'],
  deadline_approaching: ['execution_enforcer'],
  priority_conflict: ['execution_enforcer'],
  task_stalled: ['execution_enforcer'],
  fake_productivity: ['execution_enforcer'],
  schedule_conflict: ['personal_perf', 'execution_enforcer'],
  sleep_debt: ['personal_perf'],
  meeting_overload: ['personal_perf', 'execution_enforcer'],
  energy_dip: ['personal_perf'],
  strategic_decision: ['knowledge_engine'],
  investment_question: ['knowledge_engine', 'money_control'],
  market_entry: ['knowledge_engine', 'competitor_war', 'growth_engine'],
  pricing_decision: ['knowledge_engine', 'money_control', 'sales_empire'],
  system_error: ['systems_architect'],
  build_failure: ['systems_architect'],
  performance_degradation: ['systems_architect'],
  security_alert: ['systems_architect'],
};

// Priority levels for Telegram alerts
export const ALERT_LEVELS = {
  CRITICAL: 100, // immediate founder action required (revenue threat, system down)
  HIGH: 90,      // important decision needed within hours
  MEDIUM: 75,    // strategic watch, daily review
  LOW: 60,       // informational, weekly digest
};
