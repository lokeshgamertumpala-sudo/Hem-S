const fs = require('fs');
let content = fs.readFileSync('src/components/SwarmGrid.tsx', 'utf8');

if (!content.includes('useModels')) {
  content = content.replace(
    'import { useApiKeys } from "../context/ApiKeyContext";',
    'import { useApiKeys } from "../context/ApiKeyContext";\nimport { useModels, AIModel } from "../context/ModelContext";'
  );
  fs.writeFileSync('src/components/SwarmGrid.tsx', content);
}
