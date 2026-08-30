const fs = require('fs');
let content = fs.readFileSync('src/components/MarkdownRenderer.tsx', 'utf8');

// Replace inline code block
content = content.replace(
  'className="bg-[var(--text-primary)]/10 rounded px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-primary)] transition-colors duration-700"',
  'className={`bg-[var(--text-primary)]/10 rounded px-1.5 py-0.5 font-mono text-[11px] transition-colors duration-700 ${isSwamp ? "text-[var(--text-swamp)]" : "text-[var(--text-primary)]"}`}'
);

// Replace headers
content = content.replace(
  'h1: ({ children }) => <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-3 mt-5 transition-colors duration-700">{children}</h1>,',
  'h1: ({ children }) => <h1 className={`text-lg font-semibold mb-3 mt-5 transition-colors duration-700 ${isSwamp ? "text-[var(--text-swamp)]" : "text-[var(--text-primary)]"}`}>{children}</h1>,'
);
content = content.replace(
  'h2: ({ children }) => <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2 mt-4 transition-colors duration-700">{children}</h2>,',
  'h2: ({ children }) => <h2 className={`text-base font-semibold mb-2 mt-4 transition-colors duration-700 ${isSwamp ? "text-[var(--text-swamp)]" : "text-[var(--text-primary)]"}`}>{children}</h2>,'
);
content = content.replace(
  'h3: ({ children }) => <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2 mt-4 transition-colors duration-700">{children}</h3>,',
  'h3: ({ children }) => <h3 className={`text-sm font-medium mb-2 mt-4 transition-colors duration-700 ${isSwamp ? "text-[var(--text-swamp)]" : "text-[var(--text-primary)]"}`}>{children}</h3>,'
);

fs.writeFileSync('src/components/MarkdownRenderer.tsx', content);
