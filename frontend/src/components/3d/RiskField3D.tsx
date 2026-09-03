'use client';

import React, { useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';

interface Node3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  isHighRisk: boolean;
}

export const RiskField3D: React.FC<{ height?: string; className?: string }> = ({ height = '180px', className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let heightPx = (canvas.height = canvas.parentElement?.clientHeight || 180);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      heightPx = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Initialize 3D Node Field
    const numNodes = 28;
    const nodes: Node3D[] = [];
    for (let i = 0; i < numNodes; i++) {
      nodes.push({
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 200,
        z: (Math.random() - 0.5) * 400,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.4,
        radius: 2.5 + Math.random() * 2,
        isHighRisk: i < 5,
      });
    }

    let angleY = 0;
    const isDark = theme === 'dark';

    const render = () => {
      ctx.clearRect(0, 0, width, heightPx);
      angleY += 0.003;

      const fov = 300;
      const cx = width / 2;
      const cy = heightPx / 2;

      // Project 3D nodes
      const projectedNodes = nodes.map((node) => {
        // Move node
        node.x += node.vx;
        node.y += node.vy;
        node.z += node.vz;

        if (Math.abs(node.x) > 220) node.vx *= -1;
        if (Math.abs(node.y) > 120) node.vy *= -1;
        if (Math.abs(node.z) > 220) node.vz *= -1;

        // Rotate around Y axis
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);

        const rx = node.x * cosY - node.z * sinY;
        const rz = node.z * cosY + node.x * sinY + 350;

        const scale = fov / (fov + rz);
        const px = cx + rx * scale;
        const py = cy + node.y * scale;

        return { px, py, scale, rz, isHighRisk: node.isHighRisk, radius: node.radius };
      });

      // Draw Edges between nearby projected nodes
      for (let i = 0; i < projectedNodes.length; i++) {
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const p1 = projectedNodes[i];
          const p2 = projectedNodes[j];
          const dx = p1.px - p2.px;
          const dy = p1.py - p2.py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 85) {
            const alpha = (1 - dist / 85) * 0.25;
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.strokeStyle = p1.isHighRisk || p2.isHighRisk
              ? `rgba(239, 68, 68, ${alpha * 1.5})`
              : isDark
              ? `rgba(59, 130, 246, ${alpha})`
              : `rgba(37, 99, 235, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Draw Nodes
      projectedNodes.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.px, p.py, p.radius * p.scale, 0, Math.PI * 2);
        ctx.fillStyle = p.isHighRisk
          ? '#EF4444'
          : isDark
          ? '#3B82F6'
          : '#2563EB';
        ctx.globalAlpha = Math.min(1, Math.max(0.2, p.scale));
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  return (
    <div className={`relative overflow-hidden rounded-xl bg-surface border border-subtle ${className}`} style={{ height }}>
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute top-3 left-3 pointer-events-none text-left">
        <span className="text-[10px] font-mono uppercase font-bold text-muted block">3D RISK FIELD OPERATIONS</span>
        <span className="text-xs font-semibold text-primary">Relational Topology Stream</span>
      </div>
    </div>
  );
};
