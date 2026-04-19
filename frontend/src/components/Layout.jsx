import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Database, CheckCircle, Shield, Upload } from 'lucide-react';

import DashboardPage from '../pages/DashboardPage';
import ChatPage from '../pages/ChatPage';
import DecisionExplorer from '../pages/DecisionExplorer';
import ActionCenter from '../pages/ActionCenter';
import AuditExplorer from '../pages/AuditExplorer';
import DocumentUploadPage from '../pages/DocumentUploadPage';
import DataViewerPage from '../pages/DataViewerPage';

const Sidebar = () => {
  const location = useLocation();
  const navItems = [
    { path: '/', icon: <LayoutDashboard size={20}/>, label: 'Operations Dash' },
    { path: '/action-center', icon: <CheckCircle size={20}/>, label: 'Pending Actions' },
    { path: '/explorer', icon: <Database size={20}/>, label: 'Decision DB' },
    { path: '/audit', icon: <Shield size={20}/>, label: 'Audit Logs' },
    { path: '/sources', icon: <Upload size={20}/>, label: 'Source Intake' },
    { path: '/chat', icon: <MessageSquare size={20}/>, label: 'Chat Interface' },
    { path: '/data-viewer', icon: <Database size={20}/>, label: 'Data Viewer' },
  ];

  return (
    <div className="w-64 h-screen bg-surface border-r border-slate-700 flex flex-col p-4">
      <div className="flex items-center space-x-3 mb-8 px-2">
        {/* <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold">O</div> */}
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary text-white to-accent">
          Org Memory
        </h1>
      </div>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors duration-200 ${
              location.pathname === item.path
                ? 'bg-primary/20 text-primary'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto px-2 py-4">
        <div className="text-xs text-slate-500 text-center">v1.0 (AI Agents Active)</div>
      </div>
    </div>
  );
};

export default function Layout() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-background text-slate-100 overflow-hidden">
        <Sidebar />
        <main className="flex-1 h-full overflow-y-auto w-full">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/action-center" element={<ActionCenter />} />
            <Route path="/explorer" element={<DecisionExplorer />} />
            <Route path="/audit" element={<AuditExplorer />} />
            <Route path="/sources" element={<DocumentUploadPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/data-viewer" element={<DataViewerPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
