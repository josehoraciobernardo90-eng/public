
import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import Logo from './Logo';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative"
      >
        <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
        <Logo size="lg" className="relative shadow-2xl ring-4 ring-yellow-500/30" />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="mt-12 text-center"
      >
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase leading-none">
          LIMPA-<span className="text-yellow-500">LAAA</span>
        </h1>
        <p className="mt-4 text-slate-400 font-bold italic tracking-widest text-xs md:text-sm uppercase">
          "Cidade Limpa, Orgulho da Nossa Gente"
        </p>
      </motion.div>

      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "200px" }}
        transition={{ delay: 1, duration: 2 }}
        className="mt-12 h-1 bg-yellow-500/20 rounded-full overflow-hidden"
      >
        <motion.div
          animate={{ x: ["-100%", "100%"] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="h-full w-1/2 bg-yellow-500"
        />
      </motion.div>
    </div>
  );
};

export default SplashScreen;
