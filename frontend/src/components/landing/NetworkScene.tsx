'use client';

import { useEffect, useRef } from 'react';

type NetworkSceneProps = {
  phase?: number;
};

const nodes = [
  { label: 'ACCOUNT', x: 0.18, y: 0.24, color: '#4f8cff', size: 11 },
  { label: 'PAYMENT', x: 0.5, y: 0.43, color: '#e05b52', size: 15 },
  { label: 'DEVICE', x: 0.8, y: 0.24, color: '#e2a33a', size: 10 },
  { label: 'IP', x: 0.2, y: 0.74, color: '#4f8cff', size: 9 },
  { label: 'INFRASTRUCTURE', x: 0.79, y: 0.74, color: '#5ab48a', size: 12 },
];

export function NetworkScene({ phase = 1 }: NetworkSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>();
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const bounds = canvas.getBoundingClientRect();
      canvas.width = bounds.width * ratio;
      canvas.height = bounds.height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const draw = (time: number) => {
      const { width, height } = canvas.getBoundingClientRect();
      const tiltX = pointerRef.current.x * 8;
      const tiltY = pointerRef.current.y * 6;
      context.clearRect(0, 0, width, height);
      context.strokeStyle = 'rgba(79,140,255,.13)';
      context.lineWidth = 1;
      for (let x = -height; x < width + height; x += 28) {
        context.beginPath(); context.moveTo(x + tiltX, 0); context.lineTo(x - height + tiltX, height); context.stroke();
      }
      for (let y = 0; y < height; y += 28) {
        context.beginPath(); context.moveTo(0, y + tiltY); context.lineTo(width, y - 42 + tiltY); context.stroke();
      }
      const points = nodes.map((node) => ({ x: width * node.x + tiltX, y: height * node.y + tiltY }));
      const connections = [[0, 1], [1, 2], [0, 3], [1, 3], [1, 4], [2, 4]];
      connections.forEach(([from, to], index) => {
        const a = points[from]; const b = points[to];
        context.strokeStyle = index === 3 && phase >= 2 ? 'rgba(224,91,82,.8)' : 'rgba(79,140,255,.3)';
        context.setLineDash(index === 3 && phase >= 2 ? [4, 5] : []);
        context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
      });
      context.setLineDash([]);
      points.forEach((point, index) => {
        const node = nodes[index];
        const pulse = index === 1 ? Math.sin(time / 420) * 4 : 0;
        context.beginPath(); context.arc(point.x, point.y, node.size + pulse + 9, 0, Math.PI * 2);
        context.fillStyle = `${node.color}18`; context.fill();
        context.beginPath(); context.arc(point.x, point.y, node.size + pulse / 2, 0, Math.PI * 2);
        context.fillStyle = node.color; context.fill();
        context.fillStyle = 'rgba(226,232,240,.7)'; context.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
        context.fillText(node.label, point.x - context.measureText(node.label).width / 2, point.y + 29);
      });
      frameRef.current = requestAnimationFrame(draw);
    };
    resize(); draw(0);
    window.addEventListener('resize', resize);
    const handlePointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointerRef.current = { x: (event.clientX - bounds.left - bounds.width / 2) / bounds.width, y: (event.clientY - bounds.top - bounds.height / 2) / bounds.height };
    };
    canvas.addEventListener('pointermove', handlePointer);
    canvas.addEventListener('pointerleave', () => { pointerRef.current = { x: 0, y: 0 }; });
    return () => { cancelAnimationFrame(frameRef.current ?? 0); window.removeEventListener('resize', resize); canvas.removeEventListener('pointermove', handlePointer); };
  }, [phase]);

  return <canvas ref={canvasRef} aria-label="Interactive relationship graph visualization" role="img" className="absolute inset-0 size-full" />;
}
