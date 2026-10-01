
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WasteContainer, ContainerStatus, CollectionEntry, CitizenProfile, ResolvedIncident, Announcement, AnnouncementCitizen, PinResetRequest } from '../types';
import { Truck, CheckCheck, Plus, Edit2, Trash, Trash2, Loader2, Users, Bell, BellOff, AlertTriangle, Activity, BarChart3, Clock, MapPin, Hash, Info, BrainCircuit, Navigation, Crosshair, History, UserCheck, Calendar, Target, Zap, LayoutGrid, Map as MapIcon, Award, TrendingUp, CheckCircle2, ChevronRight, Filter, Download, Phone, MessageSquare, ExternalLink, ArrowLeft, FileText, Settings, Image as ImageIcon, Upload, RotateCcw, Check, Sparkles, FolderCheck, Megaphone, Send, ThumbsUp, ThumbsDown, X } from 'lucide-react';
import ContainerFormModal from './ContainerFormModal';
import MapOverview from './MapOverview';
import Logo, { CITY_LOGO_STORAGE_KEY } from './Logo';
import { ResolvedFolderModal } from './ResolvedFolderModal';
import { generateOperationalPdfReport } from '../utils/pdfGenerator';
import { isValidMozambiquePhone, normalizeMozambiquePhone } from '../utils/mozambiquePhone';

interface OperationalViewProps {
  containers: WasteContainer[];
  citizens: CitizenProfile[];
  supportNumber: string;
  announcements: Announcement[];
  pinResetRequests: PinResetRequest[];
  onApprovePinReset: (requestId: string) => void;
  onRejectPinReset: (requestId: string) => void;
  onCreateAnnouncement: (message: string) => void;
  onUpdateAnnouncement: (id: string, message: string) => void;
  onDeleteAnnouncement: (id: string) => void;
  onUpdateSupportNumber: (newNumber: string) => void;
  cityLogoUrl?: string;
  onUpdateCityLogo?: (newLogoUrl: string) => void;
  resolvedIncidents?: ResolvedIncident[];
  onDeleteResolvedIncident?: (id: string) => void;
  onDeleteCitizen?: (contact: string) => void;
  onResolve: (id: string, operator: string) => void;
  onAdd: (container: WasteContainer) => void;
  onUpdate: (container: WasteContainer) => void;
  onDelete: (id: string) => void;
}

