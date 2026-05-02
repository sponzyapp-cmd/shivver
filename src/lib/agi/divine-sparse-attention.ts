// Sparse Attention - Inspired by DeepSeek V3.2 DSA
// Lightning indexer + fine-grained token selection for efficient reasoning

import {EventEmitter} from 'node:events';

// ============================================================================
// Sparse Attention Core
// ============================================================================

export interface AttentionToken {
  id: string;
  content: string;
  importance: number;
  timestamp: number;
  selectedBy?: string[];
}

export interface LightningIndexerResult {
  tokenId: string;
  score: number;
  selected: boolean;
}

export class SparseAttention extends EventEmitter {
  private tokens: Map<string, AttentionToken> = new Map();
  private lightningIndex: Map<string, LightningIndexerResult> = new Map();
  private maxTokens = 2048;
  private k = 2048;

  constructor() {
    super();
    this.initializeIndexer();
  }

  private async initializeIndexer() {
    this.emit('index:initialized', {tokens: this.tokens.size});
  }

  // Lightning indexer - compute importance scores
  lightningIndexScore(query: string): Map<string, LightningIndexerResult> {
    const results = new Map<string, LightningIndexerResult>();
    const queryWords = new Set(query.toLowerCase().split(/\s+/));

    for (const [id, token] of this.tokens) {
      const wordOverlap = token.content.toLowerCase().split(/\s+/)
        .filter(w => queryWords.has(w)).length;
      
      const recencyScore = 1 / (1 + (Date.now() - token.timestamp) / 3600000);
      
      const score = (wordOverlap * 0.5) + (recencyScore * 0.3) + (token.importance * 0.2);
      
      results.set(id, {
        tokenId: id,
        score,
        selected: score > 0.5,
      });
    }

    this.lightningIndex = results;
    return results;
  }

  // Fine-grained token selection - top-k
  selectTopKTokens(query: string): AttentionToken[] {
    const scores = this.lightningIndexScore(query);
    
    const sorted = Array.from(scores.entries())
      .sort(([, a], [, b]) => b.score - a.score)
      .slice(0, this.k);

    return sorted
      .map(([id]) => this.tokens.get(id))
      .filter((t): t is AttentionToken => t !== undefined);
  }

  // O(L²) → O(Lk) complexity reduction
  getComplexityReduction(tokenCount: number): { original: string; sparse: string; speedup: number } {
    const original = tokenCount ** 2;
    const sparse = tokenCount * this.k;
    const speedup = original / sparse;

    return {
      original: `${original.toLocaleString()} ops`,
      sparse: `${sparse.toLocaleString()} ops`,
      speedup: Number(speedup.toFixed(2)) + 'x',
    };
  }

  addToken(content: string, importance: number = 0.5): AttentionToken {
    const token: AttentionToken = {
      id: `tok_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      content,
      importance,
      timestamp: Date.now(),
    };

    this.tokens.set(token.id, token);

    if (this.tokens.size > this.maxTokens * 2) {
      const oldest = Array.from(this.tokens.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
        .slice(0, this.tokens.size - this.maxTokens);
      
      for (const [id] of oldest) {
        this.tokens.delete(id);
      }
    }

    return token;
  }

  // Sparse attention reasoning
  async reason(query: string): Promise<{
    selectedTokens: AttentionToken[];
    complexity: { original: string; sparse: string; speedup: string };
  }> {
    const selectedTokens = this.selectTopKTokens(query);
    const complexity = this.getComplexityReduction(this.tokens.size);

    return {
      selectedTokens,
      complexity,
    };
  }
}

// Singleton Sparse Attention
export const sparseAttention = new SparseAttention();