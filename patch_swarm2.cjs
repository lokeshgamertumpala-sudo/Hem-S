const fs = require('fs');
let code = fs.readFileSync('src/components/SwarmGrid.tsx', 'utf8');

code = code.replace(
  'const abortControllerRef = useRef<AbortController | null>(null);',
  'const abortControllerRef = useRef<AbortController | null>(null);\n  const prevLoading = useRef(isLoading);\n  useEffect(() => {\n    if (prevLoading.current && !isLoading && lastPrompt) {\n      saveCurrentChat(lastPrompt, modelResponses);\n    }\n    prevLoading.current = isLoading;\n  }, [isLoading, lastPrompt, modelResponses, saveCurrentChat]);'
);

fs.writeFileSync('src/components/SwarmGrid.tsx', code);
