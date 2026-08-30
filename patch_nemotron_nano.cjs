const fs = require('fs');

const path = 'src/components/ModelSelectionModal.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '{ id: "nvidia/llama-3.1-nemotron-nano-8b-v1", name: "Nemotron Nano 8B", role: "Fast" }',
  '{ id: "nv-mistralai/mistral-nemo-12b-instruct", name: "Mistral Nemo 12B", role: "Fast" }'
);

code = code.replace(
  '{ id: "nvidia/llama-3.1-nemotron-nano-8b-v1", name: "Nemotron Nano 8B", role: "Coding/Math" }',
  '{ id: "google/codegemma-7b", name: "CodeGemma 7B", role: "Coding/Math" }'
);

fs.writeFileSync(path, code);
console.log("Modal patched successfully.");
