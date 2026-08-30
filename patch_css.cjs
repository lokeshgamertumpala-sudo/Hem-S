const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf8');

const swampModeRegex = /\.swamp-mode\s*\{[^}]+\}/;
content = content.replace(swampModeRegex, `.swamp-mode {
  /* Only defining a special swamp text color. All other vars inherit from :root */
  --text-swamp: #e8f5e9; /* Very very light green */
}`);

fs.writeFileSync('src/index.css', content);
