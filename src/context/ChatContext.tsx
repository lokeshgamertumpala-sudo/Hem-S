import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AIModel } from './ModelContext';

export interface ModelTurn {
  prompt: string;
  text: string;
  status?: "computing" | "completed" | "error";
  timestamp?: number;
}

export interface ModelResponse {
  id: string;
  name: string;
  role: string;
  text: string;
  turns?: ModelTurn[];
  status: "idle" | "computing" | "completed" | "error";
  error: string | null;
  tokenCount: number;
  startTime: number | null;
  tps: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isContinuation?: boolean;
  continuationMarker?: string;
  modelId?: string;
  modelName?: string;
  modelIndex?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  prompt: string | null;
  responses: ModelResponse[];
  messages: ChatMessage[];
}

interface ChatContextType {
  chats: ChatSession[];
  activeChatId: string | null;
  activeChatMessages: ChatMessage[];
  createNewChat: () => void;
  loadChat: (id: string) => void;
  deleteChat: (id: string) => void;
  clearAllChats: () => void;
  clearActiveChat: () => void;
  saveCurrentChat: (prompt: string, responses: ModelResponse[]) => void;
  appendMessageToActiveChat: (msg: Omit<ChatMessage, "id" | "timestamp"> & { id?: string; timestamp?: number }) => ChatMessage;
  appendMessagesToActiveChat: (msgs: (Omit<ChatMessage, "id" | "timestamp"> & { id?: string; timestamp?: number })[]) => ChatMessage[];
  appendContinuationToThread: (options: {
    targetModelIndex: number;
    modelId: string;
    modelName: string;
    currentText: string;
    tailContext?: string;
    customPrompt?: string;
  }) => { updatedHistory: ChatMessage[]; continuationMarker: string };
  updateActiveChatMessages: (messages: ChatMessage[]) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function sanitizeTitle(text: string): string {
  if (!text) return "New Session";
  let clean = text
    .replace(/[*#`_~>\[\]\(\)\{\}\\\n\r]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean || clean.length === 0) return "New Session";
  return clean.length > 32 ? clean.slice(0, 32) + "..." : clean;
}

const generateUniqueId = (prefix = "chat") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}_${Math.floor(Math.random() * 1000000)}`;

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem("omnimodel_chats_v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          const sanitized: ChatSession[] = [];
          for (let i = 0; i < parsed.length; i++) {
            const item = parsed[i];
            let id = item.id ? String(item.id) : generateUniqueId("chat");
            if (seen.has(id)) {
              id = `${id}_${Math.random().toString(36).slice(2, 7)}`;
            }
            seen.add(id);
            sanitized.push({
              ...item,
              id,
              title: sanitizeTitle(item.title || item.prompt || "New Session"),
              messages: Array.isArray(item.messages) ? item.messages : []
            });
          }
          return sanitized;
        }
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    const savedId = localStorage.getItem("omnimodel_active_chat_v1");
    if (savedId) {
      return savedId;
    }
    return null;
  });

  useEffect(() => {
    localStorage.setItem("omnimodel_chats_v1", JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem("omnimodel_active_chat_v1", activeChatId);
    } else {
      localStorage.removeItem("omnimodel_active_chat_v1");
    }
  }, [activeChatId]);

  const activeChat = chats.find(c => c.id === activeChatId);
  const activeChatMessages = activeChat?.messages || [];

  const createNewChat = (): string => {
    const newId = generateUniqueId("chat");
    setActiveChatId(newId);
    return newId;
  };

  const loadChat = (id: string) => {
    setActiveChatId(id);
  };

  const deleteChat = (id: string) => {
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) {
      setActiveChatId(generateUniqueId("chat"));
    }
  };

  const clearAllChats = () => {
    setChats([]);
    setActiveChatId(generateUniqueId("chat"));
    localStorage.removeItem("omnimodel_chats_v1");
    localStorage.removeItem("omnimodel_active_chat_v1");
  };

  const clearActiveChat = () => {
    if (activeChatId) {
      setChats(prev => prev.filter(c => c.id !== activeChatId));
    }
    setActiveChatId(generateUniqueId("chat"));
  };

  const saveCurrentChat = (prompt: string, responses: ModelResponse[]) => {
    if (!prompt.trim() && responses.every(r => !r.text)) return;
    setChats(prev => {
      const targetId = activeChatId || generateUniqueId("chat");
      if (!activeChatId) {
        setActiveChatId(targetId);
      }

      const existingIndex = prev.findIndex(c => c.id === targetId);
      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        let updatedMessages = existing.messages || [];
        if (updatedMessages.length === 0 && prompt.trim()) {
          updatedMessages = [
            {
              id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              role: "user",
              content: prompt,
              timestamp: Date.now()
            }
          ];
        }
        const updated = [...prev];
        updated[existingIndex] = { ...existing, prompt, responses, messages: updatedMessages };
        return updated;
      } else {
        const initialMessages: ChatMessage[] = prompt.trim() ? [
          {
            id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role: "user",
            content: prompt,
            timestamp: Date.now()
          }
        ] : [];

        // Remove any stale session with duplicate ID just in case
        const filtered = prev.filter(c => c.id !== targetId);

        return [{
          id: targetId,
          title: sanitizeTitle(prompt),
          timestamp: Date.now(),
          prompt,
          responses,
          messages: initialMessages
        }, ...filtered];
      }
    });
  };

  const appendMessageToActiveChat = (msg: Omit<ChatMessage, "id" | "timestamp"> & { id?: string; timestamp?: number }): ChatMessage => {
    const newMessage: ChatMessage = {
      id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || Date.now(),
      isContinuation: msg.isContinuation,
      continuationMarker: msg.continuationMarker,
      modelId: msg.modelId,
      modelName: msg.modelName,
      modelIndex: msg.modelIndex
    };

    setChats(prev => {
      const targetId = activeChatId || generateUniqueId("chat");
      if (!activeChatId) {
        setActiveChatId(targetId);
      }

      const existingIndex = prev.findIndex(c => c.id === targetId);
      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        const updated = [...prev];
        updated[existingIndex] = {
          ...existing,
          messages: [...(existing.messages || []), newMessage]
        };
        return updated;
      } else {
        const filtered = prev.filter(c => c.id !== targetId);
        return [{
          id: targetId,
          title: sanitizeTitle(msg.content),
          timestamp: Date.now(),
          prompt: msg.content,
          responses: [],
          messages: [newMessage]
        }, ...filtered];
      }
    });

    return newMessage;
  };

  const appendMessagesToActiveChat = (msgs: (Omit<ChatMessage, "id" | "timestamp"> & { id?: string; timestamp?: number })[]): ChatMessage[] => {
    if (!msgs || msgs.length === 0) return [];
    
    const newMessages: ChatMessage[] = msgs.map(msg => ({
      id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || Date.now(),
      isContinuation: msg.isContinuation,
      continuationMarker: msg.continuationMarker,
      modelId: msg.modelId,
      modelName: msg.modelName,
      modelIndex: msg.modelIndex
    }));

    setChats(prev => {
      const targetId = activeChatId || generateUniqueId("chat");
      if (!activeChatId) {
        setActiveChatId(targetId);
      }

      const existingIndex = prev.findIndex(c => c.id === targetId);
      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        const updated = [...prev];
        updated[existingIndex] = {
          ...existing,
          messages: [...(existing.messages || []), ...newMessages]
        };
        return updated;
      } else {
        const filtered = prev.filter(c => c.id !== targetId);
        return [{
          id: targetId,
          title: newMessages[0]?.content.substring(0, 30) || "New Chat",
          timestamp: Date.now(),
          prompt: newMessages[0]?.content || "",
          responses: [],
          messages: newMessages
        }, ...filtered];
      }
    });

    return newMessages;
  };

  const appendContinuationToThread = ({
    targetModelIndex,
    modelId,
    modelName,
    currentText,
    tailContext,
    customPrompt
  }: {
    targetModelIndex: number;
    modelId: string;
    modelName: string;
    currentText: string;
    tailContext?: string;
    customPrompt?: string;
  }): { updatedHistory: ChatMessage[]; continuationMarker: string } => {
    const continuationMarker = `[CONTINUE_SYNTHESIS_PASS:slot_${targetModelIndex}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}]`;
    
    const continuationUserPrompt = customPrompt || 
      `Continue the code generation seamlessly from the previous cutoff point. Do not repeat anything already written above and do not restart from line 1. Output pure continuation code.`;

    let newHistory: ChatMessage[] = [];

    setChats(prev => {
      const targetId = activeChatId || generateUniqueId("chat");
      if (!activeChatId) {
        setActiveChatId(targetId);
      }

      const existing = prev.find(c => c.id === targetId);
      const prevMessages = existing?.messages ? [...existing.messages] : [];

      const hasPriorAssistantTurn = prevMessages.some(m => m.role === "assistant" && m.modelIndex === targetModelIndex);
      
      const turnsToAdd: ChatMessage[] = [];

      if (!hasPriorAssistantTurn && currentText.trim().length > 0) {
        turnsToAdd.push({
          id: `asst-${targetModelIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: "assistant",
          content: currentText,
          modelId,
          modelName,
          modelIndex: targetModelIndex,
          timestamp: Date.now() - 1000
        });
      }

      const continuationTurn: ChatMessage = {
        id: `continue-${targetModelIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: "user",
        content: continuationUserPrompt,
        isContinuation: true,
        continuationMarker,
        modelIndex: targetModelIndex,
        timestamp: Date.now()
      };

      turnsToAdd.push(continuationTurn);
      newHistory = [...prevMessages, ...turnsToAdd];

      if (existing) {
        return prev.map(c => c.id === targetId ? {
          ...c,
          messages: newHistory
        } : c);
      } else {
        const filtered = prev.filter(c => c.id !== targetId);
        return [{
          id: targetId,
          title: "Continuation Session",
          timestamp: Date.now(),
          prompt: null,
          responses: [],
          messages: newHistory
        }, ...filtered];
      }
    });

    return { updatedHistory: newHistory, continuationMarker };
  };

  const updateActiveChatMessages = (messages: ChatMessage[]) => {
    setChats(prev => {
      return prev.map(c => c.id === activeChatId ? { ...c, messages } : c);
    });
  };

  return (
    <ChatContext.Provider value={{
      chats,
      activeChatId,
      activeChatMessages,
      createNewChat,
      loadChat,
      deleteChat,
      clearAllChats,
      clearActiveChat,
      saveCurrentChat,
      appendMessageToActiveChat,
      appendMessagesToActiveChat,
      appendContinuationToThread,
      updateActiveChatMessages
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChats() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChats must be used within a ChatProvider');
  }
  return context;
}
