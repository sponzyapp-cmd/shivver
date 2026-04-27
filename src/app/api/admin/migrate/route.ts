import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// POST /api/admin/migrate — run drizzle-kit push
export async function POST() {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured. Set it in Settings → Environment.' },
        { status: 400 }
      );
    }

    // Run drizzle-kit push
    const { stdout, stderr } = await execAsync('npx drizzle-kit push', {
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
      timeout: 120000, // 2 min max
    });

    if (stderr && !stdout) {
      console.error('Migration stderr:', stderr);
    }

    return NextResponse.json({
      success: true,
      message: 'Database migrations applied successfully.',
      output: stdout.slice(0, 500),
    });
  } catch (err: any) {
    console.error('Migration error:', err);
    return NextResponse.json(
      { error: err.message || 'Migration failed', details: err.stderr?.slice(0, 300) },
      { status: 500 }
    );
  }
}
