const fs = require('fs');

const path = 'src/components/ModelSelectionModal.tsx';
let code = fs.readFileSync(path, 'utf8');

const newRegistry = `export const MODEL_REGISTRY = {
  "fast": [
    { id: "meta/llama-3.2-1b-instruct", name: "Llama 3.2 1B", role: "Fast" },
    { id: "meta/llama-3.2-3b-instruct", name: "Llama 3.2 3B", role: "Fast" },
    { id: "nvidia/nemotron-mini-4b-instruct", name: "Nemotron Mini 4B", role: "Fast" },
    { id: "meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B", role: "Fast" },
    { id: "nvidia/nemotron-3.5-lightning-30b-a3b", name: "Nemotron 3.5 Lightning 30B", role: "Fast" }
  ],
  "coding_and_maths": [
    { id: "poolside/laguna-xs-2.1", name: "Laguna XS 2.1", role: "Coding/Math" },
    { id: "ibm/granite-3.0-8b-instruct", name: "Granite 3.0 8B", role: "Coding/Math" },
    { id: "zyphra/zamba2-7b-instruct", name: "Zamba2 7B", role: "Coding/Math" },
    { id: "writer/palmyra-med-70b-32k", name: "Palmyra Med 70B", role: "Coding/Math" },
    { id: "databricks/dbrx-instruct", name: "DBRX Instruct", role: "Coding/Math" }
  ],
  "flagship": [
    { id: "z-ai/glm-5.2", name: "GLM 5.2", role: "Flagship" },
    { id: "nvidia/nemotron-3-ultra-550b-a55b", name: "Nemotron 3 Ultra 550B", role: "Flagship" },
    { id: "meta/llama-3.1-70b-instruct", name: "Llama 3.1 70B", role: "Flagship" },
    { id: "meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B", role: "Flagship" },
    { id: "ai21labs/jamba-1.5-large-instruct", name: "Jamba 1.5 Large", role: "Flagship" }
  ],
  "visual_inputs": [
    { id: "meta/llama-3.2-11b-vision-instruct", name: "Llama 3.2 11B Vision", role: "Vision" },
    { id: "meta/llama-3.2-90b-vision-instruct", name: "Llama 3.2 90B Vision", role: "Vision" },
    { id: "minimaxai/minimax-m3", name: "MiniMax M3", role: "Vision" },
    { id: "thinkingmachines/inkling", name: "Inkling", role: "Vision" },
    { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", name: "Nemotron Nano Omni 30B", role: "Vision" }
  ],
  "normal": [
    { id: "google/diffusiongemma-26b-a4b-it", name: "DiffusionGemma 26B", role: "Normal" },
    { id: "mistralai/mistral-nemotron", name: "Mistral Nemotron", role: "Normal" },
    { id: "nvidia/llama-3.3-nemotron-super-49b-v1.5", name: "Nemotron Super 49B", role: "Normal" },
    { id: "ibm/granite-3.0-3b-a800m-instruct", name: "Granite 3.0 3B", role: "Normal" },
    { id: "01-ai/yi-large", name: "Yi Large", role: "Normal" }
  ]
};`;

const regex = /export const MODEL_REGISTRY = \{[\s\S]*?\n\};/;
if(regex.test(code)) {
  fs.writeFileSync(path, code.replace(regex, newRegistry));
  console.log("Registry patched successfully.");
} else {
  console.log("Could not find MODEL_REGISTRY block.");
}
