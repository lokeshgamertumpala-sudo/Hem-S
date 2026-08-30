const fs = require('fs');

const path = 'src/components/ModelSelectionModal.tsx';
let code = fs.readFileSync(path, 'utf8');

const newRegistry = `export const MODEL_REGISTRY = {
  "fast": [
    { id: "meta/llama-3.2-1b-instruct", name: "Llama 3.2 1B", role: "Fast" },
    { id: "meta/llama-3.2-3b-instruct", name: "Llama 3.2 3B", role: "Fast" },
    { id: "nvidia/nemotron-mini-4b-instruct", name: "Nemotron Mini 4B", role: "Fast" },
    { id: "meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B", role: "Fast" },
    { id: "nvidia/nemotron-3.5-lightning-30b-a3b", name: "Nemotron 3.5 Lightning", role: "Fast" }
  ],
  "coding_and_maths": [
    { id: "nvidia/llama-3.1-nemotron-nano-8b-v1", name: "Nemotron Nano 8B", role: "Coding/Math" },
    { id: "mistralai/mistral-nemotron", name: "Mistral Nemotron", role: "Coding/Math" },
    { id: "poolside/laguna-xs-2.1", name: "Laguna XS 2.1", role: "Coding/Math" },
    { id: "nvidia/nemotron-3-nano-30b-a3b", name: "Nemotron 3 Nano 30B", role: "Coding/Math" },
    { id: "nvidia/llama-3.3-nemotron-super-49b-v1", name: "Nemotron Super 49B v1", role: "Coding/Math" }
  ],
  "flagship": [
    { id: "z-ai/glm-5.2", name: "GLM 5.2", role: "Flagship" },
    { id: "nvidia/nemotron-3-ultra-550b-a55b", name: "Nemotron 3 Ultra 550B", role: "Flagship" },
    { id: "meta/llama-3.1-70b-instruct", name: "Llama 3.1 70B", role: "Flagship" },
    { id: "meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B", role: "Flagship" },
    { id: "meta/muse-glimmer-30b", name: "Muse Glimmer 30B", role: "Flagship" }
  ],
  "visual_inputs": [
    { id: "meta/llama-3.2-11b-vision-instruct", name: "Llama 3.2 11B Vision", role: "Vision" },
    { id: "meta/llama-3.2-90b-vision-instruct", name: "Llama 3.2 90B Vision", role: "Vision" },
    { id: "minimaxai/minimax-m3", name: "MiniMax M3", role: "Vision" },
    { id: "thinkingmachines/inkling", name: "Inkling", role: "Vision" },
    { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", name: "Nemotron Nano Omni", role: "Vision" }
  ],
  "normal": [
    { id: "deepseek-ai/deepseek-v4-flash-0731", name: "DeepSeek V4 Flash", role: "Normal" },
    { id: "nvidia/llama-3.3-nemotron-super-49b-v1.5", name: "Nemotron Super 49B v1.5", role: "Normal" },
    { id: "nvidia/nemotron-3-super-120b-a12b", name: "Nemotron 3 Super 120B", role: "Normal" },
    { id: "google/diffusiongemma-26b-a4b-it", name: "DiffusionGemma 26B", role: "Normal" },
    { id: "google/gemma-4-31b-it", name: "Gemma 4 31B IT", role: "Normal" }
  ]
};`;

const regex = /export const MODEL_REGISTRY = \{[\s\S]*?\n\};/;
if(regex.test(code)) {
  fs.writeFileSync(path, code.replace(regex, newRegistry));
  console.log("Registry patched successfully.");
} else {
  console.log("Could not find MODEL_REGISTRY block.");
}
