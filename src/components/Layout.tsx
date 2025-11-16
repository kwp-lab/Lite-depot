import React from 'react';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { useNavigate, Outlet } from 'react-router-dom';
import { useConfigStore } from '@/store';
import { Toaster } from "@/components/ui/sonner"
import { useTheme } from '@/components/theme-provider';

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { clearConfig } = useConfigStore();
  const { theme } = useTheme();

  const handleLogout = async () => {
    await clearConfig();
    navigate('/setup');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onLogout={handleLogout} />
      <MainContent>{children || <Outlet />}</MainContent>
      <Toaster richColors theme={theme} />
    </div>
  );
};
