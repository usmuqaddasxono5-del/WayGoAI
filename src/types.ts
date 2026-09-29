export interface RouteStep {
  id: string;
  instruction: string;
  distance: string;
  duration: string;
  mode: 'walk' | 'drive' | 'transit';
  iconType?: 'straight' | 'turn-left' | 'turn-right' | 'roundabout' | 'bus' | 'subway' | 'arrive';
  subText?: string;
}

export interface TransitInfo {
  busNumbers?: string[];
  metroLine?: string;
  departureStation?: string;
  arrivalStation?: string;
  stopsCount?: number;
  farePrice?: string;
  transfersCount?: number;
}

export interface PlaceItem {
  id: string;
  name: string;
  category?: string;
  rating: number;
  reviewsCount?: number;
  distanceKm: number;
  walkMin: number;
  driveMin: number;
  transitMin: number;
  priceLevel: 'Hamyonbop' | "O'rtacha" | 'Yuqori' | string;
  address: string;
  workingHours?: string;
  phone?: string;
  description?: string;
  lat: number;
  lng: number;
  // Yangi boyitilgan ma'lumotlar
  nearMetro?: string;
  nearLandmark?: string;
  taxiPrice?: string;
  transitInfo?: TransitInfo;
  isPopular?: boolean;
}

export interface RouteDetail {
  coordinates: [number, number][]; // [lat, lng][]
  distanceKm: number;
  durationMin: number;
  steps: RouteStep[];
  transitInfo?: TransitInfo;
}

export interface RouteInfo {
  originName: string;
  destinationName: string;
  modes: {
    type: 'walk' | 'drive' | 'transit';
    label: string;
    duration: string;
    distance: string;
  }[];
}

export interface StructuredAiData {
  intent?: 'places_found' | 'location_needed' | 'directions' | 'conversation';
  detectedLocation?: string;
  places?: PlaceItem[];
  route?: RouteInfo;
  selectedPlaceForNavigation?: PlaceItem;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  data?: StructuredAiData;
  isLoading?: boolean;
}

export interface LocationState {
  lat: number;
  lng: number;
  address: string;
  city?: string;
  region?: string;
  isGps: boolean;
}
