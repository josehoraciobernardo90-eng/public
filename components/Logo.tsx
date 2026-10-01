
import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

export const DEFAULT_LOGO_URL = "https://cdn3d.iconscout.com/3d/premium/thumb/trash-can-4482355-3723267.png";
export const CITY_LOGO_STORAGE_KEY = 'limpa_chimoio_city_logo';
export const LEGACY_CITY_LOGO_STORAGE_KEY = 'limpa_Gondola_city_logo';
export const CITY_LOGO_EVENT = 'limpa_chimoio_city_logo_changed';

export interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  logoUrl?: string;
  alt?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md',
  logoUrl,
  alt = 'LIMPA-LAAA Logo'
}) => {
  const dimensions = {
    xs: 'w-7 h-7',
    sm: 'w-10 h-10',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40'
  };

  const iconSizes = {
    xs: 14,
    sm: 20,
    md: 40,
    lg: 64,
    xl: 80
  };

  const [storedLogo, setStoredLogo] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(CITY_LOGO_STORAGE_KEY) || localStorage.getItem(LEGACY_CITY_LOGO_STORAGE_KEY) || '';
      } catch (e) {
        return '';
      }
    }
    return '';
  });

  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const handleCustomChange = (e: any) => {
      const url = e.detail !== undefined ? e.detail : '';
      setStoredLogo(url);
      setImgError(false);
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === CITY_LOGO_STORAGE_KEY) {
        setStoredLogo(e.newValue || '');
        setImgError(false);
      }
    };

    window.addEventListener(CITY_LOGO_EVENT, handleCustomChange as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(CITY_LOGO_EVENT, handleCustomChange as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const effectiveLogo = (logoUrl !== undefined ? logoUrl : storedLogo).trim();
  const displaySrc = effectiveLogo ? effectiveLogo : DEFAULT_LOGO_URL;

  // Reset imgError if the source changes
  useEffect(() => {
    setImgError(false);
  }, [displaySrc]);

  return (
    <div className={`relative flex items-center justify-center bg-transparent rounded-full overflow-hidden ${dimensions[size]} ${className}`}>
      {/* Glow de fundo para o logo - Amarelo */}
      <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-md animate-pulse pointer-events-none -z-10"></div>
      
      {imgError ? (
        <Trash2 className="text-yellow-500 relative z-10" size={iconSizes[size]} />
      ) : (
        <img 
          src={displaySrc} 
          alt={alt}
          className="w-full h-full object-cover rounded-full bg-transparent relative z-10 drop-shadow-md hover:scale-105 transition-transform duration-300"
          style={{ borderRadius: '50%', overflow: 'hidden' }}
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
};

export default Logo;
