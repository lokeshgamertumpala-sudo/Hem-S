"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";

interface MemoryContextType {
  memories: string[];
  addMemory: (memory: string) => void;
  removeMemory: (index: number) => void;
  clearMemories: () => void;
  exportMemories: () => void;
  importMemories: (jsonStr: string) => boolean;
  memoryPromptSnippet: string;
  detectAndStoreMemory: (prompt: string) => void;
  storageType: "local";
}

const MemoryContext = createContext<MemoryContextType | undefined>(undefined);

const MEMORY_STORAGE_KEY = "omnimodel_ai_memory_v1";

const DEFAULT_MEMORIES = [
  "User prefers clear, mathematically rigorous derivations and complete production code without placeholders.",
  "User values Apple-grade visual design, fluid CSS animations, and modern clean glassmorphism."
];

export function MemoryProvider({ children }: { children: ReactNode }) {
  const [memories, setMemories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(MEMORY_STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_MEMORIES;
  });

  // On initial mount, sync with local disk file via local server (/api/memories) if available
  useEffect(() => {
    const syncLocalDisk = async () => {
      try {
        const res = await fetch("/api/memories");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.memories) && data.memories.length > 0) {
            // Merge unique memories
            setMemories(prev => {
              const combined = Array.from(new Set([...prev, ...data.memories]));
              try {
                localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(combined));
              } catch {}
              return combined;
            });
          }
        }
      } catch {
        // Standalone offline mode, localStorage handles it
      }
    };
    syncLocalDisk();
  }, []);

  // Save to both browser LocalStorage and local file on disk
  useEffect(() => {
    try {
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memories));
    } catch {}

    // Persist to local file on user's machine (data/memories.json)
    try {
      fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memories })
      }).catch(() => {});
    } catch {}
  }, [memories]);

  const addMemory = useCallback((memory: string) => {
    const trimmed = memory.trim();
    if (!trimmed) return;
    setMemories(prev => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });
  }, []);

  const removeMemory = useCallback((index: number) => {
    setMemories(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearMemories = useCallback(() => {
    setMemories([]);
    try {
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify([]));
    } catch {}
    try {
      fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memories: [] })
      }).catch(() => {});
    } catch {}
  }, []);

  const exportMemories = useCallback(() => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(memories, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "hems_local_memories.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch {}
  }, [memories]);

  const importMemories = useCallback((jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.map(s => String(s).trim()).filter(s => s.length > 0);
        setMemories(cleaned);
        return true;
      }
    } catch {}
    return false;
  }, []);

  const detectAndStoreMemory = useCallback((prompt: string) => {
    const text = prompt.trim();

    // Pattern 1: "remember that ..." or "remember: ..."
    const rememberMatch = text.match(/remember\s+(?:that\s+)?(.+)/i);
    if (rememberMatch && rememberMatch[1]) {
      const fact = rememberMatch[1].replace(/[.!?]+$/, "").trim();
      if (fact.length > 3 && fact.length < 200) {
        addMemory(fact);
        return;
      }
    }

    // Pattern 2: "my name is ..."
    const nameMatch = text.match(/my\s+name\s+is\s+([A-Za-z0-9_\s]{2,30})/i);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].replace(/[.!?]+$/, "").trim();
      addMemory(`User's name is ${name}.`);
      return;
    }

    // Pattern 3: "call me ..."
    const callMeMatch = text.match(/call\s+me\s+([A-Za-z0-9_\s]{2,30})/i);
    if (callMeMatch && callMeMatch[1]) {
      const name = callMeMatch[1].replace(/[.!?]+$/, "").trim();
      addMemory(`User prefers to be called ${name}.`);
      return;
    }
  }, [addMemory]);

  const memoryPromptSnippet = useMemo(() => {
    if (memories.length === 0) return "";
    return `[AI LONG-TERM PERSISTENT MEMORY & USER PREFERENCES (STORED LOCALLY)]\nAlways keep the following local facts and preferences in mind:\n` + memories.map((m, i) => `${i + 1}. ${m}`).join("\n") + "\n";
  }, [memories]);

  return (
    <MemoryContext.Provider
      value={{
        memories,
        addMemory,
        removeMemory,
        clearMemories,
        exportMemories,
        importMemories,
        memoryPromptSnippet,
        detectAndStoreMemory,
        storageType: "local"
      }}
    >
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemory(): MemoryContextType {
  const context = useContext(MemoryContext);
  if (!context) {
    throw new Error("useMemory must be used within a MemoryProvider");
  }
  return context;
}
