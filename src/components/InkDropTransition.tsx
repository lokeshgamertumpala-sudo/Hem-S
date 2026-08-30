import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { useEffect, useState } from 'react';

export function InkDropTransition() {
  const { mode } = useTheme();
  const [ripples, setRipples] = useState<{ id: number; isSwamp: boolean }[]>([]);
  const [initialMount, setInitialMount] = useState(true);

  useEffect(() => {
    if (initialMount) {
      setInitialMount(false);
      return;
    }
    setRipples((prev) => [...prev, { id: Date.now(), isSwamp: mode === 'swamp' }]);
  }, [mode]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.div
            key={ripple.id}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
            className={`absolute top-6 right-36 w-[200vmax] h-[200vmax] -mr-[100vmax] -mt-[100vmax] rounded-full origin-center pointer-events-none ${
              ripple.isSwamp
                ? 'bg-[radial-gradient(circle,rgba(46,125,50,0.85)_0%,rgba(27,94,32,0.95)_40%,#051b08_100%)]'
                : 'bg-[radial-gradient(circle,rgba(217,119,87,0.85)_0%,rgba(140,58,34,0.95)_40%,#181715_100%)]'
            }`}
            onAnimationComplete={() => {
              setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
