const fs = require('fs');
const path = 'src/components/ModelSelectionModal.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '{ id: "nv-mistralai/mistral-nemo-12b-instruct", name: "Mistral Nemo 12B", role: "Fast" }',
  '{ id: "google/gemma-3-4b-it", name: "Gemma 3 4B IT", role: "Fast" }'
);

fs.writeFileSync(path, code);
console.log("Modal patched successfully.");
