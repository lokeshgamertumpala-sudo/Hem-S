const fs = require('fs');
let content = fs.readFileSync('src/components/SwarmGrid.tsx', 'utf8');

// 1. Add useRef to imports
content = content.replace('import React, { useState } from "react";', 'import React, { useState, useRef } from "react";');

// 2. Add AbortController and fix the buffer
content = content.replace(
  '  const handleExecute = async (prompt: string) => {',
  '  const abortControllerRef = useRef<AbortController | null>(null);\n  const handleExecute = async (prompt: string) => {'
);

const oldFetchStart = `    setLastPrompt(prompt);
    setIsLoading(true);

    // Reset all states and set status to computing
    setModelResponses(prev =>
      prev.map(m => ({ ...m, text: "", status: "computing", error: null }))
    );

    try {
      // 1. Fetch from Express API, passing prompt and the 5 saved keys
      const response = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, apiKeys })
      });

      if (!response.body) throw new Error("Connection failed");

      // 2. Consume the SSE ReadableStream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const rawChunk = decoder.decode(value, { stream: true });
        // Handle Server-Sent Events structure (split by double newline)
        const events = rawChunk.split("\\n\\n");`;

const newFetchStart = `    if (abortControllerRef.current) abortControllerRef.current.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setLastPrompt(prompt);
    setIsLoading(true);

    // Reset all states and set status to computing
    setModelResponses(prev =>
      prev.map(m => ({ ...m, text: "", status: "computing", error: null }))
    );

    try {
      // 1. Fetch from Express API, passing prompt and the 5 saved keys
      const response = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, apiKeys }),
        signal: abortController.signal
      });

      if (!response.body) throw new Error("Connection failed");

      // 2. Consume the SSE ReadableStream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\\n\\n");
        buffer = events.pop() || "";`;

content = content.replace(oldFetchStart, newFetchStart);

content = content.replace(
  '    } catch {\n      // Catastrophic backend error handling\n      setModelResponses(prev => prev.map(m => ({ ...m, status: "error", error: "System fault" })));\n    } finally {\n      setIsLoading(false);\n    }',
  '    } catch (err: any) {\n      if (err.name === "AbortError") return;\n      // Catastrophic backend error handling\n      setModelResponses(prev => prev.map(m => ({ ...m, status: "error", error: "System fault" })));\n    } finally {\n      setIsLoading(false);\n    }'
);

fs.writeFileSync('src/components/SwarmGrid.tsx', content);
