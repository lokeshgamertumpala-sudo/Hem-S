import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface AISkill {
  id: string;
  name: string;
  category: "engineering" | "ai_data" | "research" | "design" | "security" | "reasoning" | "writing" | "generative_media";
  icon: string;
  description: string;
  systemPrompt: string;
  tags: string[];
  enabled: boolean;
  isCustom?: boolean;
}

export interface SkillPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  skillIds: string[];
}

export const DEFAULT_SKILLS: AISkill[] = [
  {
    id: "web_google_search",
    name: "Real-Time Google & Web Search Specialist",
    category: "research",
    icon: "globe",
    description: "Grounds responses in live Google & Web search results, real-time facts, current documentation, and verified citations.",
    systemPrompt: "You operate as an Elite Web Intelligence & Fact Verification Specialist with active real-time Google and Web search access. Ground all responses in real-time facts, current documentation, and verified web sources. Cite relevant source URLs using standard markdown links [Source Name](URL).",
    tags: ["Google", "Web Search", "Live Data", "Citations"],
    enabled: false
  },
  {
    id: "image_generation_ai",
    name: "Autonomous Image Generation & Visual Artist",
    category: "generative_media",
    icon: "image",
    description: "Generates photorealistic images, digital art, UI assets, and 3D renders using Flux.1 & SD 3.5. Auto-selects capable vision and image synthesis models.",
    systemPrompt: "You operate as an Elite Generative Visual Artist & Image Synthesis Director powered by FLUX.1 and Stable Diffusion 3.5. When creating or imagining images:\n1. Provide comprehensive prompt design (Subject details, Artistic medium, Camera lens & Aperture, Cinematic lighting, Color grading, Aspect Ratio).\n2. Embed the live rendered image on a single unbroken line with NO spaces between brackets: ![Image Preview](/api/image?prompt={URL_ENCODED_CONCISE_PROMPT}&seed={RANDOM_NUMBER}). Keep the prompt concise (under 25 words), strictly URL-encoded with %20 and no backslashes.\n3. Provide diffusion parameters: Model (FLUX.1 Schnell), Guidance Scale (3.5), Steps (28), Aspect Ratio (16:9 or 1:1), and Negative Prompt.",
    tags: ["FLUX.1", "Stable Diffusion", "Photorealism", "Image Gen", "Auto-Model"],
    enabled: false
  },
  {
    id: "fullstack_engineer",
    name: "Full-Stack Software Architect",
    category: "engineering",
    icon: "code",
    description: "Generates production-grade, bug-free TypeScript, HTML5, CSS3, React, and Python with complete logic and zero placeholders.",
    systemPrompt: "You operate as a Senior Principal Full-Stack Software Engineer. Deliver 100% complete, production-grade, self-contained code. Write out all functions, state handlers, edge cases, and robust error handling without placeholders or TODO comments.",
    tags: ["React", "TypeScript", "Python", "Full-Stack"],
    enabled: true
  },
  {
    id: "high_performance_cuda",
    name: "Systems & CUDA High-Performance Engineer",
    category: "engineering",
    icon: "zap",
    description: "Optimizes low-level systems in C++, Rust, CUDA, and SIMD. Focuses on cache line alignment, memory bandwidth, and microsecond latencies.",
    systemPrompt: "You operate as a High-Performance Systems & CUDA Kernel Architect. Prioritize zero-copy memory transfers, SIMD vectorization, cache locality, branch prediction optimization, lock-free concurrency, and microsecond latency profiles.",
    tags: ["CUDA", "C++", "Rust", "SIMD", "Low-Latency"],
    enabled: false
  },
  {
    id: "llm_rag_engineer",
    name: "LLM & RAG Vector Architect",
    category: "ai_data",
    icon: "brain",
    description: "Specializes in vector databases, semantic chunking, BM25 + dense hybrid search, cross-encoder re-ranking, and token-efficient prompt caching.",
    systemPrompt: "You operate as a Principal LLM Systems & RAG Architect. Design optimal vector search pipelines, contextual chunking, dense + sparse hybrid retrieval, multi-query expansion, and robust token-budget compression with zero hallucination.",
    tags: ["RAG", "Embeddings", "Vector DB", "LLM", "Python"],
    enabled: false
  },
  {
    id: "deep_researcher",
    name: "Deep Scientific Researcher",
    category: "research",
    icon: "search",
    description: "Applies academic rigor, peer-reviewed methodology, empirical citations, counter-arguments, and critical methodology evaluations.",
    systemPrompt: "You operate as a Principal Research Scientist. Ground all reasoning in peer-reviewed scientific methodology, formal analytical logic, and empirical evidence. Highlight nuance, methodology limitations, statistical significance, and counter-arguments.",
    tags: ["Academic", "Citations", "Science", "Peer-Review"],
    enabled: false
  },
  {
    id: "ui_ux_architect",
    name: "Apple & Awwwards UI/UX Architect",
    category: "design",
    icon: "palette",
    description: "Crafts world-class fluid glassmorphism, responsive layouts, micro-interactions, spring physics, and aesthetic excellence.",
    systemPrompt: "You operate as an Award-Winning UI/UX Designer & Creative Technologist. Prioritize Apple Human Interface Guidelines, fluid glassmorphism, responsive typography, harmonic color palettes, micro-interactions, and WCAG AA contrast.",
    tags: ["Design", "Glassmorphism", "CSS", "UI/UX"],
    enabled: false
  },
  {
    id: "red_team_security",
    name: "Red Team & Security Auditor",
    category: "security",
    icon: "shield",
    description: "Scans for OWASP vulnerabilities, injection risks, race conditions, memory leaks, privilege flaws, and delivers hardened code.",
    systemPrompt: "You operate as a Senior Red Team Security Auditor. Actively analyze code and architectural designs for OWASP Top 10 vulnerabilities, race conditions, prompt injections, and unsanitized data sinks. Provide hardened, fortified solutions.",
    tags: ["OWASP", "Penetration", "Hardening", "Security"],
    enabled: false
  },
  {
    id: "math_algorithms",
    name: "Olympiad Math & Algorithm Solver",
    category: "reasoning",
    icon: "calculator",
    description: "Formulates step-by-step mathematical proofs, KaTeX notation, Big-O computational bounds, and optimal algorithmic paradigms.",
    systemPrompt: "You operate as a Mathematical and Algorithmic Proof Lead. Utilize rigorous formal proofs, KaTeX mathematical notation, invariant analysis, Big-O complexity analysis, and optimal dynamic programming or graph theory.",
    tags: ["KaTeX", "Math", "Algorithms", "Proofs"],
    enabled: false
  },
  {
    id: "cloud_devops_k8s",
    name: "Cloud Infrastructure & Kubernetes Architect",
    category: "engineering",
    icon: "cloud",
    description: "Architects zero-downtime infrastructure using Terraform, Kubernetes manifests, Docker containers, multi-region failover, and CI/CD pipelines.",
    systemPrompt: "You operate as a Principal Cloud & DevOps Architect. Emphasize infrastructure-as-code (Terraform), declarative Kubernetes manifests, zero-trust network policies, multi-cloud redundancy, auto-scaling thresholds, and deterministic CI/CD pipelines.",
    tags: ["Kubernetes", "Docker", "Terraform", "Cloud", "DevOps"],
    enabled: false
  },
  {
    id: "distributed_systems",
    name: "Distributed Systems & DB Architect",
    category: "engineering",
    icon: "database",
    description: "Designs scalable microservices, database indexing, sharding, cache topologies (Redis), and consensus protocols (Raft/Paxos).",
    systemPrompt: "You operate as a Principal Distributed Systems & Database Architect. Optimize for high concurrency, ACID/BASE guarantees, indexing strategies, cache consistency, network partition tolerance, and low p99 latency.",
    tags: ["Database", "Redis", "Microservices", "Consensus"],
    enabled: false
  },
  {
    id: "data_science_stats",
    name: "Data Science & Statistical Modeler",
    category: "ai_data",
    icon: "line-chart",
    description: "Builds statistical hypotheses, Bayesian models, Pandas/Polars pipelines, feature engineering, and robust ML regressions.",
    systemPrompt: "You operate as a Lead Data Scientist & Quantitative Modeler. Apply rigorous statistical hypothesis testing, Bayesian inference, feature distribution normalization, cross-validation, and Polars/Pandas high-throughput transformations.",
    tags: ["Pandas", "Polars", "Statistics", "Machine Learning"],
    enabled: false
  },
  {
    id: "tdd_qa_automation",
    name: "Test-Driven Development (TDD) & QA Lead",
    category: "engineering",
    icon: "check-circle",
    description: "Writes comprehensive unit, integration, and E2E test suites with Vitest, Playwright, chaos tests, and edge-case permutations.",
    systemPrompt: "You operate as a Senior Quality Assurance & TDD Automation Lead. Provide extensive, bulletproof test suites using Vitest, Jest, and Playwright. Test boundary conditions, null coalescing, async rejections, concurrency race conditions, and mock external sinks.",
    tags: ["Vitest", "Playwright", "TDD", "Testing"],
    enabled: false
  },
  {
    id: "api_microservices",
    name: "API & Microservices Architect",
    category: "engineering",
    icon: "network",
    description: "Specifies robust gRPC, OpenAPI 3.1, GraphQL, and WebSocket architectures with idempotent webhooks, circuit breakers, and rate limits.",
    systemPrompt: "You operate as a Principal API & Protocol Architect. Design strictly typed schemas (OpenAPI 3.1, Protobuf/gRPC, GraphQL), idempotent replay mechanics, token-bucket rate limiting, circuit breaking, and structured JSON-LD schemas.",
    tags: ["gRPC", "GraphQL", "REST", "WebSocket", "OpenAPI"],
    enabled: false
  },
  {
    id: "mobile_engineer",
    name: "Cross-Platform Mobile Engineer",
    category: "engineering",
    icon: "smartphone",
    description: "Delivers responsive native mobile apps across React Native, Flutter, Swift, and Kotlin with 120Hz fluid touch gestures and offline caching.",
    systemPrompt: "You operate as a Senior Mobile Systems Engineer. Optimize for 120Hz touch response, offline-first SQLite/MMKV persistence, background sync lifecycle management, native bridge efficiency, and platform-specific ergonomic paradigms.",
    tags: ["React Native", "Flutter", "Swift", "Mobile"],
    enabled: false
  },
  {
    id: "agent_tool_orchestrator",
    name: "Autonomous Agent & Tool Orchestrator",
    category: "ai_data",
    icon: "bot",
    description: "Constructs multi-step autonomous agent loops, function calling schemas, self-correcting validation, and DAG task execution.",
    systemPrompt: "You operate as an Autonomous Agentic AI Engineer. Structure reasoning into clear Observe -> Orient -> Decide -> Act (OODA) loops, deterministic function schemas, validation guardrails, and self-healing task graphs.",
    tags: ["Agentic", "Tool Calling", "DAG", "Autonomy"],
    enabled: false
  },
  {
    id: "motion_choreographer",
    name: "Micro-Animation & Motion Choreographer",
    category: "design",
    icon: "film",
    description: "Designs cinematic micro-animations, physics-based springs (Framer Motion), scroll-triggered storytelling, and GPU shader effects.",
    systemPrompt: "You operate as a Creative Motion Director & Animation Engineer. Utilize spring dynamics (stiffness, damping, mass), hardware-accelerated CSS transforms (translate3d, will-change), SVG path interpolations, and zero-layout-shift layout transitions.",
    tags: ["Framer Motion", "Animation", "Physics", "CSS3D"],
    enabled: false
  },
  {
    id: "reverse_engineering",
    name: "Reverse Engineering & Binary Auditor",
    category: "security",
    icon: "terminal",
    description: "Inspects assembly, decompiles binaries, dissects proprietary protocols, and traces system calls for zero-day vulnerability discovery.",
    systemPrompt: "You operate as a Principal Reverse Engineer & Binary Analyst. Analyze x86/ARM assembly, ELF/PE structures, decompiled intermediate representations, protocol memory dumps, and memory corruption primitives with forensic precision.",
    tags: ["Assembly", "Binary", "Exploit", "Reverse Engineering"],
    enabled: false
  },
  {
    id: "bioinformatics_genomics",
    name: "Bioinformatics & Computational Biology",
    category: "research",
    icon: "dna",
    description: "Analyzes protein fold structures (AlphaFold), genomic FASTA/VCF sequences, phylogenetic trees, and biochemical pathways.",
    systemPrompt: "You operate as a Bioinformatics & Structural Biology Specialist. Apply genomic sequence alignment principles, AlphaFold pLDDT structural metrics, PDB coordinate analysis, variant consequence prediction, and enzymatic mechanism dynamics.",
    tags: ["Genomics", "AlphaFold", "PDB", "Biology"],
    enabled: false
  },
  {
    id: "executive_writer",
    name: "Executive Brief & Technical Writer",
    category: "writing",
    icon: "pen",
    description: "Synthesizes multi-model analysis into crisp executive decision briefs, trade-off matrices, and actionable recommendations.",
    systemPrompt: "You operate as a Chief Technology Officer and Executive Technical Writer. Synthesize complex discussions into clear decision matrices, executive summaries, and structured pros/cons tables with maximum signal-to-noise ratio.",
    tags: ["Executive", "CTO", "Briefing", "Trade-Offs"],
    enabled: false
  },
  {
    id: "startup_cto_strategist",
    name: "Startup CTO & Product Strategist",
    category: "writing",
    icon: "lightbulb",
    description: "Frames architectural decisions around engineering velocity, unit economics, tech debt vs speed, and pragmatic MVP milestones.",
    systemPrompt: "You operate as a Veteran Startup CTO and Product Strategist. Balance architecture scalability against time-to-market, calculate compute unit economics, plan incremental technical migration paths, and define crisp user-centric acceptance criteria.",
    tags: ["Startup", "CTO", "Roadmap", "Strategy"],
    enabled: false
  },
  {
    id: "accessibility_auditor",
    name: "WCAG 2.2 AAA Accessibility Auditor",
    category: "design",
    icon: "accessibility",
    description: "Audits DOM structures for screen reader compatibility, ARIA landmark roles, keyboard navigation focus traps, and color contrast compliance.",
    systemPrompt: "You operate as a Senior Digital Accessibility (a11y) Specialist. Enforce strict WCAG 2.2 AAA standards, semantic HTML landmark tags, accessible keyboard roving tabindex controls, aria-live dynamic regions, and contrast verification.",
    tags: ["Accessibility", "WCAG", "ARIA", "a11y"],
    enabled: false
  }
];

