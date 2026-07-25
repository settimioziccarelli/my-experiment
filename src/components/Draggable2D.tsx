'use client';
import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Circle, Line } from 'react-konva';

interface Draggable2DProps {
  x: number; y: number;
  onChange: (x: number, y: number) => void;
  cornerLabels?: { bl?: string; br?: string; tl?: string; tr?: string };
}

export default function Draggable2D({ x, y, onChange, cornerLabels }: Draggable2DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(300);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        if (w > 0) setSize(w);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    const timer = setTimeout(updateSize, 50); // Delay to ensure layout is ready
    return () => { window.removeEventListener('resize', updateSize); clearTimeout(timer); };
  }, []);

  const safeSize = Math.max(size, 100); // Never let size drop below 100px to prevent Konva crash
  const center = safeSize / 2;
  const scale = safeSize / 200;
  const dotX = center + (x * scale);
  const dotY = center - (y * scale);

  const handleDragMove = (e: any) => {
    let newX = Math.round((e.target.x() - center) / scale);
    let newY = Math.round(-(e.target.y() - center) / scale);
    newX = Math.max(-100, Math.min(100, newX));
    newY = Math.max(-100, Math.min(100, newY));
    e.target.x(center + newX * scale);
    e.target.y(center - newY * scale);
    onChange(newX, newY);
  };

  return (
    <div className="w-full" ref={containerRef}>
      <div className="relative w-full aspect-square bg-[#1e2227] rounded-lg overflow-hidden border border-gray-700 touch-none select-none">
        {isClient && (
          <Stage width={safeSize} height={safeSize}>
            <Layer>
              <Line points={[0, center, safeSize, center]} stroke="#444" strokeWidth={1} />
              <Line points={[center, 0, center, safeSize]} stroke="#444" strokeWidth={1} />
              <Circle x={dotX} y={dotY} radius={15} fill="#4CAF50" stroke="#ffffff" strokeWidth={2} draggable onDragMove={handleDragMove} onDragEnd={handleDragMove} />
            </Layer>
          </Stage>
        )}
        
        {/* Corner Labels */}
        <div className="absolute top-1 left-2 text-[9px] text-gray-400 font-medium pointer-events-none">{cornerLabels?.tl || ''}</div>
        <div className="absolute top-1 right-2 text-[9px] text-gray-400 font-medium pointer-events-none">{cornerLabels?.tr || ''}</div>
        <div className="absolute bottom-1 left-2 text-[9px] text-gray-400 font-medium pointer-events-none">{cornerLabels?.bl || ''}</div>
        <div className="absolute bottom-1 right-2 text-[9px] text-gray-400 font-medium pointer-events-none">{cornerLabels?.br || ''}</div>
      </div>
    </div>
  );
}