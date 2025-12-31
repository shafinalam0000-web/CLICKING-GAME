
import React, { useState, useEffect } from 'react';
import { Icons } from '../constants';
import { startVideoGeneration, pollVideoOperation } from '../services/geminiService';
import { GeneratedVideo } from '../types';

const VideoGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    if (typeof (window as any).aistudio?.hasSelectedApiKey === 'function') {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    } else {
      setHasApiKey(true); // Fallback if local testing without the bridge
    }
  };

  const handleSelectKey = async () => {
    if (typeof (window as any).aistudio?.openSelectKey === 'function') {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true); // Assume success per instructions
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      let operation = await startVideoGeneration(prompt);
      const videoId = Date.now().toString();
      
      const pendingVideo: GeneratedVideo = {
        id: videoId,
        url: '',
        prompt,
        timestamp: new Date(),
        status: 'processing'
      };
      setVideos(prev => [pendingVideo, ...prev]);

      // Polling logic
      while (!operation.done) {
        await new Promise(r => setTimeout(r, 8000));
        operation = await pollVideoOperation(operation);
      }

      if (operation.response?.generatedVideos?.[0]?.video?.uri) {
        const downloadLink = operation.response.generatedVideos[0].video.uri;
        const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        const blob = await videoResponse.blob();
        const videoUrl = URL.createObjectURL(blob);

        setVideos(prev => prev.map(v => v.id === videoId ? { ...v, url: videoUrl, status: 'completed' } : v));
      } else {
        throw new Error("Video failed");
      }
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        alert("Session expired. Please re-select your API key.");
      } else {
        alert("Video generation failed. Please try again later.");
      }
    } finally {
      setIsGenerating(false);
      setPrompt('');
    }
  };

  if (!hasApiKey) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center">
        <div className="max-w-md glass p-10 rounded-3xl border border-blue-500/30">
          <div className="text-5xl mb-6 text-blue-500"><Icons.Video /></div>
          <h2 className="text-2xl font-bold mb-4">Ready to Create Cinema?</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Video generation uses Veo 3.1, which requires a billing-enabled API key from a paid GCP project.
            <br/><br/>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-blue-400 underline">Read about billing</a>
          </p>
          <button 
            onClick={handleSelectKey}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-500/20 transition-all"
          >
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-12">
        <h2 className="text-3xl font-bold mb-4">Cinematic Lab</h2>
        <p className="text-slate-400 mb-8">Bring your stories to life with high-fidelity video generation.</p>
        
        <div className="flex gap-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A cinematic shot of a red dragon flying through a crystal cave, 4k, epic lighting..."
            className="flex-1 bg-slate-800 text-white rounded-xl p-4 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
          />
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-8 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-2"
          >
            {isGenerating ? <Icons.Loading /> : <Icons.Video />}
            <span>{isGenerating ? 'Processing...' : 'Create Video'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {videos.map((vid) => (
          <div key={vid.id} className="rounded-3xl overflow-hidden glass flex flex-col">
            <div className="aspect-video bg-black/50 flex items-center justify-center relative">
              {vid.status === 'processing' ? (
                <div className="text-center">
                  <div className="text-4xl text-blue-500 mb-4 animate-spin"><Icons.Loading /></div>
                  <p className="text-slate-400 animate-pulse">Rendering your vision...</p>
                  <p className="text-xs text-slate-500 mt-2 px-10">This usually takes about 2-3 minutes.</p>
                </div>
              ) : vid.status === 'completed' ? (
                <video src={vid.url} controls className="w-full h-full object-contain" />
              ) : (
                <div className="text-red-500">Generation failed</div>
              )}
            </div>
            <div className="p-6">
              <p className="text-slate-300 line-clamp-2 text-sm italic">"{vid.prompt}"</p>
              {vid.status === 'completed' && (
                <div className="mt-4 flex gap-3">
                  <a href={vid.url} download={`veo-video-${vid.id}.mp4`} className="text-xs bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg font-bold">
                    <Icons.Download /> Download MP4
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoGenerator;
