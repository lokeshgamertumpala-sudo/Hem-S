const fs = require('fs');

const path = 'src/context/ModelContext.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '{ id: "microsoft/phi-3.5-moe-instruct", name: "Phi-3.5 MoE", role: "Fast", category: "fast" }',
  '{ id: "google/gemma-3-4b-it", name: "Gemma 3 4B IT", role: "Fast", category: "fast" }'
);

code = code.replace(/omnimodel_selected_models_v10/g, 'omnimodel_selected_models_v11');

fs.writeFileSync(path, code);
console.log("Context patched successfully.");
