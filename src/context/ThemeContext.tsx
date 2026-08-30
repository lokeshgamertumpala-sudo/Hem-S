import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeMode = 'normal' | 'swamp';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  isVibe: boolean;
  toggleVibe: () => void;
  setVibe: (vibe: boolean) => void;
  isSwamp: boolean;
  toggleSwamp: () => void;
  isPerformance: boolean;
  setPerformance: (perf: boolean) => void;
  togglePerformance: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('normal');
  const [isVibe, setIsVibe] = useState<boolean>(false);
  const [isPerformance, setIsPerformance] = useState<boolean>(false);

  useEffect(() => {
    if (mode === 'swamp') {
      document.documentElement.classList.add('swamp-mode');
    } else {
      document.documentElement.classList.remove('swamp-mode');
    }
  }, [mode]);

  useEffect(() => {
    if (isVibe) {
      document.documentElement.classList.add('vibe-mode');
    } else {
      document.documentElement.classList.remove('vibe-mode');
    }
  }, [isVibe]);

  useEffect(() => {
    if (isPerformance) {
      document.documentElement.classList.add('performance-mode');
    } else {
      document.documentElement.classList.remove('performance-mode');
    }
  }, [isPerformance]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'normal' ? 'swamp' : 'normal'));
  };

  const toggleSwamp = () => {
    setMode((prev) => (prev === 'normal' ? 'swamp' : 'normal'));
  };

  const toggleVibe = () => {
    setIsVibe((prev) => !prev);
  };

  const togglePerformance = () => {
    setIsPerformance((prev) => !prev);
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        toggleTheme,
        isVibe,
        toggleVibe,
        setVibe: setIsVibe,
        isSwamp: mode === 'swamp',
        toggleSwamp,
        isPerformance,
        setPerformance: setIsPerformance,
        togglePerformance
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

