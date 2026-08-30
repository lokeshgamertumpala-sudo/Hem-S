const fs = require('fs');
let content = fs.readFileSync('src/components/SwarmGrid.tsx', 'utf8');
content = content.replace(
  /const \[isLoading, setIsLoading\] = useState\(false\);\n  const \[modelResponses/g,
  'const [isLoading, setIsLoading] = useState(false);\n  const [lastPrompt, setLastPrompt] = useState<string | null>(null);\n  const [modelResponses'
);
content = content.replace(
  /return; \n    }\n    setIsLoading\(true\);/g,
  'return; \n    }\n    setLastPrompt(prompt);\n    setIsLoading(true);'
);
fs.writeFileSync('src/components/SwarmGrid.tsx', content);
console.log('Fixed');
