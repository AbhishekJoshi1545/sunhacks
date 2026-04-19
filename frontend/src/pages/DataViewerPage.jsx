import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, Server, Box, Layers, RefreshCw } from 'lucide-react';

export default function DataViewerPage() {
  const [activeTab, setActiveTab] = useState('chroma');
  const [chromaData, setChromaData] = useState([]);
  const [neoData, setNeoData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Chroma (Recent Sources)
      const chromaRes = await axios.get('http://localhost:3001/api/sources/recent?limit=50');
      setChromaData(chromaRes.data.sources || []);

      // Fetch Neo4j (Decisions/Extracts)
      const neoRes = await axios.get('http://localhost:3001/api/decisions');
      setNeoData(neoRes.data.decisions || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <Server className="mr-3 text-primary" size={28} />
            Raw Data Storage Viewer
          </h1>
          <p className="text-slate-400">Inspect the exact payloads persisted in ChromaDB and Neo4j Graph.</p>
        </div>
        <button 
          onClick={fetchData} 
          className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors border border-slate-700"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span>Refresh Data</span>
        </button>
      </div>

      <div className="flex space-x-4 mb-6 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('chroma')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
            activeTab === 'chroma' ? 'bg-primary/20 text-primary border border-primary/50' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Database size={18} />
          <span className="font-semibold">ChromaDB Vectors</span>
          <span className="bg-slate-800 text-xs px-2 py-0.5 rounded-full ml-2">{chromaData.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('neo')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
            activeTab === 'neo' ? 'bg-accent/20 text-accent border border-accent/50' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers size={18} />
          <span className="font-semibold">Neo4j Graph (Decisions)</span>
          <span className="bg-slate-800 text-xs px-2 py-0.5 rounded-full ml-2">{neoData.length}</span>
        </button>
      </div>

      <div className="bg-surface border border-slate-800 rounded-xl overflow-hidden min-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 text-slate-400">
            <RefreshCw className="animate-spin mb-4" size={32} />
            <p>Pulling direct database records...</p>
          </div>
        ) : activeTab === 'chroma' ? (
          <div className="p-4 space-y-4">
            {chromaData.length === 0 ? (
              <p className="text-center text-slate-500 py-10">No vector embeddings found in ChromaDB yet.</p>
            ) : (
              chromaData.map((item, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-700 rounded-lg p-5">
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-blue-500/20 text-blue-400 px-2.5 py-1 text-xs rounded border border-blue-500/30 uppercase tracking-widest font-bold">
                      {item.source_type}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">ID: {item.id}</span>
                  </div>
                  <h3 className="text-slate-200 font-medium mb-3">"{item.snippet}"</h3>
                  <div className="bg-black/50 p-3 rounded font-mono text-xs text-emerald-400 overflow-x-auto">
                    {JSON.stringify(item.metadata, null, 2)}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {neoData.length === 0 ? (
              <p className="text-center text-slate-500 py-10">No decision nodes synthesized in Neo4j yet.</p>
            ) : (
              neoData.map((node, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-700 rounded-lg p-5">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex space-x-2">
                       <span className="bg-purple-500/20 text-purple-400 px-2.5 py-1 text-xs rounded border border-purple-500/30 font-bold uppercase tracking-widest">
                         Decision Node
                       </span>
                       <span className={`px-2.5 py-1 text-xs rounded border uppercase tracking-widest font-bold ${
                         node.impact === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                         node.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 
                         'bg-slate-500/20 text-slate-400 border-slate-500/30'
                       }`}>
                         {node.impact} impact
                       </span>
                    </div>
                    <span className="text-xs font-mono text-slate-500">ID: {node.id.substring(0,8)}...</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{node.text}</h3>
                  <p className="text-slate-400 text-sm mb-4">Reason: {node.reason}</p>
                  <div className="flex items-center text-xs text-slate-500 space-x-4">
                    <span>Confidence: {(node.confidence * 100).toFixed(1)}%</span>
                    <span>State: {node.lifecycle_state}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
