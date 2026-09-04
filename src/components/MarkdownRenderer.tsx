import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy, Play, Terminal, ExternalLink, RotateCw, Globe, Compass } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer = React.memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const { mode, isVibe } = useTheme();
  const isSwamp = mode === "swamp";
  // Auto-close incomplete code blocks during streaming and stitch adjacent fences seamlessly
  const processedContent = useMemo(() => {
    let text = content || "";
    if (!text) return "";

    // 1. Transform completed terminal results into custom code fences:
    text = text.replace(
      /<terminal_result\s+command=["']([^"']*)["']\s+exit_code=["']([^"']*)["'](?:\s+duration_ms=["']([^"']*)["'])?>([\s\S]*?)<\/terminal_result>/gi,
      (_m, cmd, exitCode, dur, output) => {
        return `\n\`\`\`ai-terminal-result\n__CMD__:${cmd}\n__EXIT__:${exitCode}\n__DUR__:${dur || "0"}\n${output.trim()}\n\`\`\`\n`;
      }
    );

    // 2. Transform in-flight/standalone <terminal> commands into custom code fences:
    text = text.replace(
      /<terminal>([\s\S]*?)<\/terminal>/gi,
      (_m, cmd) => {
        return `\n\`\`\`ai-terminal-exec\n__CMD__:${encodeURIComponent(cmd.trim())}\n\`\`\`\n`;
      }
    );

    // 3. Transform web search results:
    text = text.replace(
      /<web_search_result\s+query=["']([^"']*)["']>([\s\S]*?)<\/web_search_result>/gi,
      (_m, query, results) => {
        return `\n\`\`\`ai-web-search-result\n__QUERY__:${query}\n${results.trim()}\n\`\`\`\n`;
      }
    );

    // 4. Transform site fetch results:
    text = text.replace(
      /<fetch_site_result\s+url=["']([^"']*)["'](?:\s+title=["']([^"']*)["'])?>([\s\S]*?)<\/fetch_site_result>/gi,
      (_m, url, title, body) => {
        return `\n\`\`\`ai-fetch-site-result\n__URL__:${url}\n__TITLE__:${title || ""}\n${body.trim()}\n\`\`\`\n`;
      }
    );

    // 5. Normalize duplicate adjoining code fence seams from multi-pass continuations
    text = text.replace(/```\s*\n\s*```[a-zA-Z0-9_-]*\s*\n/g, '\n');

    // 6. Fix broken markdown image syntax where models insert newlines or spaces:
    text = text.replace(/!\[([^\]]*)\]\s*[\r\n]+\s*\(([^\s\)]+)\)/g, '![$1]($2)');
    text = text.replace(/!\[([^\]]*)\]\s+\(([^\s\)]+)\)/g, '![$1]($2)');

    // 7. Fix escaped backslashes in image URLs: e.g. \%20 or \( or \)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
      const cleanUrl = url.trim().replace(/\\(%20|%|\(|\))/g, '$1').replace(/\s+/g, '%20');
      return `![${alt}](${cleanUrl})`;
    });

    // 8. Automatically route pollinations URLs through local resilient /api/image queue to prevent concurrent 429s
    text = text.replace(/!\[([^\]]*)\]\((https?:\/\/image\.pollinations\.ai\/prompt\/([^?)]+)(\?[^)]*)?)\)/g, (match, alt, fullUrl, rawPrompt, query) => {
      return `![${alt}](/api/image?prompt=${rawPrompt}${query ? query.replace('?', '&') : ''})`;
    });

    const codeBlockCount = (text.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      text += '\n```';
    }
    return text;
  }, [content]);

  return (
    <div className={`markdown-body font-sans text-[13px] leading-relaxed break-words w-full space-y-4 will-change-auto transition-colors duration-300 ${isVibe ? "text-[#fdf4ff] [text-shadow:0_0_8px_rgba(236,72,153,0.7),0_0_16px_rgba(236,72,153,0.3)]" : isSwamp ? "text-[var(--text-swamp)]" : "text-[var(--text-primary)]/90"}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-([a-zA-Z0-9_\-]+)/.exec(className || '');
            const language = match ? match[1] : 'text';
            const codeString = String(children).replace(/\n$/, '');

            if (language === 'ai-terminal-result') {
              return <AiTerminalResultCard rawContent={codeString} />;
            }
            if (language === 'ai-terminal-exec') {
              return <AiTerminalExecCard rawContent={codeString} />;
            }
            if (language === 'ai-web-search-result') {
              return <AiWebSearchCard rawContent={codeString} />;
            }
            if (language === 'ai-fetch-site-result') {
              return <AiFetchSiteCard rawContent={codeString} />;
            }
            
            const isBlock = match || String(children).includes('\n');

            if (isBlock) {
              return (
                <CodeBlock code={codeString} language={language} />
              );
            }
            return (
              <code className={`bg-[var(--text-primary)]/10 rounded px-1.5 py-0.5 font-mono text-[11px] transition-colors duration-300 ${isVibe ? "text-[#fae8ff] [text-shadow:0_0_8px_rgba(236,72,153,0.6)]" : isSwamp ? "text-[var(--text-swamp)]" : "text-[var(--text-primary)]"}`} {...props}>
                {children}
              </code>
            );
          },
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          a: ({ children, href }) => {
            const isWebLink = href && (href.startsWith('http://') || href.startsWith('https://'));
            const handleClick = (e: React.MouseEvent) => {
              if (isWebLink) {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('open-site-preview', { detail: { url: href } }));
              }
            };
            return (
              <a
                href={href}
                onClick={handleClick}
                className="inline-flex items-center gap-1 text-[var(--accent-primary)] hover:underline transition-colors duration-300 font-medium cursor-pointer"
                target="_blank"
                rel="noreferrer"
                title={isWebLink ? `Open & preview ${href}` : undefined}
              >
                <span>{children}</span>
                {isWebLink && <ExternalLink size={11} className="inline opacity-70 shrink-0 ml-0.5" />}
              </a>
            );
          },
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
          h1: ({ children }) => <h1 className={`text-lg font-semibold mb-3 mt-5 transition-colors duration-300 ${isVibe ? "text-[#fdf4ff] [text-shadow:0_0_10px_rgba(236,72,153,0.7)]" : isSwamp ? "text-[var(--text-swamp)]" : "text-[var(--text-primary)]"}`}>{children}</h1>,
          h2: ({ children }) => <h2 className={`text-base font-semibold mb-2 mt-4 transition-colors duration-300 ${isVibe ? "text-[#fdf4ff] [text-shadow:0_0_10px_rgba(236,72,153,0.7)]" : isSwamp ? "text-[var(--text-swamp)]" : "text-[var(--text-primary)]"}`}>{children}</h2>,
          h3: ({ children }) => <h3 className={`text-sm font-medium mb-2 mt-4 transition-colors duration-300 ${isVibe ? "text-[#fdf4ff] [text-shadow:0_0_10px_rgba(236,72,153,0.7)]" : isSwamp ? "text-[var(--text-swamp)]" : "text-[var(--text-primary)]"}`}>{children}</h3>,
          img: ({ src, alt }) => <GeneratedImage src={src} alt={alt} />,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});

function resolveEffectiveImageUrl(rawSrc: string): string {
  if (!rawSrc) return "";
  let url = rawSrc.trim();

  // If opening via file:/// or an isolated webview origin, prepend http://localhost:3000 to relative /api/ paths
  if (url.startsWith("/api/")) {
    const isFile = typeof window !== "undefined" && (window.location.protocol === "file:" || !window.location.origin || window.location.origin === "null");
    const origin = isFile ? "http://localhost:3000" : "";
    return `${origin}${url}`;
  }

  // Rewrite direct pollinations to local /api/image to use serialized queue
  if (url.includes("image.pollinations.ai/prompt/")) {
    const promptMatch = url.match(/prompt\/([^?&]+)/);
    const rawPrompt = promptMatch ? promptMatch[1] : "";
    const isFile = typeof window !== "undefined" && (window.location.protocol === "file:" || !window.location.origin || window.location.origin === "null");
    const origin = isFile ? "http://localhost:3000" : "";
    return `${origin}/api/image?prompt=${rawPrompt}`;
  }

  return url;
}

const GeneratedImage = React.memo(function GeneratedImage({ src, alt }: { src?: string; alt?: string }) {
  const initialUrl = useMemo(() => resolveEffectiveImageUrl(src || ""), [src]);
  const [currentSrc, setCurrentSrc] = useState<string>(initialUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryStage, setRetryStage] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    const nextUrl = resolveEffectiveImageUrl(src || "");
    setCurrentSrc(nextUrl);
    setIsLoading(true);
    setHasError(false);
    setRetryStage(0);
    setSecondsElapsed(0);
  }, [src, alt]);

  // Live timer while diffusion generates
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setSecondsElapsed(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleError = () => {
    if (retryStage === 0) {
      setRetryStage(1);
      const prompt = encodeURIComponent((alt || "photorealistic visual render").replace(/[^\w\s]/g, ""));
      const isFile = typeof window !== "undefined" && (window.location.protocol === "file:" || !window.location.origin || window.location.origin === "null");
      const origin = isFile ? "http://localhost:3000" : "";
      setCurrentSrc(`${origin}/api/image?prompt=${prompt}&model=turbo&seed=${Math.floor(Math.random() * 100000)}`);
      return;
    }

    setIsLoading(false);
    setHasError(true);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  return (
    <div className="my-3.5 relative group max-w-full rounded-2xl overflow-hidden border border-white/15 bg-black/40 shadow-xl inline-block">
      {/* Loading Skeleton with live diffusion timer */}
      {isLoading && (
        <div className="w-full min-h-[220px] sm:min-h-[280px] min-w-[280px] sm:min-w-[360px] bg-white/[0.03] flex flex-col items-center justify-center p-6 gap-2.5 text-xs font-mono text-[var(--accent-primary)]">
          <div className="w-7 h-7 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin" />
          <span className="tracking-wide font-medium">
            Synthesizing real AI render with FLUX.1... ({secondsElapsed}s)
          </span>
          <span className="text-[10.5px] text-[var(--text-muted)] font-sans">
            Computing diffusion steps & photorealism
          </span>
        </div>
      )}

      {/* Image tag kept mounted in layout */}
      <img
        src={currentSrc}
        alt={alt || "Generated visual"}
        onLoad={handleLoad}
        onError={handleError}
        className={`max-h-[500px] w-auto max-w-full rounded-2xl object-contain transition-all duration-500 group-hover:scale-[1.01] ${
          isLoading ? 'opacity-0 absolute inset-0 pointer-events-none' : 'opacity-100 relative'
        }`}
      />

      {!isLoading && !hasError && (
        <div className="px-3.5 py-1.5 bg-black/80 backdrop-blur-md text-[11px] text-[var(--text-muted)] font-mono truncate border-t border-white/10 flex items-center justify-between gap-3">
          <span className="truncate flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0 bg-emerald-400" />
            <span className="truncate">{alt || "Visual output"}</span>
          </span>
          {currentSrc && (
            <a
              href={currentSrc}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent-primary)] hover:underline shrink-0 text-[10px] uppercase font-bold tracking-wider"
            >
              Full Res ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
});

const CodeBlock = React.memo(function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalResult, setTerminalResult] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
  } | null>(null);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = code;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (error) {
          console.error('Fallback copy error', error);
        } finally {
          document.body.removeChild(textArea);
        }
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleRunInTerminal = async () => {
    setIsRunning(true);
    setShowTerminal(true);
    const start = Date.now();

    try {
      const res = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          timeout: 12000
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTerminalResult({
          stdout: data.stdout || '',
          stderr: data.stderr || '',
          exitCode: data.exitCode || 0,
          durationMs: data.durationMs || (Date.now() - start)
        });
      } else {
        throw new Error(`Server status ${res.status}`);
      }
    } catch (err: any) {
      // Client browser sandbox fallback execution
      let fallbackStdout = '';
      let fallbackStderr = '';
      let exitCode = 0;

      const langLower = (language || '').toLowerCase();
      if (langLower.includes('js') || langLower.includes('javascript') || langLower.includes('node')) {
        try {
          const logs: string[] = [];
          const customConsole = {
            log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
            error: (...args: any[]) => logs.push('ERROR: ' + args.join(' ')),
            warn: (...args: any[]) => logs.push('WARN: ' + args.join(' ')),
          };
          const fn = new Function('console', code);
          fn(customConsole);
          fallbackStdout = logs.join('\n') || '[Code executed with no output]';
        } catch (e: any) {
          fallbackStderr = e.message;
          exitCode = 1;
        }
      } else {
        fallbackStderr = `${err.message || 'Execution error'}. Note: Native backend execution endpoint unavailable.`;
        exitCode = 1;
      }

      setTerminalResult({
        stdout: fallbackStdout,
        stderr: fallbackStderr,
        exitCode,
        durationMs: Date.now() - start
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="relative group rounded-2xl overflow-hidden bg-[var(--bg-code)] border border-[var(--glass-border)] my-4 shadow-lg shadow-black/40 transition-colors duration-300 [contain:paint_style]">
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-base)] border-b border-[var(--glass-border)] transition-colors duration-300">
        <div className="flex items-center gap-2">
          {/* macOS traffic light dots */}
          <div className="flex gap-1.5 mr-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] transition-colors duration-300">
            {language}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Run in Terminal Button */}
          <button
            onClick={handleRunInTerminal}
            disabled={isRunning}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-medium transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Execute code in terminal"
          >
            {isRunning ? (
              <RotateCw size={11} className="animate-spin text-emerald-400" />
            ) : (
              <Play size={11} className="fill-current text-emerald-400" />
            )}
            <span>{isRunning ? 'Running...' : 'Run in Terminal'}</span>
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 transition-colors flex items-center gap-1.5 cursor-pointer z-10"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check size={13} className="text-emerald-400" />
                <span className="text-[10px] font-medium text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span className="text-[10px] font-medium">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* High-performance GPU accelerated code block with luminous syntax text glow across all modes */}
      <div className="p-4 text-[12.5px] font-mono leading-relaxed overflow-x-auto [contain:content] [&_span]:[text-shadow:0_0_6px_currentColor,0_0_13px_currentColor]">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: 0,
            background: 'transparent',
          }}
          codeTagProps={{
            style: { fontFamily: 'inherit' }
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      {/* Integrated Terminal Execution Drawer */}
      {showTerminal && (
        <div className="border-t border-white/10 bg-[#0c0c0e] p-3 text-xs font-mono">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/5 text-[11px] text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <Terminal size={12} className="text-emerald-400" />
              <span className="text-white font-medium">Terminal Execution Output</span>
              {terminalResult && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded ${terminalResult.exitCode === 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                  exit {terminalResult.exitCode} ({terminalResult.durationMs}ms)
                </span>
              )}
            </div>
            <button
              onClick={() => setShowTerminal(false)}
              className="text-[10px] text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
            >
              Close Output ✕
            </button>
          </div>

          {isRunning && (
            <div className="flex items-center gap-2 text-emerald-400 py-1 animate-pulse text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Executing in terminal sandbox...</span>
            </div>
          )}

          {terminalResult && !isRunning && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {terminalResult.stdout && (
                <pre className="text-emerald-300/90 whitespace-pre-wrap break-all pl-2 border-l border-emerald-500/30">
                  {terminalResult.stdout}
                </pre>
              )}
              {terminalResult.stderr && (
                <pre className="text-red-400/90 whitespace-pre-wrap break-all pl-2 border-l border-red-500/30">
                  {terminalResult.stderr}
                </pre>
              )}
              {!terminalResult.stdout && !terminalResult.stderr && (
                <span className="text-[var(--text-muted)] italic">
                  [Program finished with no console output (Exit code {terminalResult.exitCode})]
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

const AiTerminalResultCard = React.memo(function AiTerminalResultCard({ rawContent }: { rawContent: string }) {
  const [copied, setCopied] = useState(false);
  const [isReRunning, setIsReRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<{
    cmd: string;
    exitCode: number;
    durationMs: number;
    output: string;
  } | null>(null);

  useEffect(() => {
    let cmd = "";
    let exitCode = 0;
    let durationMs = 0;
    const lines = rawContent.split("\n");
    const outputLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith("__CMD__:")) {
        try {
          cmd = decodeURIComponent(line.slice(8).trim());
        } catch {
          cmd = line.slice(8).trim();
        }
      } else if (line.startsWith("__EXIT__:")) {
        exitCode = parseInt(line.slice(9).trim(), 10) || 0;
      } else if (line.startsWith("__DUR__:")) {
        durationMs = parseInt(line.slice(8).trim(), 10) || 0;
      } else {
        outputLines.push(line);
      }
    }
    setCurrentResult({
      cmd: cmd || "command",
      exitCode,
      durationMs,
      output: outputLines.join("\n").trim()
    });
  }, [rawContent]);

  const handleReRun = async () => {
    if (!currentResult?.cmd || isReRunning) return;
    setIsReRunning(true);
    const start = Date.now();
    try {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: currentResult.cmd })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentResult({
          cmd: currentResult.cmd,
          exitCode: data.exitCode || 0,
          durationMs: data.durationMs || (Date.now() - start),
          output: (data.stdout || data.stderr || "(No output)").trim()
        });
      }
    } catch (e: any) {
      setCurrentResult(prev => prev ? { ...prev, exitCode: 1, output: `Re-run error: ${e.message}` } : null);
    } finally {
      setIsReRunning(false);
    }
  };

  const handleCopy = async () => {
    if (!currentResult) return;
    try {
      await navigator.clipboard.writeText(`$ ${currentResult.cmd}\n\n${currentResult.output}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!currentResult) return null;
  const isSuccess = currentResult.exitCode === 0;

  return (
    <div className="rounded-2xl overflow-hidden bg-[#06080e] border border-emerald-500/25 my-3.5 shadow-xl shadow-black/50 transition-all text-xs font-mono">
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#090d16] border-b border-emerald-500/20">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60 border border-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60 border border-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 border border-emerald-500/80 inline-block" />
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold tracking-wide text-[11px]">
            <Terminal size={12} className="shrink-0" />
            <span>AI Autonomous Terminal</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-medium flex items-center gap-1 ${
            isReRunning
              ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 animate-pulse"
              : isSuccess
              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
              : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
          }`}>
            {isReRunning ? (
              <>
                <RotateCw size={10} className="animate-spin" />
                <span>Running...</span>
              </>
            ) : isSuccess ? (
              <>
                <Check size={10} />
                <span>Exit 0 ({currentResult.durationMs}ms)</span>
              </>
            ) : (
              <span>Exit {currentResult.exitCode} ({currentResult.durationMs}ms)</span>
            )}
          </span>

          <button
            onClick={handleReRun}
            disabled={isReRunning}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Re-run this command"
          >
            <RotateCw size={12} className={isReRunning ? "animate-spin" : ""} />
          </button>

          <button
            onClick={handleCopy}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Copy command & output"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      <div className="px-3.5 py-2.5 bg-[#0b101c] border-b border-white/5 flex items-center gap-2 overflow-x-auto">
        <span className="text-emerald-400 font-bold select-none text-[12px]">$</span>
        <code className="text-white font-semibold text-[12px] tracking-wide whitespace-pre">
          {currentResult.cmd}
        </code>
      </div>

      <div className="p-3.5 max-h-64 overflow-y-auto bg-[#05070d]">
        <pre className={`whitespace-pre-wrap break-all leading-relaxed ${isSuccess ? "text-emerald-300/90" : "text-rose-300/90"}`}>
          {currentResult.output || "(Command completed with no output)"}
        </pre>
      </div>
    </div>
  );
});

const AiTerminalExecCard = React.memo(function AiTerminalExecCard({ rawContent }: { rawContent: string }) {
  let cmd = "";
  const lines = rawContent.split("\n");
  for (const line of lines) {
    if (line.startsWith("__CMD__:")) {
      try {
        cmd = decodeURIComponent(line.slice(8).trim());
      } catch {
        cmd = line.slice(8).trim();
      }
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-[#06080e] border border-sky-500/30 my-3 shadow-lg text-xs font-mono">
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#090d16] border-b border-sky-500/20">
        <div className="flex items-center gap-2">
          <Terminal size={12} className="text-sky-400" />
          <span className="text-sky-300 font-semibold text-[11px]">AI Terminal Execution</span>
        </div>
        <div className="flex items-center gap-1.5 text-sky-400 text-[10px] animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
          <span>Executing command...</span>
        </div>
      </div>
      <div className="px-3.5 py-2 bg-[#0b101c] flex items-center gap-2">
        <span className="text-sky-400 font-bold select-none">$</span>
        <code className="text-white font-semibold">{cmd || "executing..."}</code>
      </div>
    </div>
  );
});

const AiWebSearchCard = React.memo(function AiWebSearchCard({ rawContent }: { rawContent: string }) {
  let query = "";
  const lines = rawContent.split("\n");
  const resultLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("__QUERY__:")) {
      try {
        query = decodeURIComponent(line.slice(10).trim());
      } catch {
        query = line.slice(10).trim();
      }
    } else {
      resultLines.push(line);
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-[#060e18] border border-cyan-500/30 my-3 shadow-lg text-xs">
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#091422] border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <Globe size={13} className="text-cyan-400" />
          <span className="text-cyan-300 font-semibold text-[11px]">AI Real-Time Web Grounding</span>
        </div>
        <span className="text-[10px] text-cyan-400/80 font-mono">
          {query ? `"${query}"` : "Live Search"}
        </span>
      </div>
      <div className="p-3 bg-[#050a12] text-[12px] text-cyan-100/90 space-y-2">
        <ReactMarkdown
          components={{
            a: ({ href, children }) => {
              const handleClick = (e: React.MouseEvent) => {
                if (href && href.startsWith("http")) {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent("open-site-preview", { detail: { url: href } }));
                }
              };
              return (
                <a
                  href={href}
                  onClick={handleClick}
                  className="text-cyan-400 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>{children}</span>
                  <ExternalLink size={10} />
                </a>
              );
            }
          }}
        >
          {resultLines.join("\n")}
        </ReactMarkdown>
      </div>
    </div>
  );
});

const AiFetchSiteCard = React.memo(function AiFetchSiteCard({ rawContent }: { rawContent: string }) {
  let url = "";
  let title = "";
  const lines = rawContent.split("\n");
  const contentLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("__URL__:")) {
      try {
        url = decodeURIComponent(line.slice(8).trim());
      } catch {
        url = line.slice(8).trim();
      }
    } else if (line.startsWith("__TITLE__:")) {
      try {
        title = decodeURIComponent(line.slice(10).trim());
      } catch {
        title = line.slice(10).trim();
      }
    } else {
      contentLines.push(line);
    }
  }

  const handleOpen = () => {
    if (url) {
      window.dispatchEvent(new CustomEvent("open-site-preview", { detail: { url } }));
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden bg-[#0c0818] border border-purple-500/30 my-3 shadow-lg text-xs">
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#120c24] border-b border-purple-500/20">
        <div className="flex items-center gap-2 truncate">
          <Compass size={13} className="text-purple-400 shrink-0" />
          <span className="text-purple-300 font-semibold text-[11px] truncate">
            {title || "AI Inspected Webpage"}
          </span>
        </div>
        {url && (
          <button
            onClick={handleOpen}
            className="px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] font-medium transition-colors cursor-pointer shrink-0 ml-2"
          >
            Preview Site ↗
          </button>
        )}
      </div>
      <div className="p-3 bg-[#080512] text-[12px] text-purple-100/85 max-h-48 overflow-y-auto leading-relaxed">
        <pre className="whitespace-pre-wrap font-sans">
          {contentLines.join("\n")}
        </pre>
      </div>
    </div>
  );
});

