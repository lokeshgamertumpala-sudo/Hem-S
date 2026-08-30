import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, AlertTriangle, Layers, Search, Sparkles, RotateCcw } from 'lucide-react';
import { useModels, AIModel, DEFAULT_MODELS, SWAMP_MODELS } from '../context/ModelContext';

export const MODEL_REGISTRY: Record<string, Array<{ id: string; name: string; role: string; details?: string }>> = {
  "all_models": [
    { id: "z-ai/glm-5.2", name: "GLM 5.2 (Z-AI)", role: "Flagship", details: "Frontier bilingual reasoning and deep architecture synthesis model with extensive 128k context." },
    { id: "openai/gpt-oss-120b", name: "OpenAI GPT OSS 120B", role: "Flagship", details: "120B parameter high-productivity model for complex agentic workflows, math, and instruction." },
    { id: "01-ai/yi-large", name: "Yi Large", role: "Flagship", details: "Bilingual flagship frontier model with deep multi-step comprehension and rigorous reasoning." },
    { id: "nvidia/nemotron-4-340b-instruct", name: "Nemotron 4 340B", role: "Flagship", details: "Massive 340B parameter analytical powerhouse." },
    { id: "nvidia/nemotron-3-ultra-550b-a55b", name: "Nemotron 3 Ultra 550B", role: "Flagship", details: "Heavyweight 550B parameter frontier model." },
    { id: "mistralai/mistral-large-2-instruct", name: "Mistral Large 2", role: "Flagship", details: "123B parameter flagship model with 128k context." },
    { id: "nvidia/llama-3.1-nemotron-70b-instruct", name: "Nemotron 70B", role: "Flagship", details: "NVIDIA optimized 70B parameter frontier intelligence." },
    { id: "nvidia/llama-3.1-nemotron-ultra-253b-v1", name: "Nemotron Ultra 253B", role: "Flagship", details: "Ultra-scale 253B parameter dense reasoning model." },
    { id: "mistralai/mixtral-8x22b-v0.1", name: "Mixtral 8x22B MoE", role: "Flagship", details: "176B parameter sparse MoE model with high reasoning speed." },
    { id: "ai21labs/jamba-1.5-large-instruct", name: "Jamba 1.5 Large", role: "Flagship", details: "Hybrid SSM-Transformer architecture for high-throughput reasoning." },
    { id: "databricks/dbrx-instruct", name: "Databricks DBRX 132B", role: "Flagship", details: "132B fine-grained MoE architecture with deep programming knowledge." },
    { id: "writer/palmyra-creative-122b", name: "Palmyra Creative 122B", role: "Flagship", details: "122B parameter creative and technical long-form generation model." },
    { id: "meta/muse-glimmer-30b", name: "Muse Glimmer 30B", role: "Flagship", details: "Creative, multi-step analytical reasoning model." },
    { id: "deepseek-ai/deepseek-v4-flash-0731", name: "DeepSeek V4 Flash", role: "Coding/Math", details: "State-of-the-art MoE reasoning model for code synthesis and algorithmic problem solving." },
    { id: "deepseek-ai/deepseek-v4-pro-0813", name: "DeepSeek V4 Pro", role: "Coding/Math", details: "Heavyweight deep-reasoning coding and math engine." },
    { id: "poolside/laguna-xs-2.1", name: "Laguna XS 2.1", role: "Coding/Math", details: "Specialized algorithmic and software engineering model." },
    { id: "mistralai/codestral-22b-instruct-v0.1", name: "Codestral 22B", role: "Coding/Math", details: "High-precision code completion and software architecture engine." },
    { id: "google/codegemma-7b", name: "CodeGemma 7B", role: "Coding/Math", details: "Google specialized code generation and verification model." },
    { id: "google/codegemma-1.1-7b", name: "CodeGemma 1.1 7B", role: "Coding/Math", details: "Updated 7B code generation specialist." },
    { id: "meta/codellama-70b", name: "CodeLlama 70B", role: "Coding/Math", details: "70B parameter dedicated code synthesis engine." },
    { id: "ibm/granite-34b-code-instruct", name: "Granite 34B Code", role: "Coding/Math", details: "Enterprise-grade software synthesis and refactoring model." },
    { id: "ibm/granite-8b-code-instruct", name: "Granite 8B Code", role: "Coding/Math", details: "High-speed code completion and bug fixing engine." },
    { id: "bigcode/starcoder2-15b", name: "StarCoder2 15B", role: "Coding/Math", details: "600+ programming language coverage and API synthesis." },
    { id: "deepseek-ai/deepseek-coder-6.7b-instruct", name: "DeepSeek Coder 6.7B", role: "Coding/Math", details: "Project-level repository reasoning and code completion." },
    { id: "nvidia/cosmos-reason2-8b", name: "Cosmos Reason 8B", role: "Coding/Math", details: "NVIDIA physical reasoning and mathematical problem solver." },
    { id: "meta/llama-3.2-11b-vision-instruct", name: "Llama 3.2 11B Vision", role: "Vision", details: "Native image-text multimodal reasoning and comprehension." },
    { id: "meta/llama-3.2-90b-vision-instruct", name: "Llama 3.2 90B Vision", role: "Vision", details: "Frontier vision-language understanding at massive 90B scale." },
    { id: "microsoft/phi-3-vision-128k-instruct", name: "Phi-3 Vision 128k", role: "Vision", details: "Multimodal document analysis and technical diagram solver." },
    { id: "minimaxai/minimax-m3", name: "MiniMax M3", role: "Vision", details: "Omni-modal visual assistant with OCR and chart reasoning." },
    { id: "google/deplot", name: "Google DePlot", role: "Vision", details: "Plot, chart, and visual table reasoning engine." },
    { id: "adept/fuyu-8b", name: "Adept Fuyu 8B", role: "Vision", details: "Direct image-patch reasoning for UI navigation and diagrams." },
    { id: "microsoft/kosmos-2", name: "Kosmos-2", role: "Vision", details: "Grounding and visual object detection reasoning." },
    { id: "nvidia/neva-22b", name: "NeVA 22B", role: "Vision", details: "NVIDIA visual assistant for high-resolution visual analysis." },
    { id: "nvidia/vila", name: "NVIDIA VILA", role: "Vision", details: "Visual language model for multi-image sequential reasoning." },
    { id: "moonshotai/kimi-k2.6", name: "Moonshot Kimi K2.6", role: "Normal", details: "High-capability UI, CSS, styling, and design reasoning specialist." },
    { id: "moonshotai/kimi-k3", name: "Moonshot Kimi K3", role: "Normal", details: "Next-gen long-context conversational reasoning engine." },
    { id: "google/gemma-4-31b-it", name: "Gemma 4 31B", role: "Normal", details: "Google 31B instruction-tuned Gemma model." },
    { id: "google/gemma-3-12b-it", name: "Gemma 3 12B", role: "Normal", details: "Balanced daily instruction and synthesis model." },
    { id: "google/gemma-3-4b-it", name: "Gemma 3 4B", role: "Normal", details: "Lightweight, responsive daily conversation model." },
    { id: "google/diffusiongemma-26b-a4b-it", name: "DiffusionGemma 26B", role: "Normal", details: "Multi-turn conversational generation model." },
    { id: "microsoft/phi-3.5-moe-instruct", name: "Phi 3.5 MoE", role: "Normal", details: "High-efficiency MoE conversational model." },
    { id: "nvidia/mistral-nemo-minitron-8b-8k-instruct", name: "Minitron 8B", role: "Normal", details: "Fast, lightweight instruction model." },
    { id: "nvidia/llama-3.1-nemotron-51b-instruct", name: "Nemotron 51B", role: "Normal", details: "Balanced parameter scale for fast conversational inference." },
    { id: "ibm/granite-3.0-8b-instruct", name: "Granite 3.0 8B", role: "Normal", details: "General purpose reasoning and task orchestration." },
    { id: "ibm/granite-3.0-3b-a800m-instruct", name: "Granite 3.0 3B", role: "Normal", details: "Ultra-fast compact instruction model." },
    { id: "nv-mistralai/mistral-nemo-12b-instruct", name: "Mistral NeMo 12B", role: "Normal", details: "Joint NVIDIA-Mistral 12B instruction model." },
    { id: "mistralai/mistral-7b-instruct-v0.3", name: "Mistral 7B Instruct", role: "Normal", details: "Reliable, high-efficiency conversational model." },
    { id: "meta/llama2-70b", name: "Llama 2 70B", role: "Normal", details: "70B parameter open instruction model." },
    { id: "aisingapore/sea-lion-7b-instruct", name: "SEA-LION 7B", role: "Normal", details: "Multilingual and conversational assistant." },
    { id: "zyphra/zamba2-7b-instruct", name: "Zamba2 7B", role: "Normal", details: "State-space Mamba-Transformer hybrid model." },
    { id: "writer/palmyra-med-70b", name: "Palmyra Med 70B", role: "Normal", details: "Specialized biomedical and technical reasoning model." }
  ],
  "flagship": [
    { id: "z-ai/glm-5.2", name: "GLM 5.2 (Z-AI)", role: "Flagship", details: "Frontier bilingual reasoning and deep architecture synthesis model with extensive 128k context." },
    { id: "openai/gpt-oss-120b", name: "OpenAI GPT OSS 120B", role: "Flagship", details: "120B parameter high-productivity model for complex agentic workflows, math, and instruction." },
    { id: "01-ai/yi-large", name: "Yi Large", role: "Flagship", details: "Bilingual flagship frontier model with deep multi-step comprehension and rigorous reasoning." },
    { id: "nvidia/nemotron-4-340b-instruct", name: "Nemotron 4 340B", role: "Flagship", details: "Massive 340B parameter analytical powerhouse." },
    { id: "nvidia/nemotron-3-ultra-550b-a55b", name: "Nemotron 3 Ultra 550B", role: "Flagship", details: "Heavyweight 550B parameter frontier model." },
    { id: "mistralai/mistral-large-2-instruct", name: "Mistral Large 2", role: "Flagship", details: "123B parameter flagship model with 128k context." },
    { id: "nvidia/llama-3.1-nemotron-70b-instruct", name: "Nemotron 70B", role: "Flagship", details: "NVIDIA optimized 70B parameter frontier intelligence." },
    { id: "nvidia/llama-3.1-nemotron-ultra-253b-v1", name: "Nemotron Ultra 253B", role: "Flagship", details: "Ultra-scale 253B parameter dense reasoning model." },
    { id: "mistralai/mixtral-8x22b-v0.1", name: "Mixtral 8x22B MoE", role: "Flagship", details: "176B parameter sparse MoE model with high reasoning speed." },
    { id: "ai21labs/jamba-1.5-large-instruct", name: "Jamba 1.5 Large", role: "Flagship", details: "Hybrid SSM-Transformer architecture for high-throughput reasoning." },
    { id: "databricks/dbrx-instruct", name: "Databricks DBRX 132B", role: "Flagship", details: "132B fine-grained MoE architecture with deep programming knowledge." },
    { id: "writer/palmyra-creative-122b", name: "Palmyra Creative 122B", role: "Flagship", details: "122B parameter creative and technical long-form generation model." },
    { id: "meta/muse-glimmer-30b", name: "Muse Glimmer 30B", role: "Flagship", details: "Creative, multi-step analytical reasoning model." }
  ],
  "coding_and_maths": [
    { id: "deepseek-ai/deepseek-v4-flash-0731", name: "DeepSeek V4 Flash", role: "Coding/Math", details: "State-of-the-art MoE reasoning model for code synthesis and algorithmic problem solving." },
    { id: "deepseek-ai/deepseek-v4-pro-0813", name: "DeepSeek V4 Pro", role: "Coding/Math", details: "Heavyweight deep-reasoning coding and math engine." },
    { id: "poolside/laguna-xs-2.1", name: "Laguna XS 2.1", role: "Coding/Math", details: "Specialized algorithmic and software engineering model." },
    { id: "mistralai/codestral-22b-instruct-v0.1", name: "Codestral 22B", role: "Coding/Math", details: "High-precision code completion and software architecture engine." },
    { id: "google/codegemma-7b", name: "CodeGemma 7B", role: "Coding/Math", details: "Google specialized code generation and verification model." },
    { id: "google/codegemma-1.1-7b", name: "CodeGemma 1.1 7B", role: "Coding/Math", details: "Updated 7B code generation specialist." },
    { id: "meta/codellama-70b", name: "CodeLlama 70B", role: "Coding/Math", details: "70B parameter dedicated code synthesis engine." },
    { id: "ibm/granite-34b-code-instruct", name: "Granite 34B Code", role: "Coding/Math", details: "Enterprise-grade software synthesis and refactoring model." },
    { id: "ibm/granite-8b-code-instruct", name: "Granite 8B Code", role: "Coding/Math", details: "High-speed code completion and bug fixing engine." },
    { id: "bigcode/starcoder2-15b", name: "StarCoder2 15B", role: "Coding/Math", details: "600+ programming language coverage and API synthesis." },
    { id: "deepseek-ai/deepseek-coder-6.7b-instruct", name: "DeepSeek Coder 6.7B", role: "Coding/Math", details: "Project-level repository reasoning and code completion." },
    { id: "nvidia/cosmos-reason2-8b", name: "Cosmos Reason 8B", role: "Coding/Math", details: "NVIDIA physical reasoning and mathematical problem solver." }
  ],
  "visual_inputs": [
    { id: "black-forest-labs/flux-1-schnell", name: "FLUX.1 Schnell", role: "Image Gen", details: "State-of-the-art 12B parameter flow transformer for instantaneous photorealistic image generation." },
    { id: "stabilityai/stable-diffusion-3.5-large", name: "SD 3.5 Large", role: "Image Gen", details: "8B parameter MMDiT generative diffusion model for complex prompt adherence and typography." },
    { id: "google/diffusiongemma-26b-a4b-it", name: "DiffusionGemma 26B", role: "Vision/Aesthetics", details: "Google specialized diffusion-guided vision and aesthetics engine." },
    { id: "meta/llama-3.2-11b-vision-instruct", name: "Llama 3.2 11B Vision", role: "Vision", details: "Native image-text multimodal reasoning and comprehension." },
    { id: "meta/llama-3.2-90b-vision-instruct", name: "Llama 3.2 90B Vision", role: "Vision", details: "Frontier vision-language understanding at massive 90B scale." },
    { id: "microsoft/phi-3-vision-128k-instruct", name: "Phi-3 Vision 128k", role: "Vision", details: "Multimodal document analysis and technical diagram solver." },
    { id: "minimaxai/minimax-m3", name: "MiniMax M3", role: "Vision", details: "Omni-modal visual assistant." },
    { id: "google/deplot", name: "Google DePlot", role: "Vision", details: "Plot, chart, and visual table reasoning engine." },
    { id: "adept/fuyu-8b", name: "Adept Fuyu 8B", role: "Vision", details: "Direct image-patch reasoning for UI navigation and diagrams." },
    { id: "microsoft/kosmos-2", name: "Kosmos-2", role: "Vision", details: "Grounding and visual object detection reasoning." },
    { id: "nvidia/neva-22b", name: "NeVA 22B", role: "Vision", details: "NVIDIA visual assistant for high-resolution visual analysis." },
    { id: "nvidia/vila", name: "NVIDIA VILA", role: "Vision", details: "Visual language model for multi-image sequential reasoning." }
  ],
  "normal": [
    { id: "moonshotai/kimi-k2.6", name: "Moonshot Kimi K2.6", role: "Normal", details: "High-capability UI, CSS, styling, and design reasoning specialist." },
    { id: "moonshotai/kimi-k3", name: "Moonshot Kimi K3", role: "Normal", details: "Next-gen long-context conversational reasoning engine." },
    { id: "google/gemma-4-31b-it", name: "Gemma 4 31B", role: "Normal", details: "Google 31B instruction-tuned Gemma model." },
    { id: "google/gemma-3-12b-it", name: "Gemma 3 12B", role: "Normal", details: "Balanced daily instruction and synthesis model." },
    { id: "google/gemma-3-4b-it", name: "Gemma 3 4B", role: "Normal", details: "Lightweight, responsive daily conversation model." },
    { id: "google/diffusiongemma-26b-a4b-it", name: "DiffusionGemma 26B", role: "Normal", details: "Multi-turn conversational generation model." },
    { id: "microsoft/phi-3.5-moe-instruct", name: "Phi 3.5 MoE", role: "Normal", details: "High-efficiency MoE conversational model." },
    { id: "nvidia/mistral-nemo-minitron-8b-8k-instruct", name: "Minitron 8B", role: "Normal", details: "Fast, lightweight instruction model." },
    { id: "nvidia/llama-3.1-nemotron-51b-instruct", name: "Nemotron 51B", role: "Normal", details: "Balanced parameter scale for fast conversational inference." },
    { id: "ibm/granite-3.0-8b-instruct", name: "Granite 3.0 8B", role: "Normal", details: "General purpose reasoning and task orchestration." },
    { id: "ibm/granite-3.0-3b-a800m-instruct", name: "Granite 3.0 3B", role: "Normal", details: "Ultra-fast compact instruction model." },
    { id: "nv-mistralai/mistral-nemo-12b-instruct", name: "Mistral NeMo 12B", role: "Normal", details: "Joint NVIDIA-Mistral 12B instruction model." },
    { id: "mistralai/mistral-7b-instruct-v0.3", name: "Mistral 7B Instruct", role: "Normal", details: "Reliable, high-efficiency conversational model." },
    { id: "meta/llama2-70b", name: "Llama 2 70B", role: "Normal", details: "70B parameter open instruction model." },
    { id: "aisingapore/sea-lion-7b-instruct", name: "SEA-LION 7B", role: "Normal", details: "Multilingual and conversational assistant." },
    { id: "zyphra/zamba2-7b-instruct", name: "Zamba2 7B", role: "Normal", details: "State-space Mamba-Transformer hybrid model." },
    { id: "writer/palmyra-med-70b", name: "Palmyra Med 70B", role: "Normal", details: "Specialized biomedical and technical reasoning model." }
  ]
};

interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModelSelectionModal({ isOpen, onClose }: ModelSelectionModalProps) {
  const { selectedModels, setSelectedModels } = useModels();
  const [tempModels, setTempModels] = useState<AIModel[]>(selectedModels);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activeCategory, setActiveCategory] = useState<keyof typeof MODEL_REGISTRY>("all_models");
  const [searchQuery, setSearchQuery] = useState("");

  // Sync state when opened
  React.useEffect(() => {
    if (isOpen) {
      setTempModels(selectedModels);
      setSaveStatus("idle");
      setSearchQuery("");
      setActiveCategory("all_models");
    }
  }, [isOpen, selectedModels]);

  const handleToggleModel = (model: Omit<AIModel, 'category'>, category: string) => {
    const isSelected = tempModels.some(m => m.id === model.id);
    if (isSelected) {
      setTempModels(prev => prev.filter(m => m.id !== model.id));
    } else {
      if (tempModels.length >= 5) {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 2000);
        return;
      }
      setTempModels(prev => [...prev, { ...model, category }]);
    }
  };

  const handleSave = () => {
    if (tempModels.length === 0) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2000);
      return;
    }
    setSaveStatus("saving");
    setSelectedModels(tempModels);
    setSaveStatus("saved");
    setTimeout(() => {
      setSaveStatus("idle");
      onClose();
    }, 800);
  };

  // Filter models based on search query or active category
  const displayedModels = useMemo(() => {
    if (!searchQuery.trim()) {
      return MODEL_REGISTRY[activeCategory].map(m => ({ ...m, category: activeCategory }));
    }
    const q = searchQuery.toLowerCase().trim();
    const results: Array<{ id: string; name: string; role: string; details?: string; category: string }> = [];
    Object.entries(MODEL_REGISTRY).forEach(([cat, models]) => {
      models.forEach(m => {
        if (
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q) ||
          (m.details && m.details.toLowerCase().includes(q))
        ) {
          results.push({ ...m, category: cat });
        }
      });
    });
    return results;
  }, [searchQuery, activeCategory]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-2xl bg-[#141312]/80"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 35, mass: 0.9 }}
            className="w-full max-w-4xl h-[85vh] max-h-[800px] flex flex-col rounded-[28px] backdrop-blur-3xl bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-[var(--glass-shadow)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--glass-border)] shrink-0">
              <div className="flex items-center gap-3">
                <Layers className="text-[var(--text-muted)]" size={20} />
                <div>
                  <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">Swarm Model Configuration</h2>
                  <p className="text-[11px] text-[var(--text-muted)]">Select up to 5 parallel AI models for streaming orchestration</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="px-6 py-2.5 bg-black/15 border-b border-[var(--glass-border)] flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search models (e.g. laguna, glm, deepseek)..."
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 outline-none focus:border-[var(--accent-primary)]/60"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white">
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTempModels(SWAMP_MODELS)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[11px] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/25 transition-colors flex items-center gap-1.5 font-medium"
                >
                  <Sparkles size={12} />
                  Swamp Swarm (5 AIs)
                </button>
                <button
                  onClick={() => setTempModels(DEFAULT_MODELS)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw size={12} />
                  Default Roster
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              {/* Categories Mobile (Horizontal Scroll) */}
              {!searchQuery && (
                <div className="md:hidden flex items-center gap-2 overflow-x-auto p-3 border-b border-[var(--glass-border)] bg-black/10 shrink-0 no-scrollbar">
                  {Object.keys(MODEL_REGISTRY).map(category => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category as any)}
                      className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors flex items-center gap-1.5 ${
                        activeCategory === category
                          ? 'bg-[var(--accent-primary)] text-[var(--bg-base)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 bg-white/5 border border-white/5'
                      }`}
                    >
                      <span>{category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeCategory === category ? 'bg-black/30 text-[var(--bg-base)]' : 'bg-white/10 text-[var(--text-muted)]'}`}>
                        {MODEL_REGISTRY[category].length}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Sidebar Desktop */}
              <div className="hidden md:flex w-56 border-r border-[var(--glass-border)] flex-col p-4 gap-2 overflow-y-auto shrink-0 bg-black/10">
                <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-2 mb-2">Categories</h3>
                {Object.keys(MODEL_REGISTRY).map(category => (
                  <button
                    key={category}
                    onClick={() => { setActiveCategory(category as any); setSearchQuery(""); }}
                    className={`text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                      activeCategory === category && !searchQuery
                        ? 'bg-[var(--accent-primary)] text-[var(--bg-base)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
                    }`}
                  >
                    <span>{category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === category && !searchQuery ? 'bg-black/30 text-[var(--bg-base)]' : 'bg-white/10 text-[var(--text-muted)]'}`}>
                      {MODEL_REGISTRY[category].length}
                    </span>
                  </button>
                ))}
                
                <div className="mt-auto pt-4 border-t border-[var(--glass-border)]">
                  <div className="px-2">
                    <p className="text-[11px] text-[var(--text-muted)] mb-2 uppercase tracking-wider font-semibold">Selected ({tempModels.length}/5)</p>
                    <div className="space-y-1.5">
                      {tempModels.map((model, idx) => (
                        <div key={`${model.id}-${idx}`} className="flex items-center justify-between bg-black/20 px-2.5 py-1.5 rounded-lg border border-white/5">
                          <span className="text-xs text-[var(--text-primary)] truncate max-w-[120px]">{model.name}</span>
                          <button onClick={() => handleToggleModel(model, model.category || 'unknown')} className="text-[var(--text-muted)] hover:text-red-400">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-black/5 relative flex flex-col">
                {/* Selected Models Mobile View */}
                <div className="md:hidden mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">Selected ({tempModels.length}/5)</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tempModels.map((model, idx) => (
                      <div key={`${model.id}-mob-${idx}`} className="flex items-center gap-1.5 bg-[var(--accent-primary)]/10 px-2.5 py-1.5 rounded-lg border border-[var(--accent-primary)]/30">
                        <span className="text-xs text-[var(--accent-primary)] truncate max-w-[120px]">{model.name}</span>
                        <button onClick={() => handleToggleModel(model, model.category || 'unknown')} className="text-[var(--accent-primary)] hover:text-red-400">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {tempModels.length === 0 && (
                      <span className="text-xs text-[var(--text-muted)] italic">No models selected</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
                  <h3 className="text-lg md:text-xl font-semibold text-[var(--text-primary)] capitalize">
                    {searchQuery ? `Search Results (${displayedModels.length})` : `${activeCategory.replace('_', ' ')} (${displayedModels.length})`}
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-8">
                  {displayedModels.map((model, idx) => {
                    const isSelected = tempModels.some(m => m.id === model.id);
                    return (
                      <div 
                        key={`${model.id}-${model.category || activeCategory}-${idx}`} 
                        onClick={() => handleToggleModel(model, model.category)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected 
                            ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/40 shadow-[0_0_15px_rgba(var(--accent-primary-rgb),0.1)]' 
                            : 'bg-white/5 border-[var(--glass-border)] hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className={`text-sm md:text-base font-medium truncate ${isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>{model.name}</h4>
                          <div className="text-[10px] md:text-[11px] font-mono text-[var(--text-muted)] mt-0.5 truncate">{model.id}</div>
                          {model.details && (
                            <p className="text-[11px] text-[var(--text-muted)]/80 mt-1.5 line-clamp-2 leading-tight">{model.details}</p>
                          )}
                          <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-black/30 text-[10px] text-[var(--text-muted)] border border-white/5">
                            Role: {model.role}
                          </span>
                        </div>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                          isSelected ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-[var(--bg-base)]' : 'border-[var(--text-muted)]/50'
                        }`}>
                          {isSelected && <CheckCircle2 size={12} strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {displayedModels.length === 0 && (
                  <div className="text-center py-12 text-[var(--text-muted)] text-sm">
                    No models found matching "{searchQuery}".
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between border-t border-[var(--glass-border)] shrink-0 bg-black/20 gap-3 md:gap-4">
              <span className="text-[11px] text-[var(--text-muted)] text-center md:text-left max-w-sm">Select between 1 and 5 models. They will stream in parallel on your next prompt.</span>
              <button
                onClick={handleSave}
                disabled={saveStatus === "saving" || saveStatus === "saved" || tempModels.length === 0}
                className="w-full md:w-auto px-6 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-base)] flex items-center justify-center gap-2 text-[13px] font-medium transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none hover:opacity-90 whitespace-nowrap"
              >
                {saveStatus === "saving" && <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#141312]/20 border-t-[#141312]" />}
                {saveStatus === "saved" && <CheckCircle2 size={16} />}
                {saveStatus === "error" && <AlertTriangle size={16} />}
                {saveStatus === "idle" && <CheckCircle2 size={16} />}
                {saveStatus === "saved" ? "Saved!" : saveStatus === "error" ? (tempModels.length === 0 ? "Select at least 1" : "Max 5 Models") : `Save Configuration (${tempModels.length})`}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
