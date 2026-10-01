
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ContainerStatus, WasteContainer, UserRole, CollectionEntry, CitizenProfile, Language, ResolvedIncident, CitizenReport, Announcement, AnnouncementReactionKind, PinResetRequest, PinResetClientState } from './types';
import CitizenView from './components/CitizenView';
import OperationalView from './components/OperationalView';
import CitizenRegistration from './components/CitizenRegistration';
import LoginScreen from './components/LoginScreen';
import WelcomeScreen from './components/WelcomeScreen';
import Logo, { CITY_LOGO_EVENT, CITY_LOGO_STORAGE_KEY, LEGACY_CITY_LOGO_STORAGE_KEY } from './components/Logo';
import { LogOut, Loader2, Phone, ArrowLeft, BellRing, X } from 'lucide-react';
import { translations } from './translations';
import { OfflineIndicator } from './components/OfflineIndicator';
import { isNativeAppWebView } from './utils/device';
import { isValidMozambiquePhone } from './utils/mozambiquePhone';

const INITIAL_DATA: WasteContainer[] = [
  { id: 'CT-101', neighborhood: 'Central', avenue: 'Av. Brasil', block: 'Q-04', referencePoint: 'Mercado Popular', status: ContainerStatus.NORMAL, reportCount: 0, latitude: -19.0667, longitude: 33.6500 },
  { id: 'CT-102', neighborhood: 'Jardins', avenue: 'Rua das Flores', block: 'Q-12', referencePoint: 'Escola Primária', status: ContainerStatus.ALERT, lastReportedAt: new Date().toISOString(), reportCount: 3, latitude: -19.0600, longitude: 33.6550 },
];

const INITIAL_RESOLVED_INCIDENTS: ResolvedIncident[] = [
  {
    id: 'RES-CHM-001',
    containerId: 'CT-101',
    neighborhood: 'Central',
    avenue: 'Av. Brasil',
    block: 'Q-04',
    referencePoint: 'Mercado Popular',
    latitude: -19.0667,
    longitude: 33.6500,
    operator: 'Mateus Manhica',
    collectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    firstReportAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    lastReportAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    totalReports: 2,
    durationMinutes: 90,
    notes: 'Contentor totalmente esvaziado e perímetro higienizado pela brigada municipal.',
    reporters: [
      {
        id: 'rep-01',
        citizenName: 'Armando Cossa',
        citizenContact: '841234567',
        citizenNeighborhood: 'Central',
        citizenZone: 'Zona Comercial',
        reportedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        note: 'Lixo a transbordar próximo ao portão 2 do mercado.'
      },
      {
        id: 'rep-02',
        citizenName: 'Fátima Machava',
        citizenContact: '869876543',
        citizenNeighborhood: 'Central',
        citizenZone: 'Zona Comercial',
        reportedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
        note: 'Reforço da denúncia anterior.'
      }
    ]
  },
  {
    id: 'RES-CHM-002',
    containerId: 'CT-103',
    neighborhood: 'Vila Nova',
    avenue: 'Estrada Nacional nº 6',
    block: 'Q-08',
    referencePoint: 'Paragem das Bombas',
    latitude: -19.0730,
    longitude: 33.6420,
    operator: 'Joaquim Chissano Jr.',
    collectedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    firstReportAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    lastReportAt: new Date(Date.now() - 5.5 * 60 * 60 * 1000).toISOString(),
    totalReports: 1,
    durationMinutes: 45,
    notes: 'Coleta prioritária realizada em conformidade com o plano de rotas.',
    reporters: [
      {
        id: 'rep-03',
        citizenName: 'Samuel Sitoe',
        citizenContact: '823456789',
        citizenNeighborhood: 'Vila Nova',
        citizenZone: 'Bairro Residencial',
        reportedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
        note: 'Contentor cheio desde a manhã.'
      }
    ]
  }
];

import SplashScreen from './components/SplashScreen';

