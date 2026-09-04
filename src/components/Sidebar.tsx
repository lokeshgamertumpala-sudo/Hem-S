import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Settings, Download, Plus, Trash2, Zap } from 'lucide-react';
import { useChats } from '../context/ChatContext';
import { useSkills } from '../context/SkillContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenSkills?: () => void;
}

export function Sidebar({ isOpen, onClose, onOpenSettings, onOpenSkills }: SidebarProps) {
  const { chats, activeChatId, createNewChat, loadChat, deleteChat, clearAllChats } = useChats();
  const { activeSkills } = useSkills();

  const handleNewChat = () => {
    createNewChat();
    window.dispatchEvent(new Event("new-chat-ui-reset"));
    onClose();
  };

  const handleExportChat = () => {
    window.dispatchEvent(new Event("export-chat"));
    onClose();
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    deleteChat(chatId);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.9 }}
            className="fixed top-0 left-0 bottom-0 w-72 backdrop-blur-3xl bg-[var(--glass-bg)] border-r border-[var(--glass-border)] shadow-[var(--glass-shadow)] z-50 p-6 flex flex-col transition-colors duration-700"
          >
            <div className="flex items-center justify-between mb-8">
              <span className="text-lg font-medium text-[var(--text-primary)] -tracking-tight transition-colors duration-700">Swarm Sessions</span>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={18} />
              </motion.button>
            </div>
            
            <div className="mt-4 mb-4"> 
              <motion.button 
                onClick={handleNewChat}
                whileTap={{ scale: 0.98 }} 
                className="w-full px-4 py-3 rounded-xl bg-[var(--accent-primary)] hover:opacity-90 text-[var(--bg-base)] flex items-center gap-3 transition-colors text-sm font-medium -tracking-tight shadow-md"
              >
                <Plus size={18} />
                New Chat
              </motion.button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2 mb-3">
                  <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider transition-colors duration-700">History</h3>
                  {chats.length > 0 && (
                    <button 
                      onClick={() => clearAllChats()} 
                      className="text-[10px] text-[var(--text-muted)] hover:text-red-400 transition-colors uppercase tracking-wider flex items-center gap-1"
                      title="Delete all chat history"
                    >
                      <Trash2 size={11} />
                      Clear All
                    </button>
                  )}
                </div>
                {chats.map((chat, idx) => (
                  <div 
                    key={`${chat.id}-${idx}`} 
                    onClick={() => { loadChat(chat.id); onClose(); }}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 text-[var(--text-primary)] text-sm transition-colors duration-700 cursor-pointer ${activeChatId === chat.id ? 'bg-white/5' : ''}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Clock size={16} className={`${activeChatId === chat.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'} transition-colors duration-700 flex-shrink-0`} />
                      <span className={`truncate text-xs ${activeChatId === chat.id ? 'text-[var(--accent-primary)] font-medium' : 'text-[var(--text-primary)]'}`}>
                        {chat.title || 'Empty Session'}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteChat(e, chat.id)} 
                      className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 active:bg-red-500/20 active:scale-95 transition-all flex-shrink-0"
                      title="Delete this chat"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {chats.length === 0 && (
                  <p className="px-3 text-xs text-[var(--text-muted)]">No saved chats.</p>
                )}
              </div>
            </div>
            
            <div className="mt-auto space-y-2 pt-6 border-t border-[var(--glass-border)] transition-colors duration-700">
              <motion.button 
                onClick={handleExportChat}
                whileTap={{ scale: 0.98 }} 
                className="w-full px-4 py-3 rounded-xl hover:bg-white/5 text-[var(--text-primary)] flex items-center gap-3 transition-colors text-sm font-medium -tracking-tight"
              >
                <Download size={18} className="text-[var(--text-muted)] transition-colors duration-700" />
                Export Session
              </motion.button>
              <motion.button 
                onClick={() => {
                  onClose();
                  onOpenSkills?.();
                }} 
                whileTap={{ scale: 0.98 }} 
                className="w-full px-4 py-3 rounded-xl hover:bg-white/5 text-[var(--text-primary)] flex items-center justify-between transition-colors text-sm font-medium -tracking-tight cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Zap size={18} className="text-[var(--accent-primary)]" />
                  <span>AI Skills & Directives</span>
                </div>
                {activeSkills.length > 0 && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
                    {activeSkills.length} Active
                  </span>
                )}
              </motion.button>
              <motion.button 
                onClick={onOpenSettings} 
                whileTap={{ scale: 0.98 }} 
                className="w-full px-4 py-3 rounded-xl hover:bg-white/5 text-[var(--text-primary)] flex items-center gap-3 transition-colors text-sm font-medium -tracking-tight"
              >
                <Settings size={18} className="text-[var(--text-muted)] transition-colors duration-700" />
                API Keys
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
