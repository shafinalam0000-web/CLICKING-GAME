
import React from 'react';
import { AppMode } from '../types';
import { Icons } from '../constants';

interface SidebarProps {
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeMode, onModeChange }) => {
  const menuItems = [
    { mode: AppMode.CHAT, label: 'Chat', icon: Icons.Chat },
    { mode: AppMode.IMAGE, label: 'Images', icon: Icons.Image },
    { mode: AppMode.VIDEO, label: 'Videos', icon: Icons.Video },
    { mode: AppMode.LIVE, label: 'Live', icon: Icons.Live },
  ];

  return (
    <div className="w-20 lg:w-64 h-screen flex flex-col glass-panel border-r border-slate-800/50 fixed left-0 top-0 z-50">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <span className="text-white font-black text-xl leading-none">U</span>
        </div>
        <span className="hidden lg:block font-bold text-xl tracking-tight text-white">Ughbot</span>
      </div>

      <div className="px-4 mb-8 hidden lg:block">
        <button 
          onClick={() => onModeChange(AppMode.CHAT)}
          className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-plus text-xs"></i>
          New Project
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.mode}
            onClick={() => onModeChange(item.mode)}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
              activeMode === item.mode
                ? 'bg-slate-800/50 text-indigo-400 border border-slate-700/50'
                : 'text-slate-500 hover:text-white hover:bg-slate-800/30'
            }`}
          >
            <span className={`text-lg ${activeMode === item.mode ? 'text-indigo-400' : 'group-hover:text-white'}`}>
              <item.icon />
            </span>
            <span className="hidden lg:block font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-800/50">
        <div className="hidden lg:block px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-800/50">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">System Live</span>
          </div>
          <p className="text-xs text-slate-400">Gemini 3.0 Engine</p>
        </div>
        <div className="lg:hidden flex justify-center py-2 text-slate-500">
           <Icons.Settings />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