interface AuditEntry extends CollectionEntry {
  containerId: string;
  location: string;
  neighborhood: string;
  operatorId: string;
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

const formatDateTime = (isoString?: string) => {
  if (!isoString) return null;
  const date = new Date(isoString);
  return date.toLocaleString('pt-MZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const WasteContainerCard = React.memo(({ 
  container, 
  isRouteMode, 
  processingId, 
  isHistoryOpen, 
  onToggleHistory, 
  onDelete, 
  onInitiateResolve, 
  onEdit 
}: { 
  container: WasteContainer, 
  isRouteMode: boolean, 
  processingId: string | null, 
  isHistoryOpen: boolean, 
  onToggleHistory: (id: string | null) => void, 
  onDelete: (id: string) => void, 
  onInitiateResolve: (id: string) => void, 
  onEdit: (c: WasteContainer) => void 
}) => {
  const isFull = container.status === ContainerStatus.ALERT;
  const isCritical = (container.reportCount || 0) >= 3;
  const loadPercentage = Math.min(((container.reportCount || 0) / 5) * 100, 100);

  const lastActionTime = isFull 
    ? container.lastReportedAt 
    : container.history && container.history.length > 0 
      ? container.history[container.history.length - 1].timestamp 
      : null;

  // Check if it was reported in the last 30 seconds for a "live" effect
  const isJustReported = useMemo(() => {
    if (!isFull || !container.lastReportedAt) return false;
    const diff = Date.now() - new Date(container.lastReportedAt).getTime();
    return diff < 30000;
  }, [isFull, container.lastReportedAt]);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -5 }}
      className={`bg-white rounded-[2.5rem] border transition-all duration-300 flex flex-col ${isRouteMode ? 'border-orange-500 ring-4 ring-orange-500/5' : isCritical ? 'border-red-500 ring-4 ring-red-500/10' : 'border-slate-100 shadow-sm'} ${processingId === container.id ? 'opacity-40' : ''} ${isJustReported ? 'ring-4 ring-red-500/20 animate-pulse' : ''}`}
    >
      <div className="p-6 flex flex-col gap-5 flex-grow">
        <div className="flex justify-between items-center border-b border-slate-50 pb-4">
          <span className="text-sm font-black text-slate-900 uppercase">ID: {container.id}</span>
          <div className="flex items-center gap-2">
            {lastActionTime && (
              <div className="flex flex-col items-end mr-1">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter leading-none">
                  {isFull ? 'Reportado em' : 'Limpo em'}
                </span>
                <span className="text-[9px] font-bold text-slate-600 leading-none mt-1">
                  {formatDateTime(lastActionTime)}
                </span>
              </div>
            )}
            <button 
              onClick={() => onToggleHistory(isHistoryOpen ? null : container.id)} 
              className={`p-2.5 rounded-xl transition-all ${isHistoryOpen ? 'bg-yellow-500 text-slate-900 shadow-md' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              title="Histórico de Coletas"
            >
              <History className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(container.id);
              }} 
              className="p-2.5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all shadow-sm group cursor-pointer"
              title="Excluir Contentor"
            >
              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
        {!isHistoryOpen ? (
          <>
            <div className="flex items-start gap-4">
              <div 
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all p-1.5 flex-shrink-0 ${isCritical ? 'bg-red-100 text-red-600' : isFull ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'}`}
                title={`Contentor ${container.id} - ${container.neighborhood}`}
              >
                <Logo size="xs" className="w-8 h-8 shadow-none border-none bg-transparent" />
              </div>
              <div className="min-w-0 flex-grow">
                <h4 className="text-[13px] font-black text-slate-900 uppercase leading-tight truncate">{container.neighborhood}</h4>
                <p className="text-[11px] text-slate-500 font-medium truncate mb-2">{container.avenue}</p>
                <div className="flex flex-wrap gap-2">
                  <span className={`text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter transition-colors duration-300 ${isCritical ? 'bg-red-100 text-red-700' : isFull ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>{isCritical ? 'CRÍTICO' : isFull ? 'PENDENTE' : 'LIMPO'}</span>
                  {container.reportCount > 0 && (
                    <span className="text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter bg-slate-100 text-slate-600 border border-slate-200">
                      {container.reportCount} {container.reportCount === 1 ? 'Denúncia' : 'Denúncias'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="h-2 bg-slate-50 rounded-full overflow-hidden mt-2"><div className={`h-full transition-all duration-300 ${isCritical ? 'bg-red-600' : isFull ? 'bg-orange-500' : 'bg-yellow-500'}`} style={{ width: isFull ? '100%' : `${loadPercentage}%` }} /></div>
            <div className="flex gap-2 mt-2">
              {isFull ? (
                <button onClick={() => onInitiateResolve(container.id)} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-slate-900 shadow-xl transition-all">Confirmar Coleta</button>
              ) : (
                <div className="flex-1 bg-slate-50 text-slate-300 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-center border border-slate-100">Disponível</div>
              )}
              <button 
                onClick={() => onEdit(container)} 
                className="p-4 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-2xl transition-all"
                title="Editar Contentor"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(container.id);
                }} 
                className="p-4 bg-red-50 text-red-500 hover:bg-red-600 hover:text-white rounded-2xl transition-all shadow-sm group cursor-pointer"
                title="Excluir Contentor"
              >
                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col min-h-[180px] animate-in slide-in-from-right-4">
            <div className="flex items-center justify-between mb-4"><span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Logs Operacionais</span><button onClick={() => onToggleHistory(null)} className="text-[9px] font-black text-yellow-600 uppercase">Fechar</button></div>
            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
              {(container.history || []).slice().reverse().map((log) => (
                <div key={log.id} className="relative pl-6 border-l-2 border-yellow-200 pb-2">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-yellow-500 rounded-full" /></div>
                  <div>
                    <p className="text-[11px] font-black text-slate-900 uppercase leading-none mb-1">{log.operator}</p>
                    <p className="text-[9px] text-slate-400 font-bold">{new Date(log.timestamp).toLocaleString('pt-MZ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

const MUNICIPALITY_PRESETS = [
  { name: 'Gondola (Padrão)', url: '' },
  { name: 'Maputo', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Coat_of_arms_of_Maputo.svg/512px-Coat_of_arms_of_Maputo.svg.png' },
  { name: 'Beira', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Bras%C3%A3o_de_Beira_%28Mo%C3%A7ambique%29.svg/512px-Bras%C3%A3o_de_Beira_%28Mo%C3%A7ambique%29.svg.png' },
  { name: 'Matola', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Coat_of_arms_of_Matola.png/512px-Coat_of_arms_of_Matola.png' },
  { name: 'Nampula', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Coat_of_arms_of_Nampula.svg/512px-Coat_of_arms_of_Nampula.svg.png' },
];

const OperationalView: React.FC<OperationalViewProps> = ({ 
  containers, 
  citizens, 
  supportNumber, 
  announcements,
  pinResetRequests,
  onApprovePinReset,
  onRejectPinReset,
  onCreateAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onUpdateSupportNumber, 
  cityLogoUrl,
  onUpdateCityLogo,
  resolvedIncidents = [],
  onDeleteResolvedIncident,
  onDeleteCitizen,
  onResolve, 
  onAdd, 
  onUpdate, 
  onDelete 
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCitizensModalOpen, setIsCitizensModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isResolvedFolderOpen, setIsResolvedFolderOpen] = useState(false);
  const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);
  const [announcementDraft, setAnnouncementDraft] = useState('');
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<string | null>(null);
  const [selectedAnnouncementCitizen, setSelectedAnnouncementCitizen] = useState<AnnouncementCitizen | null>(null);
  const [newSupportNumber, setNewSupportNumber] = useState(supportNumber);
  const [supportNumberError, setSupportNumberError] = useState<string | null>(null);
  const [newCityLogoUrl, setNewCityLogoUrl] = useState(() => {
    if (cityLogoUrl !== undefined) return cityLogoUrl;
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(CITY_LOGO_STORAGE_KEY) || '';
      } catch (e) {
        return '';
      }
    }
    return '';
  });

  useEffect(() => {
    if (cityLogoUrl !== undefined) {
      setNewCityLogoUrl(cityLogoUrl);
    }
  }, [cityLogoUrl]);

  useEffect(() => {
    setNewSupportNumber(supportNumber);
  }, [supportNumber]);

  const handleAnnouncementSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const message = announcementDraft.trim();
    if (!message) return;

    if (editingAnnouncementId) {
      onUpdateAnnouncement(editingAnnouncementId, message);
    } else {
      onCreateAnnouncement(message);
    }
    setAnnouncementDraft('');
    setEditingAnnouncementId(null);
  };

  const startEditingAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncementId(announcement.id);
    setAnnouncementDraft(announcement.message);
    setIsAnnouncementsOpen(true);
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setNewCityLogoUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };
  const [editingContainer, setEditingContainer] = useState<WasteContainer | undefined>(undefined);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isRouteMode, setIsRouteMode] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);
  const [historyViewId, setHistoryViewId] = useState<string | null>(null);
  const [operatorPromptId, setOperatorPromptId] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState('');
  const [operatorError, setOperatorError] = useState(false);
  const [activeStatModal, setActiveStatModal] = useState<'collections' | 'alerts' | 'operators' | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [containerToDelete, setContainerToDelete] = useState<string | null>(null);

  const handleExportPdf = () => {
    try {
      setIsExportingPdf(true);
      generateOperationalPdfReport({
        containers,
        citizens,
        stats,
        supportNumber
      });
    } catch (error) {
      console.error('Erro ao gerar relatório PDF:', error);
    } finally {
      setTimeout(() => setIsExportingPdf(false), 800);
    }
  };

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const alertCount = containers.filter(c => c.status === ContainerStatus.ALERT).length;
  const criticalCount = containers.filter(c => (c.reportCount || 0) >= 3).length;

  const recentActivities = useMemo(() => {
    const activities: { id: string, type: 'report' | 'resolve', time: string, neighborhood: string }[] = [];
    const now = new Date().getTime();
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    
    containers.forEach(c => {
      if (c.status === ContainerStatus.ALERT && c.lastReportedAt) {
        const reportTime = new Date(c.lastReportedAt).getTime();
        if (reportTime >= twentyFourHoursAgo) {
          activities.push({ id: c.id, type: 'report', time: c.lastReportedAt, neighborhood: c.neighborhood });
        }
      }
      if (c.history && c.history.length > 0) {
        // Check all history entries from the last 24h to be more accurate
        c.history.forEach(entry => {
          const resolveTime = new Date(entry.timestamp).getTime();
          if (resolveTime >= twentyFourHoursAgo) {
            activities.push({ id: c.id, type: 'resolve', time: entry.timestamp, neighborhood: c.neighborhood });
          }
        });
      }
    });

    return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
  }, [containers]);

  const stats = useMemo(() => {
    let collectionsToday = 0;
    let collectionsWeek = 0;
    let collectionsYear = 0;
    
    const operators: Record<string, { daily: number; weekly: number; monthly: number; yearly: number }> = {};
    const neighborhoodEfficiency: Record<string, number> = {};

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const lastWeek = today - 7 * 24 * 60 * 60 * 1000;
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const thisYear = new Date(now.getFullYear(), 0, 1).getTime();

    for (const c of containers) {
      const history = c.history || [];
      for (const entry of history) {
        const entryTime = new Date(entry.timestamp).getTime();
        
        // Skip entries older than the current year to save processing
        if (entryTime < thisYear) continue;

        if (entryTime >= today) collectionsToday++;
        if (entryTime >= lastWeek) collectionsWeek++;
        collectionsYear++; // Since we skip entries < thisYear, all remaining are this year

        if (!operators[entry.operator]) {
          operators[entry.operator] = { daily: 0, weekly: 0, monthly: 0, yearly: 0 };
        }
        
        const op = operators[entry.operator];
        if (entryTime >= today) op.daily++;
        if (entryTime >= lastWeek) op.weekly++;
        if (entryTime >= thisMonth) op.monthly++;
        op.yearly++;

        neighborhoodEfficiency[c.neighborhood] = (neighborhoodEfficiency[c.neighborhood] || 0) + 1;
      }
    }

    const operatorRanking = Object.entries(operators)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.yearly - a.yearly);

    const topOperator = operatorRanking[0]?.name || '---';
    const topBairro = Object.entries(neighborhoodEfficiency).sort((a, b) => b[1] - a[1])[0]?.[0] || '---';

    return {
      daily: collectionsToday,
      weekly: collectionsWeek,
      yearly: collectionsYear,
      topOperator,
      operatorRanking,
      topBairro
    };
  }, [containers]);

  const [watchId, setWatchId] = useState<number | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) return;
    
    // Clear existing watch if any
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => console.error("Erro ao rastrear localização:", err),
      { enableHighAccuracy: true }
    );
    setWatchId(id);
  }, [watchId]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  useEffect(() => {
    if (isRouteMode) {
      startTracking();
    } else {
      stopTracking();
    }
    return () => stopTracking();
  }, [isRouteMode]);

  const initiateResolve = (id: string) => {
    setOperatorName('');
    setOperatorError(false);
    setOperatorPromptId(id);
  };

  const confirmResolve = async () => {
    if (!operatorPromptId) return;
    
    if (!operatorName.trim()) {
      setOperatorError(true);
      return;
    }

    const targetId = operatorPromptId;
    const finalName = operatorName.trim();
    setProcessingId(targetId);
    setOperatorPromptId(null);
    try {
      await onResolve(targetId, finalName);
    } finally {
      setProcessingId(null);
      setOperatorName('');
    }
  };

  const routeContainers = React.useMemo(() => {
    if (!isRouteMode) return containers;
    const alertContainers = containers.filter(c => c.status === ContainerStatus.ALERT);
    if (!userLocation) return alertContainers;
    return [...alertContainers].sort((a, b) => {
      const distA = calculateDistance(userLocation.lat, userLocation.lon, a.latitude || 0, a.longitude || 0);
      const distB = calculateDistance(userLocation.lat, userLocation.lon, b.latitude || 0, b.longitude || 0);
      return distA - distB;
    });
  }, [containers, isRouteMode, userLocation]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`space-y-6 transition-all duration-700 ${isRouteMode ? 'bg-slate-950/20 -m-4 p-4 rounded-[3rem]' : ''}`}
    >
      
      {/* Header de Elite - Mission Control */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational Command Center</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 uppercase tracking-tighter leading-none">
            Mission <span className="text-yellow-500">Control</span>
          </h1>
        </div>
        
        <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] shadow-2xl border border-slate-800 flex items-center gap-8 min-w-[300px]">
          <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Hora local (Gondola)</span>
            <span className="text-3xl font-mono font-black tracking-tighter">
              {currentTime.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <div className="h-10 w-px bg-slate-800"></div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">System Status</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-xs font-black uppercase tracking-tighter">Active</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Feed de Atividade em Tempo Real */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900/5 rounded-3xl p-4 border border-slate-200 overflow-hidden"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 px-2">
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4 text-yellow-600 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Monitoramento ao Vivo</span>
          </div>
          <button
            onClick={() => setIsResolvedFolderOpen(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 group"
            title="Abrir Pasta com Histórico de Denúncias e Coletas Resolvidas"
          >
            <FolderCheck className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            Pasta de Resolvidas ({resolvedIncidents.length})
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
          <AnimatePresence mode="popLayout">
            {recentActivities.map((activity, idx) => (
              <motion.div 
                key={`${activity.id}-${activity.time}`} 
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex-shrink-0 bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.type === 'report' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {activity.type === 'report' ? <AlertTriangle className="w-4 h-4" /> : <CheckCheck className="w-4 h-4" />}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-900 leading-none mb-1">
                    {activity.type === 'report' ? 'DENÚNCIA' : 'COLETA'} - {activity.id}
                  </p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                    {activity.neighborhood} • {new Date(activity.time).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {recentActivities.length === 0 && (
            <p className="text-[10px] font-bold text-slate-400 uppercase p-2 italic">Aguardando atividades...</p>
          )}
        </div>
      </motion.div>

      <div className={`bg-slate-900 rounded-[2rem] p-6 shadow-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-6 transition-all ${isRouteMode ? 'ring-2 ring-orange-500/50' : ''}`}>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className={`absolute inset-0 rounded-full blur-xl opacity-20 transition-all duration-500 ${isRouteMode ? 'bg-orange-500 animate-pulse' : criticalCount > 0 ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
            {isRouteMode ? <Target className="w-8 h-8 relative text-orange-400" /> : <Activity className={`w-8 h-8 relative transition-colors ${criticalCount > 0 ? 'text-red-400' : 'text-yellow-400'}`} />}
          </div>
          <div>
            <h2 className="text-white text-xl font-black tracking-tighter uppercase">Central Operacional</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`flex h-2 w-2 rounded-full ${isRouteMode ? 'bg-orange-500' : criticalCount > 0 ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Tempo Real</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-slate-800 p-1.5 rounded-2xl flex gap-1 border border-slate-700">
             <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-yellow-500 text-slate-900' : 'text-slate-500'}`}><LayoutGrid className="w-4 h-4" /></button>
          </div>
          
          <button onClick={() => { setIsRouteMode(!isRouteMode); setViewMode('grid'); }} className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${isRouteMode ? 'bg-orange-600 text-white ring-4 ring-orange-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
            <Navigation className={`w-4 h-4 ${isRouteMode ? 'animate-pulse' : ''}`} />
            {isRouteMode ? 'Rastreando...' : 'Foco Rota'}
          </button>
          <button onClick={() => setIsCitizensModalOpen(true)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all">
            <Users className="w-4 h-4" />
            Cidadãos ({citizens.length})
          </button>

          <button
            onClick={() => setIsAnnouncementsOpen(previous => !previous)}
            className="bg-emerald-700 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg"
            aria-expanded={isAnnouncementsOpen}
          >
            <Megaphone className="w-4 h-4" />
            Anúncios ({announcements.length})
          </button>

          <button 
            onClick={() => setIsResolvedFolderOpen(true)} 
            className="bg-slate-800 hover:bg-slate-700 text-yellow-400 hover:text-yellow-300 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all border border-yellow-500/20 shadow-lg active:scale-95 group"
            title="Abrir Pasta com Histórico de Denúncias e Coletas Resolvidas"
          >
            <FolderCheck className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
            Pasta de Resolvidas ({resolvedIncidents.length})
          </button>

          <button 
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg active:scale-95 border border-emerald-500/30 group"
            title="Descarregar Relatório Geral em PDF"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                Descarregar PDF
              </>
            )}
          </button>

          <button 
            onClick={() => {
              setNewSupportNumber(supportNumber);
              setNewCityLogoUrl(cityLogoUrl || localStorage.getItem(CITY_LOGO_STORAGE_KEY) || '');
              setIsSupportModalOpen(true);
            }} 
            className="bg-slate-800 hover:bg-slate-700 text-yellow-400 hover:text-yellow-300 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all border border-yellow-500/30 shadow-lg active:scale-95 group"
            title="Configurações do Administrador: Logo da Cidade e Suporte"
          >
            <Settings className="w-4 h-4 text-yellow-400 group-hover:rotate-45 transition-transform" />
            Configurações & Logo
          </button>

          <button onClick={() => { 
            setNewSupportNumber(supportNumber); 
            setNewCityLogoUrl(cityLogoUrl || localStorage.getItem(CITY_LOGO_STORAGE_KEY) || '');
            setIsSupportModalOpen(true); 
          }} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all">
            <Phone className="w-4 h-4" />
            Suporte
          </button>
          
          <button onClick={() => { setEditingContainer(undefined); setIsModalOpen(true); }} className="bg-yellow-500 hover:bg-yellow-400 text-slate-900 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all">
            <Plus className="w-4 h-4" /> Novo Ativo
          </button>
        </div>
      </div>

      {isAnnouncementsOpen && (
        <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-emerald-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <Megaphone className="h-5 w-5 text-emerald-700" />
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900">Anúncios aos cidadãos</h3>
                <p className="text-xs text-slate-500">Cada anúncio expira automaticamente após 24 horas.</p>
              </div>
            </div>
            <button type="button" onClick={() => setIsAnnouncementsOpen(false)} aria-label="Fechar anúncios" className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleAnnouncementSubmit} className="space-y-3 border-b border-slate-100 p-5">
            <label htmlFor="central-announcement" className="block text-xs font-bold text-slate-600">
              {editingAnnouncementId ? 'Editar anúncio' : 'Escrever novo anúncio'}
            </label>
            <textarea
              id="central-announcement"
              value={announcementDraft}
              onChange={event => setAnnouncementDraft(event.target.value.slice(0, 1200))}
              maxLength={1200}
              rows={3}
              placeholder="Escreva uma informação para todos os cidadãos..."
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">{announcementDraft.length}/1200</span>
              <div className="flex gap-2">
                {editingAnnouncementId && (
                  <button type="button" onClick={() => { setEditingAnnouncementId(null); setAnnouncementDraft(''); }} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">
                    Cancelar edição
                  </button>
                )}
                <button type="submit" disabled={!announcementDraft.trim()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40">
                  <Send className="h-4 w-4" /> {editingAnnouncementId ? 'Salvar edição' : 'Enviar anúncio'}
                </button>
              </div>
            </div>
          </form>

          {pinResetRequests.length > 0 && (
            <div className="space-y-3 border-b border-slate-100 bg-amber-50/70 p-5">
              <div>
                <h4 className="text-xs font-black uppercase text-slate-800">Pedidos de recuperação do PIN ({pinResetRequests.length})</h4>
                <p className="mt-1 text-xs text-slate-600">Confirme a identidade da pessoa por ligação ou presencialmente antes de aprovar.</p>
              </div>
              {pinResetRequests.map(request => (
                <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Phone className="h-4 w-4 shrink-0 text-amber-700" />
                    <div>
                      <p className="text-sm font-black text-slate-900">{request.contact}</p>
                      <p className="text-[11px] text-slate-500">
                        {request.approved ? 'Aguardando o cidadão definir novo PIN' : 'Pedido'} · expira {new Date(request.expiresAt).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!request.approved && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Confirma que verificou a identidade do cidadão ${request.contact} fora do aplicativo?`)) {
                            onApprovePinReset(request.id);
                          }
                        }}
                        className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white hover:bg-emerald-600"
                      >
                        Aprovar após verificar
                      </button>
                    )}
                    <button type="button" onClick={() => onRejectPinReset(request.id)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-rose-100 hover:text-rose-700">
                      {request.approved ? 'Cancelar' : 'Rejeitar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {announcements.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">Nenhum anúncio ativo.</p>
            ) : announcements.map(announcement => {
              const reactions = announcement.reactions || [];
              const likes = reactions.filter(reaction => reaction.reaction === 'like').length;
              const dislikes = reactions.filter(reaction => reaction.reaction === 'dislike').length;
              const isExpanded = expandedAnnouncementId === announcement.id;

              return (
                <article key={announcement.id} className="p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <button type="button" onClick={() => setExpandedAnnouncementId(isExpanded ? null : announcement.id)} className="min-w-0 flex-1 text-left" aria-expanded={isExpanded}>
                      <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-slate-800">{announcement.message}</p>
                      <p className="mt-2 text-[11px] text-slate-500">
                        Publicado {new Date(announcement.createdAt).toLocaleString('pt-MZ')} · expira {new Date(announcement.expiresAt).toLocaleString('pt-MZ')}
                      </p>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => startEditingAnnouncement(announcement)} title="Editar anúncio" aria-label="Editar anúncio" className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => { if (window.confirm('Apagar este anúncio para todos os cidadãos?')) onDeleteAnnouncement(announcement.id); }} title="Apagar anúncio para todos" aria-label="Apagar anúncio para todos" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <button type="button" onClick={() => setExpandedAnnouncementId(isExpanded ? null : announcement.id)} className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold">
                    <span className="inline-flex items-center gap-1 text-emerald-800"><ThumbsUp className="h-4 w-4" /> {likes} gostei</span>
                    <span className="inline-flex items-center gap-1 text-rose-800"><ThumbsDown className="h-4 w-4" /> {dislikes} não gostei</span>
                    <span className="text-slate-500">{isExpanded ? 'Ocultar participantes' : 'Ver participantes'}</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
                      {(['like', 'dislike'] as const).map(reactionKind => {
                        const participants = reactions.filter(reaction => reaction.reaction === reactionKind);
                        return (
                          <div key={reactionKind}>
                            <h4 className={`mb-2 flex items-center gap-2 text-xs font-black uppercase ${reactionKind === 'like' ? 'text-emerald-800' : 'text-rose-800'}`}>
                              {reactionKind === 'like' ? <ThumbsUp className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
                              {reactionKind === 'like' ? 'Gostaram' : 'Não gostaram'} ({participants.length})
                            </h4>
                            {participants.length === 0 ? (
                              <p className="text-xs text-slate-400">Ninguém reagiu ainda.</p>
                            ) : (
                              <div className="space-y-1">
                                {participants.map(participant => (
                                  <button key={participant.contact} type="button" onClick={() => setSelectedAnnouncementCitizen(participant.citizen)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs hover:bg-slate-50">
                                    <span className="min-w-0 truncate font-bold text-slate-800">{participant.citizen.name}</span>
                                    <span className="shrink-0 text-slate-500">{participant.citizen.contact}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {selectedAnnouncementCitizen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-label="Dados do cidadão">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900">Dados do cidadão</h3>
                <p className="text-xs text-slate-500">Informações de perfil; PIN não é exibido.</p>
              </div>
              <button type="button" onClick={() => setSelectedAnnouncementCitizen(null)} aria-label="Fechar dados do cidadão" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <dl className="grid grid-cols-1 gap-3 p-5 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-slate-500">Nome</dt><dd className="font-bold text-slate-900">{selectedAnnouncementCitizen.name}</dd></div>
              <div><dt className="text-xs text-slate-500">Contacto</dt><dd className="font-bold text-slate-900">{selectedAnnouncementCitizen.contact}</dd></div>
              <div><dt className="text-xs text-slate-500">Cidade</dt><dd className="font-bold text-slate-900">{selectedAnnouncementCitizen.city}</dd></div>
              <div><dt className="text-xs text-slate-500">Bairro</dt><dd className="font-bold text-slate-900">{selectedAnnouncementCitizen.neighborhood}</dd></div>
              <div><dt className="text-xs text-slate-500">Zona</dt><dd className="font-bold text-slate-900">{selectedAnnouncementCitizen.zone}</dd></div>
            </dl>
          </div>
        </div>
      )}

      {!isRouteMode && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4">
          <button onClick={() => setActiveStatModal('collections')} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-xl transition-all text-left">
            <div className="bg-yellow-50 p-4 rounded-2xl text-yellow-600 group-hover:bg-yellow-500 group-hover:text-slate-900 transition-all"><CheckCircle2 className="w-7 h-7" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Coletas Hoje</p>
              <h4 className="text-3xl font-black text-slate-900 leading-none">{stats.daily}</h4>
            </div>
          </button>

          <button onClick={() => setActiveStatModal('alerts')} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-xl transition-all text-left">
            <div className="bg-orange-50 p-4 rounded-2xl text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all"><TrendingUp className="w-7 h-7" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Foco Alertas</p>
              <h4 className="text-3xl font-black text-slate-900 leading-none">{alertCount}</h4>
            </div>
          </button>

          <button onClick={() => setIsCitizensModalOpen(true)} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-xl transition-all text-left">
            <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all"><Users className="w-7 h-7" /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Cidadãos Ativos</p>
              <h4 className="text-3xl font-black text-slate-900 leading-none">{citizens.length}</h4>
            </div>
          </button>

          <button onClick={() => setActiveStatModal('operators')} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-xl transition-all text-left">
            <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all"><Award className="w-7 h-7" /></div>
            <div className="min-w-0">
              <h4 className="text-xl font-black text-slate-900 leading-none truncate uppercase tracking-tighter">Melhores Operadores</h4>
            </div>
          </button>
        </div>
      )}

      {activeStatModal === 'collections' && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[3.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-white/20">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Análise de Ciclos</h3>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Relatórios Oficiais - Município de Gondola</p>
              </div>
              <button onClick={() => setActiveStatModal(null)} className="p-5 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100 transition-all active:scale-90"><ArrowLeft className="w-8 h-8" /></button>
            </div>
            <div className="flex-grow overflow-y-auto p-12 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="bg-[#FFFDF0] p-12 rounded-[4rem] border border-yellow-100 text-center flex flex-col items-center justify-between min-h-[320px] transition-transform hover:scale-[1.02]">
                  <p className="text-[14px] font-black text-yellow-600 uppercase tracking-[0.2em]">Hoje</p>
                  <span className="text-9xl font-black text-[#5C4D00] leading-none">{stats.daily}</span>
                  <p className="text-[12px] text-yellow-700 font-black uppercase tracking-widest">Coletas</p>
                </div>
                <div className="bg-[#F8FAFC] p-12 rounded-[4rem] border border-slate-100 text-center flex flex-col items-center justify-between min-h-[320px] transition-transform hover:scale-[1.02]">
                  <p className="text-[14px] font-black text-slate-400 uppercase tracking-[0.2em]">Semanal</p>
                  <span className="text-9xl font-black text-slate-900 leading-none">{stats.weekly}</span>
                  <p className="text-[12px] text-slate-500 font-black uppercase tracking-widest">7 Dias</p>
                </div>
                <div className="bg-[#EAB308] p-12 rounded-[4rem] text-center text-slate-900 shadow-[0_30px_60px_-15px_rgba(234,179,8,0.5)] flex flex-col items-center justify-between min-h-[320px] transition-transform hover:scale-[1.05] border-b-8 border-yellow-600">
                  <p className="text-[14px] font-black text-yellow-900 uppercase tracking-[0.2em]">Anual</p>
                  <span className="text-9xl font-black text-slate-900 leading-none">{stats.yearly}</span>
                  <p className="text-[12px] text-yellow-950 font-black uppercase tracking-widest">Acumulado Anual</p>
                </div>
              </div>
            </div>
            <div className="p-10 border-t border-slate-50 bg-white flex justify-between items-center">
              <button 
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-8 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] shadow-xl transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {isExportingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                Descarregar Relatório PDF
              </button>
              <button onClick={() => setActiveStatModal(null)} className="px-16 py-5 bg-[#0F172A] text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all hover:bg-slate-800 active:scale-95">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {activeStatModal === 'alerts' && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[3.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-white/20">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Foco em Alertas</h3>
                <p className="text-slate-500 text-sm font-medium">Contentores que Necessitam de Atenção Imediata</p>
              </div>
              <button onClick={() => setActiveStatModal(null)} className="p-5 bg-white rounded-2xl text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100"><ArrowLeft className="w-7 h-7" /></button>
            </div>
            <div className="flex-grow overflow-y-auto p-10 custom-scrollbar">
              {containers.filter(c => c.status === ContainerStatus.ALERT).length === 0 ? (
                <div className="text-center py-20">
                  <CheckCircle2 className="w-16 h-16 text-emerald-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Todos os contentores estão limpos!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {containers.filter(c => c.status === ContainerStatus.ALERT).map((container) => (
                    <div key={container.id} className="p-6 bg-orange-50 rounded-[2.5rem] border border-orange-100 flex items-center gap-6">
                      <div className="bg-orange-600 p-4 rounded-2xl text-white shadow-lg">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight truncate">{container.id}</h4>
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-2">{container.neighborhood}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full uppercase">
                            {container.reportCount} Denúncias
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-10 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button onClick={() => setActiveStatModal(null)} className="px-12 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {activeStatModal === 'operators' && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-white/20">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Melhores Operadores</h3>
                <p className="text-slate-500 text-sm font-medium">Desempenho da Equipe de Limpeza</p>
              </div>
              <button onClick={() => setActiveStatModal(null)} className="p-5 bg-white rounded-2xl text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100"><ArrowLeft className="w-7 h-7" /></button>
            </div>
            <div className="flex-grow overflow-y-auto p-10 custom-scrollbar">
              {stats.operatorRanking.length === 0 ? (
                <div className="text-center py-20">
                  <Award className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhuma coleta registrada ainda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.operatorRanking.map((op, index) => (
                    <div key={op.name} className="bg-slate-50 rounded-[2.5rem] border border-slate-100 overflow-hidden">
                      <div className="p-6 flex items-center justify-between border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-6">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-md ${
                            index === 0 ? 'bg-yellow-500 text-slate-900' : 
                            index === 1 ? 'bg-slate-300 text-slate-700' : 
                            index === 2 ? 'bg-orange-300 text-orange-900' : 'bg-white text-slate-400 border border-slate-100'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">{op.name}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operador Municipal</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl font-black text-slate-900">{op.yearly}</span>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Acumulado</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 divide-x divide-slate-100">
                        <div className="p-4 text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Diário</p>
                          <p className="text-lg font-black text-yellow-600">{op.daily}</p>
                        </div>
                        <div className="p-4 text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Semanal</p>
                          <p className="text-lg font-black text-slate-700">{op.weekly}</p>
                        </div>
                        <div className="p-4 text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Mensal</p>
                          <p className="text-lg font-black text-slate-700">{op.monthly}</p>
                        </div>
                        <div className="p-4 text-center bg-yellow-50/50">
                          <p className="text-[8px] font-black text-yellow-700 uppercase mb-1">Anual</p>
                          <p className="text-lg font-black text-yellow-700">{op.yearly}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-10 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button onClick={() => setActiveStatModal(null)} className="px-12 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'map' ? (
        <MapOverview 
          containers={containers} 
          onResolve={initiateResolve}
          onViewHistory={(id) => { setHistoryViewId(id); setViewMode('grid'); }}
        />
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6`}>
          {routeContainers.map((container) => (
            <WasteContainerCard 
              key={container.id}
              container={container}
              isRouteMode={isRouteMode}
              processingId={processingId}
              isHistoryOpen={historyViewId === container.id}
              onToggleHistory={setHistoryViewId}
              onDelete={(id) => setContainerToDelete(id)}
              onInitiateResolve={initiateResolve}
              onEdit={(c) => { setEditingContainer(c); setIsModalOpen(true); }}
            />
          ))}
        </div>
      )}

      {/* Modal de Cidadãos Cadastrados */}
      {isCitizensModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[3.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-white/20">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Cidadãos Cadastrados</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Base de Dados de Usuários do Sistema</p>
              </div>
              <button onClick={() => setIsCitizensModalOpen(false)} className="p-4 bg-white rounded-2xl text-slate-400 hover:text-slate-900 shadow-sm border border-slate-100 transition-all"><ArrowLeft className="w-6 h-6" /></button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
              {citizens.length === 0 ? (
                <div className="text-center py-20">
                  <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhum cidadão cadastrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {citizens.map((citizen, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-3xl p-6 border border-slate-100 hover:shadow-lg transition-all group">
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center text-slate-900 font-black text-xl shadow-md group-hover:scale-110 transition-transform flex-shrink-0">
                            {citizen.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-black text-slate-900 uppercase truncate leading-tight">{citizen.name}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cidadão Ativo</p>
                          </div>
                        </div>
                        {onDeleteCitizen && (
                          <button
                            onClick={() => {
                              if (confirm(`Deseja remover o munícipe ${citizen.name} da base de dados?`)) {
                                onDeleteCitizen(citizen.contact);
                              }
                            }}
                            className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95 group/btn cursor-pointer"
                            title="Excluir Cidadão"
                          >
                            <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-slate-600">
                          <div className="p-2 bg-white rounded-xl border border-slate-100"><MapPin className="w-3.5 h-3.5 text-yellow-600" /></div>
                          <div className="min-w-0">
                            <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Bairro</p>
                            <p className="text-[11px] font-bold uppercase truncate">{citizen.neighborhood}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 text-slate-600">
                          <div className="p-2 bg-white rounded-xl border border-slate-100"><Phone className="w-3.5 h-3.5 text-yellow-600" /></div>
                          <div className="min-w-0">
                            <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Contato</p>
                            <p className="text-[11px] font-bold uppercase truncate">{citizen.contact}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <button 
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Descarregar Relatório Completo em PDF
              </button>
              <button onClick={() => setIsCitizensModalOpen(false)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">Fechar Lista</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configurações do Administrador (Logo da Cidade & Suporte) */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-600">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Configurações do Administrador</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Identidade visual e suporte operacional</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSupportModalOpen(false)}
                className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                title="Fechar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-grow">
              {/* Campo: Logo da Cidade */}
              <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-yellow-600" />
                    Logo da Cidade (URL da Imagem)
                  </label>
                  <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    newCityLogoUrl.trim() ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {newCityLogoUrl.trim() ? 'Personalizado' : 'Padrão'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Insira o link (URL) ou o código (base64) da foto ou brasão do município. Esta imagem substituirá o logotipo de lixo padrão em toda a aplicação e nos painéis.
                </p>

                {/* Input de URL / Código */}
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Ex: https://exemplo.com/brasao-cidade.png ou cole código base64"
                    className="w-full pl-4 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-mono font-medium outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10 transition-all text-slate-800"
                    value={newCityLogoUrl}
                    onChange={(e) => setNewCityLogoUrl(e.target.value)}
                  />
                  {newCityLogoUrl && (
                    <button 
                      type="button" 
                      onClick={() => setNewCityLogoUrl('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      title="Limpar campo"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Opções de Upload e Ações rápidas */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <label className="cursor-pointer px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm active:scale-95">
                    <Upload className="w-3.5 h-3.5 text-yellow-600" />
                    Carregar Foto do Aparelho
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleLogoFileUpload} 
                    />
                  </label>

                  {newCityLogoUrl.trim() && (
                    <button 
                      type="button" 
                      onClick={() => setNewCityLogoUrl('')}
                      className="px-3.5 py-2 bg-white hover:bg-red-50 border border-slate-200 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restaurar Logotipo Padrão
                    </button>
                  )}
                </div>

                {/* Presets Rápidos de Municípios de Moçambique */}
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-yellow-500" /> Presets Rápidos de Municípios:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {MUNICIPALITY_PRESETS.map((preset) => {
                      const isSelected = newCityLogoUrl.trim() === preset.url.trim();
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setNewCityLogoUrl(preset.url)}
                          className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                            isSelected 
                              ? 'bg-yellow-500 text-slate-900 shadow-sm' 
                              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preview em Tempo Real */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 flex items-center gap-4 shadow-sm">
                  <div className="relative flex-shrink-0">
                    <Logo logoUrl={newCityLogoUrl} size="md" className="shadow-md" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-slate-900 uppercase">
                      {newCityLogoUrl.trim() ? 'Pré-visualização do Logo Municipal' : 'Logotipo Padrão Ativo'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-snug">
                      {newCityLogoUrl.trim() 
                        ? 'Este logotipo será refletido na tela inicial, cabeçalho, rodapé e em todos os cartões de contentores.' 
                        : 'Usando o ícone 3D oficial. Insira uma imagem acima para personalizar para o seu município.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Campo: Número de Telefone */}
              <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-100 space-y-3">
                <label className="block text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  Número de Telefone de Suporte
                </label>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Este contato é exibido diretamente para os cidadãos no cabeçalho e na tela inicial para apoio municipal direto.
                </p>
                <input 
                  type="tel"
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="Ex: 840000000"
                  className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10 transition-all text-slate-900"
                  value={newSupportNumber}
                  onChange={(e) => {
                    setNewSupportNumber(normalizeMozambiquePhone(e.target.value));
                    setSupportNumberError(null);
                  }}
                />
                {supportNumberError && <p role="alert" className="text-xs font-bold text-red-600">{supportNumberError}</p>}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-white flex gap-3">
              <button 
                type="button"
                onClick={() => setIsSupportModalOpen(false)} 
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (!isValidMozambiquePhone(newSupportNumber)) {
                    setSupportNumberError('Use um número nacional válido: Tmcel 82/83, Vodacom 84/85 ou Movitel 86/87.');
                    return;
                  }
                  onUpdateSupportNumber(newSupportNumber);
                  if (onUpdateCityLogo) {
                    onUpdateCityLogo(newCityLogoUrl);
                  }
                  setIsSupportModalOpen(false);
                }} 
                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-slate-900 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      <ContainerFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={(data) => { editingContainer ? onUpdate(data) : onAdd(data); }} 
        onDelete={(id) => setContainerToDelete(id)}
        initialData={editingContainer} 
      />

      {/* Modal de Confirmação de Operador */}
      {operatorPromptId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl border border-white/20 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Confirmar Coleta</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Identifique o operador responsável</p>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nome do Operador</label>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Ex: João Silva"
                  className={`w-full px-5 py-4 bg-slate-50 border rounded-2xl text-sm font-bold outline-none transition-all ${operatorError ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10'}`}
                  value={operatorName}
                  onChange={(e) => { setOperatorName(e.target.value); setOperatorError(false); }}
                  onKeyDown={(e) => e.key === 'Enter' && confirmResolve()}
                />
                {operatorError && <p className="text-red-500 text-[9px] font-black uppercase mt-2 tracking-widest">O nome é obrigatório para o registro</p>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setOperatorPromptId(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                <button onClick={confirmResolve} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500 hover:text-slate-900 shadow-xl transition-all">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Contentor */}
      {containerToDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-3xl flex items-center justify-center text-red-600 mb-6">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Remover Contentor</h3>
            <p className="text-slate-500 text-sm font-medium mb-8">
              Tem certeza que deseja remover o contentor <strong className="text-slate-900">{containerToDelete}</strong> do sistema municipal? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-4 w-full">
              <button
                onClick={() => setContainerToDelete(null)}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl text-xs uppercase tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDelete(containerToDelete);
                  setContainerToDelete(null);
                }}
                className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-600/30"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Pasta de Denúncias e Coletas Resolvidas */}
      <ResolvedFolderModal
        isOpen={isResolvedFolderOpen}
        onClose={() => setIsResolvedFolderOpen(false)}
        incidents={resolvedIncidents}
        supportNumber={supportNumber}
        onDeleteIncident={onDeleteResolvedIncident}
      />
    </motion.div>
  );
};

export default OperationalView;
