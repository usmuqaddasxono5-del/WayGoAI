import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  MapPin,
  Mic,
  MicOff,
  Compass,
  Navigation,
  Sparkles,
  Volume2,
  VolumeX,
  RotateCcw,
  Loader2,
  AlertCircle,
  Footprints,
  Car,
  Bus,
  Map as MapIcon,
  Globe2,
} from 'lucide-react';
import { PlaceCard } from './components/PlaceCard';
import { MapModal } from './components/MapModal';
import { LocationPickerModal } from './components/LocationPickerModal';
import { ChatMessage, PlaceItem, LocationState } from './types';
import { playTtsAudio, stopTtsAudio, playBrowserSpeech } from './utils/audio';

// Har qanday inson borishi mumkin bo'lgan universal tezkor namunalar
const QUICK_PROMPTS = [
  'Samarqand Registon maydoniga qanday boriladi?',
  'Toshkent City Mallga avtobus yoki metro bilan yo‘l',
  'Menga eng yaqin metro bekati qayerda?',
  'Chorvoq suv omboriga marshrut',
  'Yunusobod tumanidagi DXM (Yagona darcha)',
  'Yaqinroqdan yaxshi va arzon ovqatlanish joyi',
  'Toshkent xalqaro aeroportiga borish',
  'Yaqinimda 24 soat ishlaydigan dorixona bormi?',
];

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlaceForRoute, setSelectedPlaceForRoute] = useState<PlaceItem | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationState | null>(null);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [playingTtsId, setPlayingTtsId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Polite GPS fetch on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await fetch('/api/reverse-geocode', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lat: latitude, lng: longitude }),
            });
            const data = await res.json();
            setUserLocation({
              lat: latitude,
              lng: longitude,
              address: data.address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              city: data.city,
              region: data.region,
              isGps: true,
            });
          } catch (e) {
            setUserLocation({
              lat: latitude,
              lng: longitude,
              address: `GPS: ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
              isGps: true,
            });
          }
        },
        () => {
          // If denied, we keep dynamic fallback
        },
        { timeout: 8000 }
      );
    }
  }, []);

  // Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'uz-UZ';

      recognition.onstart = () => {
        setIsListeningVoice(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInputValue(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListeningVoice(false);
        if (event.error === 'not-allowed') {
          setSpeechError('Mikrofonga ruxsat berilmadi.');
        } else if (event.error !== 'no-speech') {
          setSpeechError('Ovozni eshitib bo‘lmadi, iltimos qayta gapiring.');
        }
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Kechirasiz, brauzeringizda ovozli kiritish qo‘llab-quvvatlanmaydi.');
      return;
    }

    if (isListeningVoice) {
      recognitionRef.current.stop();
      setIsListeningVoice(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Error starting recognition:', e);
      }
    }
  };

  // Play / Stop TTS
  const handleToggleTts = async (msgId: string, text: string) => {
    if (playingTtsId === msgId) {
      stopTtsAudio();
      setPlayingTtsId(null);
      return;
    }

    try {
      setPlayingTtsId(msgId);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.audio) {
        await playTtsAudio(data.audio);
      } else {
        await playBrowserSpeech(text);
      }
    } catch (err) {
      console.warn('TTS server error, falling back to browser speech:', err);
      try {
        await playBrowserSpeech(text);
      } catch (speechErr) {
        console.error('Speech synthesis error:', speechErr);
      }
    } finally {
      setPlayingTtsId(null);
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    setInputValue('');
    if (isListeningVoice && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: newHistory.map((m) => ({ role: m.role, content: m.content })),
          location: userLocation
            ? {
                lat: userLocation.lat,
                lng: userLocation.lng,
                address: userLocation.address,
                city: userLocation.city,
                region: userLocation.region,
              }
            : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Serverdan javob olishda xatolik');
      }

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.text || 'Kechirasiz, maʼlumot topilmadi.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data: data.data || undefined,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Uzr, internet aloqasida yoki serverda nosozlik bo‘ldi. Iltimos, qayta yuboring.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleShareGpsInChat = () => {
    if (!navigator.geolocation) {
      setShowLocationPicker(true);
      return;
    }

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
          const newLoc: LocationState = {
            lat: latitude,
            lng: longitude,
            address: data.address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            city: data.city,
            region: data.region,
            isGps: true,
          };
          setUserLocation(newLoc);
          handleSendMessage(`Mana mening aniq lokatsiyam: ${newLoc.address}`);
        } catch (e) {
          const newLoc: LocationState = {
            lat: latitude,
            lng: longitude,
            address: `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            isGps: true,
          };
          setUserLocation(newLoc);
          handleSendMessage(`Mana mening GPS koordinatalarim: ${latitude}, ${longitude}`);
        }
      },
      () => {
        setShowLocationPicker(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const resetChat = () => {
    stopTtsAudio();
    setMessages([]);
    setInputValue('');
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50 text-neutral-900">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/70">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          
          {/* Logo & Slogan */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/30">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-neutral-900">
                  WayGoAI
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-neutral-500 font-medium leading-none">
                Butun O‘zbekiston va dunyo bo‘yicha aqlli navigator
              </p>
            </div>
          </div>

          {/* Right Action: Dynamic Location Badge & Reset */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLocationPicker(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                userLocation
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
              }`}
              title="Joylashuvni o‘zgartirish yoki tekshirish"
            >
              <div className="relative flex items-center justify-center">
                <MapPin className={`w-3.5 h-3.5 ${userLocation ? 'text-emerald-600' : 'text-neutral-400'}`} />
                {userLocation && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </div>
              <span className="max-w-[120px] sm:max-w-[180px] truncate">
                {userLocation ? userLocation.city || userLocation.address : 'Lokatsiya'}
              </span>
            </button>

            {messages.length > 0 && (
              <button
                onClick={resetChat}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition-colors"
                title="Yangi suhbat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col max-w-3xl w-full mx-auto px-4 pb-28 pt-4">
        
        {/* Empty state: Hero view */}
        {messages.length === 0 ? (
          <div className="my-auto py-8 text-center space-y-6 animate-in fade-in duration-300">
            
            <div className="space-y-2 max-w-md mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200/60 mb-2">
                <Globe2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Xaritadagi har qanday manzil & jonli navigator</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                Bugun sizga qayerga borish kerak?
              </h2>
              <p className="text-sm text-neutral-500">
                Istalgan joy nomini ayting: tarixiy obidalar, ziyoratgohlar, metro, aeroport, dam olish maskanlari, do‘kon yoki istalgan manzil. WayGoAI piyoda, mashina va jamoat transportida eng aniq yo‘lni chizib beradi.
              </p>
            </div>

            {/* Central large input in hero */}
            <div className="max-w-xl mx-auto bg-white rounded-3xl p-2 shadow-lg shadow-neutral-200/60 border border-neutral-200/80 transition-all focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Masalan: Registon maydoniga qanday boriladi..."
                  className="flex-1 px-4 py-3 bg-transparent text-sm sm:text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                  autoFocus
                />

                <div className="flex items-center gap-1 pr-1">
                  {/* Location button */}
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                      userLocation
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                    title={userLocation ? userLocation.address : 'Lokatsiyani yuborish'}
                  >
                    <MapPin className="w-5 h-5" />
                  </button>

                  {/* Voice button */}
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                      isListeningVoice
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                    title="Ovoz orqali gapirish"
                  >
                    {isListeningVoice ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {/* Send button */}
                  <button
                    type="submit"
                    disabled={!inputValue.trim()}
                    className="w-11 h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white flex items-center justify-center shadow-sm transition-colors"
                    title="Yuborish"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Sample Prompts across ALL categories */}
            <div className="space-y-2.5 max-w-xl mx-auto pt-2">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Tezkor namunalar (istalgan birini bosing)
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="px-3.5 py-2 rounded-2xl bg-white hover:bg-emerald-50 text-neutral-700 hover:text-emerald-900 border border-neutral-200/80 hover:border-emerald-300 text-xs font-medium transition-all shadow-2xs text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Location status pill */}
            <div className="pt-4 flex items-center justify-center gap-2 text-xs text-neutral-500">
              <span className="flex items-center gap-1.5 bg-neutral-100/90 px-3 py-1.5 rounded-full border border-neutral-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {userLocation ? (
                  <span>Joylashuvingiz: <strong>{userLocation.address}</strong></span>
                ) : (
                  <span>GPS navigatsiya barcha viloyatlar, tumanlar va yo‘llarda ishlaydi</span>
                )}
              </span>
            </div>

          </div>
        ) : (
          /* Chat Conversation List */
          <div className="space-y-4 pt-2">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const places = msg.data?.places || [];
              const needsLocation =
                msg.data?.intent === 'location_needed' ||
                (!userLocation && msg.content.toLowerCase().includes('lokatsiya'));

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
                >
                  <div className={`max-w-[92%] sm:max-w-[85%] space-y-2`}>
                    
                    {/* Chat Bubble */}
                    <div
                      className={`p-4 rounded-3xl text-sm leading-relaxed ${
                        isUser
                          ? 'bg-emerald-600 text-white rounded-tr-xs shadow-xs'
                          : 'bg-white text-neutral-800 rounded-tl-xs border border-neutral-200/80 shadow-xs'
                      }`}
                    >
                      {/* Message Content */}
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Footer actions for assistant bubble */}
                      {!isUser && (
                        <div className="flex items-center justify-between gap-3 pt-2 mt-2 border-t border-neutral-100 text-[11px] text-neutral-400">
                          <span>{msg.timestamp}</span>
                          <button
                            onClick={() => handleToggleTts(msg.id, msg.content)}
                            className="inline-flex items-center gap-1 text-neutral-500 hover:text-emerald-600 transition-colors p-1 -m-1"
                            title="Ovoz orqali tinglash"
                          >
                            {playingTtsId === msg.id ? (
                              <>
                                <VolumeX className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                                <span className="text-emerald-600 font-medium">To‘xtatish</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span>Ovozda tinglash</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Interactive "Lokatsiyamni yuborish" button inside chat if needed */}
                    {needsLocation && !isUser && (
                      <div className="p-3 bg-emerald-50/90 rounded-2xl border border-emerald-200/80 flex items-center justify-between gap-3">
                        <div className="text-xs text-emerald-950 font-medium flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Yaqin joylarni va yo‘lni aniq chizish uchun lokatsiyangiz kerak</span>
                        </div>
                        <button
                          onClick={handleShareGpsInChat}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shrink-0 shadow-2xs transition-colors"
                        >
                          📍 Lokatsiyani yuborish
                        </button>
                      </div>
                    )}

                    {/* Route Info Card if direction was requested */}
                    {msg.data?.route && !isUser && (
                      <div className="bg-white rounded-2xl border border-neutral-200 p-3.5 space-y-2 text-xs">
                        <div className="font-semibold text-neutral-900 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Navigation className="w-4 h-4 text-emerald-600" />
                            <span>Navigatsiya va borish usullari:</span>
                          </div>
                          {places.length > 0 && (
                            <button
                              onClick={() => setSelectedPlaceForRoute(places[0])}
                              className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1"
                            >
                              <MapIcon className="w-3.5 h-3.5" />
                              <span>Xaritada ochish</span>
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {msg.data.route.modes?.map((mode, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                if (places.length > 0) setSelectedPlaceForRoute(places[0]);
                              }}
                              className="bg-neutral-50 hover:bg-neutral-100/80 cursor-pointer transition-colors p-2.5 rounded-xl border border-neutral-100 space-y-0.5"
                            >
                              <div className="flex items-center gap-1.5 font-medium text-neutral-800">
                                {mode.type === 'walk' ? (
                                  <Footprints className="w-3.5 h-3.5 text-emerald-600" />
                                ) : mode.type === 'drive' ? (
                                  <Car className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <Bus className="w-3.5 h-3.5 text-amber-600" />
                                )}
                                <span>{mode.label}</span>
                              </div>
                              <div className="font-bold text-neutral-900">{mode.duration}</div>
                              <div className="text-[11px] text-neutral-500">{mode.distance}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Places Cards List */}
                    {places.length > 0 && (
                      <div className="space-y-2.5 pt-1">
                        {places.map((place, idx) => (
                          <PlaceCard
                            key={place.id || idx}
                            place={place}
                            index={idx}
                            onShowRoute={(p) => setSelectedPlaceForRoute(p)}
                          />
                        ))}
                      </div>
                    )}

                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2 animate-in fade-in duration-150">
                <div className="bg-white p-3.5 rounded-3xl rounded-tl-xs border border-neutral-200/80 shadow-xs flex items-center gap-2 text-xs text-neutral-600">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Ma‘lumotlarni tahlil qilib, qidiryapman...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

      </main>

      {/* Sticky Bottom Input Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 p-3 sm:p-4">
        <div className="max-w-3xl mx-auto space-y-2">
          
          {/* Active Voice listening indicator */}
          {isListeningVoice && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                <span className="font-semibold">Ovozingizni eshityapman... Marhamat, gapiring</span>
              </div>
              <button
                onClick={() => {
                  if (recognitionRef.current) recognitionRef.current.stop();
                  setIsListeningVoice(false);
                }}
                className="text-[11px] font-bold underline"
              >
                To‘xtatish
              </button>
            </div>
          )}

          {speechError && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{speechError}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Input field */}
            <div className="flex-1 relative flex items-center bg-neutral-100/90 hover:bg-neutral-100 rounded-2xl border border-neutral-200/80 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Savolingiz yoki boradigan manzilingizni yozing..."
                className="w-full px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 bg-transparent focus:outline-none"
              />

              <div className="flex items-center gap-1 pr-1.5 shrink-0">
                {/* 📍 Lokatsiya button */}
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  className={`p-2 rounded-xl transition-colors ${
                    userLocation
                      ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/70'
                  }`}
                  title={userLocation ? `Joylashuv: ${userLocation.address}` : 'Lokatsiyani yuborish'}
                >
                  <MapPin className="w-5 h-5" />
                </button>

                {/* 🎤 Ovoz button */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`p-2 rounded-xl transition-all ${
                    isListeningVoice
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/70'
                  }`}
                  title="Ovozli qidiruv"
                >
                  {isListeningVoice ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* ➤ Yuborish button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              className="w-11 h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white flex items-center justify-center shadow-xs transition-colors shrink-0"
              title="Yuborish"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 ml-0.5" />
              )}
            </button>
          </div>

        </div>
      </footer>

      {/* Map Modal for "Yo'lni ko'rsatish" */}
      {selectedPlaceForRoute && (
        <MapModal
          place={selectedPlaceForRoute}
          userLocation={userLocation}
          onClose={() => setSelectedPlaceForRoute(null)}
        />
      )}

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPickerModal
          currentLocation={userLocation}
          onSelectLocation={(loc) => setUserLocation(loc)}
          onClose={() => setShowLocationPicker(false)}
        />
      )}

    </div>
  );
}
