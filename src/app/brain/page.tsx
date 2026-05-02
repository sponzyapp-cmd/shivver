import Brain3DVisualization from '@/components/brain/Brain3DWrapper';
import { Suspense } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Brain, Activity, BarChart3 } from 'lucide-react';

export const metadata = {
  title: 'Your Brain — Shivver',
  description: '3D visualization of your cognitive model, habits, and behavior patterns',
};

export default function BrainPage() {
  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">Your Brain</h1>
          <p className="text-muted-foreground max-w-lg">
            A living 3D model of how you think, work, and create. Every interaction shapes this graph.
          </p>
        </div>
        <GlassPanel className="px-4 py-2">
          <span className="text-muted-foreground">User:</span>{' '}
          <span className="font-semibold text-primary">Demo User</span>
        </GlassPanel>
      </div>

      {/* 3D Graph */}
      <Suspense fallback={
        <div className="flex items-center justify-center h-[700px]">
          <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Brain3DVisualization />
        </div>
      </Suspense>

      {/* Behavior Insights */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Communication
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg message length</span>
              <span className="font-mono">143 chars</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Formality</span>
              <span className="font-mono">casual (0.3)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Emoji usage</span>
              <span className="font-mono">12%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-400" />
              Tools & Patterns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Most used tool</span>
              <span className="font-mono">web_search</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tool success rate</span>
              <span className="font-mono text-green-400">94%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg task time</span>
              <span className="font-mono">8.2s</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-400" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Peak hour</span>
              <span className="font-mono">14:00–16:00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active days</span>
              <span className="font-mono">Mon–Fri</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sessions today</span>
              <span className="font-mono">12</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Info */}
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          <h4 className="font-semibold text-foreground mb-2">About Your Brain</h4>
          <p className="max-w-3xl">
            This 3D model is built entirely from your interactions with Shivver. Each node represents a concept, tool, action, or
            time you use. Connections show how they relate — what you do together, what you think about simultaneously,
            where you perform actions. The larger and brighter a node, the more important it is to you.
            Activation glows fade over time; frequently used pathways stay strong.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}