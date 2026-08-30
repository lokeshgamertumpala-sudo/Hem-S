const fs = require('fs');

const path = 'src/components/ModelSelectionModal.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '{ id: "microsoft/phi-3.5-moe-instruct", name: "Phi-3.5 MoE", role: "Fast" }',
  '{ id: "google/gemma-3-4b-it", name: "Gemma 3 4B IT", role: "Fast" }'
);

fs.writeFileSync(path, code);
console.log("Registry patched successfully.");
