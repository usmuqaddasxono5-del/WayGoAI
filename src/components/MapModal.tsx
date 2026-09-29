import React, { useEffect, useRef, useState } from 'react';
import { PlaceItem, LocationState, RouteDetail } from '../types';
import { fetchRealRoute } from '../utils/routing';
import { 
  X, Car, Footprints, Bus, Phone, ExternalLink, MapPin, 
  Maximize2, Minimize2, Copy, Check, Navigation, Zap, Layers
} from 'lucide-react';
import L from 'leaflet';

interface MapModalProps {
  place: PlaceItem | null;
  userLocation: LocationState | null;
  onClose: () => void;
}

type TravelMode = 'walk' | 'drive' | 'transit';
type MapLayerType = 'roadmap' | 'satellite' | 'terrain';

export const MapModal: React.FC<MapModalProps> = ({ place, userLocation, onClose }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);

  const [activeMode, setActiveMode] = useState<TravelMode>('walk');
  const [mapLayer, setMapLayer] = useState<MapLayerType>('roadmap');
  const [routeDetail, setRouteDetail] = useState<RouteDetail | null>(null);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);

  // Default coordinates fallback if user has not sent GPS yet
  const originLat = userLocation?.lat ?? (place ? place.lat - 0.012 : 41.311081);
  const originLng = userLocation?.lng ?? (place ? place.lng - 0.012 : 69.240562);
  const destLat = place?.lat ?? 41.311081;
  const destLng = place?.lng ?? 69.240562;

  // 1. Fetch road route whenever mode or place changes
  useEffect(() => {
    if (!place) return;
    let isCancelled = false;

    setLoadingRoute(true);
    fetchRealRoute(originLat, originLng, destLat, destLng, activeMode, place.transitInfo)
      .then((detail) => {
        if (!isCancelled) {
          setRouteDetail(detail);
          setLoadingRoute(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load route:', err);
        if (!isCancelled) setLoadingRoute(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [place, activeMode, originLat, originLng, destLat, destLng]);

  // 2. Initialize Leaflet map with real Google Maps tiles
  useEffect(() => {
    if (!place || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView([destLat, destLng], 14);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Google Maps Tile Server URLs
      const tileUrl =
        mapLayer === 'satellite'
          ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
          : mapLayer === 'terrain'
          ? 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}'
          : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom: 20,
        attribution: '&copy; Google Maps',
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // User location marker
      if (userLocation) {
        const userIcon = L.divIcon({
          className: 'custom-user-marker',
          html: `
            <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; width: 28px; height: 28px; background: rgba(26, 115, 232, 0.3); border-radius: 50%;"></div>
              <div style="width: 16px; height: 16px; background: #1a73e8; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        L.marker([originLat, originLng], { icon: userIcon })
          .addTo(map)
          .bindPopup(`<b>Sizning joyingiz</b><br>${userLocation.address || 'Hozirgi joyingiz'}`);
      }

      // Google Maps Red Pin for Destination
      const destIcon = L.divIcon({
        className: 'custom-dest-marker',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="background: #ea4335; color: #ffffff; padding: 3px 8px; border-radius: 8px; font-size: 11px; font-weight: 700; box-shadow: 0 2px 8px rgba(0,0,0,0.3); white-space: nowrap; margin-bottom: 2px; border: 1.5px solid #ffffff;">
              ${place.name.length > 20 ? place.name.slice(0, 18) + '...' : place.name}
            </div>
            <svg width="34" height="34" viewBox="0 0 48 48" fill="none" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));">
              <path d="M24 4C15.16 4 8 11.16 8 20C8 31.2 24 44 24 44C24 44 40 31.2 40 20C40 11.16 32.84 4 24 4Z" fill="#EA4335" />
              <circle cx="24" cy="20" r="7" fill="#FFFFFF" />
            </svg>
          </div>
        `,
        iconSize: [120, 60],
        iconAnchor: [60, 56],
      });

      L.marker([destLat, destLng], { icon: destIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 13px;">
            <strong style="font-size: 14px; color: #0f172a;">${place.name}</strong><br/>
            <span style="color: #64748b;">${place.address}</span><br/>
            <span style="font-size: 11px; color: #ea4335; font-weight: 600;">GPS: ${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}</span>
          </div>
        `)
        .openPopup();

      mapInstanceRef.current = map;
    } catch (err) {
      console.error('Map init error:', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [place, originLat, originLng, destLat, destLng, userLocation, mapLayer]);

  // 3. Draw Route Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !routeDetail) return;

    if (polylineLayerRef.current) {
      map.removeLayer(polylineLayerRef.current);
      polylineLayerRef.current = null;
    }

    const color = activeMode === 'walk' ? '#059669' : activeMode === 'drive' ? '#1a73e8' : '#d97706';
    const dashArray = activeMode === 'walk' ? '6, 8' : undefined;

    const latLngs = routeDetail.coordinates.map((c) => [c[0], c[1]] as [number, number]);

    if (latLngs.length > 0) {
      const poly = L.polyline(latLngs, {
        color,
        weight: activeMode === 'walk' ? 5 : 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray,
      }).addTo(map);

      polylineLayerRef.current = poly;

      map.fitBounds(poly.getBounds(), {
        padding: [50, 50],
        maxZoom: 16,
      });
    }
  }, [routeDetail, activeMode]);

  // Direct Google Maps opener with fallback
  const handleOpenExternalGoogleMaps = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!place) return;

    const gMode = activeMode === 'walk' ? 'walking' : activeMode === 'transit' ? 'transit' : 'driving';
    const url = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${place.lat},${place.lng}&travelmode=${gMode}`;

    try {
      const newWin = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
        window.open(url, '_top');
      }
    } catch (err) {
      window.location.href = url;
    }
  };

  const handleCopyCoords = () => {
    if (!place) return;
    const coordsStr = `${place.lat.toFixed(6)}, ${place.lng.toFixed(6)}`;
    navigator.clipboard?.writeText(coordsStr);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  if (!place) return null;

  const currentDuration =
    activeMode === 'walk'
      ? `${place.walkMin} daqiqa`
      : activeMode === 'drive'
      ? `${place.driveMin} daqiqa`
      : `${place.transitMin} daqiqa`;

  const totalDistance = routeDetail?.distanceKm ?? place.distanceKm;

  const gMode = activeMode === 'walk' ? 'walking' : activeMode === 'transit' ? 'transit' : 'driving';
  const directGoogleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${place.lat},${place.lng}&travelmode=${gMode}`;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-neutral-950/75 backdrop-blur-md animate-in fade-in duration-200 ${
        isFullscreen ? 'p-0' : ''
      }`}
    >
      <div
        className={`relative w-full bg-white shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? 'h-full max-w-none rounded-none'
            : 'max-w-3xl rounded-3xl max-h-[92vh] border border-neutral-200/90'
        }`}
      >
        {/* HEADER: GOOGLE MAPS BRANDING, PLACE NAME & EXACT LOCATION */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b border-neutral-100 bg-neutral-50/90 backdrop-blur-sm">
          <div className="flex items-center gap-3 min-w-0">
            {/* Google Maps Logo Icon */}
            <div className="w-10 h-10 rounded-2xl bg-white shadow-xs border border-neutral-200/80 flex items-center justify-center shrink-0">
              <svg width="22" height="22" viewBox="0 0 48 48" fill="none">
                <path d="M24 4C15.16 4 8 11.16 8 20C8 31.2 24 44 24 44C24 44 40 31.2 40 20C40 11.16 32.84 4 24 4Z" fill="#EA4335" />
                <circle cx="24" cy="20" r="7" fill="#FFFFFF" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-neutral-900 leading-tight truncate">
                  {place.name}
                </h3>
                <span className="text-[11px] bg-blue-50 text-[#1a73e8] font-bold px-2 py-0.5 rounded-full border border-blue-200/60">
                  Google Maps
                </span>
                {place.rating ? (
                  <span className="text-xs bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                    ⭐ {place.rating}
                  </span>
                ) : null}
              </div>

              {/* Exact address & GPS Coordinates */}
              <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1 flex-wrap">
                <span className="line-clamp-1">{place.address}</span>
                <span className="text-neutral-300">·</span>
                <button
                  onClick={handleCopyCoords}
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors"
                  title="GPS koordinatani nusxalash"
                >
                  {copiedCoords ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{place.lat.toFixed(4)}, {place.lng.toFixed(4)}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {/* Layer switcher */}
            <button
              onClick={() => setMapLayer(mapLayer === 'roadmap' ? 'satellite' : 'roadmap')}
              className="w-9 h-9 rounded-full hover:bg-neutral-200/70 text-neutral-600 flex items-center justify-center transition-colors"
              title={mapLayer === 'roadmap' ? 'Sun’iy yo‘ldosh rejimiga o‘tish' : 'Oddiy xarita rejimiga o‘tish'}
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="w-9 h-9 rounded-full hover:bg-neutral-200/70 text-neutral-600 flex items-center justify-center transition-colors"
              title={isFullscreen ? 'Kichiklashtirish' : 'Katta ekran'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-neutral-200/70 hover:bg-neutral-300/80 text-neutral-700 flex items-center justify-center transition-colors"
              title="Yopish"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TRAVEL MODE SWITCHER (Piyoda / Mashina / Avtobus) */}
        <div className="px-3 sm:px-5 py-2.5 bg-white border-b border-neutral-100 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2 p-1 bg-neutral-100 rounded-2xl w-full sm:w-auto">
            {/* Walk */}
            <button
              onClick={() => setActiveMode('walk')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeMode === 'walk'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Footprints className="w-4 h-4 text-emerald-600" />
              <span>Piyoda</span>
              <span className="text-[11px] font-normal opacity-85">{place.walkMin} daq</span>
            </button>

            {/* Drive */}
            <button
              onClick={() => setActiveMode('drive')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeMode === 'drive'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Car className="w-4 h-4 text-blue-600" />
              <span>Mashinada</span>
              <span className="text-[11px] font-normal opacity-85">{place.driveMin} daq</span>
            </button>

            {/* Public Transit / Metro / Bus */}
            <button
              onClick={() => setActiveMode('transit')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeMode === 'transit'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Bus className="w-4 h-4 text-amber-600" />
              <span>Avtobus / Metro</span>
              <span className="text-[11px] font-normal opacity-85">{place.transitMin} daq</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-neutral-500">
            <span className="bg-neutral-100 px-3 py-1.5 rounded-xl border border-neutral-200/50">
              Masofa: <strong className="text-neutral-900">{totalDistance} km</strong>
            </span>
          </div>
        </div>

        {/* MAP CONTAINER (POWERED BY REAL GOOGLE MAPS TILES) */}
        <div className="relative flex-1 min-h-[340px] sm:min-h-[460px] bg-neutral-100 overflow-hidden">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* LOADING PILL */}
          {loadingRoute && (
            <div className="absolute top-3 right-3 z-[1001] bg-white/95 px-3 py-1.5 rounded-xl shadow-md border border-neutral-200 text-xs font-medium text-neutral-800 flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
              <span>Yo‘nalish yangilanmoqda...</span>
            </div>
          )}

          {/* TRANSIT INFO BANNER IF ACTIVE */}
          {activeMode === 'transit' && (
            <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md z-[1000] pointer-events-auto bg-amber-500/95 text-neutral-950 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-lg border border-amber-400/80 text-xs flex flex-col gap-1 animate-in fade-in duration-200">
              <div className="flex items-center justify-between font-bold">
                <div className="flex items-center gap-1.5">
                  <Bus className="w-4 h-4 text-neutral-900" />
                  <span>Jamoat transporti:</span>
                </div>
                <span className="bg-amber-900 text-amber-100 px-2 py-0.5 rounded-md text-[10px]">
                  Google Maps
                </span>
              </div>
              <div className="text-[11px] text-amber-950 leading-relaxed font-medium">
                {place.transitInfo?.busNumbers?.length ? (
                  <span>Avtobuslar: <strong>{place.transitInfo.busNumbers.join(', ')}</strong></span>
                ) : (
                  <span>Shahar avtobusi yoki eng yaqin metro yo‘nalishi</span>
                )}
                {place.nearMetro && <span> · Metro: <strong>{place.nearMetro}</strong></span>}
              </div>
            </div>
          )}

          {/* MODE METRICS PILL */}
          <div className="absolute bottom-3 left-3 z-[1000] flex items-center gap-2">
            <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-neutral-200 text-xs flex items-center gap-1.5 text-neutral-800 font-medium">
              <Navigation className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>Google Maps: <strong>{totalDistance} km</strong> ({currentDuration})</span>
            </div>

            {activeMode === 'drive' && place.taxiPrice && (
              <div className="bg-blue-50/95 text-blue-900 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-blue-200/80 text-xs flex items-center gap-1.5 font-medium">
                <Zap className="w-3.5 h-3.5 text-blue-600" />
                <span>Taksi: {place.taxiPrice}</span>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM BAR: DIRECT GOOGLE MAPS APP LAUNCH */}
        <div className="p-3 sm:p-4 bg-white border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {/* Phone button if available */}
            {place.phone && (
              <a
                href={`tel:${place.phone}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-medium transition-colors"
                title="Qo‘ng‘iroq qilish"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{place.phone}</span>
              </a>
            )}
          </div>

          {/* Direct Launch Google Maps Button */}
          <div className="flex items-center gap-2 ml-auto">
            <a
              href={directGoogleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpenExternalGoogleMaps}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#0d47a1] text-white text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg cursor-pointer"
              title="Google Maps ilovasida yoki saytida to‘liq ochish"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                <path d="M24 4C15.16 4 8 11.16 8 20C8 31.2 24 44 24 44C24 44 40 31.2 40 20C40 11.16 32.84 4 24 4Z" fill="#FFFFFF" />
                <circle cx="24" cy="20" r="7" fill="#1a73e8" />
              </svg>
              <span>Google Maps ilovasida ochish</span>
              <ExternalLink className="w-3.5 h-3.5 text-blue-100" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
