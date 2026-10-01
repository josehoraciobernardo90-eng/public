import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ className = '', compact = false }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = async () => {
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setModalOpen(true);
      }
    } else {
      setModalOpen(true);
    }
  };

  // If already installed in standalone mode, display a subtle indicator or nothing
  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={className || `flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:from-emerald-700 hover:to-green-700 active:scale-95 transition-all`}
        title="Instalar aplicativo (Web / APK Android)"
        aria-label="Instalar aplicativo"
      >
        <Smartphone className="w-4 h-4" />
        <span>{compact ? 'Instalar App' : 'Instalar App / APK'}</span>
      </button>

      <PWAInstallModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
