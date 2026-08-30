const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /body: JSON\.stringify\(\{\s*model: modelConfig\.id,\s*messages: \[\{ role: "user", content: prompt \}\],\s*temperature: 0\.6,\s*max_tokens: 1024,\s*stream: true\s*\}\)/s;

const replacement = `body: JSON.stringify((() => {
            let maxTokens = 1024;
            let temp = 0.6;
            let msgs = [{ role: "user", content: prompt }];
            
            switch (modelConfig.role) {
              case "Fast":
                maxTokens = 512;
                temp = 0.7;
                break;
              case "Coding/Math":
                maxTokens = 4096;
                temp = 0.2;
                msgs = [
                  { role: "system", content: "You are an agentic mass encoding AI. Write high-quality code. Take the necessary time to answer accurately but concisely." },
                  { role: "user", content: prompt }
                ];
                break;
              case "Flagship":
                maxTokens = 8192;
                temp = 0.5;
                msgs = [
                  { role: "system", content: "You are the flagship AI. Everything is packed inside fast agentic mass coding and packed around the agency. Operate at maximum compute capacity, output complete exhaustive solutions." },
                  { role: "user", content: prompt }
                ];
                break;
              case "Vision":
                 maxTokens = 2048;
                 break;
              case "Normal":
              default:
                maxTokens = 2048;
                break;
            }

            return {
              model: modelConfig.id,
              messages: msgs,
              temperature: temp,
              max_tokens: maxTokens,
              stream: true
            };
          })())`;

code = code.replace(regex, replacement);
fs.writeFileSync('server.ts', code);
