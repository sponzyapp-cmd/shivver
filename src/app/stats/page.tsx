'use client';

import { useEffect, useState } from 'react';
import { BarChart3, MessageSquare, Zap, DollarSign, Clock, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

interface StatsData {
  totalMessages: number;
  totalSessions: number;
  totalToolRuns: number;
  totalTokens: number;
  totalCostUSD: number;
  avgSessionLength: number; // minutes
  messagesByDay: Array<{ date: string; count: number }>;
  topTools: Array<{ tool: string; count: number }>;
  recentSessions: Array<{
    id: number;
    startedAt: string;
    messagesCount: number;
    durationMin: number;
  }>;
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats/full')
      .then(r => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!stats) return <div className="p-8 text-red-400">Failed to load stats</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Statistics</h1>
        <p className="text-slate-400">Usage, costs, and activity across all sessions.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<MessageSquare className="h-5 w-5 text-blue-400" />}
          label="Messages"
          value={stats.totalMessages.toLocaleString()}
          subtext="all time"
        />
        <StatCard
          icon={<Database className="h-5 w-5 text-green-400" />}
          label="Sessions"
          value={stats.totalSessions.toLocaleString()}
          subtext={`${stats.avgSessionLength.toFixed(1)} min avg`}
        />
        <StatCard
          icon={<Zap className="h-5 w-5 text-purple-400" />}
          label="Tool Executions"
          value={stats.totalToolRuns.toLocaleString()}
          subtext="automated actions"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5 text-emerald-400" />}
          label="Total Cost"
          value={`$${stats.totalCostUSD.toFixed(2)}`}
          subtext={`${stats.totalTokens.toLocaleString()} tokens`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Messages Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-2">
              {(() => {
                const maxCount = Math.max(...stats.messagesByDay.map(m => m.count));
                return stats.messagesByDay.map((d) => {
                  const barHeight = Math.max(4, (d.count / maxCount) * 200);
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full bg-accent/60 rounded-t transition-all hover:bg-accent"
                        style={{ height: `${barHeight}px` }}
                        title={`${d.date}: ${d.count} messages`}
                      />
                      <span className="text-[10px] text-slate-500">{d.date.slice(5)}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topTools.map((t, i) => (
                <div key={t.tool} className="flex items-center gap-4">
                  <span className="text-sm text-slate-400 w-20">#{i + 1} {t.tool}</span>
                  <div className="flex-1 bg-surface rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-indigo-500"
                      style={{ width: `${(t.count / stats.totalToolRuns) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-slate-300">{t.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3">Session ID</th>
                  <th className="text-left py-2 px-3">Started</th>
                  <th className="text-left py-2 px-3">Messages</th>
                  <th className="text-left py-2 px-3">Duration</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSessions.map(s => (
                  <tr key={s.id} className="border-b border-border/30 hover:bg-surface/50">
                    <td className="py-2 px-3 font-mono text-xs">{s.id}</td>
                    <td className="py-2 px-3">{new Date(s.startedAt).toLocaleString()}</td>
                    <td className="py-2 px-3">{s.messagesCount}</td>
                    <td className="py-2 px-3">{s.durationMin.toFixed(1)} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, subtext }: { icon: React.ReactNode; label: string; value: string; subtext: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-sm">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{subtext}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
