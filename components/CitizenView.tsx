
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WasteContainer, ContainerStatus, CitizenProfile, Language, Announcement, AnnouncementReactionKind } from '../types';
import { Search, MapPin, Navigation, Loader2, ChevronDown, LayoutGrid, MessageSquarePlus, Languages, X, Megaphone, ThumbsUp, ThumbsDown } from 'lucide-react';
import { translations } from '../translations';
import { normalizeMozambiquePhone } from '../utils/mozambiquePhone';

interface CitizenViewProps {
  containers: WasteContainer[];
  citizenProfile: CitizenProfile;
  supportNumber: string;
  announcements: Announcement[];
  onAnnouncementReaction: (announcementId: string, reaction: AnnouncementReactionKind | null) => void;
  onReport: (id: string, citizen?: CitizenProfile) => void;
  lang: Language;
  onLangChange: (lang: Language) => void;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const CitizenView: React.FC<CitizenViewProps> = ({ containers, citizenProfile, supportNumber, announcements, onAnnouncementReaction, onReport, lang, onLangChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [visibleCount, setVisibleCount] = useState(4); // Inicialmente 4 para o grid 2x2
  const [expandedImage, setExpandedImage] = useState<{ url: string; alt: string } | null>(null);
  const hiddenAnnouncementsKey = `limpa_gondola_hidden_announcements_${normalizeMozambiquePhone(citizenProfile.contact)}`;
  const [hiddenAnnouncementIds, setHiddenAnnouncementIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(hiddenAnnouncementsKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const t = translations[lang];

  const formatDistance = useCallback((meters: number): string => {
    if (meters < 50) return t.here;
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  }, [t]);

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    handleGetLocation();
  }, [handleGetLocation]);

  useEffect(() => {
    if (!expandedImage) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpandedImage(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedImage]);

  const sortedAndFiltered = useMemo(() => {
    const withDistance = containers.map(c => {
      let distance = Infinity;
      if (userLocation && c.latitude && c.longitude) {
        distance = calculateDistance(userLocation.lat, userLocation.lon, c.latitude, c.longitude);
      }
      return { ...c, distance };
    });

    const filtered = withDistance.filter(c => 
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.neighborhood.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.avenue.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      if (userLocation && a.distance !== b.distance) return a.distance - b.distance;
      if (b.reportCount !== a.reportCount) return b.reportCount - a.reportCount;
      return a.id.localeCompare(b.id);
    });
  }, [containers, searchTerm, userLocation]);

  const displayedContainers = sortedAndFiltered.slice(0, visibleCount);
  const hasMore = sortedAndFiltered.length > visibleCount;
  const visibleAnnouncements = announcements.filter(announcement =>
    new Date(announcement.expiresAt).getTime() > Date.now()
    && !hiddenAnnouncementIds.includes(announcement.id)
  );

  const hideAnnouncement = (announcementId: string) => {
    setHiddenAnnouncementIds(previous => {
      const updated = [...previous, announcementId];
      try {
        localStorage.setItem(hiddenAnnouncementsKey, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {visibleAnnouncements.length > 0 && (
        <section aria-label="Anúncios da central" className="space-y-3">
          {visibleAnnouncements.map(announcement => {
            const myReaction = announcement.reactions.find(reaction =>
              normalizeMozambiquePhone(reaction.contact) === normalizeMozambiquePhone(citizenProfile.contact)
            )?.reaction;
            const likes = announcement.reactions.filter(reaction => reaction.reaction === 'like').length;
            const dislikes = announcement.reactions.filter(reaction => reaction.reaction === 'dislike').length;

            return (
              <article key={announcement.id} className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
                <div className="flex items-start gap-3 p-4">
                  <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h2 className="text-xs font-black uppercase text-amber-900">Anúncio da central</h2>
                      <time className="text-[10px] font-semibold text-amber-800/70">
                        {new Date(announcement.createdAt).toLocaleString('pt-MZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-relaxed text-slate-800">{announcement.message}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        aria-pressed={myReaction === 'like'}
                        onClick={() => onAnnouncementReaction(announcement.id, myReaction === 'like' ? null : 'like')}
                        className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors ${myReaction === 'like' ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-800 hover:bg-emerald-100'}`}
                      >
                        <ThumbsUp className="h-4 w-4" /> Gostei <span>{likes}</span>
                      </button>
                      <button
                        type="button"
                        aria-pressed={myReaction === 'dislike'}
                        onClick={() => onAnnouncementReaction(announcement.id, myReaction === 'dislike' ? null : 'dislike')}
                        className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-colors ${myReaction === 'dislike' ? 'bg-rose-700 text-white' : 'bg-white text-rose-800 hover:bg-rose-100'}`}
                      >
                        <ThumbsDown className="h-4 w-4" /> Não gostei <span>{dislikes}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => hideAnnouncement(announcement.id)}
                        aria-label="Apagar anúncio desta tela"
                        title="Apagar anúncio desta tela"
                        className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* Busca Compacta */}
      <div className="flex gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-3 py-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold shadow-sm focus:border-yellow-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setVisibleCount(4); // Reseta ao buscar
            }}
          />
        </div>
        <button
          onClick={() => onLangChange(lang === 'pt' ? 'en' : 'pt')}
          className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-center shadow-md hover:bg-yellow-500 hover:text-slate-900 transition-all group"
          title={t.switchLang}
        >
          <Languages className="w-4 h-4 group-hover:scale-110 transition-transform" />
        </button>
        <button
          onClick={handleGetLocation}
          className={`flex items-center justify-center p-3 rounded-xl transition-all active:scale-90 shadow-md ${userLocation ? 'bg-yellow-500 text-slate-900' : 'bg-slate-900 text-white'}`}
        >
          {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
        </button>
        <a 
          href={`tel:${supportNumber}`}
          className="bg-slate-900 text-white px-4 py-3 rounded-xl flex items-center gap-2 shadow-md hover:bg-yellow-500 hover:text-slate-900 transition-all group"
          title={`${t.supportTitle}: ${supportNumber}`}
        >
          <MessageSquarePlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black tracking-widest uppercase">{supportNumber}</span>
        </a>
      </div>

      {/* Grid 2x2 para Mobile / 4 colunas Desktop - Compacto para caber mais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AnimatePresence mode="popLayout">
          {displayedContainers.map((container) => {
            const isFull = container.status === ContainerStatus.ALERT;
            
            return (
              <motion.div 
                layout
                key={container.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -4 }}
                className={`bg-white rounded-[1.5rem] p-3 border-2 transition-all relative flex flex-col justify-between group overflow-hidden min-h-[220px] ${
                  isFull ? 'border-orange-200 bg-orange-50/10' : 'border-slate-100'
                } shadow-md hover:shadow-lg`}
              >
              {container.imageUrl && (
                <button
                  type="button"
                  onClick={() => setExpandedImage({ url: container.imageUrl!, alt: `Contentor ${container.id}` })}
                  aria-label={`Ampliar imagem do contentor ${container.id}`}
                  className="mb-2 block w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
                >
                  <img src={container.imageUrl} alt={`Contentor ${container.id}`} className="h-20 w-full object-cover" />
                </button>
              )}

              {/* ID e Badge */}
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-black text-slate-900 tracking-tighter bg-yellow-100 px-1.5 py-0.5 rounded-lg w-fit">{container.id}</span>
                  <div className="flex flex-wrap gap-0.5">
                    <span className={`text-[7px] font-black px-1 py-0.5 rounded-md uppercase tracking-widest ${
                      isFull ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {isFull ? t.pending : t.collected}
                    </span>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${isFull ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]'}`} />
              </div>

              {/* Centro: Info principal */}
              <div className="flex flex-col items-center flex-grow justify-center py-2">
                <div className="text-center w-full px-1 space-y-1">
                  <h4 className="text-xs font-black text-slate-900 uppercase leading-tight truncate">{container.neighborhood}</h4>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{t.block}: {container.block}</p>
                    <p className="text-[9px] font-bold text-slate-400 italic line-clamp-1">{container.referencePoint}</p>
                  </div>
                  {container.distance !== Infinity && (
                    <div className="mt-1">
                      <span className="text-[7px] font-black text-amber-700 uppercase bg-yellow-100 px-2 py-0.5 rounded-full inline-block tracking-widest">
                        {formatDistance(container.distance)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botão de Ação - Compacto */}
              <button
                onClick={() => onReport(container.id, citizenProfile)}
                className={`w-full py-2.5 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all active:scale-95 shadow-md ${
                  isFull 
                    ? 'bg-orange-600 text-white shadow-orange-200 hover:bg-orange-700' 
                    : 'bg-yellow-500 text-slate-900 shadow-yellow-200 hover:bg-yellow-400'
                }`}
              >
                {isFull ? t.reinforce : t.report}
              </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Controle de Paginação / Carregamento */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setVisibleCount(prev => prev + 4)}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-yellow-500 hover:text-slate-900 transition-all active:scale-95 animate-bounce-subtle"
          >
            {t.more}
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      )}

      {sortedAndFiltered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
          <p className="text-slate-400 font-black uppercase text-[9px] tracking-widest">{t.notFound}</p>
        </div>
      )}

      <AnimatePresence>
        {expandedImage && (
          <motion.div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Imagem ampliada do contentor"
          >
            <button
              type="button"
              onClick={() => setExpandedImage(null)}
              aria-label="Fechar imagem ampliada"
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={expandedImage.url}
              alt={expandedImage.alt}
              className="max-h-full max-w-full object-contain"
              onClick={(event) => event.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
      </motion.div>
    );
  };

export default CitizenView;
