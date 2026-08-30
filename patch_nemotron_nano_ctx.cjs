const fs = require('fs');

const path = 'src/context/ModelContext.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '{ id: "nvidia/llama-3.1-nemotron-nano-8b-v1", name: "Nemotron Nano 8B", role: "Fast", category: "fast" }',
  '{ id: "nv-mistralai/mistral-nemo-12b-instruct", name: "Mistral Nemo 12B", role: "Fast", category: "fast" }'
);

code = code.replace(/omnimodel_selected_models_v12/g, 'omnimodel_selected_models_v13');

fs.writeFileSync(path, code);
console.log("Context patched successfully.");
