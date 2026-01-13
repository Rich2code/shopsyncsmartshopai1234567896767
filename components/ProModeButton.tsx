
import React, { useState, useEffect } from 'react';

const ProModeButton: React.FC = () => {
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
    const interval = setInterval(checkKey, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Optimistic update as per rules
      setHasKey(true);
    }
  };

  return (
    <button
      onClick={handleOpenKeySelector}
      className={`px-4 py-2 rounded-full text-[10px] font-black transition-all flex items-center gap-2 border uppercase tracking-widest ${
        hasKey 
          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-105' 
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600'
      }`}
    >
      <i className={`fa-solid ${hasKey ? 'fa-crown animate-pulse' : 'fa-bolt'}`}></i>
      {hasKey ? 'Pro Mode' : 'Enable Pro'}
    </button>
  );
};

export default ProModeButton;
