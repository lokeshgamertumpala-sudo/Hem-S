const fs = require('fs');

const path = 'src/context/ModelContext.tsx';
let code = fs.readFileSync(path, 'utf8');

const newDefaults = `export const DEFAULT_MODELS: AIModel[] = [
  { id: "stepfun-ai/step-3.7-flash", name: "Step 3.7 Flash", role: "Fast", category: "fast" },
  { id: "microsoft/phi-3.5-moe-instruct", name: "Phi-3.5 MoE", role: "Fast", category: "fast" },
  { id: "nvidia/nemotron-mini-4b-instruct", name: "Nemotron Mini 4B", role: "Fast", category: "fast" },
  { id: "meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B", role: "Fast", category: "fast" },
  { id: "nvidia/nemotron-3.5-lightning-30b-a3b", name: "Nemotron 3.5 Lightning", role: "Fast", category: "fast" }
];`;

const defaultRegex = /export const DEFAULT_MODELS: AIModel\[\] = \[[\s\S]*?\];/;
code = code.replace(defaultRegex, newDefaults);

code = code.replace(/omnimodel_selected_models_v9/g, 'omnimodel_selected_models_v10');

fs.writeFileSync(path, code);
console.log("Context patched successfully.");
