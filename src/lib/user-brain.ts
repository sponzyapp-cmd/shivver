export type UserAction =
  | { type: 'message_sent'; content: string; channel: string; timestamp: Date }
  | { type: 'message_received'; content: string; channel: string; timestamp: Date }
  | { type: 'tool_used'; tool: string; params: Record<string, any>; duration: number; success: boolean; timestamp: Date }
  | { type: 'voice_input'; duration: number; transcript: string; timestamp: Date }
  | { type: 'voice_output'; audioUrl: string; duration: number; timestamp: Date }
  | { type: 'web_search'; query: string; resultsCount: number; timestamp: Date }
  | { type: 'file_fetched'; url: string; size: number; timestamp: Date }
  | { type: 'computer_action'; action: string; params: Record<string, any>; success: boolean; timestamp: Date }
  | { type: 'session_started'; device: string; location?: string; timestamp: Date }
  | { type: 'session_ended'; duration: number; timestamp: Date };

export interface UserPattern {
  id: string;
  name: string;
  description: string;
  triggerConditions: Record<string, any>;
  frequency: 'daily' | 'weekly' | 'monthly' | 'rare';
  lastSeen: Date;
  confidence: number;
}

export interface UserBehaviorProfile {
  userId: string;
  activeHours: number[]; // 0-23 hour array
  preferredChannels: Array<{ channel: string; usage: number }>;
  topicInterests: Array<{ topic: string; score: number }>;
  toolUsagePatterns: Record<string, { count: number; avgDuration: number; successRate: number }>;
  communicationStyle: {
    avgMessageLength: number;
    formalityLevel: number; // 0-1
    emojiFreq: number;
    questionRatio: number;
  };
  routines: Array<{
    name: string;
    schedule: string; // cron-ish pattern
    actions: string[];
  }>;
  lastAnalyzed: Date;
}

export interface BrainNode {
  id: string;
  label: string;
  type: 'concept' | 'person' | 'tool' | 'action' | 'time' | 'place' | 'emotion';
  importance: number; // 0-1
  activation: number; // current activation level
  metadata: Record<string, any>;
}

export interface BrainConnection {
  sourceId: string;
  targetId: string;
  type: 'uses' | 'thinks_about' | 'during_time' | 'in_place' | 'causes' | 'similar';
  strength: number; // 0-1
  lastUsed: Date;
}

export interface BrainGraph3D {
  nodes: BrainNode[];
  connections: BrainConnection[];
  clusters: Array<{
    id: string;
    label: string;
    nodeIds: string[];
    color: string;
  }>;
}

// Treemap embedder (like Scrypted brain)
class UserBrain {
  private actions: UserAction[] = [];
  private profile: UserBehaviorProfile | null = null;
  private graph: BrainGraph3D = { nodes: [], connections: [], clusters: [] };
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(private userId: string) {}

  // Record any user interaction
  recordAction(action: UserAction): void {
    this.actions.push(action);
    this.updateProfile(action);
    this.updateGraph(action);
    this.persist(); // async fire-and-forget
  }

  // Analyze all actions and generate profile
  private updateProfile(action: UserAction): void {
    if (!this.profile) {
      this.profile = {
        userId: this.userId,
        activeHours: Array(24).fill(0),
        preferredChannels: [],
        topicInterests: [],
        toolUsagePatterns: {},
        communicationStyle: { avgMessageLength: 0, formalityLevel: 0.5, emojiFreq: 0, questionRatio: 0 },
        routines: [],
        lastAnalyzed: new Date(),
      };
    }

    const hour = action.timestamp.getHours();
    this.profile.activeHours[hour]++;

    // Channel usage
    if ('channel' in action) {
      const existing = this.profile.preferredChannels.find(c => c.channel === action.channel);
      if (existing) existing.usage++;
      else this.profile.preferredChannels.push({ channel: action.channel, usage: 1 });
    }

    // Tool usage
    if (action.type === 'tool_used') {
      const tool = action.tool;
      if (!this.profile.toolUsagePatterns[tool]) {
        this.profile.toolUsagePatterns[tool] = { count: 0, avgDuration: 0, successRate: 1 };
      }
      const pattern = this.profile.toolUsagePatterns[tool];
      pattern.count++;
      pattern.avgDuration = (pattern.avgDuration * (pattern.count - 1) + action.duration) / pattern.count;
      pattern.successRate = (pattern.successRate * (pattern.count - 1) + (action.success ? 1 : 0)) / pattern.count;
    }

    this.profile.lastAnalyzed = new Date();
  }

