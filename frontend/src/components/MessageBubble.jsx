import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronUp, ExternalLink, MessageSquare, Mail, FileText, Link, Info } from 'lucide-react';

const sourceIcons = {
  slack: <MessageSquare className="w-4 h-4" />,
  gmail: <Mail className="w-4 h-4" />,
  google_drive: <FileText className="w-4 h-4" />,
  knowledge_graph: <Link className="w-4 h-4" />,
  manual_upload: <Info className="w-4 h-4" />
};

export default function MessageBubble({ message }) {
  const [showSources, setShowSources] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  const isUser = message.role === 'user';

  return (
    <div className={`message-wrapper ${isUser ? 'user' : 'assistant'}`}>
      <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
        <ReactMarkdown>{message.content}</ReactMarkdown>
        
        {/* Sources Collapse */}
        {!isUser && message.sources?.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <button
              onClick={() => setShowSources(!showSources)}
              className="reasoning-toggle"
            >
              {showSources ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {message.sources.length} Linked Sources
            </button>

            {showSources && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                {message.sources.map((src, i) => (
                  <div key={i} className="source-card">
                    <div className="source-header">
                      {sourceIcons[src.type]}
                      <span style={{ textTransform: 'capitalize' }}>{src.type?.replace('_', ' ')}</span>
                      {src.date && <span style={{ color: 'var(--text-muted)' }}>· {src.date}</span>}
                      {src.url && (
                        <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', color: 'var(--primary)' }}>
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                    {src.snippet && <div style={{ color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{src.snippet}</div>}
                    {src.decision && <div style={{ marginTop: '5px' }}><strong>Decision:</strong> {src.decision}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reasoning Collapse */}
        {!isUser && message.reasoning_steps?.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="reasoning-toggle"
            >
              {showReasoning ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              View AI Engine Reasoning
            </button>
            {showReasoning && (
              <ol className="reasoning-list">
                {message.reasoning_steps.map((step, i) => (
                  <li key={i} style={{ marginBottom: '5px' }}>{step}</li>
                ))}
              </ol>
            )}
          </div>
        )}

        {!isUser && message.query_time_ms && (
          <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '12px', textAlign: 'right' }}>
            Ran in {(message.query_time_ms / 1000).toFixed(2)}s
          </div>
        )}
      </div>
    </div>
  );
}
