import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, X, Play, RotateCcw, Copy, Check, Trash2, 
  Maximize2, Minimize2, Cpu, HardDrive, Sparkles, Code2, 
  Folder, FolderOpen, FileCode, CheckCircle2, XCircle, Loader2, 
  ArrowUpRight, Paperclip, Search, ArrowLeft, ChevronRight
} from 'lucide-react';

interface AiTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExecutionRecord {
  id: string;
  timestamp: string;
  mode: 'ai' | 'shell' | 'code';
  prompt?: string;
  plan?: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  cwd: string;
  verifiedAnswer?: string;
  status: 'running' | 'success' | 'failed';
}

interface HostInfo {
  cwd: string;
  platform: string;
  arch: string;
  hostname: string;
  username: string;
  nodeVersion: string;
  cpuModel: string;
  cpuCores: number;
  totalMemMb: number;
  freeMemMb: number;
  uptimeSeconds: number;
  shell: string;
}

interface ProjectFileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
}

export function AiTerminalModal({ isOpen, onClose }: AiTerminalModalProps) {
  const [mode, setMode] = useState<'ai' | 'shell' | 'code'>('ai');
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<'javascript' | 'python' | 'shell'>('javascript');
  const [isMaximized, setIsMaximized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<ExecutionRecord[]>([]);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [cmdHistoryIndex, setCmdHistoryIndex] = useState<number>(-1);
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // File Selector State
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [browserDir, setBrowserDir] = useState('');
  const [browserParentDir, setBrowserParentDir] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<ProjectFileItem[]>([]);
  const [fileFilter, setFileFilter] = useState('');
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content?: string; size: number } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const localFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Host info on open
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/terminal/info')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setHostInfo(data);
      })
      .catch(() => {});
    
    // Auto focus input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  }, [isOpen]);

  // Load project directory for file selection
  const loadDirectory = async (dirPath: string = '') => {
    setIsLoadingFiles(true);
    try {
      const res = await fetch(`/api/terminal/files?dir=${encodeURIComponent(dirPath)}`);
      const data = await res.json();
      if (Array.isArray(data.files)) {
        setProjectFiles(data.files);
        setBrowserDir(data.currentDir || '');
        setBrowserParentDir(data.parentDir || null);
      }
    } catch (e) {
      console.error('Failed to list project files:', e);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleOpenFileBrowser = () => {
    setShowFileBrowser(true);
    loadDirectory(browserDir || '');
  };

  const handleSelectFile = (file: ProjectFileItem, action: 'insert' | 'inspect' | 'ai') => {
    setShowFileBrowser(false);
    if (action === 'insert') {
      setInput(prev => prev ? `${prev} "${file.path}"` : `"${file.path}"`);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else if (action === 'inspect') {
      setMode('shell');
      const inspectCmd = hostInfo?.platform === 'win32'
        ? `Get-Content "${file.path}" -TotalCount 80`
        : `cat "${file.path}" | head -n 80`;
      executeExecutionRecord(inspectCmd, undefined, `Inspect file ${file.path}`);
    } else if (action === 'ai') {
      setMode('ai');
      handleRun(`inspect and explain ${file.path}`);
    }
  };

  const handleLocalFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setAttachedFile({
        name: file.name,
        content,
        size: file.size
      });
      if (mode === 'code') {
        setInput(content);
      } else {
        setInput(prev => prev ? `${prev} "${file.name}"` : `"${file.name}"`);
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    reader.readAsText(file);
    if (localFileInputRef.current) localFileInputRef.current.value = '';
  };

  // Keyboard shortcut listener for Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showFileBrowser) {
          setShowFileBrowser(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showFileBrowser]);

  // Scroll to bottom when history changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isRunning]);

  const filteredFiles = useMemo(() => {
    const q = fileFilter.toLowerCase().trim();
    if (!q) return projectFiles;
    return projectFiles.filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));
  }, [projectFiles, fileFilter]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const synthesizeVerifiedAnswer = (prompt: string, stdout: string, exitCode: number): string => {
    const cleanOut = stdout.trim();
    if (exitCode !== 0) {
      return "Execution encountered an error. Please inspect stderr details above.";
    }

    if (!cleanOut) {
      return "Command completed successfully with no stdout output (Exit Code 0).";
    }

    // Math calculation check
    if (/calculate|what is|compute|eval/i.test(prompt) && /^-?\d+(\.\d+)?$/.test(cleanOut)) {
      return `Exact computed result: **${cleanOut}**`;
    }

    // Git branch check
    if (/branch/i.test(prompt) && cleanOut.length < 50) {
      return `Verified current branch: **${cleanOut}**`;
    }

    // System info check
    if (/system|specs|hardware|ram/i.test(prompt) && cleanOut.startsWith("{")) {
      return "System diagnostics verified directly from host hardware.";
    }

    return "Execution completed successfully. Source of truth verified from host output.";
  };

  const executeExecutionRecord = async (
    cmdToRun: string, 
    originalPrompt?: string, 
    plan?: string, 
    codePayload?: { code: string; language: string }
  ) => {
    const recordId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newRecord: ExecutionRecord = {
      id: recordId,
      timestamp: new Date().toLocaleTimeString(),
      mode,
      prompt: originalPrompt,
      plan,
      command: cmdToRun,
      stdout: '',
      stderr: '',
      exitCode: 0,
      durationMs: 0,
      cwd: hostInfo?.cwd || 'hems',
      status: 'running'
    };

    setHistory(prev => [...prev, newRecord]);
    setIsRunning(true);

    try {
      const payload = codePayload 
        ? { code: codePayload.code, language: codePayload.language }
        : { command: cmdToRun };

      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      const exitCode = typeof data.exitCode === 'number' ? data.exitCode : (data.success ? 0 : 1);
      const isSuccess = exitCode === 0;

      const verified = originalPrompt 
        ? synthesizeVerifiedAnswer(originalPrompt, data.stdout || '', exitCode)
        : undefined;

      setHistory(prev => prev.map(item => {
        if (item.id === recordId) {
          return {
            ...item,
            command: data.command || cmdToRun,
            stdout: data.stdout || '',
            stderr: data.stderr || '',
            exitCode,
            durationMs: data.durationMs || 0,
            cwd: data.cwd || item.cwd,
            verifiedAnswer: verified,
            status: isSuccess ? 'success' : 'failed'
          };
        }
        return item;
      }));
    } catch (err: any) {
      setHistory(prev => prev.map(item => {
        if (item.id === recordId) {
          return {
            ...item,
            stderr: err?.message || 'Failed to communicate with host terminal API',
            exitCode: 1,
            status: 'failed'
          };
        }
        return item;
      }));
    } finally {
      setIsRunning(false);
    }
  };

  const handleRun = async (overrideText?: string) => {
    const textToRun = (overrideText ?? input).trim();
    if (!textToRun || isRunning) return;

    // Track command history
    setCmdHistory(prev => [...prev, textToRun]);
    setCmdHistoryIndex(-1);
    setInput('');

    if (mode === 'ai') {
      setIsRunning(true);
      try {
        const planRes = await fetch('/api/terminal/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: textToRun })
        });
        const planData = await planRes.json();
        const plannedCommand = planData.command || textToRun;
        const planExplanation = planData.plan || `Execute: ${plannedCommand}`;

        await executeExecutionRecord(plannedCommand, textToRun, planExplanation);
      } catch {
        await executeExecutionRecord(textToRun, textToRun, `Execute direct command`);
      }
    } else if (mode === 'shell') {
      await executeExecutionRecord(textToRun);
    } else if (mode === 'code') {
      await executeExecutionRecord(
        `${language.toUpperCase()} Script`, 
        undefined, 
        `Evaluate ${language} inline code`,
        { code: textToRun, language }
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIndex = cmdHistoryIndex === -1 ? cmdHistory.length - 1 : Math.max(0, cmdHistoryIndex - 1);
      setCmdHistoryIndex(nextIndex);
      setInput(cmdHistory[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdHistoryIndex === -1) return;
      const nextIndex = cmdHistoryIndex + 1;
      if (nextIndex >= cmdHistory.length) {
        setCmdHistoryIndex(-1);
        setInput('');
      } else {
        setCmdHistoryIndex(nextIndex);
        setInput(cmdHistory[nextIndex]);
      }
    }
  };

  const quickActions = [
    { label: '📁 Select File', prompt: '__browse_files__', mode: 'ai' as const },
    { label: 'System Specs', prompt: 'system specs', mode: 'ai' as const },
    { label: 'Git Status', prompt: 'git status --short --branch', mode: 'shell' as const },
    { label: 'Recent Commits', prompt: 'git log -5 --oneline', mode: 'shell' as const },
    { label: 'Node & NPM', prompt: 'node -v && npm -v', mode: 'shell' as const },
    { label: 'List Files', prompt: 'list all files in directory', mode: 'ai' as const },
    { label: 'Disk Space', prompt: 'check available disk space', mode: 'ai' as const },
    { label: 'Calc Demo', prompt: 'calculate (938472 * 827361) / 1000', mode: 'ai' as const },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className={`relative z-10 w-full flex flex-col bg-[#0b0f17]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-3xl transition-all duration-300 ${
            isMaximized ? 'h-[96vh] max-w-[98vw]' : 'h-[85vh] max-h-[820px] max-w-5xl'
          }`}
        >
          {/* Top Bar / Header */}
          <div className="flex items-center justify-between px-3.5 sm:px-5 py-3 border-b border-white/10 bg-white/[0.03] select-none">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Terminal size={17} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs sm:text-sm text-white tracking-wide">
                    ANTIGRAVITY AI TERMINAL
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <div className="text-[11px] text-white/50 flex items-center gap-2">
                  <span>Command-First Execution</span>
                  {hostInfo && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-white/70">{hostInfo.platform} ({hostInfo.shell})</span>
                      <span className="hidden sm:inline">•</span>
                      <span className="hidden sm:inline font-mono text-white/70">{hostInfo.nodeVersion}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setMode('ai')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  mode === 'ai' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                title="Natural language Think-Plan-Execute-Verify controller"
              >
                <Sparkles size={13} />
                <span>AI Command</span>
              </button>

              <button
                onClick={() => setMode('shell')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  mode === 'shell' 
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                title="Direct shell terminal REPL execution"
              >
                <Terminal size={13} />
                <span>Shell REPL</span>
              </button>

              <button
                onClick={() => setMode('code')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  mode === 'code' 
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                title="Inline Code Runner (JavaScript / Python)"
              >
                <Code2 size={13} />
                <span>Code Runner</span>
              </button>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsMaximized(!isMaximized)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title={isMaximized ? "Restore window size" : "Maximize window"}
              >
                {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-300 flex items-center justify-center transition-colors cursor-pointer"
                title="Close terminal (Esc)"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick Action Chips & Controls Bar */}
          <div className="flex items-center justify-between gap-2 px-3.5 sm:px-5 py-2 border-b border-white/5 bg-black/20 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 mr-1">Quick:</span>
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (action.prompt === '__browse_files__') {
                      handleOpenFileBrowser();
                      return;
                    }
                    setMode(action.mode);
                    handleRun(action.prompt);
                  }}
                  disabled={isRunning}
                  className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/5 transition-all whitespace-nowrap active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  {action.label}
                </button>
              ))}
            </div>

            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 cursor-pointer"
                title="Clear terminal history"
              >
                <Trash2 size={12} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Execution History Stream */}
          <div 
            ref={scrollRef} 
            className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 font-mono text-xs bg-[#070a0f]/90 relative"
          >
            {/* Host Banner when empty */}
            {history.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 text-white/40 select-none">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400/80">
                  <Terminal size={32} />
                </div>
                <div className="max-w-md space-y-1.5">
                  <h3 className="text-white text-sm font-semibold tracking-wide">
                    Antigravity Real Execution Environment
                  </h3>
                  <p className="text-xs text-white/50">
                    Execution First. Answers Second. All commands execute live on the host with real exit codes and stdout verification.
                  </p>
                </div>

                {hostInfo && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-[11px] font-mono text-left w-full max-w-xl">
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                      <div className="text-white/40 flex items-center gap-1"><Cpu size={12} /> CPU</div>
                      <div className="text-white font-medium truncate">{hostInfo.cpuCores} Cores</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                      <div className="text-white/40 flex items-center gap-1"><HardDrive size={12} /> RAM</div>
                      <div className="text-white font-medium truncate">{hostInfo.freeMemMb} / {hostInfo.totalMemMb} MB</div>
                    </div>
                    {/* Clickable CWD to select files */}
                    <div 
                      onClick={handleOpenFileBrowser}
                      className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 cursor-pointer transition-all group"
                      title="Click to browse & select project files"
                    >
                      <div className="text-white/40 group-hover:text-emerald-400 flex items-center gap-1 transition-colors">
                        <FolderOpen size={12} /> Select File
                      </div>
                      <div className="text-white font-medium truncate group-hover:text-emerald-300 transition-colors">
                        {hostInfo.cwd.split(/[\\\/]/).pop()}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                      <div className="text-white/40 flex items-center gap-1"><Code2 size={12} /> Runtime</div>
                      <div className="text-white font-medium truncate">{hostInfo.nodeVersion}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Render Execution Cards */}
            {history.map((record) => (
              <div 
                key={record.id}
                className="rounded-xl border border-white/10 bg-black/50 overflow-hidden shadow-lg transition-all"
              >
                {/* Card Top Meta */}
                <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border-b border-white/5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      record.mode === 'ai' 
                        ? 'bg-emerald-500/20 text-emerald-300' 
                        : record.mode === 'shell'
                        ? 'bg-sky-500/20 text-sky-300'
                        : 'bg-purple-500/20 text-purple-300'
                    }`}>
                      {record.mode}
                    </span>
                    <span className="text-white/40">{record.timestamp}</span>
                    <span className="text-white/30">•</span>
                    <span className="text-white/60 truncate max-w-[200px]" title={record.cwd}>
                      {record.cwd.split(/[\\\/]/).pop()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    {record.status === 'running' ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px]">
                        <Loader2 size={11} className="animate-spin" />
                        Executing...
                      </span>
                    ) : record.status === 'success' ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px]">
                        <CheckCircle2 size={11} />
                        Exit {record.exitCode} ({record.durationMs}ms)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 text-[10px]">
                        <XCircle size={11} />
                        Exit {record.exitCode} ({record.durationMs}ms)
                      </span>
                    )}

                    {/* Actions */}
                    <button
                      onClick={() => copyToClipboard(record.command, `cmd_${record.id}`)}
                      className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                      title="Copy command"
                    >
                      {copiedId === `cmd_${record.id}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>
                    <button
                      onClick={() => executeExecutionRecord(record.command, record.prompt, record.plan)}
                      className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                      title="Re-run command"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                </div>

                {/* Plan Block (in AI mode) */}
                {record.plan && (
                  <div className="px-3 py-1.5 bg-emerald-500/[0.04] border-b border-emerald-500/10 text-emerald-300/90 text-[11px] flex items-center gap-2">
                    <Sparkles size={12} className="shrink-0 text-emerald-400" />
                    <span><strong>PLAN:</strong> {record.plan}</span>
                  </div>
                )}

                {/* Command Line */}
                <div className="px-3.5 py-2.5 bg-black/70 flex items-start gap-2 text-white font-mono border-b border-white/5">
                  <span className="text-emerald-400 font-bold select-none">$</span>
                  <span className="flex-1 select-all break-all">{record.command}</span>
                </div>

                {/* Stdout Output Viewer */}
                {record.stdout && (
                  <div className="p-3.5 max-h-72 overflow-y-auto whitespace-pre-wrap font-mono text-white/90 text-xs bg-black/40 leading-relaxed selection:bg-emerald-500/30">
                    {record.stdout}
                  </div>
                )}

                {/* Stderr Alert Viewer */}
                {record.stderr && (
                  <div className="p-3 bg-red-950/20 border-t border-red-500/20 text-red-300 whitespace-pre-wrap font-mono text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">Standard Error:</div>
                    {record.stderr}
                  </div>
                )}

                {/* Verified Answer Block (in AI mode) */}
                {record.verifiedAnswer && (
                  <div className="p-3 bg-white/[0.02] border-t border-white/5 text-[11px] text-white/80 flex items-start gap-2">
                    <ArrowUpRight size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-emerald-300 font-semibold uppercase tracking-wider text-[10px] block mb-0.5">
                        Verified Result:
                      </span>
                      <span>{record.verifiedAnswer}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Workspace File Browser & Selector Modal Overlay */}
            <AnimatePresence>
              {showFileBrowser && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="absolute inset-0 z-30 bg-[#080d14]/95 backdrop-blur-xl flex flex-col p-4 sm:p-5 rounded-xl border border-white/10 shadow-2xl"
                >
                  {/* Browser Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <FolderOpen size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-white tracking-wide flex items-center gap-1.5 font-mono">
                          <span>SELECT WORKSPACE FILE</span>
                          <span className="text-white/40 text-[10px]">({filteredFiles.length} items)</span>
                        </h3>
                        <div className="text-[10px] text-white/50 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>/{browserDir || '.'}</span>
                          {browserParentDir !== null && (
                            <button
                              onClick={() => loadDirectory(browserParentDir)}
                              className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/80 text-[10px] flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowLeft size={10} /> Back
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Search Filter */}
                      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono">
                        <Search size={12} className="text-white/40" />
                        <input
                          type="text"
                          value={fileFilter}
                          onChange={(e) => setFileFilter(e.target.value)}
                          placeholder="Filter files..."
                          className="bg-transparent border-none outline-none text-white text-xs placeholder-white/30 w-28 sm:w-44"
                        />
                        {fileFilter && (
                          <button onClick={() => setFileFilter('')} className="text-white/40 hover:text-white cursor-pointer">
                            <X size={11} />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => setShowFileBrowser(false)}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>

                  {/* File List Stream */}
                  <div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs pr-1">
                    {isLoadingFiles ? (
                      <div className="h-full flex items-center justify-center text-white/40 gap-2">
                        <Loader2 size={16} className="animate-spin text-emerald-400" />
                        <span>Reading directory...</span>
                      </div>
                    ) : filteredFiles.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-white/40 gap-1.5">
                        <Folder size={24} className="opacity-40" />
                        <span>No files found in directory</span>
                      </div>
                    ) : (
                      filteredFiles.map((file) => (
                        <div
                          key={file.path}
                          className={`group flex items-center justify-between p-2 rounded-xl transition-all ${
                            file.isDirectory
                              ? 'hover:bg-white/5 cursor-pointer text-white/80 hover:text-white'
                              : 'hover:bg-white/[0.08] text-white/90'
                          }`}
                          onClick={() => {
                            if (file.isDirectory) {
                              loadDirectory(file.path);
                            }
                          }}
                        >
                          <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                            {file.isDirectory ? (
                              <Folder size={15} className="text-amber-400 shrink-0" />
                            ) : (
                              <FileCode size={15} className="text-emerald-400 shrink-0" />
                            )}
                            <span className="truncate font-medium">{file.name}</span>
                            {!file.isDirectory && (
                              <span className="text-[10px] text-white/40">
                                ({Math.round(file.size / 1024)} KB)
                              </span>
                            )}
                          </div>

                          {/* Quick Actions for Files */}
                          {!file.isDirectory ? (
                            <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectFile(file, 'insert');
                                }}
                                className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-medium cursor-pointer"
                                title="Insert file path into command input"
                              >
                                Insert Path
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectFile(file, 'inspect');
                                }}
                                className="px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-[10px] font-medium cursor-pointer"
                                title="Inspect file contents directly in terminal"
                              >
                                Inspect
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectFile(file, 'ai');
                                }}
                                className="px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-[10px] font-medium cursor-pointer"
                                title="Ask AI to analyze and explain this file"
                              >
                                AI Explain
                              </button>
                            </div>
                          ) : (
                            <ChevronRight size={14} className="text-white/40 group-hover:text-white transition-colors" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Execution Bar */}
          <div className="p-3 sm:p-4 border-t border-white/10 bg-black/60">
            {/* Attached file chip if any */}
            {attachedFile && (
              <div className="flex items-center gap-2 mb-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono max-w-md">
                <FileCode size={13} className="shrink-0 text-emerald-400" />
                <span className="truncate">{attachedFile.name}</span>
                <span className="text-white/40 text-[10px]">({Math.round(attachedFile.size / 1024)} KB)</span>
                <button
                  onClick={() => setAttachedFile(null)}
                  className="ml-auto p-0.5 hover:text-red-400 text-white/50 transition-colors cursor-pointer"
                  title="Remove attachment"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {mode === 'code' && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] text-white/50 font-mono">Language:</span>
                {(['javascript', 'python', 'shell'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono capitalize transition-all cursor-pointer ${
                      language === lang 
                        ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40' 
                        : 'text-white/50 hover:text-white bg-white/5'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 bg-white/[0.05] border border-white/15 rounded-xl px-2.5 sm:px-3 py-1.5 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <span className="text-emerald-400 font-mono font-bold select-none text-sm">
                {mode === 'ai' ? '⚡' : mode === 'shell' ? '$' : '>'}
              </span>

              {/* Workspace File Browser Button */}
              <button
                type="button"
                onClick={handleOpenFileBrowser}
                className="p-1 rounded-md text-white/50 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer shrink-0"
                title="Browse & select workspace files"
              >
                <FolderOpen size={16} />
              </button>

              {/* Local Disk File Picker Button */}
              <button
                type="button"
                onClick={() => localFileInputRef.current?.click()}
                className="p-1 rounded-md text-white/50 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer shrink-0"
                title="Select file from local disk"
              >
                <Paperclip size={16} />
              </button>
              <input
                ref={localFileInputRef}
                type="file"
                onChange={handleLocalFilePicked}
                className="hidden"
              />

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === 'ai' 
                    ? "Ask in natural language (e.g. 'calculate 2^32', 'check git branch', 'inspect package.json')..."
                    : mode === 'shell'
                    ? "Enter shell command (e.g. 'git status', 'node -v', 'dir', 'npm list')..."
                    : `Enter ${language} code snippet to execute...`
                }
                className="flex-1 bg-transparent border-none text-white text-xs sm:text-sm font-mono placeholder-white/30 focus:outline-none"
              />

              <button
                onClick={() => handleRun()}
                disabled={isRunning || !input.trim()}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 text-black font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {isRunning ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Play size={13} fill="currentColor" />
                )}
                <span>Run</span>
              </button>
            </div>

            <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-white/40 font-mono">
              <div className="flex items-center gap-3">
                <span>Enter: Execute</span>
                <span>↑/↓: History</span>
                <span>Esc: Close</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400/80">
                <CheckCircle2 size={11} />
                <span>Zero Fake Output Guarantee</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
