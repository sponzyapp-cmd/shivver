'use client';

import { useState, useEffect } from 'react';
import { HardDrive, Cloud, RefreshCw, Upload, Download, Link2, Unlink, Check, X, Key, Save, Cpu, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import type { ShivverConfig } from '@/lib/platform';

interface EnvVar {
  key: string;
  value: string;
  isSecret: boolean;
  provider?: string; // e.g., 'openai', 'groq'
}

const LLM_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', icon: '🤖', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'], keyEnv: 'OPENAI_API_KEY', modelEnv: 'OPENAI_MODEL', keysEnv: 'OPENAI_KEYS' },
  { id: 'groq', name: 'Groq', icon: '⚡', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'], keyEnv: 'GROQ_API_KEY', modelEnv: 'GROQ_MODEL', keysEnv: 'GROQ_KEYS' },
  { id: 'anthropic', name: 'Anthropic', icon: '🧠', models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229'], keyEnv: 'ANTHROPIC_API_KEY', modelEnv: 'ANTHROPIC_MODEL', keysEnv: null },
  { id: 'gemini', name: 'Google Gemini', icon: '💎', models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'], keyEnv: 'GEMINI_API_KEY', modelEnv: 'GEMINI_MODEL', keysEnv: null },
  { id: 'ollama', name: 'Ollama (Local)', icon: '🏠', models: ['llama3:70b', 'codellama:70b', 'mistral'], keyEnv: null, modelEnv: 'OLLAMA_MODEL', keysEnv: null, baseUrlEnv: 'OLLAMA_BASE_URL' },
] as const;

export default function SettingsPage() {
  const [config, setConfig] = useState<ShivverConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [providerKeys, setProviderKeys] = useState<Record<string, { key: string; keys: string; model: string }>>({});

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

      // Build provider keys map
      const p: Record<string, { key: string; keys: string; model: string }> = {};
      for (const prov of LLM_PROVIDERS) {
        p[prov.id] = {
          key: data.env[prov.keyEnv] || '',
          keys: data.env[prov.keysEnv] || '',
          model: data.env[prov.modelEnv] || '',
        };
      }
      // Also get provider order
      p['_order'] = { key: data.env['LLM_PROVIDER_ORDER'] || '', keys: '', model: '' };
      p['_default'] = { key: data.env['DEFAULT_LLM_PROVIDER'] || '', keys: '', model: '' };
      setProviderKeys(p);
    } catch (err) {
      console.error('Failed to load env:', err);
    }
  }

  async function saveProviderConfig(providerId: string, field: 'key' | 'keys' | 'model', value: string) {
    setProviderKeys(prev => ({
      ...prev,
      [providerId]: { ...prev[providerId], [field]: value },
    }));
  }

  async function saveAll() {
    setSyncing(true);
    try {
      const body: Record<string, string> = {};

      // Provider config
      for (const prov of LLM_PROVIDERS) {
        const p = providerKeys[prov.id];
        if (p) {
          if (p.key) body[prov.keyEnv] = p.key;
          if (p.keys) body[prov.keysEnv] = p.keys;
          if (p.model) body[prov.modelEnv] = p.model;
        }
      }
      // Order + default
      if (providerKeys['_order']?.key) body['LLM_PROVIDER_ORDER'] = providerKeys['_order'].key;
      if (providerKeys['_default']?.key) body['DEFAULT_LLM_PROVIDER'] = providerKeys['_default'].key;

      const res = await fetch('/api/settings/env', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to save');

      showMessage('AI provider configuration saved', 'success');
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      showMessage('Failed to save', 'error');
    } finally {
      setSyncing(false);
    }
  }

  function getEnvValue(key: string): string {
    const found = envVars.find(v => v.key === key);
    return found?.value || '';
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

  function showMessage(text: string, type: 'success' | 'error') {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
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

      {/* AI Providers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            AI Providers (Bring Your Own Key)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-slate-400 text-sm">
            Choose which LLM provider powers Shivver. Add multiple keys for failover when rate limits hit.
          </p>

          {/* Default provider + order */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Default Provider</label>
              <select
                value={providerKeys['_default']?.key || 'openai'}
                onChange={e => saveProviderConfig('_default', 'key', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm"
              >
                {LLM_PROVIDERS.map(p => (
                  <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Failover Order (comma-separated IDs)</label>
              <Input
                value={providerKeys['_order']?.key || 'openai,groq,anthropic,gemini,ollama'}
                onChange={e => saveProviderConfig('_order', 'key', e.target.value)}
                placeholder="openai,groq,anthropic"
              />
              <p className="text-[11px] text-slate-400 mt-1">Shivver tries providers in order when one is rate-limited.</p>
            </div>
          </div>

          {/* Per-provider config */}
          <div className="space-y-4">
            {LLM_PROVIDERS.map(prov => {
              const p = providerKeys[prov.id] || { key: '', keys: '', model: '' };
              return (
                <div key={prov.id} className="border border-border/50 rounded-lg p-4 bg-surface/30">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{prov.icon}</span>
                    <h3 className="font-semibold">{prov.name}</h3>
                    {p.key && <Badge variant="success" size="sm">Configured</Badge>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">API Key</label>
                      <Input
                        type="password"
                        value={p.key}
                        onChange={e => saveProviderConfig(prov.id, 'key', e.target.value)}
                        placeholder={`Enter ${prov.name} API key`}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Model</label>
                      <select
                        value={p.model}
                        onChange={e => saveProviderConfig(prov.id, 'model', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm"
                      >
                        <option value="">Auto (recommended)</option>
                        {prov.models.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {prov.keysEnv && (
                    <div className="mt-3">
                      <label className="text-sm font-medium mb-1 block">
                        Additional Keys (comma-separated, for rotation)
                      </label>
                      <Input
                        type="password"
                        value={p.keys}
                        onChange={e => saveProviderConfig(prov.id, 'keys', e.target.value)}
                        placeholder={`Additional ${prov.name} keys (optional)`}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Add extra keys to auto-rotate when daily limits are reached.
                      </p>
                    </div>
                  )}

                  {prov.baseUrlEnv && (
                    <div className="mt-3">
                      <label className="text-sm font-medium mb-1 block">Base URL</label>
                      <Input
                        value={p.key /* reuse field for base URL */}
                        onChange={e => saveProviderConfig(prov.id, 'key', e.target.value)}
                        placeholder="http://localhost:11434"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-border">
            <Button onClick={saveAll} disabled={syncing} className="w-full">
              {syncing ? <Spinner size="sm" className="mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save AI Provider Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

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
          <Button onClick={() => { }}>
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
            <Zap className="h-4 w-4 mr-2" />
            View Usage Statistics
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
