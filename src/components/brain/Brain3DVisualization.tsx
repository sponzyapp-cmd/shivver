'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, ThreeElements, extend } from '@react-three/fiber';
import { OrbitControls, Points, PointMaterial, Line, Text } from '@react-three/drei';
import * as THREE from 'three';

// Types
interface BrainNodeData {
  id: string;
  label: string;
  type: 'concept' | 'tool' | 'action' | 'time' | 'place' | 'emotion' | 'person';
  importance: number; // 0-1 affects size
  activation: number; // 0-1 affects glow intensity
  metadata: Record<string, any>;
}

interface BrainConnectionData {
  sourceId: string;
  targetId: string;
  type: 'uses' | 'thinks_about' | 'during_time' | 'in_place' | 'causes' | 'similar';
  strength: number;
  lastUsed: Date;
  usageCount: number;
}

interface BrainGraph3D {
  nodes: BrainNodeData[];
  connections: BrainConnectionData[];
  clusters: Array<{ id: string; label: string; nodeIds: string[]; color: string }>;
}

// Color scheme by node type
const TYPE_COLORS: Record<string, string> = {
  concept: '#6366f1', // Indigo
  tool: '#22c55e',    // Green
  action: '#f59e0b',  // Amber
  time: '#8b5cf6',    // Purple
  place: '#ec4899',   // Pink
  emotion: '#ef4444', // Red
  person: '#3b82f6',  // Blue
};

const TYPE_GLOW: Record<string, string> = {
  concept: 'rgba(99, 102, 241, 0.4)',
  tool: 'rgba(34, 197, 94, 0.4)',
  action: 'rgba(245, 158, 11, 0.4)',
  time: 'rgba(139, 92, 246, 0.4)',
  place: 'rgba(236, 72, 153, 0.4)',
  emotion: 'rgba(239, 68, 68, 0.4)',
  person: 'rgba(59, 130, 246, 0.4)',
};

// Graph node (sphere with glow)
function GraphNode({
  node,
  position,
  isHovered,
  onClick,
}: {
  node: BrainNodeData;
  position: [number, number, number];
  isHovered: boolean;
  onClick: (node: BrainNodeData) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const size = 0.2 + node.importance * 0.3;

  // Pulsing glow on activation
  useFrame((state) => {
    if (meshRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2 + node.id.charCodeAt(0)) * 0.1 * node.activation;
      meshRef.current.scale.setScalar(pulse * (isHovered ? 1.3 : 1));
    }
  });

  const color = TYPE_COLORS[node.type] || '#6b7280';

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(node); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={(e) => { document.body.style.cursor = 'auto'; }}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3 + node.activation * 0.5}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {/* Glow shell */}
      <mesh scale={size * 1.4}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15 + node.activation * 0.25}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Node label (floating above) */}
      <Text
        position={[0, size + 0.4, 0]}
        fontSize={0.12}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {node.label}
      </Text>
    </group>
  );
}

// Connection line (straight for simplicity)
function ConnectionLine({
  source,
  target,
  connection,
}: {
  source: BrainNodeData;
  target: BrainNodeData;
  connection: BrainConnectionData;
}) {
  const color = TYPE_COLORS[source.type] || '#6b7280';

  return (
    <Line
      points={[
        [0, 0, 0] as [number, number, number],
        [1, 0, 0] as [number, number, number],
      ]}
      color={color}
      lineWidth={1 + connection.strength * 2}
      transparent
      opacity={0.2 + connection.strength * 0.3}
    />
  );
}

// Force-directed graph layout (simplified 3D force simulation)
function useGraphLayout(nodes: BrainNodeData[], connections: BrainConnectionData[]) {
  const [positions, setPositions] = useState<Map<string, [number, number, number]>>(new Map());

  useEffect(() => {
    // Initialize random 3D positions
    const pos = new Map<string, [number, number, number]>();
    nodes.forEach((n, i) => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3 + Math.random() * 2;
      pos.set(n.id, [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ]);
    });

    // Simple force simulation (attract connected nodes, repel all)
    for (let iter = 0; iter < 50; iter++) {
      connections.forEach((c) => {
        const a = pos.get(c.sourceId);
        const b = pos.get(c.targetId);
        if (!a || !b) return;
        // Attract connected nodes
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) + 0.01;
        const force = 0.01 * c.strength;
        a[0] += dx * force; a[1] += dy * force; a[2] += dz * force;
        b[0] -= dx * force; b[1] -= dy * force; b[2] -= dz * force;
      });

      // Repel all nodes (avoid overlap)
      nodes.forEach((n1) => {
        const p1 = pos.get(n1.id)!;
        nodes.forEach((n2) => {
          if (n1.id === n2.id) return;
          const p2 = pos.get(n2.id)!;
          const dx = p2[0] - p1[0], dy = p2[1] - p1[1], dz = p2[2] - p1[2];
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) + 0.01;
          if (dist < 1.5) {
            const force = 0.02 / dist;
            p1[0] -= dx * force; p1[1] -= dy * force; p1[2] -= dz * force;
          }
        });
      });
    }

    // Keep nodes centered
    let cx=0, cy=0, cz=0;
    pos.forEach(([x,y,z]) => { cx += x; cy += y; cz += z; });
    const count = nodes.length;
    cx/=count; cy/=count; cz/=count;
    pos.forEach((p) => { p[0]-=cx; p[1]-=cy; p[2]-=cz; });

    setPositions(pos);
  }, [nodes.length, connections.length]);

  return positions;
}

