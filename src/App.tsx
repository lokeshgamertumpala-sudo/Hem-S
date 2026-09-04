import { useState } from 'react';
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
import { InkDropTransition } from './components/InkDropTransition';

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);

  return (
    <>
      <InkDropTransition />
      <div className="h-[100dvh] w-full bg-[var(--bg-base)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-primary)]/30 flex flex-col overflow-hidden relative transition-colors duration-700 ease-out">
        <Header 
          onToggleSidebar={() => setSidebarOpen(true)} 
          onOpenModels={() => setModelsOpen(true)}
          onOpenSkills={() => setSkillsOpen(true)}
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
        />
        
        <SettingsModal 
          isOpen={settingsOpen} 
          onClose={() => setSettingsOpen(false)} 
        />
        
        <ModelSelectionModal isOpen={modelsOpen} onClose={() => setModelsOpen(false)} />
        <SkillsModal isOpen={skillsOpen} onClose={() => setSkillsOpen(false)} />
        
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
