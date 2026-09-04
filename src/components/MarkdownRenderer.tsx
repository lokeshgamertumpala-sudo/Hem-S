import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
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

    // 1. Normalize duplicate adjoining code fence seams from multi-pass continuations
    text = text.replace(/```\s*\n\s*```[a-zA-Z0-9_-]*\s*\n/g, '\n');

    // 2. Fix broken markdown image syntax where models insert newlines or spaces:
    // e.g. ![Alt]\n(url) or ![Alt] (url) -> ![Alt](url)
    text = text.replace(/!\[([^\]]*)\]\s*[\r\n]+\s*\(([^\s\)]+)\)/g, '![$1]($2)');
    text = text.replace(/!\[([^\]]*)\]\s+\(([^\s\)]+)\)/g, '![$1]($2)');

    // 3. Fix escaped backslashes in image URLs: e.g. \%20 or \( or \)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
      const cleanUrl = url.trim().replace(/\\(%20|%|\(|\))/g, '$1').replace(/\s+/g, '%20');
      return `![${alt}](${cleanUrl})`;
    });

    // 4. Automatically route pollinations URLs through local resilient /api/image queue to prevent concurrent 429s
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
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : 'text';
            const codeString = String(children).replace(/\n$/, '');
            
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
          a: ({ children, href }) => <a href={href} className="text-[var(--accent-primary)] hover:underline transition-colors duration-300" target="_blank" rel="noreferrer">{children}</a>,
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
    </div>
  );
});