const STORAGE_KEY = 'limpa_chimoio_citizen_profile';
const CONTAINERS_KEY = 'limpa_chimoio_containers';
const CITIZENS_KEY = 'limpa_chimoio_citizens';
const SETTINGS_KEY = 'limpa_chimoio_settings';
const RESOLVED_INCIDENTS_KEY = 'limpa_chimoio_resolved_incidents';
const ANNOUNCEMENTS_KEY = 'limpa_gondola_announcements';
const DELETED_CONTAINERS_KEY = 'limpa_chimoio_deleted_containers';
const COLLECTION_NOTICE_STORAGE_PREFIX = 'limpa_chimoio_seen_collection_notices';
const COLLECTION_THANK_YOU_MESSAGES = [
  'Obrigado, {name}! A sua denúncia ajudou a recolher o contentor {container}.',
  '{name}, o contentor {container} já foi recolhido. Agradecemos a sua colaboração!',
  'A coleta do contentor {container} foi concluída, {name}. Obrigado por avisar!',
  'A sua participação fez a diferença, {name}: o contentor {container} foi recolhido.',
  '{name}, a equipa recolheu o contentor {container} após a sua denúncia. Muito obrigado!',
  'Obrigado por contribuir, {name}. O contentor {container} já está limpo e recolhido.',
  '{name}, a sua colaboração ajudou a equipa a recolher o contentor {container}.',
  'Boa notícia, {name}: o contentor {container} foi recolhido. Obrigado pela denúncia!',
  'A equipa concluiu a coleta do contentor {container}, {name}. Agradecemos o seu cuidado!',
  '{name}, a sua comunicação foi importante. O contentor {container} já foi recolhido.',
  'Muito obrigado, {name}! A denúncia do contentor {container} contribuiu para a coleta.'
];

const normalizeContact = (contact?: string) => (contact || '').replace(/\D/g, '');

const hashString = (value: string) => Array.from(value).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);

const getStoredAnnouncements = (): Announcement[] => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(ANNOUNCEMENTS_KEY) || '[]');
    if (Array.isArray(parsed)) {
      return parsed.filter(item => new Date(item.expiresAt).getTime() > Date.now());
    }
  } catch (e) {}
  return [];
};

const getDeletedContainerIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_CONTAINERS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch (e) {}
  return new Set();
};

