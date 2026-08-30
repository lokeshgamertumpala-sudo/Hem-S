import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export interface AIModel {
  id: string; // The backend API ID
  name: string; // Friendly name
  role: string; // "Architecture", "Review", etc.
  category?: string;
  details?: string;
}

export const DEFAULT_MODELS: AIModel[] = [
  { id: "z-ai/glm-5.2", name: "GLM 5.2 (Z-AI)", role: "Structural Lead", category: "flagship", details: "Frontier bilingual reasoning and deep architecture synthesis model." },
  { id: "nvidia/nemotron-4-340b-instruct", name: "Nemotron 4 340B", role: "Flagship", category: "flagship", details: "Massive 340B parameter analytical powerhouse for complex workflows and high-productivity tasks." },
  { id: "poolside/laguna-xs-2.1", name: "Laguna XS 2.1", role: "Coding/Math", category: "coding_and_maths", details: "State-of-the-art software engineering and algorithm synthesis engine." },
  { id: "mistralai/mixtral-8x22b-v0.1", name: "Mixtral 8x22B MoE", role: "Flagship", category: "flagship", details: "High-throughput 176B parameter sparse MoE model for deep reasoning." },
  { id: "meta/muse-glimmer-30b", name: "Muse Glimmer 30B", role: "Normal", category: "normal", details: "High-capability UI, CSS, styling, and design reasoning specialist." }
];

export const SWAMP_MODELS: AIModel[] = [
  { 
    id: "z-ai/glm-5.2", 
    name: "GLM 5.2", 
    role: "Primary Solver", 
    category: "flagship", 
    details: "Agent 1: Lead Primary Solver. Comprehensive problem solving and core architecture." 
  },
  { 
    id: "poolside/laguna-xs-2.1", 
    name: "Laguna XS 2.1", 
    role: "Alternative Solver", 
    category: "coding_and_maths", 
    details: "Agent 2: Alternative Solver. Independent diversity reasoning and alternative implementation." 
  },
  { 
    id: "mistralai/mixtral-8x22b-v0.1", 
    name: "Mixtral 8x22B", 
    role: "Technical Specialist", 
    category: "flagship", 
    details: "Agent 3: Technical Specialist. Deep algorithmic, state, and low-level precision." 
  },
  { 
    id: "meta/muse-glimmer-30b", 
    name: "Muse Glimmer", 
    role: "Critic / Red Team", 
    category: "normal", 
    details: "Agent 4: Critic / Red Team. Vulnerability scanning, edge-case testing, and resilience audit." 
  },
  { 
    id: "nvidia/llama-3.1-nemotron-ultra-253b-v1", 
    name: "Nemotron Ultra", 
    role: "Optimizer & Judge", 
    category: "flagship", 
    details: "Agent 5: Optimizer & Judge. Cross-agent synthesis and master production optimization." 
  }
];

export const IMAGE_GENERATION_MODELS: AIModel[] = [
  { 
    id: "black-forest-labs/flux-1-schnell", 
    name: "FLUX.1 Schnell", 
    role: "Lead Generative Synthesizer", 
    category: "visual_inputs", 
    details: "State-of-the-art 12B parameter rectified flow transformer for instantaneous photorealistic and artistic image generation." 
  },
  { 
    id: "stabilityai/stable-diffusion-3.5-large", 
    name: "SD 3.5 Large", 
    role: "Photorealism Specialist", 
    category: "visual_inputs", 
    details: "8B parameter MMDiT generative diffusion model for complex prompt adherence, textures, and typography." 
  },
  { 
    id: "meta/llama-3.2-90b-vision-instruct", 
    name: "Llama 3.2 90B Vision", 
    role: "Visual Prompt Architect", 
    category: "visual_inputs", 
    details: "Multimodal visual reasoning, detailed spatial composition, and lighting prompt architect." 
  },
  { 
    id: "google/diffusiongemma-26b-a4b-it", 
    name: "DiffusionGemma 26B", 
    role: "Aesthetics & Stylist", 
    category: "visual_inputs", 
    details: "Google specialized diffusion-guided vision and aesthetics engine." 
  },
  { 
    id: "nvidia/neva-22b", 
    name: "NVIDIA NeVA 22B", 
    role: "Visual Quality Judge", 
    category: "visual_inputs", 
    details: "High-resolution multimodal visual critic and prompt fidelity inspector." 
  }
];

interface ModelContextType {
  selectedModels: AIModel[];
  setSelectedModels: (models: AIModel[]) => void;
  applyThemeModels: (isSwamp: boolean) => void;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function ModelProvider({ children }: { children: React.ReactNode }) {
  // Since useRef doesn't accept a function to initialize like useState in some React versions,
  // let's do it cleanly:
  const getInitialNormal = () => {
    const saved = localStorage.getItem("omnimodel_normal_models_v23");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_MODELS;
  };

  const normalModelsRef = useRef<AIModel[]>(getInitialNormal());
  
  const [selectedModels, setSelectedModelsState] = useState<AIModel[]>(() => {
    const saved = localStorage.getItem("omnimodel_selected_models_v23");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse saved models", e);
      }
    }
    return DEFAULT_MODELS;
  });

  const setSelectedModels = (models: AIModel[]) => {
    setSelectedModelsState(models);
  };

  useEffect(() => {
    localStorage.setItem("omnimodel_selected_models_v23", JSON.stringify(selectedModels));
    // If these are not swamp models and not image models, save as normal
    const isSwamp = modelsEqual(selectedModels, SWAMP_MODELS);
    const isImage = modelsEqual(selectedModels, IMAGE_GENERATION_MODELS);
    if (!isSwamp && !isImage) {
      normalModelsRef.current = selectedModels;
      localStorage.setItem("omnimodel_normal_models_v23", JSON.stringify(selectedModels));
    }
  }, [selectedModels]);

  const modelsEqual = (a: AIModel[], b: AIModel[]) => {
    if (a.length !== b.length) return false;
    return a.every((model, idx) => model.id === b[idx].id);
  };

  // Auto-select capable AI models when Image or Video Generation skills are enabled
  useEffect(() => {
    const handleAutoSelect = (e: Event) => {
      const customEvt = e as CustomEvent<{ skillId: string; enabled: boolean }>;
      if (!customEvt.detail) return;
      const { skillId, enabled } = customEvt.detail;
      if (!enabled) return;

      if (skillId === "image_generation_ai") {
        setSelectedModels(IMAGE_GENERATION_MODELS);
      }
    };

    window.addEventListener("auto-select-models", handleAutoSelect);
    return () => window.removeEventListener("auto-select-models", handleAutoSelect);
  }, []);

  const applyThemeModels = (isSwamp: boolean) => {
    if (isSwamp) {
      setSelectedModels(SWAMP_MODELS);
    } else {
      setSelectedModels(normalModelsRef.current.length > 0 ? normalModelsRef.current : DEFAULT_MODELS);
    }
  };

  return (
    <ModelContext.Provider value={{ selectedModels, setSelectedModels, applyThemeModels }}>
      {children}
    </ModelContext.Provider>
  );
}

export function useModels() {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error('useModels must be used within a ModelProvider');
  }
  return context;
}

