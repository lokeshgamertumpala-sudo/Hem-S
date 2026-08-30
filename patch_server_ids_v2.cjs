const fs = require('fs');

const path = 'server.ts';
let code = fs.readFileSync(path, 'utf8');

const replacement = `            let actualModelId = modelConfig.id;
            if (endpoint.includes("openrouter")) {
              const openRouterMap: Record<string, string> = {
                "stepfun-ai/step-3.7-flash": "stepfun/step-3.7-flash",
                "nv-mistralai/mistral-nemo-12b-instruct": "mistralai/mistral-nemo",
                "google/codegemma-7b": "google/gemma-3-4b-it", // fallback if codegemma is missing
                "nvidia/nemotron-mini-4b-instruct": "nvidia/nemotron-mini-4b-instruct",
                "meta/llama-3.1-8b-instruct": "meta-llama/llama-3.1-8b-instruct",
                "nvidia/nemotron-3.5-lightning-30b-a3b": "nvidia/nemotron-3.5-lightning",
                "mistralai/mistral-nemotron": "mistralai/mistral-nemotron",
                "poolside/laguna-xs-2.1": "poolside/laguna-xs-2.1",
                "nvidia/nemotron-3-nano-30b-a3b": "nvidia/nemotron-3-nano-30b-a3b",
                "nvidia/llama-3.3-nemotron-super-49b-v1": "nvidia/llama-3.3-nemotron-super-49b-v1",
                "z-ai/glm-5.2": "z-ai/glm-5.2",
                "nvidia/nemotron-3-ultra-550b-a55b": "nvidia/nemotron-3-ultra-550b-a55b",
                "meta/llama-3.1-70b-instruct": "meta-llama/llama-3.1-70b-instruct",
                "meta/llama-3.3-70b-instruct": "meta-llama/llama-3.3-70b-instruct",
                "meta/muse-glimmer-30b": "meta/muse-glimmer-30b",
                "meta/llama-3.2-11b-vision-instruct": "meta-llama/llama-3.2-11b-vision-instruct",
                "meta/llama-3.2-90b-vision-instruct": "meta-llama/llama-3.2-90b-vision-instruct",
                "minimaxai/minimax-m3": "minimaxai/minimax-m3",
                "thinkingmachines/inkling": "thinkingmachines/inkling",
                "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
                "deepseek-ai/deepseek-v4-flash-0731": "deepseek/deepseek-chat", // fallback mapping
                "nvidia/llama-3.3-nemotron-super-49b-v1.5": "nvidia/llama-3.3-nemotron-super-49b-v1.5",
                "nvidia/nemotron-3-super-120b-a12b": "nvidia/nemotron-3-super-120b-a12b",
                "google/diffusiongemma-26b-a4b-it": "google/gemma-3-27b-it", // fallback
                "google/gemma-4-31b-it": "google/gemma-4-31b-it",
              };
              if (openRouterMap[actualModelId]) {
                actualModelId = openRouterMap[actualModelId];
              }
            }
            return {
              model: actualModelId,
              messages: msgs,
              temperature: temp,
              max_tokens: maxTokens,
              stream: true
            };`;

const regex = /let actualModelId = modelConfig\.id;[\s\S]*?return \{\s*model: actualModelId,\s*messages: msgs,\s*temperature: temp,\s*max_tokens: maxTokens,\s*stream: true\s*\};/;
if(regex.test(code)) {
  fs.writeFileSync(path, code.replace(regex, replacement));
  console.log("Server IDs patched successfully.");
} else {
  console.log("Regex did not match.");
}
