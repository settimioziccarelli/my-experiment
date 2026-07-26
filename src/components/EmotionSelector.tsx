'use client';
import React, { useState, useMemo } from 'react';

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
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    return EMOTIONS.filter(e => e.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-[#1e2227] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 p-4 relative shadow-sm">
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 text-center">Seleziona l'emozione più vicina</p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 text-left flex justify-between items-center disabled:opacity-50"
      >
        <span>{value || 'Seleziona...'}</span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>
      
      {isOpen && !disabled && (
        <div className="absolute left-4 right-4 top-20 bottom-4 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden flex flex-col z-50">
          <input
            type="text"
            placeholder="Cerca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-2 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600"
            autoFocus
          />
          <ul className="overflow-y-auto flex-1">
            {filtered.map(emo => (
              <li
                key={emo}
                onClick={() => {
                  onChange(emo);
                  setIsOpen(false);
                  setSearch('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-900 dark:text-white text-sm"
              >
                {emo}
              </li>
            ))}
            {filtered.length === 0 && <li className="p-2 text-gray-500 text-sm">Nessuna emozione trovata</li>}
          </ul>
        </div>
      )}
    </div>
  );
}