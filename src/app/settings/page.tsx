'use client';

import { useState, useEffect } from 'react';
import { HardDrive, Cloud, RefreshCw, Upload, Download, Link2, Unlink, Check, X, Key, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import type { ShivverConfig } from '@/lib/platform';

interface EnvVar {
  key: string;
  value: string;
  isSecret: boolean;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<ShivverConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    Promise.all([fetchConfig(), fetchEnv()]);
  }, []);

  async function fetchConfig() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      showMessage('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchEnv() {
    try {
      const res = await fetch('/api/settings/env');
      const data = await res.json();
      const vars: EnvVar[] = Object.entries(data.env || {}).map(([k, v]) => ({
        key: k,
        value: v as string,
        isSecret: /key|secret|token|password|auth/i.test(k),
      }));
      setEnvVars(vars);
    } catch (err) {
      console.error('Failed to load env:', err);
    }
  }

  async function handleModeChange(mode: 'local' | 'cloud') {
    setSyncing(true);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, cloudOnly: mode === 'cloud' }),
      });
      showMessage(`Switched to ${mode} mode — reload to apply`, 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      showMessage('Failed to change mode', 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function handleEnvSave(key: string, value: string) {
    try {
      await fetch('/api/settings/env', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      setEnvVars(prev => prev.map(v => v.key === key ? { ...v, value: '••••••••' } : v));
      setEditingKey(null);
      showMessage('Environment updated', 'success');
    } catch (err) {
      showMessage('Failed to update env', 'error');
    }
  }

  async function handleEnvReset() {
    try {
      await fetch('/api/settings/env', { method: 'POST' });
      await fetchEnv();
      showMessage('Environment reset to defaults', 'success');
    } catch (err) {
      showMessage('Reset failed', 'error');
    }
  }

  function showMessage(text: string, type: 'success' | 'error') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
          {message.text}
        </div>
      )}

      {/* Deployment Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Deployment Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-400 text-sm">
            Choose where Shivver stores its data. Local mode uses filesystem + PostgreSQL (can be local).
            Cloud mode uses Supabase.
          </p>

          <div className="flex gap-4">
            <Button
              variant={config.mode === 'local' ? 'primary' : 'secondary'}
              onClick={() => handleModeChange('local')}
              disabled={syncing}
              className="flex-1"
            >
              <HardDrive className="h-4 w-4 mr-2" />
              Local
              <span className="ml-2 text-xs opacity-60">(filesystem + DB)</span>
            </Button>
            <Button
              variant={config.mode === 'cloud' ? 'primary' : 'secondary'}
              onClick={() => handleModeChange('cloud')}
              disabled={syncing}
              className="flex-1"
            >
              <Cloud className="h-4 w-4 mr-2" />
              Cloud (Supabase)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Environment Variables — Local mode only */}
      {config.mode === 'local' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Environment Variables
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-400 text-sm">
              API keys and configuration. Secrets are masked. Changes take effect immediately.
            </p>

            <div className="space-y-3">
              {envVars.map(v => (
                <div key={v.key} className="flex items-center gap-3 p-3 bg-surface rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-mono text-slate-300">{v.key}</div>
                    {editingKey === v.key ? (
                      <Input
                        type={v.isSecret ? 'password' : 'text'}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="mt-1"
                        placeholder="Enter value"
                      />
                    ) : (
                      <div className="text-xs text-slate-400 mt-1 font-mono">
                        {v.isSecret ? '•'.repeat(12) : v.value}
                      </div>
                    )}
                  </div>
                  {editingKey === v.key ? (
                    <>
                      <Button size="sm" onClick={() => handleEnvSave(v.key, editValue)}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => { setEditingKey(v.key); setEditValue(''); }}>
                      Edit
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <Button variant="secondary" onClick={handleEnvReset}>
              Reset to defaults
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Environment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 text-sm">
              Cloud mode uses platform-provided environment (Supabase dashboard, Vercel dashboard).
              Edit your .env file locally for local mode.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Google Drive */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Google Drive Backup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm mb-4">
            Backup your brain graph and settings to Google Drive.
          </p>
          <Button onClick={() => {}}>
            <Link2 className="h-4 w-4 mr-2" />
            Connect Google Drive
          </Button>
        </CardContent>
      </Card>

      {/* Stats Link */}
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <Button as="a" href="/stats" variant="secondary">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Usage Statistics
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
