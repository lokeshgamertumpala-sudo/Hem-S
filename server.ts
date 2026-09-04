import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { exec } from "child_process";
import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

// Online Repetition Breaker: detects degenerate token repetition loops in real-time
function detectRepetitionLoop(text: string): boolean {
  if (text.length < 60) return false;
  const tail = text.slice(-400);
  for (let len = 10; len <= 120; len++) {
    if (tail.length < len * 3) continue;
    const chunk1 = tail.slice(-len);
    const chunk2 = tail.slice(-len * 2, -len);
    const chunk3 = tail.slice(-len * 3, -len * 2);
    if (chunk1 === chunk2 && chunk2 === chunk3) {
      return true;
    }
  }
  return false;
}

// Live Real-Time Multi-Provider Web Search Engine
interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

function cleanSearchQuery(query: string): string {
  if (!query) return "";
  return query
    .replace(/^(search(\s+(about|for|on|google|web|online|internet))?|google(\s+(about|for|this))?|find(\s+(me\s+)?(info\s+on|about|information\s+about))?|tell\s+me\s+about|what\s+is\s+the\s+latest\s+on)\s+/i, "")
    .replace(/[^\w\s\-\+\.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function searchGoogleWeb(rawQuery: string, maxResults = 5): Promise<SearchResult[]> {
  const query = cleanSearchQuery(rawQuery) || rawQuery.trim();
  if (!query) return [];

  // Tier 1: DuckDuckGo HTML Search
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const html = await res.text();
      const results: SearchResult[] = [];
      const resultBlocks = html.split(/class=["'][^"']*result\s+results_links/i);

      for (let i = 1; i < Math.min(maxResults + 1, resultBlocks.length); i++) {
        const block = resultBlocks[i];
        const linkMatch = block.match(/<a[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
        const snippetMatch = block.match(/<[^>]*class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i);

        let rawUrl = linkMatch ? linkMatch[1].trim() : "";
        if (rawUrl.includes("uddg=")) {
          const m = rawUrl.match(/uddg=([^&]+)/);
          if (m) rawUrl = decodeURIComponent(m[1]);
        }

        const title = linkMatch ? linkMatch[2].replace(/<[^>]+>/g, "").trim() : "";
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "";

        if (title || snippet) {
          results.push({
            title: title || "Web Resource",
            link: rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`,
            snippet
          });
        }
      }

      if (results.length > 0) return results;
    }
  } catch (err) {
    // Fall through to Tier 2
  }

  // Tier 2: DuckDuckGo Lite Fallback
  try {
    const liteUrl = `https://lite.duckduckgo.com/lite/`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(liteUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      },
      body: `q=${encodeURIComponent(query)}`
    });
    clearTimeout(timeout);

    if (res.ok) {
      const html = await res.text();
      const results: SearchResult[] = [];
      const linkRegex = /<a[^>]*class=['"]result-link['"][^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
      const snippetRegex = /<td[^>]*class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi;

      const links: { url: string; title: string }[] = [];
      let match;
      while ((match = linkRegex.exec(html)) !== null && links.length < maxResults) {
        let rawUrl = match[1];
        if (rawUrl.includes("uddg=")) {
          const m = rawUrl.match(/uddg=([^&]+)/);
          if (m) rawUrl = decodeURIComponent(m[1]);
        }
        links.push({
          url: rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`,
          title: match[2].replace(/<[^>]+>/g, "").trim()
        });
      }

      const snippets: string[] = [];
      while ((match = snippetRegex.exec(html)) !== null && snippets.length < maxResults) {
        snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
      }

      for (let i = 0; i < links.length; i++) {
        results.push({
          title: links[i].title || "Web Result",
          link: links[i].url,
          snippet: snippets[i] || ""
        });
      }

      if (results.length > 0) return results;
    }
  } catch (err) {
    // Fall through to Tier 3
  }

  // Tier 3: Wikipedia & Open Knowledge Fallback
  try {
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${maxResults}&namespace=0&format=json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(wikiUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Hem-S-SearchEngine/2.0" }
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const titles = data[1] || [];
      const snippets = data[2] || [];
      const links = data[3] || [];
      const results: SearchResult[] = [];

      for (let i = 0; i < titles.length; i++) {
        if (titles[i] && links[i]) {
          results.push({
            title: titles[i],
            link: links[i],
            snippet: snippets[i] || ""
          });
        }
      }
      if (results.length > 0) return results;
    }
  } catch (err) {}

  return [];
}

// AI Autonomous Terminal Execution Engine
interface TerminalRunResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  command: string;
}

async function runTerminalCommand(command: string, timeout = 15000, cwd?: string): Promise<TerminalRunResult> {
  const startTime = Date.now();
  const cmd = (command || "").trim();
  if (!cmd) {
    return {
      success: false,
      stdout: "",
      stderr: "Empty command",
      exitCode: 1,
      durationMs: 0,
      command: ""
    };
  }

  return new Promise((resolve) => {
    try {
      exec(
        cmd,
        {
          timeout: Math.min(timeout, 30000),
          maxBuffer: 1024 * 1024 * 4,
          cwd: cwd || process.cwd(),
          env: { ...process.env, FORCE_COLOR: "0" }
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - startTime;
          const exitCode = error ? (typeof (error as any).code === "number" ? (error as any).code : 1) : 0;
          resolve({
            success: !error,
            stdout: (stdout || "").slice(0, 8000),
            stderr: (stderr || (error && !stdout ? error.message : "")).slice(0, 4000),
            exitCode,
            durationMs,
            command: cmd
          });
        }
      );
    } catch (err: any) {
      resolve({
        success: false,
        stdout: "",
        stderr: err?.message || "Execution failed",
        exitCode: 1,
        durationMs: Date.now() - startTime,
        command: cmd
      });
    }
  });
}

// AI Autonomous Website Fetcher & Reader Engine
async function fetchSiteCleanText(targetUrl: string): Promise<{ title: string; description: string; content: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    clearTimeout(timeout);
    if (!response.ok) {
      return { title: targetUrl, description: "", content: `Error fetching site: HTTP ${response.status}` };
    }
    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : targetUrl;
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : "";
    let cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

    if (cleanText.length > 8000) {
      cleanText = cleanText.slice(0, 8000) + "... [content truncated]";
    }
    return { title, description, content: cleanText };
  } catch (err: any) {
    return { title: targetUrl, description: "", content: `Error fetching site: ${err?.message || "Unknown error"}` };
  }
}

// 5 Dedicated Swarm/Swamp Roles definition
interface SwarmRoleConfig {
  roleName: string;
  defaultModelId: string;
  openRouterCandidates: string[];
  nvidiaCandidates: string[];
  groqCandidates: string[];
  systemInstruction: (userPrompt: string, modelName?: string) => string;
}

const SWARM_ROLES: SwarmRoleConfig[] = [
  {
    roleName: "Agent 1 — Primary Solver",
    defaultModelId: "z-ai/glm-5.2",
    openRouterCandidates: [
      "thudm/glm-4-9b-chat",
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-chat",
      "meta-llama/llama-3.3-70b-instruct:free",
      "deepseek/deepseek-r1:free"
    ],
    nvidiaCandidates: [
      "meta/llama-3.2-11b-vision-instruct",
      "nvidia/llama-3.1-nemotron-70b-instruct",
      "meta/llama-3.1-70b-instruct",
      "meta/llama-3.1-8b-instruct"
    ],
    groqCandidates: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant"
    ],
    systemInstruction: (_userPrompt, modelName) =>
      `You are ${modelName || "Primary Solver"}, the Lead AI in this 5-model swarm.
MANDATE:
1. Give a DIRECT, definitive, and accurate answer to the user's question immediately in the first sentence.
2. If asked for code or solutions, provide clean, complete, working code.
3. NEVER repeat system instructions, never mention "CORE DIRECTIVE", and never output artificial step-by-step filler unless specifically requested.`
  },
  {
    roleName: "Agent 2 — Alternative Solver",
    defaultModelId: "poolside/laguna-xs-2.1",
    openRouterCandidates: [
      "qwen/qwen-2.5-coder-32b-instruct",
      "deepseek/deepseek-chat",
      "meta-llama/llama-3.3-70b-instruct",
      "qwen/qwen-2.5-coder-32b-instruct:free",
      "deepseek/deepseek-r1:free"
    ],
    nvidiaCandidates: [
      "nvidia/llama-3.1-nemotron-70b-instruct",
      "meta/llama-3.2-11b-vision-instruct",
      "meta/llama-3.1-70b-instruct",
      "meta/llama-3.1-8b-instruct"
    ],
    groqCandidates: [
      "deepseek-r1-distill-llama-70b",
      "llama-3.3-70b-versatile"
    ],
    systemInstruction: (_userPrompt, modelName) =>
      `You are ${modelName || "Alternative Solver"}, providing a creative, modern, or high-performance perspective.
MANDATE:
1. Answer directly and concisely with an innovative or alternative technique.
2. If providing code, use modern high-speed patterns.
3. NEVER output robotic meta-commentary, system rules, or verbose step preambles.`
  },
  {
    roleName: "Agent 3 — Technical Specialist",
    defaultModelId: "mistralai/mixtral-8x22b-v0.1",
    openRouterCandidates: [
      "stepfun/step-3.7-flash",
      "stepfun/step-3.5-flash",
      "deepseek/deepseek-chat",
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-r1:free"
    ],
    nvidiaCandidates: [
      "mistralai/mistral-7b-instruct-v0.3",
      "meta/llama-3.2-11b-vision-instruct",
      "nvidia/llama-3.1-nemotron-70b-instruct",
      "meta/llama-3.1-8b-instruct"
    ],
    groqCandidates: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant"
    ],
    systemInstruction: (_userPrompt, modelName) =>
      `You are ${modelName || "Technical Specialist"}, the Deep Technical and Algorithmic Engine.
MANDATE:
1. Answer directly with precise technical depth, key parameters, and exact facts.
2. Provide complete code without placeholders.
3. NEVER repeat system prompt directives or write artificial step-by-step planning outlines.`
  },
  {
    roleName: "Agent 4 — Critic & Red Team",
    defaultModelId: "meta/muse-glimmer-30b",
    openRouterCandidates: [
      "moonshotai/moonshot-v1-32k",
      "mistralai/mistral-nemo",
      "deepseek/deepseek-chat",
      "meta-llama/llama-3.3-70b-instruct",
      "mistralai/mistral-7b-instruct:free"
    ],
    nvidiaCandidates: [
      "meta/llama-3.1-70b-instruct",
      "meta/llama-3.2-11b-vision-instruct",
      "meta/llama-3.1-8b-instruct",
      "nvidia/llama-3.1-nemotron-70b-instruct"
    ],
    groqCandidates: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant"
    ],
    systemInstruction: (_userPrompt, modelName) =>
      `You are ${modelName || "Security & Resilience Lead"}, focusing on reliability, security, and edge cases.
MANDATE:
1. Answer directly with practical solutions, pointing out key pitfalls, security tips, or error handling.
2. NEVER say "Given the CORE DIRECTIVE..." or output robotic lists of requirements.
3. Be direct, helpful, and concise.`
  },
  {
    roleName: "Agent 5 — Optimizer & Judge",
    defaultModelId: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    openRouterCandidates: [
      "nvidia/nemotron-4-340b-instruct",
      "deepseek/deepseek-chat",
      "meta-llama/llama-3.3-70b-instruct",
      "meta-llama/llama-3.3-70b-instruct:free",
      "deepseek/deepseek-r1:free"
    ],
    nvidiaCandidates: [
      "nvidia/llama-3.1-nemotron-70b-instruct",
      "meta/llama-3.2-11b-vision-instruct",
      "meta/llama-3.1-70b-instruct",
      "meta/llama-3.1-8b-instruct"
    ],
    groqCandidates: [
      "deepseek-r1-distill-llama-70b",
      "llama-3.3-70b-versatile"
    ],
    systemInstruction: (_userPrompt, modelName) =>
      `You are ${modelName || "Master Optimizer"}, providing the ultimate unified synthesis.
MANDATE:
1. Answer directly with a polished, comprehensive, and ready-to-use answer or code.
2. Combine elegance, performance, and best practices.
3. NEVER repeat system rules or robotic filler.`
  }
];

const VIBE_CODING_MASTER_SYSTEM_PROMPT = `[SPARK VIBE CODING — ELITE AUTONOMOUS SOFTWARE ENGINEERING MODE]
You are VIBE CODING, the world-class autonomous software engineering engine.

OPERATING PHILOSOPHY:
«Understand → Inspect → Plan → Build → Run → Test → Diagnose → Fix → Verify → Polish → Complete.»

HIGH-PERFORMANCE STANDARDS:
1. PEAK COMMERCIAL QUALITY: Deliver award-winning, production-grade, visually stunning software (Apple/Awwwards caliber design, fluid CSS3/3D physics, glassmorphism, responsive layout, rich typography, and full interactive JavaScript).
2. COMPLETE SINGLE-FILE ARCHITECTURE: When building web projects, generate a complete, self-contained, fully working single-file HTML document with all embedded CSS (<style>) and JavaScript (<script>) so it runs instantly.
3. ZERO PLACEHOLDERS: Never write '// TODO', '/* code goes here */', or truncated sections. Write every element, function, animation keyframe, style rule, and event handler completely.
4. RESILIENCE & CONTINUITY: If output reaches length limit, resume immediately from the exact character without restarting from line 1.
5. PRESERVE SURROUNDING UI: Respect existing application layout and animation systems.`;

// NVIDIA NIM active model mapping (Only verified active models on integrate.api.nvidia.com)
const VERIFIED_NVIDIA_NIM_MODELS = new Set([
  "01-ai/yi-large",
  "ai21labs/jamba-1.5-large-instruct",
  "bigcode/starcoder2-15b",
  "databricks/dbrx-instruct",
  "deepseek-ai/deepseek-coder-6.7b-instruct",
  "deepseek-ai/deepseek-v4-flash-0731",
  "deepseek-ai/deepseek-v4-pro-0813",
  "google/codegemma-1.1-7b",
  "google/codegemma-7b",
  "google/diffusiongemma-26b-a4b-it",
  "google/gemma-2b",
  "google/gemma-3-12b-it",
  "google/gemma-3-4b-it",
  "google/gemma-4-31b-it",
  "google/recurrentgemma-2b",
  "ibm/granite-3.0-3b-a800m-instruct",
  "ibm/granite-3.0-8b-instruct",
  "ibm/granite-34b-code-instruct",
  "ibm/granite-8b-code-instruct",
  "meta/codellama-70b",
  "meta/llama-3.2-11b-vision-instruct",
  "meta/llama-3.2-90b-vision-instruct",
  "meta/llama-guard-4-12b",
  "meta/llama2-70b",
  "meta/muse-glimmer-30b",
  "microsoft/phi-3-vision-128k-instruct",
  "microsoft/phi-3.5-moe-instruct",
  "mistralai/codestral-22b-instruct-v0.1",
  "mistralai/mistral-7b-instruct-v0.3",
  "mistralai/mistral-large",
  "mistralai/mistral-large-2-instruct",
  "mistralai/mistral-nemotron",
  "mistralai/mixtral-8x22b-v0.1",
  "moonshotai/kimi-k2.6",
  "moonshotai/kimi-k3",
  "nvidia/ai-synthetic-video-detector",
  "nvidia/cosmos-reason2-8b",
  "nvidia/embed-qa-4",
  "nvidia/ising-calibration-1.5-31b",
  "nvidia/llama-3.1-nemoguard-8b-content-safety",
  "nvidia/llama-3.1-nemoguard-8b-topic-control",
  "nvidia/llama-3.1-nemotron-51b-instruct",
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "nvidia/llama-3.1-nemotron-safety-guard-8b-v3",
  "nvidia/llama-3.1-nemotron-ultra-253b-v1",
  "nvidia/llama-3.2-nemoretriever-1b-vlm-embed-v1",
  "nvidia/llama-3.2-nv-embedqa-1b-v1",
  "nvidia/llama-nemotron-embed-vl-1b-v2",
  "nvidia/llama3-chatqa-1.5-70b",
  "nvidia/mistral-nemo-minitron-8b-8k-instruct",
  "nvidia/nemotron-3-embed-1b",
  "nvidia/nemotron-3-nano-30b-a3b",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  "nvidia/nemotron-3-super-120b-a12b",
  "nvidia/nemotron-3-ultra-550b-a55b",
  "nvidia/nemotron-3.5-content-safety",
  "nvidia/nemotron-3.5-lightning-30b-a3b",
  "nvidia/nemotron-4-340b-instruct",
  "nvidia/nemotron-4-340b-reward",
  "nvidia/nemotron-nano-3-30b-a3b",
  "nvidia/nemotron-parse",
  "nvidia/nv-embedqa-mistral-7b-v2",
  "nvidia/nvclip",
  "nvidia/riva-translate-4b-instruct",
  "nvidia/riva-translate-4b-instruct-v1.1",
  "nvidia/riva-translate-4b-instruct-v2",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "poolside/laguna-xs-2.1",
  "snowflake/arctic-embed-l",
  "writer/palmyra-creative-122b",
  "writer/palmyra-fin-70b-32k"
]);

const PROVEN_NVIDIA_MODELS = [
  "meta/llama-3.2-11b-vision-instruct",
  "meta/muse-glimmer-30b",
  "poolside/laguna-xs-2.1",
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "mistralai/mistral-7b-instruct-v0.3",
  "google/gemma-3-12b-it"
];

const NVIDIA_MODEL_MAP: Record<string, string[]> = {
  "deepseek-ai/deepseek-v4-flash": ["meta/llama-3.2-11b-vision-instruct", "meta/muse-glimmer-30b"],
  "deepseek-ai/deepseek-v4-flash-0731": ["meta/llama-3.2-11b-vision-instruct", "poolside/laguna-xs-2.1"],
  "deepseek-ai/deepseek-v4-pro-0813": ["meta/llama-3.2-11b-vision-instruct", "nvidia/llama-3.1-nemotron-70b-instruct"],
  "deepseek-ai/deepseek-r1": ["meta/llama-3.2-11b-vision-instruct", "nvidia/llama-3.1-nemotron-70b-instruct"],
  "deepseek-ai/deepseek-coder-6.7b-instruct": ["poolside/laguna-xs-2.1", "meta/llama-3.2-11b-vision-instruct"],
  "stepfun-ai/step-3.5-flash": ["meta/llama-3.2-11b-vision-instruct", "meta/muse-glimmer-30b"],
  "stepfun-ai/step-3.7-flash": ["meta/llama-3.2-11b-vision-instruct", "nvidia/llama-3.1-nemotron-70b-instruct"],
  "z-ai/glm-5.2": ["meta/llama-3.2-11b-vision-instruct", "meta/muse-glimmer-30b", "nvidia/llama-3.1-nemotron-70b-instruct"],
  "01-ai/yi-large": ["meta/llama-3.2-11b-vision-instruct", "meta/muse-glimmer-30b"],
  "nvidia/moonshotai/kimi-k2.6": ["meta/muse-glimmer-30b", "meta/llama-3.2-11b-vision-instruct"],
  "moonshotai/kimi-k2.6": ["meta/muse-glimmer-30b", "meta/llama-3.2-11b-vision-instruct"],
  "moonshotai/kimi-k3": ["meta/muse-glimmer-30b", "meta/llama-3.2-11b-vision-instruct"],
  "nvidia/nemotron-3-ultra-550b-a55b": ["meta/llama-3.2-11b-vision-instruct", "nvidia/llama-3.1-nemotron-70b-instruct"],
  "nvidia/nemotron-4-340b-instruct": ["meta/llama-3.2-11b-vision-instruct", "nvidia/llama-3.1-nemotron-70b-instruct"],
  "nvidia/llama-3.1-nemotron-ultra-253b-v1": ["meta/llama-3.2-11b-vision-instruct", "nvidia/llama-3.1-nemotron-70b-instruct", "meta/muse-glimmer-30b"],
  "nvidia/llama-3.1-nemotron-70b-instruct": ["nvidia/llama-3.1-nemotron-70b-instruct", "meta/llama-3.2-11b-vision-instruct"],
  "mistralai/mistral-large-2-instruct": ["mistralai/mistral-7b-instruct-v0.3", "meta/llama-3.2-11b-vision-instruct"],
  "mistralai/mixtral-8x22b-v0.1": ["meta/llama-3.2-11b-vision-instruct", "mistralai/mistral-7b-instruct-v0.3", "meta/muse-glimmer-30b"],
  "mistralai/codestral-22b-instruct-v0.1": ["poolside/laguna-xs-2.1", "meta/llama-3.2-11b-vision-instruct"],
  "poolside/laguna-xs-2.1": ["poolside/laguna-xs-2.1", "meta/llama-3.2-11b-vision-instruct"],
  "bigcode/starcoder2-15b": ["poolside/laguna-xs-2.1", "meta/llama-3.2-11b-vision-instruct"],
  "meta/muse-glimmer-30b": ["meta/muse-glimmer-30b", "meta/llama-3.2-11b-vision-instruct"],
  "meta/codellama-70b": ["poolside/laguna-xs-2.1", "meta/llama-3.2-11b-vision-instruct"],
  "meta/llama-3.2-11b-vision-instruct": ["meta/llama-3.2-11b-vision-instruct", "microsoft/phi-3-vision-128k-instruct"],
  "meta/llama-3.2-90b-vision-instruct": ["meta/llama-3.2-11b-vision-instruct", "microsoft/phi-3-vision-128k-instruct"],
  "microsoft/phi-3-vision-128k-instruct": ["microsoft/phi-3-vision-128k-instruct", "meta/llama-3.2-11b-vision-instruct"],
  "google/deplot": ["meta/llama-3.2-11b-vision-instruct", "microsoft/phi-3-vision-128k-instruct"],
  "adept/fuyu-8b": ["meta/llama-3.2-11b-vision-instruct", "microsoft/phi-3-vision-128k-instruct"],
  "microsoft/kosmos-2": ["meta/llama-3.2-11b-vision-instruct", "microsoft/phi-3-vision-128k-instruct"],
  "nvidia/neva-22b": ["meta/llama-3.2-11b-vision-instruct", "microsoft/phi-3-vision-128k-instruct"],
  "nvidia/vila": ["meta/llama-3.2-11b-vision-instruct", "microsoft/phi-3-vision-128k-instruct"],
  "minimaxai/minimax-m3": ["meta/llama-3.2-11b-vision-instruct", "microsoft/phi-3-vision-128k-instruct"],
  "openai/gpt-oss-120b": ["meta/llama-3.2-11b-vision-instruct", "nvidia/llama-3.1-nemotron-70b-instruct"],
  "ai21labs/jamba-1.5-large-instruct": ["meta/llama-3.2-11b-vision-instruct", "meta/muse-glimmer-30b"],
  "databricks/dbrx-instruct": ["meta/llama-3.2-11b-vision-instruct", "poolside/laguna-xs-2.1"],
  "writer/palmyra-creative-122b": ["meta/muse-glimmer-30b", "meta/llama-3.2-11b-vision-instruct"],
  "ibm/granite-34b-code-instruct": ["poolside/laguna-xs-2.1", "meta/llama-3.2-11b-vision-instruct"],
  "ibm/granite-8b-code-instruct": ["poolside/laguna-xs-2.1", "meta/llama-3.2-11b-vision-instruct"],
  "nvidia/cosmos-reason2-8b": ["meta/llama-3.2-11b-vision-instruct", "poolside/laguna-xs-2.1"],
  "google/gemma-4-31b-it": ["google/gemma-3-12b-it", "meta/llama-3.2-11b-vision-instruct"],
  "google/gemma-3-12b-it": ["google/gemma-3-12b-it", "meta/llama-3.2-11b-vision-instruct"],
  "google/gemma-3-4b-it": ["google/gemma-3-12b-it", "meta/llama-3.2-11b-vision-instruct"],
  "google/diffusiongemma-26b-a4b-it": ["google/gemma-3-12b-it", "meta/llama-3.2-11b-vision-instruct"],
  "microsoft/phi-3.5-moe-instruct": ["google/gemma-3-12b-it", "meta/llama-3.2-11b-vision-instruct"],
  "nvidia/mistral-nemo-minitron-8b-8k-instruct": ["google/gemma-3-12b-it", "meta/llama-3.2-11b-vision-instruct"],
  "meta/llama2-70b": ["meta/llama-3.2-11b-vision-instruct", "nvidia/llama-3.1-nemotron-70b-instruct"],
  "zyphra/zamba2-7b-instruct": ["meta/llama-3.2-11b-vision-instruct", "poolside/laguna-xs-2.1"],
  "writer/palmyra-med-70b": ["meta/llama-3.2-11b-vision-instruct", "meta/muse-glimmer-30b"],
  "writer/palmyra-med-70b-32k": ["meta/llama-3.2-11b-vision-instruct", "meta/muse-glimmer-30b"],
  "aisingapore/sea-lion-7b-instruct": ["meta/llama-3.2-11b-vision-instruct", "meta/muse-glimmer-30b"],
  "nv-mistralai/mistral-nemo-12b-instruct": ["meta/llama-3.2-11b-vision-instruct", "mistralai/mistral-7b-instruct-v0.3"],
  "default": ["meta/llama-3.2-11b-vision-instruct", "meta/muse-glimmer-30b", "poolside/laguna-xs-2.1"]
};

// OpenRouter single model mapping
const OPENROUTER_MODEL_MAP: Record<string, string[]> = {
  "stepfun-ai/step-3.7-flash": ["stepfun/step-3.7-flash", "stepfun/step-3.5-flash", "deepseek/deepseek-chat", "meta-llama/llama-3.3-70b-instruct"],
  "stepfun-ai/step-3.5-flash": ["stepfun/step-3.5-flash", "stepfun/step-3.7-flash", "deepseek/deepseek-chat"],
  "deepseek-ai/deepseek-v4-flash": ["deepseek/deepseek-chat", "deepseek/deepseek-r1", "deepseek/deepseek-r1:free"],
  "deepseek-ai/deepseek-v4-flash-0731": ["deepseek/deepseek-chat", "deepseek/deepseek-r1"],
  "deepseek-ai/deepseek-r1": ["deepseek/deepseek-r1", "deepseek/deepseek-chat", "deepseek/deepseek-r1:free"],
  "meta/llama-3.2-3b-instruct": ["meta-llama/llama-3.2-3b-instruct", "meta-llama/llama-3.1-8b-instruct"],
  "nvidia/nemotron-mini-4b-instruct": ["nvidia/nemotron-mini-4b-instruct", "meta-llama/llama-3.1-8b-instruct"],
  "meta/llama-3.1-8b-instruct": ["meta-llama/llama-3.1-8b-instruct", "meta-llama/llama-3.1-8b-instruct:free"],
  "openai/gpt-oss-120b": ["openai/gpt-4o-mini", "meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-chat"],
  "google/codegemma-7b": ["google/gemma-2-9b-it", "qwen/qwen-2.5-coder-32b-instruct"],
  "mistralai/mistral-nemotron": ["mistralai/mistral-nemo", "mistralai/mistral-7b-instruct:free"],
  "poolside/laguna-xs-2.1": ["qwen/qwen-2.5-coder-32b-instruct", "deepseek/deepseek-chat", "qwen/qwen-2.5-coder-32b-instruct:free"],
  "nvidia/nemotron-3-nano-30b-a3b": ["nvidia/nemotron-4-340b-instruct", "meta-llama/llama-3.3-70b-instruct"],
  "nvidia/llama-3.3-nemotron-super-49b-v1": ["nvidia/llama-3.1-nemotron-70b-instruct", "meta-llama/llama-3.3-70b-instruct"],
  "z-ai/glm-5.2": ["thudm/glm-4-9b-chat", "meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-chat"],
  "nvidia/nemotron-3-ultra-550b-a55b": ["nvidia/nemotron-4-340b-instruct", "meta-llama/llama-3.3-70b-instruct"],
  "meta/llama-3.1-70b-instruct": ["meta-llama/llama-3.1-70b-instruct", "meta-llama/llama-3.3-70b-instruct"],
  "meta/llama-3.3-70b-instruct": ["meta-llama/llama-3.3-70b-instruct", "meta-llama/llama-3.3-70b-instruct:free", "meta-llama/llama-3.1-70b-instruct"],
  "meta/llama-3.2-11b-vision-instruct": ["meta-llama/llama-3.2-11b-vision-instruct", "meta-llama/llama-3.2-90b-vision-instruct"],
  "minimaxai/minimax-m3": ["minimax/minimax-01", "deepseek/deepseek-chat"],
  "nvidia/moonshotai/kimi-k2.6": ["moonshotai/moonshot-v1-32k", "mistralai/mistral-nemo", "deepseek/deepseek-chat"],
  "black-forest-labs/flux-1-schnell": ["black-forest-labs/flux-1-schnell", "meta-llama/llama-3.2-90b-vision-instruct", "meta-llama/llama-3.3-70b-instruct"],
  "stabilityai/stable-diffusion-3.5-large": ["stabilityai/stable-diffusion-3.5-large", "meta-llama/llama-3.2-90b-vision-instruct", "meta-llama/llama-3.3-70b-instruct"],
  "google/diffusiongemma-26b-a4b-it": ["google/gemma-2-27b-it", "google/gemma-3-12b-it", "meta-llama/llama-3.2-11b-vision-instruct"]
};

// Groq mapping
const GROQ_MODEL_MAP: Record<string, string[]> = {
  "deepseek-ai/deepseek-v4-flash": ["deepseek-r1-distill-llama-70b", "llama-3.3-70b-versatile"],
  "deepseek-ai/deepseek-r1": ["deepseek-r1-distill-llama-70b", "llama-3.3-70b-versatile"],
  "meta/llama-3.3-70b-instruct": ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
  "poolside/laguna-xs-2.1": ["deepseek-r1-distill-llama-70b", "llama-3.3-70b-versatile"],
  "default": ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "deepseek-r1-distill-llama-70b"]
};

interface ProviderMetrics {
  failures: number;
  consecutiveFailures: number;
  lastFailureTime: number;
  cooldownUntil: number;
  consecutiveSuccess: number;
  totalSuccess: number;
  avgLatencyMs: number;
  lastErrorStatus?: number;
}

class ApiResilienceGateway {
  private metrics: Map<string, ProviderMetrics> = new Map();
  private readonly defaultCooldownMs = 20000; // 20s breaker trip
  private readonly rateLimitCooldownMs = 40000; // 40s on HTTP 429

  private getOrCreate(key: string): ProviderMetrics {
    let metric = this.metrics.get(key);
    if (!metric) {
      metric = {
        failures: 0,
        consecutiveFailures: 0,
        lastFailureTime: 0,
        cooldownUntil: 0,
        consecutiveSuccess: 0,
        totalSuccess: 0,
        avgLatencyMs: 200
      };
      this.metrics.set(key, metric);
    }
    return metric;
  }

  public isHealthy(routeIdentifier: string): boolean {
    const metric = this.metrics.get(routeIdentifier);
    if (!metric) return true;
    return Date.now() >= metric.cooldownUntil;
  }

  public recordSuccess(routeIdentifier: string, latencyMs: number) {
    const metric = this.getOrCreate(routeIdentifier);
    metric.consecutiveFailures = 0;
    metric.consecutiveSuccess += 1;
    metric.totalSuccess += 1;
    metric.cooldownUntil = 0;
    metric.avgLatencyMs = Math.round((metric.avgLatencyMs * 0.8) + (latencyMs * 0.2));
  }

  public recordFailure(routeIdentifier: string, statusCode: number, errorSnippet: string) {
    const metric = this.getOrCreate(routeIdentifier);
    metric.failures += 1;
    metric.consecutiveFailures += 1;
    metric.consecutiveSuccess = 0;
    metric.lastFailureTime = Date.now();
    metric.lastErrorStatus = statusCode;

    if (statusCode === 429) {
      metric.cooldownUntil = Date.now() + this.rateLimitCooldownMs;
    } else if (metric.consecutiveFailures >= 2) {
      metric.cooldownUntil = Date.now() + this.defaultCooldownMs;
    }
  }

  public prioritizeCandidates(candidates: string[], keyPrefix: string): string[] {
    return [...candidates].sort((a, b) => {
      const idA = `${keyPrefix}:${a}`;
      const idB = `${keyPrefix}:${b}`;
      const healthyA = this.isHealthy(idA);
      const healthyB = this.isHealthy(idB);

      if (healthyA && !healthyB) return -1;
      if (!healthyA && healthyB) return 1;

      const metricA = this.metrics.get(idA);
      const metricB = this.metrics.get(idB);
      const latA = metricA ? metricA.avgLatencyMs : 300;
      const latB = metricB ? metricB.avgLatencyMs : 300;
      return latA - latB;
    });
  }

  public prioritizeKeys(keys: string[]): string[] {
    return [...keys].sort((a, b) => {
      const keyIdA = a.slice(0, 12);
      const keyIdB = b.slice(0, 12);
      const healthyA = this.isHealthy(keyIdA);
      const healthyB = this.isHealthy(keyIdB);

      if (healthyA && !healthyB) return -1;
      if (!healthyA && healthyB) return 1;

      const metricA = this.metrics.get(keyIdA);
      const metricB = this.metrics.get(keyIdB);
      const failA = metricA ? metricA.consecutiveFailures : 0;
      const failB = metricB ? metricB.consecutiveFailures : 0;
      return failA - failB;
    });
  }

  public startHeartbeat(res: any, intervalMs: number = 12000): () => void {
    const timer = setInterval(() => {
      try {
        if (!res.writableEnded) {
          res.write(": heartbeat\n\n");
          if (typeof res.flush === "function") res.flush();
        } else {
          clearInterval(timer);
        }
      } catch {
        clearInterval(timer);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }

  public getDiagnostics() {
    const report: Record<string, any> = {};
    for (const [k, v] of this.metrics.entries()) {
      report[k] = {
        isHealthy: Date.now() >= v.cooldownUntil,
        consecutiveFailures: v.consecutiveFailures,
        totalSuccess: v.totalSuccess,
        avgLatencyMs: v.avgLatencyMs,
        cooldownRemainingSec: Math.max(0, Math.round((v.cooldownUntil - Date.now()) / 1000))
      };
    }
    return report;
  }

  public resetAll() {
    this.metrics.clear();
  }
}

const apiGateway = new ApiResilienceGateway();

export async function createExpressServer(isServerless = false) {
  const app = express();
  
  // Enable full CORS and Private Network Access for all origins, including file://, localhost, and local network
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Private-Network", "true");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: "25mb" }));
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Stream endpoint handling both /api/stream and /api/swarm with REAL AI models
  const handleStreamRequest = async (req: express.Request, res: express.Response) => {
    const { prompt, apiKeys, models, image, isSwamp, isVibe, isPerformance, continuation, history, memories, skills, webSearch, clientTimestamp, clientTimezone, clientLocaleString } = req.body;
    const isSwampMode = Boolean(isSwamp);
    const isVibeMode = Boolean(isVibe);
    const isPerformanceMode = Boolean(isPerformance);
    const isContinuationReq = Boolean(continuation?.isContinuation);

    if (!prompt || !models || !Array.isArray(models) || models.length === 0) {
      return res.status(400).json({ error: "Missing required prompt or models selection" });
    }

    // Live Real-Time Clock & Temporal Context
    const now = clientTimestamp ? new Date(clientTimestamp) : new Date();
    const resolvedTz = clientTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    const userLocalFormatted = clientLocaleString || now.toLocaleString("en-US", { timeZone: resolvedTz, dateStyle: "full", timeStyle: "medium" });
    const istTime = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "medium" });
    const utcTime = now.toUTCString();

    const temporalDirective = `\n\n[LIVE REAL-TIME CLOCK & TEMPORAL CONTEXT]
Live Real-World Temporal Grounding:
• Current User Local Time: ${userLocalFormatted} (${resolvedTz})
• Indian Standard Time (IST): ${istTime}
• UTC / GMT Time: ${utcTime}
• ISO Timestamp: ${now.toISOString()}
• Current Year: ${now.getUTCFullYear()}
MANDATE: Whenever asked about the current time, current date, day of the week, or location time, ALWAYS answer using this authoritative live clock data. Never hallucinate, guess, or output outdated timestamps.`;

    // Real-Time Google & Web Search Grounding
    const isClockQuery = /(what('?s|\s+is)?\s+(the\s+)?(time|date|day)|current\s+(time|date)|what\s+time|time\s+now|time\s+in\s+)/i.test(prompt);
    const isExplicitSearchQuery = /(search(\s+(about|for|on|google|web|online|internet))?|google|who\s+is|what\s+happened|latest|news|weather|price|stock|schedule|event|hackathon|hackerthon)/i.test(prompt);
    
    const isWebSearchExplicit = Boolean(webSearch);
    const hasWebSearchSkill = Array.isArray(skills) && skills.some((s: any) => 
      s.id === "web_google_search" || 
      (s.name && String(s.name).toLowerCase().includes("google search"))
    );

    // Strictly respect user disabling search (Globe toggle off), and never scrape stale search results for simple clock queries
    const shouldPerformSearch = !isContinuationReq && !isClockQuery && (isWebSearchExplicit || (webSearch !== false && hasWebSearchSkill) || (webSearch !== false && isExplicitSearchQuery));

    let searchGroundingDirective = "";
    let retrievedSources: SearchResult[] = [];

    if (shouldPerformSearch) {
      try {
        retrievedSources = await searchGoogleWeb(prompt, 5);
        if (retrievedSources.length > 0) {
          searchGroundingDirective = `\n\n[LIVE GOOGLE & REAL-TIME WEB SEARCH GROUNDING]\nThe user requested live web access. The following verified real-time sources were retrieved via Google/Web search for the query: "${prompt}":\n\n` +
            retrievedSources.map((r, idx) => `[Source ${idx + 1}] ${r.title}\nURL: ${r.link}\nSummary: ${r.snippet}`).join("\n\n") +
            `\n\nDIRECTIVE: You have active Google and real-time Web access. Ground your response in the verified live data above. Quote current facts, verify claims, and cite the relevant source URLs using markdown links [Source Name](URL).\n`;
        }
      } catch (e) {
        console.error("Live web search grounding fetch failed:", e);
      }
    }

    // Collect available API keys from request or server environment
    const collectedKeys: string[] = [];

    const envIsolatedKeys = [
      process.env.NVIDIA_API_KEY_1,
      process.env.NVIDIA_API_KEY_2,
      process.env.NVIDIA_API_KEY_3,
      process.env.NVIDIA_API_KEY_4,
      process.env.NVIDIA_API_KEY_5,
      process.env.NVIDIA_API_KEY,
      process.env.OPENROUTER_API_KEY,
      process.env.GROQ_API_KEY,
      process.env.DEEPSEEK_API_KEY
    ].filter((k): k is string => typeof k === "string" && k.trim().length > 0);

    if (envIsolatedKeys.length > 0) {
      collectedKeys.push(...envIsolatedKeys);
    }

    if (Array.isArray(apiKeys)) {
      apiKeys.forEach((k: any) => {
        if (typeof k === "string" && k.trim().length > 0 && !collectedKeys.includes(k.trim())) {
          collectedKeys.push(k.trim());
        }
      });
    }

    // Configure Server-Sent Events headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform, no-buffer");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof (res as any).flushHeaders === "function") {
      (res as any).flushHeaders();
    }
    const abortController = new AbortController();
    const stopHeartbeat = apiGateway.startHeartbeat(res, 10000);

    res.on("close", () => {
      stopHeartbeat();
      if (!res.writableEnded) {
        abortController.abort();
      }
    });

    const streamPromises = models.map(async (modelConfig: any, index: number) => {
      const modelId = modelConfig.id;
      const modelName = modelConfig.name || modelId;
      const modelRole = modelConfig.role || "AI Model";
      const modelCategory = modelConfig.category || "";
      const targetSlotIndex = typeof modelConfig.targetIndex === "number" ? modelConfig.targetIndex : index;
      const swarmRoleIdx = typeof modelConfig.swarmRoleIndex === "number" ? modelConfig.swarmRoleIndex : targetSlotIndex;

      // Match designated Swarm Role directive if in Swamp mode, otherwise normal AI behavior
      const swarmRole = SWARM_ROLES[swarmRoleIdx % SWARM_ROLES.length];

      let specializedSystemPrompt = "";
      let userPromptContent = prompt;

      const vibeCodingDirective = isVibeMode
        ? `\n\n${VIBE_CODING_MASTER_SYSTEM_PROMPT}`
        : "";

      const memoryDirective = (Array.isArray(memories) && memories.length > 0)
        ? `\n\n[PERSISTENT LONG-TERM USER MEMORIES & PREFERENCES]\nAlways remember and respect the following user preferences and facts across this conversation:\n` + memories.map((m: any, idx: number) => `${idx + 1}. ${String(m)}`).join("\n") + "\n"
        : "";

      let relevantSkills = skills;
      if (Array.isArray(skills) && isSwampMode) {
        relevantSkills = skills.filter((s: any) => {
          const cat = (s.category || "").toLowerCase();
          const name = (s.name || "").toLowerCase();
          
          if (swarmRoleIdx % 5 === 0) return cat.includes("architecture") || cat.includes("design") || name.includes("ui"); // Agent 1
          if (swarmRoleIdx % 5 === 1) return cat.includes("performance") || cat.includes("innovation") || cat.includes("alternative"); // Agent 2
          if (swarmRoleIdx % 5 === 2) return cat.includes("technical") || cat.includes("logic") || cat.includes("backend") || cat.includes("math"); // Agent 3
          if (swarmRoleIdx % 5 === 3) return cat.includes("security") || cat.includes("audit") || cat.includes("testing") || name.includes("red"); // Agent 4
          if (swarmRoleIdx % 5 === 4) return cat.includes("optimization") || cat.includes("judge") || cat.includes("synthesis") || cat.includes("production"); // Agent 5
          return true; // Fallback
        });
        
        // If no specific skills match, you can optionally provide all or none. Let's provide all if none matched, or just none.
        if (relevantSkills.length === 0 && skills.length > 0) {
           // Optionally fallback to general skills
           relevantSkills = skills.filter((s: any) => (s.category || "").toLowerCase() === "general");
        }
      }

      const skillsDirective = (Array.isArray(relevantSkills) && relevantSkills.length > 0)
        ? `\n\n[ACTIVE SPECIALIZED AI SKILLS & CAPABILITIES]\nYou are enhanced with the following specialized skills. Strictly adhere to their guidelines, principles, and techniques:\n` + 
          relevantSkills.map((s: any) => `• [SKILL: ${s.name || 'Specialist'}] (${s.category || 'General'}): ${s.systemPrompt || s.description || ''}`).join("\n\n") + "\n"
        : "";

      if (isSwampMode || (isVibeMode && models.length > 1)) {
        specializedSystemPrompt = swarmRole.systemInstruction(prompt, modelName) + vibeCodingDirective + memoryDirective + skillsDirective;
        userPromptContent = prompt;
      } else {
        if (isVibeMode) {
          specializedSystemPrompt = `You are ${modelName} (${modelRole}), operating in autonomous SPARK VIBE CODING mode.\n\n${VIBE_CODING_MASTER_SYSTEM_PROMPT}${memoryDirective}${skillsDirective}`;
        } else if (modelCategory === "coding_and_maths" || modelRole.toLowerCase().includes("code") || modelRole.toLowerCase().includes("math")) {
          specializedSystemPrompt = `You are ${modelName} (${modelRole}), an elite AI reasoning and full-stack software synthesis engine. Answer the user's prompt directly and thoroughly, providing 100% complete, working, production-quality code, clean architectural explanations, and robust solutions without omissions.${memoryDirective}${skillsDirective}`;
        } else if (modelCategory === "visual_inputs" || modelRole.toLowerCase().includes("vision")) {
          specializedSystemPrompt = `You are a helpful, precise multimodal visual intelligence AI assistant. Provide direct, thorough, insightful, and comprehensive analysis of the user's questions and visual inputs.${memoryDirective}${skillsDirective}`;
        } else {
          specializedSystemPrompt = `You are ${modelName} (${modelRole}), an advanced AI assistant. Respond to the user's inquiry directly, accurately, helpfully, and concisely using clean markdown formatting.${memoryDirective}${skillsDirective}`;
        }
        userPromptContent = prompt;
      }

      const terminalAndWebCapabilityDirective = `\n\n[AUTONOMOUS TERMINAL POWER — RUN COMMANDS DIRECTLY ON HOST]
You are equipped with direct real-time terminal and shell execution power on the host operating system, exactly like an autonomous AI coding assistant.
When asked to check system info, run commands, test code, or inspect files, execute the command directly using:
<terminal>command to run</terminal>
Or inside a shell code block:
\`\`\`bash
command to run
\`\`\`
The host terminal will immediately execute the command, capture real stdout and stderr, and display the live output to the user.
CRITICAL RULES:
- ALWAYS answer directly and concisely without robotic filler.
- NEVER invent, simulate, or output fake <terminal_result> tags yourself. Only emit the command you wish to execute.
- Keep commands clean and direct.

[LIVE REAL-TIME WEB SEARCH & SITE INSPECTION TOOLS]
• Search the web: <web_search>search query</web_search>
• Read webpage text: <fetch_site>https://example.com</fetch_site>`;

      specializedSystemPrompt += temporalDirective + searchGroundingDirective + terminalAndWebCapabilityDirective;

      // Helper to write chunk
      const writeChunk = (content: string) => {
        res.write(`data: ${JSON.stringify({ modelIndex: targetSlotIndex, modelId, content })}\n\n`);
        if (typeof (res as any).flush === "function") (res as any).flush();
      };

      const writeDone = () => {
        res.write(`event: model_done\ndata: ${JSON.stringify({ modelIndex: targetSlotIndex, modelId })}\n\n`);
        if (typeof (res as any).flush === "function") (res as any).flush();
      };

      const writeError = (error: string) => {
        res.write(`event: error\ndata: ${JSON.stringify({ modelIndex: targetSlotIndex, modelId, error })}\n\n`);
        if (typeof (res as any).flush === "function") (res as any).flush();
      };

      // Check if API keys exist
      const ai = getGeminiClient();
      if (collectedKeys.length === 0 && !ai) {
        writeChunk(
          `⚠️ **API Key Required**\n\nPlease add your API key in **Settings** (Sidebar ⚙️ -> API Keys) to run real models (${modelName}). Supported keys: NVIDIA NIM (\`nvapi-...\`), OpenRouter (\`sk-or-...\`), Groq (\`gsk_...\`), or DeepSeek.`
        );
        writeDone();
        return;
      }

      // If no custom 3rd party keys are set, stream directly using Google GenAI
      if (collectedKeys.length === 0 && ai) {
        try {
          const contents: any[] = [];
          if (Array.isArray(history) && history.length > 0) {
            history.forEach((msg: any) => {
              if (!msg || !msg.content) return;
              if (msg.role === "user") {
                contents.push({ role: "user", parts: [{ text: String(msg.content) }] });
              } else if (msg.role === "assistant") {
                contents.push({ role: "model", parts: [{ text: String(msg.content) }] });
              }
            });
          }
          if (contents.length === 0) {
            contents.push({ role: "user", parts: [{ text: userPromptContent }] });
          }

          const stream = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents,
            config: {
              systemInstruction: specializedSystemPrompt,
              temperature: 0.7,
              ...(shouldPerformSearch ? { tools: [{ googleSearch: {} }] } : {})
            }
          });

          for await (const chunk of stream) {
            if (abortController.signal.aborted) break;
            const chunkText = chunk.text;
            if (chunkText) {
              writeChunk(chunkText);
            }
          }
          writeDone();
          return;
        } catch (err: any) {
          writeError(`Gemini Swarm stream failed for ${modelName}: ${err?.message || "Unknown error"}`);
          return;
        }
      }

      let accumulatedContent = "";
      let hasStreamedSuccessfully = false;
      let lastErrorMessage = "";

      // Prioritize keys using resilience gateway (healthiest and lowest failure rate first)
      const healthySortedKeys = apiGateway.prioritizeKeys(collectedKeys);
      const orderedKeys = [
        healthySortedKeys[targetSlotIndex % healthySortedKeys.length],
        ...healthySortedKeys.filter((_, i) => i !== (targetSlotIndex % healthySortedKeys.length))
      ];

      // Stagger slightly ONLY in Swarm mode to avoid burst rate limits (Zero delay in Performance mode)
      if (index > 0 && !isContinuationReq && isSwampMode && !isPerformanceMode) {
        await new Promise(r => setTimeout(r, Math.min(index * 40, 200)));
      }

      const conversationMessages: any[] = [];

      // Strict continuation rules
      const continuationInstructions = `\n\n[STRICT CODE CONTINUATION PROTOCOL]\nYour previous output reached a length limit and stopped mid-code. You MUST resume writing the code immediately from the exact character where it stopped.\nABSOLUTE RULES:\n1. NEVER output conversational greetings (e.g. 'Here is the rest', 'Sure', 'Below is', 'Continuing', '<!-- index.html -->').\n2. NEVER restart the file from <!DOCTYPE html>, <html>, imports, or line 1.\n3. If the cutoff was inside an open code block, do NOT open a new \`\`\` code fence. Output pure code statements to finish the open block, then close with \`\`\`.\n4. Output ONLY the remaining uninterrupted code until 100% complete.`;

      if (Array.isArray(history) && history.length > 0) {
        conversationMessages.push({
          role: "system",
          content: `${specializedSystemPrompt}${isContinuationReq ? continuationInstructions : ""}`
        });

        const slotMessages: any[] = [];
        history.forEach((msg: any) => {
          if (!msg || !msg.content) return;
          if (msg.role === "assistant") {
            if (typeof msg.modelIndex === "number" && msg.modelIndex !== targetSlotIndex) {
              return;
            }
            const contentStr = String(msg.content).trim();
            if (contentStr.length > 0) {
              const contextSnippet = contentStr.length > 4000 ? contentStr.slice(-4000) : contentStr;
              slotMessages.push({
                role: "assistant",
                content: contextSnippet
              });
            }
          } else if (msg.role === "user") {
            let userContent = String(msg.content);
            if (msg.isContinuation || msg.continuationMarker) {
              userContent = `[CONTINUATION REQUEST] Continue the code immediately from where your previous assistant message ended. Do not repeat anything from above, do not restart from line 1, and do not write any intro greetings. Output only the remaining code.`;
            }
            slotMessages.push({
              role: "user",
              content: userContent
            });
          }
        });

        // Ensure strictly alternating user -> assistant dialogue pairs for prior turns
        // This ensures the AI model has clean conversational context without repeating or hallucinating
        const cleanHistory: any[] = [];
        for (let i = 0; i < slotMessages.length; i++) {
          const current = slotMessages[i];
          const isLast = i === slotMessages.length - 1;
          
          if (current.role === "user") {
            if (isLast) {
              cleanHistory.push(current);
            } else {
              const next = slotMessages[i + 1];
              if (next && next.role === "assistant" && typeof next.content === "string" && next.content.trim().length > 0) {
                cleanHistory.push(current);
                cleanHistory.push(next);
                i++; // skip next as it is consumed
              }
            }
          }
        }

        conversationMessages.push(...cleanHistory);
      } else if (isContinuationReq && (continuation?.fullText || continuation?.previousTail)) {
        const fullPrior = String(continuation.fullText || continuation.previousTail);
        const contextSnippet = fullPrior.length > 4000 ? fullPrior.slice(-4000) : fullPrior;

        conversationMessages.push(
          {
            role: "system",
            content: `${specializedSystemPrompt}${continuationInstructions}`
          },
          {
            role: "user",
            content: prompt
          },
          {
            role: "assistant",
            content: contextSnippet
          },
          {
            role: "user",
            content: "Continue the code immediately from where your previous assistant message ended. Do not repeat anything from above, do not restart from line 1, and do not write any intro greetings. Output only the remaining code."
          }
        );
      } else {
        conversationMessages.push(
          { role: "system", content: specializedSystemPrompt },
          { role: "user", content: userPromptContent }
        );
      }

      if (image) {
        const lastUserIdx = conversationMessages.map(m => m.role).lastIndexOf("user");
        const multiModalContent = [
          { type: "text", text: userPromptContent || prompt },
          { type: "image_url", image_url: { url: image } }
        ];

        if (lastUserIdx !== -1) {
          conversationMessages[lastUserIdx] = {
            role: "user",
            content: multiModalContent
          };
        } else {
          conversationMessages.push({
            role: "user",
            content: multiModalContent
          });
        }
      }

      // Max passes for Vibe Coding self-healing and Autonomous Tool Calling (Terminal, Search, Site Fetch)
      const maxPasses = isVibeMode ? 4 : 3;

      for (let pass = 0; pass < maxPasses; pass++) {
        if (abortController.signal.aborted) break;

        let passCompleted = false;

        for (const dedicatedKey of orderedKeys) {
          if (passCompleted || abortController.signal.aborted) break;

          const isGroq = dedicatedKey.startsWith("gsk_");
          const isNvidia = dedicatedKey.startsWith("nvapi-");
          const isDeepSeekDirect = dedicatedKey.startsWith("sk-") && !dedicatedKey.startsWith("sk-or-") && dedicatedKey.length === 35;

          let endpoint = "https://openrouter.ai/api/v1/chat/completions";
          let requestHeaders: Record<string, string> = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${dedicatedKey}`,
            "Accept": "text/event-stream"
          };

          const candidateModels: string[] = [];

          if (isGroq) {
            endpoint = "https://api.groq.com/openai/v1/chat/completions";
            const groqList = GROQ_MODEL_MAP[modelId] || (isSwampMode ? swarmRole.groqCandidates : GROQ_MODEL_MAP["default"]);
            candidateModels.push(...groqList);
          } else if (isNvidia) {
            endpoint = "https://integrate.api.nvidia.com/v1/chat/completions";
            const cleanId = modelId.startsWith("nvidia/moonshotai/") ? modelId.replace("nvidia/", "") : modelId;
            if (VERIFIED_NVIDIA_NIM_MODELS.has(cleanId)) {
              candidateModels.push(cleanId);
            }
            const nList = NVIDIA_MODEL_MAP[modelId] || NVIDIA_MODEL_MAP[cleanId] || (isSwampMode ? swarmRole.nvidiaCandidates : PROVEN_NVIDIA_MODELS);
            nList.forEach(c => {
              if (!candidateModels.includes(c)) candidateModels.push(c);
            });
            swarmRole.nvidiaCandidates.forEach(c => {
              if (!candidateModels.includes(c)) candidateModels.push(c);
            });
            PROVEN_NVIDIA_MODELS.forEach(c => {
              if (!candidateModels.includes(c)) candidateModels.push(c);
            });
          } else if (isDeepSeekDirect) {
            endpoint = "https://api.deepseek.com/chat/completions";
            candidateModels.push("deepseek-chat", "deepseek-reasoner");
          } else {
            // OpenRouter Default
            endpoint = "https://openrouter.ai/api/v1/chat/completions";
            requestHeaders["HTTP-Referer"] = "https://omnimodel.ai";
            requestHeaders["X-Title"] = "OmniModel Swarm";

            if (modelId && !modelId.startsWith("meta/llama-3.1")) {
              candidateModels.push(modelId);
            }

            const orList = OPENROUTER_MODEL_MAP[modelId] || (isSwampMode ? swarmRole.openRouterCandidates : ["deepseek/deepseek-chat", "meta-llama/llama-3.3-70b-instruct"]);
            orList.forEach(c => {
              if (!candidateModels.includes(c)) candidateModels.push(c);
            });
            swarmRole.openRouterCandidates.forEach(c => {
              if (!candidateModels.includes(c)) candidateModels.push(c);
            });
            if (!candidateModels.includes("deepseek/deepseek-chat")) candidateModels.push("deepseek/deepseek-chat");
            if (!candidateModels.includes("meta-llama/llama-3.3-70b-instruct:free")) candidateModels.push("meta-llama/llama-3.3-70b-instruct:free");
          }

          const keyPrefix = dedicatedKey.slice(0, 10);
          const prioritizedCandidates = apiGateway.prioritizeCandidates(candidateModels, keyPrefix);

          for (const candidate of prioritizedCandidates) {
            if (passCompleted || abortController.signal.aborted) break;
            const routeId = `${keyPrefix}:${candidate}`;
            const anyHealthy = prioritizedCandidates.some(c => apiGateway.isHealthy(`${keyPrefix}:${c}`));
            if (anyHealthy && !apiGateway.isHealthy(routeId)) {
              continue;
            }

            const candidateStart = Date.now();
            let watchdogTimer: NodeJS.Timeout | null = null;
            try {
              const attemptController = new AbortController();
              // Fast connection watchdog: 8s to establish stream
              watchdogTimer = setTimeout(() => attemptController.abort(), 8000);

              const requestPayload: any = {
                  model: candidate,
                  messages: conversationMessages,
                  temperature: isVibeMode ? 0.7 : 0.6,
                  top_p: 0.95,
                  max_tokens: 8192,
                  stream: true
                };

                // Add frequency & presence penalties to prevent token repetition loops
                if (!candidate.includes("vision") && !candidate.includes("fuyu")) {
                  requestPayload.frequency_penalty = 0.15;
                  requestPayload.presence_penalty = 0.1;
                }

                const apiRes = await fetch(endpoint, {
                  method: "POST",
                  headers: requestHeaders,
                  body: JSON.stringify(requestPayload),
                  signal: attemptController.signal
                });

                if (!apiRes.ok || !apiRes.body) {
                  if (watchdogTimer) clearTimeout(watchdogTimer);
                  const errText = await apiRes.text().catch(() => "");
                  lastErrorMessage = `HTTP ${apiRes.status}: ${errText.slice(0, 160)}`;
                  apiGateway.recordFailure(routeId, apiRes.status, errText);
                  continue;
                }

                // Connected and stream open! Upgrade watchdog to 120s for full derivation/reasoning
                if (watchdogTimer) clearTimeout(watchdogTimer);
                watchdogTimer = setTimeout(() => attemptController.abort(), 120000);

                const reader = apiRes.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";
                let streamedAnyChunk = false;
                let currentPassChunk = "";

                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split("\n");
                  buffer = lines.pop() || "";

                  let streamFinished = false;
                  for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    if (trimmed === "data: [DONE]" || trimmed === "[DONE]") {
                      streamFinished = true;
                      break;
                    }
                    if (trimmed.startsWith("data: ")) {
                      try {
                        const parsed = JSON.parse(trimmed.slice(6));
                        const delta = parsed.choices?.[0]?.delta?.content || "";
                        if (delta) {
                          streamedAnyChunk = true;
                          currentPassChunk += delta;
                          accumulatedContent += delta;

                          // Online Repetition Breaker: immediately terminate infinite repetitive loops
                          if (detectRepetitionLoop(accumulatedContent)) {
                            console.warn(`[Repetition Breaker] Detected infinite repetition loop in model ${candidate}. Halting stream gracefully.`);
                            streamFinished = true;
                            break;
                          }

                          writeChunk(delta);
                        }
                      } catch {
                        // Fragment ignore
                      }
                    }
                  }
                  if (streamFinished) break;
                }

              if (watchdogTimer) clearTimeout(watchdogTimer);

              if (streamedAnyChunk) {
                apiGateway.recordSuccess(routeId, Date.now() - candidateStart);
                hasStreamedSuccessfully = true;
                passCompleted = true;
                break;
              }
            } catch (err: any) {
              if (watchdogTimer) clearTimeout(watchdogTimer);
              apiGateway.recordFailure(routeId, 0, err?.message || "Timeout");
              lastErrorMessage = err?.message || "Connection timeout";
            }
          }
        }

        // If no pass succeeded, break out
        if (!passCompleted) break;

        // Autonomous Agent Tool Execution: <terminal>, <web_search>, <fetch_site>
        let hasExecutedTool = false;

        // 1. Terminal Command Execution Tool
        const terminalMatches = [...currentPassChunk.matchAll(/<terminal>([\s\S]*?)<\/terminal>/gi)];
        if (terminalMatches.length > 0 && pass < maxPasses - 1) {
          hasExecutedTool = true;
          for (const match of terminalMatches) {
            const rawCmd = match[1].trim();
            if (!rawCmd) continue;
            console.log(`[Autonomous AI Terminal] Model ${candidate} executing: ${rawCmd}`);
            const termRes = await runTerminalCommand(rawCmd, 15000);
            const resultTag = `\n<terminal_result command="${encodeURIComponent(rawCmd)}" exit_code="${termRes.exitCode}" duration_ms="${termRes.durationMs}">\n${termRes.stdout || termRes.stderr || "(Command completed with no output)"}\n</terminal_result>\n`;
            writeChunk(resultTag);
            accumulatedContent += resultTag;

            conversationMessages.push({
              role: "assistant",
              content: accumulatedContent
            });
            conversationMessages.push({
              role: "user",
              content: `[TERMINAL EXECUTION RESULT for: \`${rawCmd}\`]\nExit Code: ${termRes.exitCode} (${termRes.durationMs}ms)\nOutput:\n${termRes.stdout || termRes.stderr || "(no output)"}\n\nRead this real terminal output above, verify it, and provide your direct verified answer to the user.`
            });
          }
        }

        // 2. Web Search Tool
        const searchMatches = [...currentPassChunk.matchAll(/<web_search>([\s\S]*?)<\/web_search>/gi)];
        if (searchMatches.length > 0 && pass < maxPasses - 1) {
          hasExecutedTool = true;
          for (const match of searchMatches) {
            const query = match[1].trim();
            if (!query) continue;
            console.log(`[Autonomous AI Web Search] Model ${candidate} searching: ${query}`);
            const searchResults = await searchGoogleWeb(query, 5);
            const formatted = searchResults.map((r, i) => `${i + 1}. [${r.title}](${r.link})\n${r.snippet}`).join("\n\n") || "No search results found.";
            const resultTag = `\n<web_search_result query="${encodeURIComponent(query)}">\n${formatted}\n</web_search_result>\n`;
            writeChunk(resultTag);
            accumulatedContent += resultTag;

            conversationMessages.push({
              role: "assistant",
              content: accumulatedContent
            });
            conversationMessages.push({
              role: "user",
              content: `[LIVE SEARCH RESULTS for: "${query}"]:\n${formatted}\n\nNow provide your direct answer citing the sources found.`
            });
          }
        }

        // 3. Site Fetch Tool
        const fetchMatches = [...currentPassChunk.matchAll(/<fetch_site>([\s\S]*?)<\/fetch_site>/gi)];
        if (fetchMatches.length > 0 && pass < maxPasses - 1) {
          hasExecutedTool = true;
          for (const match of fetchMatches) {
            const url = match[1].trim();
            if (!url) continue;
            console.log(`[Autonomous AI Site Fetch] Model ${candidate} reading site: ${url}`);
            const siteData = await fetchSiteCleanText(url);
            const resultTag = `\n<fetch_site_result url="${encodeURIComponent(url)}" title="${encodeURIComponent(siteData.title)}">\n${siteData.content.slice(0, 4000)}\n</fetch_site_result>\n`;
            writeChunk(resultTag);
            accumulatedContent += resultTag;

            conversationMessages.push({
              role: "assistant",
              content: accumulatedContent
            });
            conversationMessages.push({
              role: "user",
              content: `[WEBPAGE CONTENT for: ${url} (Title: ${siteData.title})]:\n${siteData.content.slice(0, 4000)}\n\nNow answer the user using the webpage content above.`
            });
          }
        }

        if (hasExecutedTool) {
          continue;
        }

        // Comprehensive Truncation / Interruption Detection
        const trimmedAcc = accumulatedContent.trim();
        const codeBlockOccurrences = (accumulatedContent.match(/```/g) || []).length;
        const isCodeBlockOpen = codeBlockOccurrences % 2 !== 0;
        const endsAbruptly = /(?:function|class|interface|const|let|var|return|if|else|switch|case|default|import|export)\s*[^;{}()]*$/i.test(trimmedAcc)
          || /[({[=,:+\-*\/\\|&!~?]\s*$/.test(trimmedAcc)
          || trimmedAcc.endsWith("...")
          || (trimmedAcc.includes("<html") && !trimmedAcc.includes("</html>"))
          || (trimmedAcc.includes("<body") && !trimmedAcc.includes("</body>"))
          || (trimmedAcc.includes("<script") && !trimmedAcc.includes("</script>"))
          || (trimmedAcc.includes("<style") && !trimmedAcc.includes("</style>"));

        if ((isCodeBlockOpen || endsAbruptly) && pass < maxPasses - 1) {
          // Add continuation message and proceed to next pass
          conversationMessages.push({ role: "assistant", content: accumulatedContent });
          conversationMessages.push({
            role: "user",
            content: "Resume writing the complete implementation immediately from the exact character where you stopped. Do not output conversational greetings, do not repeat already generated code, and complete all functions, styles, and closing tags."
          });
        } else {
          // Finished completely
          break;
        }
      }

      // If finished with successful chunks
      if (hasStreamedSuccessfully) {
        writeDone();
        return;
      }

      // If third-party keys failed, try Google GenAI as reliable fallback
      if (!hasStreamedSuccessfully && !abortController.signal.aborted && ai) {
        try {
          const contents: any[] = [];
          if (Array.isArray(history) && history.length > 0) {
            history.forEach((msg: any) => {
              if (!msg || !msg.content) return;
              if (msg.role === "user") {
                contents.push({ role: "user", parts: [{ text: String(msg.content) }] });
              } else if (msg.role === "assistant" && (typeof msg.modelIndex !== "number" || msg.modelIndex === targetSlotIndex)) {
                contents.push({ role: "model", parts: [{ text: String(msg.content) }] });
              }
            });
          }
          if (contents.length === 0) {
            contents.push({ role: "user", parts: [{ text: userPromptContent }] });
          }

          const stream = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents,
            config: {
              systemInstruction: specializedSystemPrompt,
              temperature: 0.7,
            }
          });

          for await (const chunk of stream) {
            if (abortController.signal.aborted) break;
            const chunkText = chunk.text;
            if (chunkText) {
              writeChunk(chunkText);
            }
          }
          writeDone();
          return;
        } catch (err: any) {
          writeError(`${modelName} execution error: ${lastErrorMessage || err?.message || "Unknown error"}`);
          return;
        }
      }

      // If no candidate streamed, report direct real model status to the slot
      if (!hasStreamedSuccessfully && !abortController.signal.aborted) {
        if (lastErrorMessage) {
          writeError(`${modelName} execution error: ${lastErrorMessage}`);
        } else {
          writeError(`${modelName} ready. Please verify your API key in Settings.`);
        }
      }
    });

    await Promise.allSettled(streamPromises);
    res.write("data: [DONE]\n\n");
    if (typeof (res as any).flush === "function") (res as any).flush();
    res.end();
  };

  app.post("/api/stream", handleStreamRequest);
  app.post("/api/swarm", handleStreamRequest);
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", port: PORT, timestamp: Date.now() });
  });
  app.get("/api/gateway/stats", (req, res) => {
    res.json({
      status: "online",
      routes: apiGateway.getDiagnostics(),
      timestamp: Date.now()
    });
  });
  app.get("/api/gateway/reset", (req, res) => {
    apiGateway.resetAll();
    res.json({ status: "reset", message: "All circuit breakers and metrics cleared" });
  });

  // Dedicated Live Google/Web Search endpoint
  app.get("/api/search", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q) return res.json({ query: "", results: [] });
      const results = await searchGoogleWeb(q, 8);
      res.json({ query: q, results });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Search failed" });
    }
  });

  // Dedicated Resilient Image Generation & Proxy Engine
  // Serializes parallel requests, caches images in memory, retries on 429, and falls back gracefully so NO image is ever broken
  const imageMemoryCache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();
  let imageQueuePromise = Promise.resolve();

  app.get("/api/image", async (req, res) => {
    const rawPrompt = String(req.query.prompt || req.query.p || "").trim();
    if (!rawPrompt) {
      return res.status(400).send("Prompt is required");
    }

    const cleanPrompt = rawPrompt
      .replace(/[\\\[\](){}]/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 280);

    const width = parseInt(String(req.query.width || "1024"), 10) || 1024;
    const height = parseInt(String(req.query.height || "1024"), 10) || 1024;
    const seed = req.query.seed || Math.floor(Math.random() * 1000000);
    const model = req.query.model || "flux";

    const cacheKey = `${cleanPrompt.toLowerCase()}_${width}x${height}`;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

    if (imageMemoryCache.has(cacheKey)) {
      const cached = imageMemoryCache.get(cacheKey)!;
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(cached.buffer);
    }

    const executeGeneration = async () => {
      // Tier 1: Real Distributed Stable Diffusion / Flux GPU Cluster (AI Horde)
      try {
        const hordeController = new AbortController();
        const hordeTimeout = setTimeout(() => hordeController.abort(), 20000);
        const submitRes = await fetch("https://aihorde.net/api/v2/generate/async", {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": "0000000000" },
          body: JSON.stringify({
            prompt: `${cleanPrompt}, 8k resolution, photorealistic, cinematic lighting, masterpiece`,
            params: { width: 512, height: 512, steps: 20, cfg_scale: 7 }
          }),
          signal: hordeController.signal
        });
        const subData = await submitRes.json();
        
        if (subData.id) {
          const id = subData.id;
          for (let i = 0; i < 11; i++) {
            await new Promise(r => setTimeout(r, 1500));
            const checkRes = await fetch(`https://aihorde.net/api/v2/generate/check/${id}`, {
              headers: { "apikey": "0000000000" },
              signal: hordeController.signal
            });
            const checkData = await checkRes.json();
            if (checkData.done) {
              const finalRes = await fetch(`https://aihorde.net/api/v2/generate/status/${id}`, {
                headers: { "apikey": "0000000000" },
                signal: hordeController.signal
              });
              const finalData = await finalRes.json();
              const imgUrl = finalData.generations?.[0]?.img;
              if (imgUrl) {
                const imgFetch = await fetch(imgUrl);
                if (imgFetch.ok) {
                  const arrayBuf = await imgFetch.arrayBuffer();
                  const buffer = Buffer.from(arrayBuf);
                  const contentType = imgFetch.headers.get("content-type") || "image/webp";
                  imageMemoryCache.set(cacheKey, { buffer, contentType, timestamp: Date.now() });
                  res.setHeader("Content-Type", contentType);
                  res.setHeader("Cache-Control", "public, max-age=86400");
                  clearTimeout(hordeTimeout);
                  return res.send(buffer);
                }
              }
              break;
            }
          }
        }
        clearTimeout(hordeTimeout);
      } catch (err) {
        // Fall through to Tier 2
      }

      // Tier 2: Real AI Generation (Linear attention diffusion via Pollinations)
      try {
        const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=${width}&height=${height}&model=${model}&nologo=true&seed=${seed}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const pollRes = await fetch(pollinationsUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (pollRes.ok) {
          const contentType = pollRes.headers.get("content-type") || "image/jpeg";
          if (contentType.startsWith("image/")) {
            const arrayBuf = await pollRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuf);
            if (buffer.length > 5000) {
              imageMemoryCache.set(cacheKey, { buffer, contentType, timestamp: Date.now() });
              res.setHeader("Content-Type", contentType);
              res.setHeader("Cache-Control", "public, max-age=86400");
              return res.send(buffer);
            }
          }
        }
      } catch (err) {
        // Fall through to Tier 3
      }

      // Tier 3: High-Res 1080p Real Photography / Digital Art via Unsplash
      try {
        const keywords = cleanPrompt
          .replace(/[^a-zA-Z0-9\s]/g, " ")
          .split(/\s+/)
          .filter(w => w.length > 2 && !["the","and","for","with","aspect","ratio","clean","guidance","scale","steps","negative"].includes(w.toLowerCase()))
          .slice(0, 4)
          .join(" ");

        const unsplashUrl = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(keywords || "cinematic space cosmos")}&per_page=5`;
        const uController = new AbortController();
        const uTimeout = setTimeout(() => uController.abort(), 6000);
        const uRes = await fetch(unsplashUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          signal: uController.signal
        });
        clearTimeout(uTimeout);

        if (uRes.ok) {
          const uData = await uRes.json();
          const imgObj = uData.results?.[0];
          const imgUrl = imgObj?.urls?.regular || imgObj?.urls?.full;
          if (imgUrl) {
            const fetchImg = await fetch(imgUrl);
            if (fetchImg.ok) {
              const arrayBuf = await fetchImg.arrayBuffer();
              const buffer = Buffer.from(arrayBuf);
              const contentType = fetchImg.headers.get("content-type") || "image/jpeg";
              imageMemoryCache.set(cacheKey, { buffer, contentType, timestamp: Date.now() });
              res.setHeader("Content-Type", contentType);
              res.setHeader("Cache-Control", "public, max-age=86400");
              return res.send(buffer);
            }
          }
        }
      } catch (err) {
        // Fall through
      }

      res.status(504).send("Image generation timed out");
    };

    imageQueuePromise = imageQueuePromise.then(async () => {
      try {
        await executeGeneration();
      } catch (err) {
        if (!res.headersSent) res.status(500).send("Generation failed");
      }
      await new Promise(r => setTimeout(r, 250));
    });
  });

  // Dedicated image proxy endpoint to bypass CORS and rate-limit queueing for external images
  app.get("/api/image-proxy", async (req, res) => {
    const targetUrl = String(req.query.url || "").trim();
    if (!targetUrl || !targetUrl.startsWith("http")) {
      return res.status(400).send("Valid URL required");
    }

    try {
      const response = await fetch(targetUrl, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      if (!response.ok) {
        // Fall back to /api/image with prompt extracted from url
        const promptMatch = targetUrl.match(/prompt\/([^?]+)/);
        if (promptMatch) {
          const prompt = decodeURIComponent(promptMatch[1]);
          return res.redirect(`/api/image?prompt=${encodeURIComponent(prompt)}`);
        }
        return res.status(response.status).send("Failed to load image");
      }
      const contentType = response.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    } catch (err: any) {
      res.status(500).send("Proxy error: " + (err?.message || "Unknown"));
    }
  });


  // Local storage endpoint for persistent AI memories (data/memories.json)
  const MEMORIES_FILE = path.join(process.cwd(), "data", "memories.json");

  app.get("/api/memories", (req, res) => {
    try {
      if (fs.existsSync(MEMORIES_FILE)) {
        const raw = fs.readFileSync(MEMORIES_FILE, "utf8");
        const data = JSON.parse(raw);
        if (Array.isArray(data)) return res.json({ memories: data });
      }
    } catch {}
    res.json({ memories: null });
  });

  app.post("/api/memories", (req, res) => {
    try {
      const { memories } = req.body;
      if (Array.isArray(memories)) {
        const dir = path.join(process.cwd(), "data");
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2), "utf8");
        return res.json({ status: "saved", count: memories.length });
      }
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
    res.status(400).json({ error: "Invalid memories array" });
  });

  // AI & User Terminal Execution Engine: runs real commands & scripts with safety timeout
  app.post("/api/terminal", async (req, res) => {
    const { command, language, code, cwd, timeout = 12000 } = req.body;
    const startTime = Date.now();
    let cmdToRun = (command || "").trim();

    if (!cmdToRun && code) {
      const lang = (language || "").toLowerCase();
      if (lang === "javascript" || lang === "js" || lang === "node" || lang === "typescript" || lang === "ts") {
        const tmpFile = path.join(os.tmpdir(), `hems_run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.mjs`);
        try {
          fs.writeFileSync(tmpFile, code, "utf8");
          cmdToRun = `node "${tmpFile}"`;
        } catch (e: any) {
          return res.json({ success: false, stdout: "", stderr: e.message, exitCode: 1, durationMs: Date.now() - startTime });
        }
      } else if (lang === "python" || lang === "py") {
        const tmpFile = path.join(os.tmpdir(), `hems_run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.py`);
        try {
          fs.writeFileSync(tmpFile, code, "utf8");
          const pythonCmd = process.platform === "win32" ? "python" : "python3";
          cmdToRun = `${pythonCmd} "${tmpFile}"`;
        } catch (e: any) {
          return res.json({ success: false, stdout: "", stderr: e.message, exitCode: 1, durationMs: Date.now() - startTime });
        }
      } else if (lang === "sh" || lang === "bash" || lang === "shell") {
        cmdToRun = code;
      } else {
        cmdToRun = code;
      }
    }

    if (!cmdToRun) {
      return res.status(400).json({ error: "Missing command or code to execute" });
    }

    try {
      exec(
        cmdToRun,
        {
          timeout: Math.min(timeout, 30000),
          maxBuffer: 1024 * 1024 * 4,
          cwd: cwd || process.cwd(),
          env: { ...process.env, FORCE_COLOR: "0" }
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - startTime;
          const exitCode = error ? (typeof (error as any).code === "number" ? (error as any).code : 1) : 0;
          res.json({
            success: !error,
            stdout: stdout || "",
            stderr: stderr || (error && !stdout ? error.message : ""),
            exitCode,
            durationMs,
            command: cmdToRun
          });
        }
      );
    } catch (err: any) {
      res.status(500).json({
        success: false,
        stdout: "",
        stderr: err?.message || "Execution failed",
        exitCode: 1,
        durationMs: Date.now() - startTime
      });
    }
  });

  // Dedicated Web Search API Endpoint
  app.all("/api/search", async (req, res) => {
    try {
      const rawQuery = String(req.query.q || req.body?.q || req.body?.query || "").trim();
      if (!rawQuery) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      const maxResults = parseInt(String(req.query.max || req.body?.max || 5), 10) || 5;
      const results = await searchGoogleWeb(rawQuery, maxResults);
      res.json({ query: rawQuery, results, count: results.length });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Search failed", results: [] });
    }
  });

  // Website Content Fetcher & Reader Engine (Clean text & structure for AI & reader view)
  app.all("/api/fetch-site", async (req, res) => {
    const targetUrl = String(req.query.url || req.body?.url || "").trim();
    if (!targetUrl || !targetUrl.startsWith("http")) {
      return res.status(400).json({ error: "Valid HTTP/HTTPS URL required" });
    }
    try {
      const siteData = await fetchSiteCleanText(targetUrl);
      res.json({
        success: true,
        url: targetUrl,
        title: siteData.title,
        description: siteData.description,
        content: siteData.content,
        length: siteData.content.length
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to fetch website" });
    }
  });

  // Website Proxy Engine (Strips X-Frame-Options & CSP to render any site in iframe without errors)
  app.get("/api/proxy-site", async (req, res) => {
    const targetUrl = String(req.query.url || "").trim();
    if (!targetUrl || !targetUrl.startsWith("http")) {
      return res.status(400).send("Valid HTTP/HTTPS URL required");
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      clearTimeout(timeout);
      if (!response.ok) {
        return res.status(response.status).send(`Failed to proxy website (${response.status})`);
      }

      const contentType = response.headers.get("content-type") || "text/html";
      if (!contentType.includes("html")) {
        res.setHeader("Content-Type", contentType);
        const buffer = Buffer.from(await response.arrayBuffer());
        return res.send(buffer);
      }

      let html = await response.text();
      const parsedUrl = new URL(targetUrl);
      const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

      if (html.includes("<head>")) {
        html = html.replace("<head>", `<head><base href="${baseUrl}/">`);
      } else if (html.includes("<head ")) {
        html = html.replace(/<head[^>]*>/, `$&<base href="${baseUrl}/">`);
      } else {
        html = `<base href="${baseUrl}/">\n` + html;
      }

      html = html.replace(/if\s*\(\s*top\s*!==\s*self\s*\)/gi, "if(false)");
      html = html.replace(/if\s*\(\s*window\.top\s*!==\s*window\.self\s*\)/gi, "if(false)");

      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("X-Frame-Options", "ALLOWALL");
      res.send(html);
    } catch (err: any) {
      res.status(500).send(`Proxy failed: ${err?.message || "Unknown error"}`);
    }
  });

  if (!isServerless) {
    if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
      try {
        const viteModule = "vite";
        const { createServer: createViteServer } = await import(viteModule);
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
        });
        app.use(vite.middlewares);
      } catch (e) {}
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }

  return app;
}

if (!process.env.VERCEL) {
  createExpressServer(false);
}
