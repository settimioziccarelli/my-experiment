// src/components/EmotionSelector.tsx
'use client';
import React from 'react';

const EMOTIONS = [
  "Ammirazione", "Adorazione", "Apprezzamento estetico", "Divertimento", "Rabbia", "Ansia",
  "Noia", "Calma", "Confusione", "Brama", "Disgusto", "Dolore empatico", "Incanto",
  "Eccitazione", "Paura", "Orrore", "Interesse", "Gioia", "Nostalgia", "Sollievo",
  "Romanticismo", "Tristezza", "Soddisfazione", "Desiderio sessuale", "Sorpresa", "Meraviglia", "Imbarazzo"
];

interface EmotionSelectorProps {
  value: string;
  onChange: (emotion: string) => void;
  disabled?: boolean;
}

export default function EmotionSelector({ value, onChange, disabled }: EmotionSelectorProps) {
  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-[#1e2227] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 p-4 relative shadow-sm">
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 text-center">Seleziona l'emozione più vicina</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 disabled:opacity-50"
      >
        <option value="">Seleziona...</option>
        {EMOTIONS.map(emo => (
          <option key={emo} value={emo}>{emo}</option>
        ))}
      </select>
    </div>
  );
}