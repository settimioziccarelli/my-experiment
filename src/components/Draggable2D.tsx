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
    const updateSize = () => { if (containerRef.current) setSize(containerRef.current.offsetWidth); };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const center = size / 2;
  const scale = size / 200;
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
          <Stage width={size} height={size}>
            <Layer>
              <Line points={[0, center, size, center]} stroke="#444" strokeWidth={1} />
              <Line points={[center, 0, center, size]} stroke="#444" strokeWidth={1} />
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