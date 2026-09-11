# ⚡ Hem'S — Multi-Model AI Swarm & Comparison Studio

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1-38b2ac.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Hem'S** is an enterprise-grade, high-concurrency **Multi-Model AI Swarm & Comparison Studio**. It allows developers, researchers, and power users to dispatch prompts simultaneously across 60+ leading LLMs (including NVIDIA NIM, Google Gemini, OpenRouter, Groq, and DeepSeek), compare responses side-by-side in real-time, execute live internet search queries, and recover gracefully from mid-generation cutoffs with strict code continuation protocols.

---

## 🌟 Key Features

- **Multi-Model AI Swarm Grid**:
  - Run concurrent inference across multiple AI architectures side-by-side in real-time.
  - Interactive grid view with streaming token pacing, response timers, and markdown rendering.
- **Universal Provider Support**:
  - **NVIDIA NIM** (`nvapi-...`): Ultra-fast enterprise inference (Nemotron, Llama 3.3, Mistral Large, DeepSeek, etc.).
  - **Google Gemini** (`GEMINI_API_KEY`): Native Gemini 2.5/2.0 multimodal API integration.
  - **OpenRouter** (`sk-or-...`): Access to hundreds of open-source and commercial models.
  - **Groq** (`gsk_...`): Sub-second LPU inference for high-speed outputs.
  - **DeepSeek**: Direct high-reasoning coding models.
- **Live Real-Time Web Search**:
  - Built-in live search engine automatically gathers live data and citations to augment LLM answers with real-time web context.
- **Strict Code Continuation Protocol**:
  - Automatic detection and seamless resumption of truncated code blocks with zero conversational filler or restarts.
- **Online Repetition Breaker**:
  - In-flight real-time loop detection that identifies and breaks degenerate token loops before tokens are wasted.
- **Antigravity Security Guard**:
  - Automatic pattern-based interception of destructive system or shell command patterns for safe local execution.
- **Rich Markdown & Syntax Highlighting**:
  - Complete syntax highlighting across 40+ programming languages with 1-click clipboard copying.
- **Integrated Full-Stack Server**:
  - Unified Express backend (`server.ts`) seamlessly running Vite in development and bundling production artifacts for zero-latency serving.

---

## 🛠️ Supported Model Providers

Configure one or more of the following keys in your `.env` file or in the in-app **Settings** sidebar:

| Provider | Environment Variable | Key Format | Recommended Use |
|---|---|---|---|
| **NVIDIA NIM** | `NVIDIA_API_KEY` | `nvapi-...` | Fastest inference & reasoning (Nemotron, Llama 3.3) |
| **Google Gemini** | `GEMINI_API_KEY` | `AIza...` | Native Gemini 2.5 Flash / Pro models |
| **OpenRouter** | `OPENROUTER_API_KEY` | `sk-or-...` | Broad access to 100+ global models |
| **Groq** | `GROQ_API_KEY` | `gsk_...` | Instant sub-second LPU responses |
| **DeepSeek** | `DEEPSEEK_API_KEY` | `sk-...` | Deep reasoning & code generation |

---

## 🚀 Setup & Installation Guide

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (bundled with Node.js) or **Bun**

Verify your environment:
```bash
node -v
npm -v
```

---

### 2. Clone the Repository
```bash
git clone https://github.com/lokeshgamertumpala-sudo/Hem-S.git
cd Hem-S
```

---

### 3. Install Dependencies
```bash
npm install
```
*(Or if you prefer Bun: `bun install`)*

---

### 4. Configure Environment Variables
Create your local `.env` file from the provided example:
```bash
# Windows PowerShell:
Copy-Item .env.example .env

# macOS / Linux:
cp .env.example .env
```

Open `.env` in your editor and add your API keys:
```env
# Google Gemini API Key
GEMINI_API_KEY="your_gemini_api_key_here"

# NVIDIA NIM API Key (https://build.nvidia.com)
NVIDIA_API_KEY="nvapi-..."

# OpenRouter API Key (https://openrouter.ai)
OPENROUTER_API_KEY="sk-or-..."

# Groq API Key (https://console.groq.com)
GROQ_API_KEY="gsk_..."
```
> **Note**: You can also enter or update API keys dynamically inside the app UI via the **Settings** gear icon without restarting the server!

---

### 5. Launch the Development Server
```bash
npm run dev
```

The unified development server will start:
```
Server running on port 3000
Local: http://localhost:3000
Network: http://0.0.0.0:3000
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to access the Hem'S Swarm Studio!

---

### 6. Production Build & Deployment

To compile and bundle for production:
```bash
npm run build
npm start
```

This will:
1. Compile the React TypeScript frontend into optimized static assets in `dist/`.
2. Bundle the backend server with `esbuild` into `dist/server.cjs`.
3. Launch the high-performance production Node.js server.

---

## 📜 Available NPM Scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `tsx server.ts` | Runs the full-stack development server with hot module reloading (HMR) |
| `npm run build` | `vite build && esbuild ...` | Compiles and bundles frontend and backend for production |
| `npm start` | `node dist/server.cjs` | Runs the compiled production server |
| `npm run preview` | `vite preview` | Previews the Vite production build locally |
| `npm run lint` | `tsc --noEmit` | Performs TypeScript type checking across all project files |
| `npm run clean` | `rm -rf dist server.js` | Cleans build artifacts |

---

## 📂 Project Architecture

```
Hem-S/
├── api/                    # Serverless API endpoints (Vercel deployment)
├── assets/                 # Brand assets & SVGs
├── data/                   # Cached models & evaluation datasets
├── src/                    # React 19 Frontend
│   ├── components/         # UI Components (SwarmGrid, ModelSelector, Chat, Settings)
│   ├── context/            # Global React Contexts (ChatContext, ModelContext)
│   ├── lib/                # Client utilities & helpers
│   ├── services/           # Frontend API client & streaming handlers
│   ├── utils/              # Formatting, syntax highlighting & storage helpers
│   ├── App.tsx             # Root Application component
│   ├── main.tsx            # React DOM entry point
│   ├── index.css           # Tailwind CSS v4 styling & animations
│   └── types.ts            # TypeScript interfaces & type definitions
├── server.ts               # Core Express Backend (Swarm router, Search engine, Guards)
├── models.json             # Registry of 60+ supported models
├── available_models.json   # Dynamic model availability cache
├── .env.example            # Environment variable template
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration with React & Tailwind plugins
├── vercel.json             # Vercel serverless deployment config
└── package.json            # Project dependencies and build scripts
```

---

## 🌐 Deploying to Vercel

Hem'S includes native Vercel configuration (`vercel.json`):
1. Push your repository to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Set your environment variables (`GEMINI_API_KEY`, `NVIDIA_API_KEY`, etc.) in the Vercel Project Settings.
4. Deploy!

---

## 📄 License

This project is licensed under the **MIT License** — feel free to use, modify, and distribute for personal and commercial projects.

