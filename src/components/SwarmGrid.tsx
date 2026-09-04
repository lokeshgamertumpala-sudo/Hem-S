"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { BotMessageSquare, AlertCircle, Trash2, RotateCcw, ChevronDown, ChevronUp, Cpu, Play, Brain, Sparkles, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useApiKeys } from "../context/ApiKeyContext";
import { useModels, AIModel, SWAMP_MODELS } from "../context/ModelContext";
import { useChats, ModelResponse } from "../context/ChatContext";
import { useMemory } from "../context/MemoryContext";
import { FloatingInput } from "./FloatingInput";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { VibeCodingEngine } from "./VibeCodingEngine";
import { AiTerminal } from "./AiTerminal";
import { useTheme } from "../context/ThemeContext";
import { useSkills } from "../context/SkillContext";
import { executeClientSwarm } from "../services/clientAiEngine";

// Advanced Intelligent Complex / Tough Question Detection
function isToughQuestion(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase().trim();
  
  // 1. Explicit difficulty & depth indicators
  if (/\b(hard|tuff|tough|complex|complexity|difficult|difficulty|advanced|expert|challenging|deep reasoning|deep|detailed|comprehensive|thorough|in-depth|step by step|system design)\b/i.test(t)) {
    return true;
  }

  // 2. Code snippets, syntax, or debugging
  if (t.includes("```") || t.includes("function") || t.includes("class ") || t.includes("import ") || t.includes("const ") || t.includes("def ") || t.includes("select ") || t.includes("{\n") || t.includes("=>") || /\b(debug|refactor|error|exception|stack trace|segfault)\b/i.test(t)) {
    return true;
  }

  // 3. Algorithmic, mathematical, or scientific domains
  if (/\b(algorithm|calculus|differential|integral|matrix|eigenvalue|linear algebra|dynamic programming|np-hard|big o|dijkstra|graph theory|cryptography|fourier|quantum|neural network|backpropagation|tensor|combinatorics|discrete math|tree|binary search|sorting|recursion)\b/i.test(t)) {
    return true;
  }

  // 4. High-level software architecture, engineering & databases
  if (/\b(microservices|concurrency|multithreading|distributed systems|race condition|deadlock|consensus algorithm|raft|paxos|compiler|ast parser|zero-day|exploit|penetration test|memory leak|buffer overflow|full stack|backend|frontend|database|postgres|mongodb|sql|nosql|redis|caching|indexing|kubernetes|docker|devops|aws|websocket|rest api|graphql)\b/i.test(t)) {
    return true;
  }

  // 5. Multi-step reasoning / rigorous proofs / analytical comparisons
  if (/\b(prove that|mathematical proof|formal proof|step-by-step reasoning|derive the equation|find the flaw|solve this riddle|logic puzzle|compare|versus|vs|pros and cons|difference between|tradeoffs|trade-offs|how does .+ work|why does|how can i optimize|best practices|benchmark)\b/i.test(t)) {
    return true;
  }

  // 6. Detailed or multi-constraint questions (length > 60 chars with question mark or newline)
  if (t.length > 60 && (t.includes("?") || t.includes("\n") || t.includes(",") || t.includes("and"))) {
    return true;
  }

  // 7. Any substantive question over 100 characters is complex
  if (t.length > 100) {
    return true;
  }

  return false;
}

// Client-side Repetition Breaker: protects UI from degenerate infinite repeating sequences
function detectRepetitionLoop(text: string): boolean {
  if (!text || text.length < 60) return false;
  const tail = text.slice(-400);
  for (let len = 10; len <= 120; len++) {
    if (tail.length < len * 3) continue;
    const chunk1 = tail.slice(-len);
    const chunk2 = tail.slice(-len * 2, -len);
    const chunk3 = tail.slice(-len * 3, -len * 2);
    if (chunk1 === chunk2 && chunk2 === chunk3) {
      return true;
    }
  }
  return false;
}

