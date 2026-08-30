import { motion, AnimatePresence } from 'motion/react';
import { Model, Message } from '../types';
import { useEffect, useRef } from 'react';

interface ChatAreaProps {
  models: Model[];
  messages: Message[];
}

export function ChatArea({ models, messages }: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  type Round = {
    id: string;
    userMessage: Message;
    modelMessages: Record<string, Message>;
  };
  
  const rounds: Round[] = [];
  let currentRound: Round | null = null;
  
  messages.forEach(msg => {
    if (msg.role === 'user') {
      if (currentRound) rounds.push(currentRound);
      currentRound = { id: msg.id, userMessage: msg, modelMessages: {} };
    } else if (msg.role === 'model' && currentRound && msg.modelId) {
      currentRound.modelMessages[msg.modelId] = msg;
    }
  });
  if (currentRound) rounds.push(currentRound);

  return (
    <div ref={scrollRef} className="flex-1 w-full mx-auto px-0 md:px-6 pt-24 pb-[260px] overflow-y-auto scroll-smooth">
      <div className="max-w-[1600px] mx-auto w-full">
        <AnimatePresence initial={false}>
          {rounds.map((round, idx) => (
            <motion.div 
              key={`${round.id}-${idx}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.9 }}
              className="mb-12"
            >
              {/* User Message */}
              <div className="mb-6 flex justify-end px-4 md:px-0">
                <div className="max-w-[85%] md:max-w-2xl bg-[#22201D]/40 backdrop-blur-md border border-white/[0.04] rounded-[24px] px-6 py-4 text-[#F5F2EB] leading-[1.65] -tracking-tight shadow-sm">
                  {round.userMessage.content}
                </div>
              </div>
              
              {/* Model Responses */}
              <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible items-start px-4 md:px-0">
                {models.map((model, idx) => {
                  const response = round.modelMessages[model.id];
                  return (
                    <div key={`${model.id}-${idx}`} className="w-[88vw] shrink-0 snap-center md:w-auto md:shrink">
                      <div className="backdrop-blur-xl bg-[#22201D]/30 border border-white/[0.06] rounded-[28px] overflow-hidden flex flex-col h-full shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-white/[0.04] bg-white/[0.01]">
                          <h3 className="font-semibold text-[#F5F2EB] -tracking-tight flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${response && response.content ? 'bg-[#10B981]' : 'bg-[#D97757]/50 animate-pulse'}`} />
                            <span className="truncate">{model.name}</span>
                          </h3>
                          <div className="text-xs text-[#A89F91] mt-1.5 font-mono tracking-tight flex gap-3 opacity-80">
                            <span>TTFT: {model.ttft || '--'}ms</span>
                            <span>TPS: {model.tps || '--'}</span>
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="px-5 py-5 text-[#F5F2EB] leading-[1.65] -tracking-tight text-[15px] min-h-[120px] whitespace-pre-wrap font-sans">
                          {response && response.content ? response.content : (
                            <div className="flex space-x-1.5 items-center h-6 opacity-40">
                              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} className="w-1.5 h-1.5 bg-[#F5F2EB] rounded-full" />
                              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 bg-[#F5F2EB] rounded-full" />
                              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 bg-[#F5F2EB] rounded-full" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
