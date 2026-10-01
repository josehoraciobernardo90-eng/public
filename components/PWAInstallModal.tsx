import React from 'react';
import { Download, Smartphone, Globe, CheckCircle, X, ExternalLink, HelpCircle, Layers, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 my-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center text-green-700">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Instalar LIMPA-LAAA</h2>
              <p className="text-xs text-slate-500 font-medium">Aplicativo Web e Android (APK / WebAPK)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 space-y-5">
          {/* Status Badge */}
          {isInstalled ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-emerald-800">
              <CheckCircle className="w-6 h-6 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold">Aplicativo já instalado!</p>
                <p className="text-xs text-emerald-700 mt-0.5">Você já está a utilizar a versão instalada no seu dispositivo.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Compatibilidade Dupla</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                  <ShieldCheck className="w-3.5 h-3.5" /> Web & Android
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Este aplicativo é uma <strong>PWA (Progressive Web App)</strong> completa. Ele funciona no navegador e pode ser instalado no telemóvel Android como aplicativo nativo (WebAPK), sem precisar de baixar arquivos pesados.
              </p>

              {/* Action Button if Browser Supports Direct Prompt */}
              {isInstallable && (
                <button
                  onClick={async () => {
                    await install();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 px-4 text-sm font-bold text-white shadow-md shadow-green-600/20 hover:bg-green-700 active:scale-[0.98] transition"
                >
                  <Download className="w-5 h-5" />
                  Instalar Agora no Meu Telemóvel / PC
                </button>
              )}
            </div>
          )}

          {/* Option 1: Direct Install on Android / Chrome */}
          {/* Option 1: Microsoft Edge (Windows / PC) */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">1</span>
              Como Instalar no Microsoft Edge (Computador / Windows)
            </h3>
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 text-xs text-slate-600 space-y-2">
              <p className="font-semibold text-blue-900">Você está a usar o Microsoft Edge? A instalação é direta e não precisa de nenhum site externo:</p>
              <div className="flex items-start gap-2.5">
                <span className="font-bold text-slate-700">Método 1:</span>
                <span>Olhe para a <strong>barra de endereço</strong> do Microsoft Edge (no topo, à direita onde está o link). Clique no ícone de <strong>"Aplicativo disponível / Instalar LIMPA-LAAA"</strong> (ícone de computador ou 3 quadrados com um +).</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-bold text-slate-700">Método 2:</span>
                <span>Clique nos <strong>três pontinhos (...)</strong> no canto superior direito do Edge → vá a <strong>"Aplicativos" (Apps)</strong> → clique em <strong>"Instalar este site como aplicativo"</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-bold text-slate-700">Pronto:</span>
                <span className="text-emerald-700 font-medium">O LIMPA-LAAA será instalado no Windows com ícone no seu ambiente de trabalho e menu iniciar!</span>
              </div>
            </div>
          </div>

          {/* Option 2: Android Phone (Google Chrome / Samsung) */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white">2</span>
              Como Instalar no Telemóvel Android (Sem precisar de download de APK)
            </h3>
            <div className="rounded-xl border border-slate-200 p-3.5 bg-white text-xs text-slate-600 space-y-2">
              <div className="flex items-start gap-2.5">
                <span className="font-bold text-slate-700">Passo 1:</span>
                <span>No telemóvel Android, abra o link no <strong>Google Chrome</strong> ou <strong>Samsung Internet</strong>.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-bold text-slate-700">Passo 2:</span>
                <span>Toque no menu de três pontinhos (<strong>⋮</strong>) no canto superior direito do navegador.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-bold text-slate-700">Passo 3:</span>
                <span>Toque em <strong>"Instalar aplicativo"</strong> (ou <strong>"Adicionar ao ecrã inicial"</strong>).</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-bold text-slate-700">Resultado:</span>
                <span className="text-green-700 font-medium">O Android instala o aplicativo automaticamente como um WebAPK nativo, sem dar erro de instalação!</span>
              </div>
            </div>
          </div>

          {/* Option 3: iOS (iPhone / iPad) */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-[10px] font-bold text-white">3</span>
              Para iPhone / iPad (iOS / Safari)
            </h3>
            <div className="rounded-xl border border-slate-200 p-3.5 bg-white text-xs text-slate-600 space-y-1.5">
              <p>1. Abra no navegador <strong>Safari</strong>.</p>
              <p>2. Toque no botão de <strong>Partilhar</strong> (ícone do quadrado com a seta para cima ⎋).</p>
              <p>3. Selecione <strong>"Adicionar ao Ecrã Principal"</strong>.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
