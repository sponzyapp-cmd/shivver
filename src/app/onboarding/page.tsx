'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, HardDrive, Cloud, Key, Database, Play, Rocket, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { LogoWatermarkPattern } from '@/components/onboarding/LogoWatermarkPattern';

type Step = 'welcome' | 'mode' | 'api-keys' | 'database' | 'migrate' | 'done';

interface ConfigState {
  mode: 'local' | 'cloud' | null;
  openaiKey: string;
  elevenlabsKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  databaseUrl: string;
}

// Steps for progress bar
const STEPS: Step[] = ['welcome', 'mode', 'api-keys', 'database', 'migrate', 'done'];

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
  const [detected, setDetected] = useState<{ isVercel: boolean; supabaseUrl: string; databaseUrl: string; hasOpenaiKey: boolean }>({
    isVercel: false,
    supabaseUrl: '',
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

  // Auto-detect environment
  useEffect(() => {
    async function detect() {
      try {
        const res = await fetch('/api/onboarding/env');
        if (res.ok) {
          const data = await res.json();
          setDetected(data);
        }
      } catch {}
    }
    detect();
  }, []);

  function updateConfig(field: keyof ConfigState, value: string) {
    setConfig(prev => ({ ...prev, [field]: value }));
  }

  // If already has OpenAI key, start at mode; else auto-detect cloud
  useEffect(() => {
    if (checking) return;
    if (detected.hasOpenaiKey) {
      setStep('mode');
    } else if (detected.isVercel && detected.supabaseUrl) {
      setConfig(prev => ({
        ...prev,
        mode: 'cloud',
        supabaseUrl: detected.supabaseUrl,
        databaseUrl: detected.databaseUrl,
      }));
      setStep('api-keys');
    } else {
      setStep('welcome');
    }
  }, [checking, detected]);

  async function saveEnvAndContinue() {
    setRunning(true);
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
      if (!res.ok) throw new Error('Failed to save');

      // Route based on mode: local needs DB URL confirmation; cloud goes straight to migrate
      if (config.mode === 'local') {
        setStep('database');
      } else {
        setStep('migrate');
      }
    } catch (err: any) {
      setLog(prev => [...prev, `✗ ${err.message}`]);
    } finally {
      setRunning(false);
    }
  }

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
      setLog(prev => [...prev, `✗ Migration failed`]);
    } finally {
      setRunning(false);
    }
  }

  // Progress percent
  const progress = useMemo(() => {
    const idx = STEPS.indexOf(step);
    const normalizedIdx = step === 'done' ? idx + 1 : idx;
    return Math.min(100, Math.round((normalizedIdx / (STEPS.length - 1)) * 100));
  }, [step]);

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
    <div className="relative min-h-screen overflow-hidden bg-base">
      <LogoWatermarkPattern />

      <div className="relative z-10 mx-auto flex h-screen w-full max-w-2xl flex-col px-4 pb-5">
        {/* Header with back & progress */}
        <header className="mb-2 flex items-center gap-3">
          {step !== 'welcome' && step !== 'done' && (
            <button
              type="button"
              onClick={() => {
                const prevIdx = Math.max(0, STEPS.indexOf(step) - 1);
                setStep(STEPS[prevIdx]);
              }}
              className="grid h-9 w-9 place-items-center rounded-full bg-surface text-text shadow-sm"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-secondary">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className="text-xs text-slate-500">{progress}%</span>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Welcome */}
            {step === 'welcome' && (
              <div className="flex flex-col items-start justify-center h-full space-y-6">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Welcome to Shivver</h1>
                  <p className="mt-2 text-slate-400">Your personal AI assistant. Let&apos;s get you set up in under 2 minutes.</p>
                </div>

                <div className="space-y-3 text-sm text-slate-300">
                  <p>You&apos;ll need:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong className="text-slate-200">OpenAI API key</strong> — for intelligence</li>
                    <li><strong className="text-slate-200">PostgreSQL</strong> — local or Supabase</li>
                    <li><strong className="text-slate-400">Optional:</strong> ElevenLabs (voice), Exa (search), Google Drive (backup)</li>
                  </ul>
                </div>

                <Button onClick={() => setStep('mode')} className="w-full mt-4">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Mode Selection */}
            {step === 'mode' && (
              <div className="space-y-4 py-2">
                <div>
                  <h2 className="text-2xl font-bold">Choose Deployment Mode</h2>
                  <p className="text-slate-400 text-sm mt-1">Where should Shivver store its data? You can switch later in Settings.</p>
                </div>

                <div className="grid gap-3">
                  <Card
                    className={`cursor-pointer transition-all ${config.mode === 'local' ? 'ring-2 ring-accent bg-accent/5' : 'hover:bg-surface'}`}
                    onClick={() => { updateConfig('mode', 'local'); setStep('api-keys'); }}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                          <HardDrive className="h-5 w-5 text-blue-400" />
                        </div>
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
                          <Cloud className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                          <div className="font-semibold">Cloud Mode</div>
                          <div className="text-xs text-slate-400">Supabase-hosted Postgres + Storage</div>
                        </div>
                        {config.mode === 'cloud' && <Check className="h-5 w-5 ml-auto text-accent" />}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* API Keys */}
            {step === 'api-keys' && (
              <div className="space-y-4 py-2">
                <div>
                  <h2 className="text-2xl font-bold">API Keys</h2>
                  <p className="text-slate-400 text-sm mt-1">Enter your service credentials.</p>
                </div>

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
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setStep('mode')} disabled={running} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={saveEnvAndContinue} disabled={!config.openaiKey || running} className="flex-1">
                    {running ? <Spinner size="sm" /> : 'Continue'}
                  </Button>
                </div>
              </div>
            )}

            {/* Database URL (only for local mode) */}
            {step === 'database' && config.mode === 'local' && (
              <div className="space-y-4 py-2">
                <div>
                  <h2 className="text-2xl font-bold">Database Connection</h2>
                  <p className="text-slate-400 text-sm mt-1">Provide your PostgreSQL connection string.</p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">DATABASE_URL</label>
                  <Input
                    type="password"
                    placeholder="postgresql://user:pass@localhost:5432/shivver"
                    value={config.databaseUrl}
                    onChange={e => updateConfig('databaseUrl', e.target.value)}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Can be left empty if already set on the server. Otherwise, create a local Postgres DB.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setStep('api-keys')} className="flex-1">Back</Button>
                  <Button onClick={() => setStep('migrate')} disabled={running} className="flex-1">
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Migrate */}
            {step === 'migrate' && (
              <div className="space-y-4 py-2">
                <div>
                  <h2 className="text-2xl font-bold">Initialize Database</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Click to create tables and seed initial data. This runs <code className="px-1 py-0.5 rounded bg-surface text-xs">npx drizzle-kit push</code>.
                  </p>
                </div>

                <div className="bg-surface rounded-lg p-4 font-mono text-xs text-slate-300 space-y-1 max-h-48 overflow-y-auto">
                  {log.length === 0 && <span className="opacity-50">Waiting to start...</span>}
                  {log.map((line, i) => (
                    <div key={i} className={line.startsWith('✓') ? 'text-green-400' : line.startsWith('✗') ? 'text-red-400' : 'text-slate-300'}>
                      {line}
                    </div>
                  ))}
                  {running && <Spinner size="sm" className="inline ml-2" />}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" onClick={() => setStep(config.mode === 'cloud' ? 'api-keys' : 'database')} disabled={running} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={runMigrations} disabled={running} className="flex-1">
                    {running ? 'Running...' : 'Run Migrations'}
                  </Button>
                </div>
              </div>
            )}

            {/* Done */}
            {step === 'done' && (
              <div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
                <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center">
                  <Check className="h-10 w-10 text-success" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">You&apos;re all set!</h2>
                  <p className="text-slate-400 text-sm mt-2">
                    Shivver is configured and ready. Start chatting, or explore the 3D brain first.
                  </p>
                </div>
                <div className="flex gap-3 w-full">
                  <Button variant="secondary" as="a" href="/brain" className="flex-1">
                    Explore Brain
                  </Button>
                  <Button onClick={() => router.push('/')} className="flex-1">
                    Start Chatting
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
