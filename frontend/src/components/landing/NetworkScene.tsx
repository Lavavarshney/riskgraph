'use client';

import { useEffect, useRef } from 'react';

type NetworkSceneProps = {
  phase?: number;
};

const nodes = [
  { x: 0.18, y: 0.42, color: '#4f8cff', size: 8 },
  { x: 0.5, y: 0.5, color: '#e05b52', size: 14 },
  { x: 0.82, y: 0.42, color: '#e2a33a', size: 8 },
  { x: 0.5, y: 0.82, color: '#4f8cff', size: 7 },
  { x: 0.82, y: 0.72, color: '#5ab48a', size: 9 },
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
      const parallaxX = pointerRef.current.x * 8;
      const parallaxY = pointerRef.current.y * 6;
      context.clearRect(0, 0, width, height);

      context.strokeStyle = 'rgba(79,140,255,.08)';
      context.lineWidth = 1;
      for (let x = -height; x < width + height; x += 32) {
        context.beginPath();
        context.moveTo(x + parallaxX, 0);
        context.lineTo(x - height + parallaxX, height);
        context.stroke();
      }

      const points = nodes.map((node, index) => ({
        x: width * node.x + parallaxX * (0.5 + index * 0.08),
        y: height * node.y + parallaxY * (0.5 + index * 0.08),
      }));
      const connections = [[0, 1], [1, 2], [1, 3], [1, 4]];
      connections.forEach(([from, to], index) => {
        const a = points[from];
        const b = points[to];
        const active = (index === 1 && phase >= 2) || (index === 3 && phase >= 3);
        context.strokeStyle = active ? 'rgba(224,91,82,.82)' : 'rgba(79,140,255,.38)';
        context.lineWidth = active ? 1.5 : 1;
        context.setLineDash(active ? [4, 6] : []);
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
        if (active) {
          const progress = (time / 2400 + index * 0.22) % 1;
          const pulseX = a.x + (b.x - a.x) * progress;
          const pulseY = a.y + (b.y - a.y) * progress;
          context.fillStyle = '#e05b52';
          context.beginPath();
          context.arc(pulseX, pulseY, 2.5, 0, Math.PI * 2);
          context.fill();
        }
      });
      context.setLineDash([]);

      points.forEach((point, index) => {
        const node = nodes[index];
        const pulse = index === 1 ? Math.sin(time / 900) * 1.5 : 0;
        context.fillStyle = `${node.color}18`;
        context.beginPath();
        context.arc(point.x, point.y, node.size + 10 + pulse, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = node.color;
        context.beginPath();
        context.arc(point.x, point.y, node.size + pulse, 0, Math.PI * 2);
        context.fill();
      });

      frameRef.current = requestAnimationFrame(draw);
    };

    resize();
    frameRef.current = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    const handlePointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: (event.clientX - bounds.left - bounds.width / 2) / bounds.width,
        y: (event.clientY - bounds.top - bounds.height / 2) / bounds.height,
      };
    };
    const resetPointer = () => { pointerRef.current = { x: 0, y: 0 }; };
    canvas.addEventListener('pointermove', handlePointer);
    canvas.addEventListener('pointerleave', resetPointer);
    return () => {
      cancelAnimationFrame(frameRef.current ?? 0);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', handlePointer);
      canvas.removeEventListener('pointerleave', resetPointer);
    };
  }, [phase]);

  return <canvas ref={canvasRef} aria-label="Relationship graph showing a payment connected to an account, device, IP, and infrastructure" role="img" className="absolute inset-0 size-full" />;
}

export const networkLabels = [
  { label: 'ACCOUNT', x: '12%', y: '42%' },
  { label: 'PAYMENT', x: '50%', y: '50%' },
  { label: 'DEVICE', x: '86%', y: '42%' },
  { label: 'IP', x: '50%', y: '88%' },
  { label: 'INFRASTRUCTURE', x: '86%', y: '72%' },
];

export const networkPoints = nodes;
