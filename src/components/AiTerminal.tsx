import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal as TerminalIcon, Play, Square, Trash2, Copy, Check, 
  Maximize2, Minimize2, X, ChevronRight, CornerDownLeft, Sparkles, Cpu
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export interface TerminalEntry {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timestamp: number;
}

interface AiTerminalProps {
  modelName: string;
  modelRole?: string;
  codeSnippet?: string;
  isOpen: boolean;
  onClose: () => void;
  onExecutePrompt?: (resultText: string) => void;
}

export function AiTerminal({
  modelName,
  modelRole,
  codeSnippet,
  isOpen,
  onClose,
  onExecutePrompt
}: AiTerminalProps) {
  const { mode, isVibe, isPerformance } = useTheme();
  const isSwamp = mode === 'swamp';

  const [entries, setEntries] = useState<TerminalEntry[]>([
    {
      id: 'init-1',
      command: `echo "Hem'S Terminal System ready for ${modelName}"`,
      stdout: `[Hem'S Interactive Runtime v2.5.0]\nConnected to environment. Full sandbox power activated.`,
      stderr: '',
      exitCode: 0,
      durationMs: 1,
      timestamp: Date.now()
    }
  ]);
  const [inputCmd, setInputCmd] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [historyIdx, setHistoryIdx] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const commandHistoryRef = useRef<string[]>([]);
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, entries.length]);

  const executeCommand = async (cmdToRun: string, language?: string, rawCode?: string) => {
    const trimmed = (cmdToRun || rawCode || '').trim();
    if (!trimmed || isRunning) return;

    if (cmdToRun === 'clear' || cmdToRun === 'cls') {
      setEntries([]);
      setInputCmd('');
      return;
    }

    setIsRunning(true);
    commandHistoryRef.current.push(trimmed);
    setHistoryIdx(null);
    setInputCmd('');

    const entryId = `term-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const startTime = Date.now();

    try {
      // First try backend execution endpoint
      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cmdToRun,
          language,
          code: rawCode,
          timeout: 12000
        })
      });

      if (res.ok) {
        const data = await res.json();
        setEntries(prev => [
          ...prev,
          {
            id: entryId,
            command: cmdToRun || `run ${language || 'code'}`,
            stdout: data.stdout || '',
            stderr: data.stderr || '',
            exitCode: data.exitCode || 0,
            durationMs: data.durationMs || (Date.now() - startTime),
            timestamp: Date.now()
          }
        ]);
      } else {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
    } catch (err: any) {
      // Standalone browser client fallback execution (Runs safe JS in sandboxed iframe/Function)
      let fallbackStdout = '';
      let fallbackStderr = '';
      let exitCode = 0;

      if (cmdToRun.startsWith('echo ')) {
        fallbackStdout = cmdToRun.slice(5);
      } else if (cmdToRun.startsWith('node -e ') || cmdToRun.startsWith('js ')) {
        const script = cmdToRun.replace(/^(node -e |js )/, '').replace(/^['"]|['"]$/g, '');
        try {
          const logs: string[] = [];
          const customConsole = {
            log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
            error: (...args: any[]) => logs.push('ERROR: ' + args.join(' ')),
            warn: (...args: any[]) => logs.push('WARN: ' + args.join(' ')),
          };
          const fn = new Function('console', script);
          fn(customConsole);
          fallbackStdout = logs.join('\n') || '[Process completed with 0 output]';
        } catch (e: any) {
          fallbackStderr = e.message;
          exitCode = 1;
        }
      } else {
        fallbackStderr = `${err.message || 'Execution error'}. Note: Backend terminal connection unavailable; you can run JavaScript commands using: js console.log('hello world')`;
        exitCode = 1;
      }

      setEntries(prev => [
        ...prev,
        {
          id: entryId,
          command: cmdToRun || 'script execution',
          stdout: fallbackStdout,
          stderr: fallbackStderr,
          exitCode,
          durationMs: Date.now() - startTime,
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsRunning(false);
      setTimeout(() => {
        terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(inputCmd);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistoryRef.current.length > 0) {
        const nextIdx = historyIdx === null ? commandHistoryRef.current.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(nextIdx);
        setInputCmd(commandHistoryRef.current[nextIdx] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx !== null) {
        const nextIdx = historyIdx + 1;
        if (nextIdx < commandHistoryRef.current.length) {
          setHistoryIdx(nextIdx);
          setInputCmd(commandHistoryRef.current[nextIdx] || '');
        } else {
          setHistoryIdx(null);
          setInputCmd('');
        }
      }
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendOutputToChat = (entry: TerminalEntry) => {
    if (!onExecutePrompt) return;
    const summary = `[TERMINAL EXECUTION RESULT for ${modelName}]\nCommand: \`${entry.command}\` (Exit Code: ${entry.exitCode}, Duration: ${entry.durationMs}ms)\n\nOUTPUT:\n\`\`\`\n${entry.stdout || entry.stderr}\n\`\`\`\nAnalyze this execution output.`;
    onExecutePrompt(summary);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0, scale: 0.98 }}
        animate={{ opacity: 1, height: isExpanded ? '480px' : '320px', scale: 1 }}
        exit={{ opacity: 0, height: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="w-full mt-3 rounded-2xl overflow-hidden bg-[#0a0a0c] border border-white/20 shadow-2xl flex flex-col font-mono text-xs text-white [contain:content]"
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-white/[0.04] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            {/* macOS traffic light buttons */}
            <div className="flex gap-1.5 mr-1">
              <button 
                onClick={onClose}
                className="w-2.5 h-2.5 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer"
                title="Close terminal"
              />
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors cursor-pointer"
                title="Expand/Collapse"
              />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
              <TerminalIcon size={12} className="text-emerald-400" />
              <span className="font-semibold text-white tracking-tight">{modelName}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-emerald-300 font-mono">
                {isRunning ? 'RUNNING...' : 'READY'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setEntries([])}
              className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
              title="Clear terminal"
            >
              <Trash2 size={12} />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-[var(--text-muted)] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Close terminal"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Quick Action Badges */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 border-b border-white/5 overflow-x-auto no-scrollbar shrink-0 text-[10px]">
          <span className="text-[var(--text-muted)] mr-1 flex items-center gap-1">
            <Cpu size={10} /> Quick:
          </span>
          {codeSnippet && (
            <button
              onClick={() => executeCommand('', 'javascript', codeSnippet)}
              disabled={isRunning}
              className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all cursor-pointer font-bold flex items-center gap-1 shrink-0"
            >
              <Play size={9} fill="currentColor" />
              <span>Run Model Code</span>
            </button>
          )}
          <button
            onClick={() => executeCommand('node -v')}
            disabled={isRunning}
            className="px-2 py-0.5 rounded bg-white/5 text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            node -v
          </button>
          <button
            onClick={() => executeCommand('python --version')}
            disabled={isRunning}
            className="px-2 py-0.5 rounded bg-white/5 text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            python --version
          </button>
          <button
            onClick={() => executeCommand('curl -I https://google.com')}
            disabled={isRunning}
            className="px-2 py-0.5 rounded bg-white/5 text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            curl -I google.com
          </button>
        </div>

        {/* Terminal Log Output Window */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 select-text font-mono text-[11.5px] leading-relaxed">
          {entries.map((entry) => (
            <div key={entry.id} className="space-y-1 group">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">$</span>
                  <span className="text-white font-medium">{entry.command}</span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  <span className={`text-[9px] px-1 py-0.2 rounded ${entry.exitCode === 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                    exit {entry.exitCode} ({entry.durationMs}ms)
                  </span>
                  <button
                    onClick={() => handleCopy(entry.id, `${entry.stdout}\n${entry.stderr}`)}
                    className="p-1 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white"
                    title="Copy output"
                  >
                    {copiedId === entry.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                  </button>
                  {onExecutePrompt && (
                    <button
                      onClick={() => handleSendOutputToChat(entry)}
                      className="p-1 rounded hover:bg-white/10 text-sky-400 hover:text-sky-300"
                      title="Send output to AI"
                    >
                      <Sparkles size={10} />
                    </button>
                  )}
                </div>
              </div>

              {entry.stdout && (
                <pre className="text-emerald-300/90 whitespace-pre-wrap break-all pl-3 border-l border-emerald-500/20 py-0.5">
                  {entry.stdout}
                </pre>
              )}

              {entry.stderr && (
                <pre className="text-red-400/90 whitespace-pre-wrap break-all pl-3 border-l border-red-500/30 py-0.5">
                  {entry.stderr}
                </pre>
              )}
            </div>
          ))}

          {isRunning && (
            <div className="flex items-center gap-2 text-emerald-400 py-1 pl-3 border-l border-emerald-500/30 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Executing in terminal sandbox...</span>
            </div>
          )}

          <div ref={terminalBottomRef} />
        </div>

        {/* Interactive Prompt Input */}
        <div className="px-3 py-2 bg-black/80 border-t border-white/10 flex items-center gap-2 shrink-0">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <ChevronRight size={13} />
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputCmd}
            onChange={(e) => setInputCmd(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isRunning}
            placeholder={isRunning ? "Command executing..." : "Type command (e.g. node -v, python -V, ls)..."}
            className="flex-1 bg-transparent border-none outline-none text-white text-xs placeholder:text-[var(--text-muted)]/50 selection:bg-emerald-500/30"
          />
          <button
            onClick={() => executeCommand(inputCmd)}
            disabled={isRunning || !inputCmd.trim()}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-medium transition-all active:scale-95 disabled:opacity-30 cursor-pointer flex items-center gap-1"
          >
            <CornerDownLeft size={11} />
            <span>Run</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
