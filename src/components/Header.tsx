import { motion } from 'motion/react';
import { Menu, ChevronDown, Activity, Droplets, Sparkles, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useModels } from '../context/ModelContext';
import { useSkills } from '../context/SkillContext';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenModels: () => void;
  onOpenSkills?: () => void;
}

export function Header({ onToggleSidebar, onOpenModels, onOpenSkills }: HeaderProps) {
  const { selectedModels, applyThemeModels } = useModels();
  const { activeSkills } = useSkills();
  const activeModelsCount = selectedModels.length;
  const { mode, toggleTheme, isVibe, toggleVibe } = useTheme();
  const isSwamp = mode === 'swamp';

  const handleToggleSwamp = () => {
    const nextIsSwamp = !isSwamp;
    toggleTheme();
    applyThemeModels(nextIsSwamp);
  };

  return (
    <motion.header 
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      className="fixed top-0 inset-x-0 z-40 h-14 sm:h-16 flex items-center justify-between px-2.5 sm:px-6 pointer-events-none"
    >
      <div className="pointer-events-auto">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onToggleSidebar}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full apple-liquid-glass flex items-center justify-center text-[var(--text-primary)] transition-all hover:bg-white/10 hover:border-white/25 active:scale-95"
          title="Open menu"
        >
          <Menu size={18} />
        </motion.button>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto shrink-0">
        {/* Swamp Swarm Mode Button */}
        <motion.button 
          whileTap={{ scale: 0.94 }}
          onClick={handleToggleSwamp}
          role="switch"
          aria-checked={isSwamp}
          title={isSwamp ? "Swarm Mode Active (5-AI Role Decomposition) - Click to toggle" : "Swarm Mode - Click to activate 5-AI parallel role swarm"}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full backdrop-blur-3xl border cursor-pointer transition-all duration-300 whitespace-nowrap shrink-0 text-xs select-none ${
            isSwamp 
              ? 'border-[#4ADE80]/60 bg-[#4ADE80]/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_0_20px_rgba(74,222,128,0.3)]' 
              : 'apple-liquid-glass hover:bg-white/10'
          }`}
        >
          <div className="relative flex h-2 w-2 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSwamp ? 'bg-[#4ADE80]' : 'bg-[#10B981]'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 shrink-0 ${isSwamp ? 'bg-[#4ADE80] drop-shadow-[0_0_6px_#4ADE80]' : 'bg-[#10B981]'}`}></span>
          </div>
          <span className={`text-[11px] sm:text-xs font-semibold -tracking-tight transition-colors duration-300 ${isSwamp ? 'text-[#4ADE80] drop-shadow-[0_0_4px_rgba(74,222,128,0.5)]' : 'text-[var(--text-primary)]'}`}>
            Swarm
          </span>
          <Droplets size={12} className={`shrink-0 transition-colors duration-300 ${isSwamp ? 'text-[#4ADE80] drop-shadow-[0_0_4px_#4ADE80]' : 'text-[var(--text-muted)]'}`} />
        </motion.button>

        {/* Spark Button (Vibe Coding Optimization) */}
        <motion.button 
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            const nextVibe = !isVibe;
            toggleVibe();
            if (nextVibe && !isSwamp) {
              handleToggleSwamp();
            }
          }}
          role="switch"
          aria-checked={isVibe}
          title={isVibe ? "Vibe Mode (Active) - Click to deactivate" : "Vibe Mode"}
          className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full backdrop-blur-3xl border flex items-center justify-center cursor-pointer transition-all duration-300 shrink-0 select-none ${
            isVibe 
              ? 'border-[#ec4899]/80 bg-gradient-to-tr from-[#ec4899] via-[#c084fc] to-[#a855f7] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_0_22px_rgba(236,72,153,0.6)]' 
              : 'apple-liquid-glass text-[var(--accent-primary)] hover:bg-white/10 hover:text-[var(--text-primary)]'
          }`}
        >
          {isVibe && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f472b6] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ec4899] shadow-[0_0_6px_#f472b6]"></span>
            </span>
          )}
          <Sparkles 
            size={16} 
            className={`transition-transform duration-300 ${
              isVibe 
                ? 'text-white fill-white/20 animate-spin drop-shadow-[0_0_8px_rgba(255,255,255,0.9)] [animation-duration:6s]' 
                : 'text-[var(--accent-primary)]'
            }`} 
          />
        </motion.button>

        {/* AI Skills Section Button */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={onOpenSkills}
          title="Configure AI Skills & Specialized Directives"
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full backdrop-blur-3xl border cursor-pointer transition-all duration-300 whitespace-nowrap shrink-0 text-[11px] sm:text-xs select-none ${
            activeSkills.length > 0
              ? 'border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/15 shadow-[0_0_16px_rgba(217,119,87,0.25)] text-[var(--text-primary)]'
              : 'apple-liquid-glass hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Zap size={12} className={`shrink-0 ${activeSkills.length > 0 ? 'text-[var(--accent-primary)] animate-pulse' : ''}`} />
          <span className="font-semibold -tracking-tight">
            Skills{activeSkills.length > 0 ? ` (${activeSkills.length})` : ''}
          </span>
        </motion.button>

        {/* Model Selector Button */}
        <motion.div 
          whileTap={{ scale: 0.94 }}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1 sm:py-2 rounded-full apple-liquid-glass cursor-pointer hover:bg-white/10 hover:border-white/25 transition-all whitespace-nowrap shrink-0"
          onClick={onOpenModels}
          title="Configure AI models"
        >
          <Activity size={12} className="text-[var(--accent-primary)] transition-colors duration-300 shrink-0" />
          <span className="text-[10px] sm:text-xs font-semibold text-[var(--text-primary)] -tracking-tight transition-colors duration-300">
            <span className="sm:hidden">{activeModelsCount}/5</span>
            <span className="hidden sm:inline">{activeModelsCount}/5 Models</span>
          </span>
          <ChevronDown size={12} className="text-[var(--text-muted)] transition-colors duration-300 shrink-0" />
        </motion.div>
      </div>
    </motion.header>
  );
}
