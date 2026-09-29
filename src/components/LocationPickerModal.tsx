import React, { useState } from 'react';
import { LocationState } from '../types';
import { X, MapPin, Search, Navigation, Check, Loader2 } from 'lucide-react';

interface LocationPickerModalProps {
  currentLocation: LocationState | null;
  onSelectLocation: (loc: LocationState) => void;
  onClose: () => void;
}

// Representative coordinates for Uzbekistan regions and key districts/cities
const UZBEKISTAN_REGIONS = [
  { name: 'Toshkent shahri', lat: 41.2995, lng: 69.2401, sub: 'Amir Temur xiyoboni, Chilonzor, Yunusobod' },
  { name: 'Samarqand viloyati', lat: 39.6542, lng: 66.9597, sub: 'Samarqand sh., Urgut, Kattaqo‘rg‘on, Toyloq' },
  { name: 'Buxoro viloyati', lat: 39.7681, lng: 64.4556, sub: 'Buxoro sh., G‘ijduvon, Vobkent, Qorako‘l' },
  { name: 'Navoiy viloyati', lat: 40.1034, lng: 65.3789, sub: 'Navoiy sh., Karmana, Zarafshon, Qiziltepa' },
  { name: 'Andijon viloyati', lat: 40.7821, lng: 72.3442, sub: 'Andijon sh., Asaka, Xonobod, Shahrixon' },
  { name: 'Farg‘ona viloyati', lat: 40.3842, lng: 71.7843, sub: 'Farg‘ona sh., Qo‘qon, Marg‘ilon, Rishton' },
  { name: 'Namangan viloyati', lat: 40.9983, lng: 71.6726, sub: 'Namangan sh., Chust, Pop, Kosonsoy' },
  { name: 'Qashqadaryo viloyati', lat: 38.8606, lng: 65.7891, sub: 'Qarshi sh., Shahrisabz, Kitob, Koson' },
  { name: 'Surxondaryo viloyati', lat: 37.2242, lng: 67.2783, sub: 'Termiz sh., Denov, Sherobod, Boysun' },
  { name: 'Xorazm viloyati', lat: 41.5562, lng: 60.6313, sub: 'Urganch sh., Xiva, Xonqa, Shovot' },
  { name: 'Qoraqalpog‘iston Resp.', lat: 42.4619, lng: 59.6166, sub: 'Nukus sh., Beruniy, To‘rtko‘l, Mo‘ynoq' },
  { name: 'Jizzax viloyati', lat: 40.1158, lng: 67.8422, sub: 'Jizzax sh., Zomin, Do‘stlik, G‘allaorol' },
  { name: 'Sirdaryo viloyati', lat: 40.4939, lng: 68.7844, sub: 'Guliston sh., Shirin, Yangiyer, Sayxunobod' },
  { name: 'Toshkent viloyati', lat: 41.2721, lng: 69.2144, sub: 'Chirchiq, Olmaliq, Angren, Bo‘stonliq, Parkent' },
];

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  currentLocation,
  onSelectLocation,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRequestingGps, setIsRequestingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch('/api/forward-geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGpsDetect = () => {
    if (!navigator.geolocation) {
      setGpsError('Brauzeringizda geolokatsiya qo‘llab-quvvatlanmaydi');
      return;
    }

    setIsRequestingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch('/api/reverse-geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: latitude, lng: longitude }),
          });
          const data = await res.json();
          onSelectLocation({
            lat: latitude,
            lng: longitude,
            address: data.address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            city: data.city,
            region: data.region,
            isGps: true,
          });
          onClose();
        } catch (e) {
          onSelectLocation({
            lat: latitude,
            lng: longitude,
            address: `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            isGps: true,
          });
          onClose();
        } finally {
          setIsRequestingGps(false);
        }
      },
      (err) => {
        setIsRequestingGps(false);
        if (err.code === 1) {
          setGpsError('Lokatsiyaga ruxsat berilmadi. Quyidagi ro‘yxatdan yoki qidiruv orqali tanlashingiz mumkin.');
        } else {
          setGpsError('GPS koordinatani aniqlab bo‘lmadi. Iltimos, manzilni yozing.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-neutral-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-100 bg-neutral-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-neutral-900 leading-tight">Joylashuvni tanlash</h3>
              <p className="text-xs text-neutral-500">Butun O‘zbekiston bo‘yicha aniqlanadi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-neutral-200/60 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPS Quick Action */}
        <div className="p-4 border-b border-neutral-100 space-y-3 bg-white">
          <button
            onClick={handleGpsDetect}
            disabled={isRequestingGps}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/70 text-emerald-900 transition-all font-medium text-sm group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                {isRequestingGps ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
              </div>
              <div className="text-left">
                <div className="font-semibold text-emerald-950">
                  {isRequestingGps ? 'GPS orqali aniqlanmoqda...' : 'Hozirgi GPS lokatsiyamni olish'}
                </div>
                <div className="text-xs text-emerald-700">Brauzer orqali aniq koordinatalar</div>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-white text-emerald-700 rounded-lg shadow-2xs border border-emerald-100">
              Aniq
            </span>
          </button>

          {gpsError && (
            <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              ⚠️ {gpsError}
            </p>
          )}

          {/* Search Input for street/mahalla/district */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Shahar, tuman, ko‘cha yoki mahalla nomi..."
              className="w-full pl-10 pr-20 py-2.5 rounded-2xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Qidirish'}
            </button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-1 pt-1 max-h-40 overflow-y-auto">
              <p className="text-xs font-semibold text-neutral-400 px-1">Topilgan manzillar:</p>
              {searchResults.map((res, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onSelectLocation({
                      lat: res.lat,
                      lng: res.lng,
                      address: res.name.split(',').slice(0, 3).join(','),
                      isGps: false,
                    });
                    onClose();
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-neutral-100 text-xs text-neutral-800 flex items-start gap-2 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{res.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Uzbekistan Regions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-1 mb-2">
            O‘zbekiston hududlari (Viloyat va tumanlar)
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {UZBEKISTAN_REGIONS.map((region) => {
              const isSelected =
                currentLocation &&
                Math.abs(currentLocation.lat - region.lat) < 0.05 &&
                Math.abs(currentLocation.lng - region.lng) < 0.05;

              return (
                <button
                  key={region.name}
                  onClick={() => {
                    onSelectLocation({
                      lat: region.lat,
                      lng: region.lng,
                      address: region.name,
                      city: region.name,
                      region: region.name,
                      isGps: false,
                    });
                    onClose();
                  }}
                  className={`p-3 rounded-2xl text-left border transition-all flex items-start justify-between ${
                    isSelected
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                      : 'bg-white hover:bg-neutral-50 border-neutral-200/80 text-neutral-800'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-xs flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      {region.name}
                    </div>
                    <div className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                      {region.sub}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