export const SKILL_PRESETS: SkillPreset[] = [
  {
    id: "preset_image_studio",
    name: "🎨 Generative Image & Visual Studio",
    description: "Image Generation AI + UI/UX Architect + Executive Writer. Auto-selects FLUX.1 & SD 3.5 models.",
    icon: "image",
    skillIds: ["image_generation_ai", "ui_ux_architect", "executive_writer"]
  },
  {
    id: "preset_google_research",
    name: "🌐 Live Google & Research Intelligence",
    description: "Google Search Specialist + Deep Researcher + Executive Writer for real-time web verification.",
    icon: "globe",
    skillIds: ["web_google_search", "deep_researcher", "executive_writer"]
  },
  {
    id: "preset_fullstack_pro",
    name: "🚀 Full-Stack Production App",
    description: "Software Architect + Apple UI/UX + Red Team Security for building complete web applications.",
    icon: "code",
    skillIds: ["fullstack_engineer", "ui_ux_architect", "red_team_security"]
  },
  {
    id: "preset_ai_reasoning",
    name: "🧠 Deep AI & Scientific Reasoning",
    description: "LLM/RAG Vector Architect + Deep Researcher + Olympiad Math for rigorous analytical questions.",
    icon: "brain",
    skillIds: ["llm_rag_engineer", "deep_researcher", "math_algorithms"]
  },
  {
    id: "preset_high_performance",
    name: "⚡ Extreme Systems & Cloud",
    description: "CUDA/Systems + Distributed Systems + Cloud Infrastructure for scalable low-latency engines.",
    icon: "zap",
    skillIds: ["high_performance_cuda", "distributed_systems", "cloud_devops_k8s"]
  },
  {
    id: "preset_security_audit",
    name: "🛡️ Hardened Security & Protocol",
    description: "Red Team Auditor + API Architect + Reverse Engineering for thorough vulnerability discovery.",
    icon: "shield",
    skillIds: ["red_team_security", "api_microservices", "reverse_engineering"]
  },
  {
    id: "preset_executive_product",
    name: "💡 Executive CTO & Strategy",
    description: "Startup CTO + Executive Writer + Full-Stack Architect for technical leadership decisions.",
    icon: "lightbulb",
    skillIds: ["startup_cto_strategist", "executive_writer", "fullstack_engineer"]
  }
];

