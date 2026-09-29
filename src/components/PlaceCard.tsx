import React, { useState } from 'react';
import { PlaceItem } from '../types';
import { MapPin, Navigation, ChevronDown, ChevronUp, Phone, Clock, Info, Star, Bus, Zap, Copy, Check, ExternalLink } from 'lucide-react';

interface PlaceCardProps {
  place: PlaceItem;
  index: number;
  onShowRoute: (place: PlaceItem) => void;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place, index, onShowRoute }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCoords = (e: React.MouseEvent) => {
    e.stopPropagation();
    const coords = `${place.lat.toFixed(6)}, ${place.lng.toFixed(6)}`;
    navigator.clipboard?.writeText(coords);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs hover:shadow-md transition-all p-3.5 sm:p-4 space-y-3">
      {/* Title & Rating */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">
              {index + 1}
            </span>
            <h4 className="font-bold text-base text-neutral-900 leading-snug">{place.name}</h4>
          </div>
          {place.category && (
            <p className="text-[11px] text-neutral-500 font-medium pl-8">{place.category}</p>
          )}
        </div>

        {place.rating ? (
          <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/80 text-amber-800 text-xs font-semibold shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{place.rating}</span>
          </div>
        ) : null}
      </div>

      {/* EXACT LOCATION & COORDINATES (Lokatsiyasi) */}
      <div className="bg-neutral-50 rounded-xl p-2.5 border border-neutral-100 space-y-1.5">
        <div className="flex items-start gap-2 text-xs text-neutral-700">
          <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-neutral-900">Aniq manzil: </span>
            <span className="text-neutral-600">{place.address}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pl-6 pt-0.5 border-t border-neutral-200/40 text-[11px]">
          <span className="text-neutral-500">Koordinatalar:</span>
          <button
            onClick={handleCopyCoords}
            className="inline-flex items-center gap-1 font-mono text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
            title="GPS koordinatani nusxalash"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{place.lat.toFixed(4)}, {place.lng.toFixed(4)}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (Distance, Walk, Drive, Transit, Taxi) */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-600">
        <span className="inline-flex items-center gap-1 bg-neutral-100 px-2.5 py-1 rounded-xl font-medium text-neutral-800">
          📍 {place.distanceKm} km masofa
        </span>

        <span className="inline-flex items-center gap-1 bg-neutral-100 px-2.5 py-1 rounded-xl">
          🚶 {place.walkMin} daq
        </span>

        <span className="inline-flex items-center gap-1 bg-neutral-100 px-2.5 py-1 rounded-xl">
          🚗 {place.driveMin} daq
        </span>

        {place.transitMin && (
          <span className="inline-flex items-center gap-1 bg-neutral-100 px-2.5 py-1 rounded-xl">
            🚌 {place.transitMin} daq
          </span>
        )}

        {place.taxiPrice && (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200/60 px-2.5 py-1 rounded-xl font-medium">
            <Zap className="w-3 h-3 text-blue-600" />
            <span>Taksi: {place.taxiPrice}</span>
          </span>
        )}
      </div>

      {/* Transit / Metro hint badge if present */}
      {place.nearMetro && (
        <div className="flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200/60 px-2.5 py-1 rounded-xl">
          <Bus className="w-3 h-3 text-amber-600 shrink-0" />
          <span className="line-clamp-1">{place.nearMetro}</span>
        </div>
      )}

      {/* Action Buttons: Location & Route via Google Maps */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onShowRoute(place)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#0d47a1] text-white text-xs font-bold shadow-xs transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 48 48" fill="none">
            <path d="M24 4C15.16 4 8 11.16 8 20C8 31.2 24 44 24 44C24 44 40 31.2 40 20C40 11.16 32.84 4 24 4Z" fill="#FFFFFF" />
            <circle cx="24" cy="20" r="7" fill="#1a73e8" />
          </svg>
          <span>📍 Google Maps orqali yo‘lni ko‘rish</span>
        </button>

        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            const url = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
            try {
              const win = window.open(url, '_blank', 'noopener,noreferrer');
              if (!win || win.closed || typeof win.closed === 'undefined') {
                window.open(url, '_top');
              }
            } catch (err) {
              window.location.href = url;
            }
          }}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1a73e8] transition-colors border border-blue-200/60 font-semibold text-xs"
          title="Google Maps ilovasida to'liq ochish"
        >
          <span>Ilovada</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center justify-center gap-1 py-2.5 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold transition-colors"
        >
          <span>Batafsil</span>
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Collapsible Details */}
      {showDetails && (
        <div className="pt-2 border-t border-neutral-100 space-y-2 text-xs text-neutral-600 animate-in fade-in duration-150">
          {place.description && (
            <div className="flex items-start gap-1.5 bg-neutral-50 p-2.5 rounded-xl">
              <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
              <p>{place.description}</p>
            </div>
          )}

          {place.transitInfo && (
            <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/50 space-y-1">
              <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                <Bus className="w-3.5 h-3.5 text-amber-600" />
                <span>Jamoat transporti:</span>
              </div>
              <div className="text-[11px] text-amber-800">
                {place.transitInfo.busNumbers?.length ? `Avtobuslar: ${place.transitInfo.busNumbers.join(', ')}` : ''}
                {place.transitInfo.stopsCount ? ` · ~${place.transitInfo.stopsCount} ta bekat` : ''}
                {place.transitInfo.farePrice ? ` · Chipta: ${place.transitInfo.farePrice}` : ''}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {place.workingHours && (
              <div className="flex items-center gap-1.5 text-neutral-600 bg-neutral-50 p-2 rounded-xl">
                <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Ish vaqti: <strong>{place.workingHours}</strong></span>
              </div>
            )}

            {place.phone && (
              <a
                href={`tel:${place.phone}`}
                className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 p-2 rounded-xl transition-colors font-medium"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{place.phone}</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
