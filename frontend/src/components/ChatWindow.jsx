import { useState, useRef, useEffect } from 'react';
import { sendQuery } from '../api/client';
import MessageBubble from './MessageBubble';
import { Send, Loader2 } from 'lucide-react';

export default function ChatWindow() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your sophisticated Organizational Memory Assistant. Ask me anything about past technical choices, reasons frameworks were adopted, or who made certain strategic decisions.',
      sources: [],
      reasoning_steps: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const result = await sendQuery(userMessage.content);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.answer,
        sources: result.sources || [],
        reasoning_steps: result.reasoning_steps || [],
        confidence: result.confidence,
        query_time_ms: result.query_time_ms
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please verify the backend is running.',
        sources: [],
        reasoning_steps: []
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="app-container">
      <div className="glass-panel">
        <div className="chat-header">
          <h1>🧠 Org Memory Engine</h1>
          <p>Unifying the logic behind organizational decisions implicitly tracked across communications.</p>
        </div>

        <div className="chat-messages">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {loading && (
            <div className="loading-indicator">
              <Loader2 className="spinner" size={16} />
              <span>Analyzing organizational knowledge...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="input-area">
          <div className="input-wrapper">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="E.g., Why did we migrate our cloud infrastructure to MongoDB Atlas?"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="send-btn"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
