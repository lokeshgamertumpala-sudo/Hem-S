import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, KeyRound, Save, CheckCircle2, AlertTriangle, Sparkles, Brain, Plus, Trash2, Download, Upload, ShieldCheck } from "lucide-react";
import { useApiKeys } from "../context/ApiKeyContext";
import { useMemory } from "../context/MemoryContext";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { apiKeys, setApiKeys, isConfigured } = useApiKeys();
  const { memories, addMemory, removeMemory, clearMemories, exportMemories, importMemories } = useMemory();
  const [activeTab, setActiveTab] = useState<"keys" | "memory">("keys");
  const [newMemoryInput, setNewMemoryInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tempKeys, setTempKeys] = useState<string[]>(
    Array.from({ length: 5 }, (_, i) => apiKeys[i] || "")
  );

  React.useEffect(() => {
    if (isOpen) {
      setTempKeys(Array.from({ length: 5 }, (_, i) => apiKeys[i] || ""));
      setSaveStatus("idle");
    }
  }, [isOpen, apiKeys]);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          importMemories(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleKeyChange = (index: number, value: string) => {
    const updated = [...tempKeys];
    updated[index] = value.trim();
    setTempKeys(updated);
  };

  const handleSave = () => {
    setSaveStatus("saving");
    const validKeys = tempKeys.filter((key) => key && key.trim().length > 10);
    setApiKeys(validKeys);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMemoryInput.trim().length > 2) {
      addMemory(newMemoryInput.trim());
      setNewMemoryInput("");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.8 }}
            className="w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] rounded-t-[28px] sm:rounded-[28px] backdrop-blur-3xl bg-[#22201D]/95 border border-[#F5F2EB]/10 shadow-[0_12px_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col apple-liquid-glass"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Sheet Grabber Handle */}
            <div className="sm:hidden w-10 h-1 rounded-full bg-white/20 mx-auto mt-2.5 mb-1 shrink-0" />

            {/* Header */}
            <div className="px-6 py-5 flex items-center justify-between border-b border-[#F5F2EB]/5">
              <div className="flex items-center gap-3">
                {activeTab === "keys" ? (
                  <KeyRound className="text-[var(--accent-primary)]" size={20} />
                ) : (
                  <Brain className="text-sky-400" size={20} />
                )}
                <h2 className="text-lg font-medium tracking-tight text-[#F5F2EB]">Settings & Intelligence</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-[#A89F91] hover:text-[#F5F2EB] hover:bg-[#F5F2EB]/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Apple Tab Switcher */}
            <div className="px-6 pt-4">
              <div className="flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-xs font-medium">
                <button
                  onClick={() => setActiveTab("keys")}
                  className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    activeTab === "keys"
                      ? "bg-white/10 text-white shadow-sm font-semibold"
                      : "text-[#A89F91] hover:text-white"
                  }`}
                >
                  <KeyRound size={14} />
                  <span>API Keys</span>
                </button>
                <button
                  onClick={() => setActiveTab("memory")}
                  className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    activeTab === "memory"
                      ? "bg-sky-500/20 text-sky-200 border border-sky-500/30 shadow-sm font-semibold"
                      : "text-[#A89F91] hover:text-sky-300"
                  }`}
                >
                  <Brain size={14} className={activeTab === "memory" ? "text-sky-400 animate-pulse" : ""} />
                  <span>AI Memory ({memories.length})</span>
                </button>
              </div>
            </div>

            {/* Body: Tab 1 - API Keys */}
            {activeTab === "keys" && (
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <Sparkles className="text-[var(--accent-primary)] mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="text-xs font-semibold text-[#F5F2EB]">AI Model API Keys</h4>
                    <p className="text-[11px] text-[#A89F91] leading-relaxed mt-0.5">
                      Supports <strong>NVIDIA NIM</strong> (<code className="text-[#f5d0fe]">nvapi-...</code>), <strong>OpenRouter</strong> (<code className="text-[#f5d0fe]">sk-or-...</code>), <strong>Groq</strong>, or <strong>DeepSeek</strong>.
                    </p>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2.5 text-xs font-mono">
                  <CheckCircle2 className={isConfigured ? "text-emerald-400" : "text-[#A89F91]"} size={15} />
                  <span className={isConfigured ? "text-emerald-300 font-medium" : "text-[#A89F91]"}>
                    {isConfigured ? `${apiKeys.length} Custom API Key(s) Configured` : "No Keys Configured"}
                  </span>
                </div>

                {/* Input Fields */}
                <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1 no-scrollbar">
                  {tempKeys.map((key, index) => (
                    <div key={index} className="relative group">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A89F91]/50 text-[11px] font-mono">
                        KEY {index + 1}
                      </div>
                      <input
                        type="password"
                        value={key}
                        onChange={(e) => handleKeyChange(index, e.target.value)}
                        placeholder="sk-or-v1-... or nvapi-..."
                        className="w-full bg-[#141312]/60 border border-[#F5F2EB]/5 rounded-xl px-3.5 py-2.5 pl-[62px] text-xs text-[#F5F2EB] font-mono placeholder:text-[#A89F91]/30 focus:border-[var(--accent-primary)]/50 focus:ring-0 outline-none transition-all"
                      />
                      {key.length > 10 && (
                        <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-400" size={14} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Body: Tab 2 - AI Memory */}
            {activeTab === "memory" && (
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-sky-950/20 border border-sky-500/20">
                  <Brain className="text-sky-400 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <h4 className="text-xs font-semibold text-sky-200">Long-Term Memory Engine</h4>
                    <p className="text-[11px] text-[#A89F91] leading-relaxed mt-0.5">
                      Hem'S remembers these facts, preferences, and instructions across every chat and model. You can also teach Hem'S by saying <em>"remember that I prefer X"</em>.
                    </p>
                  </div>
                </div>

                {/* Add New Memory Form */}
                <form onSubmit={handleAddMemory} className="flex gap-2">
                  <input
                    type="text"
                    value={newMemoryInput}
                    onChange={(e) => setNewMemoryInput(e.target.value)}
                    placeholder="e.g. Always write code in TypeScript with Tailwind..."
                    className="flex-1 bg-[#141312]/60 border border-[#F5F2EB]/10 rounded-xl px-3.5 py-2 text-xs text-[#F5F2EB] placeholder:text-[#A89F91]/40 outline-none focus:border-sky-400/50"
                  />
                  <button
                    type="submit"
                    disabled={newMemoryInput.trim().length < 3}
                    className="px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/30 text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </form>

                {/* Local Storage Status Banner */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="shrink-0 text-emerald-400" />
                    <span>Stored 100% locally on your machine (<code className="text-[10px] bg-black/30 px-1 py-0.5 rounded">data/memories.json</code> + LocalStorage)</span>
                  </div>
                </div>

                {/* Memory List */}
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 no-scrollbar">
                  {memories.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#A89F91]/60 italic">
                      No memories stored yet. Add one above or tell Hem'S to remember something!
                    </div>
                  ) : (
                    memories.map((mem, index) => (
                      <div
                        key={index}
                        className="group flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-all text-xs"
                      >
                        <span className="text-[#F5F2EB] leading-relaxed flex-1">{mem}</span>
                        <button
                          onClick={() => removeMemory(index)}
                          title="Delete memory"
                          className="text-[#A89F91] hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors opacity-60 group-hover:opacity-100"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Local Actions: Import, Export, Clear */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F5F2EB]/5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".json"
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#F5F2EB] border border-white/10 text-[11px] flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Upload size={12} />
                      <span>Import JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={exportMemories}
                      disabled={memories.length === 0}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#F5F2EB] border border-white/10 text-[11px] flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-40"
                    >
                      <Download size={12} />
                      <span>Export JSON</span>
                    </button>
                  </div>
                  {memories.length > 0 && (
                    <button
                      onClick={clearMemories}
                      className="text-[11px] text-red-400/70 hover:text-red-400 underline transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-4 flex items-center justify-between border-t border-[#F5F2EB]/5 bg-[#141312]/50">
              <span className="text-[11px] text-[#A89F91]">Data stored locally in your browser.</span>
              {activeTab === "keys" ? (
                <button
                  onClick={handleSave}
                  disabled={saveStatus === "saving" || saveStatus === "saved"}
                  className="px-6 py-2 rounded-full bg-[#F5F2EB] text-[#141312] flex items-center gap-2 text-xs font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none hover:bg-white"
                >
                  {saveStatus === "saving" && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#141312]/20 border-t-[#141312]" />}
                  {saveStatus === "saved" && <CheckCircle2 className="text-emerald-700" size={14} />}
                  {saveStatus === "error" && <AlertTriangle className="text-red-700" size={14} />}
                  {saveStatus === "idle" && <Save size={14} />}
                  {saveStatus === "saved" ? "Saved!" : "Save Changes"}
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-all"
                >
                  Done
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
