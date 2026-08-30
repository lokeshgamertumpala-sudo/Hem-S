const fs = require('fs');

const path = 'src/context/ModelContext.tsx';
let code = fs.readFileSync(path, 'utf8');

const newDefaults = `export const DEFAULT_MODELS: AIModel[] = [
  { id: "meta/llama-3.2-1b-instruct", name: "Llama 3.2 1B", role: "Fast", category: "fast" },
  { id: "meta/llama-3.2-3b-instruct", name: "Llama 3.2 3B", role: "Fast", category: "fast" },
  { id: "nvidia/nemotron-mini-4b-instruct", name: "Nemotron Mini 4B", role: "Fast", category: "fast" },
  { id: "meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B", role: "Fast", category: "fast" },
  { id: "nvidia/nemotron-3.5-lightning-30b-a3b", name: "Nemotron 3.5 Lightning 30B", role: "Fast", category: "fast" }
];`;

const defaultRegex = /export const DEFAULT_MODELS: AIModel\[\] = \[[\s\S]*?\];/;
code = code.replace(defaultRegex, newDefaults);

code = code.replace(/omnimodel_selected_models_v6/g, 'omnimodel_selected_models_v7');

fs.writeFileSync(path, code);
console.log("Context patched successfully.");
