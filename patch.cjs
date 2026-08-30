const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
const target = `              case "Vision": 
                 maxTokens = 2048;
                 break;`;
const replacement = `              case "Vision": 
                maxTokens = 2048;
                if (req.body.image) {
                  msgs = [
                    {
                      role: "user",
                      content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { url: req.body.image } }
                      ]
                    }
                  ];
                }
                break;`;
if(code.includes(target)) {
  fs.writeFileSync('server.ts', code.replace(target, replacement));
  console.log("Patched successfully");
} else {
  console.log("Target not found!");
}
