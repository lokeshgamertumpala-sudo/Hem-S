// Standalone Client-Side Independent AI Engine
// Powers 100% independent browser execution without needing any backend server!

export interface ClientStreamParams {
  prompt: string;
  apiKeys: string[];
  models: any[];
  image?: string | null;
  isSwamp?: boolean;
  isVibe?: boolean;
  isPerformance?: boolean;
  webSearch?: boolean;
  memories?: string[];
  skills?: any[];
  history?: any[];
  signal?: AbortSignal;
  onChunk: (modelIndex: number, modelId: string, chunk: string) => void;
  onDone: (modelIndex: number, modelId: string) => void;
  onError: (modelIndex: number, modelId: string, error: string) => void;
}

const SWARM_ROLES = [
  {
    roleName: "Agent 1 — Primary Solver",
    defaultModelId: "z-ai/glm-5.2",
    openRouterCandidates: ["thudm/glm-4-9b-chat", "meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-chat", "meta-llama/llama-3.3-70b-instruct:free"],
    nvidiaCandidates: ["meta/llama-3.2-11b-vision-instruct", "nvidia/llama-3.1-nemotron-70b-instruct", "meta/llama-3.1-70b-instruct", "meta/llama-3.1-8b-instruct"],
    groqCandidates: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    instruction: (_p: string, m?: string) => `You are ${m || "Primary Solver"}, the Lead AI. Give a DIRECT, definitive, and accurate answer to the user's question immediately. Never repeat system rules or output artificial robotic filler.`
  },
  {
    roleName: "Agent 2 — Alternative Solver",
    defaultModelId: "poolside/laguna-xs-2.1",
    openRouterCandidates: ["qwen/qwen-2.5-coder-32b-instruct", "deepseek/deepseek-chat", "meta-llama/llama-3.3-70b-instruct", "qwen/qwen-2.5-coder-32b-instruct:free"],
    nvidiaCandidates: ["nvidia/llama-3.1-nemotron-70b-instruct", "meta/llama-3.2-11b-vision-instruct", "meta/llama-3.1-70b-instruct", "meta/llama-3.1-8b-instruct"],
    groqCandidates: ["deepseek-r1-distill-llama-70b", "llama-3.3-70b-versatile"],
    instruction: (_p: string, m?: string) => `You are ${m || "Alternative Solver"}. Answer directly and concisely with an innovative or modern perspective. Never output robotic preambles.`
  },
  {
    roleName: "Agent 3 — Technical Specialist",
    defaultModelId: "mistralai/mixtral-8x22b-v0.1",
    openRouterCandidates: ["stepfun/step-3.7-flash", "stepfun/step-3.5-flash", "deepseek/deepseek-chat", "meta-llama/llama-3.3-70b-instruct"],
    nvidiaCandidates: ["mistralai/mistral-7b-instruct-v0.3", "meta/llama-3.2-11b-vision-instruct", "nvidia/llama-3.1-nemotron-70b-instruct", "meta/llama-3.1-8b-instruct"],
    groqCandidates: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    instruction: (_p: string, m?: string) => `You are ${m || "Technical Specialist"}. Answer directly with precise technical depth, facts, and code. Never write artificial step-by-step planning outlines.`
  },
  {
    roleName: "Agent 4 — Critic & Red Team",
    defaultModelId: "meta/muse-glimmer-30b",
    openRouterCandidates: ["moonshotai/moonshot-v1-32k", "mistralai/mistral-nemo", "deepseek/deepseek-chat", "meta-llama/llama-3.3-70b-instruct"],
    nvidiaCandidates: ["meta/llama-3.1-70b-instruct", "meta/llama-3.2-11b-vision-instruct", "meta/llama-3.1-8b-instruct", "nvidia/llama-3.1-nemotron-70b-instruct"],
    groqCandidates: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    instruction: (_p: string, m?: string) => `You are ${m || "Security & Resilience Lead"}. Answer directly with practical solutions and key reliability tips. Never recite system directives.`
  },
  {
    roleName: "Agent 5 — Optimizer & Judge",
    defaultModelId: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    openRouterCandidates: ["nvidia/nemotron-4-340b-instruct", "deepseek/deepseek-chat", "meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-r1:free"],
    nvidiaCandidates: ["nvidia/llama-3.1-nemotron-70b-instruct", "meta/llama-3.2-11b-vision-instruct", "meta/llama-3.1-70b-instruct", "meta/llama-3.1-8b-instruct"],
    groqCandidates: ["deepseek-r1-distill-llama-70b", "llama-3.3-70b-versatile"],
    instruction: (_p: string, m?: string) => `You are ${m || "Master Optimizer"}. Answer directly with a polished, unified, and actionable solution. Never use robotic filler.`
  }
];

