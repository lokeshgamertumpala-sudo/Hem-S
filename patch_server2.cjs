const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  'const dedicatedKey = apiKeys[modelConfig.keyIndex];',
  'const dedicatedKey = apiKeys[modelConfig.keyIndex] || apiKeys[0];'
);

fs.writeFileSync('server.ts', content);
