// Vercel Serverless Function for /api/stream and /api/index
const SWARM_ROLES = [
  {
    roleName: "Agent 1",
    nvidiaCandidates: ["meta/llama-3.2-11b-vision-instruct", "nvidia/llama-3.1-nemotron-70b-instruct"],
    openRouterCandidates: ["meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-chat", "deepseek/deepseek-r1:free"],
    groqCandidates: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    systemInstruction: (prompt, name) => "You are " + (name || "Lead Architect") + ". Provide complete, commercial-grade code for: " + prompt
  },
  {
    roleName: "Agent 2",
    nvidiaCandidates: ["poolside/laguna-xs-2.1", "meta/llama-3.2-11b-vision-instruct"],
    openRouterCandidates: ["qwen/qwen-2.5-coder-32b-instruct", "deepseek/deepseek-chat"],
    groqCandidates: ["deepseek-r1-distill-llama-70b", "llama-3.3-70b-versatile"],
    systemInstruction: (prompt, name) => "You are " + (name || "Alternative Specialist") + ". Provide innovative solution for: " + prompt
  },
  {
    roleName: "Agent 3",
    nvidiaCandidates: ["mistralai/mixtral-8x22b-instruct-v0.1", "meta/llama-3.2-11b-vision-instruct"],
    openRouterCandidates: ["mistralai/mistral-large-2407", "deepseek/deepseek-chat"],
    groqCandidates: ["mixtral-8x7b-32768", "llama-3.3-70b-versatile"],
    systemInstruction: (prompt, name) => "You are " + (name || "Technical Specialist") + ". Deliver precision for: " + prompt
  },
  {
    roleName: "Agent 4",
    nvidiaCandidates: ["meta/muse-glimmer-30b", "meta/llama-3.2-11b-vision-instruct"],
    openRouterCandidates: ["deepseek/deepseek-reasoner", "deepseek/deepseek-chat"],
    groqCandidates: ["deepseek-r1-distill-llama-70b", "llama-3.3-70b-versatile"],
    systemInstruction: (prompt, name) => "You are " + (name || "Code Optimizer") + ". Optimize the code for: " + prompt
  },
  {
    roleName: "Agent 5",
    nvidiaCandidates: ["meta/llama-3.2-11b-vision-instruct", "meta/muse-glimmer-30b"],
    openRouterCandidates: ["meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-chat"],
    groqCandidates: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    systemInstruction: (prompt, name) => "You are " + (name || "Synthesis Lead") + ". Produce polished implementation for: " + prompt
  }
];

