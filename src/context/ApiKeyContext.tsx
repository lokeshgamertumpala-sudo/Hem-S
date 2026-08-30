"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AlertCircle, X, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ApiKeyContextType {
  apiKeys: string[];
  setApiKeys: (keys: string[]) => void;
  isConfigured: boolean;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "omnimodel_api_keys";

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const [apiKeys, _setApiKeys] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Load keys from localStorage on mount
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        const validKeys = Array.from(new Set(parsed.filter((key) => key && key.trim().length > 10)));
        if (validKeys.length > 0) {
          _setApiKeys(validKeys);
        } else {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
  }, []);

  // We are fully configured if we have at least 1 key
  const isConfigured = apiKeys.length >= 1;

  // Auto-dismiss the missing key notification message after 5 seconds
  useEffect(() => {
    if (!isConfigured && !dismissed) {
      const timer = setTimeout(() => {
        setDismissed(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isConfigured, dismissed]);

  const setApiKeys = (keys: string[]) => {
    // Filter out empty keys and enforce unique keys
    const validKeys = Array.from(new Set(keys.filter((key) => key.trim().length > 0)));
    _setApiKeys(validKeys);
    if (validKeys.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(validKeys));
      setDismissed(false);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  };

  return (
    <ApiKeyContext.Provider value={{ apiKeys, isConfigured, setApiKeys }}>
      <AnimatePresence>
        {!isConfigured && !dismissed && (
          <motion.div 
            initial={{ y: -50, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -30, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 max-w-xl w-[92vw] sm:w-auto bg-amber-950/80 text-amber-200 py-2 px-4 z-[99999] text-xs sm:text-sm font-medium flex items-center justify-between gap-3 backdrop-blur-xl border border-amber-500/30 rounded-2xl shadow-[0_8px_30px_rgba(245,158,11,0.2)] transition-all duration-300 pointer-events-auto"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/40">
                <KeyRound size={13} className="text-amber-400 animate-pulse" />
              </div>
              <span className="truncate">API Key required: Add key in <strong>Settings ⚙️</strong> to stream models.</span>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-full text-amber-300 hover:text-white hover:bg-amber-500/20 transition-colors shrink-0"
              title="Dismiss alert"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </ApiKeyContext.Provider>
  );
}

export function useApiKeys() {
  const context = useContext(ApiKeyContext);
  if (!context) {
    throw new Error("useApiKeys must be used within an ApiKeyProvider");
  }
  return context;
}
