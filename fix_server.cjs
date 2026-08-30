const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldServerBuffer = `        const reader = apiRes.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\\n");
          for (const line of lines) {`;

const newServerBuffer = `        const reader = apiRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\\n");
          buffer = lines.pop() || "";
          for (const line of lines) {`;

content = content.replace(oldServerBuffer, newServerBuffer);
fs.writeFileSync('server.ts', content);
