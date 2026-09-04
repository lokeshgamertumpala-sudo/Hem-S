import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, X, Play, RotateCcw, Copy, Check, Trash2, 
  Maximize2, Minimize2, Cpu, HardDrive, Sparkles, Code2, 
  Folder, FolderOpen, FileCode, CheckCircle2, XCircle, Loader2, 
  ArrowUpRight, Paperclip, Search, ArrowLeft, ChevronRight,
  Plus, Square, Split, ChevronDown, ListFilter, HelpCircle
} from 'lucide-react';

interface AiTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
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

interface TerminalLine {
  id: string;
  type: 'banner' | 'prompt' | 'stdout' | 'stderr' | 'system' | 'ai-plan' | 'divider';
  text: string;
  cwd?: string;
  exitCode?: number;
  durationMs?: number;
  timestamp?: string;
}

interface TerminalTab {
  id: string;
  title: string;
  shell: string;
  shellLabel: string;
  cwd: string;
  lines: TerminalLine[];
  cmdHistory: string[];
  cmdHistoryIndex: number;
  isRunning: boolean;
  activePid?: number;
  currentInput: string;
}

interface AnsiToken {
  text: string;
  classes?: string;
}

// ANSI Escape Code Parser for VS Code Terminal Colors
function parseAnsi(raw: string): AnsiToken[] {
  const ansiRegex = /(?:\u001b|\\x1b|\\u001b)\[([0-9;]*)m/g;
  const tokens: AnsiToken[] = [];
  let lastIndex = 0;
  let currentColor = '';
  let isBold = false;
  let isDim = false;
  let isUnderline = false;

  let match: RegExpExecArray | null;
  while ((match = ansiRegex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        text: raw.substring(lastIndex, match.index),
        classes: `${currentColor} ${isBold ? 'font-bold' : ''} ${isDim ? 'opacity-60' : ''} ${isUnderline ? 'underline' : ''}`.trim()
      });
    }

    const codes = match[1] ? match[1].split(';').map(c => parseInt(c, 10)) : [0];
    for (const code of codes) {
      if (code === 0) {
        currentColor = '';
        isBold = false;
        isDim = false;
        isUnderline = false;
      } else if (code === 1) {
        isBold = true;
      } else if (code === 2) {
        isDim = true;
      } else if (code === 4) {
        isUnderline = true;
      } else if (code === 30) {
        currentColor = 'text-neutral-500';
      } else if (code === 31 || code === 91) {
        currentColor = 'text-red-400';
      } else if (code === 32 || code === 92) {
        currentColor = 'text-emerald-400';
      } else if (code === 33 || code === 93) {
        currentColor = 'text-yellow-400';
      } else if (code === 34 || code === 94) {
        currentColor = 'text-sky-400';
      } else if (code === 35 || code === 95) {
        currentColor = 'text-purple-400';
      } else if (code === 36 || code === 96) {
        currentColor = 'text-cyan-300';
      } else if (code === 37 || code === 97) {
        currentColor = 'text-neutral-200';
      } else if (code === 90) {
        currentColor = 'text-neutral-400';
      }
    }
    lastIndex = ansiRegex.lastIndex;
  }

  if (lastIndex < raw.length) {
    tokens.push({
      text: raw.substring(lastIndex),
      classes: `${currentColor} ${isBold ? 'font-bold' : ''} ${isDim ? 'opacity-60' : ''} ${isUnderline ? 'underline' : ''}`.trim()
    });
  }

  return tokens.length > 0 ? tokens : [{ text: raw }];
}

// Render tokenized ANSI text
function AnsiText({ raw }: { raw: string }) {
  const tokens = useMemo(() => parseAnsi(raw), [raw]);
  return (
    <span className="whitespace-pre-wrap select-text">
      {tokens.map((token, i) => (
        <span key={i} className={token.classes || 'text-neutral-200'}>
          {token.text}
        </span>
      ))}
    </span>
  );
}

