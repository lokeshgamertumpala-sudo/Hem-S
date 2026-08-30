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
    nvidiaCandidates: ["meta/llama-3.2-11b-vision-instruct", "meta/muse-glimmer-30b", "nvidia/llama-3.1-nemotron-70b-instruct"],
    groqCandidates: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    instruction: (p: string, m?: string) => `[SWARM ORCHESTRATOR — AGENT 1: PRIMARY SOLVER (LEAD ARCHITECT)]\nYou are ${m || "Agent 1"}, the Lead Primary Solver and Master Architect.\nCORE DIRECTIVE: Deliver the definitive master implementation for: "${p}". Complete code with zero placeholders.`
  },
  {
    roleName: "Agent 2 — Alternative Solver",
    defaultModelId: "poolside/laguna-xs-2.1",
    openRouterCandidates: ["qwen/qwen-2.5-coder-32b-instruct", "deepseek/deepseek-chat", "meta-llama/llama-3.3-70b-instruct", "qwen/qwen-2.5-coder-32b-instruct:free"],
    nvidiaCandidates: ["poolside/laguna-xs-2.1", "meta/llama-3.2-11b-vision-instruct", "meta/muse-glimmer-30b"],
    groqCandidates: ["deepseek-r1-distill-llama-70b", "llama-3.3-70b-versatile"],
    instruction: (p: string, m?: string) => `[SWARM ORCHESTRATOR — AGENT 2: ALTERNATIVE SOLVER]\nYou are ${m || "Agent 2"}, the Alternative Solver.\nCORE DIRECTIVE: Engineer an innovative, distinct, high-performance alternative for: "${p}".`
  },
  {
    roleName: "Agent 3 — Technical Specialist",
    defaultModelId: "mistralai/mixtral-8x22b-v0.1",
    openRouterCandidates: ["stepfun/step-3.7-flash", "stepfun/step-3.5-flash", "deepseek/deepseek-chat", "meta-llama/llama-3.3-70b-instruct"],
    nvidiaCandidates: ["meta/llama-3.2-11b-vision-instruct", "mistralai/mistral-7b-instruct-v0.3", "meta/muse-glimmer-30b"],
    groqCandidates: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    instruction: (p: string, m?: string) => `[SWARM ORCHESTRATOR — AGENT 3: TECHNICAL SPECIALIST]\nYou are ${m || "Agent 3"}, the Technical Specialist.\nCORE DIRECTIVE: Build the deep algorithmic core, state engine, and technical precision for: "${p}".`
  },
  {
    roleName: "Agent 4 — Critic & Red Team",
    defaultModelId: "meta/muse-glimmer-30b",
    openRouterCandidates: ["moonshotai/moonshot-v1-32k", "mistralai/mistral-nemo", "deepseek/deepseek-chat", "meta-llama/llama-3.3-70b-instruct"],
    nvidiaCandidates: ["meta/muse-glimmer-30b", "meta/llama-3.2-11b-vision-instruct"],
    groqCandidates: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    instruction: (p: string, m?: string) => `[SWARM ORCHESTRATOR — AGENT 4: CRITIC & RED TEAM]\nYou are ${m || "Agent 4"}, the Adversarial Critic & Security Lead.\nCORE DIRECTIVE: Audit and produce a bulletproof, hardened implementation for: "${p}".`
  },
  {
    roleName: "Agent 5 — Optimizer & Judge",
    defaultModelId: "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    openRouterCandidates: ["nvidia/nemotron-4-340b-instruct", "deepseek/deepseek-chat", "meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-r1:free"],
    nvidiaCandidates: ["meta/llama-3.2-11b-vision-instruct", "nvidia/llama-3.1-nemotron-70b-instruct", "meta/muse-glimmer-30b"],
    groqCandidates: ["deepseek-r1-distill-llama-70b", "llama-3.3-70b-versatile"],
    instruction: (p: string, m?: string) => `[SWARM ORCHESTRATOR — AGENT 5: MASTER SYNTHESIZER & OPTIMIZER]\nYou are ${m || "Agent 5"}, the Internal Judge & Master Optimizer.\nCORE DIRECTIVE: Deliver the unified, production-grade master deliverable for: "${p}".`
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

    let systemPrompt = "";
    let userPrompt = prompt;

    if (isSwamp || (isVibe && models.length > 1)) {
      systemPrompt = swarmRole.instruction(prompt, modelName) + (isVibe ? `\n\n${VIBE_CODING_PROMPT}` : "") + memoryDirective + skillsDirective + temporalDirective;
      userPrompt = `TASK SPECIFICATION: ${prompt}\nExecute role (${swarmRole.roleName}) with complete code.`;
    } else {
      systemPrompt = `You are ${modelName}, an elite AI assistant.${isVibe ? "\n\n" + VIBE_CODING_PROMPT : ""}${memoryDirective}${skillsDirective}${temporalDirective}`;
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

    let success = false;
    let lastErr = "";

    for (const candidate of candidateModels) {
      if (success || signal?.aborted) break;

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
        let accumulated = "";

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
                  accumulated += chunk;
                  onChunk(targetSlotIndex, modelId, chunk);
                  if (detectRepetition(accumulated)) {
                    break;
                  }
                }
              } catch {}
            }
          }
        }

        if (accumulated.length > 0) {
          success = true;
          onDone(targetSlotIndex, modelId);
          break;
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        lastErr = err.message || "Connection error";
      }
    }

    if (!success && !signal?.aborted) {
      onError(targetSlotIndex, modelId, lastErr || "Model stream failed");
    }
  });

  await Promise.all(modelPromises);
}

