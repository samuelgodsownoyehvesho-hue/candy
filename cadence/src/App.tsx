import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { ProjectProvider } from '@/context/ProjectContext';
import { Splash } from '@/pages/Splash';
import { Landing } from '@/pages/Landing';
import { Dashboard } from '@/pages/Dashboard';
import { Projects } from '@/pages/Projects';
import { ProjectWorkspace } from '@/pages/ProjectWorkspace';
import { Settings } from '@/pages/Settings';
import { Help } from '@/pages/Help';
import { About } from '@/pages/About';

function NotFound() {
  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center text-center gap-3 px-4">
      <p className="readout text-amber">404</p>
      <h1 className="font-display text-2xl font-semibold text-ink">Page not found</h1>
      <a href="/dashboard" className="text-teal hover:text-teal-soft text-sm btn-focus-ring rounded px-2 py-1">
        Back to dashboard
      </a>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ProjectProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectWorkspace />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
            <Route path="/about" element={<About />} />
            <Route path="/index.html" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ProjectProvider>
    </ThemeProvider>
  );
}
