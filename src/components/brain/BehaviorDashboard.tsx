'use client';

import { useEffect, useState } from 'react';
import { trackMessageSent, trackMessageReceived, trackToolUsed, trackComputerAction, trackVoiceInput, trackVoiceOutput } from '@/lib/brain-tracker';

interface Stats {
  totalMessages: number;
  totalToolsUsed: number;
  avgSessionLength: number;
  topChannels: Array<{ channel: string; count: number }>;
  topTools: Array<{ tool: string; count: number }>;
  activeHours: number[];
  communicationStyle: {
    avgLength: number;
    formality: number;
    emojiRate: number;
  };
}

export default function BehaviorDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load stats from API
    fetch('/api/stats')
      .then(r => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      {/* Total Interactions */}
      <div className="glass-panel p-6 rounded-xl">
        <div className="text-slate-400 text-sm mb-1">Messages</div>
        <div className="text-3xl font-bold text-blue-400">{stats.totalMessages}</div>
        <div className="text-xs text-slate-500 mt-2">Concepts exchanged</div>
      </div>

      {/* Tools Used */}
      <div className="glass-panel p-6 rounded-xl">
        <div className="text-slate-400 text-sm mb-1">Tools Used</div>
        <div className="text-3xl font-bold text-green-400">{stats.totalToolsUsed}</div>
        <div className="text-xs text-slate-500 mt-2">Executions across all sessions</div>
      </div>

      {/* Session Length */}
      <div className="glass-panel p-6 rounded-xl">
        <div className="text-slate-400 text-sm mb-1">Avg Session</div>
        <div className="text-3xl font-bold text-purple-400">{stats.avgSessionLength.toFixed(1)}m</div>
        <div className="text-xs text-slate-500 mt-2">Continuous interaction time</div>
      </div>

      {/* Communication Style */}
      <div className="glass-panel p-6 rounded-xl">
        <div className="text-slate-400 text-sm mb-1">Your Style</div>
        <div className="text-xl font-bold text-orange-400 capitalize">
          {stats.communicationStyle.formality < 0.3 ? 'Casual' :
           stats.communicationStyle.formality < 0.7 ? 'Balanced' : 'Formal'}
        </div>
        <div className="text-xs text-slate-500 mt-2">
          {stats.communicationStyle.avgLength > 100 ? 'Detailed' : 'Concise'} •
          Emoji: {(stats.communicationStyle.emojiRate * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
}
