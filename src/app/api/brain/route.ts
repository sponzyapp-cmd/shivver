import { NextRequest, NextResponse } from 'next/server';
import { db, brain_nodes, brain_connections, brain_clusters, user_actions } from '@/lib/db';
import { sql, desc } from 'drizzle-orm';

// GET /api/brain/graph — fetch 3D graph for current user
export async function GET(req: NextRequest) {
  try {
    // In no-auth mode, we use a fixed demo user_id = 1
    // TODO: implement session-based user identification
    const userId = 1; // demo mode

    // Fetch nodes
    const nodes = await db.select().from(brain_nodes).where(sql`${brain_nodes.userId} = ${userId}`);

    // Fetch connections for this user's nodes
    const nodeIds = nodes.map(n => n.nodeId);
    const connections = await db.select().from(brain_connections)
      .where(
        sql`${brain_connections.userId} = ${userId} AND ${brain_connections.sourceId} = ANY(${nodeIds})`
      );

    // Fetch clusters
    const clusters = await db.select().from(brain_clusters).where(sql`${brain_clusters.userId} = ${userId}`);

    return NextResponse.json({
      nodes: nodes.map(n => ({
        id: n.nodeId,
        label: n.label,
        type: n.type,
        importance: n.importance,
        activation: n.activation,
        metadata: n.metadata,
      })),
      connections: connections.map(c => ({
        sourceId: c.sourceId,
        targetId: c.targetId,
        type: c.type,
        strength: c.strength,
        lastUsed: c.lastUsed,
        usageCount: c.usageCount,
      })),
      clusters: clusters.map(c => ({
        id: c.clusterId,
        label: c.label,
        nodeIds: c.nodeIds,
        color: c.color,
      })),
    });
  } catch (err: any) {
    console.error('Brain graph fetch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/brain/track — record a user action for brain building
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, action } = body;

    if (!action || !userId) {
      return NextResponse.json({ error: 'userId and action required' }, { status: 400 });
    }

    // Insert action
    await db.insert(user_actions).values({
      userId,
      type: action.type,
      channel: action.channel || null,
      content: action,
      duration: action.duration || null,
      success: action.success ?? null,
      timestamp: action.timestamp ? new Date(action.timestamp) : new Date(),
    });

    // Trigger async brain update (will run in background)
    // In production, this would enqueue a job
    // For now, respond immediately

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Action tracking error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
