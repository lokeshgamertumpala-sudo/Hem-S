"use client";

import React, { useState, useMemo } from "react";
import { 
  Sparkles, Play, Eye, Code2, Download, Copy, Check, 
  ExternalLink, RotateCcw, Monitor, Tablet, Smartphone, X, Maximize2, Minimize2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AIModel } from "../context/ModelContext";
import { ModelResponse } from "../context/ChatContext";

export interface VibeCodingEngineProps {
  modelResponses: ModelResponse[];
  selectedModels: AIModel[];
  lastPrompt: string | null;
  isStreaming: boolean;
  isSwamp: boolean;
  isVibe: boolean;
  apiKeys: string[];
  onUpdateResponse: (index: number, updater: (prev: ModelResponse) => ModelResponse) => void;
  onSetAllResponses: React.Dispatch<React.SetStateAction<ModelResponse[]>>;
  onToggleVibe: () => void;
  onToggleSwamp: () => void;
}

export function VibeCodingEngine({
  modelResponses,
  isStreaming,
  isVibe
}: VibeCodingEngineProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  // Extract the most complete web / HTML / CSS / JS code from available models
  const extractedCode = useMemo(() => {
    for (const m of modelResponses) {
      if (!m.text) continue;
      // Check for ```html or ```xml or complete HTML document
      const htmlBlockMatch = m.text.match(/```(?:html|xml)?\s*([\s\S]*?)```/i);
      if (htmlBlockMatch && htmlBlockMatch[1]) {
        return htmlBlockMatch[1].trim();
      }
      if (m.text.includes("<html") || m.text.includes("<!DOCTYPE html>") || m.text.includes("<div") || m.text.includes("<canvas")) {
        return m.text.trim();
      }
    }
    return "";
  }, [modelResponses]);

  const hasRunnableCode = extractedCode.length > 0;

  // Format code into a complete self-contained HTML payload for the iframe
  const sandboxedHtml = useMemo(() => {
    if (!extractedCode) return "";
    if (extractedCode.includes("<html") || extractedCode.includes("<!DOCTYPE html>")) {
      return extractedCode;
    }
    // Wrap raw HTML / CSS / JS snippet in a full modern HTML5 scaffold
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vibe Studio Live Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      background: #09090b;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
  </style>
</head>
<body>
  ${extractedCode}
</body>
</html>`;
  }, [extractedCode]);

  const handleCopyCode = async () => {
    if (!extractedCode) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(extractedCode);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownloadCode = () => {
    if (!sandboxedHtml) return;
    const blob = new Blob([sandboxedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vibe_app.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isVibe) return null;

  return (
    <>
      {/* Sleek Apple Liquid Glass Vibe Coding Capsule */}
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 450, damping: 32 }}
        className="w-full max-w-4xl mx-auto px-4 sm:px-6 mb-4 z-20 relative pointer-events-auto"
      >
        <div className="apple-liquid-glass-vibe rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-2xl relative overflow-hidden backdrop-blur-3xl border border-[#ec4899]/40">
          {/* Specular Liquid Edge Light */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#f472b6] to-transparent opacity-90" />
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-28 bg-gradient-to-b from-[#ec4899]/30 to-transparent blur-2xl pointer-events-none" />

          {/* Left: Vibe Studio Status Pill */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#ec4899] via-[#c084fc] to-[#a855f7] shadow-[0_0_15px_rgba(236,72,153,0.6)] shrink-0">
              <Sparkles className="text-white w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                  VIBE CODING STUDIO
                </span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isStreaming 
                    ? "bg-[#ec4899]/20 text-[#fdf4ff] border-[#ec4899]/50 animate-pulse"
                    : "bg-white/10 text-[#f472b6] border-white/10"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? "bg-[#ec4899] animate-ping" : "bg-emerald-400"}`} />
                  {isStreaming ? "GENERATING" : "READY"}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] font-mono text-[#f472b6]/90 tracking-wide truncate">
                8K Token Headroom • Single-File HTML5 • Self-Healing
              </p>
            </div>
          </div>

          {/* Right: Quick Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {hasRunnableCode && (
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={() => setIsPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#ec4899] to-[#c084fc] text-white text-xs font-medium shadow-[0_0_15px_rgba(236,72,153,0.4)] hover:opacity-95 transition-all cursor-pointer"
                title="Open Live Sandbox Preview"
              >
                <Eye size={13} className="shrink-0" />
                <span className="hidden sm:inline">Live Preview</span>
              </motion.button>
            )}

            {hasRunnableCode && (
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={handleCopyCode}
                className="p-2 rounded-xl bg-white/10 text-white/80 hover:text-white hover:bg-white/15 border border-white/10 transition-all cursor-pointer"
                title="Copy entire code"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </motion.button>
            )}

            {hasRunnableCode && (
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={handleDownloadCode}
                className="p-2 rounded-xl bg-white/10 text-white/80 hover:text-white hover:bg-white/15 border border-white/10 transition-all cursor-pointer"
                title="Download index.html"
              >
                <Download size={14} />
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Interactive Apple Glass Live Sandbox Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-2xl"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`apple-liquid-glass flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-white/20 transition-all duration-300 ${
                isFullscreen 
                  ? "w-full h-full rounded-none" 
                  : "w-full max-w-5xl h-[85vh] max-h-[900px]"
              }`}
            >
              {/* Window Header / Mac OS Controls */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-black/60 border-b border-white/10 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => setIsPreviewOpen(false)} 
                      className="w-3 h-3 rounded-full bg-red-500 hover:opacity-80 transition-opacity" 
                      title="Close" 
                    />
                    <button 
                      onClick={() => setIsFullscreen(!isFullscreen)} 
                      className="w-3 h-3 rounded-full bg-yellow-500 hover:opacity-80 transition-opacity" 
                      title="Toggle Fullscreen" 
                    />
                    <button 
                      onClick={() => setPreviewKey(k => k + 1)} 
                      className="w-3 h-3 rounded-full bg-green-500 hover:opacity-80 transition-opacity" 
                      title="Reload Preview" 
                    />
                  </div>
                  <span className="text-xs font-mono text-white/80 font-medium hidden sm:inline">
                    Live Sandbox Runner • HTML5 / CSS3 / WebGL
                  </span>
                </div>

                {/* Device Switcher */}
                <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setPreviewDevice("desktop")}
                    className={`p-1.5 rounded-lg transition-all ${
                      previewDevice === "desktop" ? "bg-white/20 text-white shadow-sm" : "text-white/50 hover:text-white"
                    }`}
                    title="Desktop (Full Width)"
                  >
                    <Monitor size={14} />
                  </button>
                  <button
                    onClick={() => setPreviewDevice("tablet")}
                    className={`p-1.5 rounded-lg transition-all ${
                      previewDevice === "tablet" ? "bg-white/20 text-white shadow-sm" : "text-white/50 hover:text-white"
                    }`}
                    title="Tablet (768px)"
                  >
                    <Tablet size={14} />
                  </button>
                  <button
                    onClick={() => setPreviewDevice("mobile")}
                    className={`p-1.5 rounded-lg transition-all ${
                      previewDevice === "mobile" ? "bg-white/20 text-white shadow-sm" : "text-white/50 hover:text-white"
                    }`}
                    title="Mobile (375px)"
                  >
                    <Smartphone size={14} />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewKey(k => k + 1)}
                    className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    title="Reload Sandbox"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    onClick={handleDownloadCode}
                    className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    title="Download index.html"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    title="Close Preview"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Sandbox iframe Container */}
              <div className="flex-1 w-full bg-[#0a0a0c] flex items-center justify-center overflow-hidden relative">
                <div 
                  className={`h-full transition-all duration-300 overflow-hidden shadow-2xl ${
                    previewDevice === "desktop" 
                      ? "w-full" 
                      : previewDevice === "tablet" 
                      ? "w-[768px] border-x border-white/10" 
                      : "w-[375px] border-x border-white/10"
                  }`}
                >
                  <iframe
                    key={previewKey}
                    srcDoc={sandboxedHtml}
                    title="Vibe Coding Live Sandbox"
                    sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
                    className="w-full h-full border-0 bg-white"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