// Detects if text is actively inside an unclosed code block, used to suppress auto-scroll during coding
function isActivelyInsideCodeFence(text: string): boolean {
  if (!text) return false;
  // Count ``` occurrences. If odd, the model is currently streaming inside an open code block
  const matches = text.match(/```/g);
  return Boolean(matches && matches.length % 2 !== 0);
}

export function SwarmGrid() {
  const { mode, isVibe, isPerformance, setPerformance, toggleVibe, toggleSwamp } = useTheme();
  const isSwamp = mode === "swamp";
  const { apiKeys, isConfigured } = useApiKeys();
  const [isLoading, setIsLoading] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const { selectedModels, setSelectedModels } = useModels();
  const { chats, activeChatId, activeChatMessages, saveCurrentChat, createNewChat, clearActiveChat, appendMessageToActiveChat, appendMessagesToActiveChat } = useChats();
  const { memories, detectAndStoreMemory } = useMemory();
  const { activeSkills } = useSkills();
  const latestTurnRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom button state & user manual scroll detection
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const isUserScrolledUpRef = useRef(false);

  const handleContainerScroll = useCallback(() => {
    if (!mainContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = mainContainerRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    
    // Show button if user is scrolled more than 160px away from bottom
    const isAway = distanceFromBottom > 160;
    setShowScrollBottom(isAway);
    
    // If user scrolled near the bottom, always re-enable auto-scrolling
    if (distanceFromBottom < 80) {
      isUserScrolledUpRef.current = false;
    }
  }, []);

  // Listen to wheel to detect manual user scroll-up intent
  useEffect(() => {
    const container = mainContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < -4) {
        // User deliberately wheeled UP
        isUserScrolledUpRef.current = true;
        setShowScrollBottom(true);
      } else if (e.deltaY > 4) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        if (scrollHeight - (scrollTop + clientHeight) < 100) {
          isUserScrolledUpRef.current = false;
          setShowScrollBottom(false);
        }
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    isUserScrolledUpRef.current = false;
    setShowScrollBottom(false);

    if (mainContainerRef.current) {
      if (smooth) {
        mainContainerRef.current.scrollTo({
          top: mainContainerRef.current.scrollHeight,
          behavior: "smooth"
        });
      } else {
        mainContainerRef.current.scrollTop = mainContainerRef.current.scrollHeight;
      }
    }

    const anchor = document.getElementById("feed-bottom-anchor") || bottomAnchorRef.current;
    if (anchor) {
      anchor.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
    }
  }, []);

  const scrollToInputArea = useCallback((smooth = true) => {
    isUserScrolledUpRef.current = false;
    setShowScrollBottom(false);
    const container = mainContainerRef.current;
    if (!container) return;

    const turnEl = latestTurnRef.current || document.getElementById("latest-user-input");
    if (turnEl) {
      const targetScrollTop = Math.max(0, turnEl.offsetTop - 85);
      container.scrollTo({
        top: targetScrollTop,
        behavior: smooth ? "smooth" : "auto"
      });
    }
  }, []);

  const [modelResponses, setModelResponses] = useState<ModelResponse[]>(
    selectedModels.map(model => ({ ...model, text: "", status: "idle", error: null, tokenCount: 0, startTime: null, tps: 0 }))
  );

  // Total number of conversation turns to display sequentially
  const totalTurns = useMemo(() => {
    const maxModelTurns = Math.max(0, ...modelResponses.map(m => m.turns?.length || 0));
    const userPromptCount = activeChatMessages.filter(m => m.role === "user").length;
    if (maxModelTurns > 0) return maxModelTurns;
    if (userPromptCount > 0) return userPromptCount;
    return 1;
  }, [modelResponses, activeChatMessages]);

  const getPromptForTurn = useCallback((tIdx: number) => {
    for (const m of modelResponses) {
      if (m.turns?.[tIdx]?.prompt) return m.turns[tIdx].prompt;
    }
    const userMsgs = activeChatMessages.filter(m => m.role === "user");
    if (userMsgs[tIdx]?.content) return userMsgs[tIdx].content;
    if (tIdx === totalTurns - 1 && lastPrompt) return lastPrompt;
    return "";
  }, [modelResponses, activeChatMessages, lastPrompt, totalTurns]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const prevLoading = useRef(isLoading);
  const gridTopRef = useRef<HTMLDivElement>(null);

  // High-performance streaming state refs to prevent 150+ re-renders/sec
  const bufferedResponsesRef = useRef<ModelResponse[]>(modelResponses);
  const rafIdRef = useRef<number | null>(null);

  // Sync ref with state when not streaming
  useEffect(() => {
    if (!isLoading) {
      bufferedResponsesRef.current = modelResponses;
    }
  }, [modelResponses, isLoading]);

  const scheduleFlushUpdates = useCallback(() => {
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        setModelResponses([...bufferedResponsesRef.current]);
        rafIdRef.current = null;
      });
    }
  }, []);

  const flushUpdatesImmediately = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setModelResponses([...bufferedResponsesRef.current]);
  }, []);

  // View stays locked on the active turn without dragging the card headers off-screen

  // Whenever user gives an input (submits a prompt), automatically go directly to the bottom!
  useEffect(() => {
    if (lastPrompt) {
      scrollToInputArea(true);
      const t1 = setTimeout(() => scrollToInputArea(true), 40);
      const t2 = setTimeout(() => scrollToInputArea(true), 120);
      const t3 = setTimeout(() => scrollToInputArea(true), 250);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [lastPrompt, totalTurns, scrollToInputArea]);

  // Sync with activeChat when switching historical chats in sidebar
  useEffect(() => {
    if (isLoading) return; // Never wipe out during active generation
    if (activeChatId) {
      const chat = chats.find(c => c.id === activeChatId);
      if (chat) {
        const chatPrompt = chat.prompt || chat.messages?.find(m => m.role === 'user')?.content || null;
        setLastPrompt(chatPrompt);
        
        if (Array.isArray(chat.responses) && chat.responses.length > 0 && chat.responses.some(r => r.text)) {
          const sanitizedResponses = chat.responses.map(r => ({
            ...r,
            status: (r.text && r.text.trim().length > 0) ? ("completed" as const) : r.status,
            error: (r.text && r.text.trim().length > 0) ? null : r.error
          }));
          setModelResponses(sanitizedResponses);
          bufferedResponsesRef.current = sanitizedResponses;
        } else if (chat.messages && chat.messages.length > 0) {
          const assistantMsgs = chat.messages.filter(m => m.role === 'assistant');
          if (assistantMsgs.length > 0) {
            const reconstructed = selectedModels.map((sm, idx) => {
              const matchingMsg = assistantMsgs.find(m => m.modelIndex === idx || m.modelId === sm.id) || assistantMsgs[idx];
              return {
                ...sm,
                text: matchingMsg?.content || "",
                status: matchingMsg?.content ? ("completed" as const) : ("idle" as const),
                error: null,
                tokenCount: matchingMsg?.content ? Math.round(matchingMsg.content.length / 3.8) : 0,
                startTime: null,
                tps: 0
              };
            });
            setModelResponses(reconstructed);
            bufferedResponsesRef.current = reconstructed;
          }
        }
      }
    }
  }, [activeChatId, chats, isLoading, selectedModels]);

  useEffect(() => {
    const handleNewChatUIEvent = () => {
      // Clear UI streaming state on new chat
      setLastPrompt(null);
      const reset = selectedModels.map(model => ({ ...model, text: "", status: "idle" as const, error: null, tokenCount: 0, startTime: null, tps: 0 }));
      setModelResponses(reset);
      bufferedResponsesRef.current = reset;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsLoading(false);
    };
    
    window.addEventListener("new-chat-ui-reset", handleNewChatUIEvent);
    return () => window.removeEventListener("new-chat-ui-reset", handleNewChatUIEvent);
  }, [selectedModels]);

  useEffect(() => {
    const handleExport = () => {
      let exportText = "SWARM SESSION EXPORT\n\n";
      
      if (activeChatMessages && activeChatMessages.length > 0) {
        exportText += "FULL CONVERSATION THREAD:\n\n";
        activeChatMessages.forEach(msg => {
          if (msg.role === "user") {
            exportText += "=========================================\n";
            exportText += "USER PROMPT\n";
            exportText += "=========================================\n";
            exportText += msg.content + "\n\n";
          } else if (msg.role === "assistant") {
            exportText += "-----------------------------------------\n";
            exportText += `AI ASSISTANT (${msg.modelName || 'Unknown Model'})\n`;
            exportText += "-----------------------------------------\n";
            exportText += msg.content + "\n\n";
          }
        });
      } else {
        if (lastPrompt) exportText += "USER PROMPT:\n" + lastPrompt + "\n\n";
        modelResponses.forEach(m => {
          exportText += "=========================================\n";
          exportText += m.name + " (" + m.role + ")\n";
          exportText += "=========================================\n";
          exportText += m.text + "\n\n";
        });
      }

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
  }, [lastPrompt, modelResponses, activeChatMessages]);

  const [isWebSearchActive, setIsWebSearchActive] = useState(false);

  const handleExecute = async (prompt: string, image?: string | null, webSearch?: boolean) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLastPrompt(prompt);
    setIsWebSearchActive(Boolean(webSearch));
    
    // Ensure active chat session exists
    if (!activeChatId) {
      createNewChat();
    }
    
    // Auto-detect and store any explicit user memory requests (e.g. "my name is...", "remember that...")
    detectAndStoreMemory(prompt);

    // Append user turn to active chat message thread
    appendMessageToActiveChat({
      role: "user",
      content: prompt
    });

    setIsLoading(true);
    const now = Date.now();
    
    const isTough = isToughQuestion(prompt);
    let executionModels = selectedModels;

    // Automatically engage/disengage Performance Mode dynamically based on prompt complexity
    setPerformance(isTough);

    if (isTough) {
      if (selectedModels.length <= 1) {
        executionModels = SWAMP_MODELS;
        setSelectedModels(SWAMP_MODELS);
      }
    }

    // Multi-turn continuity: preserve existing conversation turns in each model card
    const currentResponses = bufferedResponsesRef.current;
    const initialResponses: ModelResponse[] = executionModels.map((m, idx) => {
      const existing = currentResponses[idx] || currentResponses.find(r => r.id === m.id);
      let existingTurns = existing?.turns ? [...existing.turns] : [];
      if (existingTurns.length === 0 && existing?.text) {
        existingTurns = [{
          prompt: lastPrompt || prompt,
          text: existing.text,
          status: "completed" as const,
          timestamp: existing.startTime || now
        }];
      }

      const newTurns = [
        ...existingTurns,
        { prompt, text: "", status: "computing" as const, timestamp: now }
      ];

      return {
        ...m,
        text: "",
        turns: newTurns,
        status: "computing" as const,
        error: null,
        tokenCount: 0,
        startTime: now,
        tps: 0
      };
    });
    bufferedResponsesRef.current = initialResponses;
    setModelResponses(initialResponses);

    // When user gives an input, automatically scroll JUST to the input area!
    scrollToInputArea(true);
    requestAnimationFrame(() => scrollToInputArea(true));
    setTimeout(() => scrollToInputArea(true), 40);
    setTimeout(() => scrollToInputArea(true), 120);
    setTimeout(() => scrollToInputArea(true), 250);

    try {
      // Try relative endpoint first (same origin), with absolute local fallbacks
      const candidateEndpoints = [
        "/api/stream",
        "http://localhost:3000/api/stream",
        "http://127.0.0.1:3000/api/stream"
      ];
      
      let response: Response | null = null;
      let lastErr: any = null;

      for (const ep of candidateEndpoints) {
        try {
          const res = await fetch(ep, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt,
              apiKeys,
              models: executionModels,
              image,
              isSwamp: isSwamp || isTough,
              isVibe: isVibe,
              isPerformance: isPerformance || isTough,
              memories,
              skills: activeSkills,
              webSearch: Boolean(webSearch),
              clientTimestamp: new Date().toISOString(),
              clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
              clientLocaleString: new Date().toLocaleString(),
              history: [...activeChatMessages, { role: "user", content: prompt, timestamp: Date.now() }]
            }),
            signal: controller.signal
          });
          if (res.ok && res.body) {
            response = res;
            break;
          } else {
            const errJson = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
            lastErr = new Error(errJson.error || `Server error (${res.status})`);
          }
        } catch (e: any) {
          if (e.name === "AbortError") throw e;
          lastErr = e;
        }
      }

      if (!response || !response.body) {
        // Seamlessly switch to standalone 100% independent client-side execution engine!
        await executeClientSwarm({
          prompt,
          apiKeys,
          models: executionModels,
          image,
          isSwamp: isSwamp || isTough,
          isVibe,
          isPerformance: isPerformance || isTough,
          memories,
          skills: activeSkills,
          webSearch: Boolean(webSearch),
          history: [...activeChatMessages, { role: "user", content: prompt, timestamp: Date.now() }],
          signal: controller.signal,
          onChunk: (idx, targetId, content) => {
            bufferedResponsesRef.current = bufferedResponsesRef.current.map((m, i) => {
              const isMatch = idx >= 0 ? i === idx : m.id === targetId;
              if (isMatch) {
                const estimatedTokens = Math.max(1, Math.round(content.length / 3.8));
                const newTokenCount = m.tokenCount + estimatedTokens;
                const elapsed = Math.max(0.1, (Date.now() - (m.startTime || Date.now())) / 1000);
                const rawTps = newTokenCount / elapsed;
                const newTps = parseFloat(Math.min(145, Math.max(18, rawTps)).toFixed(1));

                const turns = m.turns ? [...m.turns] : [];
                if (turns.length > 0) {
                  const lastTurn = { ...turns[turns.length - 1] };
                  lastTurn.text = (lastTurn.text || "") + content;
                  lastTurn.status = "computing";
                  turns[turns.length - 1] = lastTurn;
                } else {
                  turns.push({ prompt, text: (m.text || "") + content, status: "computing", timestamp: Date.now() });
                }

                return {
                  ...m,
                  text: m.text + content,
                  turns,
                  status: "computing",
                  error: null,
                  tokenCount: newTokenCount,
                  tps: newTps
                };
              }
              return m;
            });
            scheduleFlushUpdates();
          },
          onDone: (idx, targetId) => {
            bufferedResponsesRef.current = bufferedResponsesRef.current.map((m, i) => {
              const isMatch = idx >= 0 ? i === idx : m.id === targetId;
              if (isMatch) {
                const turns = m.turns ? [...m.turns] : [];
                if (turns.length > 0) {
                  turns[turns.length - 1] = { ...turns[turns.length - 1], status: "completed" };
                }
                return { ...m, turns, status: "completed", error: null };
              }
              return m;
            });
            flushUpdatesImmediately();
          },
          onError: (idx, targetId, errorMsg) => {
            bufferedResponsesRef.current = bufferedResponsesRef.current.map((m, i) => {
              const isMatch = idx >= 0 ? i === idx : m.id === targetId;
              if (isMatch) {
                const turns = m.turns ? [...m.turns] : [];
                if (turns.length > 0) {
                  turns[turns.length - 1] = { ...turns[turns.length - 1], status: "error" };
                }
                return { ...m, turns, status: "error", error: errorMsg };
              }
              return m;
            });
            flushUpdatesImmediately();
          }
        });
        return;
      }

      const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "message";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
              currentEvent = "message";
              continue;
            }

            if (trimmed.startsWith("event:")) {
              currentEvent = trimmed.slice(6).trim();
              continue;
            }

            if (trimmed.startsWith("data:")) {
              const dataStr = trimmed.slice(5).trim();
              if (!dataStr) continue;

              if (dataStr === "[DONE]") {
                bufferedResponsesRef.current = bufferedResponsesRef.current.map(m =>
                  m.status === "computing" ? { ...m, status: "completed" } : m
                );
                flushUpdatesImmediately();
                continue;
              }

              try {
                const parsed = JSON.parse(dataStr);
                const idx = typeof parsed.modelIndex === "number" ? parsed.modelIndex : -1;
                const targetId = parsed.modelId;

                if (currentEvent === "error" || parsed.error) {
                  const errorMsg = parsed.error || "Model request failed";
                  bufferedResponsesRef.current = bufferedResponsesRef.current.map((m, i) => {
                    const isMatch = (idx >= 0 ? i === idx : m.id === targetId);
                    if (isMatch) {
                      const turns = m.turns ? [...m.turns] : [];
                      if (turns.length > 0) {
                        turns[turns.length - 1] = { ...turns[turns.length - 1], status: "error" };
                      }
                      return { ...m, turns, status: "error", error: errorMsg };
                    }
                    return m;
                  });
                  flushUpdatesImmediately();
                } else if (currentEvent === "model_done") {
                  bufferedResponsesRef.current = bufferedResponsesRef.current.map((m, i) => {
                    const isMatch = (idx >= 0 ? i === idx : m.id === targetId);
                    if (isMatch) {
                      const turns = m.turns ? [...m.turns] : [];
                      if (turns.length > 0) {
                        turns[turns.length - 1] = { ...turns[turns.length - 1], status: "completed" };
                      }
                      return { ...m, turns, status: "completed", error: null };
                    }
                    return m;
                  });
                  flushUpdatesImmediately();
                } else if (parsed.content) {
                  const { content } = parsed;
                  bufferedResponsesRef.current = bufferedResponsesRef.current.map((m, i) => {
                    const isMatch = idx >= 0 ? i === idx : m.id === targetId;
                    if (isMatch) {
                      const estimatedTokens = Math.max(1, Math.round(content.length / 3.8));
                      const newTokenCount = m.tokenCount + estimatedTokens;
                      const elapsed = Math.max(0.1, (Date.now() - (m.startTime || Date.now())) / 1000);
                      const rawTps = newTokenCount / elapsed;
                      const newTps = parseFloat(Math.min(145, Math.max(18, rawTps)).toFixed(1));
                      
                      const turns = m.turns ? [...m.turns] : [];
                      if (turns.length > 0) {
                        const lastTurn = { ...turns[turns.length - 1] };
                        const proposed = (lastTurn.text || "") + content;
                        if (detectRepetitionLoop(proposed)) {
                          return { ...m, status: "completed" };
                        }
                        lastTurn.text = proposed;
                        lastTurn.status = "computing";
                        turns[turns.length - 1] = lastTurn;
                      } else {
                        const proposed = (m.text || "") + content;
                        if (detectRepetitionLoop(proposed)) {
                          return { ...m, status: "completed" };
                        }
                        turns.push({ prompt, text: proposed, status: "computing", timestamp: Date.now() });
                      }

                      return {
                        ...m,
                        text: m.text + content,
                        turns,
                        status: "computing",
                        error: null,
                        tokenCount: newTokenCount,
                        tps: newTps
                      };
                    }
                    return m;
                  });
                  scheduleFlushUpdates();
                }
              } catch {
                // Ignore incomplete fragments
              }
            }
          }
        }
    } catch (err: any) {
      if (err.name === "AbortError") {
        bufferedResponsesRef.current = bufferedResponsesRef.current.map(m =>
          m.status === "computing" ? { ...m, status: "completed" } : m
        );
        flushUpdatesImmediately();
        return;
      }
      const displayErr = (err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError") || err.message.toLowerCase().includes("network")))
        ? "Unable to connect to local server (http://localhost:3000). Please make sure 'npm run dev' is running in your terminal or check API keys in Settings ⚙️."
        : (err.message || "Connection fault");
      bufferedResponsesRef.current = bufferedResponsesRef.current.map(m =>
        (m.text && m.text.trim().length > 0)
          ? { ...m, status: "completed" as const, error: null }
          : { ...m, status: "error" as const, error: displayErr }
      );
      flushUpdatesImmediately();
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      const completedResponses = bufferedResponsesRef.current.map(m =>
        m.status === "computing" ? { ...m, status: "completed" as const } : m
      );
      bufferedResponsesRef.current = completedResponses;
      flushUpdatesImmediately();

      saveCurrentChat(prompt, completedResponses);
      const assistantMessages = completedResponses.filter(m => m.text).map((m, idx) => ({
        role: "assistant" as const,
        content: m.text,
        modelId: m.id,
        modelName: m.name,
        modelIndex: idx
      }));
      if (assistantMessages.length > 0) {
        appendMessagesToActiveChat(assistantMessages);
      }
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    bufferedResponsesRef.current = bufferedResponsesRef.current.map(m =>
      m.status === "computing" ? { ...m, status: "completed" } : m
    );
    flushUpdatesImmediately();
  };

  const handleClearChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setLastPrompt(null);
    clearActiveChat();
    const reset = selectedModels.map(model => ({ ...model, text: "", turns: [], status: "idle" as const, error: null, tokenCount: 0, startTime: null, tps: 0 }));
    setModelResponses(reset);
    bufferedResponsesRef.current = reset;
  };

  const handleClearModelResponse = (modelId: string) => {
    const updated = modelResponses.map(m => m.id === modelId ? { ...m, text: "", turns: [], status: "idle" as const, error: null, tokenCount: 0, tps: 0 } : m);
    setModelResponses(updated);
    bufferedResponsesRef.current = updated;
  };

  const handleRetryModel = async (modelId: string, modelIndex: number) => {
    if (!lastPrompt) return;
    const targetModel = selectedModels[modelIndex] || selectedModels.find(m => m.id === modelId);
    if (!targetModel) return;

    bufferedResponsesRef.current = bufferedResponsesRef.current.map((m, i) =>
      i === modelIndex ? { ...m, status: "computing" as const, error: null, text: "", tokenCount: 0, startTime: Date.now() } : m
    );
    setModelResponses([...bufferedResponsesRef.current]);

    try {
      const res = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: lastPrompt,
          apiKeys,
          models: [{ ...targetModel, targetIndex: modelIndex, swarmRoleIndex: modelIndex }],
          isSwamp,
          isVibe,
          isPerformance,
          memories,
          skills: activeSkills,
          webSearch: isWebSearchActive,
          clientTimestamp: new Date().toISOString(),
          clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          clientLocaleString: new Date().toLocaleString(),
          history: [...activeChatMessages, { role: "user", content: lastPrompt, timestamp: Date.now() }]
        })
      });

      if (!res.ok || !res.body) {
        throw new Error(`Server error (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                bufferedResponsesRef.current = bufferedResponsesRef.current.map((m, i) =>
                  i === modelIndex ? { ...m, text: m.text + parsed.content, tokenCount: m.tokenCount + Math.max(1, Math.round(parsed.content.length / 3.8)) } : m
                );
                scheduleFlushUpdates();
              } else if (parsed.error) {
                bufferedResponsesRef.current = bufferedResponsesRef.current.map((m, i) =>
                  i === modelIndex ? { ...m, status: "error" as const, error: parsed.error } : m
                );
                flushUpdatesImmediately();
              }
            } catch {}
          }
        }
      }
    } catch (e: any) {
      // Fallback directly to standalone client-side engine on retry!
      await executeClientSwarm({
        prompt: lastPrompt,
        apiKeys,
        models: [{ ...targetModel, targetIndex: modelIndex, swarmRoleIndex: modelIndex }],
        isSwamp,
        isVibe,
        isPerformance,
        memories,
        skills: activeSkills,
        history: [...activeChatMessages, { role: "user", content: lastPrompt, timestamp: Date.now() }],
        onChunk: (i, targetId, content) => {
          bufferedResponsesRef.current = bufferedResponsesRef.current.map((m, idx) =>
            idx === modelIndex ? { ...m, text: m.text + content, status: "computing" as const } : m
          );
          scheduleFlushUpdates();
        },
        onDone: (i, targetId) => {
          bufferedResponsesRef.current = bufferedResponsesRef.current.map((m, idx) =>
            idx === modelIndex ? { ...m, status: "completed" as const, error: null } : m
          );
          flushUpdatesImmediately();
        },
        onError: (i, targetId, errorMsg) => {
          bufferedResponsesRef.current = bufferedResponsesRef.current.map((m, idx) =>
            idx === modelIndex ? { ...m, status: "error" as const, error: errorMsg } : m
          );
          flushUpdatesImmediately();
        }
      });
    }
  };

  const handleContinueModel = async (modelId: string, modelIndex: number) => {
    const targetModel = selectedModels[modelIndex];
    const currentModelResp = bufferedResponsesRef.current[modelIndex];
    if (!targetModel || !currentModelResp || isLoading) return;

    setIsLoading(true);
    bufferedResponsesRef.current = bufferedResponsesRef.current.map((m, i) =>
      i === modelIndex ? { ...m, status: "computing" as const, error: null } : m
    );
    scheduleFlushUpdates();

    try {
      const candidateEndpoints = [
        "http://localhost:3000/api/stream",
        "http://127.0.0.1:3000/api/stream",
        "/api/stream"
      ];
      let response: Response | null = null;
      for (const ep of candidateEndpoints) {
        try {
          const res = await fetch(ep, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: "Resume writing the complete implementation immediately from the exact character where you stopped. Do not output conversational greetings, do not repeat already generated code, and complete all functions, styles, and closing tags.",
              apiKeys,
              models: [{ ...targetModel, targetIndex: modelIndex, swarmRoleIndex: modelIndex }],
              image: null,
              isSwamp,
              isVibe,
              skills: activeSkills,
              webSearch: isWebSearchActive,
              history: [
                ...activeChatMessages,
                { role: "assistant", content: currentModelResp.text, modelIndex },
                { role: "user", content: "Resume writing the complete implementation immediately from the exact character where you stopped. Do not output conversational greetings, do not repeat already generated code, and complete all functions, styles, and closing tags." }
              ]
            })
          });
          if (res.ok && res.body) {
            response = res;
            break;
          }
        } catch {}
      }

      if (!response || !response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "message";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) { currentEvent = "message"; continue; }
          if (trimmed.startsWith("event:")) { currentEvent = trimmed.slice(6).trim(); continue; }
          if (trimmed.startsWith("data:")) {
            const dataStr = trimmed.slice(5).trim();
            if (dataStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                bufferedResponsesRef.current = bufferedResponsesRef.current.map((m, i) => {
                  if (i === modelIndex) {
                    const estimatedTokens = Math.max(1, Math.round(parsed.content.length / 3.8));
                    return {
                      ...m,
                      text: m.text + parsed.content,
                      tokenCount: m.tokenCount + estimatedTokens,
                      status: "computing" as const
                    };
                  }
                  return m;
                });
                scheduleFlushUpdates();
              }
            } catch {}
          }
        }
      }
    } catch {} finally {
      setIsLoading(false);
      bufferedResponsesRef.current = bufferedResponsesRef.current.map((m, i) =>
        i === modelIndex ? { ...m, status: "completed" as const } : m
      );
      flushUpdatesImmediately();
      saveCurrentChat(lastPrompt || "Continuation", bufferedResponsesRef.current);
    }
  };

  const hasAnyContent = Boolean(lastPrompt || modelResponses.some(m => m.text));

  return (
    <div className="flex flex-col w-full h-full relative z-0">
      <div 
        ref={mainContainerRef} 
        onScroll={handleContainerScroll}
        className="w-full flex-1 overflow-y-auto pt-20 pb-56 sm:pb-64 px-0 smooth-scroll-viewport transition-colors duration-300 ease-out relative"
      >
        {/* Anti-Gravity Ambient Cosmic Field in Vibe Mode */}
        {isVibe && (
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 blur-[130px] rounded-full pointer-events-none animate-pulse" />
            <div className="absolute -top-10 left-10 w-96 h-96 bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-600/5 blur-[100px] rounded-full pointer-events-none" />
          </div>
        )}

        {/* Ambient Emerald Aurora in Swamp Mode */}
        {isSwamp && !isVibe && (
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[750px] h-[360px] bg-gradient-to-r from-emerald-500/15 via-green-500/12 to-teal-600/10 blur-[130px] rounded-full pointer-events-none animate-pulse" />
            <div className="absolute top-10 right-10 w-96 h-96 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-green-500/10 blur-[100px] rounded-full pointer-events-none" />
          </div>
        )}

        {/* Electric Royal Sapphire & Cyan Ambient Field in Performance Mode */}
        {isPerformance && (
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-blue-600/15 via-cyan-400/15 to-indigo-600/15 blur-[140px] rounded-full pointer-events-none animate-pulse" />
            <div className="absolute top-10 right-10 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />
          </div>
        )}

        {/* Auto-Performance Mode Banner on Tough Questions */}
        <AnimatePresence>
          {isPerformance && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 450, damping: 32 }}
              className="w-full max-w-4xl mx-auto px-4 sm:px-6 mb-4 z-20 relative pointer-events-auto"
            >
              <div className="apple-liquid-glass-performance rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-2xl relative overflow-hidden backdrop-blur-3xl border border-sky-400/40">
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-sky-400 to-transparent opacity-90" />
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-28 bg-gradient-to-b from-blue-600/30 to-transparent blur-2xl pointer-events-none" />

                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.6)] shrink-0 text-white animate-pulse">
                    <Cpu size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                        AUTO-PERFORMANCE MODE
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/40 animate-pulse">
                        5-AI PARALLEL ROSTER
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-mono text-sky-300/90 tracking-wide truncate">
                      Complex Question Detected • Quantum Azure Reasoning Engine Active
                    </p>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setPerformance(false)}
                  className="px-3 py-1 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-mono hover:bg-sky-500/25 transition-all cursor-pointer shrink-0"
                >
                  Reset Mode
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Autonomous VibeCodingEngine */}
        <VibeCodingEngine
          modelResponses={modelResponses}
          selectedModels={selectedModels}
          lastPrompt={lastPrompt}
          isStreaming={isLoading}
          isSwamp={isSwamp}
          isVibe={isVibe}
          apiKeys={apiKeys}
          onUpdateResponse={(index, updater) => {
            setModelResponses(prev => {
              const updated = prev.map((m, i) => i === index ? updater(m) : m);
              bufferedResponsesRef.current = updated;
              return updated;
            });
          }}
          onSetAllResponses={(action) => {
            setModelResponses(prev => {
              const updated = typeof action === "function" ? action(prev) : action;
              bufferedResponsesRef.current = updated;
              return updated;
            });
          }}
          onToggleVibe={toggleVibe}
          onToggleSwamp={toggleSwamp}
        />

        {/* Continuous Multi-Turn Chat Feed: Loads One Turn After Another (Like LLM models apps) */}
        <div className="w-full max-w-[1920px] mx-auto px-2 sm:px-4 md:px-6 flex-1 flex flex-col justify-start space-y-10 pb-36">
          {Array.from({ length: totalTurns }, (_, turnIndex) => {
            const turnPrompt = getPromptForTurn(turnIndex);
            const isLatestTurn = turnIndex === totalTurns - 1;

            return (
              <div
                key={turnIndex}
                ref={isLatestTurn ? latestTurnRef : undefined}
                id={isLatestTurn ? "latest-user-input" : undefined}
                className="w-full space-y-4 scroll-mt-24"
              >
                {/* User Prompt Bubble for this Turn */}
                {turnPrompt && (
                  <motion.div
                    id={isLatestTurn ? "latest-turn-prompt-bubble" : undefined}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className="w-full max-w-[1600px] mx-auto flex flex-col sm:flex-row justify-end items-end sm:items-center gap-3 px-2 sm:px-4 relative z-10"
                  >
                    <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-mono text-[var(--text-muted)]">
                        Turn {turnIndex + 1}
                      </span>
                      {turnIndex === 0 && memories.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-300 text-[11px] font-mono shadow-[0_0_12px_rgba(56,189,248,0.2)]">
                          <Brain size={12} className="text-sky-400 animate-pulse" />
                          <span>Memory ({memories.length})</span>
                        </span>
                      )}
                      {isLatestTurn && (
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={handleClearChat}
                          title="Delete this chat session"
                          className="p-1.5 rounded-full bg-[var(--pill-bg)] border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors shadow-sm flex items-center gap-1 text-xs font-medium cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span className="hidden sm:inline">Delete Chat</span>
                        </motion.button>
                      )}
                    </div>

                    <div className={`bg-[var(--pill-bg)] px-5 py-3.5 rounded-2xl md:rounded-3xl max-w-2xl w-full sm:w-auto text-[14px] leading-relaxed shadow-sm border transition-colors duration-300 ${
                      isPerformance
                        ? "border-sky-400/50 text-sky-100 [text-shadow:0_0_10px_rgba(56,189,248,0.8),0_0_20px_rgba(37,99,235,0.4)] shadow-[0_0_25px_rgba(56,189,248,0.25)]"
                        : isVibe 
                        ? "border-[#ec4899]/30 text-[#fae8ff] [text-shadow:0_0_10px_rgba(244,114,182,0.8),0_0_20px_rgba(244,114,182,0.4)] shadow-[0_0_20px_rgba(236,72,153,0.15)]"
                        : isSwamp 
                        ? "border-[#4ADE80]/30 text-[#dcfce7] [text-shadow:0_0_10px_rgba(74,222,128,0.5)]" 
                        : "border-[var(--glass-border)] text-[var(--text-primary)]"
                    }`}>
                      <div className="max-h-36 overflow-y-auto pr-1 text-left whitespace-pre-wrap select-text">
                        {turnPrompt}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 5-Model Cards Row for this Turn */}
                <div className="w-full">
                  <div className={`w-full flex ${
                    selectedModels.length === 1 
                      ? "justify-center" 
                      : "overflow-x-auto md:overflow-x-visible gap-2.5 sm:gap-3 lg:gap-3.5 pb-2 snap-x snap-mandatory focus:outline-none scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  }`}>
                    {modelResponses.map((model, index) => (
                      <div 
                        key={`${model.id}_turn_${turnIndex}`} 
                        className={`h-full ${
                          selectedModels.length === 1 
                            ? "w-full max-w-4xl" 
                            : "w-[85vw] md:w-auto md:flex-1 min-w-0 flex-shrink-0 md:flex-shrink"
                        }`}
                      >
                        <ModelCardColumn
                          model={model}
                          displayTurnIndex={turnIndex}
                          totalModels={selectedModels.length}
                          isVibe={isVibe}
                          isSwamp={isSwamp}
                          isPerformance={isPerformance}
                          isStreaming={isLoading && isLatestTurn}
                          onClear={() => handleClearModelResponse(model.id)}
                          onContinue={() => handleContinueModel(model.id, index)}
                          onRetry={() => handleRetryModel(model.id, index)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {/* Feed Bottom Anchor to guarantee 100% reliable bottom auto-scrolling */}
          <div ref={bottomAnchorRef} id="feed-bottom-anchor" className="h-6 w-full pointer-events-none" />
        </div>
      </div>

      {/* Floating Go to Bottom Directly Button */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            initial={{ opacity: 0, y: 16, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.88 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => scrollToBottom(true)}
            title="Go to bottom directly"
            className="fixed bottom-24 right-4 sm:right-8 z-40 px-3.5 py-2 rounded-full apple-liquid-glass bg-black/80 border border-white/20 text-white shadow-2xl hover:bg-white/15 hover:border-white/40 transition-all flex items-center gap-2 cursor-pointer group pointer-events-auto"
          >
            <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
              <ChevronDown size={14} className="text-[var(--accent-primary)] animate-bounce" />
            </div>
            <span className="text-xs font-mono font-medium tracking-wide">
              Bottom
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <FloatingInput isStreaming={isLoading} onSend={handleExecute} onStop={handleStop} />
    </div>
  );
}

// Check if model text appears truncated / incomplete
function checkIsTruncated(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  const codeTicks = (text.match(/```/g) || []).length;
  if (codeTicks % 2 !== 0) return true;
  if (/[({[=,:+\-*\/\\|&!~?]\s*$/.test(trimmed)) return true;
  if (trimmed.endsWith("...")) return true;
  if (trimmed.includes("<html") && !trimmed.includes("</html>")) return true;
  if (trimmed.includes("<body") && !trimmed.includes("</body>")) return true;
  if (trimmed.includes("<script") && !trimmed.includes("</script>")) return true;
  if (trimmed.includes("<style") && !trimmed.includes("</style>")) return true;
  return false;
}

// High-performance memoized Model Card Column with smooth spring entrance animation
const ModelCardColumn = React.memo(function ModelCardColumn({
  model,
  displayTurnIndex,
  totalModels,
  isVibe,
  isSwamp,
  isPerformance,
  isStreaming,
  onClear,
  onContinue,
  onRetry
}: {
  model: ModelResponse;
  displayTurnIndex: number;
  totalModels: number;
  isVibe: boolean;
  isSwamp: boolean;
  isPerformance?: boolean;
  isStreaming: boolean;
  onClear: () => void;
  onContinue: () => void;
  onRetry: () => void;
}) {
  // Resolve current turn text and status
  const currentTurn = (model.turns && model.turns.length > 0)
    ? (model.turns[displayTurnIndex] || model.turns[model.turns.length - 1])
    : null;

  const currentText = currentTurn ? currentTurn.text : model.text;
  const isTurnLatest = !model.turns || displayTurnIndex >= model.turns.length - 1;
  const isTurnComputing = isTurnLatest && model.status === "computing";
  const isTruncated = !isTurnComputing && checkIsTruncated(currentText);
  const [showTerminal, setShowTerminal] = useState(false);

  // Auto-extract any generated code snippet for 1-click terminal execution
  const extractedCode = useMemo(() => {
    if (!currentText) return undefined;
    const match = currentText.match(/```(?:[a-zA-Z0-9_-]*)\n([\s\S]*?)```/);
    return match ? match[1].trim() : undefined;
  }, [currentText]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.8 }}
      className="w-full h-full flex flex-col items-start text-left [contain:content] rounded-[24px] sm:rounded-[28px] p-3.5 sm:p-4 lg:p-4.5 transition-all duration-300 relative overflow-hidden group apple-liquid-glass hover:border-white/20 hover:bg-white/[0.05]"
    >
      {/* Specular Liquid Edge Highlight on every Card */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-80 pointer-events-none z-10" />

      {/* Header / Apple Aligned */}
      <div className="flex items-center gap-2 sm:gap-2.5 pb-2.5 mb-3 border-b border-[var(--border-subtle)] w-full transition-colors duration-300">
        <div className={`p-1.5 rounded-lg transition-colors duration-300 shrink-0 ${
          isPerformance ? "bg-sky-500/15 text-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.4)]" : isVibe ? "bg-[#ec4899]/10 text-[#f472b6]" : isSwamp ? "bg-[#4ADE80]/10 text-[#4ADE80]" : "bg-[var(--pill-bg)] text-[var(--text-muted)]"
        }`}>
          <BotMessageSquare size={16} className="flex-shrink-0 transition-colors duration-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] tracking-tight transition-colors duration-300 truncate">{model.name}</h3>
            {(model.status === "computing" || model.status === "completed" || (currentText && currentText.trim().length > 0)) && (
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full transition-all duration-300 flex-shrink-0 border ${
                isTurnComputing
                  ? isPerformance
                    ? "bg-sky-500/20 text-sky-200 border-sky-400/40 shadow-[0_0_12px_rgba(56,189,248,0.4)] animate-pulse"
                    : isVibe
                    ? "bg-[#ec4899]/20 text-[#fae8ff] border-[#ec4899]/40 shadow-[0_0_10px_rgba(236,72,153,0.3)] animate-pulse"
                    : "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--accent-primary)]/30 animate-pulse"
                  : "bg-[var(--pill-bg)] text-[var(--text-muted)] border-[var(--glass-border)]"
              }`}>
                {model.tokenCount > 0 ? `${model.tokenCount} tkns` : "0 tkns"}
              </span>
            )}
          </div>
          <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider transition-colors duration-300 truncate">{model.role}</p>
        </div>

        {/* Dedicated Terminal Power Button for every AI Model */}
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowTerminal(!showTerminal)}
          title={`Open interactive Terminal for ${model.name}`}
          className={`p-1.5 rounded-lg transition-all shrink-0 cursor-pointer flex items-center gap-1 font-mono text-[10px] ${
            showTerminal 
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
              : "text-[var(--text-muted)] hover:text-white hover:bg-white/10"
          }`}
        >
          <Terminal size={13} className={showTerminal ? "text-emerald-400" : ""} />
          <span className="hidden sm:inline font-bold">Term</span>
        </motion.button>

        {currentText && (
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={onClear}
            title={`Clear ${model.name} output`}
            className="text-[var(--text-muted)] hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-colors shrink-0 cursor-pointer"
          >
            <Trash2 size={13} />
          </motion.button>
        )}
        <div className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 flex-shrink-0 ${
          isTurnComputing 
            ? isPerformance ? "bg-sky-400 animate-pulse shadow-[0_0_10px_#38bdf8]" : isVibe ? "bg-[#ec4899] animate-pulse shadow-[0_0_10px_#ec4899]" : "bg-[var(--accent-primary)] animate-pulse" 
            : currentText 
            ? isPerformance ? "bg-sky-400 shadow-[0_0_8px_#38bdf8]" : isVibe ? "bg-[#c084fc] shadow-[0_0_8px_#c084fc]" : "bg-[#10B981]" 
            : "bg-[var(--text-muted)] opacity-30"
        }`} />
      </div>

      {/* Interactive AI Terminal for this Model */}
      <AiTerminal
        modelName={model.name}
        modelRole={model.role}
        codeSnippet={extractedCode}
        isOpen={showTerminal}
        onClose={() => setShowTerminal(false)}
        onExecutePrompt={(promptText) => {
          window.dispatchEvent(new CustomEvent('send-swarm-prompt', { detail: { prompt: promptText } }));
        }}
      />

      {/* Response Area: Left-Aligned Clean Markdown Output */}
      <div className="flex-1 w-full text-left min-h-[400px]">
        {/* Error Notification */}
        {model.error && !currentText && (
          <div className="w-full flex items-start gap-3 p-3.5 rounded-2xl bg-red-950/40 border border-red-500/30 backdrop-blur-xl text-red-200 text-xs mb-3 shadow-lg">
            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
            <div className="flex-1 min-w-0">
              <span className="leading-relaxed block">{model.error}</span>
              <button
                onClick={onRetry}
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-[11px] font-mono transition-all active:scale-95 cursor-pointer"
              >
                <Play size={11} fill="currentColor" />
                <span>Retry Model Stream</span>
              </button>
            </div>
          </div>
        )}

        {/* Empty Idle State */}
        {!currentText && !isTurnComputing && (
          <span className="text-[var(--text-muted)]/40 italic font-mono text-xs transition-colors duration-300">
            {isVibe && isSwamp 
              ? "awaiting vibe swarm synthesis delegation..."
              : isVibe 
              ? "vibe mode ready..."
              : isSwamp 
              ? "awaiting system delegation..." 
              : "ready for prompt..."}
          </span>
        )}

        {/* Computing Skeleton Wave */}
        {!currentText && isTurnComputing && (
          <div className="space-y-3 py-2 w-full">
            <div className={`flex items-center gap-2 text-xs font-mono animate-pulse ${
              isPerformance ? "text-sky-400" : isVibe ? "text-[#f472b6]" : "text-[var(--accent-primary)]"
            }`}>
              <span className={`inline-block w-2 h-2 rounded-full animate-ping ${
                isPerformance ? "bg-sky-400" : isVibe ? "bg-[#ec4899]" : "bg-[var(--accent-primary)]"
              }`} />
              <span>
                {isPerformance
                  ? "Parallel Reasoning Stream Active..."
                  : isVibe && isSwamp 
                  ? "Anti-Gravity Vibe Swarm Synthesis Active..." 
                  : isVibe 
                  ? "Vibe Mode: Stream Active..." 
                  : isSwamp 
                  ? "Swamp Swarm Role Stream Active..." 
                  : "Parallel Reasoning Stream Active..."}
              </span>
            </div>
            <div className="space-y-2 opacity-40">
              <div className="h-3.5 w-4/5 rounded bg-[var(--pill-bg)] animate-pulse" />
              <div className="h-3.5 w-3/5 rounded bg-[var(--pill-bg)] animate-pulse delay-75" />
              <div className="h-3.5 w-2/3 rounded bg-[var(--pill-bg)] animate-pulse delay-150" />
            </div>
          </div>
        )}

        {/* Clean Response Output with Live Streaming Caret */}
        {currentText && (
          <div className="w-full relative">
            <MarkdownRenderer content={currentText} />
            {isTurnComputing && (
              <span className="streaming-caret" />
            )}
            {isTruncated && !isStreaming && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onContinue}
                className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-xs text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/25 transition-all font-mono font-medium shadow-sm cursor-pointer"
                title="Continue generating code from where it stopped"
              >
                <Play size={12} className="fill-current" />
                <span>Continue Writing ⚡</span>
              </motion.button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});
