
import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { UserCircle, UserPlus, Languages, Trash2 } from 'lucide-react';
import { Language } from '../types';
import Logo from './Logo';
import { translations } from '../translations';
import { isNativeAppWebView } from '../utils/device';

interface WelcomeScreenProps {
  onSelectLogin: () => void;
  onSelectRegister: () => void;
  onSelectAdmin: () => void;
  lang: Language;
  onLangChange: (lang: Language) => void;
  hasProfile: boolean;
  registeredName?: string;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onSelectLogin, 
  onSelectRegister, 
  onSelectAdmin, 
  lang, 
  onLangChange,
  hasProfile,
  registeredName
}) => {
  const t = translations[lang];
  const lastClickRef = useRef<number>(0);

  // Trigger confidencial para administração:
  // Requer dois cliques seguidos e não funciona dentro do APK nativo.
  const handleAdminTrigger = () => {
    if (isNativeAppWebView()) {
      return;
    }
    onSelectAdmin();
  };

  const handleDoubleOrSecretClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    // Dois cliques seguidos (dentro de 500ms)
    if (now - lastClickRef.current < 500) {
      handleAdminTrigger();
      lastClickRef.current = 0;
    } else {
      lastClickRef.current = now;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-yellow-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse delay-700"></div>

      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={() => onLangChange(lang === 'pt' ? 'en' : 'pt')}
          className="bg-white/5 backdrop-blur-md text-white px-5 py-2.5 rounded-full flex items-center gap-3 border border-white/10 hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <Languages className="w-4 h-4 text-yellow-500" />
          {lang === 'pt' ? 'English' : 'Português'}
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center z-10"
      >
        <div className="mb-10">
          {/* Logotipo da lixeira com gatilho de 2 cliques */}
          <div 
            onClick={handleDoubleOrSecretClick}
            onDoubleClick={handleAdminTrigger}
            className="inline-block cursor-default select-none"
            title=""
          >
            <Logo size="lg" className="mx-auto mb-8 shadow-2xl ring-4 ring-yellow-500/20" />
          </div>

          <h1 className="text-4xl font-black text-white uppercase tracking-tighter leading-none mb-3">
            LIMPA-<span className="text-yellow-500">LAAA</span>
          </h1>

          {/* Ícone da lixeira abaixo do LIMPA-LAAA com gatilho de 2 cliques seguidos */}
          <div className="flex items-center justify-center mb-3">
            <div 
              onClick={handleDoubleOrSecretClick}
              onDoubleClick={handleAdminTrigger}
              className="p-2 text-slate-500/30 hover:text-slate-400/50 transition-colors cursor-default select-none rounded-full"
              title=""
              role="button"
              aria-label="Lixeira"
            >
              <Trash2 className="w-4 h-4 opacity-40 hover:opacity-70 transition-opacity" />
            </div>
          </div>

          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">
            {t.cityMotto}
          </p>
        </div>

        <div className="space-y-4">
          {hasProfile ? (
            <>
              {/* Botão Principal: Já sou Cadastrado (com o nome salvo) */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSelectLogin}
                className="w-full p-6 bg-yellow-500 text-slate-900 rounded-[2rem] font-black uppercase tracking-wider text-sm flex items-center justify-between shadow-xl shadow-yellow-500/20 group"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="bg-slate-900/10 p-3 rounded-2xl">
                    <UserCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="leading-tight">{t.welcomeLogin}</div>
                    {registeredName && (
                      <div className="text-[10px] font-bold text-slate-800 normal-case opacity-80">
                        {registeredName}
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-8 h-8 bg-slate-900/10 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                  →
                </div>
              </motion.button>

              {/* Botão Secundário: Novo Cadastro */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSelectRegister}
                className="w-full p-5 bg-white/5 text-white rounded-[2rem] font-black uppercase tracking-wider text-xs flex items-center justify-between border border-white/10 hover:bg-white/10 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 p-2.5 rounded-xl">
                    <UserPlus className="w-5 h-5 text-yellow-500" />
                  </div>
                  <span>{t.welcomeRegister}</span>
                </div>
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                  →
                </div>
              </motion.button>
            </>
          ) : (
            <>
              {/* Primeiro Acesso: Novo Cadastro em destaque dourado */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSelectRegister}
                className="w-full p-6 bg-yellow-500 text-slate-900 rounded-[2rem] font-black uppercase tracking-wider text-sm flex items-center justify-between shadow-xl shadow-yellow-500/20 group"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="bg-slate-900/10 p-3 rounded-2xl">
                    <UserPlus className="w-6 h-6 text-slate-900" />
                  </div>
                  <div>
                    <div className="leading-tight">{t.welcomeRegister}</div>
                    <div className="text-[10px] font-bold text-slate-800 normal-case opacity-85">
                      Criar nova conta de cidadão
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 bg-slate-900/10 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                  →
                </div>
              </motion.button>

              {/* Botão Secundário: Já sou cadastrado */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSelectLogin}
                className="w-full p-5 bg-white/5 text-white rounded-[2rem] font-black uppercase tracking-wider text-xs flex items-center justify-between border border-white/10 hover:bg-white/10 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 p-2.5 rounded-xl">
                    <UserCircle className="w-5 h-5 text-yellow-500" />
                  </div>
                  <span>{t.welcomeLogin}</span>
                </div>
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                  →
                </div>
              </motion.button>
            </>
          )}

        </div>

        <div className="mt-16 text-slate-600 text-[9px] font-black uppercase tracking-[0.3em]">
          {t.footerCopyright}
        </div>
      </motion.div>
    </div>
  );
};

export default WelcomeScreen;