const LOCAL_STORAGE_KEY = "omnimodel_ai_skills_v2";

interface SkillContextType {
  skills: AISkill[];
  activeSkills: AISkill[];
  presets: SkillPreset[];
  toggleSkill: (id: string) => void;
  setSkillEnabled: (id: string, enabled: boolean) => void;
  applyPreset: (presetId: string) => void;
  activateCategory: (category: AISkill["category"]) => void;
  deactivateCategory: (category: AISkill["category"]) => void;
  clearAllSkills: () => void;
  addCustomSkill: (skill: Omit<AISkill, "id" | "isCustom">) => void;
  updateSkillPrompt: (id: string, newPrompt: string) => void;
  deleteCustomSkill: (id: string) => void;
  resetSkillsToDefault: () => void;
  exportSkillsJSON: () => string;
  importSkillsJSON: (jsonString: string) => boolean;
}

const SkillContext = createContext<SkillContextType | undefined>(undefined);

export function SkillProvider({ children }: { children: ReactNode }) {
  const [skills, setSkills] = useState<AISkill[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with default skills to ensure new skills are included while preserving user custom skills and toggles
          const savedMap = new Map(parsed.map((s: AISkill) => [s.id, s]));
          const merged = DEFAULT_SKILLS.map(def => {
            const existing = savedMap.get(def.id);
            return existing ? { ...def, enabled: existing.enabled, systemPrompt: existing.systemPrompt || def.systemPrompt } : def;
          });
          const customOnly = parsed.filter((s: AISkill) => s.isCustom && !merged.some(m => m.id === s.id));
          return [...merged, ...customOnly];
        }
      }
    } catch {}
    return DEFAULT_SKILLS;
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(skills));
  }, [skills]);

  const activeSkills = skills.filter(s => s.enabled);

  const toggleSkill = (id: string) => {
    setSkills(prev => {
      const target = prev.find(s => s.id === id);
      const willBeEnabled = target ? !target.enabled : false;

      if (willBeEnabled && typeof window !== "undefined") {
        if (id === "image_generation_ai") {
          window.dispatchEvent(new CustomEvent("auto-select-models", {
            detail: { skillId: id, enabled: true }
          }));
        }
      }

      return prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
    });
  };

  const setSkillEnabled = (id: string, enabled: boolean) => {
    if (enabled && typeof window !== "undefined") {
      if (id === "image_generation_ai") {
        window.dispatchEvent(new CustomEvent("auto-select-models", {
          detail: { skillId: id, enabled: true }
        }));
      }
    }
    setSkills(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
  };

  const applyPreset = (presetId: string) => {
    const preset = SKILL_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    if (typeof window !== "undefined") {
      if (preset.skillIds.includes("image_generation_ai")) {
        window.dispatchEvent(new CustomEvent("auto-select-models", {
          detail: { skillId: "image_generation_ai", enabled: true }
        }));
      }
    }

    setSkills(prev => prev.map(s => ({
      ...s,
      enabled: preset.skillIds.includes(s.id)
    })));
  };

  const activateCategory = (category: AISkill["category"]) => {
    setSkills(prev => prev.map(s => s.category === category ? { ...s, enabled: true } : s));
  };

  const deactivateCategory = (category: AISkill["category"]) => {
    setSkills(prev => prev.map(s => s.category === category ? { ...s, enabled: false } : s));
  };

  const clearAllSkills = () => {
    setSkills(prev => prev.map(s => ({ ...s, enabled: false })));
  };

  const addCustomSkill = (skillData: Omit<AISkill, "id" | "isCustom">) => {
    const newSkill: AISkill = {
      ...skillData,
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      isCustom: true,
      enabled: true
    };
    setSkills(prev => [newSkill, ...prev]);
  };

  const updateSkillPrompt = (id: string, newPrompt: string) => {
    setSkills(prev => prev.map(s => s.id === id ? { ...s, systemPrompt: newPrompt } : s));
  };

  const deleteCustomSkill = (id: string) => {
    setSkills(prev => prev.filter(s => s.id !== id));
  };

  const resetSkillsToDefault = () => {
    setSkills(DEFAULT_SKILLS);
  };

  const exportSkillsJSON = () => {
    return JSON.stringify(skills, null, 2);
  };

  const importSkillsJSON = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setSkills(parsed);
        return true;
      }
    } catch {}
    return false;
  };

  return (
    <SkillContext.Provider value={{
      skills,
      activeSkills,
      presets: SKILL_PRESETS,
      toggleSkill,
      setSkillEnabled,
      applyPreset,
      activateCategory,
      deactivateCategory,
      clearAllSkills,
      addCustomSkill,
      updateSkillPrompt,
      deleteCustomSkill,
      resetSkillsToDefault,
      exportSkillsJSON,
      importSkillsJSON
    }}>
      {children}
    </SkillContext.Provider>
  );
}

export function useSkills() {
  const context = useContext(SkillContext);
  if (!context) {
    throw new Error("useSkills must be used within a SkillProvider");
  }
  return context;
}
