import React, { useState, useEffect } from 'react';
import { Activity, Brain, Database as DbIcon, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getSystemStatus, getRecentSources } from '../api/client';

const data = [
  { name: 'Jan', decisions: 12 },
  { name: 'Feb', decisions: 19 },
  { name: 'Mar', decisions: 15 },
  { name: 'Apr', decisions: 25 },
];

const StatCard = ({ title, value, icon, trend }) => (
  <div className="bg-surface p-6 rounded-2xl border border-slate-700/50 shadow-lg relative overflow-hidden group">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold">{value}</h3>
        {trend && <p className="text-xs text-emerald-400 mt-2">{trend}</p>}
      </div>
      <div className="p-3 bg-slate-800 rounded-xl text-primary">
        {icon}
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  const [stats, setStats] = useState({
    decisions_total: 0,
    actions_total: 0,
    workflows_total: 0,
    pending_approvals: 0
  });
  const [sources, setSources] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const status = await getSystemStatus();
        setStats(status.metrics || {});
        const recent = await getRecentSources(6);
        setSources(recent);
      } catch {
        // Dashboard gracefully renders stale/default values on API errors.
      }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-8 pb-20 animate-in fade-in duration-500">
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">Platform Overview</h1>
        <p className="text-slate-400">Real-time insights from your organizational memory.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard title="Extracted Decisions" value={stats.decisions_total || 0} icon={<Brain size={24}/>} trend="Live from autonomous pipeline" />
        <StatCard title="Workflow Runs" value={stats.workflows_total || 0} icon={<DbIcon size={24}/>} trend="Detected and processed events" />
        <StatCard title="Executed Actions" value={stats.actions_total || 0} icon={<Activity size={24}/>} trend="Action agent execution log" />
        <StatCard title="Pending Approvals" value={stats.pending_approvals || 0} icon={<Zap size={24}/>} trend="Items waiting for human gate" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 bg-surface p-6 rounded-2xl border border-slate-700/50 shadow-lg">
          <h3 className="text-lg font-bold mb-6">Decision Frequency</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="decisions" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="col-span-1 bg-surface p-6 rounded-2xl border border-slate-700/50 shadow-lg flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-accent to-primary animate-pulse flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <Brain size={40} className="text-white" />
          </div>
          <h3 className="text-xl font-bold mb-2">Memory Engine Online</h3>
          <p className="text-sm text-slate-400 mb-6">Ingestion, extraction, action, and memory agents are continuously processing source events.</p>
          <div className="w-full bg-slate-800 rounded-full h-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-emerald-500 w-[100%]"></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">100% Operational</p>
        </div>
      </div>

      <div className="mt-8 bg-surface p-6 rounded-2xl border border-slate-700/50 shadow-lg">
        <h3 className="text-lg font-bold mb-4">Recent Source Intake</h3>
        <div className="space-y-3">
          {sources.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-700 bg-background p-3">
              <div className="text-xs uppercase text-slate-400 mb-1">{s.source_type}</div>
              <div className="text-sm text-slate-200">{s.snippet || 'No snippet available'}</div>
            </div>
          ))}
          {sources.length === 0 && <div className="text-slate-500 text-sm">No recent sources captured yet.</div>}
        </div>
      </div>
    </div>
  );
}
