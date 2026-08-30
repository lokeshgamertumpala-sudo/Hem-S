const fs = require('fs');

const path = 'server.ts';
let code = fs.readFileSync(path, 'utf8');

const replacement = `            let actualModelId = modelConfig.id;
            if (endpoint.includes("openrouter")) {
              if (actualModelId === "stepfun-ai/step-3.7-flash") actualModelId = "stepfun/step-3.7-flash";
              if (actualModelId === "microsoft/phi-3.5-moe-instruct") actualModelId = "microsoft/phi-4";
            }
            return {
              model: actualModelId,
              messages: msgs,
              temperature: temp,
              max_tokens: maxTokens,
              stream: true
            };`;

const regex = /return \{\s*model: modelConfig\.id,\s*messages: msgs,\s*temperature: temp,\s*max_tokens: maxTokens,\s*stream: true\s*\};/;
if(regex.test(code)) {
  fs.writeFileSync(path, code.replace(regex, replacement));
  console.log("Server IDs patched successfully.");
} else {
  console.log("Regex did not match.");
}
