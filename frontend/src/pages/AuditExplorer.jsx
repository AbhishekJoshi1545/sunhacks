import React, { useState, useEffect } from 'react';
import { Shield, Activity, FileText, CheckCircle, Database } from 'lucide-react';
import { getAuditLogs } from '../api/client';

export default function AuditExplorer() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = () => {
      getAuditLogs()
        .then((items) => setLogs(items))
        .catch(err => console.error(err));
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 h-full">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">Audit Logs</h1>
        <p className="text-slate-400">Complete transparency log for autonomous agent workflows.</p>
      </header>

      <div className="bg-surface rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="text-xs uppercase bg-slate-800/50 text-slate-300 border-b border-slate-700">
            <tr>
              <th className="px-6 py-4">Event ID</th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4">Agent Trace</th>
              <th className="px-6 py-4">Final State</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition">
                <td className="px-6 py-4 font-mono text-xs">{log.id.substring(0, 8)}...</td>
                <td className="px-6 py-4">
                  <span className="flex items-center text-slate-300 uppercase font-bold text-xs">
                    <Database size={14} className="mr-2 text-primary"/>
                    {log.source_type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {log.audit_log?.map((step, i) => (
                      <div key={i} className="flex items-start text-xs">
                        <Activity size={12} className="mr-2 mt-0.5 text-accent flex-shrink-0" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    log.status === 'archived' ? 'bg-slate-800 text-slate-400' :
                    log.status === 'executed' ? 'bg-emerald-500/20 text-emerald-500' :
                    log.status === 'pending_approval' ? 'bg-amber-500/20 text-amber-500' :
                    'bg-primary/20 text-primary'
                  }`}>
                    {log.status.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-8 text-slate-500">No agent activity recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
