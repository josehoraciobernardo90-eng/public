
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Phone, MapPin, ArrowRight, CheckCircle2, AlertCircle, Languages, Building2, Layers, KeyRound, ArrowLeft } from 'lucide-react';
import { CitizenProfile, Language } from '../types';
import Logo from './Logo';
import { translations } from '../translations';
import { isValidMozambiquePhone, normalizeMozambiquePhone } from '../utils/mozambiquePhone';

interface CitizenRegistrationProps {
  onComplete: (profile: CitizenProfile) => void;
  lang: Language;
  onLangChange: (lang: Language) => void;
  onAdminAccess?: () => void;
  onBack?: () => void;
  onGoToLogin?: () => void;
}

const GONDOLA_BAIRROS = [
  'Central',
  'Vila Nova',
  'Francisco Manyanga',
  '7 de Abril',
  'Soalpo',
  'Macurungo',
  '16 de Junho',
  'Nhamaonha',
  'Eduardo Mondlane',
  'Chaminuca',
  'Centro Hípico',
  'Matsinho',
  'Outro...'
];

const CitizenRegistration: React.FC<CitizenRegistrationProps> = ({ 
  onComplete, 
  lang, 
  onLangChange, 
  onBack,
  onGoToLogin
}) => {
  const [formData, setFormData] = useState<CitizenProfile>({
    name: '',
    city: 'Gondola',
    neighborhood: '',
    zone: '',
    contact: '',
    pin: ''
  });
  const [isCustomBairro, setIsCustomBairro] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const t = translations[lang];

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, contact: normalizeMozambiquePhone(e.target.value) });
    setError(null);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) {
      setFormData({ ...formData, pin: value });
      setError(null);
    }
  };

  const handleConfirmPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) {
      setConfirmPin(value);
      setError(null);
    }
  };

  const handleBairroSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'Outro...') {
      setIsCustomBairro(true);
      setFormData({ ...formData, neighborhood: '' });
    } else {
      setIsCustomBairro(false);
      setFormData({ ...formData, neighborhood: val });
    }
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const fullName = formData.name.trim().replace(/\s+/g, ' ');
    if (fullName.split(' ').filter(Boolean).length < 3) {
      setError(t.regErrorFullName);
      return;
    }

    if (!formData.contact || formData.contact.length !== 9) {
      setError(t.regErrorDigits);
      return;
    }

    if (!isValidMozambiquePhone(formData.contact)) {
      setError(t.regErrorPrefix);
      return;
    }

    if (!formData.neighborhood.trim()) {
      setError("Por favor, selecione ou informe o seu bairro.");
      return;
    }

    if (!formData.zone.trim()) {
      setError("Por favor, informe a sua zona (ex: Zona 1, Zona A).");
      return;
    }

    if (formData.pin.length !== 4) {
      setError("A senha deve ter exatamente 4 dígitos numéricos.");
      return;
    }

    if (formData.pin !== confirmPin) {
      setError(t.regErrorPinMatch);
      return;
    }

    onComplete({ ...formData, name: fullName });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 left-4 z-50">
        {onBack && (
          <button
            onClick={onBack}
            className="bg-slate-900 text-white p-3 rounded-full shadow-md hover:bg-yellow-500 hover:text-slate-900 transition-all group"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
        )}
      </div>
      
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => onLangChange(lang === 'pt' ? 'en' : 'pt')}
          className="bg-slate-900 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-md hover:bg-yellow-500 hover:text-slate-900 transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <Languages className="w-4 h-4 text-yellow-500" />
          {lang === 'pt' ? 'English' : 'Português'}
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md py-6"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 100 }}
          >
            <Logo size="md" className="mx-auto mb-6 shadow-2xl ring-4 ring-white" />
          </motion.div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
            {t.regTitle.split(' ')[0]} <span className="text-yellow-500">{t.regTitle.split(' ').slice(1).join(' ')}</span>
          </h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-3 opacity-70">
            {t.regSubtitle}
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-2 h-full bg-yellow-500" />
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nome Completo */}
            <motion.div whileFocus={{ scale: 1.01 }}>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
                {t.regName} *
              </label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-600" />
                <input
                  type="text"
                  required
                  placeholder={t.regNamePlaceholder}
                  className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-yellow-500 outline-none transition-all focus:bg-white focus:shadow-inner text-slate-900"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </motion.div>

            {/* Contacto / Telefone */}
            <motion.div whileFocus={{ scale: 1.01 }}>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
                {t.regContact} (Moçambique) *
              </label>
              <div className="relative">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-600" />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={9}
                  required
                  placeholder="8X XXX XXXX"
                  className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-yellow-500 outline-none transition-all focus:bg-white focus:shadow-inner text-slate-900"
                  value={formData.contact}
                  onChange={handlePhoneChange}
                />
              </div>
            </motion.div>

            {/* Bairro e Zona */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bairro */}
              <motion.div whileFocus={{ scale: 1.01 }}>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
                  {t.regNeighborhood} *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-600 pointer-events-none" />
                  {!isCustomBairro ? (
                    <select
                      value={formData.neighborhood}
                      onChange={handleBairroSelect}
                      required
                      className="w-full pl-11 pr-3 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold focus:border-yellow-500 outline-none transition-all focus:bg-white text-slate-900 appearance-none"
                    >
                      <option value="">Selecione...</option>
                      {GONDOLA_BAIRROS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        required
                        placeholder="Nome do bairro"
                        className="w-full pl-11 pr-2 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold focus:border-yellow-500 outline-none text-slate-900"
                        value={formData.neighborhood}
                        onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomBairro(false)}
                        className="px-2 py-1 text-[9px] text-slate-400 hover:text-slate-600 underline"
                      >
                        Lista
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Zona */}
              <motion.div whileFocus={{ scale: 1.01 }}>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
                  {t.regZone} *
                </label>
                <div className="relative">
                  <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-600" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Zona 1, Zona A..."
                    className="w-full pl-11 pr-3 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold focus:border-yellow-500 outline-none transition-all focus:bg-white text-slate-900"
                    value={formData.zone}
                    onChange={e => setFormData({ ...formData, zone: e.target.value })}
                  />
                </div>
              </motion.div>
            </div>

            {/* Senha e Confirmação de Senha */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <motion.div whileFocus={{ scale: 1.01 }}>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
                  {t.regPin} *
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-600" />
                  <input
                    type="password"
                    inputMode="numeric"
                    required
                    maxLength={4}
                    placeholder="••••"
                    className="w-full pl-11 pr-3 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-base tracking-widest font-black focus:border-yellow-500 outline-none transition-all focus:bg-white text-slate-900"
                    value={formData.pin}
                    onChange={handlePinChange}
                  />
                </div>
              </motion.div>

              <motion.div whileFocus={{ scale: 1.01 }}>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
                  {t.regPinConfirm} *
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-600" />
                  <input
                    type="password"
                    inputMode="numeric"
                    required
                    maxLength={4}
                    placeholder="••••"
                    className="w-full pl-11 pr-3 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-base tracking-widest font-black focus:border-yellow-500 outline-none transition-all focus:bg-white text-slate-900"
                    value={confirmPin}
                    onChange={handleConfirmPinChange}
                  />
                </div>
              </motion.div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 justify-center p-3.5 bg-red-50 rounded-2xl border border-red-100"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-red-600 text-[10px] font-black uppercase tracking-widest leading-tight">
                    {error}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-yellow-500/20 transition-all flex items-center justify-center gap-3 mt-4"
            >
              <span>{t.regButton}</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>

            {onGoToLogin && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="text-xs font-bold text-slate-500 hover:text-yellow-600 transition-colors inline-flex items-center gap-1.5"
                >
                  {t.regAlreadyAccount} →
                </button>
              </div>
            )}
          </form>
        </motion.div>

        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em]">{t.regFooter}</span>
        </div>
      </motion.div>
    </div>
  );
};

export default CitizenRegistration;
