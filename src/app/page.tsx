// src/app/page.tsx
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
  const [phase, setPhase] = useState<'loading' | 'welcome' | 'demographics' | 'simulation' | 'experiment' | 'debrief' | 'error'>('loading');
  const [simStage, setSimStage] = useState(0);
  const [data, setData] = useState<ExpData>(initialData);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [saved, setSaved] = useState(false);
  
  const [age, setAge] = useState(30);
  const [gender, setGender] = useState('');
  const [education, setEducation] = useState('');
  const [touched, setTouched] = useState({ aff: false, mot: false, img: false, con: false, emo: false });

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

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
      
      const simSeen = p.simulation_completed || localStorage.getItem(`sim_${id}`) === 'true';
      setPhase(simSeen ? 'experiment' : 'simulation');
    } else {
      setPhase('welcome');
    }
  };

  const handleConsent = () => setPhase('demographics');

  const handleStartExperiment = async () => {
    if (!uuid) return;
    const adverbs = [...ITALIAN_ADVERBS].sort(() => Math.random() - 0.5);
    adverbs.splice(3, 0, 'ATTENTION_CHECK_1');
    const { data: newP, error } = await supabase
      .from('participants')
      .insert({ id: uuid, randomized_adverbs: adverbs, age, gender, education })
      .select().single();
      
    if (error) {
      setErrorMessage(`DB Error: ${error.message}`);
      setPhase('error');
    } else {
      setParticipant(newP); 
      setPhase('simulation');
    }
  };

  const handleSimulationComplete = async () => {
    if (uuid) {
      localStorage.setItem(`sim_${uuid}`, 'true');
      await supabase.from('participants').update({ simulation_completed: true }).eq('id', uuid);
    }
    setPhase('experiment');
  };

  const handleSaveClick = () => {
    setSaved(true);
    toast.success('Hai salvato i tuoi progressi');
    setTimeout(() => setSaved(false), 2000);
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
      setTouched({ aff: false, mot: false, img: false, con: false, emo: false });
      const fetchTrial = async () => {
        const { data: resp } = await supabase.from('responses').select('*').eq('participant_uuid', uuid).eq('trial_number', trialIdx).single();
        if (resp) {
          let nearestEmo = "";
          if (resp.berkeley_x !== null && resp.berkeley_y !== null) {
            let minDist = Infinity;
            BERKELEY_27.forEach(emo => {
              const dist = Math.sqrt(Math.pow(resp.berkeley_x - emo.x, 2) + Math.pow(resp.berkeley_y - emo.y, 2));
              if (dist < minDist) { minDist = dist; nearestEmo = emo.label; }
            });
          }
          setData({ valence: resp.emotion_x, intensity: resp.emotion_y, motivation: resp.motivation_x, control: resp.control_y, berk_x: resp.berkeley_x, berk_y: resp.berkeley_y, berk_emotion: nearestEmo, imagination: resp.imagination, confidence: resp.confidence });
          if (resp.emotion_x !== null) setTouched(t => ({...t, aff: true, mot: true, img: true, con: true, emo: true }));
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
      participant_uuid: uuid, trial_number: trialIdx, adverb: currentAdverb, 
      emotion_x: d.valence, emotion_y: d.intensity, motivation_x: d.motivation, control_y: d.control, 
      berkeley_x: d.berk_x, berkeley_y: d.berk_y, imagination: d.imagination, confidence: d.confidence 
    }, { onConflict: 'participant_uuid,trial_number' });
  }, [phase, uuid, participant, trialIdx]);

  useEffect(() => { if (phase === 'experiment') { const timer = setTimeout(() => saveData(data), 500); return () => clearTimeout(timer); } }, [data, phase, saveData]);

  const handleEmotionChange = (emo: string) => {
    const coords = BERKELEY_27.find(e => e.label === emo);
    if (coords) {
      setData(d => ({ ...d, berk_emotion: emo, berk_x: coords.x, berk_y: coords.y }));
      setTouched(t => ({...t, emo: true}));
    }
  };

  useEffect(() => { if (typeof window !== 'undefined') window.scrollTo(0, 0); }, [trialIdx, phase, simStage]);

  if (phase === 'loading') return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0e1117] text-gray-900 dark:text-white">Caricamento...</div>;
  if (phase === 'error') return <div className="min-h-screen flex items-center justify-center text-red-500 p-4 text-center flex-col bg-gray-50 dark:bg-[#0e1117]"><h2 className="text-xl font-bold mb-4">Errore di connessione al database.</h2><p className="text-sm text-gray-400">{errorMessage}</p></div>;

  const ThemeToggle = () => (
    <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="fixed top-4 left-4 z-50 bg-gray-200 dark:bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-300 dark:border-gray-700 text-xl transition-transform active:scale-90 hover:bg-gray-300 dark:hover:bg-gray-700">
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );

  const SaveButton = () => (
    <button 
      onClick={handleSaveClick} 
      className={`bg-gray-200 dark:bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-300 dark:border-gray-700 text-xl transition-all duration-150 active:scale-90 hover:bg-gray-300 dark:hover:bg-gray-700 flex items-center justify-center gap-2 font-bold w-[130px] ${
        saved ? 'text-green-500' : 'text-gray-900 dark:text-white'
      }`}
    >
      {saved ? '✅ Salvato' : '💾 Salva'}
    </button>
  );

  if (phase === 'welcome') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-2xl mx-auto bg-gray-50 dark:bg-[#0e1117] text-gray-900 dark:text-white">
        <ThemeToggle />
        <h1 className="text-3xl font-bold mb-6 text-center">Benvenutə</h1>
        <div className="bg-white dark:bg-[#1e2227] p-6 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 space-y-4 text-sm leading-relaxed mb-6 shadow-sm">
          <p>I dati raccolti saranno trattati ed elaborati in forma anonima e aggregata, nel rispetto e secondo le modalità previste dal Regolamento GDPR 2016/679 e dal D.LGS. 196/2003, ed utilizzati esclusivamente per l'attività d'indagine in oggetto.</p>
          <p>Le risposte saranno anonime e verranno utilizzate esclusivamente per scopi di ricerca accademica. Non ci sono risposte giuste o sbagliate; ci interessa solo la tua opinione personale.</p>
          <p className="font-semibold text-gray-900 dark:text-white">Procedendo con la partecipazione, presti il tuo consenso al trattamento dei dati per le finalità sopra indicate.</p>
        </div>
        <button onClick={handleConsent} className="px-8 py-4 bg-[#4CAF50] text-white font-bold rounded-lg text-lg w-full transition-transform active:scale-95">Acconsento e Inizio</button>
      </div>
    );
  }

  if (phase === 'demographics') {
    const isDisabled = !gender || !education;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-md mx-auto bg-gray-50 dark:bg-[#0e1117] text-gray-900 dark:text-white">
        <ThemeToggle />
        <h1 className="text-2xl font-bold mb-6 text-center">Dati Demografici</h1>
        <div className="w-full space-y-6 bg-white dark:bg-[#1e2227] p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Età: <span className="text-gray-900 dark:text-white font-bold">{age}</span></label>
            <input type="range" min="18" max="90" value={age} onChange={(e) => setAge(Number(e.target.value))} className="w-full accent-[#4CAF50]" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Sesso: <span className="text-red-500">*</span></label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
              <option value="">Seleziona...</option>
              <option value="Uomo">Uomo</option>
              <option value="Donna">Donna</option>
              <option value="Non binario">Non binario</option>
              <option value="Preferisco non rispondere">Preferisco non rispondere</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Livello di istruzione: <span className="text-red-500">*</span></label>
            <select value={education} onChange={(e) => setEducation(e.target.value)} className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600">
              <option value="">Seleziona...</option>
              <option value="Scuola media">Scuola media</option>
              <option value="Diploma di maturità">Diploma di maturità</option>
              <option value="Laurea triennale">Laurea triennale</option>
              <option value="Laurea magistrale">Laurea magistrale</option>
              <option value="Dottorato / Formazione post-laurea">Dottorato / Formazione post-laurea</option>
            </select>
          </div>
          <button onClick={handleStartExperiment} disabled={isDisabled} className="w-full px-6 py-3 bg-[#4CAF50] text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95">Continua all'Esempio</button>
          {isDisabled && <p className="text-red-500 text-xs text-center">* Campi obbligatori</p>}
        </div>
      </div>
    );
  }

  if (phase === 'simulation') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-[#0e1117] text-gray-900 dark:text-white">
        <ThemeToggle />
        <div className="fixed top-4 right-4 z-50">
          <SaveButton />
        </div>
        
        {simStage === 0 && (
          <div className="text-center max-w-3xl mx-auto p-4 bg-white dark:bg-[#1e2227] rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm mt-16 md:mt-0">
            <h1 className="text-2xl font-bold mb-6">Istruzioni per l'esperimento</h1>
            <div className="text-left text-gray-700 dark:text-gray-300 space-y-4 text-sm leading-relaxed mb-8">
              <p>Per ogni parola, immagina che un'azione venga compiuta nel modo descritto dall'avverbio. Il tuo compito è valutare le sue caratteristiche affettive, motivazionali ed emotive.</p>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">1. Spazio Affettivo:</p>
                <ul className="list-disc list-inside ml-2">
                  <li><b>Valenza (Asse X):</b> quanto l'azione è percepita come negativa (sinistra) o positiva (destra).</li>
                  <li><b>Intensità (Asse Y):</b> il livello di attivazione emotiva, da bassa (in basso) ad alta (in alto).</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">2. Spazio Motivazionale:</p>
                <ul className="list-disc list-inside ml-2">
                  <li><b>Motivazione (Asse X):</b> se l'azione spinge all'evitamento (sinistra) o all'approccio (destra).</li>
                  <li><b>Controllo (Asse Y):</b> il grado di padronanza, da basso controllo (in basso) ad alto controllo (in alto).</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">3. Similarità Emotiva:</p>
                <p>Scegli dall'elenco l'emozione che ritieni più vicina al significato dell'avverbio.</p>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-600">
                <p className="font-bold text-gray-900 dark:text-white">Esempio:</p>
                <p><i>"Gioiosamente"</i> ha una valenza positiva e un'intensità alta. La motivazione è di approccio con un controllo alto. L'emozione più vicina è la <b>Gioia</b>.</p>
              </div>
            </div>
            <button onClick={() => setSimStage(1)} className="px-8 py-4 bg-[#4CAF50] text-white font-bold rounded-lg text-lg w-full transition-transform active:scale-95">Avvia Esempio</button>
          </div>
        )}

        {(simStage === 1 || simStage === 2) && (
          <div className="w-full max-w-5xl pt-20 md:pt-0">
            <div className="md:hidden fixed top-0 left-0 right-0 bg-gray-50 dark:bg-[#0e1117] py-4 px-4 z-40 shadow-md text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{simStage === 1 ? 'Furiosamente' : 'Placidamente'}</h1>
            </div>
            <h1 className="hidden md:block text-4xl text-center font-bold mb-8 text-gray-900 dark:text-white">{simStage === 1 ? 'Furiosamente' : 'Placidamente'}</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <h2 className="text-center text-gray-600 dark:text-gray-400 text-sm mb-2">Spazio Affettivo</h2>
                <Draggable2D x={data.valence} y={data.intensity} onChange={(x, y) => setData(d => ({...d, valence:x, intensity:y}))} cornerLabels={{ tl: "Valenza negativa / Intensità alta", tr: "Valenza positiva / Intensità alta", bl: "Valenza negativa / Intensità bassa", br: "Valenza positiva / Intensità bassa" }} />
              </div>
              <div>
                <h2 className="text-center text-gray-600 dark:text-gray-400 text-sm mb-2">Spazio Motivazionale</h2>
                <Draggable2D x={data.motivation} y={data.control} onChange={(x, y) => setData(d => ({...d, motivation:x, control:y}))} cornerLabels={{ tl: "Evitamento / Controllo alto", tr: "Approccio / Controllo alto", bl: "Evitamento / Controllo basso", br: "Approccio / Controllo basso" }} />
              </div>
              <div className="flex flex-col aspect-square">
                <h2 className="text-center text-gray-600 dark:text-gray-400 text-sm mb-2">Similarità Emotiva</h2>
                <div className="flex-1"><EmotionSelector value={data.berk_emotion} onChange={handleEmotionChange} disabled /></div>
              </div>
            </div>
            <div className="space-y-6 mb-8 max-w-md mx-auto">
              <Slider label="Facilità di immaginazione dell'azione" min={-100} max={100} value={data.imagination} onChange={(v) => setData(d => ({...d, imagination:v}))} disabled />
              <Slider label="Quanto sei sicurə dei punteggi che hai dato?" min={0} max={100} value={data.confidence} onChange={(v) => setData(d => ({...d, confidence:v}))} disabled />
            </div>
            <div className="max-w-3xl mx-auto p-4 bg-white dark:bg-[#1e2227] rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 space-y-3 mb-8 shadow-sm">
              <p className="font-bold text-gray-900 dark:text-white">Spiegazione dell'esempio:</p>
              {simStage === 1 ? (
                <p>L'azione spinge in avanti (Alta Motivazione) senza controllo trattenuto (Basso Controllo) sotto un affetto negativo intenso. L'emozione più vicina è la <b>Rabbia</b>.</p>
              ) : (
                <p>Esecuzione calma e controllata (Alto Controllo) senza urgenza in uno stato positivo e rilassato. L'emozione più vicina è la <b>Calma</b>.</p>
              )}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                <p className="font-bold text-gray-900 dark:text-white">Ricorda la Legenda:</p>
                <p><b>Spazio Affettivo:</b> X = Valenza (Negativa ↔ Positiva) | Y = Intensità (Bassa ↔ Alta)</p>
                <p><b>Spazio Motivazionale:</b> X = Motivazione (Evitamento ↔ Approccio) | Y = Controllo (Basso ↔ Alto)</p>
              </div>
            </div>
            {simStage === 1 && (<div className="text-center"><button onClick={() => setSimStage(2)} className="px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-transform active:scale-95">Premi qui per vederne un'altra ➡️</button></div>)}
            {simStage === 2 && (<div className="text-center"><button onClick={handleSimulationComplete} className="px-6 py-3 bg-[#4CAF50] text-white rounded-lg font-bold transition-transform active:scale-95">Inizia l'esperimento reale 🚀</button></div>)}
          </div>
        )}
      </div>
    );
  }

  if (phase === 'experiment') {
    if (!participant) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0e1117] text-gray-900 dark:text-white">Caricamento partecipante...</div>;
    if (trialIdx >= participant.randomized_adverbs.length) {
      return (<div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0e1117] text-gray-900 dark:text-white"><h1 className="text-4xl mb-4">Grazie per la partecipazione! 🌟</h1><p className="text-gray-500 dark:text-gray-400">ID: {uuid}</p></div>);
    }
    
    const currentAdverb = participant.randomized_adverbs[trialIdx];
    const isAttention = currentAdverb === 'ATTENTION_CHECK_1';
    const canProceed = touched.aff && touched.mot && touched.img && touched.con && touched.emo;

    const attentionText = isAttention ? 'ATTENZIONE: Per favore, imposta i seguenti valori esatti per procedere: Valenza=100, Intensità=100, Motivazione=100, Controllo=100, Immaginazione=100, Confidenza=0. Seleziona "Sorpresa" nell\'elenco emozioni.' : '';

    return (
      <div className="min-h-screen p-4 pb-20 bg-gray-50 dark:bg-[#0e1117]">
        <ThemeToggle />
        <div className="fixed top-4 right-4 z-50">
          <SaveButton />
        </div>
        
        <div className="md:hidden fixed top-0 left-0 right-0 bg-gray-50 dark:bg-[#0e1117] py-4 px-4 z-40 shadow-md text-center">
          <h1 className={`text-3xl font-bold ${isAttention ? 'text-yellow-500 dark:text-yellow-400 text-lg' : 'text-gray-900 dark:text-white'}`}>{isAttention ? 'Controllo Attenzione' : currentAdverb.charAt(0).toUpperCase() + currentAdverb.slice(1)}</h1>
        </div>
        
        <div className="max-w-5xl mx-auto pt-16 md:pt-8">
          <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2.5 mb-6 mt-2 md:mt-0">
            <div className="bg-[#4CAF50] h-2.5 rounded-full transition-all duration-300" style={{ width: `${(trialIdx / participant.randomized_adverbs.length) * 100}%` }}></div>
          </div>
          
          <h1 className={`hidden md:block text-3xl md:text-4xl text-center font-bold mb-8 ${isAttention ? 'text-yellow-500 dark:text-yellow-400 text-xl' : 'text-gray-900 dark:text-white'}`}>
            {isAttention ? attentionText : currentAdverb.charAt(0).toUpperCase() + currentAdverb.slice(1)}
          </h1>
          
          {isAttention && (
            <p className="md:hidden text-yellow-500 dark:text-yellow-400 text-center text-sm mb-4 font-medium">{attentionText}</p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div>
              <h2 className="text-center text-gray-600 dark:text-gray-400 text-sm mb-2">Spazio Affettivo</h2>
              <Draggable2D 
                x={data.valence} y={data.intensity} 
                onChange={(x, y) => { setData(d => ({...d, valence:x, intensity:y})); setTouched(t => ({...t, aff: true})); }} 
                cornerLabels={{ tl: "Valenza negativa / Intensità alta", tr: "Valenza positiva / Intensità alta", bl: "Valenza negativa / Intensità bassa", br: "Valenza positiva / Intensità bassa" }} 
              />
            </div>
            <div>
              <h2 className="text-center text-gray-600 dark:text-gray-400 text-sm mb-2">Spazio Motivazionale</h2>
              <Draggable2D 
                x={data.motivation} y={data.control} 
                onChange={(x, y) => { setData(d => ({...d, motivation:x, control:y})); setTouched(t => ({...t, mot: true})); }} 
                cornerLabels={{ tl: "Evitamento / Controllo alto", tr: "Approccio / Controllo alto", bl: "Evitamento / Controllo basso", br: "Approccio / Controllo basso" }} 
              />
            </div>
            <div className="flex flex-col aspect-square">
              <h2 className="text-center text-gray-600 dark:text-gray-400 text-sm mb-2">Similarità Emotiva</h2>
              <div className="flex-1"><EmotionSelector value={data.berk_emotion} onChange={handleEmotionChange} /></div>
            </div>
          </div>

          <div className="space-y-6 mb-8 max-w-md mx-auto">
            <Slider label="Facilità di immaginazione dell'azione" min={-100} max={100} value={data.imagination} onChange={(v) => { setData(d => ({...d, imagination:v})); setTouched(t => ({...t, img: true})); }} />
            <Slider label="Quanto sei sicurə dei punteggi che hai dato?" min={0} max={100} value={data.confidence} onChange={(v) => { setData(d => ({...d, confidence:v})); setTouched(t => ({...t, con: true})); }} />
          </div>

          <div className="flex justify-between max-w-md mx-auto items-center">
            <button onClick={() => setTrialIdx(i => Math.max(0, i - 1))} disabled={trialIdx === 0} className="px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg disabled:opacity-50 transition-transform active:scale-95">⬅️ Indietro</button>
            <div className="flex flex-col items-end">
              <button onClick={() => setTrialIdx(i => i + 1)} disabled={!canProceed} className="px-6 py-3 bg-[#4CAF50] text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95">Avanti ➡️</button>
              {!canProceed && <p className="text-red-500 text-xs mt-2">* Interagisci con tutte le mappe e gli slider per continuare</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}