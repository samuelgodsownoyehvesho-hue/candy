import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AmbientMeter } from '@/components/ui/AmbientMeter';
import { IconWaveform } from '@/components/icons/Icons';

const MIN_DISPLAY_MS = 1600;

export function Splash() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const seenBefore = window.sessionStorage.getItem('cadence:splash-seen');

    function finish() {
      const elapsed = performance.now() - start;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      window.setTimeout(() => setReady(true), remaining);
    }

    if (seenBefore) {
      // Still show a brief splash for continuity, but shorter
      window.setTimeout(() => setReady(true), 400);
    } else {
      window.sessionStorage.setItem('cadence:splash-seen', '1');
      finish();
    }
  }, []);

  useEffect(() => {
    if (ready) {
      const timer = window.setTimeout(() => navigate('/landing', { replace: true }), 350);
      return () => window.clearTimeout(timer);
    }
  }, [ready, navigate]);

  return (
    <div className="relative min-h-screen bg-void flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 h-64 opacity-30">
        <AmbientMeter bars={64} energy={0.9} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col items-center gap-5"
      >
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber to-teal flex items-center justify-center shadow-glow-amber">
          <IconWaveform size={28} className="text-void" />
        </div>
        <h1 className="font-display text-3xl font-semibold text-ink tracking-tight">
          Cadence
        </h1>
        <p className="text-ink-dim text-sm readout">INITIALIZING SIGNAL CHAIN</p>
      </motion.div>

      <motion.div
        className="absolute bottom-12 h-px w-48 bg-void-line overflow-hidden rounded-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.div
          className="h-full w-1/3 bg-gradient-to-r from-amber to-teal rounded-full"
          animate={{ x: ['-100%', '300%'] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  );
}
