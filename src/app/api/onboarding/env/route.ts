import { NextResponse } from 'next/server';

// GET /api/onboarding/env — detect deployment environment (non-secret values only)
export async function GET() {
  return NextResponse.json({
    isVercel: Boolean(process.env.VERCEL),
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '', // public var
    hasSupabaseKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    databaseUrl: process.env.DATABASE_URL || '', // may be local; still safe to expose structure
    hasOpenaiKey: Boolean(process.env.OPENAI_API_KEY),
  });
}
