'use client';
import React from 'react';

interface SliderProps {
  label: string; 
  min: number; 
  max: number; 
  value: number;
  onChange: (value: number) => void; 
  disabled?: boolean;
  minLabel?: string;
  maxLabel?: string;
}

export default function Slider({ label, min, max, value, onChange, disabled, minLabel, maxLabel }: SliderProps) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <label className="text-sm text-gray-600 dark:text-gray-400">{label}</label>
        <span className="text-sm text-gray-900 dark:text-white font-bold">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#4CAF50]"
      />
      {(minLabel || maxLabel) && (
        <div className="flex justify-between mt-1 text-[10px] text-gray-500 dark:text-gray-500">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}