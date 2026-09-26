import { useMemo } from "react";
import {
  ReactFlow,
  type Node,
  type Edge,
  Background,
  Controls,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { SpecGraphData } from "../hooks/useSpecReview.js";
import { RuntimeBadge } from "./graphics/RuntimeMark.js";
import { useTheme } from "./ThemeProvider.js";

interface SpecTopologyPreviewProps {
  graph?: SpecGraphData | null;
  testId?: string;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 56;
// Min gap between neighbours; widened per graph so the longest edge label fits.
const MIN_H_SPACING = 300;
const LABEL_CHAR_PX = 7.5; // 12px monospace
const V_SPACING = 140;

/**
 * Simple grid layout for spec preview.
 * Groups by pod, lays pods out vertically, members horizontally within each pod.
 */
function layoutNodes(graphNodes: SpecGraphData["nodes"], hSpacing: number): Array<{ id: string; x: number; y: number }> {
  const pods = new Map<string, typeof graphNodes>();
  const ungrouped: typeof graphNodes = [];
  for (const n of graphNodes) {
    if (n.pod) {
      if (!pods.has(n.pod)) pods.set(n.pod, []);
      pods.get(n.pod)!.push(n);
    } else {
      ungrouped.push(n);
    }
  }

  const positions: Array<{ id: string; x: number; y: number }> = [];
  let y = 0;

  // Odd rows shift half a step so an edge that skips a row does not run behind a node.
  let row = 0;
  for (const [, members] of pods) {
    const offset = row % 2 ? hSpacing / 2 : 0;
    members.forEach((n, i) => {
      positions.push({ id: n.id, x: offset + i * hSpacing, y });
    });
    y += V_SPACING;
    row++;
  }

  ungrouped.forEach((n, i) => {
    positions.push({ id: n.id, x: i * hSpacing, y });
  });

  return positions;
}

export function SpecTopologyPreview({ graph, testId }: SpecTopologyPreviewProps) {
  const { resolved } = useTheme();
  const safeGraph = graph ?? { nodes: [], edges: [] };
  const { nodes, edges, height } = useMemo(() => {
    // Parallel edges between one pair share a path, so their labels would stack; merge them.
    const byPair = new Map<string, { source: string; target: string; kinds: string[] }>();
    for (const e of safeGraph.edges) {
      const key = [e.source, e.target].sort().join("\u0000");
      const hit = byPair.get(key);
      if (hit) hit.kinds.push(e.kind);
      else byPair.set(key, { source: e.source, target: e.target, kinds: [e.kind] });
    }
    const longestLabel = Math.max(0, ...[...byPair.values()].map((e) => e.kinds.join(" · ").length));
    const hSpacing = Math.max(MIN_H_SPACING, NODE_WIDTH + longestLabel * LABEL_CHAR_PX + 40);
    const positions = layoutNodes(safeGraph.nodes, hSpacing);
    const posMap = new Map(positions.map((p) => [p.id, p]));

    const rfNodes: Node[] = safeGraph.nodes.map((n) => {
      const pos = posMap.get(n.id) ?? { x: 0, y: 0 };
      return {
        id: n.id,
        type: "default",
        position: { x: pos.x, y: pos.y },
        data: {
          label: (
            <div className="flex h-full min-w-0 flex-col justify-center gap-1 font-mono leading-tight">
              <div className="truncate text-[13px] font-bold text-on-surface">
                {n.pod ? `${n.pod} / ` : ""}{n.label}
              </div>
              <RuntimeBadge runtime={n.runtime} size="xs" compact variant="inline" />
            </div>
          ),
        },
        style: {
          backgroundColor: "hsl(var(--surface-container-lowest))",
          border: "1px solid hsl(var(--outline))",
          color: "hsl(var(--on-surface))",
          fontSize: 12,
          fontFamily: "monospace",
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        },
      };
    });

    const rfEdges: Edge[] = [...byPair.values()].map((e, i) => ({
      id: `e-${i}`,
      source: e.source,
      target: e.target,
      label: e.kinds.join(" · "),
      labelStyle: { fontSize: 12, fontFamily: "monospace", fill: "hsl(var(--on-surface))" },
      labelBgStyle: { fill: "hsl(var(--surface-container-lowest))", stroke: "hsl(var(--outline-variant))" },
      labelBgPadding: [6, 3] as [number, number],
      style: { strokeDasharray: "4 4", stroke: "hsl(var(--outline))" },
    }));

    const rows = new Set(positions.map((pos) => pos.y)).size;
    // Taller canvas for many rows, so fitView does not shrink the text away.
    const height = Math.min(760, Math.max(400, rows * 120 + 80));
    return { nodes: rfNodes, edges: rfEdges, height };
  }, [safeGraph]);

  return (
    <div data-testid={testId ?? "spec-topology-preview"} className="w-full bg-background border border-outline-variant" style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        colorMode={resolved}
        fitView
        fitViewOptions={{ padding: 0.08, maxZoom: 1.1 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={0.5} color="hsl(var(--outline-variant))" />
        <Controls position="top-right" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
