const fs = require('fs');
let content = fs.readFileSync('src/components/FloatingInput.tsx', 'utf8');

// Change input text color to very light green
content = content.replace(
  "isSwamp && text.length > 0 \n              ? 'text-[#4ADE80]' \n              : 'text-[var(--text-primary)]'",
  "isSwamp && text.length > 0 \n              ? 'text-[var(--text-swamp)]' \n              : 'text-[var(--text-primary)]'"
);

// Revert the submit button to normal, removing the swamp-specific bg/text color change
content = content.replace(
  "className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-500 ${\n            isSwamp && text.length > 0 \n              ? 'bg-[var(--bg-base)] text-[#4ADE80]' \n              : 'bg-[var(--text-primary)] text-[var(--bg-base)]'\n          }`}",
  "className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-500 bg-[var(--text-primary)] text-[var(--bg-base)]`}"
);

fs.writeFileSync('src/components/FloatingInput.tsx', content);
