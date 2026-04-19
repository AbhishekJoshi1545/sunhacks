import React, { useState } from 'react';
import axios from 'axios';
import { Send, Cpu, Link as LinkIcon, Network } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ChatPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am your Organizational Memory Reasoning Engine. Ask me anything about past decisions, architecture, or history.' }
  ]);

  const handleSend = async () => {
    if (!query.trim()) return;
    const userMsg = { role: 'user', text: query };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:3001/api/query', { query: userMsg.text });
      const { answer, reasoning_steps, sources, confidence } = res.data;
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: answer,
        reasoning: reasoning_steps,
        sources,
        confidence
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error connecting to the reasoning pipeline.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background px-4 md:px-20 py-8">
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-5 ${msg.role === 'user' ? 'bg-primary text-white ml-auto' : 'bg-surface border border-slate-700'}`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center space-x-2 mb-3 text-primary">
                  <Cpu size={18} />
                  <span className="font-bold text-sm tracking-widest uppercase">Reasoning Engine</span>
                  {msg.confidence && (
                    <span className="ml-auto text-xs bg-slate-800 px-2 py-1 rounded text-emerald-400">
                      {(msg.confidence * 100).toFixed(1)}% Confidence
                    </span>
                  )}
                </div>
              )}
              
              <div className="prose prose-invert prose-p:leading-relaxed max-w-none">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>

              {msg.reasoning && msg.reasoning.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <details className="group">
                    <summary className="flex items-center cursor-pointer text-sm text-slate-400 hover:text-white transition-colors list-none">
                      <Network size={14} className="mr-2" /> View Agent Reasoning Chain
                    </summary>
                    <ul className="mt-3 pl-4 space-y-2 border-l border-slate-700 text-sm text-slate-300">
                      {msg.reasoning.map((step, idx) => (
                        <li key={idx} className="-ml-[5px] pl-3 border-l-2 border-primary">{step}</li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}

              {msg.sources && msg.sources.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-4">
                  {msg.sources.map((src, idx) => (
                    <div key={idx} className="flex items-center bg-slate-800/50 hover:bg-slate-700 transition px-3 py-1.5 rounded-full text-xs text-slate-300 border border-slate-600/50 cursor-pointer">
                      <LinkIcon size={12} className="mr-1.5 text-accent"/>
                      {src.type}: {src.id.substring(0, 10)}...
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl p-5 bg-surface border border-slate-700 flex items-center space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
              <span className="text-sm text-slate-400 ml-2">Agents are synthesizing context...</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-6 pt-4 bg-background">
        <div className="relative">
          <input
            type="text"
            className="w-full bg-surface border hover:border-primary/50 focus:border-primary border-slate-700 rounded-2xl py-4 pl-6 pr-16 text-white placeholder-slate-400 outline-none transition-all shadow-[0_0_15px_rgba(0,0,0,0.2)] focus:shadow-[0_0_20px_rgba(59,130,246,0.15)]"
            placeholder="Ask about a past decision..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={loading || !query.trim()}
            className="absolute right-3 top-3 bottom-3 bg-primary hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-primary transition-colors w-10 h-10 rounded-xl flex items-center justify-center text-white"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-center text-xs text-slate-500 mt-3 flex items-center justify-center">
          Powered by local Ollama & Neo4j/Chroma Architecture
        </p>
      </div>
    </div>
  );
}
