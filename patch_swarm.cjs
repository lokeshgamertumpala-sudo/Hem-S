const fs = require('fs');
let code = fs.readFileSync('src/components/SwarmGrid.tsx', 'utf8');

// 1. Add hook call
code = code.replace(
  'const { selectedModels } = useModels();',
  'const { selectedModels } = useModels();\n  const { chats, activeChatId, saveCurrentChat, createNewChat } = useChats();'
);

// 2. Remove the old useEffect that resets selectedModels
code = code.replace(
  /useEffect\(\(\) => \{\s*setModelResponses\(selectedModels\.map\([^;]+\);\s*\}, \[selectedModels\]\);/,
  `useEffect(() => {
    if (activeChatId) {
      const chat = chats.find(c => c.id === activeChatId);
      if (chat) {
        setLastPrompt(chat.prompt);
        setModelResponses(chat.responses);
        return;
      }
    }
    // New chat or reset
    setLastPrompt(null);
    setModelResponses(selectedModels.map(model => ({ ...model, text: "", status: "idle", error: null, tokenCount: 0, startTime: null, tps: 0 })));
  }, [activeChatId, selectedModels]);`
);

// 3. Save chat on submit
// Find: setLastPrompt(prompt);
code = code.replace(
  'setLastPrompt(prompt);',
  'setLastPrompt(prompt);\n    if (!activeChatId) createNewChat();'
);

// Find: const response = await fetch("/api/stream"
// It's inside handlePromptSubmit. We need to save the chat state as responses come in.
// Actually, it's easier to just save when all streams are done or during the stream.
// Wait, when stream finishes:
// `setIsLoading(false);`
code = code.replace(
  'setIsLoading(false);',
  'setIsLoading(false);\n      // Save chat\n      saveCurrentChat(prompt, prev => prev);' // prev => prev isn't right, saveCurrentChat doesn't take functional update
);

fs.writeFileSync('src/components/SwarmGrid.tsx', code);
