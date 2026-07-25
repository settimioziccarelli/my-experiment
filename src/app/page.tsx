'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ITALIAN_ADVERBS, BERKELEY_27 } from '../lib/constants';
import Draggable2D from '../components/Draggable2D';
import EmotionSelector from '../components/EmotionSelector';
import Slider from '../components/Slider';
import toast from 'react-hot-toast';

interface ExpData { valence: number; intensity: number; motivation: number; control: number; berk_x: number; berk_y: number; berk_emotion: string; imagination: number; confidence: number; }
const initialData: ExpData = { valence: 0, intensity: 0, motivation: 0, control: 0, berk_x: 0, berk_y: 0, berk_emotion: "", imagination: 0, confidence: 50 };

export default function Home() {
  const [uuid, setUuid] = useState<string | null>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [trialIdx, setTrialIdx] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'simulation' | 'experiment' | 'debrief'>('loading');
  const [simStage, setSimStage] = useState(0);
  const [data, setData] = useState<ExpData>(initialData);

  useEffect(() => {
    const url = new URL(window.location.href);
    let id = url.searchParams.get('uuid');
    if (!id) { id = crypto.randomUUID(); url.searchParams.set('uuid', id); window.history.replaceState({}, '', url); }
    setUuid(id); loadParticipant(id);
  }, []);

  const loadParticipant = async (id: string) => {
    const { data: p } = await supabase.from('participants').select('*').eq('id', id).single();
    if (p) {
      setParticipant(p);
      const { data: resp } = await supabase.from('responses').select('trial_number').eq('participant_uuid', id).order('trial_number', { ascending: false }).limit(1);
      if (resp && resp.length > 0) setTrialIdx(resp[0].trial_number + 1);
      setPhase(localStorage.getItem(`sim_${id}`) ? 'experiment' : 'simulation');
    } else {
      const adverbs = [...ITALIAN_ADVERBS].sort(() => Math.random() - 0.5);
      adverbs.splice(3, 0, 'ATTENTION_CHECK_1');
      const { data: newP } = await supabase.from('participants').insert({ id, randomized_adverbs: adverbs }).select().single();
      setParticipant(newP); setPhase('simulation');
    }
  };

  useEffect(() => {
    if (phase === 'simulation' && (simStage === 1 || simStage === 2)) {
      const target = simStage === 1 
        ? { valence: -80, intensity: 80, motivation: 80, control: -80, berk_x: -70, berk_y: 80, berk_emotion: "Rabbia", imagination: 80, confidence: 90 } 
        : { valence: 80, intensity: -80, motivation: 0, control: 80, berk_x: 50, berk_y: -70, berk_emotion: "Calma", imagination: 80, confidence: 90 };
      
      const interval = setInterval(() => {
        setData(prev => {
          const next = { ...prev }; let done = true;
          (Object.keys(target) as (keyof typeof target)[]).forEach(k => {
            if (k === 'berk_emotion') {
              next[k] = target[k] as any;
            } else if (Math.abs((next[k] as number) - (target[k] as number)) > 1) {
              next[k] = Math.round((next[k] as number) + ((target[k] as number) - (next[k] as number)) * 0.2) as any;
              done = false;
            } else {
              next[k] = target[k] as any;
            }
          });
          if (done) clearInterval(interval); return next;
        });
      }, 30);
      return () => clearInterval(interval);
    }
  }, [phase, simStage]);

  useEffect(() => {
    if (phase === 'experiment' && uuid && participant) {
      const fetchTrial = async () => {
        const { data: resp } = await supabase.from('responses').select('*').eq('participant_uuid', uuid).eq('trial_number', trialIdx).single();
        if (resp) {
          let nearestEmo = "";
          if (resp.berkeley_x !== null && resp.berkeley_y !== null) {
            let minDist = Infinity; // FIXED: Replaced float('inf') with Infinity
            BERKELEY_27.forEach(emo => {
              const dist = Math.sqrt(Math.pow(resp.berkeley_x - emo.x, 2) + Math.pow(resp.berkeley_y - emo.y, 2));
              if (dist < minDist) { minDist = dist; nearestEmo = emo.label; }
            });
          }
          setData({ valence: resp.emotion_x, intensity: resp.emotion_y, motivation: resp.motivation_x, control: resp.control_y, berk_x: resp.berkeley_x, berk_y: resp.berkeley_y, berk_emotion: nearestEmo, imagination: resp.imagination, confidence: resp.confidence });
        } else {
          setData(initialData);
        }
      }; fetchTrial();
    }
  }, [trialIdx, phase, uuid, participant]);

  const saveData = useCallback(async (d: ExpData) => {
    if (phase !== 'experiment' || !uuid || !participant) return;
    const currentAdverb = participant.randomized_adverbs[trialIdx];
    if (!currentAdverb) return;
    
    await supabase.from('responses').upsert({ 
      participant_uuid: uuid, 
      trial_number: trialIdx, 
      adverb: currentAdverb, 
      emotion_x: d.valence, 
      emotion_y: d.intensity, 
      motivation_x: d.motivation, 
      control_y: d.control, 
      berkeley_x: d.berk_x, 
      berkeley_y: d.berk_y, 
      imagination: d.imagination, 
      confidence: d.confidence 
    }, { onConflict: 'participant_uuid,trial_number' });
  }, [phase, uuid, participant, trialIdx]);

  useEffect(() => { if (phase === 'experiment') { const timer = setTimeout(() => saveData(data), 500); return () => clearTimeout(timer); } }, [data, phase, saveData]);

  const handleEmotionChange = (emo: string) => {
    const coords = BERKELEY_27.find(e => e.label === emo);
    if (coords) {
      setData(d => ({ ...d, berk_emotion: emo, berk_x: coords.x, berk_y: coords.y }));
    }
  };

  if (phase === 'loading') return <div className="min-h-screen flex items-center justify-center">Caricamento...</div>;

  if (phase === 'simulation') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="fixed top-4 right-4 z-50">
          <button onClick={() => toast.success('Hai salvato i tuoi progressi')} className="bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-700 text-2xl">💾</button>
        </div>
        {simStage === 0 && (
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-6">Questa è una SIMULAZIONE di alcune valutazioni che andrai a fare, clicca per farla partire</h1>
            <button onClick={() => setSimStage(1)} className="px-8 py-4 bg-[#4CAF50] text-white font-bold rounded-lg text-lg">Start Simulation</button>
          </div>
        )}
        {(simStage === 1 || simStage === 2) && (
          <div className="w-full max-w-5xl">
            <h1 className="text-4xl text-center font-bold mb-8 text-white">{simStage === 1 ? 'Furiosamente' : 'Placidamente'}</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <h2 className="text-center text-gray-400 text-sm mb-2">Spazio Affettivo</h2>
                <Draggable2D 
                  x={data.valence} y={data.intensity} 
                  onChange={(x, y) => setData(d => ({...d, valence:x, intensity:y}))}
                  cornerLabels={{ bl: "Valenza negativa / Intensità bassa", br: "Valenza positiva", tl: "Intensità alta", tr: "Valenza positiva / Intensità alta" }}
                />
              </div>
              <div>
                <h2 className="text-center text-gray-400 text-sm mb-2">Spazio Motivazionale</h2>
                <Draggable2D 
                  x={data.motivation} y={data.control} 
                  onChange={(x, y) => setData(d => ({...d, motivation:x, control:y}))}
                  cornerLabels={{ bl: "Evitamento / Controllo basso", br: "Approccio", tl: "Controllo alto", tr: "Approccio / Controllo alto" }}
                />
              </div>
              <div className="aspect-square">
                <h2 className="text-center text-gray-400 text-sm mb-2">Similarità Emotiva</h2>
                <EmotionSelector value={data.berk_emotion} onChange={handleEmotionChange} disabled />
              </div>
            </div>
            <div className="space-y-6 mb-8 max-w-md mx-auto">
              <Slider label="Facilità di immaginazione dell'azione" min={-100} max={100} value={data.imagination} onChange={(v) => setData(d => ({...d, imagination:v}))} disabled />
              <Slider label="Confidenza" min={0} max={100} value={data.confidence} onChange={(v) => setData(d => ({...d, confidence:v}))} disabled />
            </div>
            {simStage === 1 && (<div className="text-center"><p className="text-gray-300 mb-4 max-w-lg mx-auto">L'azione spinge in avanti (Alta Motivazione) senza controllo trattenuto (Basso Controllo) sotto un affetto negativo intenso.</p><button onClick={() => setSimStage(2)} className="px-6 py-3 bg-gray-700 text-white rounded-lg">Premi qui per vederne un'altra ➡️</button></div>)}
            {simStage === 2 && (<div className="text-center"><p className="text-gray-300 mb-4 max-w-lg mx-auto">Esecuzione calma e controllata (Alto Controllo) senza urgenza in uno stato positivo e rilassato.</p><button onClick={() => { if(uuid) localStorage.setItem(`sim_${uuid}`, 'true'); setPhase('experiment'); }} className="px-6 py-3 bg-[#4CAF50] text-white rounded-lg font-bold">Inizia l'esperimento reale 🚀</button></div>)}
          </div>
        )}
      </div>
    );
  }

  if (phase === 'experiment' && participant) {
    if (trialIdx >= participant.randomized_adverbs.length) {
      return (<div className="min-h-screen flex flex-col items-center justify-center"><h1 className="text-4xl mb-4">Grazie per la partecipazione! 🌟</h1><p className="text-gray-400">ID: {uuid}</p></div>);
    }
    const currentAdverb = participant.randomized_adverbs[trialIdx];
    const isAttention = currentAdverb === 'ATTENTION_CHECK_1';

    return (
      <div className="min-h-screen p-4 pb-20">
        <div className="fixed top-4 right-4 z-50">
          <button onClick={() => toast.success('Hai salvato i tuoi progressi')} className="bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-700 text-2xl">💾</button>
        </div>
        <div className="max-w-5xl mx-auto">
          <div className="w-full bg-gray-700 rounded-full h-2.5 mb-6 mt-8">
            <div className="bg-[#4CAF50] h-2.5 rounded-full transition-all duration-300" style={{ width: `${(trialIdx / participant.randomized_adverbs.length) * 100}%` }}></div>
          </div>
          <h1 className={`text-3xl md:text-4xl text-center font-bold mb-8 ${isAttention ? 'text-yellow-400 text-xl' : 'text-white'}`}>{isAttention ? 'ATTENZIONE: Trascina il punto nell\'angolo in alto a destra (100, 100) su tutte le mappe, seleziona "Sorpresa" e imposta la confidenza a 0' : currentAdverb.charAt(0).toUpperCase() + currentAdverb.slice(1)}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div>
              <h2 className="text-center text-gray-400 text-sm mb-2">Spazio Affettivo</h2>
              <Draggable2D 
                x={data.valence} y={data.intensity} 
                onChange={(x, y) => setData(d => ({...d, valence:x, intensity:y}))}
                cornerLabels={{ bl: "Valenza negativa / Intensità bassa", br: "Valenza positiva", tl: "Intensità alta", tr: "Valenza positiva / Intensità alta" }}
              />
            </div>
            <div>
              <h2 className="text-center text-gray-400 text-sm mb-2">Spazio Motivazionale</h2>
              <Draggable2D 
                x={data.motivation} y={data.control} 
                onChange={(x, y) => setData(d => ({...d, motivation:x, control:y}))}
                cornerLabels={{ bl: "Evitamento / Controllo basso", br: "Approccio", tl: "Controllo alto", tr: "Approccio / Controllo alto" }}
              />
            </div>
            <div className="aspect-square">
              <h2 className="text-center text-gray-400 text-sm mb-2">Similarità Emotiva</h2>
              <EmotionSelector value={data.berk_emotion} onChange={handleEmotionChange} />
            </div>
          </div>

          <div className="space-y-6 mb-8 max-w-md mx-auto">
            <Slider label="Facilità di immaginazione dell'azione" min={-100} max={100} value={data.imagination} onChange={(v) => setData(d => ({...d, imagination:v}))} />
            <Slider label="Confidenza" min={0} max={100} value={data.confidence} onChange={(v) => setData(d => ({...d, confidence:v}))} />
          </div>

          <div className="flex justify-between max-w-md mx-auto">
            <button onClick={() => setTrialIdx(i => Math.max(0, i - 1))} disabled={trialIdx === 0} className="px-6 py-3 bg-gray-700 rounded-lg disabled:opacity-50">⬅️ Indietro</button>
            <button onClick={() => setTrialIdx(i => i + 1)} className="px-6 py-3 bg-[#4CAF50] text-white font-bold rounded-lg">Avanti ➡️</button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}