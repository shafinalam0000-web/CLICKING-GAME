
import React, { useState } from 'react';
import { Icons } from '../constants';
import { generateImage } from '../services/geminiService';
import { GeneratedImage } from '../types';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      const url = await generateImage(prompt);
      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        url,
        prompt,
        timestamp: new Date()
      };
      setImages(prev => [newImage, ...prev]);
      setPrompt('');
    } catch (error) {
      alert("Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto canvas-area px-8 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl mb-12">
          <div className="flex items-center gap-4 mb-6">
             <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <Icons.Image />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Image Studio</h2>
                <p className="text-sm text-slate-500">Gemini 2.5 High-Fidelity Synthesis</p>
             </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="Describe your masterpiece... (e.g. 'Cyberpunk forest with bioluminescent deer')"
              className="flex-1 bg-slate-900/50 text-white rounded-xl px-6 py-4 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 placeholder-slate-600 transition-all font-medium"
            />
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20"
            >
              {isGenerating ? <Icons.Loading /> : <Icons.Image />}
              <span>{isGenerating ? 'Synthesizing...' : 'Generate'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((img) => (
            <div key={img.id} className="group relative rounded-2xl overflow-hidden glass-panel border border-slate-800 aspect-square transition-all hover:scale-[1.01] hover:shadow-2xl hover:shadow-indigo-500/10">
              <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end">
                <p className="text-xs font-semibold text-indigo-400 uppercase mb-1">Prompt</p>
                <p className="text-xs text-white line-clamp-2 mb-4 leading-relaxed italic">{img.prompt}</p>
                <div className="flex gap-2">
                  <a 
                    href={img.url} 
                    download={`ughbot-${img.id}.png`}
                    className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white py-2 rounded-lg text-center text-xs font-bold transition-all"
                  >
                    <Icons.Download /> Save Image
                  </a>
                </div>
              </div>
            </div>
          ))}
          {images.length === 0 && !isGenerating && (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-800/50 rounded-[40px] glass-panel">
              <div className="text-5xl mb-6 opacity-10"><Icons.Image /></div>
              <p className="text-slate-500 font-medium">Your creative gallery is empty.<br/>Generate something unique above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageGenerator;