const addDeletedContainerId = (id: string) => {
  if (typeof window === 'undefined') return;
  try {
    const current = getDeletedContainerIds();
    current.add(id);
    localStorage.setItem(DELETED_CONTAINERS_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {}
};

const normalizeContainer = (c: any): WasteContainer => ({
  ...c,
  status: (c?.status || '').toString().toLowerCase() === 'alert' ? ContainerStatus.ALERT : ContainerStatus.NORMAL,
  reportCount: Number(c?.reportCount) || 0,
  activeReports: Array.isArray(c?.activeReports) ? c.activeReports : [],
  history: Array.isArray(c?.history) ? c.history : []
});

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [centralToken, setCentralToken] = useState<string | null>(null);
  const [citizenProfile, setCitizenProfile] = useState<CitizenProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authView, setAuthView] = useState<'welcome' | 'register' | 'login' | 'operational'>('welcome');
  const [citizens, setCitizens] = useState<CitizenProfile[]>([]);
  const [containers, setContainers] = useState<WasteContainer[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(CONTAINERS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.map(normalizeContainer);
          }
        }
      } catch (e) {}
    }
    return INITIAL_DATA;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [supportNumber, setSupportNumber] = useState<string>('840000000');
  const [cityLogoUrl, setCityLogoUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(CITY_LOGO_STORAGE_KEY) || localStorage.getItem(LEGACY_CITY_LOGO_STORAGE_KEY) || '';
      } catch (e) {
        return '';
      }
    }
    return '';
  });
  const [resolvedIncidents, setResolvedIncidents] = useState<ResolvedIncident[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(RESOLVED_INCIDENTS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_RESOLVED_INCIDENTS;
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>(getStoredAnnouncements);
  const [pinResetRequests, setPinResetRequests] = useState<PinResetRequest[]>([]);
  const [pinResetStatus, setPinResetStatus] = useState<PinResetClientState | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [collectionNotifications, setCollectionNotifications] = useState<{ id: string; message: string; expiresAt: number }[]>([]);
  const notifiedCollectionReports = useRef(new Set<string>());
  const [lang, setLang] = useState<Language>('pt');
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const t = translations[lang];

  useEffect(() => {
    try {
      localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
    } catch (e) {}
  }, [announcements]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAnnouncements(previous => {
        const active = previous.filter(item => new Date(item.expiresAt).getTime() > Date.now());
        return active.length === previous.length ? previous : active;
      });
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (role !== 'operational' || !centralToken || !socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: 'AUTH_CENTRAL', data: { token: centralToken } }));
  }, [role, centralToken, socket]);

  useEffect(() => {
    if (role !== 'citizen' || !citizenProfile) return;

    const citizenContact = normalizeContact(citizenProfile.contact);
    const seenStorageKey = `${COLLECTION_NOTICE_STORAGE_PREFIX}_${citizenContact || 'unknown'}`;
    let storedNotices: string[] = [];
    try {
      storedNotices = JSON.parse(localStorage.getItem(seenStorageKey) || '[]');
    } catch (e) {}

    const seenNotices = new Set([...storedNotices, ...notifiedCollectionReports.current]);
    const notices: { id: string; message: string; expiresAt: number }[] = [];
    const now = Date.now();

    containers.forEach(container => {
      (container.history || []).forEach(entry => {
        const collectedAt = new Date(entry.timestamp).getTime();
        if (!Number.isFinite(collectedAt) || now - collectedAt > 30_000 || collectedAt > now + 5_000) return;

        const reporterIndex = (entry.reporters || []).findIndex(reporter => {
          const reporterContact = normalizeContact(reporter.citizenContact);
          const sameContact = !!citizenContact && !!reporterContact && reporterContact === citizenContact;
          const sameNameWithoutContact = (!citizenContact || !reporterContact)
            && reporter.citizenName.trim().toLowerCase() === citizenProfile.name.trim().toLowerCase();
          return sameContact || sameNameWithoutContact;
        });
        if (reporterIndex < 0) return;

        const reporter = entry.reporters![reporterIndex];
        const noticeId = `${entry.id}:${reporter.id || citizenContact}`;
        if (seenNotices.has(noticeId)) return;

        seenNotices.add(noticeId);
        notifiedCollectionReports.current.add(noticeId);
        const templateIndex = (hashString(entry.id) + reporterIndex) % COLLECTION_THANK_YOU_MESSAGES.length;
        const message = COLLECTION_THANK_YOU_MESSAGES[templateIndex]
          .replace('{name}', reporter.citizenName || citizenProfile.name)
          .replace('{container}', container.id);
        notices.push({ id: noticeId, message, expiresAt: now + 30_000 });
      });
    });

    if (notices.length) {
      try {
        localStorage.setItem(seenStorageKey, JSON.stringify(Array.from(seenNotices).slice(-100)));
      } catch (e) {}
      setCollectionNotifications(previous => [...previous, ...notices]);
    }
  }, [containers, role, citizenProfile]);

  useEffect(() => {
    if (role !== 'citizen' || !isLoggedIn || !citizenProfile) return;
    const nativeBridge = (window as Window & {
      ReactNativeWebView?: { postMessage: (message: string) => void };
    }).ReactNativeWebView;
    nativeBridge?.postMessage(JSON.stringify({
      type: 'REGISTER_COLLECTION_PUSH',
      contact: citizenProfile.contact,
    }));
  }, [isLoggedIn, role, citizenProfile]);

  useEffect(() => {
    const timers = collectionNotifications.map(notification => window.setTimeout(
      () => setCollectionNotifications(previous => previous.filter(item => item.id !== notification.id)),
      Math.max(0, notification.expiresAt - Date.now())
    ));
    return () => timers.forEach(window.clearTimeout);
  }, [collectionNotifications]);

  // WebSocket Connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Connected to real-time sync server');
        setSocket(ws);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === 'SYNC_CONTAINERS' && Array.isArray(payload.data)) {
            const deletedIds = getDeletedContainerIds();
            const normalizedData = payload.data
              .filter((c: any) => !deletedIds.has(c.id))
              .map(normalizeContainer);
            setContainers(prev => {
              const serverMap = new Map(normalizedData.map((c: WasteContainer) => [c.id, c]));
              const merged = [...normalizedData];
              prev.forEach(c => {
                if (!serverMap.has(c.id) && !deletedIds.has(c.id)) {
                  merged.push(c);
                }
              });
              return merged;
            });
          } else if (payload.type === 'SYNC_ANNOUNCEMENTS' && Array.isArray(payload.data)) {
            setAnnouncements(payload.data.filter((item: Announcement) => new Date(item.expiresAt).getTime() > Date.now()));
          } else if (payload.type === 'SYNC_PIN_RESET_REQUESTS' && Array.isArray(payload.data)) {
            setPinResetRequests(payload.data);
          } else if (payload.type === 'PIN_RESET_REQUESTED') {
            setPinResetStatus({ requestId: payload.data.id, contact: payload.data.contact, status: 'pending' });
          } else if (payload.type === 'PIN_RESET_APPROVED') {
            setPinResetStatus({ requestId: payload.data.requestId, contact: payload.data.contact, status: 'approved' });
          } else if (payload.type === 'PIN_RESET_REJECTED') {
            setPinResetStatus({ requestId: payload.data?.requestId, status: 'rejected', message: payload.data?.message });
          } else if (payload.type === 'PIN_RESET_COMPLETED') {
            setPinResetStatus({ requestId: payload.data.requestId, contact: payload.data.contact, status: 'completed' });
          } else if (payload.type === 'CONTAINER_UPDATED') {
            const norm = normalizeContainer(payload.data);
            const deletedIds = getDeletedContainerIds();
            if (!deletedIds.has(norm.id)) {
              setContainers(prev => prev.map(c => c.id === norm.id ? norm : c));
            }
          } else if (payload.type === 'CONTAINER_ADDED') {
            const norm = normalizeContainer(payload.data);
            const deletedIds = getDeletedContainerIds();
            if (!deletedIds.has(norm.id)) {
              setContainers(prev => prev.some(c => c.id === norm.id) ? prev.map(c => c.id === norm.id ? norm : c) : [...prev, norm]);
            }
          } else if (payload.type === 'CONTAINER_DELETED') {
            addDeletedContainerId(payload.data);
            setContainers(prev => prev.filter(c => c.id !== payload.data));
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onerror = (e) => {
        console.warn('WebSocket connection offline or failed to connect:', e);
      };

      ws.onclose = () => {
        console.log('Disconnected from real-time sync server');
        setSocket(null);
      };
    } catch (err) {
      console.warn('WebSocket initialization skipped:', err);
    }

    return () => {
      if (ws) {
        try {
          ws.close();
        } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    // Tenta recuperar perfil do cidadão do armazenamento local
    const savedProfile = localStorage.getItem(STORAGE_KEY);
    if (savedProfile) {
      try {
        setCitizenProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error("Erro ao ler perfil salvo");
      }
    }

    // Recupera Contentores
    const savedContainers = localStorage.getItem(CONTAINERS_KEY);
    if (savedContainers) {
      try {
        const parsed = JSON.parse(savedContainers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setContainers(parsed.map(normalizeContainer));
        }
      } catch (e) {
        console.error("Erro ao ler contentores locais");
      }
    }

    // Recupera Cidadãos
    const savedCitizens = localStorage.getItem(CITIZENS_KEY);
    if (savedCitizens) {
      try {
        setCitizens(JSON.parse(savedCitizens));
      } catch (e) {}
    }

    // Recupera Configurações
    const savedCityLogo = localStorage.getItem(CITY_LOGO_STORAGE_KEY) || localStorage.getItem(LEGACY_CITY_LOGO_STORAGE_KEY);
    if (savedCityLogo) {
      setCityLogoUrl(savedCityLogo);
    }
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (isValidMozambiquePhone(settings.supportNumber)) setSupportNumber(settings.supportNumber);
        if (settings.cityLogoUrl && !savedCityLogo) setCityLogoUrl(settings.cityLogoUrl);
      } catch (e) {}
    }
  }, []);

  // Persistência Automática
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(CONTAINERS_KEY, JSON.stringify(containers));
    }
  }, [containers, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(CITIZENS_KEY, JSON.stringify(citizens));
    }
  }, [citizens, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ supportNumber, cityLogoUrl }));
    }
  }, [supportNumber, cityLogoUrl, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(RESOLVED_INCIDENTS_KEY, JSON.stringify(resolvedIncidents));
      } catch (e) {}
    }
  }, [resolvedIncidents, isLoading]);

  const sortedContainers = useMemo(() => {
    return [...containers].sort((a, b) => {
      if (b.reportCount !== a.reportCount) return b.reportCount - a.reportCount;
      if (a.status === ContainerStatus.ALERT && b.status !== ContainerStatus.ALERT) return -1;
      return a.id.localeCompare(b.id);
    });
  }, [containers]);

  const showFeedback = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const tReplace = (str: string, replacements: Record<string, string>) => {
    let result = str;
    Object.entries(replacements).forEach(([key, value]) => {
      result = result.replace(`{${key}}`, value);
    });
    return result;
  };

  const handleReportFull = (id: string, reporter?: CitizenProfile) => {
    const container = containers.find(c => c.id === id);
    if (container) {
      const nowIso = new Date().toISOString();
      const citizenName = reporter?.name || citizenProfile?.name || 'Munícipe de Gondola';
      const citizenContact = reporter?.contact || citizenProfile?.contact || '840000000';
      const citizenNeighborhood = reporter?.neighborhood || citizenProfile?.neighborhood || container.neighborhood;
      const citizenZone = reporter?.zone || citizenProfile?.zone || container.block;

      const newReportEntry: CitizenReport = {
        id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        citizenName,
        citizenContact,
        citizenNeighborhood,
        citizenZone,
        reportedAt: nowIso
      };

      const existingReports = container.activeReports || [];
      const updated = { 
        ...container, 
        status: ContainerStatus.ALERT, 
        reportCount: (container.reportCount || 0) + 1,
        lastReportedAt: nowIso,
        activeReports: [...existingReports, newReportEntry]
      };
      
      setContainers(prev => prev.map(c => c.id === id ? updated : c));
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'UPDATE_CONTAINER', data: updated }));
      }
      showFeedback(tReplace(t.fbReportSuccess, { id }));
    }
  };

  const handleResolve = (id: string, operator: string) => {
    const container = containers.find(c => c.id === id);
    if (!container) return;

    const opName = operator || 'Equipe Municipal';
    const nowIso = new Date().toISOString();

    const reports: CitizenReport[] = (container.activeReports && container.activeReports.length > 0)
      ? container.activeReports
      : [{
          id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
          citizenName: citizenProfile?.name || 'Munícipe de Gondola',
          citizenContact: citizenProfile?.contact || '840000000',
          citizenNeighborhood: container.neighborhood,
          citizenZone: container.block,
          reportedAt: container.lastReportedAt || nowIso
        }];

    const firstReportTime = reports[0]?.reportedAt || container.lastReportedAt || nowIso;
    const diffMs = Math.max(0, new Date(nowIso).getTime() - new Date(firstReportTime).getTime());
    const durationMins = Math.round(diffMs / (1000 * 60)) || 15;

    const newResolvedIncident: ResolvedIncident = {
      id: `RES-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
      containerId: container.id,
      neighborhood: container.neighborhood,
      avenue: container.avenue,
      block: container.block,
      referencePoint: container.referencePoint,
      latitude: container.latitude,
      longitude: container.longitude,
      operator: opName,
      collectedAt: nowIso,
      firstReportAt: firstReportTime,
      lastReportAt: container.lastReportedAt || nowIso,
      totalReports: reports.length,
      reporters: reports,
      durationMinutes: durationMins,
      notes: `Coleta e higienização efetuada com sucesso pelo operador ${opName} no contentor ${container.id}.`
    };

    setResolvedIncidents(prev => {
      const updated = [newResolvedIncident, ...prev];
      try {
        localStorage.setItem(RESOLVED_INCIDENTS_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    const newHistoryEntry: CollectionEntry = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      timestamp: nowIso,
      operator: opName,
      reporters: reports,
      totalReports: reports.length,
      firstReportAt: firstReportTime,
      durationMinutes: durationMins
    };

    const updatedHistory = [...(container.history || []), newHistoryEntry];
    const updated = { 
      ...container, 
      status: ContainerStatus.NORMAL, 
      reportCount: 0, 
      lastReportedAt: undefined,
      activeReports: [], 
      history: updatedHistory 
    };

    setContainers(prev => prev.map(c => c.id === id ? updated : c));
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'UPDATE_CONTAINER', data: updated }));
    }
    showFeedback(tReplace(t.fbResolveSuccess, { id, operator: opName }), 'success');
  };

  const handleUpdateSupportNumber = (newNumber: string) => {
    if (!isValidMozambiquePhone(newNumber)) {
      showFeedback('Informe um número Tmcel (82/83), Vodacom (84/85) ou Movitel (86/87).', 'error');
      return;
    }
    setSupportNumber(newNumber);
    showFeedback(t.fbSupportUpdate);
  };

  const sendAnnouncementCommand = (type: string, data: unknown) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      showFeedback('Sem conexão com a central. O anúncio não foi enviado.', 'error');
      return false;
    }
    socket.send(JSON.stringify({ type, data }));
    return true;
  };

  const handleCreateAnnouncement = (message: string) => {
    if (sendAnnouncementCommand('CREATE_ANNOUNCEMENT', { message })) {
      showFeedback('Anúncio enviado para os cidadãos.', 'success');
    }
  };

  const handleUpdateAnnouncement = (id: string, message: string) => {
    if (sendAnnouncementCommand('UPDATE_ANNOUNCEMENT', { id, message })) {
      showFeedback('Anúncio atualizado para todos os cidadãos.', 'success');
    }
  };

  const handleDeleteAnnouncement = (id: string) => {
    sendAnnouncementCommand('DELETE_ANNOUNCEMENT', { id });
  };

  const handleAnnouncementReaction = (announcementId: string, reaction: AnnouncementReactionKind | null) => {
    if (!citizenProfile) return;
    sendAnnouncementCommand('REACT_ANNOUNCEMENT', {
      announcementId,
      reaction,
      citizen: {
        name: citizenProfile.name,
        city: citizenProfile.city,
        neighborhood: citizenProfile.neighborhood,
        zone: citizenProfile.zone,
        contact: normalizeContact(citizenProfile.contact)
      }
    });
  };

  const handleRequestPinReset = (contact: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setPinResetStatus({ status: 'error', message: 'Sem conexão com a central. Tente novamente.' });
      return;
    }
    socket.send(JSON.stringify({ type: 'REQUEST_PIN_RESET', data: { contact } }));
  };

  const handleCompletePinReset = (requestId: string, pin: string) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setPinResetStatus({ requestId, status: 'error', message: 'Sem conexão. O pedido expirou; solicite novamente.' });
      return;
    }
    socket.send(JSON.stringify({ type: 'COMPLETE_PIN_RESET', data: { requestId, pin } }));
  };

  const handleUpdateCitizenPin = (contact: string, pin: string) => {
    const normalizedContact = normalizeContact(contact);
    setCitizenProfile(previous => {
      if (!previous || normalizeContact(previous.contact) !== normalizedContact) return previous;
      const updated = { ...previous, pin };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setCitizens(previous => {
      const updated = previous.map(citizen => normalizeContact(citizen.contact) === normalizedContact ? { ...citizen, pin } : citizen);
      try {
        localStorage.setItem(CITIZENS_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleApprovePinReset = (requestId: string) => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'APPROVE_PIN_RESET', data: { requestId } }));
  };

  const handleRejectPinReset = (requestId: string) => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'REJECT_PIN_RESET', data: { requestId } }));
  };

  const handleUpdateCityLogo = (newLogoUrl: string) => {
    const trimmed = (newLogoUrl || '').trim();
    setCityLogoUrl(trimmed);
    try {
      if (trimmed) {
        localStorage.setItem(CITY_LOGO_STORAGE_KEY, trimmed);
        localStorage.removeItem(LEGACY_CITY_LOGO_STORAGE_KEY);
      } else {
        localStorage.removeItem(CITY_LOGO_STORAGE_KEY);
        localStorage.removeItem(LEGACY_CITY_LOGO_STORAGE_KEY);
      }
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      let parsed: any = {};
      if (savedSettings) {
        try { parsed = JSON.parse(savedSettings); } catch (e) {}
      }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...parsed, cityLogoUrl: trimmed, supportNumber }));
      window.dispatchEvent(new CustomEvent(CITY_LOGO_EVENT, { detail: trimmed }));
    } catch (e) {
      console.error('Erro ao salvar logo da cidade:', e);
    }
    showFeedback(trimmed ? 'Logo da cidade atualizado com sucesso!' : 'Logotipo padrão restaurado com sucesso!');
  };

  const handleAddContainer = (newContainer: WasteContainer) => {
    const idExists = containers.some(c => c.id.trim().toUpperCase() === newContainer.id.trim().toUpperCase());
    if (idExists) {
      showFeedback(`O contentor com ID "${newContainer.id}" já existe no sistema.`, 'error');
      return;
    }

    const containerWithDefaults = {
      ...newContainer,
      reportCount: newContainer.status === ContainerStatus.ALERT ? (newContainer.reportCount || 1) : 0,
      history: newContainer.history || []
    };

    setContainers(prev => [...prev, containerWithDefaults]);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'ADD_CONTAINER', data: containerWithDefaults }));
    }
    showFeedback(tReplace(t.fbAddSuccess, { id: newContainer.id }));
  };

  const handleUpdateContainer = (updatedContainer: WasteContainer) => {
    setContainers(prev => prev.map(c => c.id === updatedContainer.id ? updatedContainer : c));
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'UPDATE_CONTAINER', data: updatedContainer }));
    }
    showFeedback(tReplace(t.fbUpdateSuccess, { id: updatedContainer.id }));
  };

  const handleDeleteContainer = (id: string) => {
    addDeletedContainerId(id);
    setContainers(prev => {
      const updated = prev.filter(c => c.id !== id);
      try {
        localStorage.setItem(CONTAINERS_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'DELETE_CONTAINER', data: id }));
    }

    // Call REST endpoint as reliable fallback
    fetch(`/api/containers/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});

    showFeedback(tReplace(t.fbDeleteSuccess, { id }), 'error');
  };

  const handleDeleteResolvedIncident = (id: string) => {
    setResolvedIncidents(prev => {
      const updated = prev.filter(inc => inc.id !== id);
      try {
        localStorage.setItem(RESOLVED_INCIDENTS_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    showFeedback('Registro excluído do histórico de denúncias resolvidas.', 'info');
  };

  const handleDeleteCitizen = (contact: string) => {
    setCitizens(prev => {
      const updated = prev.filter(c => c.contact !== contact);
      try {
        localStorage.setItem(CITIZENS_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    showFeedback('Munícipe removido da base de dados com sucesso.', 'info');
  };

  const handleCompleteRegistration = (profile: CitizenProfile) => {
    if (!isValidMozambiquePhone(profile.contact)) {
      showFeedback('Use um número nacional Tmcel, Vodacom ou Movitel válido.', 'error');
      return;
    }
    setCitizenProfile(profile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    setCitizens(prev => {
      const filtered = prev.filter(c => c.contact !== profile.contact);
      const updated = [...filtered, profile];
      localStorage.setItem(CITIZENS_KEY, JSON.stringify(updated));
      return updated;
    });
    setIsLoggedIn(false);
    setRole('citizen');
    setAuthView('login');
    showFeedback("Cadastro concluído com sucesso! Digite sua senha (PIN) para entrar.", 'success');
  };

  const handleLogin = (authenticatedRole: UserRole, authenticatedCentralToken?: string) => {
    setRole(authenticatedRole);
    setCentralToken(authenticatedRole === 'operational' ? authenticatedCentralToken || null : null);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'DEAUTH_CENTRAL' }));
    }
    setIsLoggedIn(false);
    setRole(null);
    setCentralToken(null);
    setAuthView('welcome');
  };

  const handleResetRegistration = () => {
    setCitizenProfile(null);
    localStorage.removeItem(STORAGE_KEY);
    setRole(null);
    setIsLoggedIn(false);
    setAuthView('welcome');
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!isLoggedIn) {
    if (authView === 'welcome') {
      return (
        <WelcomeScreen 
          onSelectLogin={() => setAuthView('login')}
          onSelectRegister={() => setAuthView('register')}
          onSelectAdmin={() => {
            if (!isNativeAppWebView()) {
              setAuthView('operational');
            }
          }}
          lang={lang}
          onLangChange={setLang}
          hasProfile={!!citizenProfile}
          registeredName={citizenProfile?.name}
        />
      );
    }

    if (authView === 'register') {
      return (
        <CitizenRegistration 
          onComplete={handleCompleteRegistration} 
          lang={lang} 
          onLangChange={setLang} 
          onBack={() => setAuthView('welcome')}
          onGoToLogin={() => setAuthView('login')}
        />
      );
    }

    if (authView === 'login') {
      return (
        <LoginScreen 
          onAuthenticate={handleLogin} 
          lang={lang} 
          onLangChange={setLang} 
          savedProfile={citizenProfile}
          allCitizens={citizens}
          pinResetStatus={pinResetStatus}
          onRequestPinReset={handleRequestPinReset}
          onCompletePinReset={handleCompletePinReset}
          onUpdateCitizenPin={handleUpdateCitizenPin}
          onSelectCitizenProfile={(p) => {
            setCitizenProfile(p);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
          }}
          onReset={handleResetRegistration}
          onBack={() => setAuthView('welcome')}
          onGoToRegister={() => setAuthView('register')}
        />
      );
    }

    if (authView === 'operational') {
      if (isNativeAppWebView()) {
        setAuthView('welcome');
        return null;
      }
      return (
        <LoginScreen 
          onAuthenticate={handleLogin} 
          lang={lang} 
          onLangChange={setLang} 
          savedProfile={citizenProfile}
          initialAdminMode={true}
          onBack={() => setAuthView('welcome')}
        />
      );
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />
        <p className="text-white font-black uppercase tracking-widest text-[10px]">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <header className="bg-slate-900 text-white shadow-2xl sticky top-0 z-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <button 
              onClick={handleLogout}
              className="p-3 bg-white/5 hover:bg-yellow-500 hover:text-slate-900 text-white rounded-2xl transition-all duration-300 border border-white/10 hover:border-yellow-500 shadow-xl group"
              title={t.logout}
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
            <Logo size="sm" className="shadow-2xl ring-2 ring-yellow-500/50" />
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">
                  LIMPA-<span className="text-yellow-500">LAAA</span>
                </h1>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                  socket ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${socket ? 'bg-emerald-400' : 'bg-orange-400'}`}></div>
                  {socket ? t.liveMode : t.offlineMode}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  {role === 'citizen' ? `${t.citizenRole}: ${citizenProfile?.name}` : t.operationalRole}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {role === 'citizen' && (
              <a 
                href={`tel:${supportNumber}`}
                className="px-6 py-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-2xl transition-all duration-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-emerald-500/20 shadow-xl group"
              >
                <Phone className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                {t.support}: {supportNumber}
              </a>
            )}
            <button 
              onClick={handleLogout} 
              className="group px-6 py-3 bg-white/5 hover:bg-red-500 text-white rounded-2xl transition-all duration-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-white/10 hover:border-red-500 shadow-xl"
            >
              <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" /> {t.logout}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 py-8">
        {feedback && (
          <div className={`mb-6 p-4 rounded-2xl shadow-lg border-l-4 animate-in slide-in-from-top flex justify-between items-center ${
            feedback.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' : 
            feedback.type === 'info' ? 'bg-sky-50 border-sky-500 text-sky-800' : 'bg-yellow-50 border-yellow-500 text-yellow-800'
          }`}>
            <span className="font-bold">{feedback.message}</span>
          </div>
        )}

        {role === 'citizen' ? (
          <CitizenView 
            containers={sortedContainers} 
            citizenProfile={citizenProfile || {
              name: 'Munícipe de Gondola',
              city: 'Gondola',
              neighborhood: 'Central',
              zone: 'Geral',
              contact: '840000000',
              pin: '0000'
            }}
            supportNumber={supportNumber}
            announcements={announcements}
            onAnnouncementReaction={handleAnnouncementReaction}
            onReport={handleReportFull} 
            lang={lang}
            onLangChange={setLang}
          />
        ) : (
          <OperationalView 
            containers={containers} 
            citizens={citizens}
            supportNumber={supportNumber}
            announcements={announcements}
            pinResetRequests={pinResetRequests}
            onApprovePinReset={handleApprovePinReset}
            onRejectPinReset={handleRejectPinReset}
            onCreateAnnouncement={handleCreateAnnouncement}
            onUpdateAnnouncement={handleUpdateAnnouncement}
            onDeleteAnnouncement={handleDeleteAnnouncement}
            onUpdateSupportNumber={handleUpdateSupportNumber}
            cityLogoUrl={cityLogoUrl}
            onUpdateCityLogo={handleUpdateCityLogo}
            resolvedIncidents={resolvedIncidents}
            onDeleteResolvedIncident={handleDeleteResolvedIncident}
            onDeleteCitizen={handleDeleteCitizen}
            onResolve={handleResolve}
            onAdd={handleAddContainer}
            onUpdate={handleUpdateContainer}
            onDelete={handleDeleteContainer}
          />
        )}
      </main>

      {role === 'citizen' && collectionNotifications.length > 0 && (
        <div aria-live="polite" className="fixed right-4 top-24 z-[10000] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
          {collectionNotifications.map(notification => (
            <div key={notification.id} className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <BellRing className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase text-emerald-800">Coleta concluída</p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-700">{notification.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setCollectionNotifications(previous => previous.filter(item => item.id !== notification.id))}
                aria-label="Fechar notificação"
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <footer className="bg-slate-900 text-white py-16 mt-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
              <Logo size="sm" className="grayscale brightness-200 opacity-50" />
              <h4 className="text-white font-black text-2xl tracking-tighter uppercase">LIMPA-<span className="text-yellow-500">LAAA</span></h4>
            </div>
            <p className="text-slate-500 font-bold italic text-sm max-w-md">
              {t.cityMotto}
            </p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-4">
            <div className="flex gap-6 mb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-yellow-500 cursor-pointer transition-colors">{t.privacy}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-yellow-500 cursor-pointer transition-colors">{t.terms}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-yellow-500 cursor-pointer transition-colors">{t.support}</span>
            </div>
            <div className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">
              &copy; {new Date().getFullYear()} {t.footerCopyright}
            </div>
          </div>
        </div>
      </footer>

      <OfflineIndicator />
    </div>
  );
};

export default App;
