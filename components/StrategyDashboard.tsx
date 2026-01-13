
import React, { useMemo, useState, useEffect } from 'react';
import { ShoppingItem, StoreLocation, ItemStatus } from '../types';
import { CURRENCY_SYMBOLS } from '../constants';

interface Props {
  items: ShoppingItem[];
  currency: 'GBP' | 'USD' | 'EUR';
  locationName: string;
  storeLocations: StoreLocation[];
  onRemoveItem: (id: string) => void;
  onRefineVague: (id: string, suggestion: string) => void;
}

const StrategyDashboard: React.FC<Props> = ({ items, currency, locationName, storeLocations, onRemoveItem, onRefineVague }) => {
  const readyItems = items.filter(i => i.status === ItemStatus.READY && i.prices.length > 0);
  
  const analysis = useMemo(() => {
    if (readyItems.length === 0) return null;

    const storeData: Record<string, { total: number; count: number; itemPrices: Record<string, number> }> = {};
    
    readyItems.forEach(item => {
      const itemName = item.refinedName || item.originalName;
      item.prices.forEach(p => {
        const name = p.storeName.split(',')[0].trim();
        if (!storeData[name]) {
          storeData[name] = { total: 0, count: 0, itemPrices: {} };
        }
        storeData[name].total += p.price;
        storeData[name].count += 1;
        storeData[name].itemPrices[itemName] = p.price;
      });
    });

    const stores = Object.entries(storeData).map(([name, data]) => {
      const loc = storeLocations.find(l => 
        l.storeName.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(l.storeName.toLowerCase())
      );
      return {
        name,
        total: data.total,
        count: data.count,
        itemPrices: data.itemPrices,
        distance: loc?.distanceKm || null
      };
    });

    stores.sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return a.total - b.total;
    });

    const top3 = stores.slice(0, 3);
    const cheapest = [...stores].sort((a, b) => a.total - b.total)[0];
    const closest = [...stores].filter(s => s.distance !== null).sort((a, b) => (a.distance || 99) - (b.distance || 99))[0];

    return { top3, cheapestName: cheapest?.name, closestName: closest?.name };
  }, [readyItems, storeLocations]);

  const [selectedStoreName, setSelectedStoreName] = useState<string | null>(null);

  useEffect(() => {
    if (analysis && !selectedStoreName) {
      setSelectedStoreName(analysis.top3[0]?.name);
    }
  }, [analysis]);

  const activeStore = analysis?.top3.find(s => s.name === selectedStoreName) || analysis?.top3[0];

  const handleGetDirections = (storeName: string) => {
    const query = encodeURIComponent(`${storeName} near ${locationName}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <div className="w-full space-y-10 animate-in fade-in duration-500">
      {/* Dynamic Store Switcher - Only visible if stores found */}
      {analysis && analysis.top3.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          {analysis.top3.map((store) => {
            const isSelected = selectedStoreName === store.name;
            return (
              <button
                key={store.name}
                onClick={() => setSelectedStoreName(store.name)}
                className={`flex-1 p-5 rounded-[1.8rem] text-left transition-all border-2 ${
                  isSelected 
                    ? 'bg-slate-900 border-indigo-500 shadow-2xl scale-[1.02]' 
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {store.name === analysis.cheapestName && <span className="bg-emerald-500 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Cheapest</span>}
                  {store.name === analysis.closestName && <span className="bg-indigo-500 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Closest</span>}
                </div>
                <h4 className={`text-xs font-black uppercase tracking-tight truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-200'}`}>
                  {store.name}
                </h4>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl font-black tabular-nums ${isSelected ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    {CURRENCY_SYMBOLS[currency]}{store.total.toFixed(2)}
                  </span>
                  <span className={`text-[9px] font-bold ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                    {store.count}/{readyItems.length} found
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Unified Receipt View */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-6 pb-8 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Inventory Ledger</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {activeStore ? `Calibrated for ${activeStore.name}` : 'Awaiting Market Grounding...'}
            </p>
          </div>
          {activeStore && (
            <button 
              onClick={() => handleGetDirections(activeStore.name)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-map-location-dot"></i>
              Route to Store
            </button>
          )}
        </div>

        <div className="space-y-6">
          {items.map(item => {
            const name = item.refinedName || item.originalName;
            const price = activeStore?.itemPrices[name];
            const isAvailable = !!price;
            const isPending = item.status === ItemStatus.PENDING || item.status === ItemStatus.REFINING || item.status === ItemStatus.SEARCHING;
            const isVague = item.status === ItemStatus.VAGUE;

            return (
              <div key={item.id} className="group flex flex-col gap-4 p-2 -mx-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-all shadow-inner ${isAvailable ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-900 opacity-50'}`}>
                      {item.emoji || '🛒'}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3">
                        <span className={`font-black text-lg tracking-tight ${!isAvailable && !isPending && !isVague ? 'text-slate-300 dark:text-slate-700 line-through' : 'text-slate-900 dark:text-white'}`}>
                          {isPending && item.status === ItemStatus.REFINING ? 'Analyzing...' : name}
                        </span>
                        {isPending && (
                          <div className="flex gap-1">
                            <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></span>
                            <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                          </div>
                        )}
                      </div>
                      {isVague && (
                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest mt-1">Classification Required</span>
                      )}
                      {!isAvailable && !isPending && !isVague && (
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Not in branch</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      {isAvailable ? (
                        <span className="text-lg font-black tabular-nums text-slate-900 dark:text-white">
                          {CURRENCY_SYMBOLS[currency]}{price.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs font-black text-slate-300 dark:text-slate-800 tracking-widest uppercase">
                          {isPending ? 'Syncing' : '---'}
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => onRemoveItem(item.id)}
                      className="w-8 h-8 flex items-center justify-center text-slate-200 dark:text-slate-800 hover:text-red-500 transition-colors"
                    >
                      <i className="fa-solid fa-circle-xmark"></i>
                    </button>
                  </div>
                </div>

                {/* Inline Vague Selection */}
                {isVague && item.vagueSuggestions && (
                  <div className="ml-16 flex flex-wrap gap-2 animate-in slide-in-from-left-2 duration-300">
                    {item.vagueSuggestions.map(s => (
                      <button 
                        key={s} 
                        onClick={() => onRefineVague(item.id, s)}
                        className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-100 dark:border-amber-900/30 rounded-xl text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest hover:bg-amber-100 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Totals Section */}
        {activeStore && (
          <div className="mt-12 pt-10 border-t-4 border-dashed border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Estimated Total</span>
              <span className="text-6xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                {CURRENCY_SYMBOLS[currency]}{activeStore.total.toFixed(2)}
              </span>
            </div>
            
            <div className="flex items-center gap-5 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                <i className="fa-solid fa-truck-fast"></i>
              </div>
              <div>
                <span className="text-[9px] font-black text-slate-400 uppercase block tracking-widest">Store Proximity</span>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {activeStore.distance ? `${activeStore.distance.toFixed(1)} km` : 'Local Grid'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyDashboard;
