
import React, { useState, useEffect, useRef } from 'react';
import { ShoppingItem, ItemStatus, UserPreferences, StoreLocation } from './types';
import { refineItem, searchPrices, resolveLocation } from './services/geminiService';
import { SEARCH_COOLDOWN_MS, PRO_SEARCH_COOLDOWN_MS } from './constants';
import StrategyDashboard from './components/StrategyDashboard';
import ProModeButton from './components/ProModeButton';
import SettingsModal from './components/SettingsModal';

const STORAGE_KEY = 'smartshop_v2_data_final';

const getDefaultPreferences = (): UserPreferences => ({
  currency: 'USD',
  units: 'Metric',
  location: null,
  locationName: 'Detecting Location...',
  theme: 'light'
});

const App: React.FC = () => {
  const [isProMode, setIsProMode] = useState(false);
  const [items, setItems] = useState<ShoppingItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.items || [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...getDefaultPreferences(), ...(parsed.preferences || {}) };
      } catch (e) {
        return getDefaultPreferences();
      }
    }
    return getDefaultPreferences();
  });

  const [storeLocations, setStoreLocations] = useState<StoreLocation[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.storeLocations || [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [inputValue, setInputValue] = useState('');
  const [locationInputValue, setLocationInputValue] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProcessingSearch, setIsProcessingSearch] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync state to LocalStorage
  useEffect(() => {
    const data = JSON.stringify({ items, preferences, storeLocations });
    localStorage.setItem(STORAGE_KEY, data);
  }, [items, preferences, storeLocations]);

  // Handle Theme
  useEffect(() => {
    if (preferences.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [preferences.theme]);

  // Check for API Key (Pro Mode)
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsProMode(hasKey);
      }
    };
    checkKey();
    // Periodically check in case user selects key via button
    const interval = setInterval(checkKey, 2000);
    return () => clearInterval(interval);
  }, []);

  // Detect and resolve location
  useEffect(() => {
    if (navigator.geolocation && !preferences.location) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPreferences(prev => ({
            ...prev,
            location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            locationName: 'Current Location'
          }));
        },
        () => {
          if (preferences.locationName === 'Detecting Location...') {
            setPreferences(prev => ({ ...prev, locationName: 'Global Search' }));
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [preferences.location]);

  // PARALLEL REFINEMENT LOOP (Instant categorization)
  useEffect(() => {
    const pendingItems = items.filter(i => i.status === ItemStatus.PENDING);
    pendingItems.forEach(async (item) => {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: ItemStatus.REFINING } : i));
      try {
        const result = await refineItem(item.originalName);
        setItems(prev => prev.map(i => i.id === item.id ? { 
          ...i, 
          refinedName: result.refinedName,
          emoji: result.emoji,
          vagueSuggestions: result.suggestions,
          status: result.isVague ? ItemStatus.VAGUE : ItemStatus.SEARCHING 
        } : i));
      } catch (e) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: ItemStatus.ERROR } : i));
      }
    });
  }, [items.filter(i => i.status === ItemStatus.PENDING).length]);

  // SERIAL SEARCH LOOP (Uses dynamic cooldown based on Pro status)
  useEffect(() => {
    const processSearch = async () => {
      if (isProcessingSearch) return;

      const nextItem = items.find(i => i.status === ItemStatus.SEARCHING);
      if (nextItem) {
        setIsProcessingSearch(true);
        try {
          const locationStr = preferences.location 
            ? `${preferences.location.lat}, ${preferences.location.lng}` 
            : preferences.locationName;
          
          const prices = await searchPrices(nextItem.refinedName || nextItem.originalName, locationStr);
          setItems(prev => prev.map(i => i.id === nextItem.id ? { ...i, prices, status: ItemStatus.READY } : i));
        } catch (e) {
          console.error("Search error", e);
          setItems(prev => prev.map(i => i.id === nextItem.id ? { ...i, status: ItemStatus.ERROR } : i));
        } finally {
          const cooldown = isProMode ? PRO_SEARCH_COOLDOWN_MS : SEARCH_COOLDOWN_MS;
          searchTimeoutRef.current = setTimeout(() => setIsProcessingSearch(false), cooldown);
        }
      }
    };
    processSearch();
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [items, isProcessingSearch, preferences.location, isProMode]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputValue.trim();
    if (!val) return;
    
    const newItem: ShoppingItem = {
      id: Math.random().toString(36).substring(7),
      originalName: val,
      refinedName: '',
      emoji: '',
      status: ItemStatus.PENDING,
      prices: []
    };
    
    setItems(prev => [newItem, ...prev]);
    setInputValue('');
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationInputValue.trim()) return;
    try {
      const resolved = await resolveLocation(locationInputValue);
      setPreferences(prev => ({
        ...prev,
        location: { lat: resolved.lat, lng: resolved.lng },
        locationName: resolved.name
      }));
      setStoreLocations([]); 
      setLocationInputValue('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  
  const handleRefineVague = (id: string, suggestion: string) => {
    setItems(prev => prev.map(i => i.id === id ? { 
      ...i, 
      refinedName: suggestion, 
      status: ItemStatus.SEARCHING,
      vagueSuggestions: [] 
    } : i));
  };

  const handleClearAll = () => {
    if (confirm("Clear all data?")) {
      setItems([]);
      setStoreLocations([]);
      localStorage.removeItem(STORAGE_KEY);
      setIsSettingsOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 flex flex-col items-center p-4 md:p-12">
      <div className="w-full max-w-5xl space-y-10">
        <div className="space-y-8">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter">
                Shop<span className="text-indigo-600">Sync</span>
              </h1>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${isProMode ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`}></span>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">
                  {isProMode ? 'High-Velocity Engine Active' : 'Market Intelligence Active'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <ProModeButton />
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="w-12 h-12 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl border border-slate-100 dark:border-slate-800"
              >
                <i className="fa-solid fa-sliders"></i>
              </button>
              <form onSubmit={handleUpdateLocation} className="relative">
                <input 
                  type="text"
                  value={locationInputValue}
                  onChange={(e) => setLocationInputValue(e.target.value)}
                  placeholder={preferences.locationName}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-[10px] font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xl transition-all w-48"
                />
                <i className="fa-solid fa-location-dot absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 text-[10px]"></i>
              </form>
            </div>
          </header>

          <form onSubmit={handleAddItem} className="relative group">
            <div className={`absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] blur-xl opacity-5 group-focus-within:opacity-10 transition-opacity`}></div>
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Add to list (e.g. Avocado, Whole Milk)"
              className="relative w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-[2rem] px-10 py-8 text-2xl font-black text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-200 dark:placeholder:text-slate-800"
            />
            <button 
              type="submit"
              className="absolute right-6 top-1/2 -translate-y-1/2 bg-indigo-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
            >
              <i className="fa-solid fa-plus text-xl"></i>
            </button>
          </form>
        </div>

        {items.length > 0 ? (
          <StrategyDashboard 
            items={items} 
            currency={preferences.currency} 
            locationName={preferences.locationName}
            storeLocations={storeLocations}
            onRemoveItem={handleRemoveItem}
            onRefineVague={handleRefineVague}
          />
        ) : (
          <div className="py-32 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-700">
            <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center">
              <i className="fa-solid fa-cart-flatbed text-3xl text-slate-300 dark:text-slate-700"></i>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Receipt Empty</h2>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Awaiting Input Data</p>
            </div>
          </div>
        )}
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        preferences={preferences}
        onUpdate={(p) => setPreferences(prev => ({ ...prev, ...p }))}
        onClearAll={handleClearAll}
      />
    </div>
  );
};

export default App;
