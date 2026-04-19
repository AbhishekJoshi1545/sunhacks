import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Play, HelpCircle } from 'lucide-react';
import { getPendingActions, approveAction } from '../api/client';

export default function ActionCenter() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Poll for pending actions automatically
  useEffect(() => {
    const fetchActions = () => {
      getPendingActions()
        .then((pending) => setActions(pending))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    };
    fetchActions();
    const interval = setInterval(fetchActions, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id) => {
    try {
      await approveAction(id, 'approve');
      setActions(actions.filter(a => a.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id) => {
    try {
      await approveAction(id, 'reject');
      setActions(actions.filter(a => a.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 h-full">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">Action Center</h1>
        <p className="text-slate-400">Review and approve actions proposed by the autonomous agents.</p>
      </header>

      {loading && <div className="text-center py-20 animate-pulse text-slate-500">Scanning workflow states...</div>}

      <div className="grid gap-6">
        {actions.map(action => (
          <div key={action.id} className="bg-surface rounded-2xl border border-slate-700/50 shadow-lg p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    action.impact === 'high' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                    action.impact === 'medium' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                    'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                  }`}>
                    {action.impact} Impact
                  </span>
                  <span className="text-slate-400 text-sm">Source: {action.source_type}</span>
                </div>
                <h3 className="text-xl font-bold mt-2">Proposed: {action.proposed_action?.type || "Task Execution"}</h3>
                <p className="text-slate-300 mt-2">{action.proposed_actions?.[0]?.payload?.description || 'Action package awaiting approval.'}</p>
              </div>
              <div className="flex flex-col space-y-2">
                <button onClick={() => handleApprove(action.id)} className="flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 transition px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-600/20">
                  <CheckCircle size={18} className="mr-2" /> Approve
                </button>
                <button onClick={() => handleReject(action.id)} className="flex items-center justify-center bg-surface border border-slate-600 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 transition px-6 py-2.5 rounded-xl font-bold">
                  <XCircle size={18} className="mr-2" /> Reject
                </button>
              </div>
            </div>

            <div className="bg-background rounded-xl p-4 border border-slate-800">
              <h4 className="text-sm font-bold text-slate-400 mb-2 flex items-center">
                <HelpCircle size={14} className="mr-1.5"/> Agent Context & Extraction
              </h4>
              <p className="text-sm text-slate-300 mb-3"><span className="font-semibold text-white">Extracted Decision:</span> {action.decision_text}</p>
              <p className="text-sm text-slate-300 mb-3"><span className="font-semibold text-white">Rationale:</span> {action.rationale}</p>
              {action.proposed_actions?.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-semibold text-white mb-2">Proposed Actions:</p>
                  <ul className="text-sm text-slate-300 space-y-1">
                    {action.proposed_actions.map((a) => (
                      <li key={a.action_id}>- {a.action_type}: {a.payload?.description}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 font-mono text-xs text-slate-400 mt-2 break-words">
                "{action.raw_text}"
              </div>
            </div>
          </div>
        ))}

        {!loading && actions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-surface rounded-3xl border border-dashed border-slate-700">
            <CheckCircle size={48} className="mb-4 opacity-50" />
            <p className="text-xl font-bold">Inbox Zero</p>
            <p>No pending autonomous actions require human review.</p>
          </div>
        )}
      </div>
    </div>
  );
}