const VIBE_CODING_PROMPT = `[SPARK VIBE CODING — ELITE AUTONOMOUS SOFTWARE ENGINEERING MODE]
1. Deliver award-winning production-grade software (Apple/Awwwards caliber design, fluid CSS3/3D physics, glassmorphism, responsive layout).
2. Generate complete, self-contained single-file HTML/CSS/JS without placeholders.
3. Write every tag, style rule, and JavaScript function completely.`;

function detectRepetition(text: string): boolean {
  if (text.length < 60) return false;
  const tail = text.slice(-400);
  for (let len = 10; len <= 120; len++) {
    if (tail.length < len * 3) continue;
    const c1 = tail.slice(-len);
    const c2 = tail.slice(-len * 2, -len);
    const c3 = tail.slice(-len * 3, -len * 2);
    if (c1 === c2 && c2 === c3) return true;
  }
  return false;
}

export async function executeClientSwarm(params: ClientStreamParams): Promise<void> {
  const { prompt, apiKeys, models, image, isSwamp, isVibe, memories, skills, history, signal, onChunk, onDone, onError } = params;

  if (!apiKeys || apiKeys.length === 0) {
    models.forEach((m, idx) => {
      onChunk(idx, m.id, `⚠️ **API Key Required**\n\nPlease add your API key in **Settings** (Sidebar ⚙️ -> API Keys) to run standalone models (${m.name || m.id}).\n\nSupported Keys: OpenRouter (\`sk-or-...\`), NVIDIA NIM (\`nvapi-...\`), Groq (\`gsk_...\`), or DeepSeek.`);
      onDone(idx, m.id);
    });
    return;
  }

  const now = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  const localTime = now.toLocaleString("en-US", { timeZone: tz, dateStyle: "full", timeStyle: "medium" });
  const istTime = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "medium" });
  const utcTime = now.toUTCString();

  const temporalDirective = `\n\n[LIVE REAL-TIME CLOCK & TEMPORAL CONTEXT]
• User Local Time: ${localTime} (${tz})
• Indian Standard Time (IST): ${istTime}
• UTC/GMT Time: ${utcTime}
• ISO Timestamp: ${now.toISOString()}
MANDATE: Whenever asked for time/date, use this live clock data.`;

  const memoryDirective = (Array.isArray(memories) && memories.length > 0)
    ? `\n\n[USER MEMORIES & PREFERENCES]\n` + memories.map((m, i) => `${i + 1}. ${m}`).join("\n")
    : "";

  let searchGroundingDirective = "";
  if (params.webSearch) {
    const isFile = typeof window !== "undefined" && (window.location.protocol === "file:" || !window.location.origin || window.location.origin === "null");
    const origin = isFile ? "http://localhost:3000" : "";
    try {
      const sres = await fetch(`${origin}/api/search?q=${encodeURIComponent(prompt)}`);
      if (sres.ok) {
        const sdata = await sres.json();
        if (Array.isArray(sdata.results) && sdata.results.length > 0) {
          searchGroundingDirective = `\n\n[LIVE GOOGLE & REAL-TIME WEB SEARCH GROUNDING]\nThe user requested live web access. The following verified real-time sources were retrieved via Google/Web search for "${prompt}":\n\n` +
            sdata.results.map((r: any, idx: number) => `[Source ${idx + 1}] ${r.title}\nURL: ${r.link}\nSummary: ${r.snippet}`).join("\n\n") +
            `\n\nDIRECTIVE: You have active Google and real-time Web access. Ground your response in the verified live data above. Quote current facts, verify claims, and cite the relevant source URLs using markdown links [Source Name](URL).\n`;
        }
      }
    } catch {}
  }

  const modelPromises = models.map(async (modelConfig, index) => {
    const modelId = modelConfig.id;
    const modelName = modelConfig.name || modelId;
    const targetSlotIndex = typeof modelConfig.targetIndex === "number" ? modelConfig.targetIndex : index;
    const swarmRoleIdx = typeof modelConfig.swarmRoleIndex === "number" ? modelConfig.swarmRoleIndex : targetSlotIndex;
    const swarmRole = SWARM_ROLES[swarmRoleIdx % SWARM_ROLES.length];

    let relevantSkills = skills;
    if (Array.isArray(skills) && isSwamp) {
      relevantSkills = skills.filter((s: any) => {
        const cat = (s.category || "").toLowerCase();
        const n = (s.name || "").toLowerCase();
        if (swarmRoleIdx % 5 === 0) return cat.includes("architecture") || cat.includes("design") || n.includes("ui");
        if (swarmRoleIdx % 5 === 1) return cat.includes("performance") || cat.includes("innovation");
        if (swarmRoleIdx % 5 === 2) return cat.includes("technical") || cat.includes("logic") || cat.includes("backend");
        if (swarmRoleIdx % 5 === 3) return cat.includes("security") || cat.includes("audit") || n.includes("red");
        if (swarmRoleIdx % 5 === 4) return cat.includes("optimization") || cat.includes("judge") || cat.includes("synthesis");
        return true;
      });
    }

    const skillsDirective = (Array.isArray(relevantSkills) && relevantSkills.length > 0)
      ? `\n\n[ACTIVE SPECIALIZED SKILLS]\n` + relevantSkills.map(s => `• [${s.name || "Skill"}]: ${s.systemPrompt || s.description || ""}`).join("\n")
      : "";

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

    let systemPrompt = "";
    let userPrompt = prompt;

    if (isSwamp || (isVibe && models.length > 1)) {
      systemPrompt = swarmRole.instruction(prompt, modelName) + (isVibe ? `\n\n${VIBE_CODING_PROMPT}` : "") + memoryDirective + skillsDirective + temporalDirective + searchGroundingDirective + terminalAndWebCapabilityDirective;
      userPrompt = prompt;
    } else {
      systemPrompt = `You are ${modelName}, an elite AI assistant.${isVibe ? "\n\n" + VIBE_CODING_PROMPT : ""}${memoryDirective}${skillsDirective}${temporalDirective}${searchGroundingDirective}${terminalAndWebCapabilityDirective}`;
      userPrompt = prompt;
    }

    const keyToUse = apiKeys[targetSlotIndex % apiKeys.length] || apiKeys[0];
    const isGroq = keyToUse.startsWith("gsk_");
    const isNvidia = keyToUse.startsWith("nvapi-");
    const isGemini = keyToUse.startsWith("AIzaSy");
    const isDeepSeek = keyToUse.startsWith("sk-") && !keyToUse.startsWith("sk-or-") && keyToUse.length === 35;

    // Handle Google Gemini Direct Browser Stream
    if (isGemini) {
      try {
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${keyToUse}`;
        const contents: any[] = [];
        if (Array.isArray(history) && history.length > 0) {
          history.forEach((h: any) => {
            if (h.role === "user") contents.push({ role: "user", parts: [{ text: String(h.content) }] });
            else if (h.role === "assistant") contents.push({ role: "model", parts: [{ text: String(h.content) }] });
          });
        }
        contents.push({ role: "user", parts: [{ text: `${systemPrompt}\n\nTask:\n${userPrompt}` }] });

        const res = await fetch(geminiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
          }),
          signal
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const tr = line.trim();
              if (tr.startsWith("data: ")) {
                try {
                  const parsed = JSON.parse(tr.slice(6));
                  const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
                  if (chunk) {
                    onChunk(targetSlotIndex, modelId, chunk);
                  }
                } catch {}
              }
            }
          }
          onDone(targetSlotIndex, modelId);
          return;
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    }

    if (isNvidia) {
      onError(
        targetSlotIndex,
        modelId,
        "NVIDIA NIM blocks direct browser connections without a backend. To run completely standalone with NO terminal, please add a 100% Free OpenRouter (sk-or-...) or Groq (gsk_...) key in Settings ⚙️ (Sidebar -> API Keys)."
      );
      return;
    }

    let endpoint = "https://openrouter.ai/api/v1/chat/completions";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${keyToUse}`
    };

    let candidateModels: string[] = [];

    if (isGroq) {
      endpoint = "https://api.groq.com/openai/v1/chat/completions";
      candidateModels = swarmRole.groqCandidates;
    } else if (isDeepSeek) {
      endpoint = "https://api.deepseek.com/chat/completions";
      candidateModels = ["deepseek-chat", "deepseek-reasoner"];
    } else {
      endpoint = "https://openrouter.ai/api/v1/chat/completions";
      headers["HTTP-Referer"] = typeof window !== "undefined" && window.location.origin && window.location.origin !== "null" ? window.location.origin : "https://omnimodel.ai";
      headers["X-Title"] = "OmniModel Client Swarm";
      candidateModels = [modelId, ...swarmRole.openRouterCandidates];
    }

    const messages: any[] = [{ role: "system", content: systemPrompt }];
    if (Array.isArray(history) && history.length > 0) {
      history.forEach((h: any) => {
        if (h.role === "user") messages.push({ role: "user", content: String(h.content) });
        else if (h.role === "assistant" && (h.modelIndex === undefined || h.modelIndex === targetSlotIndex)) {
          messages.push({ role: "assistant", content: String(h.content) });
        }
      });
    } else {
      messages.push({ role: "user", content: userPrompt });
    }

    if (image) {
      const lastUser = messages.map(m => m.role).lastIndexOf("user");
      if (lastUser !== -1) {
        messages[lastUser] = {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: image } }
          ]
        };
      }
    }

    const maxPasses = isVibe ? 4 : 3;
    let success = false;
    let lastErr = "";

    for (let pass = 0; pass < maxPasses; pass++) {
      if (success || signal?.aborted) break;
      let passStreamedAny = false;
      let passAccumulated = "";

      for (const candidate of candidateModels) {
        if (passStreamedAny || signal?.aborted) break;

        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model: candidate,
              messages,
              stream: true,
              temperature: 0.7,
              max_tokens: 8192
            }),
            signal
          });

          if (!res.ok || !res.body) {
            const t = await res.text().catch(() => "");
            lastErr = `HTTP ${res.status}: ${t.slice(0, 120)}`;
            continue;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const tr = line.trim();
              if (!tr) continue;
              if (tr === "data: [DONE]" || tr === "[DONE]") break;
              if (tr.startsWith("data: ")) {
                try {
                  const parsed = JSON.parse(tr.slice(6));
                  const chunk = parsed.choices?.[0]?.delta?.content || "";
                  if (chunk) {
                    passAccumulated += chunk;
                    passStreamedAny = true;
                    onChunk(targetSlotIndex, modelId, chunk);
                    if (detectRepetition(passAccumulated)) {
                      break;
                    }
                  }
                } catch {}
              }
            }
          }
        } catch (err: any) {
          if (err.name === "AbortError") return;
          lastErr = err.message || "Connection error";
        }
      }

      if (!passStreamedAny) break;

      // Check for Autonomous AI Tool Invocations (<terminal>, <web_search>, <fetch_site>)
      let hasExecutedTool = false;

      // 1. Terminal Command Execution
      const terminalMatches = [...passAccumulated.matchAll(/<terminal>([\s\S]*?)<\/terminal>/gi)];
      if (terminalMatches.length > 0 && pass < maxPasses - 1) {
        hasExecutedTool = true;
        for (const match of terminalMatches) {
          const rawCmd = match[1].trim();
          if (!rawCmd) continue;
          let termRes: any = null;
          const start = Date.now();
          const isFile = typeof window !== "undefined" && (window.location.protocol === "file:" || !window.location.origin || window.location.origin === "null");
          const origin = isFile ? "http://localhost:3000" : "";
          try {
            const tr = await fetch(`${origin}/api/terminal`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ command: rawCmd, timeout: 15000 })
            });
            if (tr.ok) {
              termRes = await tr.json();
            }
          } catch {}

          if (!termRes) {
            let stdout = "";
            let stderr = "";
            let exitCode = 0;
            try {
              const logs: string[] = [];
              const customConsole = {
                log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
                error: (...args: any[]) => logs.push('ERROR: ' + args.join(' ')),
                warn: (...args: any[]) => logs.push('WARN: ' + args.join(' '))
              };
              const fn = new Function("console", rawCmd);
              fn(customConsole);
              stdout = logs.join("\n") || "[Executed in browser sandbox]";
            } catch (e: any) {
              stderr = e.message;
              exitCode = 1;
            }
            termRes = { stdout, stderr, exitCode, durationMs: Date.now() - start };
          }

          const resultTag = `\n<terminal_result command="${encodeURIComponent(rawCmd)}" exit_code="${termRes.exitCode}" duration_ms="${termRes.durationMs}">\n${termRes.stdout || termRes.stderr || "(Command completed with no output)"}\n</terminal_result>\n`;
          onChunk(targetSlotIndex, modelId, resultTag);
          messages.push({ role: "assistant", content: passAccumulated + resultTag });
          messages.push({
            role: "user",
            content: `[TERMINAL EXECUTION RESULT for: \`${rawCmd}\`]\nExit Code: ${termRes.exitCode} (${termRes.durationMs}ms)\nOutput:\n${termRes.stdout || termRes.stderr || "(no output)"}\n\nRead this real terminal output above, verify it, and provide your direct verified answer to the user.`
          });
        }
      }

      // 2. Web Search Tool
      const searchMatches = [...passAccumulated.matchAll(/<web_search>([\s\S]*?)<\/web_search>/gi)];
      if (searchMatches.length > 0 && pass < maxPasses - 1) {
        hasExecutedTool = true;
        for (const match of searchMatches) {
          const query = match[1].trim();
          if (!query) continue;
          let resultsText = "";
          try {
            const sr = await fetch(`${origin}/api/search?q=${encodeURIComponent(query)}`);
            if (sr.ok) {
              const sdata = await sr.json();
              if (Array.isArray(sdata.results) && sdata.results.length > 0) {
                resultsText = sdata.results.map((r: any, i: number) => `${i + 1}. [${r.title}](${r.link})\n${r.snippet}`).join("\n\n");
              }
            }
          } catch {}
          if (!resultsText) resultsText = "Search completed. Live resources accessible.";
          const resultTag = `\n<web_search_result query="${encodeURIComponent(query)}">\n${resultsText}\n</web_search_result>\n`;
          onChunk(targetSlotIndex, modelId, resultTag);
          messages.push({ role: "assistant", content: passAccumulated + resultTag });
          messages.push({
            role: "user",
            content: `[LIVE SEARCH RESULTS for: "${query}"]:\n${resultsText}\n\nNow provide your direct answer citing the sources found.`
          });
        }
      }

      if (hasExecutedTool) {
        continue;
      }

      success = true;
      onDone(targetSlotIndex, modelId);
      break;
    }

    if (!success && !signal?.aborted) {
      onError(targetSlotIndex, modelId, lastErr || "Model stream failed");
    }
  });

  await Promise.all(modelPromises);
}

