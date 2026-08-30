const fs = require('fs');
let content = fs.readFileSync('src/components/MarkdownRenderer.tsx', 'utf8');

if (!content.includes('import { useTheme }')) {
  content = content.replace(
    "import { motion } from 'motion/react';",
    "import { motion } from 'motion/react';\nimport { useTheme } from '../context/ThemeContext';"
  );
}

content = content.replace(
  'export function MarkdownRenderer({ content }: MarkdownRendererProps) {',
  'export function MarkdownRenderer({ content }: MarkdownRendererProps) {\n  const { mode } = useTheme();\n  const isSwamp = mode === "swamp";'
);

content = content.replace(
  'className="markdown-body font-sans text-[var(--text-primary)]/90 text-[13px] leading-relaxed break-words w-full space-y-4 transition-colors duration-700"',
  'className={`markdown-body font-sans text-[13px] leading-relaxed break-words w-full space-y-4 transition-colors duration-700 ${isSwamp ? "text-[var(--text-swamp)]" : "text-[var(--text-primary)]/90"}`}'
);

fs.writeFileSync('src/components/MarkdownRenderer.tsx', content);
