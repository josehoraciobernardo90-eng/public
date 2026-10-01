import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderCheck, 
  Search, 
  Download, 
  CheckCircle2, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  Calendar, 
  FileText, 
  ChevronRight, 
  ArrowLeft, 
  X, 
  Loader2, 
  Sparkles,
  ShieldCheck,
  Building2,
  Users,
  Trash2
} from 'lucide-react';
import { ResolvedIncident } from '../types';
import { generateResolvedIncidentPdf, generateResolvedFolderPdf } from '../utils/pdfGenerator';

interface ResolvedFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: ResolvedIncident[];
  supportNumber: string;
  onDeleteIncident?: (id: string) => void;
}

export const ResolvedFolderModal: React.FC<ResolvedFolderModalProps> = ({
  isOpen,
  onClose,
  incidents,
  supportNumber,
  onDeleteIncident
}) => {
  const [selectedIncident, setSelectedIncident] = useState<ResolvedIncident | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNeighborhood, setFilterNeighborhood] = useState('ALL');
  const [filterOperator, setFilterOperator] = useState('ALL');
  const [isExportingFolderPdf, setIsExportingFolderPdf] = useState(false);
  const [isExportingSinglePdf, setIsExportingSinglePdf] = useState(false);

  // Lista de bairros e operadores únicos para filtros rápidos
  const uniqueNeighborhoods = useMemo(() => {
    const set = new Set<string>();
    incidents.forEach(i => {
      if (i.neighborhood) set.add(i.neighborhood);
    });
    return Array.from(set).sort();
  }, [incidents]);

  const uniqueOperators = useMemo(() => {
    const set = new Set<string>();
    incidents.forEach(i => {
      if (i.operator) set.add(i.operator);
    });
    return Array.from(set).sort();
  }, [incidents]);

  // Filtragem dos incidentes
  const filteredIncidents = useMemo(() => {
    return incidents.filter(item => {
      const matchesNeighborhood = filterNeighborhood === 'ALL' || item.neighborhood === filterNeighborhood;
      const matchesOperator = filterOperator === 'ALL' || item.operator === filterOperator;
      
      const term = searchTerm.toLowerCase().trim();
      if (!term) return matchesNeighborhood && matchesOperator;

      const matchesText = 
        item.containerId?.toLowerCase().includes(term) ||
        item.neighborhood?.toLowerCase().includes(term) ||
        item.avenue?.toLowerCase().includes(term) ||
        item.operator?.toLowerCase().includes(term) ||
        item.referencePoint?.toLowerCase().includes(term) ||
        (item.reporters || []).some(r => 
          r.citizenName?.toLowerCase().includes(term) || 
          r.citizenContact?.includes(term) ||
          r.citizenNeighborhood?.toLowerCase().includes(term)
        );

      return matchesNeighborhood && matchesOperator && matchesText;
    });
  }, [incidents, filterNeighborhood, filterOperator, searchTerm]);

  // Exportar pasta completa
  const handleExportAllPdf = () => {
    setIsExportingFolderPdf(true);
    try {
      generateResolvedFolderPdf(filteredIncidents, supportNumber);
    } catch (e) {
      console.error('Erro ao gerar PDF da pasta:', e);
    } finally {
      setTimeout(() => setIsExportingFolderPdf(false), 800);
    }
  };

  // Exportar item individual
  const handleExportSinglePdf = (inc: ResolvedIncident) => {
    setIsExportingSinglePdf(true);
    try {
      generateResolvedIncidentPdf(inc, supportNumber);
    } catch (e) {
      console.error('Erro ao gerar PDF individual:', e);
    } finally {
      setTimeout(() => setIsExportingSinglePdf(false), 800);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
        
        {/* Cabeçalho da Pasta */}
        <div className="p-6 md:p-8 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 shadow-inner">
              <FolderCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-md">
                  Arquivo Oficial
                </span>
                      <span className="text-[9px] font-bold uppercase text-slate-400">Município de Gondola</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white">
                Pasta de Denúncias <span className="text-yellow-500">Resolvidas</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!selectedIncident && (
              <button
                onClick={handleExportAllPdf}
                disabled={isExportingFolderPdf || filteredIncidents.length === 0}
                className="hidden sm:flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isExportingFolderPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Descarregar Pasta em PDF
              </button>
            )}
            <button
              onClick={onClose}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl transition-all active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {!selectedIncident ? (
              /* VISTA 1: Lista das Denúncias Resolvidas na Pasta */
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Métricas e Indicadores Rápidos */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Resolvido</span>
                    <span className="text-2xl font-black text-yellow-500">{incidents.length}</span>
                  </div>
                  <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Munícipes Atendidos</span>
                    <span className="text-2xl font-black text-emerald-400">
                      {incidents.reduce((acc, i) => acc + (i.reporters?.length || i.totalReports || 1), 0)}
                    </span>
                  </div>
                  <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Bairros Atendidos</span>
                    <span className="text-2xl font-black text-sky-400">{uniqueNeighborhoods.length}</span>
                  </div>
                  <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">Operadores Ativos</span>
                    <span className="text-2xl font-black text-purple-400">{uniqueOperators.length}</span>
                  </div>
                </div>

                {/* Barra de Pesquisa e Filtros */}
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por ID, bairro, operador ou munícipe denunciante..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-800/80 border border-slate-700 rounded-2xl text-xs font-bold text-white placeholder-slate-400 focus:border-yellow-500 outline-none transition-all"
                    />
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={filterNeighborhood}
                      onChange={(e) => setFilterNeighborhood(e.target.value)}
                      className="px-4 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl text-xs font-bold text-white outline-none focus:border-yellow-500"
                    >
                      <option value="ALL">Todos os Bairros</option>
                      {uniqueNeighborhoods.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>

                    <select
                      value={filterOperator}
                      onChange={(e) => setFilterOperator(e.target.value)}
                      className="px-4 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl text-xs font-bold text-white outline-none focus:border-yellow-500"
                    >
                      <option value="ALL">Todos os Operadores</option>
                      {uniqueOperators.map(op => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Botão de download em mobile */}
                <div className="sm:hidden">
                  <button
                    onClick={handleExportAllPdf}
                    disabled={isExportingFolderPdf || filteredIncidents.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
                  >
                    {isExportingFolderPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Descarregar Pasta em PDF
                  </button>
                </div>

                {/* Lista de Registros */}
                <div className="space-y-3">
                  {filteredIncidents.map((incident) => {
                    const reporterCount = incident.reporters?.length || incident.totalReports || 1;
                    const reporterNames = (incident.reporters || []).map(r => r.citizenName).filter(Boolean);
                    const formattedDate = new Date(incident.collectedAt).toLocaleDateString('pt-MZ', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    });
                    const formattedTime = new Date(incident.collectedAt).toLocaleTimeString('pt-MZ', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <motion.div
                        key={incident.id}
                        whileHover={{ y: -2 }}
                        onClick={() => setSelectedIncident(incident)}
                        className="bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-yellow-500/50 p-5 rounded-2xl transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mt-1 flex-shrink-0">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-yellow-500/20 text-yellow-400 uppercase tracking-tighter">
                                {incident.containerId}
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                Coleta Concluída
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {formattedDate} às {formattedTime}
                              </span>
                            </div>

                            <h4 className="text-base font-black text-white uppercase tracking-tight">
                              {incident.neighborhood} 
                              <span className="text-xs font-normal text-slate-400 ml-2">
                                • {incident.avenue} ({incident.referencePoint || 'Ponto Central'})
                              </span>
                            </h4>

                            {/* Detalhes de Quem Fez a Denúncia e Operador */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
                              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-yellow-500" />
                                Operador: <strong className="text-yellow-400">{incident.operator}</strong>
                              </span>

                              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-sky-400" />
                                Denúncias: <strong className="text-sky-400">{reporterCount} {reporterCount === 1 ? 'munícipe' : 'munícipes'}</strong>
                                {reporterNames.length > 0 && (
                                  <span className="text-slate-400 font-medium">({reporterNames.slice(0, 2).join(', ')}{reporterNames.length > 2 ? '...' : ''})</span>
                                )}
                              </span>

                              {incident.durationMinutes && (
                                <span className="text-slate-400 text-[11px] font-semibold">
                                  Tempo de resposta: ~{incident.durationMinutes} min
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center">
                          {onDeleteIncident && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Deseja excluir o registro da denúncia ${incident.containerId} do histórico?`)) {
                                  onDeleteIncident(incident.id);
                                }
                              }}
                              className="p-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all active:scale-95 group cursor-pointer"
                              title="Excluir este registro"
                            >
                              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportSinglePdf(incident);
                            }}
                            className="p-3 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all"
                            title="Descarregar Comprovativo PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <div className="flex items-center gap-1 text-xs font-black text-yellow-500 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                            Ver Dossiê
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {filteredIncidents.length === 0 && (
                    <div className="text-center py-16 bg-slate-800/30 rounded-3xl border border-dashed border-slate-700">
                      <FolderCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">
                        Nenhuma denúncia resolvida encontrada para este filtro.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              /* VISTA 2: Dossiê Completo da Ocorrência Resolvida */
              <motion.div
                key="detail"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                {/* Barra de Navegação do Dossiê */}
                <div className="flex items-center justify-between bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
                  <button
                    onClick={() => setSelectedIncident(null)}
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-300 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para a Pasta
                  </button>

                  <div className="flex items-center gap-3">
                    {onDeleteIncident && selectedIncident && (
                      <button
                        onClick={() => {
                          if (confirm(`Deseja excluir o registro da denúncia ${selectedIncident.containerId} do arquivo histórico?`)) {
                            onDeleteIncident(selectedIncident.id);
                            setSelectedIncident(null);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 group cursor-pointer"
                        title="Excluir Registro do Arquivo"
                      >
                        <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Excluir Registro
                      </button>
                    )}
                    <button
                      onClick={() => handleExportSinglePdf(selectedIncident)}
                      disabled={isExportingSinglePdf}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      {isExportingSinglePdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Descarregar Comprovativo em PDF
                    </button>
                  </div>
                </div>

                {/* Banner de Identificação */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-800/40 p-6 rounded-3xl border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-black px-3 py-1 bg-yellow-500 text-slate-950 rounded-xl uppercase tracking-tight">
                        ID: {selectedIncident.containerId}
                      </span>
                      <span className="text-[10px] font-black px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-xl uppercase tracking-widest">
                        Status: 100% Coletado & Higienizado
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                      Bairro {selectedIncident.neighborhood}
                    </h3>
                    <p className="text-sm text-slate-400 font-medium">
                      {selectedIncident.avenue} • Quarteirão {selectedIncident.block} • {selectedIncident.referencePoint}
                    </p>
                  </div>

                  <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/80 text-right md:min-w-[220px]">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block mb-1">
                      Conclusão da Coleta
                    </span>
                    <span className="text-sm font-black text-yellow-400 block font-mono">
                      {new Date(selectedIncident.collectedAt).toLocaleDateString('pt-MZ')} às {new Date(selectedIncident.collectedAt).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold block mt-1">
                      Operador: {selectedIncident.operator}
                    </span>
                  </div>
                </div>

                {/* Bloco com Dados do Operador e da Execução */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Operador Executor</span>
                    </div>
                    <p className="text-base font-black text-white uppercase">{selectedIncident.operator}</p>
                    <p className="text-xs text-slate-400">Equipe Oficial de Saneamento Municipal</p>
                  </div>

                  <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400">
                        <Clock className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tempo de Resposta</span>
                    </div>
                    <p className="text-base font-black text-white">
                      {selectedIncident.durationMinutes ? `${selectedIncident.durationMinutes} minutos` : 'Atendimento Imediato'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Desde a 1ª denúncia até a limpeza
                    </p>
                  </div>

                  <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Autenticação</span>
                    </div>
                    <p className="text-xs font-mono font-bold text-emerald-400 truncate">
                      {selectedIncident.id}
                    </p>
                    <p className="text-xs text-slate-400">Validado no Sistema LIMPA-LAAA</p>
                  </div>
                </div>

                {/* Bloco Crucial: Toda a Informação de Quem Fez a Denúncia */}
                <div className="bg-slate-800/40 rounded-3xl p-6 border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white uppercase tracking-tight">
                          Munícipes que Fizeram a Denúncia
                        </h4>
                        <p className="text-xs text-slate-400">
                          {selectedIncident.reporters?.length || selectedIncident.totalReports || 1} munícipe(s) notificaram sobre a lotação deste contentor
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(selectedIncident.reporters && selectedIncident.reporters.length > 0) ? (
                      selectedIncident.reporters.map((reporter, index) => (
                        <div 
                          key={reporter.id || index}
                          className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-xs font-black text-yellow-400 flex-shrink-0">
                              #{index + 1}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h5 className="text-sm font-black text-white uppercase">{reporter.citizenName}</h5>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-emerald-400" />
                                  {reporter.citizenContact}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Residente no Bairro: <strong className="text-slate-300">{reporter.citizenNeighborhood || selectedIncident.neighborhood}</strong>
                                {reporter.citizenZone ? ` (${reporter.citizenZone})` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col md:items-end text-left md:text-right bg-slate-900/60 p-3 rounded-xl">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                              Hora Exata da Denúncia
                            </span>
                            <span className="text-xs font-bold text-yellow-400 font-mono">
                              {new Date(reporter.reportedAt).toLocaleDateString('pt-MZ')} às {new Date(reporter.reportedAt).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            {reporter.note && (
                              <span className="text-[10px] text-slate-400 italic mt-1 max-w-xs truncate">
                                "{reporter.note}"
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-black text-white uppercase">Munícipe do Bairro {selectedIncident.neighborhood}</h5>
                          <p className="text-xs text-slate-400">Contacto: 840000000 • Denúncia registrada presencialmente / aplicativo</p>
                        </div>
                        <span className="text-xs font-bold text-yellow-400 font-mono">
                          {new Date(selectedIncident.firstReportAt).toLocaleString('pt-MZ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé do Dossiê */}
                <div className="p-4 bg-slate-800/30 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
                  <span>
                      Chancelado pelo <strong>Conselho Municipal da Cidade de Gondola</strong> • Presidente Arlindo Cesario Ngozo
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleExportSinglePdf(selectedIncident)}
                      disabled={isExportingSinglePdf}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2"
                    >
                      {isExportingSinglePdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Descarregar Comprovativo PDF
                    </button>
                    <button
                      onClick={() => setSelectedIncident(null)}
                      className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest"
                    >
                      Voltar à Pasta
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Rodapé Geral da Modal */}
        <div className="p-5 border-t border-slate-800 bg-slate-900 flex justify-between items-center text-xs text-slate-500">
          <span>LIMPA-LAAA • Gestão de Ocorrências e Resíduos Sólidos</span>
          <button
            onClick={onClose}
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
          >
            Fechar Pasta
          </button>
        </div>

      </div>
    </div>
  );
};