function detectRepetition(text) {
  if (!text || text.length < 80) return false;
  const tail = text.slice(-180);
  for (let len = 6; len <= 35; len++) {
    if (tail.length < len * 3) continue;
    const sub = tail.slice(-len);
    const prev1 = tail.slice(-len * 2, -len);
    const prev2 = tail.slice(-len * 3, -len * 2);
    if (sub === prev1 && prev1 === prev2) return true;
  }
  return false;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  let body = req.body;
  if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (e) {}
    } else {
      try {
        const rawBody = await new Promise((resolve) => {
          let chunks = "";
          req.on("data", (chunk) => (chunks += chunk));
          req.on("end", () => resolve(chunks));
          req.on("error", () => resolve(""));
        });
        if (rawBody) {
          body = JSON.parse(rawBody);
        }
      } catch (e) {}
    }
  }
  if (!body) body = {};

  const { prompt, apiKeys = [], models = [], history = [], clientTimestamp, clientTimezone, clientLocaleString } = body;

  if (!prompt || !Array.isArray(models) || models.length === 0) {
    return res.status(400).json({ error: "Missing prompt or models array" });
  }

  const now = clientTimestamp ? new Date(clientTimestamp) : new Date();
  const tz = clientTimezone || "UTC";
  const localStr = clientLocaleString || now.toLocaleString("en-US", { timeZone: tz });
  const istStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

  const temporalDirective = "\n\n[LIVE REAL-TIME CLOCK & TEMPORAL CONTEXT]\n• User Local Time: " + localStr + " (" + tz + ")\n• Indian Standard Time (IST): " + istStr + "\n• UTC Time: " + now.toUTCString() + "\n• Current Year: " + now.getUTCFullYear() + "\nMANDATE: Whenever asked about time/date/day, strictly use the live clock above.";

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const collectedKeys = [
    ...apiKeys.filter(k => k && k.trim().length > 10),
    process.env.NVIDIA_API_KEY,
    process.env.OPENROUTER_API_KEY,
    process.env.GROQ_API_KEY,
    process.env.DEEPSEEK_API_KEY
  ].filter(Boolean);

  if (collectedKeys.length === 0) {
    res.write("data: " + JSON.stringify({ modelIndex: 0, modelId: models[0]?.id || "error", content: "⚠️ **API Key Required**\n\nPlease add your NVIDIA NIM (nvapi-...), OpenRouter, or Groq API key in **Settings ⚙️** (Sidebar -> API Keys) to run the 5-AI Swarm." }) + "\n\n");
    res.write("data: [DONE]\n\n");
    return res.end();
  }

  const modelPromises = models.map(async (model, modelIdx) => {
    const roleIdx = model.swarmRoleIndex !== undefined ? model.swarmRoleIndex : modelIdx;
    const swarmRole = SWARM_ROLES[roleIdx % SWARM_ROLES.length];
    const keyToUse = collectedKeys[modelIdx % collectedKeys.length] || collectedKeys[0];

    const isNvidia = keyToUse.startsWith("nvapi-");
    const isGroq = keyToUse.startsWith("gsk_");
    const isDeepSeek = keyToUse.startsWith("sk-") && !keyToUse.startsWith("sk-or-") && keyToUse.length === 35;

    let endpoint = "https://openrouter.ai/api/v1/chat/completions";
    let headers = {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + keyToUse
    };

    let candidateModels = [];

    if (isNvidia) {
      endpoint = "https://integrate.api.nvidia.com/v1/chat/completions";
      candidateModels = [model.id, ...swarmRole.nvidiaCandidates];
    } else if (isGroq) {
      endpoint = "https://api.groq.com/openai/v1/chat/completions";
      candidateModels = swarmRole.groqCandidates;
    } else if (isDeepSeek) {
      endpoint = "https://api.deepseek.com/chat/completions";
      candidateModels = ["deepseek-chat", "deepseek-reasoner"];
    } else {
      endpoint = "https://openrouter.ai/api/v1/chat/completions";
      headers["HTTP-Referer"] = "https://hems-ai.vercel.app";
      headers["X-Title"] = "OmniModel Swarm";
      candidateModels = [model.id, ...swarmRole.openRouterCandidates];
    }

    const systemPrompt = swarmRole.systemInstruction(prompt, model.name) + temporalDirective;
    const messages = [{ role: "system", content: systemPrompt }];

    if (Array.isArray(history) && history.length > 0) {
      history.forEach(h => {
        if (h.role === "user") messages.push({ role: "user", content: String(h.content) });
        else if (h.role === "assistant" && (h.modelIndex === undefined || h.modelIndex === modelIdx)) {
          messages.push({ role: "assistant", content: String(h.content) });
        }
      });
    } else {
      messages.push({ role: "user", content: prompt });
    }

    let success = false;
    for (const candidate of candidateModels) {
      if (success) break;
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: candidate,
            messages,
            stream: true,
            temperature: 0.7,
            max_tokens: 8192
          })
        });

        if (!response.ok || !response.body) continue;

        const reader = response.body.getReader();
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
                  res.write("data: " + JSON.stringify({ modelIndex: modelIdx, modelId: model.id, content: chunk }) + "\n\n");
                  if (detectRepetition(accumulated)) break;
                }
              } catch (e) {}
            }
          }
        }

        if (accumulated.length > 0) {
          success = true;
          break;
        }
      } catch (e) {}
    }

    if (!success) {
      res.write("data: " + JSON.stringify({ modelIndex: modelIdx, modelId: model.id, content: "⚠️ Model temporarily busy. Please retry." }) + "\n\n");
    }
  });

  await Promise.all(modelPromises);
  res.write("data: [DONE]\n\n");
  res.end();
};
