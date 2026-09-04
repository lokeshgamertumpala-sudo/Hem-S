import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ExternalLink, Globe, RotateCw, Copy, Check, 
  BookOpen, Eye, Sparkles, ShieldCheck, AlertCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SitePreviewModalProps {
  url: string | null;
  onClose: () => void;
  onAskAi?: (prompt: string) => void;
}

export function SitePreviewModal({ url, onClose, onAskAi }: SitePreviewModalProps) {
  const { mode, isVibe, isPerformance } = useTheme();
  const isSwamp = mode === 'swamp';

  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [viewMode, setViewMode] = useState<'preview' | 'reader'>('preview');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);

  // Reader mode state
  const [readerData, setReaderData] = useState<{
    title: string;
    description: string;
    content: string;
    length: number;
  } | null>(null);
  const [isReaderLoading, setIsReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState<string | null>(null);

  useEffect(() => {
    if (url) {
      setCurrentUrl(url);
      setIsLoading(true);
      setReaderData(null);
      setReaderError(null);
      setViewMode('preview');
    }
  }, [url]);

  // Fetch reader mode content when switching to reader
  useEffect(() => {
    if (viewMode === 'reader' && currentUrl && !readerData && !isReaderLoading) {
      setIsReaderLoading(true);
      setReaderError(null);
      fetch(`/api/fetch-site?url=${encodeURIComponent(currentUrl)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setReaderData(data);
          } else {
            setReaderError(data.error || 'Failed to extract reader content.');
          }
        })
        .catch(err => {
          setReaderError(err.message || 'Network error loading reader view.');
        })
        .finally(() => {
          setIsReaderLoading(false);
        });
    }
  }, [viewMode, currentUrl, readerData, isReaderLoading]);

  if (!url) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey(k => k + 1);
  };

  const handleAskAiAboutPage = () => {
    if (!onAskAi) return;
    const pageTitle = readerData?.title || 'Webpage';
    const pageSnippet = readerData?.content ? readerData.content.slice(0, 2500) : '';
    const prompt = `Analyze and summarize this site: [${pageTitle}](${currentUrl})\n\n${pageSnippet ? `PAGE CONTENT:\n${pageSnippet}\n\n` : ''}What are the key takeaways, features, and insights from this webpage?`;
    onAskAi(prompt);
    onClose();
  };

  const proxyUrl = `/api/proxy-site?url=${encodeURIComponent(currentUrl)}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="w-full max-w-5xl h-[88vh] max-h-[850px] rounded-3xl bg-[var(--bg-card)] border border-white/15 shadow-2xl flex flex-col overflow-hidden apple-liquid-glass"
        >
          {/* Browser Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-white/10 gap-2 shrink-0">
            {/* Window Controls / Traffic Lights */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 mr-2">
                <button 
                  onClick={onClose}
                  className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 border border-red-400/30 transition-all cursor-pointer"
                  title="Close"
                />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-400/30" />
                <div className="w-3 h-3 rounded-full bg-green-500/80 border border-green-400/30" />
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] font-mono">
                <Globe size={13} className="text-[var(--accent-primary)]" />
                <span>Hem'S Web Browser</span>
              </span>
            </div>

            {/* Smart URL Bar */}
            <div className="flex-1 max-w-xl mx-2 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-mono text-[var(--text-primary)]">
              <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
              <input 
                type="text" 
                value={currentUrl} 
                onChange={(e) => setCurrentUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleReload(); }}
                className="flex-1 bg-transparent border-none outline-none text-xs text-white truncate selection:bg-sky-500/30"
              />
              <button 
                onClick={handleReload}
                className="text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer shrink-0"
                title="Reload site"
              >
                <RotateCw size={12} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {/* Browser Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Toggle Preview vs Reader */}
              <div className="flex items-center bg-white/[0.06] rounded-xl p-0.5 border border-white/10">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === 'preview' 
                      ? "bg-[var(--accent-primary)] text-black font-semibold shadow-sm" 
                      : "text-[var(--text-muted)] hover:text-white"
                  }`}
                  title="Live Web Preview"
                >
                  <Eye size={12} />
                  <span className="hidden sm:inline">Webview</span>
                </button>
                <button
                  onClick={() => setViewMode('reader')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === 'reader' 
                      ? "bg-[var(--accent-primary)] text-black font-semibold shadow-sm" 
                      : "text-[var(--text-muted)] hover:text-white"
                  }`}
                  title="Distraction-Free Reader Mode"
                >
                  <BookOpen size={12} />
                  <span className="hidden sm:inline">Reader</span>
                </button>
              </div>

              {/* Copy URL */}
              <button
                onClick={handleCopyUrl}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/10 text-[var(--text-muted)] hover:text-white border border-white/10 transition-all cursor-pointer"
                title="Copy link"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>

              {/* Open in external tab */}
              <a
                href={currentUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/10 text-[var(--text-muted)] hover:text-white border border-white/10 transition-all cursor-pointer"
                title="Open in new browser tab"
              >
                <ExternalLink size={14} />
              </a>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 border border-white/10 transition-all cursor-pointer"
                title="Close viewer"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Quick AI Action Banner */}
          {onAskAi && (
            <div className="px-4 py-2 bg-gradient-to-r from-sky-950/40 via-purple-950/30 to-black/40 border-b border-white/10 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-sky-200">
                <Sparkles size={14} className="text-sky-400 shrink-0 animate-pulse" />
                <span className="truncate">Need Hem'S Swarm to read and synthesize this page?</span>
              </div>
              <button
                onClick={handleAskAiAboutPage}
                className="px-3 py-1 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/30 font-medium transition-all text-[11px] shrink-0 active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles size={11} />
                <span>Ask Swarm AI</span>
              </button>
            </div>
          )}

          {/* Body Area */}
          <div className="flex-1 w-full h-full relative overflow-hidden bg-black/60">
            {/* Mode 1: Live Webview with Proxy Fallback */}
            {viewMode === 'preview' && (
              <div className="w-full h-full relative">
                {isLoading && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm text-xs font-mono text-[var(--accent-primary)]">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin" />
                    <span>Loading website safely via Hem'S proxy...</span>
                    <span className="text-[10.5px] text-[var(--text-muted)] font-sans">
                      Bypassing frame restrictions & CORS policies
                    </span>
                  </div>
                )}
                <iframe
                  key={iframeKey}
                  src={proxyUrl}
                  title="Web Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
                  className="w-full h-full border-none"
                  onLoad={() => setIsLoading(false)}
                  onError={() => setIsLoading(false)}
                />
              </div>
            )}

            {/* Mode 2: Reader Mode */}
            {viewMode === 'reader' && (
              <div className="w-full h-full overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto space-y-6 text-left">
                {isReaderLoading && (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-xs font-mono text-[var(--accent-primary)]">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin" />
                    <span>Extracting clean reader text & structure...</span>
                  </div>
                )}

                {readerError && !isReaderLoading && (
                  <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-200 text-xs flex items-center gap-3">
                    <AlertCircle size={18} className="text-red-400 shrink-0" />
                    <span>{readerError}</span>
                  </div>
                )}

                {readerData && !isReaderLoading && (
                  <div className="space-y-6">
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
                        {readerData.title}
                      </h1>
                      <div className="flex items-center gap-3 mt-3 text-xs font-mono text-[var(--text-muted)]">
                        <span className="text-[var(--accent-primary)] truncate">{currentUrl}</span>
                        <span>•</span>
                        <span>~{Math.max(1, Math.round(readerData.length / 1000))} min read</span>
                      </div>
                    </div>

                    {readerData.description && (
                      <blockquote className="p-4 rounded-2xl bg-white/[0.04] border-l-4 border-[var(--accent-primary)] text-sm text-[var(--text-muted)] italic">
                        {readerData.description}
                      </blockquote>
                    )}

                    <div className="text-[14.5px] leading-relaxed text-[var(--text-primary)] space-y-4 whitespace-pre-line font-sans select-text">
                      {readerData.content}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
