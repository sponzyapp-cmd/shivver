import Brain3DVisualization from '@/components/brain/Brain3DVisualization';
import { Suspense } from 'react';

export const metadata = {
  title: 'Your Brain — Shivver',
  description: '3D visualization of your cognitive model, habits, and behavior patterns',
};

export default function BrainPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Your Brain</h1>
          <p className="text-slate-400 max-w-lg">
            A living 3D model of how you think, work, and create. Every interaction shapes this graph.
          </p>
        </div>
        <div className="glass-panel px-4 py-2 rounded-lg text-sm">
          <span className="text-slate-400">User:</span>{' '}
          <span className="font-semibold text-blue-400">Demo User</span>
        </div>
      </div>

      {/* 3D Graph */}
      <Suspense fallback={
        <div className="flex items-center justify-center h-[700px]">
          <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <Brain3DVisualization />
      </Suspense>

      {/* Behavior Insights */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-3 text-blue-400">Communication</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Avg message length</span>
              <span className="font-mono">143 chars</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Formality</span>
              <span className="font-mono">casual (0.3)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Emoji usage</span>
              <span className="font-mono">12%</span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-3 text-green-400">Tools & Patterns</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Most used tool</span>
              <span className="font-mono">web_search</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tool success rate</span>
              <span className="font-mono text-green-400">94%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Avg task time</span>
              <span className="font-mono">8.2s</span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-3 text-purple-400">Activity</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Peak hour</span>
              <span className="font-mono">14:00–16:00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Active days</span>
              <span className="font-mono">Mon–Fri</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sessions today</span>
              <span className="font-mono">12</span>
            </div>
          </div>
        </div>
      </section>

      {/* Info */}
      <div className="glass-panel p-6 rounded-xl text-sm text-slate-400">
        <h4 className="font-semibold text-slate-200 mb-2">About Your Brain</h4>
        <p className="max-w-3xl">
          This 3D model is built entirely from your interactions with Shivver. Each node represents a concept, tool, action, or
          time you use. Connections show how they relate — what you do together, what you think about simultaneously,
          where you perform actions. The larger and brighter a node, the more important it is to you.
          Activation glows fade over time; frequently used pathways stay strong.
        </p>
      </div>
    </div>
  );
}
