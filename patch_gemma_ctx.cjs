const fs = require('fs');
const path = 'src/context/ModelContext.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '{ id: "nv-mistralai/mistral-nemo-12b-instruct", name: "Mistral Nemo 12B", role: "Fast", category: "fast" }',
  '{ id: "google/gemma-3-4b-it", name: "Gemma 3 4B IT", role: "Fast", category: "fast" }'
);

code = code.replace(/omnimodel_selected_models_v13/g, 'omnimodel_selected_models_v14');

fs.writeFileSync(path, code);
console.log("Context patched successfully.");
