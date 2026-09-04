import { motion, AnimatePresence } from 'motion/react';
import { Paperclip, ArrowUp, Square, X, Image as ImageIcon, Globe, Terminal, RotateCw, CheckCircle2, Sparkles } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useSkills } from '../context/SkillContext';

interface FloatingInputProps {
  onSend: (text: string, image?: string | null, webSearch?: boolean) => void;
  onStop?: () => void;
  isStreaming: boolean;
}

export function FloatingInput({ onSend, onStop, isStreaming }: FloatingInputProps) {
  const [text, setText] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [isWebSearch, setIsWebSearch] = useState(false);
  const [terminalStatus, setTerminalStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [terminalLatency, setTerminalLatency] = useState<number | null>(null);
  const [terminalSystem, setTerminalSystem] = useState<string>('');
  const [showTerminalPopup, setShowTerminalPopup] = useState(false);
  const [isTestingTerminal, setIsTestingTerminal] = useState(false);
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const terminalPopupRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mode, isVibe, isPerformance } = useTheme();
  const { activeSkills } = useSkills();
  const isSwamp = mode === 'swamp';

  const checkTerminalHealth = async () => {
    const start = Date.now();
    try {
      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'node -v' })
      });
      const dur = Date.now() - start;
      if (res.ok) {
        const data = await res.json();
        if (data.exitCode === 0) {
          setTerminalStatus('online');
          setTerminalLatency(dur);
          setTerminalSystem(`Node.js ${data.stdout?.trim() || ''}`);
          return;
        }
      }
      setTerminalStatus('offline');
      setTerminalLatency(dur);
    } catch {
      setTerminalStatus('offline');
      setTerminalLatency(null);
    }
  };

  useEffect(() => {
    checkTerminalHealth();
    const interval = setInterval(checkTerminalHealth, 35000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (terminalPopupRef.current && !terminalPopupRef.current.contains(e.target as Node)) {
        setShowTerminalPopup(false);
      }
    };
    if (showTerminalPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTerminalPopup]);

  const runTerminalQuickTest = async () => {
    setIsTestingTerminal(true);
    setTestOutput(null);
    const start = Date.now();
    try {
      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'node -e "console.log(\'Terminal online • Node \' + process.version + \' • \' + process.platform)"' })
      });
      if (res.ok) {
        const data = await res.json();
        setTerminalStatus('online');
        setTerminalLatency(data.durationMs || (Date.now() - start));
        setTestOutput(data.stdout?.trim() || 'Terminal is 100% active and working!');
      } else {
        setTerminalStatus('offline');
        setTestOutput(`Server status ${res.status}`);
      }
    } catch (err: any) {
      setTerminalStatus('offline');
      setTestOutput(`Error: ${err.message || 'Offline'}`);
    } finally {
      setIsTestingTerminal(false);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  useEffect(() => {
    const handleCustomPrompt = (e: any) => {
      if (e.detail?.prompt) {
        onSend(e.detail.prompt, null, isWebSearch);
      }
    };
    window.addEventListener('send-swarm-prompt', handleCustomPrompt);
    return () => window.removeEventListener('send-swarm-prompt', handleCustomPrompt);
  }, [onSend, isWebSearch]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachedFileName(file.name);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const result = loadEvt.target?.result as string;
        setAttachedImage(result);
      };
      reader.readAsDataURL(file);
    } else {
      // Read text-based file
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const content = loadEvt.target?.result as string;
        setText(prev => (prev ? `${prev}\n\n[Attached File: ${file.name}]\n${content}` : `[Attached File: ${file.name}]\n${content}`));
        setAttachedFileName(null);
      };
      reader.readAsText(file);
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = () => {
    setAttachedImage(null);
    setAttachedFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = () => {
    if ((text.trim() || attachedImage) && !isStreaming) {
      const promptToSend = text.trim() || (attachedImage ? "Analyze this visual asset and provide comprehensive system insights." : "");
      onSend(promptToSend, attachedImage, isWebSearch);
      setText('');
      setAttachedImage(null);
      setAttachedFileName(null);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const getPlaceholder = () => {
    return isWebSearch ? "Search Google & command Hem'S with live web data..." : "command to Hem'S...";
  };

  const getIndicatorText = () => {
    const webPrefix = isWebSearch ? '🌐 GOOGLE SEARCH ACTIVE • ' : '';
    const skillSuffix = activeSkills.length > 0 ? ` • ${activeSkills.length} SKILL${activeSkills.length > 1 ? 'S' : ''} ACTIVE` : '';
    const termSuffix = terminalStatus === 'online' ? ' • ⚡ TERMINAL ONLINE' : terminalStatus === 'checking' ? ' • TERMINAL CHECKING' : ' • ⚠️ TERMINAL SANDBOX';
    if (isStreaming) {
      if (isPerformance) return `${webPrefix}⚡ AUTO-PERFORMANCE MODE ACTIVE • 5-AI QUANTUM ROSTER STREAMING${skillSuffix}${termSuffix}`;
      if (isVibe && isSwamp) return `${webPrefix}SWARM CODE STREAM ACTIVE • 5-AI FULL SYNTHESIS${skillSuffix}${termSuffix}`;
      if (isVibe) return `${webPrefix}CODE STREAM ACTIVE • VIBE SYNTHESIS${skillSuffix}${termSuffix}`;
      if (isSwamp) return `${webPrefix}SWARM STREAM ACTIVE • 5-AI PARALLEL REASONING${skillSuffix}${termSuffix}`;
      return `${webPrefix}PARALLEL STREAM ACTIVE • REASONING IN PROGRESS${skillSuffix}${termSuffix}`;
    }
    if (isPerformance) return `${webPrefix}⚡ AUTO-PERFORMANCE ACTIVE • 5-AI QUANTUM ROSTER ENGAGED${skillSuffix}${termSuffix}`;
    if (isVibe && isSwamp) return `${webPrefix}SWARM & CODE MODE ACTIVE • 5-AI ROLE SYNTHESIS${skillSuffix}${termSuffix}`;
    if (isVibe) return `${webPrefix}CODE MODE ACTIVE • VIBE SYNTHESIS${skillSuffix}${termSuffix}`;
    if (isSwamp) return `${webPrefix}SWARM MODE ACTIVE (5-AI PARALLEL ROSTER)${skillSuffix}${termSuffix}`;
    return `${webPrefix}PARALLEL AI ENGINE ACTIVE${skillSuffix}${termSuffix}`;
  };

  return (
    <div className="fixed sm:absolute bottom-0 left-0 right-0 pointer-events-none z-40 flex flex-col items-center justify-end px-3 sm:px-6 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:pb-6 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)]/80 to-transparent pt-10">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,text/*,.ts,.tsx,.js,.jsx,.json,.md,.py,.css,.html"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Attachment Preview Chip */}
      <AnimatePresence>
        {attachedImage && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="pointer-events-auto mb-2.5 px-3.5 py-1.5 rounded-2xl backdrop-blur-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-xl flex items-center gap-2 max-w-sm self-start sm:self-center"
          >
            <img src={attachedImage} alt="Attachment" className="w-8 h-8 rounded-lg object-cover border border-white/10" />
            <span className="text-xs text-[var(--text-primary)] font-mono truncate max-w-[180px]">
              {attachedFileName || 'image_asset.png'}
            </span>
            <button
              onClick={removeAttachment}
              type="button"
              className="p-1 rounded-full text-[var(--text-muted)] hover:text-red-400 hover:bg-white/5 transition-colors"
              title="Remove attachment"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ y: 24, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="pointer-events-auto w-full max-w-2xl sm:max-w-3xl rounded-[26px] sm:rounded-[36px] backdrop-blur-3xl border border-white/15 p-1.5 sm:p-2.5 flex items-end gap-1.5 sm:gap-3 transition-all duration-500 relative overflow-hidden apple-liquid-glass shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_25px_60px_rgba(0,0,0,0.55)]"
      >
        {/* Specular Liquid Edge Highlight */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-70 pointer-events-none" />
        
        {/* Attachment Button */}
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => fileInputRef.current?.click()}
          type="button"
          title="Attach asset or code file"
          className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
        >
          {attachedImage ? <ImageIcon size={18} className="text-[var(--accent-primary)]" /> : <Paperclip size={18} />}
        </motion.button>

        {/* Live Google & Web Search Toggle */}
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsWebSearch(!isWebSearch)}
          type="button"
          title={isWebSearch ? "Live Google Search: ACTIVE" : "Search Google & Web (Real-Time Data)"}
          className={`w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isWebSearch 
              ? 'bg-sky-500/20 text-sky-400 border border-sky-400/40 shadow-[0_0_15px_rgba(56,189,248,0.35)]' 
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
          }`}
        >
          <Globe size={18} className={isWebSearch ? "animate-spin-slow" : ""} />
        </motion.button>

        {/* Live Terminal Power Status Toggle & Tiny Popup Trigger */}
        <div className="relative shrink-0" ref={terminalPopupRef}>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowTerminalPopup(!showTerminalPopup)}
            type="button"
            title={`Terminal Engine: ${terminalStatus.toUpperCase()} (Click to check)`}
            className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
              showTerminalPopup
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 shadow-[0_0_15px_rgba(52,211,153,0.35)]'
                : terminalStatus === 'online'
                ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                : terminalStatus === 'checking'
                ? 'text-amber-400 hover:bg-amber-500/10'
                : 'text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10'
            }`}
          >
            <Terminal size={18} />
            {/* Live status dot */}
            <span className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full border border-black/60 ${
              terminalStatus === 'online'
                ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                : terminalStatus === 'checking'
                ? 'bg-amber-400 animate-ping'
                : 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'
            }`} />
          </motion.button>

          {/* Tiny Terminal Health Status Popup */}
          <AnimatePresence>
            {showTerminalPopup && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full mb-3 left-0 sm:-left-6 w-72 sm:w-80 rounded-2xl backdrop-blur-2xl bg-[#090d16]/95 border border-emerald-500/35 shadow-[0_15px_40px_rgba(0,0,0,0.7)] p-3.5 text-xs font-mono z-50 pointer-events-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500/70 inline-block" />
                      <span className="w-2 h-2 rounded-full bg-amber-500/70 inline-block" />
                      <span className="w-2 h-2 rounded-full bg-emerald-500/70 inline-block" />
                    </div>
                    <span className="text-[11px] font-semibold text-white tracking-wide flex items-center gap-1">
                      <Terminal size={12} className="text-emerald-400" />
                      AI Terminal Engine
                    </span>
                  </div>
                  <button
                    onClick={() => setShowTerminalPopup(false)}
                    className="text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer p-0.5"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Status Row */}
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-2 mb-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-muted)] text-[10px] uppercase">Engine Status</span>
                    <span className={`text-[10.5px] font-semibold flex items-center gap-1.5 ${
                      terminalStatus === 'online'
                        ? 'text-emerald-400'
                        : terminalStatus === 'checking'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        terminalStatus === 'online'
                          ? 'bg-emerald-400 animate-pulse'
                          : terminalStatus === 'checking'
                          ? 'bg-amber-400 animate-spin'
                          : 'bg-rose-500'
                      }`} />
                      {terminalStatus === 'online'
                        ? 'ONLINE (Ready to Execute)'
                        : terminalStatus === 'checking'
                        ? 'Pinging Terminal...'
                        : 'OFFLINE (Client Sandbox)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/80">
                    <span className="text-[var(--text-muted)] text-[10px] uppercase">Latency</span>
                    <span>{terminalLatency !== null ? `${terminalLatency}ms` : '--'}</span>
                  </div>

                  {terminalSystem && (
                    <div className="flex items-center justify-between text-[11px] text-white/80">
                      <span className="text-[var(--text-muted)] text-[10px] uppercase">Runtime</span>
                      <span className="truncate max-w-[170px] text-emerald-300">{terminalSystem}</span>
                    </div>
                  )}
                </div>

                {/* Live Test Output Display if available */}
                {testOutput && (
                  <div className="mb-2.5 p-2 rounded-lg bg-[#05080e] border border-emerald-500/20 text-[11px]">
                    <div className="text-[10px] text-emerald-400/80 mb-1 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Test Response:
                    </div>
                    <pre className="text-emerald-300 whitespace-pre-wrap break-all leading-tight">
                      {testOutput}
                    </pre>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={runTerminalQuickTest}
                    disabled={isTestingTerminal}
                    type="button"
                    className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RotateCw size={11} className={isTestingTerminal ? "animate-spin" : ""} />
                    <span>{isTestingTerminal ? 'Testing...' : 'Test Terminal'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowTerminalPopup(false);
                      onSend("Check what version of Node.js and Python are installed on this system using your terminal.", null, false);
                    }}
                    type="button"
                    title="Send terminal test prompt to all AI models"
                    className="py-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/90 border border-white/10 text-[11px] font-medium transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={11} className="text-cyan-400" />
                    <span>Run in AI</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={getPlaceholder()}
          className={`flex-1 max-h-[160px] sm:max-h-[200px] min-h-[40px] sm:min-h-[44px] bg-transparent border-none outline-none resize-none py-2 sm:py-2.5 px-2 sm:px-3 text-base sm:text-[15px] leading-[22px] sm:leading-[26px] -tracking-tight overflow-y-auto transition-colors duration-300 ${
            isPerformance
              ? 'placeholder:text-sky-300/70 placeholder:[text-shadow:0_0_10px_rgba(56,189,248,0.5)] text-[#f0f9ff] [text-shadow:0_0_12px_rgba(56,189,248,0.9),0_0_24px_rgba(37,99,235,0.5)]'
              : isVibe
              ? 'placeholder:text-[#f472b6]/70 placeholder:[text-shadow:0_0_10px_rgba(236,72,153,0.5)]'
              : 'placeholder:text-[var(--text-muted)]'
          } ${
            isVibe && text.length > 0
              ? 'text-[#fae8ff] [text-shadow:0_0_12px_rgba(244,114,182,0.9),0_0_24px_rgba(244,114,182,0.5)]'
              : isSwamp && text.length > 0 
              ? 'text-[#dcfce7] [text-shadow:0_0_12px_rgba(74,222,128,0.8),0_0_24px_rgba(74,222,128,0.4)]' 
              : 'text-[var(--text-primary)]'
          }`}
          rows={1}
        />
        
        {isStreaming ? (
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={onStop}
            type="button"
            title="Stop generation"
            className="w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-full flex items-center justify-center bg-red-500/90 text-white hover:bg-red-500 transition-colors shadow-sm"
          >
            <Square size={15} fill="currentColor" />
          </motion.button>
        ) : (
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!text.trim() && !attachedImage}
            type="button"
            title="Send prompt"
            className={`w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 ${
              isPerformance
                ? 'bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.6)] hover:opacity-95'
                : isVibe 
                ? 'bg-gradient-to-tr from-[#ec4899] via-[#c084fc] to-[#a855f7] text-white shadow-[0_0_15px_rgba(236,72,153,0.5)] hover:opacity-95' 
                : isSwamp
                ? 'bg-gradient-to-tr from-[#10B981] via-[#34d399] to-[#4ADE80] text-black font-semibold shadow-[0_0_15px_rgba(74,222,128,0.5)] hover:opacity-95'
                : 'bg-[var(--text-primary)] text-[var(--bg-base)] hover:opacity-90'
            }`}
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </motion.button>
        )}
      </motion.div>

      <div className={`pointer-events-auto mt-2 px-3 py-1 rounded-full backdrop-blur-md bg-[var(--pill-bg)]/80 border border-[var(--glass-border)]/40 shadow-sm text-[8.5px] sm:text-[10px] font-mono font-medium tracking-wider uppercase transition-colors duration-300 truncate max-w-[94vw] ${
        isPerformance ? 'text-[#f0f9ff] [text-shadow:0_0_10px_rgba(56,189,248,0.9),0_0_20px_rgba(37,99,235,0.5)]' : isVibe ? 'text-[#fdf4ff] [text-shadow:0_0_10px_rgba(236,72,153,0.9),0_0_20px_rgba(236,72,153,0.5)]' : isSwamp ? 'text-[#dcfce7] [text-shadow:0_0_10px_rgba(74,222,128,0.8),0_0_20px_rgba(74,222,128,0.4)]' : 'text-[var(--text-muted)]/70'
      }`}>
        {getIndicatorText()}
      </div>
    </div>
  );
}
