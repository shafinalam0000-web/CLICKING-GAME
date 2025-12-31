
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../constants';
import { getLiveSession } from '../services/geminiService';

const LiveVoiceSession: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState<{ role: string, text: string }[]>([]);
  
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length;
    const buffer = ctx.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    return buffer;
  };

  const createBlob = (data: Float32Array) => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const toggleSession = async () => {
    if (isActive) {
      if (sessionRef.current) sessionRef.current.close();
      if (audioContextInRef.current) audioContextInRef.current.close();
      if (audioContextOutRef.current) audioContextOutRef.current.close();
      setIsActive(false);
      return;
    }

    setIsConnecting(true);
    try {
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = getLiveSession({
        onopen: () => {
          setIsConnecting(false);
          setIsActive(true);
          
          const source = audioContextInRef.current!.createMediaStreamSource(stream);
          const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e: any) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(audioContextInRef.current!.destination);
        },
        onmessage: async (message: any) => {
          const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioData && audioContextOutRef.current) {
            const ctx = audioContextOutRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            const buffer = await decodeAudioData(decode(audioData), ctx);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
            sourcesRef.current.add(source);
            source.onended = () => sourcesRef.current.delete(source);
          }

          if (message.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => s.stop());
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },
        onerror: (e: any) => console.error(e),
        onclose: () => setIsActive(false),
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
      alert("Microphone access or connection failed.");
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl text-center space-y-8">
        <div className="relative inline-block">
          <div className={`absolute inset-0 rounded-full blur-3xl opacity-20 transition-all duration-1000 ${
            isActive ? 'bg-blue-500 scale-150 animate-pulse' : 'bg-slate-500'
          }`}></div>
          <button 
            onClick={toggleSession}
            disabled={isConnecting}
            className={`relative z-10 w-48 h-48 rounded-full border-4 flex flex-col items-center justify-center gap-4 transition-all ${
              isActive 
                ? 'bg-blue-600 border-blue-400 shadow-[0_0_50px_rgba(59,130,246,0.5)]' 
                : 'bg-slate-800 border-slate-700 hover:border-slate-500 text-slate-400'
            }`}
          >
            {isConnecting ? (
              <div className="text-4xl animate-spin"><Icons.Loading /></div>
            ) : (
              <div className={`text-6xl ${isActive ? 'text-white' : 'text-slate-500'}`}>
                <Icons.Live />
              </div>
            )}
            <span className="font-bold text-sm tracking-widest uppercase">
              {isConnecting ? 'Connecting' : isActive ? 'End Session' : 'Start Session'}
            </span>
          </button>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-bold">{isActive ? 'I am listening...' : 'Real-time Voice Presence'}</h2>
          <p className="text-slate-400 max-w-lg mx-auto leading-relaxed">
            Experience ultra-low latency voice interaction. Powered by Gemini 2.5 Flash Native Audio for natural, human-like conversations.
          </p>
        </div>

        {isActive && (
          <div className="flex justify-center gap-2 mt-10">
            {[1, 2, 3, 4, 5].map(i => (
              <div 
                key={i} 
                className="w-2 h-12 bg-blue-500 rounded-full animate-wave" 
                style={{ animationDelay: `${i * 0.1}s`, animationDuration: '0.8s' }}
              ></div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes wave {
          0%, 100% { height: 1rem; }
          50% { height: 3rem; }
        }
        .animate-wave {
          animation: wave infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default LiveVoiceSession;
