import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Users, FileText } from 'lucide-react';
import { getDecisions } from '../api/client';

export default function DecisionExplorer() {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDecisions().then((list) => {
      setDecisions(list || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-8 pb-20 animate-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Decision Explorer</h1>
          <p className="text-slate-400">Search and filter through the entire organizational memory.</p>
        </div>
      </header>

      <div className="flex space-x-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search decisions by keyword, team, or project..." 
            className="w-full bg-surface border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-primary"
          />
        </div>
        <button className="flex items-center space-x-2 bg-surface border border-slate-700 px-6 py-3 rounded-xl hover:bg-slate-800 transition">
          <Filter size={18} />
          <span>Filters</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">Loading decisions...</div>
      ) : (
        <div className="grid gap-4">
          {decisions.map((d, i) => (
            <div key={i} className="bg-surface border border-slate-700/50 p-6 rounded-2xl hover:border-primary/30 transition-colors group">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{d.text}</h3>
                <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full flex items-center">
                  <Calendar size={12} className="mr-1" /> {d.date}
                </span>
              </div>
              <div className="mb-4">
                <p className="text-sm font-medium text-slate-400 mb-1">Reasoning/Context:</p>
                <p className="text-slate-300">{d.reason}</p>
              </div>
              <div className="pt-4 border-t border-slate-700/50 flex space-x-6 text-sm text-slate-400">
                <div className="flex items-center"><Users size={16} className="mr-2 text-accent"/> Extracted from graph</div>
                <div className="flex items-center"><FileText size={16} className="mr-2 text-primary"/> ID: {d.id?.substring(0,8)}</div>
                <div className="flex items-center">State: {d.lifecycle_state || d.status}</div>
                <div className="flex items-center">Impact: {d.impact || 'low'}</div>
              </div>
            </div>
          ))}
          {decisions.length === 0 && (
            <div className="text-center py-20 text-slate-500 bg-surface rounded-2xl border border-dashed border-slate-700">
              No decisions extracted yet. Try ingesting some data!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
