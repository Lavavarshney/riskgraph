'use client';

import { useEffect, useRef } from 'react';

type NetworkSceneProps = { phase?: number };
type GraphNode = { id: string; label: string; x: number; y: number; color: string; size: number };

const nodes: GraphNode[] = [
  { id: 'payment-a', label: 'PAYMENT', x: 0.16, y: 0.27, color: '#4f8cff', size: 7 },
  { id: 'payment-b', label: 'PAYMENT', x: 0.16, y: 0.53, color: '#4f8cff', size: 7 },
  { id: 'payment-c', label: 'PAYMENT', x: 0.16, y: 0.79, color: '#4f8cff', size: 7 },
  { id: 'account', label: 'ACCOUNT', x: 0.48, y: 0.16, color: '#5ab48a', size: 8 },
  { id: 'device', label: 'DEVICE', x: 0.48, y: 0.53, color: '#e2a33a', size: 11 },
  { id: 'ip', label: 'IP', x: 0.76, y: 0.53, color: '#e2a33a', size: 9 },
  { id: 'infra', label: 'INFRASTRUCTURE', x: 0.76, y: 0.79, color: '#e05b52', size: 10 },
];

const edges: [number, number, number][] = [[0, 3, 1], [1, 4, 2], [2, 4, 3], [3, 4, 2], [4, 5, 3], [5, 6, 4]];

export function NetworkScene({ phase = 1 }: NetworkSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>();
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const bounds = canvas.getBoundingClientRect();
      canvas.width = bounds.width * ratio;
      canvas.height = bounds.height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const draw = (time: number) => {
      const { width, height } = canvas.getBoundingClientRect();
      const px = pointerRef.current.x * 8;
      const py = pointerRef.current.y * 6;
      context.clearRect(0, 0, width, height);
      context.strokeStyle = 'rgba(79,140,255,.06)';
      context.lineWidth = 1;
      for (let x = -height; x < width + height; x += 36) {
        context.beginPath(); context.moveTo(x + px, 0); context.lineTo(x - height + px, height); context.stroke();
      }
      const points = nodes.map((node, index) => ({ x: width * node.x + px * (0.45 + index * 0.04), y: height * node.y + py * (0.45 + index * 0.04) }));
      edges.forEach(([from, to, revealAt], index) => {
        if (phase < revealAt) return;
        const a = points[from]; const b = points[to];
        const risk = phase >= 4 && revealAt >= 2;
        context.strokeStyle = risk ? 'rgba(224,91,82,.72)' : 'rgba(79,140,255,.42)';
        context.lineWidth = risk ? 1.5 : 1;
        context.setLineDash(risk ? [3, 6] : []);
        context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
        if (phase >= 2 && index > 0) {
          const progress = (time / 2600 + index * 0.18) % 1;
          context.fillStyle = risk ? '#e05b52' : '#4f8cff';
          context.beginPath(); context.arc(a.x + (b.x - a.x) * progress, a.y + (b.y - a.y) * progress, 2, 0, Math.PI * 2); context.fill();
        }
      });
      context.setLineDash([]);
      points.forEach((point, index) => {
        const node = nodes[index];
        const emphasized = phase >= 4 && ['device', 'ip', 'infra'].includes(node.id);
        const pulse = emphasized ? Math.sin(time / 500) * 2 : 0;
        context.fillStyle = `${node.color}18`;
        context.beginPath(); context.arc(point.x, point.y, node.size + 10 + pulse, 0, Math.PI * 2); context.fill();
        context.fillStyle = node.color;
        context.beginPath(); context.arc(point.x, point.y, node.size + pulse, 0, Math.PI * 2); context.fill();
      });
      frameRef.current = requestAnimationFrame(draw);
    };
    resize(); frameRef.current = requestAnimationFrame(draw); window.addEventListener('resize', resize);
    const handlePointer = (event: PointerEvent) => { const bounds = canvas.getBoundingClientRect(); pointerRef.current = { x: (event.clientX - bounds.left - bounds.width / 2) / bounds.width, y: (event.clientY - bounds.top - bounds.height / 2) / bounds.height }; };
    const resetPointer = () => { pointerRef.current = { x: 0, y: 0 }; };
    canvas.addEventListener('pointermove', handlePointer); canvas.addEventListener('pointerleave', resetPointer);
    return () => { cancelAnimationFrame(frameRef.current ?? 0); window.removeEventListener('resize', resize); canvas.removeEventListener('pointermove', handlePointer); canvas.removeEventListener('pointerleave', resetPointer); };
  }, [phase]);

  return <canvas ref={canvasRef} aria-label="Multiple normal payments converging on a shared device, IP, and infrastructure network" role="img" className="absolute inset-0 size-full" />;
}

export const networkLabels = nodes.map(({ label, x, y }) => ({ label, x: `${x * 100}%`, y: `${y * 100}%` }));
export const networkPoints = nodes;
