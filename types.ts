
export enum ItemStatus {
  PENDING = 'pending',
  REFINING = 'refining',
  VAGUE = 'vague',
  SEARCHING = 'searching',
  READY = 'ready',
  ERROR = 'error'
}

export interface StorePrice {
  storeName: string;
  price: number;
  currency: string;
  url: string;
}

export interface StoreLocation {
  storeName: string;
  distanceKm: number;
  address: string;
  mapsUri: string;
}

export interface ShoppingItem {
  id: string;
  originalName: string;
  refinedName: string;
  emoji: string;
  status: ItemStatus;
  prices: StorePrice[];
  vagueSuggestions?: string[];
  errorMessage?: string;
}

export interface UserPreferences {
  currency: 'GBP' | 'USD' | 'EUR';
  units: 'Metric' | 'Imperial';
  location: { lat: number; lng: number } | null;
  locationName: string;
  theme: 'light' | 'dark';
}
