'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronRight, HardDrive, Cloud, Key, Database, Play, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useRouter } from 'next/navigation';

type Step = 'welcome' | 'mode' | 'api-keys' | 'database' | 'migrate' | 'done';

interface ConfigState {
  mode: 'local' | 'cloud' | null;
  openaiKey: string;
  elevenlabsKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  databaseUrl: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [config, setConfig] = useState<ConfigState>({
    mode: null,
    openaiKey: '',
    elevenlabsKey: '',
    supabaseUrl: '',
    supabaseKey: '',
    databaseUrl: '',
  });
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [detected, setDetected] = useState<{
    isVercel: boolean;
    hasSupabaseUrl: boolean;
    supabaseUrl: string;
    hasSupabaseKey: boolean;
    hasDatabaseUrl: boolean;
    databaseUrl: string;
    hasOpenaiKey: boolean;
  }>({
    isVercel: false,
    hasSupabaseUrl: false,
    supabaseUrl: '',
    hasSupabaseKey: false,
    hasDatabaseUrl: false,
    databaseUrl: '',
    hasOpenaiKey: false,
  });
  const [checking, setChecking] = useState(true);

  // Check if already configured
  useEffect(() => {
    async function checkConfig() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.hasOpenaiKey && data.hasDatabaseUrl) {
            router.replace('/');
            return;
          }
        }
      } catch {}
      setChecking(false);
    }
    checkConfig();
  }, [router]);

  // Auto-detect environment (Vercel, Supabase presence)
  useEffect(() => {
    async function detect() {
      try {
        const res = await fetch('/api/onboarding/env');
        if (res.ok) {
          const data = await res.json();
          setDetected(data);
          // Auto-suggest cloud mode if on Vercel with Supabase
          if (data.isVercel && data.hasSupabaseUrl) {
            setConfig(prev => ({
              ...prev,
              mode: 'cloud',
              supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || prev.supabaseUrl,
              databaseUrl: process.env.DATABASE_URL || prev.databaseUrl,
            }));
          }
        }
      } catch (err) {
        console.error('Env detection failed:', err);
      }
    }
    detect();
  }, []);

  function updateConfig(field: keyof ConfigState, value: string) {
    setConfig(prev => ({ ...prev, [field]: value }));
  }

  async function handleAutoDetect() {
    // If on Vercel with Supabase, suggest cloud mode
    if (detected.isVercel && detected.hasSupabaseUrl) {
      setConfig(prev => ({
        ...prev,
        mode: 'cloud',
        supabaseUrl: detected.supabaseUrl || prev.supabaseUrl,
        databaseUrl: detected.databaseUrl || prev.databaseUrl,
      }));
      setStep('api-keys'); // skip mode selection
    } else {
      // Local or simple — prefill database URL if available
      if (detected.databaseUrl) {
        setConfig(prev => ({ ...prev, databaseUrl: detected.databaseUrl }));
      }
      setStep('mode');
    }
  }

  useEffect(() => {
    // Auto-start detection (if URLs are preset, skip to appropriate step)
    if (detected.hasOpenaiKey) {
      // Already has key, can auto-skip to mode selection or migrations
      setStep('mode');
    } else {
      handleAutoDetect();
    }
  }, [detected]);

  async function runMigrations() {
    setRunning(true);
    setLog(prev => [...prev, '→ Starting database migrations...']);

    try {
      const res = await fetch('/api/admin/migrate', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setLog(prev => [...prev, `✓ ${data.message}`, '✓ Database ready!']);
        setStep('done');
      } else {
        setLog(prev => [...prev, `✗ ${data.error}`]);
      }
    } catch (err: any) {
      setLog(prev => [...prev, `✗ Migration failed: ${err.message}`]);
    } finally {
      setRunning(false);
    }
  }

  async function saveEnvAndContinue() {
    setRunning(true);
    setLog(prev => [...prev, '→ Saving configuration...']);

    try {
      const body: Record<string, string> = {};
      if (config.openaiKey) body.OPENAI_API_KEY = config.openaiKey;
      if (config.elevenlabsKey) body.ELEVENLABS_API_KEY = config.elevenlabsKey;
      if (config.databaseUrl) body.DATABASE_URL = config.databaseUrl;
      if (config.supabaseUrl) body.NEXT_PUBLIC_SUPABASE_URL = config.supabaseUrl;
      if (config.supabaseKey) body.NEXT_PUBLIC_SUPABASE_ANON_KEY = config.supabaseKey;

      const res = await fetch('/api/settings/env', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to save env');

      setLog(prev => [...prev, '✓ Environment saved']);
      setStep('migrate');
    } catch (err: any) {
      setLog(prev => [...prev, `✗ ${err.message}`]);
    } finally {
      setRunning(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-slate-400">Checking configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-accent to-indigo-600 text-white text-2xl font-bold shadow-lg mb-4">
            S
          </div>
          <h1 className="text-3xl font-bold">Welcome to Shivver</h1>
          <p className="text-slate-400">Your personal AI assistant — let&apos;s get you set up in &lt;2 minutes.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step === 'welcome' && <Rocket className="h-5 w-5" />}
              {step === 'mode' && <HardDrive className="h-5 w-5" />}
              {step === 'api-keys' && <Key className="h-5 w-5" />}
              {step === 'database' && <Database className="h-5 w-5" />}
              {step === 'migrate' && <Play className="h-5 w-5" />}
              {step === 'done' && <Check className="h-5 w-5 text-success" />}
              <span>{step === 'welcome' ? 'Get Started' : step === 'mode' ? 'Choose Mode' : step === 'api-keys' ? 'API Keys' : step === 'database' ? 'Database' : step === 'migrate' ? 'Initialize' : 'All Set!'}</span>
              {config.mode && <Badge variant="accent" size="sm">{config.mode}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step: Welcome */}
            {step === 'welcome' && (
              <div className="space-y-4">
                <p className="text-slate-300">
                  Shivver needs a few configuration values to work:
                </p>
                <ul className="list-disc list-inside space-y-2 text-slate-400 text-sm ml-4">
                  <li><strong className="text-slate-200">OpenAI API key</strong> — for intelligence</li>
                  <li><strong className="text-slate-200">Database</strong> — PostgreSQL (local or Supabase)</li>
                  <li><strong className="text-slate-200">Optional:</strong> ElevenLabs (voice), Exa (search), Google Drive (backup)</li>
                </ul>
                <div className="pt-4">
                  <Button onClick={() => setStep('mode')} className="w-full">
                    Let&apos;s Configure <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Mode Selection */}
            {step === 'mode' && (
              <div className="space-y-4">
                <p className="text-slate-400 text-sm">
                  Choose where Shivver stores its data. You can switch later in Settings.
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <Card
                    className={`cursor-pointer transition-all ${config.mode === 'local' ? 'ring-2 ring-accent bg-accent/5' : 'hover:bg-surface'}`}
                    onClick={() => { updateConfig('mode', 'local'); setStep('api-keys'); }}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <HardDrive className="h-6 w-6 text-blue-400" />
                        <div>
                          <div className="font-semibold">Local Mode</div>
                          <div className="text-xs text-slate-400">Filesystem + PostgreSQL on your machine</div>
                        </div>
                        {config.mode === 'local' && <Check className="h-5 w-5 ml-auto text-accent" />}
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={`cursor-pointer transition-all ${config.mode === 'cloud' ? 'ring-2 ring-accent bg-accent/5' : 'hover:bg-surface'}`}
                    onClick={() => { updateConfig('mode', 'cloud'); setStep('api-keys'); }}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <Cloud className="h-6 w-6 text-purple-400" />
                        <div>
                          <div className="font-semibold">Cloud Mode (Supabase)</div>
                          <div className="text-xs text-slate-400">Hosted Postgres + Storage on Supabase</div>
                        </div>
                        {config.mode === 'cloud' && <Check className="h-5 w-5 ml-auto text-accent" />}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Step: API Keys */}
            {step === 'api-keys' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">OpenAI API Key *</label>
                    <Input
                      type="password"
                      placeholder="sk-..."
                      value={config.openaiKey}
                      onChange={e => updateConfig('openaiKey', e.target.value)}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Get yours at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-accent hover:underline">platform.openai.com</a>
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">ElevenLabs API Key (optional)</label>
                    <Input
                      type="password"
                      placeholder="eleven_..."
                      value={config.elevenlabsKey}
                      onChange={e => updateConfig('elevenlabsKey', e.target.value)}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Needed for voice (TTS/STT). Skip to use text-only.</p>
                  </div>

                  {config.mode === 'cloud' && (
                    <>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Supabase URL</label>
                        <Input
                          type="text"
                          placeholder="https://xxx.supabase.co"
                          value={config.supabaseUrl}
                          onChange={e => updateConfig('supabaseUrl', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Supabase Anon Key</label>
                        <Input
                          type="password"
                          placeholder="eyJ..."
                          value={config.supabaseKey}
                          onChange={e => updateConfig('supabaseKey', e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {config.mode === 'local' && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">PostgreSQL Database URL (optional if already set)</label>
                      <Input
                        type="password"
                        placeholder="postgresql://user:pass@localhost:5432/shivver"
                        value={config.databaseUrl}
                        onChange={e => updateConfig('databaseUrl', e.target.value)}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Can be empty if DATABASE_URL already exists on server.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setStep('mode')} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={saveEnvAndContinue}
                    disabled={!config.openaiKey || running}
                    className="flex-1"
                  >
                    {running ? <Spinner size="sm" /> : 'Save & Continue'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Database / Migrate */}
            {step === 'migrate' && (
              <div className="space-y-4">
                <p className="text-slate-400 text-sm">
                  Click the button to create database tables and seed initial data. This only needs to be done once.
                </p>

                <div className="bg-surface rounded-lg p-4 font-mono text-xs text-slate-300 space-y-1 max-h-48 overflow-y-auto">
                  {log.length === 0 && <span className="opacity-50">Waiting to start...</span>}
                  {log.map((line, i) => (
                    <div key={i} className={line.startsWith('✓') ? 'text-green-400' : line.startsWith('✗') ? 'text-red-400' : 'text-slate-300'}>
                      {line}
                    </div>
                  ))}
                  {running && <Spinner size="sm" className="inline ml-2" />}
                </div>

                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setStep('api-keys')} disabled={running} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={runMigrations} disabled={running} className="flex-1">
                    {running ? 'Running...' : 'Run Migrations'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Done */}
            {step === 'done' && (
              <div className="space-y-6 text-center">
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                    <Check className="h-8 w-8 text-success" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">You&apos;re all set!</h3>
                  <p className="text-slate-400 text-sm">
                    Shivver is configured and ready. Start chatting, or explore the 3D brain first.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" as="a" href="/brain" className="flex-1">
                    Explore Brain
                  </Button>
                  <Button onClick={() => router.push('/')} className="flex-1">
                    Start Chatting
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skip link */}
        {step !== 'done' && step !== 'welcome' && (
          <p className="text-center text-sm text-slate-400">
            Already configured? <button onClick={() => router.push('/')} className="text-accent hover:underline">Skip to app</button>
          </p>
        )}
      </div>
    </div>
  );
}
