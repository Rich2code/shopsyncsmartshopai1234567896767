
import React from 'react';
import { UserPreferences } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onUpdate: (prefs: Partial<UserPreferences>) => void;
  onClearAll: () => void;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, preferences, onUpdate, onClearAll }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-all">
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Configuration</h2>
            <button 
              onClick={onClose} 
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-800 rounded-full"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="space-y-5">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600">
                  <i className={`fa-solid ${preferences.theme === 'dark' ? 'fa-moon' : 'fa-sun'}`}></i>
                </div>
                <div>
                  <span className="font-black text-sm text-slate-900 dark:text-white block">Visual Style</span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{preferences.theme} mode</span>
                </div>
              </div>
              <button 
                onClick={() => onUpdate({ theme: preferences.theme === 'light' ? 'dark' : 'light' })}
                className={`w-14 h-8 rounded-full transition-all relative ${preferences.theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${preferences.theme === 'dark' ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600">
                  <i className="fa-solid fa-coins"></i>
                </div>
                <div>
                  <span className="font-black text-sm text-slate-900 dark:text-white block">Currency</span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Base pricing</span>
                </div>
              </div>
              <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
                {(['GBP', 'USD', 'EUR'] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => onUpdate({ currency: c })}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${preferences.currency === c ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Unit System */}
            <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600">
                  <i className="fa-solid fa-ruler"></i>
                </div>
                <div>
                  <span className="font-black text-sm text-slate-900 dark:text-white block">Distances</span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{preferences.units}</span>
                </div>
              </div>
              <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
                {(['Metric', 'Imperial'] as const).map(u => (
                  <button
                    key={u}
                    onClick={() => onUpdate({ units: u })}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${preferences.units === u ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear All */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={onClearAll}
                className="w-full py-4 border-2 border-red-500/20 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all group"
              >
                <i className="fa-solid fa-trash-can mr-2 group-hover:animate-bounce"></i>
                Purge All Local Data
              </button>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-[0.3em] text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-500/20"
          >
            Commit Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
