const fs = require('fs');

const path = 'src/context/ModelContext.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '{ id: "google/gemma-3-4b-it", name: "Gemma 3 4B IT", role: "Fast", category: "fast" }',
  '{ id: "nvidia/llama-3.1-nemotron-nano-8b-v1", name: "Nemotron Nano 8B", role: "Fast", category: "fast" }'
);

code = code.replace(/omnimodel_selected_models_v11/g, 'omnimodel_selected_models_v12');

fs.writeFileSync(path, code);
console.log("Context patched successfully.");