// Main 3D scene
function BrainScene({
  graph,
  hoveredNode,
  setHoveredNode,
  onNodeClick,
}: {
  graph: BrainGraph3D;
  hoveredNode: BrainNodeData | null;
  setHoveredNode: (n: BrainNodeData | null) => void;
  onNodeClick: (n: BrainNodeData) => void;
}) {
  const nodePositions = useGraphLayout(graph.nodes, graph.connections);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, -10, -10]} color="#8b5cf6" intensity={0.3} />

      {/* Connections (drawn first so they appear behind nodes) */}
      <group>
        {graph.connections.map((c, i) => {
          const source = graph.nodes.find(n => n.id === c.sourceId);
          const target = graph.nodes.find(n => n.id === c.targetId);
          if (!source || !target) return null;
          const start = nodePositions.get(c.sourceId) || [0,0,0];
          const end = nodePositions.get(c.targetId) || [0,0,0];
          return (
            <group key={i} position={start}>
              <ConnectionLine source={source} target={target} connection={c} />
            </group>
          );
        })}
      </group>

      {/* Nodes */}
      {graph.nodes.map((node) => {
        const pos = nodePositions.get(node.id) || [0, 0, 0];
        return (
          <GraphNode
            key={node.id}
            node={node}
            position={pos}
            isHovered={hoveredNode?.id === node.id}
            onClick={onNodeClick}
          />
        );
      })}
    </>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function Brain3DVisualization() {
  const [graph, setGraph] = useState<BrainGraph3D | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<BrainNodeData | null>(null);
  const [selectedNode, setSelectedNode] = useState<BrainNodeData | null>(null);
  const [stats, setStats] = useState({ nodes: 0, connections: 0, clusters: 0 });

  // Fetch graph from API
  useEffect(() => {
    fetch('/api/brain/graph')
      .then(res => res.json())
      .then((data: BrainGraph3D) => {
        setGraph(data);
        setStats({
          nodes: data.nodes.length,
          connections: data.connections.length,
          clusters: data.clusters.length,
        });
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load brain graph:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400">Loading your brain…</p>
        </div>
      </div>
    );
  }

  if (!graph || graph.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] text-slate-400">
        <div className="text-6xl mb-4">🧠</div>
        <h3 className="text-xl font-semibold mb-2">Your brain is still forming</h3>
        <p className="max-w-md text-center">
          Start using Shivver — send messages, use tools, run tasks. Your 3D cognitive model will grow from your activity.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[700px] rounded-2xl overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-black">
      {/* Stats overlay */}
      <div className="absolute top-4 left-4 z-10 flex gap-4">
        <div className="glass-panel px-4 py-2 rounded-lg text-sm">
          <span className="text-slate-400">Nodes:</span>{' '}
          <span className="font-mono font-semibold text-blue-400">{stats.nodes}</span>
        </div>
        <div className="glass-panel px-4 py-2 rounded-lg text-sm">
          <span className="text-slate-400">Connections:</span>{' '}
          <span className="font-mono font-semibold text-purple-400">{stats.connections}</span>
        </div>
        <div className="glass-panel px-4 py-2 rounded-lg text-sm">
          <span className="text-slate-400">Clusters:</span>{' '}
          <span className="font-mono font-semibold text-green-400">{stats.clusters}</span>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredNode && (
        <div className="absolute top-4 right-4 z-10 glass-panel p-4 rounded-lg max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: TYPE_COLORS[hoveredNode.type] }}
            />
            <span className="text-xs uppercase tracking-wider text-slate-400">{hoveredNode.type}</span>
          </div>
          <h4 className="text-lg font-semibold mb-1">{hoveredNode.label}</h4>
          <div className="text-xs space-y-1 text-slate-300">
            <p>Importance: {(hoveredNode.importance * 100).toFixed(0)}%</p>
            <p>Activation: {(hoveredNode.activation * 100).toFixed(0)}%</p>
            {hoveredNode.metadata && (
              <p>Metadata: {JSON.stringify(hoveredNode.metadata).slice(0, 50)}…</p>
            )}
          </div>
        </div>
      )}

      {/* Selected node detail panel */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 right-4 z-10 glass-panel p-6 rounded-xl max-h-64 overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: TYPE_COLORS[selectedNode.type] }}
              />
              <h3 className="text-xl font-bold">{selectedNode.label}</h3>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-white"
            >✕</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Type</div>
              <div className="font-semibold capitalize">{selectedNode.type}</div>
            </div>
            <div>
              <div className="text-slate-400">Importance</div>
              <div className="font-semibold">{(selectedNode.importance * 100).toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-slate-400">Activation</div>
              <div className="font-semibold">{(selectedNode.activation * 100).toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-slate-400">Connections</div>
              <div className="font-semibold">
                {graph.connections.filter(c => c.sourceId === selectedNode.id || c.targetId === selectedNode.id).length}
              </div>
            </div>
          </div>
          {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="text-slate-400 text-sm mb-1">Metadata</div>
              <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto">
                {JSON.stringify(selectedNode.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <fog attach="fog" args={['#000000', 10, 25]} />
        <BrainScene
          graph={graph}
          hoveredNode={hoveredNode}
          setHoveredNode={setHoveredNode}
          onNodeClick={setSelectedNode}
        />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={4}
          maxDistance={25}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 text-xs text-slate-500 pointer-events-none">
        Drag to rotate • Scroll to zoom • Click node for details
      </div>
    </div>
  );
}
