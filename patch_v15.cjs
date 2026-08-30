const fs = require('fs');

// 1. Update ModelSelectionModal
let modalCode = fs.readFileSync('src/components/ModelSelectionModal.tsx', 'utf8');
modalCode = modalCode.replace(
  '{ id: "google/gemma-3-4b-it", name: "Gemma 3 4B IT", role: "Fast" }',
  '{ id: "meta/llama-3.2-3b-instruct", name: "Llama 3.2 3B", role: "Fast" }'
);
fs.writeFileSync('src/components/ModelSelectionModal.tsx', modalCode);

// 2. Update ModelContext
let contextCode = fs.readFileSync('src/context/ModelContext.tsx', 'utf8');
contextCode = contextCode.replace(
  '{ id: "google/gemma-3-4b-it", name: "Gemma 3 4B IT", role: "Fast", category: "fast" }',
  '{ id: "meta/llama-3.2-3b-instruct", name: "Llama 3.2 3B", role: "Fast", category: "fast" }'
);
contextCode = contextCode.replace(/omnimodel_selected_models_v14/g, 'omnimodel_selected_models_v15');
fs.writeFileSync('src/context/ModelContext.tsx', contextCode);

// 3. Update server.ts
let serverCode = fs.readFileSync('server.ts', 'utf8');

// Update Fast case for speed
serverCode = serverCode.replace(
  `              case "Fast":
                maxTokens = 512;
                temp = 0.7;
                break;`,
  `              case "Fast":
                maxTokens = 256;
                temp = 0.5;
                msgs = [
                  { role: "system", content: "You are an ultra-fast assistant. Your primary directive is to be extremely concise. Answer in 1-2 sentences maximum. Skip all pleasantries and fluff." },
                  { role: "user", content: prompt }
                ];
                break;`
);

// Add to openRouterMap
serverCode = serverCode.replace(
  '"meta/llama-3.1-8b-instruct": "meta-llama/llama-3.1-8b-instruct",',
  '"meta/llama-3.1-8b-instruct": "meta-llama/llama-3.1-8b-instruct",\n                "meta/llama-3.2-3b-instruct": "meta-llama/llama-3.2-3b-instruct",'
);

fs.writeFileSync('server.ts', serverCode);
console.log("All files patched successfully.");
