'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState('');
  const [responses, setResponses] = useState<any[]>([]);

  const handleLogin = () => {
    if (pass === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) setAuthed(true);
    else alert('Password errata');
  };

  const fetchData = async () => {
    const { data } = await supabase.from('responses').select('*');
    if (data) setResponses(data);
  };

  useEffect(() => { if (authed) fetchData(); }, [authed]);

  const exportCSV = () => {
    if (responses.length === 0) return;
    const headers = Object.keys(responses[0]);
    const csv = [headers.join(','), ...responses.map((row: any) => headers.map(h => JSON.stringify(row[h])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'responses.csv'; a.click();
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-[#1e2227] p-8 rounded-lg shadow-lg w-full max-w-sm">
          <h1 className="text-2xl mb-4 text-center">Admin Login</h1>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} className="w-full p-2 mb-4 bg-gray-700 rounded text-white border border-gray-600" placeholder="Password" />
          <button onClick={handleLogin} className="w-full p-2 bg-[#4CAF50] rounded font-bold">Login</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-2xl">Responses ({responses.length})</h1>
        <button onClick={exportCSV} className="px-4 py-2 bg-blue-500 rounded font-bold">Export CSV</button>
      </div>
      <div className="overflow-x-auto bg-[#1e2227] rounded-lg">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-800 text-gray-400">
            <tr>
              <th className="p-2">UUID</th><th className="p-2">Trial</th><th className="p-2">Adverb</th>
              <th className="p-2">Emotion</th><th className="p-2">Motivation</th><th className="p-2">Berkeley</th>
              <th className="p-2">Img</th><th className="p-2">Conf</th>
            </tr>
          </thead>
          <tbody>
            {responses.map((r: any, i: number) => (
              <tr key={i} className="border-b border-gray-700">
                <td className="p-2 text-xs text-gray-500">{r.participant_uuid.substring(0, 8)}...</td>
                <td className="p-2">{r.trial_number}</td><td className="p-2">{r.adverb}</td>
                <td className="p-2">{r.emotion_x}, {r.emotion_y}</td><td className="p-2">{r.motivation_x}, {r.control_y}</td>
                <td className="p-2">{r.berkeley_x}, {r.berkeley_y}</td><td className="p-2">{r.imagination}</td><td className="p-2">{r.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}