import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Search, Plus, Trash2, Code2, Zap, Brain, Palette, 
  Shield, Calculator, Cloud, Database, LineChart, Smartphone, 
  Terminal, Dna, Lightbulb, Bot, CheckCircle2, Cpu, Globe, Image as ImageIcon, Video
} from 'lucide-react';
import { useSkills, AISkill } from '../context/SkillContext';

interface SkillsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SkillsModal({ isOpen, onClose }: SkillsModalProps) {
  const { skills, activeSkills, toggleSkill, addCustomSkill, deleteCustomSkill } = useSkills();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Custom skill form
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<AISkill['category']>('engineering');
  const [newSkillDescription, setNewSkillDescription] = useState('');
  const [newSkillPrompt, setNewSkillPrompt] = useState('');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'generative_media', label: 'AI Image Gen' },
    { id: 'engineering', label: 'Engineering' },
    { id: 'ai_data', label: 'AI & Data' },
    { id: 'research', label: 'Research' },
    { id: 'design', label: 'Design' },
    { id: 'security', label: 'Security' },
    { id: 'reasoning', label: 'Math' },
    { id: 'writing', label: 'Executive' },
    { id: 'custom', label: 'Custom' },
  ];

  const filteredSkills = skills.filter(skill => {
    const matchesCategory = selectedCategory === 'all' 
      ? true 
      : selectedCategory === 'custom' 
      ? skill.isCustom 
      : skill.category === selectedCategory;
    
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesName = skill.name.toLowerCase().includes(query);
    const matchesDesc = skill.description.toLowerCase().includes(query);
    return matchesCategory && (matchesName || matchesDesc);
  });

  const getSkillIcon = (iconName: string) => {
    const cls = "shrink-0";
    switch (iconName) {
      case 'image': return <ImageIcon size={15} className={`${cls} text-pink-400`} />;
      case 'video': return <Video size={15} className={`${cls} text-rose-400`} />;
      case 'globe': return <Globe size={15} className={`${cls} text-sky-400`} />;
      case 'code': return <Code2 size={15} className={`${cls} text-sky-400`} />;
      case 'zap': return <Zap size={15} className={`${cls} text-amber-400`} />;
      case 'brain': return <Brain size={15} className={`${cls} text-purple-400`} />;
      case 'palette': return <Palette size={15} className={`${cls} text-pink-400`} />;
      case 'shield': return <Shield size={15} className={`${cls} text-emerald-400`} />;
      case 'calculator': return <Calculator size={15} className={`${cls} text-yellow-400`} />;
      case 'cloud': return <Cloud size={15} className={`${cls} text-cyan-400`} />;
      case 'database': return <Database size={15} className={`${cls} text-teal-400`} />;
      case 'smartphone': return <Smartphone size={15} className={`${cls} text-violet-400`} />;
      case 'bot': return <Bot size={15} className={`${cls} text-indigo-400`} />;
      case 'terminal': return <Terminal size={15} className={`${cls} text-red-400`} />;
      case 'dna': return <Dna size={15} className={`${cls} text-cyan-300`} />;
      case 'lightbulb': return <Lightbulb size={15} className={`${cls} text-amber-300`} />;
      case 'line-chart': return <LineChart size={15} className={`${cls} text-emerald-300`} />;
      case 'check-circle': return <CheckCircle2 size={15} className={`${cls} text-lime-400`} />;
      default: return <Cpu size={15} className={`${cls} text-orange-400`} />;
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim() || !newSkillPrompt.trim()) return;

    addCustomSkill({
      name: newSkillName.trim(),
      category: newSkillCategory,
      icon: newSkillCategory === 'engineering' ? 'code' : newSkillCategory === 'design' ? 'palette' : 'brain',
      description: newSkillDescription.trim() || 'Custom autonomous AI directive.',
      systemPrompt: newSkillPrompt.trim(),
      tags: ['Custom'],
      enabled: true
    });

    setNewSkillName('');
    setNewSkillDescription('');
    setNewSkillPrompt('');
    setIsCreating(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window: Apple Bottom-Sheet on Mobile, Centered Dialog on Desktop */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 30 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="relative w-full max-w-4xl max-h-[90vh] sm:max-h-[86vh] flex flex-col apple-liquid-glass rounded-t-[28px] sm:rounded-[32px] overflow-hidden shadow-2xl border border-white/15 bg-[var(--bg-base)]/95 text-[var(--text-primary)]"
        >
          {/* Mobile Sheet Grabber Handle */}
          <div className="sm:hidden w-10 h-1 rounded-full bg-white/20 mx-auto mt-2.5 mb-1 shrink-0" />

          {/* Top Specular Edge */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none z-10" />

          {/* Unified Header & Tab Navigation Bar */}
          <div className="px-4 sm:px-6 pt-2 sm:pt-5 pb-0 border-b border-white/[0.08] bg-white/[0.01]">
            {/* Top Row: Title, Active Count, Search, Close */}
            <div className="flex items-center justify-between gap-2 pb-3 sm:pb-4">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                  <Zap size={15} />
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <h2 className="text-sm sm:text-base font-semibold tracking-tight text-[var(--text-primary)] truncate">
                    AI Skills
                  </h2>
                  {activeSkills.length > 0 && (
                    <span className="text-[10px] sm:text-[11px] font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shrink-0">
                      {activeSkills.length} active
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Search Input: Mobile Ergonomic Width */}
                <div className="relative w-32 xs:w-44 sm:w-56">
                  <Search size={12} className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-7 sm:pl-8 pr-2.5 sm:pr-3 py-1 sm:py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-[11px] sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-all"
                  />
                </div>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Bottom Row: Linear/Vercel Style Clean Sliding Underline Tabs */}
            <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch] -mb-[1px] px-1">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`pb-2.5 sm:pb-3 text-[11.5px] sm:text-xs font-medium transition-colors relative whitespace-nowrap cursor-pointer shrink-0 ${
                    selectedCategory === cat.id
                      ? 'text-white font-semibold'
                      : 'text-[var(--text-muted)] hover:text-white'
                  }`}
                >
                  <span>{cat.label}</span>
                  {selectedCategory === cat.id && (
                    <motion.div
                      layoutId="activeSkillTabLine"
                      className="absolute bottom-0 inset-x-0 h-[2px] bg-[var(--accent-primary)] rounded-full shadow-[0_0_8px_rgba(217,119,87,0.8)]"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Main 2-Column Grid Area */}
          <div className="flex-1 overflow-y-auto pt-3 sm:pt-5 pb-5 sm:pb-6 px-3.5 sm:px-6 space-y-2.5 sm:space-y-3.5 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* Custom Skill Accordion Form */}
            <AnimatePresence>
              {isCreating && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCreateSubmit}
                  className="p-3.5 sm:p-5 rounded-2xl bg-white/[0.03] border border-[var(--accent-primary)]/40 shadow-lg space-y-2.5 sm:space-y-3 mb-3 overflow-hidden"
                >
                  <div className="text-xs font-semibold text-[var(--accent-primary)] flex items-center gap-1.5">
                    <Plus size={14} /> New Custom Skill
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                    <input
                      type="text"
                      value={newSkillName}
                      onChange={e => setNewSkillName(e.target.value)}
                      placeholder="Skill Name (e.g. Next.js Specialist)"
                      className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                    <select
                      value={newSkillCategory}
                      onChange={e => setNewSkillCategory(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                    >
                      <option value="engineering">Engineering</option>
                      <option value="ai_data">AI & Data</option>
                      <option value="research">Research</option>
                      <option value="design">Design</option>
                      <option value="security">Security</option>
                      <option value="reasoning">Math</option>
                      <option value="writing">Executive</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    value={newSkillDescription}
                    onChange={e => setNewSkillDescription(e.target.value)}
                    placeholder="Short Description"
                    className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                  <textarea
                    value={newSkillPrompt}
                    onChange={e => setNewSkillPrompt(e.target.value)}
                    rows={2}
                    placeholder="System prompt instructions for AI models..."
                    className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/15 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-3 py-1 rounded-lg text-xs text-[var(--text-muted)] hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1 rounded-lg text-xs font-semibold bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Add Skill
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Geometrically Perfect 2-Column Cards (Responsive 1-col on mobile) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5">
              {filteredSkills.map(skill => (
                <div
                  key={skill.id}
                  onClick={() => toggleSkill(skill.id)}
                  className={`min-h-[96px] sm:h-[106px] rounded-2xl p-3 sm:p-3.5 border transition-all duration-200 flex flex-col justify-between cursor-pointer group select-none relative overflow-hidden ${
                    skill.enabled
                      ? 'bg-white/[0.07] border-[var(--accent-primary)]/60 shadow-[0_0_16px_rgba(217,119,87,0.12)]'
                      : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.045]'
                  }`}
                >
                  {/* Subtle top specular sheen */}
                  <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

                  {/* Header Row: Icon + Title & Category + Toggle Switch */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                        skill.enabled ? 'bg-white/10 border-white/20' : 'bg-white/[0.03] border-white/5 opacity-80'
                      }`}>
                        {getSkillIcon(skill.icon)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-semibold tracking-tight text-[var(--text-primary)] truncate">
                            {skill.name}
                          </h4>
                          {skill.isCustom && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                              Custom
                            </span>
                          )}
                          {(skill.id === "image_generation_ai" || skill.id === "video_generation_ai") && (
                            <span className="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/35 shrink-0 font-medium">
                              ⚡ Auto-Models
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] sm:text-[9.5px] font-mono uppercase tracking-wider text-[var(--text-muted)] block truncate">
                          {skill.category.replace('_', ' & ')}
                        </span>
                      </div>
                    </div>

                    {/* Right: Custom Delete + Smooth Apple Toggle Switch */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      {skill.isCustom && (
                        <button
                          onClick={() => deleteCustomSkill(skill.id)}
                          title="Delete skill"
                          className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-red-400 transition-opacity"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}

                      <button
                        onClick={() => toggleSkill(skill.id)}
                        role="switch"
                        aria-checked={skill.enabled}
                        className={`w-8.5 h-5 sm:w-9 sm:h-5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                          skill.enabled ? 'bg-[var(--accent-primary)]' : 'bg-white/15'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                          skill.enabled ? 'translate-x-3.5 sm:translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>

                  {/* Body: Uniform 2-Line Description */}
                  <p className="text-[11px] sm:text-[11.5px] text-[var(--text-muted)] leading-relaxed line-clamp-2 pr-1 pt-1.5 sm:pt-0">
                    {skill.description}
                  </p>
                </div>
              ))}
            </div>

            {filteredSkills.length === 0 && (
              <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                No skills found matching "{searchQuery}".
              </div>
            )}
          </div>

          {/* Minimal Footer */}
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:pb-3.5 border-t border-white/[0.08] flex items-center justify-between bg-white/[0.01]">
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="text-xs font-medium text-[var(--accent-primary)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus size={13} />
              <span>New Custom Skill</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 sm:px-5 py-1.5 sm:py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shadow-sm"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