  // Update 3D brain graph in real-time
  private updateGraph(action: UserAction): void {
    const timestamp = action.timestamp;

    // Create time node (hour of day)
    const hourNodeId = `hour-${timestamp.getHours()}`;
    this.ensureNode(hourNodeId, `Hour ${timestamp.getHours()}:00`, 'time', 0.3);

    // Create action type node
    const actionNodeId = `action-${action.type}`;
    this.ensureNode(actionNodeId, action.type.replace(/_/g, ' '), 'action', 0.7);

    // Connect time → action
    this.upsertConnection(hourNodeId, actionNodeId, 'during_time', 0.5, timestamp);

    switch (action.type) {
      case 'message_sent':
      case 'message_received': {
        // Extract concepts/topics from content
        const concepts = this.extractConcepts(action.content);
        const channelNode = this.ensureNode(`channel-${action.channel}`, action.channel, 'place', 0.6);

        // Connect channel ↔ action
        this.upsertConnection(channelNode.id, actionNodeId, 'during_time', 0.7, timestamp);
        this.upsertConnection(actionNodeId, channelNode.id, 'during_time', 0.7, timestamp);

        concepts.forEach((concept: string) => {
          const conceptNode = this.ensureNode(`concept-${concept}`, concept, 'concept', 0.8);
          this.upsertConnection(actionNodeId, conceptNode.id, 'thinks_about', 0.9, timestamp);
          this.upsertConnection(conceptNode.id, actionNodeId, 'thinks_about', 0.9, timestamp);
        });
        break;
      }

      case 'tool_used': {
        const toolNode = this.ensureNode(`tool-${action.tool}`, action.tool, 'tool', 0.9);
        this.upsertConnection(actionNodeId, toolNode.id, 'uses', 1.0, timestamp);
        this.upsertConnection(toolNode.id, actionNodeId, 'uses', 0.8, timestamp);
        break;
      }

      case 'computer_action': {
        const appNode = this.ensureNode(`app-${action.params.application || 'desktop'}`, action.params.application || 'Desktop', 'place', 0.9);
        this.upsertConnection(actionNodeId, appNode.id, 'uses', 0.9, timestamp);
        break;
      }

      case 'voice_input':
        // Connect to transcription concepts
        break;

      case 'session_started':
        if (action.device) {
          const deviceNode = this.ensureNode(`device-${action.device}`, action.device, 'place', 0.5);
          this.upsertConnection(actionNodeId, deviceNode.id, 'in_place', 1.0, timestamp);
        }
        break;
    }

    // Reactivate nearby nodes (spreading activation)
    this.spreadActivation(actionNodeId, 0.2, 2);
  }

  private ensureNode(id: string, label: string, type: BrainNode['type'], baseImportance: number): BrainNode {
    let node = this.graph.nodes.find(n => n.id === id);
    if (!node) {
      node = { id, label, type, importance: baseImportance, activation: 0, metadata: {} };
      this.graph.nodes.push(node);
    }
    node.activation = 1.0; // full activation when used
    return node;
  }

  private upsertConnection(sourceId: string, targetId: string, type: BrainConnection['type'], strength: number, timestamp: Date): void {
    const existing = this.graph.connections.find(c => c.sourceId === sourceId && c.targetId === targetId && c.type === type);
    if (existing) {
      existing.strength = Math.min(1, existing.strength + 0.1);
      existing.lastUsed = timestamp;
    } else {
      this.graph.connections.push({ sourceId, targetId, type, strength, lastUsed: timestamp });
    }
  }

  private spreadActivation(nodeId: string, amount: number, depth: number): void {
    if (depth <= 0) return;
    const neighbors = this.graph.connections
      .filter(c => c.sourceId === nodeId || c.targetId === nodeId)
      .map(c => c.sourceId === nodeId ? c.targetId : c.sourceId);

    neighbors.forEach(neighborId => {
      const neighbor = this.graph.nodes.find(n => n.id === neighborId);
      if (neighbor) {
        neighbor.activation = Math.min(1, neighbor.activation + amount * (neighbor.importance || 0.5));
        this.spreadActivation(neighborId, amount * 0.5, depth - 1);
      }
    });
  }

  private extractConcepts(text: string): string[] {
    // Simple keyword extraction (upgrade to embedding + clustering later)
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'shall', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'most', 'more', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'or', 'if', 'because', 'until', 'while', 'this', 'that', 'these', 'those']);
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w));
    // Return unique top concepts (would use frequency/importance in real version)
    return [...new Set(words)].slice(0, 5);
  }

  // Get 3D graph data for Three.js visualization
  getGraph3D(): BrainGraph3D {
    // Cluster nodes by type/connection density
    const clusters = this.clusterNodes();
    return { nodes: this.graph.nodes, connections: this.graph.connections, clusters };
  }

  private clusterNodes(): BrainGraph3D['clusters'] {
    // Group by type + strong intra-cluster connections
    const typeGroups = new Map<string, string[]>();
    this.graph.nodes.forEach(n => {
      if (!typeGroups.has(n.type)) typeGroups.set(n.type, []);
      typeGroups.get(n.type)!.push(n.id);
    });

    const colors: Record<string, string> = {
      concept: '#6366f1',
      tool: '#22c55e',
      action: '#f59e0b',
      time: '#8b5cf6',
      place: '#ec4899',
      emotion: '#ef4444',
      person: '#3b82f6',
    };

    return Array.from(typeGroups.entries()).map(([type, nodeIds], i) => ({
      id: `cluster-${type}`,
      label: type,
      nodeIds,
      color: colors[type] || '#6b7280',
    }));
  }

  private async persist(): Promise<void> {
    // Save to DB (user_brains table, user_actions log)
    // For now, just keep in memory; implement DB persistence next
  }

  getProfile(): UserBehaviorProfile | null {
    return this.profile;
  }

  getRecentActions(limit: number = 100): UserAction[] {
    return this.actions.slice(-limit);
  }
}

// Global brain instances (per user)
const brains = new Map<string, UserBrain>();

export function getBrain(userId: string): UserBrain {
  if (!brains.has(userId)) {
    brains.set(userId, new UserBrain(userId));
  }
  return brains.get(userId)!;
}
