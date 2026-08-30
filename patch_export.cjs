const fs = require('fs');
let content = fs.readFileSync('src/components/SwarmGrid.tsx', 'utf8');

// Insert the useEffect for exporting chat
const importAnchor = 'import { MarkdownRenderer } from "./MarkdownRenderer";';
const newImport = 'import { MarkdownRenderer } from "./MarkdownRenderer";\nimport { useEffect } from "react";';

if (!content.includes('import { useEffect } from "react"')) {
    content = content.replace(importAnchor, newImport);
}

const effectCode = `  useEffect(() => {
    const handleExport = () => {
      let exportText = "SWARM SESSION EXPORT\\n\\n";
      if (lastPrompt) exportText += "USER PROMPT:\\n" + lastPrompt + "\\n\\n";
      modelResponses.forEach(m => {
        exportText += "=========================================\\n";
        exportText += m.name + " (" + m.role + ")\\n";
        exportText += "=========================================\\n";
        exportText += m.text + "\\n\\n";
      });
      const blob = new Blob([exportText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "swarm_chat.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    window.addEventListener("export-chat", handleExport);
    return () => window.removeEventListener("export-chat", handleExport);
  }, [lastPrompt, modelResponses]);`;

content = content.replace(
  '  const handleExecute = async (prompt: string) => {',
  effectCode + '\n\n  const handleExecute = async (prompt: string) => {'
);

fs.writeFileSync('src/components/SwarmGrid.tsx', content);
