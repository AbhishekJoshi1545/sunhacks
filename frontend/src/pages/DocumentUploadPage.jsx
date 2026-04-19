import React, { useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';
import { ingestText } from '../api/client';

export default function DocumentUploadPage() {
  const [textData, setTextData] = useState('');
  const [sourceType, setSourceType] = useState('slack');
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error

  const handleIngest = async () => {
    if (!textData.trim()) return;
    setStatus('uploading');
    try {
      await ingestText(sourceType, textData);
      setStatus('success');
      setTextData('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch(err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto h-full flex flex-col justify-center">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-3">Manual Ingestion Pipeline</h1>
        <p className="text-slate-400">Trigger the Ingestion & Extraction Agents manually for testing or ad-hoc data.</p>
      </div>

      <div className="bg-surface p-8 rounded-3xl border border-slate-700/50 shadow-xl">
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-400 mb-2">Simulated Source</label>
          <div className="flex space-x-4">
            {['slack', 'gmail', 'gdrive', 'jira'].map(src => (
              <button 
                key={src}
                className={`flex-1 py-3 rounded-xl border font-semibold capitalize transition ${sourceType === src ? 'bg-primary/20 border-primary text-primary' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                onClick={() => setSourceType(src)}
              >
                {src}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-400 mb-2">Data Content (Simulating Document/Thread via Paste)</label>
          <textarea 
            rows="8"
            className="w-full bg-background border border-slate-700 hover:border-slate-500 focus:border-primary rounded-xl py-4 px-5 text-white placeholder-slate-600 outline-none transition"
            placeholder={`Enter the ${sourceType} conversation, decision thread, or document text here... \nExample: "We decided to migrate our frontend to React 18 for performance reasons. Approved by Jane on 2026-03-12."`}
            value={textData}
            onChange={(e) => setTextData(e.target.value)}
          ></textarea>
        </div>

        <button 
          onClick={handleIngest}
          disabled={status === 'uploading' || !textData.trim()}
          className="w-full bg-primary hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-primary transition-all py-4 rounded-xl flex justify-center items-center font-bold shadow-[0_0_20px_rgba(59,130,246,0.3)]"
        >
          {status === 'idle' && <><UploadCloud className="mr-2" /> Send to Extraction Agents</>}
          {status === 'uploading' && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
          {status === 'success' && <><CheckCircle className="mr-2" /> Processed & Extracted!</>}
          {status === 'error' && <><AlertTriangle className="mr-2" /> Error Ingesting Data</>}
        </button>
      </div>
    </div>
  );
}