export function AiTerminalModal({ isOpen, onClose }: AiTerminalModalProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Tabs state
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [showShellMenu, setShowShellMenu] = useState(false);

  // Autocomplete state
  const [autoSuggestions, setAutoSuggestions] = useState<string[]>([]);
  const [autoSelectedIdx, setAutoSelectedIdx] = useState<number>(-1);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

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
  const runningInputRef = useRef<HTMLInputElement>(null);
  const localFileInputRef = useRef<HTMLInputElement>(null);
  const activeStreamControllerRef = useRef<AbortController | null>(null);
  const [runningInput, setRunningInput] = useState('');

  const activeTab = useMemo(() => {
    return tabs.find(t => t.id === activeTabId) || tabs[0] || null;
  }, [tabs, activeTabId]);

  // Create default tab
  const createTab = useCallback((shellType?: string, label?: string) => {
    const isWin = hostInfo?.platform === 'win32' || navigator.userAgent.includes('Windows');
    const defaultShell = shellType || (isWin ? 'powershell.exe' : '/bin/bash');
    const defaultLabel = label || (isWin ? (defaultShell.includes('powershell') ? 'powershell' : 'cmd') : 'bash');
    const id = `term_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const bannerText = isWin
      ? `Windows PowerShell\nCopyright (C) Microsoft Corporation. All rights reserved.\n\nType 'help' for shortcuts, or 'ai <prompt>' for natural language execution.\n`
      : `Antigravity Shell [${defaultLabel}]\nType 'help' for shortcuts, or 'ai <prompt>' for natural language execution.\n`;

    const initialCwd = hostInfo?.cwd || (isWin ? 'C:\\' : '/');

    const newTab: TerminalTab = {
      id,
      title: `${tabs.length + 1}: ${defaultLabel}`,
      shell: defaultShell,
      shellLabel: defaultLabel,
      cwd: initialCwd,
      lines: [
        {
          id: `banner_${Date.now()}`,
          type: 'banner',
          text: bannerText,
          cwd: initialCwd
        }
      ],
      cmdHistory: [],
      cmdHistoryIndex: -1,
      isRunning: false,
      currentInput: ''
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(id);
    setTimeout(() => inputRef.current?.focus(), 80);
    return id;
  }, [hostInfo, tabs.length]);

  // Fetch host info on mount
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/terminal/info')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setHostInfo(data);
          // If no tabs exist, create initial tab
          setTabs(prev => {
            if (prev.length === 0) {
              const isWin = data.platform === 'win32';
              const shell = isWin ? 'powershell.exe' : (data.shell || '/bin/bash');
              const shellLabel = isWin ? 'powershell' : 'bash';
              return [{
                id: 'term_main',
                title: '1: powershell',
                shell,
                shellLabel,
                cwd: data.cwd,
                lines: [
                  {
                    id: 'banner_init',
                    type: 'banner',
                    text: isWin
                      ? `Windows PowerShell\nCopyright (C) Microsoft Corporation. All rights reserved.\n\nType 'help' for shortcuts, or 'ai <prompt>' for natural language execution.\n`
                      : `Antigravity Shell [bash]\nType 'help' for shortcuts, or 'ai <prompt>' for natural language execution.\n`,
                    cwd: data.cwd
                  }
                ],
                cmdHistory: [],
                cmdHistoryIndex: -1,
                isRunning: false,
                currentInput: ''
              }];
            }
            return prev;
          });
          setActiveTabId('term_main');
        }
      })
      .catch(() => {});

    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  }, [isOpen]);

  // Auto-scroll to bottom on output or tab switch
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeTab?.lines, activeTab?.isRunning, activeTabId]);

  // Kill running process on tab
  const killCurrentProcess = async () => {
    if (!activeTab || !activeTab.isRunning) return;

    if (activeStreamControllerRef.current) {
      activeStreamControllerRef.current.abort();
      activeStreamControllerRef.current = null;
    }

    try {
      await fetch('/api/terminal/kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeTab.id,
          pid: activeTab.activePid
        })
      });
    } catch {}

    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTab.id) {
        return {
          ...tab,
          isRunning: false,
          activePid: undefined,
          lines: [
            ...tab.lines,
            {
              id: `kill_${Date.now()}`,
              type: 'stderr',
              text: '^C\n[Process terminated by user]'
            }
          ]
        };
      }
      return tab;
    }));

    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Close tab
  const closeTab = (tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (tabs.length === 1) {
      // If closing last tab, reset it
      setTabs([{
        id: `term_${Date.now()}`,
        title: '1: powershell',
        shell: hostInfo?.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
        shellLabel: hostInfo?.platform === 'win32' ? 'powershell' : 'bash',
        cwd: hostInfo?.cwd || 'C:\\',
        lines: [
          {
            id: `banner_${Date.now()}`,
            type: 'banner',
            text: `Terminal reset.\n`,
            cwd: hostInfo?.cwd || 'C:\\'
          }
        ],
        cmdHistory: [],
        cmdHistoryIndex: -1,
        isRunning: false,
        currentInput: ''
      }]);
      return;
    }

    const nextTabs = tabs.filter(t => t.id !== tabId);
    setTabs(nextTabs);
    if (activeTabId === tabId) {
      setActiveTabId(nextTabs[0].id);
    }
  };

  // Format prompt string
  const getPromptPrefix = (tab: TerminalTab) => {
    const isWin = hostInfo?.platform === 'win32' || tab.cwd.includes('\\');
    if (tab.shellLabel === 'powershell') {
      return `PS ${tab.cwd}> `;
    } else if (tab.shellLabel === 'cmd') {
      return `${tab.cwd}> `;
    } else if (tab.shellLabel === 'node') {
      return `node> `;
    } else if (tab.shellLabel === 'ai') {
      const short = tab.cwd.split(/[\\/]/).pop() || 'workspace';
      return `⚡ ai (${short})> `;
    }
    const shortCwd = tab.cwd.replace(hostInfo?.username ? `/home/${hostInfo.username}` : '', '~');
    return `${hostInfo?.username || 'user'}@${hostInfo?.hostname || 'host'}:${shortCwd}$ `;
  };

  // Autocomplete fetcher
  const handleTabCompletion = async () => {
    if (!activeTab || activeTab.isRunning) return;
    const inputVal = activeTab.currentInput;
    if (!inputVal.trim()) return;

    // Get last word
    const words = inputVal.split(' ');
    const lastWord = words[words.length - 1];

    try {
      const res = await fetch(
        `/api/terminal/autocomplete?dir=${encodeURIComponent(activeTab.cwd)}&prefix=${encodeURIComponent(lastWord)}`
      );
      const data = await res.json();
      const matches: { name: string; isDirectory: boolean }[] = data.matches || [];

      if (matches.length === 1) {
        // Single match: complete directly
        const completed = matches[0].name;
        words[words.length - 1] = completed.includes(' ') ? `"${completed}"` : completed;
        const newInput = words.join(' ');
        setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, currentInput: newInput } : t));
        setShowAutocomplete(false);
      } else if (matches.length > 1) {
        // Multiple matches: show dropdown popup
        setAutoSuggestions(matches.map(m => m.name));
        setAutoSelectedIdx(0);
        setShowAutocomplete(true);
      } else {
        setShowAutocomplete(false);
      }
    } catch {
      setShowAutocomplete(false);
    }
  };

  const applyAutocomplete = (selected: string) => {
    if (!activeTab) return;
    const words = activeTab.currentInput.split(' ');
    words[words.length - 1] = selected.includes(' ') ? `"${selected}"` : selected;
    const newInput = words.join(' ');
    setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, currentInput: newInput } : t));
    setShowAutocomplete(false);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  // Main Command Execution via Streaming SSE
  const executeCommand = async (rawCommand: string) => {
    if (!activeTab || activeTab.isRunning) return;
    const trimmed = rawCommand.trim();
    if (!trimmed) return;

    setShowAutocomplete(false);

    // Built-in commands: clear / cls
    if (trimmed.toLowerCase() === 'clear' || trimmed.toLowerCase() === 'cls') {
      setTabs(prev => prev.map(t => {
        if (t.id === activeTab.id) {
          return {
            ...t,
            lines: [],
            cmdHistory: [...t.cmdHistory, trimmed],
            cmdHistoryIndex: -1,
            currentInput: ''
          };
        }
        return t;
      }));
      return;
    }

    // Built-in command: exit
    if (trimmed.toLowerCase() === 'exit') {
      closeTab(activeTab.id);
      return;
    }

    // Built-in command: help
    if (trimmed.toLowerCase() === 'help') {
      const helpText = 
`Antigravity VS Code Terminal — Built-in Reference:
  clear, cls, Ctrl+L   : Clear console buffer
  Ctrl+C               : Terminate running process or cancel input
  Tab                  : Autocomplete files and directories
  Up / Down            : Navigate command history
  cd <dir>             : Change directory (persists across commands)
  ai <prompt>          : Natural language AI command planner
  exit                 : Close current terminal tab
`;
      setTabs(prev => prev.map(t => {
        if (t.id === activeTab.id) {
          return {
            ...t,
            lines: [
              ...t.lines,
              { id: `prompt_${Date.now()}`, type: 'prompt', text: `${getPromptPrefix(t)}${trimmed}`, cwd: t.cwd },
              { id: `help_${Date.now()}`, type: 'stdout', text: helpText }
            ],
            cmdHistory: [...t.cmdHistory, trimmed],
            cmdHistoryIndex: -1,
            currentInput: ''
          };
        }
        return t;
      }));
      return;
    }

    // AI Command Check (prefix 'ai ' or AI tab)
    let actualCommand = trimmed;
    let isAi = false;
    let aiPlanExplanation = '';

    if (trimmed.toLowerCase().startsWith('ai ') || activeTab.shellLabel === 'ai') {
      isAi = true;
      const promptQuery = trimmed.toLowerCase().startsWith('ai ') ? trimmed.slice(3).trim() : trimmed;
      try {
        const planRes = await fetch('/api/terminal/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptQuery })
        });
        const planData = await planRes.json();
        actualCommand = planData.command || promptQuery;
        aiPlanExplanation = planData.plan || `Execute: ${actualCommand}`;
      } catch {
        actualCommand = promptQuery;
      }
    }

    const currentTabId = activeTab.id;
    const promptPrefix = getPromptPrefix(activeTab);
    const linePromptId = `prompt_${Date.now()}`;
    const outputLineId = `out_${Date.now()}`;

    // Append prompt line and initialize running state
    setTabs(prev => prev.map(t => {
      if (t.id === currentTabId) {
        const initialLines: TerminalLine[] = [
          ...t.lines,
          {
            id: linePromptId,
            type: 'prompt',
            text: `${promptPrefix}${trimmed}`,
            cwd: t.cwd
          }
        ];

        if (isAi && aiPlanExplanation) {
          initialLines.push({
            id: `plan_${Date.now()}`,
            type: 'ai-plan',
            text: `⚡ AI Plan: ${aiPlanExplanation}\n$ ${actualCommand}`
          });
        }

        initialLines.push({
          id: outputLineId,
          type: 'stdout',
          text: ''
        });

        return {
          ...t,
          lines: initialLines,
          cmdHistory: [...t.cmdHistory, trimmed],
          cmdHistoryIndex: -1,
          isRunning: true,
          currentInput: ''
        };
      }
      return t;
    }));

    const abortController = new AbortController();
    activeStreamControllerRef.current = abortController;

    try {
      const response = await fetch('/api/terminal/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentTabId,
          command: actualCommand,
          shell: activeTab.shell
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to start execution');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine.startsWith(':')) continue;
          if (trimmedLine === 'data: [DONE]') continue;

          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6));

              if (data.type === 'start') {
                setTabs(prev => prev.map(t => {
                  if (t.id === currentTabId) {
                    return { ...t, activePid: data.pid, cwd: data.cwd || t.cwd };
                  }
                  return t;
                }));
              } else if (data.type === 'stdout' || data.type === 'stderr') {
                setTabs(prev => prev.map(t => {
                  if (t.id === currentTabId) {
                    return {
                      ...t,
                      lines: t.lines.map(l => {
                        if (l.id === outputLineId) {
                          return { ...l, text: l.text + data.text };
                        }
                        return l;
                      })
                    };
                  }
                  return t;
                }));
              } else if (data.type === 'exit') {
                setTabs(prev => prev.map(t => {
                  if (t.id === currentTabId) {
                    return {
                      ...t,
                      cwd: data.cwd || t.cwd,
                      isRunning: false,
                      activePid: undefined,
                      lines: t.lines.map(l => {
                        if (l.id === outputLineId) {
                          return {
                            ...l,
                            exitCode: data.code,
                            durationMs: data.durationMs
                          };
                        }
                        return l;
                      })
                    };
                  }
                  return t;
                }));
              }
            } catch (e) {
              console.error('SSE JSON parse error:', e);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setTabs(prev => prev.map(t => {
          if (t.id === currentTabId) {
            return {
              ...t,
              isRunning: false,
              activePid: undefined,
              lines: [
                ...t.lines,
                {
                  id: `err_${Date.now()}`,
                  type: 'stderr',
                  text: `Execution error: ${err.message || 'Stream connection failed'}`
                }
              ]
            };
          }
          return t;
        }));
      }
    } finally {
      activeStreamControllerRef.current = null;
      setTabs(prev => prev.map(t => {
        if (t.id === currentTabId) {
          return { ...t, isRunning: false, activePid: undefined };
        }
        return t;
      }));
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Keyboard handler for sending stdin to active running process
  const handleRunningInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      killCurrentProcess();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const toSend = runningInput;
      setRunningInput('');

      if (activeTab) {
        setTabs(prev => prev.map(t => {
          if (t.id === activeTab.id) {
            return {
              ...t,
              lines: [
                ...t.lines,
                { id: `stdin_${Date.now()}`, type: 'stdout', text: `${toSend}\n` }
              ]
            };
          }
          return t;
        }));

        try {
          await fetch('/api/terminal/input', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: activeTab.id,
              input: toSend
            })
          });
        } catch (err) {
          console.error('Failed to send input:', err);
        }
      }
    }
  };

  // Keyboard handler for prompt input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!activeTab) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (showAutocomplete && autoSuggestions.length > 0 && autoSelectedIdx >= 0) {
        applyAutocomplete(autoSuggestions[autoSelectedIdx]);
      } else {
        executeCommand(activeTab.currentInput);
      }
    } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      if (activeTab.isRunning) {
        e.preventDefault();
        killCurrentProcess();
      } else if (activeTab.currentInput) {
        e.preventDefault();
        // Cancel current input line like real terminal
        setTabs(prev => prev.map(t => {
          if (t.id === activeTab.id) {
            return {
              ...t,
              lines: [
                ...t.lines,
                { id: `c_${Date.now()}`, type: 'prompt', text: `${getPromptPrefix(t)}${t.currentInput}^C` }
              ],
              currentInput: ''
            };
          }
          return t;
        }));
      }
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      // Ctrl+L to clear screen
      e.preventDefault();
      setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, lines: [] } : t));
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (showAutocomplete && autoSuggestions.length > 0) {
        const nextIdx = (autoSelectedIdx + 1) % autoSuggestions.length;
        setAutoSelectedIdx(nextIdx);
      } else {
        handleTabCompletion();
      }
    } else if (e.key === 'Escape') {
      if (showAutocomplete) {
        setShowAutocomplete(false);
      } else if (showFileBrowser) {
        setShowFileBrowser(false);
      } else {
        onClose();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showAutocomplete && autoSuggestions.length > 0) {
        setAutoSelectedIdx(prev => (prev <= 0 ? autoSuggestions.length - 1 : prev - 1));
      } else {
        if (activeTab.cmdHistory.length === 0) return;
        const nextIdx = activeTab.cmdHistoryIndex === -1 
          ? activeTab.cmdHistory.length - 1 
          : Math.max(0, activeTab.cmdHistoryIndex - 1);
        setTabs(prev => prev.map(t => {
          if (t.id === activeTab.id) {
            return {
              ...t,
              cmdHistoryIndex: nextIdx,
              currentInput: t.cmdHistory[nextIdx] || ''
            };
          }
          return t;
        }));
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showAutocomplete && autoSuggestions.length > 0) {
        setAutoSelectedIdx(prev => (prev >= autoSuggestions.length - 1 ? 0 : prev + 1));
      } else {
        if (activeTab.cmdHistoryIndex === -1) return;
        const nextIdx = activeTab.cmdHistoryIndex + 1;
        if (nextIdx >= activeTab.cmdHistory.length) {
          setTabs(prev => prev.map(t => {
            if (t.id === activeTab.id) {
              return { ...t, cmdHistoryIndex: -1, currentInput: '' };
            }
            return t;
          }));
        } else {
          setTabs(prev => prev.map(t => {
            if (t.id === activeTab.id) {
              return { ...t, cmdHistoryIndex: nextIdx, currentInput: t.cmdHistory[nextIdx] || '' };
            }
            return t;
          }));
        }
      }
    }
  };

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
    if (!activeTab) return;

    if (action === 'insert') {
      const pathQuoted = file.path.includes(' ') ? `"${file.path}"` : file.path;
      setTabs(prev => prev.map(t => {
        if (t.id === activeTab.id) {
          const updated = t.currentInput ? `${t.currentInput} ${pathQuoted}` : pathQuoted;
          return { ...t, currentInput: updated };
        }
        return t;
      }));
      setTimeout(() => inputRef.current?.focus(), 50);
    } else if (action === 'inspect') {
      const inspectCmd = hostInfo?.platform === 'win32'
        ? `Get-Content "${file.path}" -TotalCount 80`
        : `cat "${file.path}" | head -n 80`;
      executeCommand(inspectCmd);
    } else if (action === 'ai') {
      executeCommand(`ai inspect and explain ${file.path}`);
    }
  };

  const handleLocalFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeTab) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setAttachedFile({ name: file.name, content, size: file.size });
      setTabs(prev => prev.map(t => {
        if (t.id === activeTab.id) {
          const updated = t.currentInput ? `${t.currentInput} "${file.name}"` : `"${file.name}"`;
          return { ...t, currentInput: updated };
        }
        return t;
      }));
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    reader.readAsText(file);
    if (localFileInputRef.current) localFileInputRef.current.value = '';
  };

  // Copy full console output
  const copyAllOutput = () => {
    if (!activeTab) return;
    const allText = activeTab.lines
      .map(l => l.text)
      .join('\n')
      .replace(/(?:\u001b|\\x1b|\\u001b)\[[0-9;]*m/g, '');
    navigator.clipboard.writeText(allText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const filteredFiles = useMemo(() => {
    const q = fileFilter.toLowerCase().trim();
    if (!q) return projectFiles;
    return projectFiles.filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));
  }, [projectFiles, fileFilter]);

  if (!isOpen) return null;

  const quickActions = [
    { label: 'git status', cmd: 'git status --short --branch' },
    { label: 'dir / ls', cmd: hostInfo?.platform === 'win32' ? 'dir' : 'ls -la' },
    { label: 'node -v', cmd: 'node -v' },
    { label: 'npm test', cmd: 'npm test' },
    { label: 'system specs', cmd: 'ai system specs' },
    { label: '📁 Select File', action: handleOpenFileBrowser }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 md:p-6 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* VS Code Terminal Window */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className={`relative z-10 w-full flex flex-col bg-[#181818] border border-[#2d2d2d] rounded-xl shadow-2xl overflow-hidden font-mono text-xs transition-all duration-200 ${
            isMaximized ? 'h-[96vh] max-w-[98vw]' : 'h-[85vh] max-h-[820px] max-w-5xl'
          }`}
        >
          {/* Top Panel: VS Code Terminal Header & Tabs */}
          <div className="flex items-center justify-between bg-[#252526] border-b border-[#333333] px-2 py-1.5 shrink-0 select-none">
            {/* Left: Terminal Tab Bar */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pr-2">
              <div className="flex items-center gap-1.5 px-2 py-1 text-white/50 text-[11px] font-semibold tracking-wider uppercase">
                <Terminal size={14} className="text-emerald-400" />
                <span>TERMINAL</span>
              </div>

              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                  <div
                    key={tab.id}
                    onClick={() => {
                      setActiveTabId(tab.id);
                      setTimeout(() => inputRef.current?.focus(), 40);
                    }}
                    className={`group flex items-center gap-1.5 px-2.5 py-1 rounded cursor-pointer transition-all border text-xs font-mono select-none ${
                      isActive
                        ? 'bg-[#1e1e1e] text-white border-[#3c3c3c] shadow-sm'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2d2e] border-transparent'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${tab.isRunning ? 'bg-amber-400 animate-pulse' : isActive ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                    <span className="truncate max-w-[120px] sm:max-w-[160px] font-medium">
                      {tab.title}
                    </span>
                    <button
                      onClick={(e) => closeTab(tab.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-700 hover:text-white transition-opacity text-neutral-400 cursor-pointer ml-1"
                      title="Kill / Close Terminal"
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              })}

              {/* Plus Button: New Terminal Tab Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowShellMenu(prev => !prev)}
                  className="p-1 rounded hover:bg-[#333333] text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center gap-0.5"
                  title="New Terminal (PowerShell / Bash / CMD / Node / AI)"
                >
                  <Plus size={14} />
                  <ChevronDown size={10} className="opacity-60" />
                </button>

                {showShellMenu && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl py-1 z-50 text-xs font-mono text-neutral-200">
                    <button
                      onClick={() => {
                        createTab('powershell.exe', 'powershell');
                        setShowShellMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <Terminal size={13} className="text-sky-400" />
                      <span>PowerShell</span>
                    </button>
                    <button
                      onClick={() => {
                        createTab('cmd.exe', 'cmd');
                        setShowShellMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <Terminal size={13} className="text-amber-400" />
                      <span>Command Prompt</span>
                    </button>
                    <button
                      onClick={() => {
                        createTab('node', 'node');
                        setShowShellMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <Code2 size={13} className="text-emerald-400" />
                      <span>Node.js REPL</span>
                    </button>
                    <button
                      onClick={() => {
                        createTab('powershell.exe', 'ai');
                        setShowShellMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#094771] hover:text-white flex items-center gap-2 cursor-pointer border-t border-[#333333]"
                    >
                      <Sparkles size={13} className="text-purple-400" />
                      <span>AI Copilot Terminal</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: VS Code Terminal Toolbar Actions */}
            <div className="flex items-center gap-1 shrink-0 text-neutral-300">
              {/* Kill Process / Stop button when running */}
              {activeTab?.isRunning && (
                <button
                  onClick={killCurrentProcess}
                  className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer animate-pulse"
                  title="Terminate running process (Ctrl+C)"
                >
                  <Square size={11} fill="currentColor" />
                  <span>Stop</span>
                </button>
              )}

              {/* Clear Console Buffer */}
              <button
                onClick={() => {
                  if (activeTab) {
                    setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, lines: [] } : t));
                  }
                }}
                className="p-1.5 rounded hover:bg-[#333333] hover:text-white transition-colors cursor-pointer"
                title="Clear Terminal Buffer (Ctrl+L / cls)"
              >
                <Trash2 size={13} />
              </button>

              {/* Workspace File Browser */}
              <button
                onClick={handleOpenFileBrowser}
                className="p-1.5 rounded hover:bg-[#333333] hover:text-white transition-colors cursor-pointer"
                title="Select Workspace Files"
              >
                <FolderOpen size={13} />
              </button>

              {/* Copy Full Output */}
              <button
                onClick={copyAllOutput}
                className="p-1.5 rounded hover:bg-[#333333] hover:text-white transition-colors cursor-pointer"
                title="Copy Terminal Output"
              >
                {copiedText ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>

              {/* Maximize / Restore */}
              <button
                onClick={() => setIsMaximized(prev => !prev)}
                className="p-1.5 rounded hover:bg-[#333333] hover:text-white transition-colors cursor-pointer"
                title={isMaximized ? "Restore" : "Maximize Panel Size"}
              >
                {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-1.5 rounded hover:bg-red-600/80 hover:text-white transition-colors cursor-pointer ml-0.5"
                title="Close Terminal (Esc)"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Quick Action Chips Bar */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#1e1e1e] border-b border-[#2d2d2d] overflow-x-auto scrollbar-none shrink-0 select-none">
            <span className="text-[10px] uppercase font-semibold text-neutral-500 mr-1">Quick:</span>
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  if (action.action) {
                    action.action();
                  } else if (action.cmd) {
                    executeCommand(action.cmd);
                  }
                }}
                disabled={activeTab?.isRunning}
                className="px-2 py-0.5 rounded bg-[#252526] hover:bg-[#323233] text-neutral-300 hover:text-white border border-[#3c3c3c] text-[10px] transition-all cursor-pointer whitespace-nowrap disabled:opacity-40"
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Main Terminal Viewport / Screen Buffer */}
          <div
            ref={scrollRef}
            onClick={() => inputRef.current?.focus()}
            className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#181818] font-mono text-[12.5px] leading-relaxed select-text cursor-text relative"
            style={{ fontFamily: "Consolas, 'Cascadia Code', 'Courier New', Menlo, monospace" }}
          >
            {/* Terminal Lines Stream */}
            {activeTab?.lines.map((line) => {
              if (line.type === 'banner') {
                return (
                  <div key={line.id} className="text-neutral-400 pb-2 whitespace-pre-wrap select-text">
                    {line.text}
                  </div>
                );
              }

              if (line.type === 'prompt') {
                return (
                  <div key={line.id} className="pt-1.5 flex items-start gap-1 font-semibold select-text">
                    <span className="text-emerald-400 shrink-0 select-none">
                      {line.text.slice(0, line.text.lastIndexOf(' ') + 1)}
                    </span>
                    <span className="text-white break-all">
                      {line.text.slice(line.text.lastIndexOf(' ') + 1)}
                    </span>
                  </div>
                );
              }

              if (line.type === 'ai-plan') {
                return (
                  <div key={line.id} className="my-1.5 px-3 py-1.5 rounded bg-purple-950/20 border border-purple-500/30 text-purple-300 text-xs flex items-start gap-2 select-text">
                    <Sparkles size={13} className="shrink-0 text-purple-400 mt-0.5" />
                    <div className="whitespace-pre-wrap">{line.text}</div>
                  </div>
                );
              }

              return (
                <div key={line.id} className="pt-0.5 select-text">
                  <AnsiText raw={line.text} />
                  {typeof line.exitCode === 'number' && line.exitCode !== 0 && (
                    <span className="inline-block ml-2 px-1.5 py-0.2 rounded bg-red-950/40 border border-red-500/30 text-red-300 text-[10px] select-none">
                      Exit {line.exitCode}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Active Live Input Prompt Line */}
            {activeTab && (
              <div className="flex items-center gap-1.5 pt-1.5 relative">
                {/* Prompt path prefix */}
                <span className="text-emerald-400 font-semibold shrink-0 select-none">
                  {getPromptPrefix(activeTab)}
                </span>

                {/* Input / Running State */}
                {activeTab.isRunning ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin text-amber-400 shrink-0 select-none" />
                    <input
                      ref={runningInputRef}
                      type="text"
                      value={runningInput}
                      onChange={(e) => setRunningInput(e.target.value)}
                      onKeyDown={handleRunningInputKeyDown}
                      placeholder="Type interactive input (e.g. y/n, answer)... or press Ctrl+C to Stop"
                      className="flex-1 bg-transparent border-none outline-none text-white font-mono text-[12.5px] p-0 placeholder-neutral-500 caret-emerald-400 selection:bg-[#264f78]"
                      autoFocus
                      spellCheck={false}
                      autoComplete="off"
                    />
                    <button
                      onClick={killCurrentProcess}
                      className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-[10px] cursor-pointer shrink-0 select-none"
                      title="Terminate running process (Ctrl+C)"
                    >
                      Stop (Ctrl+C)
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={activeTab.currentInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, currentInput: val } : t));
                        setShowAutocomplete(false);
                      }}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-transparent border-none outline-none text-white font-mono text-[12.5px] p-0 caret-emerald-400 selection:bg-[#264f78]"
                      autoFocus
                      spellCheck={false}
                      autoComplete="off"
                    />

                    {/* Autocomplete Suggestions Popup */}
                    {showAutocomplete && autoSuggestions.length > 0 && (
                      <div className="absolute left-0 bottom-full mb-1 w-64 max-h-48 overflow-y-auto bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl py-1 z-50 text-xs font-mono select-none">
                        <div className="px-2 py-0.5 text-[10px] text-neutral-400 uppercase tracking-wider border-b border-[#333333]">
                          Tab completions ({autoSuggestions.length})
                        </div>
                        {autoSuggestions.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => applyAutocomplete(item)}
                            className={`px-3 py-1 cursor-pointer truncate flex items-center justify-between ${
                              idx === autoSelectedIdx ? 'bg-[#094771] text-white' : 'text-neutral-300 hover:bg-[#2a2d2e]'
                            }`}
                          >
                            <span>{item}</span>
                            {item.endsWith('/') && <span className="text-[10px] opacity-60">dir</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Bar: Interactive Helper & File Attachment */}
          <div className="px-3 py-1.5 bg-[#1f1f1f] border-t border-[#2d2d2d] flex items-center justify-between text-[11px] font-mono text-neutral-400 shrink-0 select-none">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-emerald-400 font-bold">Enter</span>
                <span>Run</span>
              </div>
              <span className="text-neutral-600">•</span>
              <div className="flex items-center gap-1">
                <span className="text-neutral-300 font-semibold">Tab</span>
                <span>Autocomplete</span>
              </div>
              <span className="text-neutral-600">•</span>
              <div className="flex items-center gap-1">
                <span className="text-neutral-300 font-semibold">Ctrl+C</span>
                <span>Kill</span>
              </div>
              <span className="text-neutral-600">•</span>
              <div className="flex items-center gap-1">
                <span className="text-neutral-300 font-semibold">Ctrl+L</span>
                <span>Clear</span>
              </div>
            </div>

            {/* Status & Local Disk File Picker Trigger */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => localFileInputRef.current?.click()}
                className="p-1 rounded hover:bg-[#333333] text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1"
                title="Attach local disk file to command"
              >
                <Paperclip size={12} />
                <span className="text-[10px]">Attach File</span>
              </button>
              <input
                ref={localFileInputRef}
                type="file"
                onChange={handleLocalFilePicked}
                className="hidden"
              />

              <span className="text-neutral-600">•</span>
              <span className="text-emerald-400 flex items-center gap-1 text-[10.5px]">
                <CheckCircle2 size={11} />
                <span>VS Code Terminal 2.0</span>
              </span>
            </div>
          </div>

          {/* Project File Selector Overlay */}
          <AnimatePresence>
            {showFileBrowser && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="absolute inset-0 z-40 bg-[#181818]/95 backdrop-blur-md flex flex-col p-4 sm:p-5 select-none"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#333333] mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <FolderOpen size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-white tracking-wide flex items-center gap-1.5 font-mono">
                        <span>WORKSPACE FILE EXPLORER</span>
                        <span className="text-neutral-400 text-[10px]">({filteredFiles.length} items)</span>
                      </h3>
                      <div className="text-[10px] text-neutral-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <span className="text-emerald-400">/{browserDir || '.'}</span>
                        {browserParentDir !== null && (
                          <button
                            onClick={() => loadDirectory(browserParentDir)}
                            className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <ArrowLeft size={10} /> Back
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Search filter */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono">
                      <Search size={12} className="text-white/40" />
                      <input
                        type="text"
                        value={fileFilter}
                        onChange={(e) => setFileFilter(e.target.value)}
                        placeholder="Filter files..."
                        className="bg-transparent border-none outline-none text-white text-xs placeholder-white/30 w-32 sm:w-48"
                        autoFocus
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

                {/* Directory Contents */}
                <div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs pr-1">
                  {isLoadingFiles ? (
                    <div className="h-full flex items-center justify-center text-white/40 gap-2">
                      <Loader2 size={16} className="animate-spin text-emerald-400" />
                      <span>Reading workspace directory...</span>
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
                        className={`group flex items-center justify-between p-2 rounded-lg transition-all ${
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
                              title="Insert file path into prompt"
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
