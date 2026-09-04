import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SwarmGrid } from './components/SwarmGrid';
import { SettingsModal } from './components/SettingsModal';
import { ApiKeyProvider } from './context/ApiKeyContext';
import { ThemeProvider } from './context/ThemeContext';
import { ModelProvider } from './context/ModelContext';
import { ChatProvider } from './context/ChatContext';
import { MemoryProvider } from './context/MemoryContext';
import { SkillProvider } from './context/SkillContext';
import { ModelSelectionModal } from './components/ModelSelectionModal';
import { SkillsModal } from './components/SkillsModal';
import { SitePreviewModal } from './components/SitePreviewModal';
import { AiTerminalModal } from './components/AiTerminalModal';
import { InkDropTransition } from './components/InkDropTransition';

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenPreview = (e: any) => {
      if (e.detail?.url) {
        setPreviewUrl(e.detail.url);
      }
    };
    const handleOpenTerminal = () => setTerminalOpen(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+` or Cmd+` toggles terminal
      if ((e.ctrlKey || e.metaKey) && (e.key === '`' || e.key === '~')) {
        e.preventDefault();
        setTerminalOpen(prev => !prev);
      }
    };

    window.addEventListener('open-site-preview', handleOpenPreview);
    window.addEventListener('open-terminal', handleOpenTerminal);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('open-site-preview', handleOpenPreview);
      window.removeEventListener('open-terminal', handleOpenTerminal);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      <InkDropTransition />
      <div className="h-[100dvh] w-full bg-[var(--bg-base)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-primary)]/30 flex flex-col overflow-hidden relative transition-colors duration-700 ease-out">
        <Header 
          onToggleSidebar={() => setSidebarOpen(true)} 
          onOpenModels={() => setModelsOpen(true)}
          onOpenSkills={() => setSkillsOpen(true)}
          onOpenTerminal={() => setTerminalOpen(true)}
        />
        
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
          onOpenSettings={() => {
            setSidebarOpen(false);
            setSettingsOpen(true);
          }}
          onOpenSkills={() => {
            setSidebarOpen(false);
            setSkillsOpen(true);
          }}
          onOpenTerminal={() => {
            setSidebarOpen(false);
            setTerminalOpen(true);
          }}
        />
        
        <SettingsModal 
          isOpen={settingsOpen} 
          onClose={() => setSettingsOpen(false)} 
        />
        
        <ModelSelectionModal isOpen={modelsOpen} onClose={() => setModelsOpen(false)} />
        <SkillsModal isOpen={skillsOpen} onClose={() => setSkillsOpen(false)} />
        <SitePreviewModal 
          url={previewUrl} 
          onClose={() => setPreviewUrl(null)} 
          onAskAi={(prompt) => {
            window.dispatchEvent(new CustomEvent('send-swarm-prompt', { detail: { prompt } }));
          }}
        />
        <AiTerminalModal 
          isOpen={terminalOpen} 
          onClose={() => setTerminalOpen(false)} 
        />
        
        <main className="flex-1 flex flex-col w-full h-full relative overflow-hidden">
          <SwarmGrid />
        </main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ApiKeyProvider>
        <ModelProvider>
          <MemoryProvider>
            <ChatProvider>
              <SkillProvider>
                <AppContent />
              </SkillProvider>
            </ChatProvider>
          </MemoryProvider>
        </ModelProvider>
      </ApiKeyProvider>
    </ThemeProvider>
  );
}
