
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Icons } from '../constants';
import { generateChatResponse } from '../services/geminiService';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      let coords;
      if (useMaps) {
        try {
          const pos: any = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        } catch (e) {
          console.warn("Location permission denied");
        }
      }

      const response = await generateChatResponse(input, useSearch, useMaps, coords);
      
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        timestamp: new Date(),
        groundingLinks: response.links
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Error encountered. Try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full canvas-area relative">
      <div className="flex-1 overflow-y-auto px-6 pt-10 pb-32 space-y-8" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto pt-20 text-center">
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">The AI Workspace for <span className="gradient-text">Everything.</span></h2>
            <p className="text-slate-400 text-lg mb-10">Chat, browse the web, find locations, and create visuals in one unified space.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setInput("What's the latest in AI robotics?")} className="p-4 rounded-2xl glass-panel text-left hover:bg-slate-800/50 transition-all border border-slate-800">
                <p className="text-indigo-400 text-xs font-bold uppercase mb-1">Research</p>
                <p className="text-slate-300 text-sm">Deep dive into recent robotics breakthroughs...</p>
              </button>
              <button onClick={() => setInput("Help me plan a trip to Tokyo")} className="p-4 rounded-2xl glass-panel text-left hover:bg-slate-800/50 transition-all border border-slate-800">
                <p className="text-emerald-400 text-xs font-bold uppercase mb-1">Explore</p>
                <p className="text-slate-300 text-sm">Discover hidden gems and local favorites...</p>
              </button>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-3xl px-6 py-4 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white' 
                  : 'glass-panel text-slate-200 border border-slate-800/50'
              }`}>
                <p className="leading-relaxed text-[15px] whitespace-pre-wrap">{msg.text}</p>
                {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700/30 flex flex-wrap gap-2">
                    {msg.groundingLinks.map((link, idx) => (
                      <a 
                        key={idx} 
                        href={link.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[11px] bg-slate-900/80 hover:bg-slate-800 px-3 py-1.5 rounded-full text-slate-300 transition-colors flex items-center gap-2 border border-slate-800"
                      >
                        <i className="fa-solid fa-link text-[10px]"></i> {link.title || 'Source'}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="glass-panel rounded-full px-6 py-3 border border-slate-800/50 flex items-center gap-4">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
                <span className="text-xs font-medium text-slate-500 tracking-wide uppercase">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating command bar */}
      <div className="absolute bottom-10 left-0 right-0 px-6 pointer-events-none">
        <div className="max-w-3xl mx-auto glass-panel p-2 rounded-[28px] border border-slate-800 shadow-2xl pointer-events-auto">
          <div className="flex items-center gap-2 mb-2 px-3">
             <button 
                onClick={() => setUseSearch(!useSearch)}
                className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full transition-all border ${
                  useSearch ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50' : 'text-slate-500 border-transparent hover:bg-slate-800'
                }`}
             >
                <Icons.Search /> Search
             </button>
             <button 
                onClick={() => setUseMaps(!useMaps)}
                className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full transition-all border ${
                  useMaps ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50' : 'text-slate-500 border-transparent hover:bg-slate-800'
                }`}
             >
                <Icons.Map /> Maps
             </button>
          </div>
          <div className="flex gap-3 px-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message Ughbot..."
              className="flex-1 bg-transparent text-white px-4 py-2 focus:outline-none placeholder-slate-600 font-medium"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg"
            >
              <Icons.Send />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
