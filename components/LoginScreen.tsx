
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ArrowRight, User, Languages, ShieldCheck, KeyRound, UserCircle, ArrowLeft, Phone, MapPin, UserPlus } from 'lucide-react';
import { UserRole, Language, CitizenProfile, PinResetClientState } from '../types';
import Logo from './Logo';
import { translations } from '../translations';
import { isNativeAppWebView } from '../utils/device';
import { isValidMozambiquePhone, normalizeMozambiquePhone } from '../utils/mozambiquePhone';

interface LoginScreenProps {
  onAuthenticate: (role: UserRole, centralToken?: string) => void;
  lang: Language;
  onLangChange: (lang: Language) => void;
  savedProfile?: CitizenProfile | null;
  onReset?: () => void;
  initialAdminMode?: boolean;
  onBack?: () => void;
  onGoToRegister?: () => void;
  allCitizens?: CitizenProfile[];
  onSelectCitizenProfile?: (profile: CitizenProfile) => void;
  pinResetStatus?: PinResetClientState | null;
  onRequestPinReset?: (contact: string) => void;
  onCompletePinReset?: (requestId: string, pin: string) => void;
  onUpdateCitizenPin?: (contact: string, pin: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onAuthenticate, 
  lang, 
  onLangChange, 
  savedProfile, 
  onReset,
  initialAdminMode = false,
  onBack,
  onGoToRegister,
  allCitizens = [],
  onSelectCitizenProfile,
  pinResetStatus,
  onRequestPinReset,
  onCompletePinReset,
  onUpdateCitizenPin
}) => {
  // O acesso operacional funciona na web, mas não no WebView do APK.
  const isWebAdminAllowed = initialAdminMode && !isNativeAppWebView();
  const [isAdminMode, setIsAdminMode] = useState(isWebAdminAllowed);
  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState('');
  const [useOtherAccount, setUseOtherAccount] = useState(!savedProfile);
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryContact, setRecoveryContact] = useState(savedProfile?.contact || '');
  const [newRecoveryPin, setNewRecoveryPin] = useState('');
  const [confirmRecoveryPin, setConfirmRecoveryPin] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const handledResetId = useRef<string | null>(null);

  const t = translations[lang];
  const recoveryApproved = pinResetStatus?.status === 'approved'
    && normalizeMozambiquePhone(pinResetStatus.contact || '') === normalizeMozambiquePhone(recoveryContact);
  const recoveryPending = pinResetStatus?.status === 'pending'
    && normalizeMozambiquePhone(pinResetStatus.contact || '') === normalizeMozambiquePhone(recoveryContact);

  useEffect(() => {
    if (savedProfile && !recoveryContact) setRecoveryContact(savedProfile.contact);
  }, [savedProfile, recoveryContact]);

  useEffect(() => {
    const requestId = pinResetStatus?.status === 'completed' ? pinResetStatus.requestId : undefined;
    if (!requestId || handledResetId.current === requestId) return;
    handledResetId.current = requestId;
    const contact = normalizeMozambiquePhone(pinResetStatus?.contact || recoveryContact);
    const profile = allCitizens.find(citizen => normalizeMozambiquePhone(citizen.contact) === contact)
      || (savedProfile && normalizeMozambiquePhone(savedProfile.contact) === contact ? savedProfile : null);
    if (profile) {
      const updatedProfile = { ...profile, pin: newRecoveryPin };
      onUpdateCitizenPin?.(contact, newRecoveryPin);
      onSelectCitizenProfile?.(updatedProfile);
    }
    setPin(newRecoveryPin);
    setUseOtherAccount(!profile);
    setIsRecoveryMode(false);
    setNewRecoveryPin('');
    setConfirmRecoveryPin('');
    setRecoverySuccess('PIN alterado. Entre com o novo PIN.');
  }, [pinResetStatus, recoveryContact, newRecoveryPin, allCitizens, savedProfile, onUpdateCitizenPin, onSelectCitizenProfile]);

  const handleRecoverySubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(false);
    setErrorMessage(null);

    const contact = normalizeMozambiquePhone(recoveryContact);
    if (!isValidMozambiquePhone(contact)) {
      setErrorMessage('Informe um número nacional válido: Tmcel 82/83, Vodacom 84/85 ou Movitel 86/87.');
      return;
    }

    const localProfile = allCitizens.find(citizen => normalizeMozambiquePhone(citizen.contact) === contact)
      || (savedProfile && normalizeMozambiquePhone(savedProfile.contact) === contact ? savedProfile : null);
    if (!localProfile) {
      setErrorMessage('Este aparelho não tem o cadastro local. Recupere o acesso com a central e use o aparelho onde se cadastrou.');
      return;
    }

    if (pinResetStatus?.status === 'approved' && pinResetStatus.requestId) {
      if (!/^\d{4}$/.test(newRecoveryPin)) {
        setErrorMessage('O novo PIN deve ter quatro dígitos.');
        return;
      }
      if (newRecoveryPin !== confirmRecoveryPin) {
        setErrorMessage('Os PINs não coincidem.');
        return;
      }
      onCompletePinReset?.(pinResetStatus.requestId, newRecoveryPin);
      setErrorMessage(null);
      return;
    }

    if (pinResetStatus?.status === 'pending' && pinResetStatus.contact === contact) {
      setErrorMessage('Pedido enviado. Mantenha esta tela aberta até a central confirmar sua identidade.');
      return;
    }

    setRecoveryContact(contact);
    setRecoverySuccess(null);
    onRequestPinReset?.(contact);
    setErrorMessage('Pedido enviado. Mantenha esta tela aberta até a central confirmar sua identidade.');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setErrorMessage(null);
    
    if (isAdminMode) {
      if (isNativeAppWebView()) {
        setError(true);
        setErrorMessage("Acesso administrativo disponível apenas na versão Web (computador).");
        return;
      }
      try {
        const response = await fetch('/api/central/authenticate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: adminId, password: adminPassword })
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || 'Credenciais administrativas inválidas.');
        }
        const result = await response.json();
        onAuthenticate('operational', result.token);
      } catch (authError) {
        setError(true);
        setErrorMessage(authError instanceof Error ? authError.message : 'Não foi possível autenticar a central.');
        setAdminPassword('');
        setTimeout(() => setError(false), 2000);
      }
      return;
    }

    // Modo Cidadão
    if (savedProfile && !useOtherAccount) {
      if (pin === savedProfile.pin) {
        if (onSelectCitizenProfile) {
          onSelectCitizenProfile(savedProfile);
        }
        onAuthenticate('citizen');
      } else {
        setError(true);
        setErrorMessage(t.loginError || "Senha incorreta. Tente novamente.");
        setPin('');
        setTimeout(() => setError(false), 2500);
      }
    } else {
      // Login com Telefone + Senha
      const cleanPhone = normalizeMozambiquePhone(phone);
      if (!isValidMozambiquePhone(cleanPhone)) {
        setError(true);
        setErrorMessage('Informe um número nacional válido: Tmcel 82/83, Vodacom 84/85 ou Movitel 86/87.');
        return;
      }
      const foundCitizen = allCitizens.find(c => c.contact === cleanPhone) 
        || (savedProfile && savedProfile.contact === cleanPhone ? savedProfile : null);

      if (foundCitizen) {
        if (foundCitizen.pin === pin) {
          if (onSelectCitizenProfile) {
            onSelectCitizenProfile(foundCitizen);
          }
          onAuthenticate('citizen');
        } else {
          setError(true);
          setErrorMessage(t.loginError || "Senha incorreta.");
          setPin('');
          setTimeout(() => setError(false), 2500);
        }
      } else {
        setError(true);
        setErrorMessage(t.loginNotFound || "Número de telefone não cadastrado. Faça um novo cadastro.");
        setTimeout(() => setError(false), 3000);
      }
    }
  };

  const currentProfileToDisplay = !useOtherAccount ? savedProfile : null;

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-50">
        {onBack && (
          <button
            onClick={onBack}
            className="bg-white/10 backdrop-blur-md text-white p-3 rounded-full border border-white/10 hover:bg-white/20 transition-all group"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
        )}
      </div>
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        {/* Só exibe o alternador se tiver sido iniciado pelo acesso secreto no Web */}
        {initialAdminMode && !isNativeAppWebView() && (
          <button
            onClick={() => setIsAdminMode(!isAdminMode)}
            className={`px-4 py-2 rounded-full flex items-center gap-2 shadow-md transition-all text-[10px] font-black uppercase tracking-widest ${
              isAdminMode 
                ? 'bg-yellow-500 text-slate-900' 
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${isAdminMode ? 'text-slate-900' : 'text-yellow-500'}`} />
            {isAdminMode ? 'Cidadão' : 'ADM'}
          </button>
        )}
        <button
          onClick={() => onLangChange(lang === 'pt' ? 'en' : 'pt')}
          className="bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full flex items-center gap-2 border border-white/10 hover:bg-white/20 transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <Languages className="w-4 h-4 text-yellow-500" />
          {lang === 'pt' ? 'English' : 'Português'}
        </button>
      </div>

      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1] 
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-yellow-500 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.3, 0.1] 
          }}
          transition={{ duration: 15, repeat: Infinity, delay: 2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-yellow-600 rounded-full blur-[150px]" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10 py-6"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-6"
          >
            <Logo size="md" className="shadow-2xl ring-4 ring-yellow-500/30" />
          </motion.div>

          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter mb-2 uppercase">
            LIMPA-<span className="text-yellow-500">LAAA</span>
          </h1>
          
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center space-x-2 text-yellow-400 bg-yellow-500/10 px-6 py-2 rounded-full w-fit mx-auto mb-4 border border-yellow-500/20 backdrop-blur-md"
          >
            {isAdminMode ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              {isAdminMode ? t.adminLogin : (currentProfileToDisplay ? "Cidadão Cadastrado" : "Entrar com Senha")}
            </span>
          </motion.div>
          <p className="text-slate-400 font-bold italic text-xs">{t.loginMotto}</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden"
        >
          <div className={`absolute top-0 right-0 w-2 h-full ${isAdminMode ? 'bg-red-500' : 'bg-yellow-500'}`} />
          
          <div className="flex flex-col items-center mb-6">
            <div className={`flex items-center space-x-3 mb-4 ${isAdminMode ? 'text-red-500' : 'text-yellow-500'}`}>
              <Lock className="w-4 h-4" />
              <span className="font-black uppercase tracking-[0.3em] text-[10px]">{t.loginSecurity}</span>
            </div>

            {/* Perfil Salvo Ativo */}
            {!isAdminMode && currentProfileToDisplay && (
              <div className="w-full bg-white/5 border border-yellow-500/20 rounded-2xl p-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center mb-2 text-yellow-400">
                  <UserCircle className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  {currentProfileToDisplay.name}
                </h3>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-yellow-500" />
                  <span>{currentProfileToDisplay.neighborhood} • Zona {currentProfileToDisplay.zone}</span>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={event => isRecoveryMode ? handleRecoverySubmit(event) : void handleLogin(event)} className="space-y-6">
            {isAdminMode ? (
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    placeholder={t.adminId}
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    className="w-full pl-16 pr-6 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-sm font-bold text-white focus:border-yellow-500 outline-none transition-all"
                  />
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    placeholder={t.adminPassword}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-16 pr-6 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-sm font-bold text-white focus:border-yellow-500 outline-none transition-all"
                  />
                </div>
              </div>
            ) : isRecoveryMode ? (
              <div className="space-y-4">
                <div className="relative">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-500" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={9}
                    required
                    readOnly={recoveryApproved || recoveryPending}
                    placeholder="Número de Telefone (8X XXX XXXX)"
                    value={recoveryContact}
                    onChange={event => setRecoveryContact(normalizeMozambiquePhone(event.target.value))}
                    className="w-full pl-14 pr-4 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-sm font-bold text-white focus:border-yellow-500 outline-none transition-all read-only:opacity-70"
                  />
                </div>

                {recoveryApproved ? (
                  <>
                    <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center text-xs font-bold text-emerald-200">
                      A central confirmou sua identidade. Defina um novo PIN agora.
                    </p>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={newRecoveryPin}
                      onChange={event => setNewRecoveryPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="Novo PIN de 4 dígitos"
                      className="w-full text-center text-2xl tracking-[0.6rem] py-4 bg-white/5 border-2 border-white/10 rounded-2xl outline-none text-white font-black focus:border-yellow-500"
                    />
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={confirmRecoveryPin}
                      onChange={event => setConfirmRecoveryPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="Confirmar novo PIN"
                      className="w-full text-center text-2xl tracking-[0.6rem] py-4 bg-white/5 border-2 border-white/10 rounded-2xl outline-none text-white font-black focus:border-yellow-500"
                    />
                  </>
                ) : (
                  <p className={`rounded-xl border p-3 text-center text-xs font-bold ${recoveryPending ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-100' : 'border-white/10 bg-white/5 text-slate-300'}`}>
                    {recoveryPending
                      ? 'Pedido recebido. Mantenha esta tela aberta; a central precisa confirmar sua identidade.'
                      : 'A central confirmará sua identidade antes de autorizar a troca. Mantenha o app aberto.'}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Se não tem perfil salvo no dispositivo ou escolheu outra conta */}
                {(!currentProfileToDisplay || useOtherAccount) && (
                  <div className="relative">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-500" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      placeholder="Número de Telefone (8X XXX XXXX)"
                      value={phone}
                      maxLength={9}
                      onChange={(e) => setPhone(normalizeMozambiquePhone(e.target.value))}
                      className="w-full pl-14 pr-4 py-4 bg-white/5 border-2 border-white/10 rounded-2xl text-sm font-bold text-white focus:border-yellow-500 outline-none transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-center text-[10px] font-black text-slate-400 uppercase mb-3 tracking-[0.2em]">
                    {currentProfileToDisplay ? "Digite a sua Senha (PIN 4 Dígitos)" : "Digite a Senha (4 Dígitos)"}
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className={`w-full text-center text-4xl tracking-[1.2rem] py-6 bg-white/5 border-2 rounded-2xl outline-none transition-all text-white font-black ${
                      error ? 'border-red-500 bg-red-500/10 text-red-500 animate-shake' : 'border-white/10 focus:border-yellow-500'
                    }`}
                    autoFocus
                  />
                </div>
              </div>
            )}

            <AnimatePresence>
              {errorMessage && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-center"
                >
                  <p className="text-red-400 text-xs font-bold">{errorMessage}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {recoverySuccess && !isRecoveryMode && (
              <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-center text-xs font-bold text-emerald-200">
                {recoverySuccess}
              </p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isRecoveryMode && recoveryPending}
              className={`w-full py-5 rounded-2xl font-black text-base uppercase tracking-wider transition-all flex items-center justify-center space-x-3 group ${
                isAdminMode 
                  ? 'bg-red-500 hover:bg-red-400 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]' 
                  : 'bg-yellow-500 hover:bg-yellow-400 text-slate-900 shadow-[0_0_30px_rgba(234,179,8,0.3)]'
              }`}
            >
              <span>{isRecoveryMode ? recoveryApproved ? 'Salvar novo PIN' : recoveryPending ? 'Aguardando central' : 'Solicitar recuperação' : t.loginAuthenticate}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>

            {!isAdminMode && (
              <div className="pt-2 space-y-3 text-center border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    if (isRecoveryMode) {
                      setIsRecoveryMode(false);
                      setErrorMessage(null);
                    } else {
                      setRecoveryContact(savedProfile && !useOtherAccount ? savedProfile.contact : phone);
                      setNewRecoveryPin('');
                      setConfirmRecoveryPin('');
                      setRecoverySuccess(null);
                      setIsRecoveryMode(true);
                    }
                  }}
                  className="mx-auto inline-flex items-center gap-2 text-xs font-bold text-yellow-400 transition-colors hover:text-yellow-300"
                >
                  <KeyRound className="h-4 w-4" />
                  {isRecoveryMode ? 'Voltar ao login' : 'Esqueci o PIN'}
                </button>
                {savedProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setUseOtherAccount(!useOtherAccount);
                      setError(false);
                      setErrorMessage(null);
                    }}
                    className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    {useOtherAccount ? `← Voltar para ${savedProfile.name}` : "Entrar com outro número de telefone"}
                  </button>
                )}

                {onGoToRegister && (
                  <div>
                    <button
                      type="button"
                      onClick={onGoToRegister}
                      className="text-xs font-black text-yellow-500 hover:text-yellow-400 uppercase tracking-widest inline-flex items-center gap-1.5 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Fazer Novo Cadastro
                    </button>
                  </div>
                )}
              </div>
            )}
          </form>
        </motion.div>
      </motion.div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

export default LoginScreen;
