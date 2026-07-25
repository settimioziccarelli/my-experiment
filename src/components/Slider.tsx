'use client';
import React from 'react';

interface SliderProps {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function Slider({ label, min, max, value, onChange, disabled }: SliderProps) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <label className="text-sm text-gray-400">{label}</label>
        <span className="text-sm text-white font-bold">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#4CAF50]"
      />
    </div>
  );
}