
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { WasteContainer, ContainerStatus } from '../types';
import { Target, Maximize, Crosshair } from 'lucide-react';

interface MapOverviewProps {
  containers: WasteContainer[];
  onResolve?: (id: string, operator: string) => void;
  onReport?: (id: string) => void;
  onViewHistory?: (id: string) => void;
  showControls?: boolean;
}

const MapOverview: React.FC<MapOverviewProps> = ({ 
  containers, 
  onResolve, 
  onReport,
  showControls = true 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    const mapInstance = L.map(mapRef.current, {
      center: [-19.0667, 33.6500],
      zoom: 18, 
      zoomControl: false,
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Esri, Maxar'
    }).addTo(mapInstance);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      pane: 'shadowPane',
      opacity: 1.0
    }).addTo(mapInstance);

    const layerGroup = L.layerGroup().addTo(mapInstance);
    markersLayer.current = layerGroup;
    leafletMap.current = mapInstance;

    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

    setTimeout(() => {
      mapInstance.invalidateSize();
    }, 200);

    handleLocateUser(false);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
      markersLayer.current = null;
      userMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = leafletMap.current;
    const layer = markersLayer.current;
    if (!map || !layer) return;

    layer.clearLayers();

    containers.forEach(container => {
      if (!container.latitude || !container.longitude) return;

      const pos: L.LatLngExpression = [container.latitude, container.longitude];
      const isAlert = container.status === ContainerStatus.ALERT;
      const isCritical = (container.reportCount || 0) >= 3;
      
      const color = isCritical ? '#dc2626' : isAlert ? '#f97316' : '#eab308'; // Amarelo Municipal
      const shadow = isCritical ? 'rgba(220, 38, 38, 0.6)' : isAlert ? 'rgba(249, 115, 22, 0.4)' : 'rgba(234, 179, 8, 0.3)';

      const markerHtml = `
        <div class="relative flex items-center justify-center group">
          ${isAlert ? `<div class="absolute inset-0 rounded-full animate-ping" style="background: ${color}; opacity: 0.3; animation-duration: 2s"></div>` : ''}
          <div class="w-10 h-10 rounded-full border-4 border-white shadow-2xl flex items-center justify-center transition-transform group-hover:scale-125 z-10" style="background: ${color}; box-shadow: 0 0 15px ${shadow}">
            <svg viewBox="0 0 24 24" class="w-5 h-5 text-slate-900 fill-current">
              ${isAlert ? '<path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V8h2v4z"/>' : '<circle cx="12" cy="12" r="6"/>'}
            </svg>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: markerHtml,
        className: 'custom-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
      });

      const popup = L.popup({ closeButton: false, offset: L.point(0, -5), minWidth: 280 }).setContent(`
        <div class="p-5 font-sans">
          <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block leading-none">Contentor</span>
              <h4 class="text-xl font-black text-slate-900 uppercase tracking-tighter">${container.id}</h4>
            </div>
            <div class="px-3 py-1 rounded-full text-[8px] font-black uppercase ${isAlert ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}">
              ${isAlert ? 'PENDENTE' : 'LIMPO'}
            </div>
          </div>

          ${container.imageUrl ? `
            <div class="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <img src="${container.imageUrl}" alt="Imagem do contentor ${container.id}" class="w-full h-24 object-cover" />
            </div>
          ` : ''}
          
          <div class="space-y-3 mb-5">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </div>
              <div class="min-w-0">
                <p class="text-[10px] font-black text-slate-900 uppercase leading-tight truncate">${container.neighborhood}</p>
              </div>
            </div>
          </div>

          <div class="flex gap-2">
            ${isAlert && onResolve ? `
              <button onclick="window.handleMapResolve('${container.id}')" class="flex-1 bg-slate-900 hover:bg-yellow-500 hover:text-slate-900 text-white text-[10px] font-black uppercase py-4 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2">
                Confirmar Coleta
              </button>
            ` : ''}
          </div>
        </div>
      `);

      L.marker(pos, { icon }).addTo(layer).bindPopup(popup);
    });

    (window as any).handleMapResolve = (id: string) => onResolve?.(id, 'Operacional via Mapa');

    return () => {
      delete (window as any).handleMapResolve;
    };
  }, [containers, onResolve, onReport]);

  const handleLocateUser = (shouldFly = true) => {
    if (!navigator.geolocation || !leafletMap.current) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!leafletMap.current) return;
        const userPos: L.LatLngExpression = [pos.coords.latitude, pos.coords.longitude];
        if (userMarkerRef.current) userMarkerRef.current.setLatLng(userPos);
        else {
          userMarkerRef.current = L.marker(userPos, {
            icon: L.divIcon({
              html: `<div class="w-8 h-8 bg-blue-600 border-4 border-white rounded-full shadow-2xl animate-pulse"></div>`,
              className: '', iconSize: [32, 32], iconAnchor: [16, 16]
            })
          }).addTo(leafletMap.current);
        }
        if (shouldFly) leafletMap.current.flyTo(userPos, 19); 
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true }
    );
  };

  const fitAll = () => {
    if (!leafletMap.current || !markersLayer.current) return;
    const group = L.featureGroup(markersLayer.current.getLayers());
    if (group.getLayers().length > 0) {
      leafletMap.current.flyToBounds(group.getBounds(), { padding: [80, 80] });
    }
  };

  return (
    <div className="relative w-full h-[650px] rounded-[3.5rem] overflow-hidden border-[12px] border-white shadow-2xl">
      <div ref={mapRef} className="w-full h-full z-10" />
      
      {showControls && (
        <div className="absolute top-8 right-8 z-[1000] flex flex-col gap-4">
          <button onClick={() => handleLocateUser(true)} className="p-5 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white text-slate-700 hover:text-blue-600 transition-all hover:scale-110 active:scale-90">
            {isLocating ? <Crosshair className="w-7 h-7 animate-spin" /> : <Target className="w-7 h-7" />}
          </button>
        </div>
      )}

      <style>{`
        .leaflet-popup-content-wrapper { padding: 0 !important; border-radius: 2.5rem !important; overflow: hidden; box-shadow: 0 30px 60px -15px rgba(0,0,0,0.6) !important; }
        .leaflet-popup-content { margin: 0 !important; }
      `}</style>
    </div>
  );
};

export default MapOverview;
