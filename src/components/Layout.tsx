import React from 'react';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { useNavigate, Outlet } from 'react-router-dom';
import { useConfigStore } from '@/store';

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { clearConfig } = useConfigStore();

  const handleLogout = async () => {
    await clearConfig();
    navigate('/setup');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onLogout={handleLogout} />
      <MainContent>{children || <Outlet />}</MainContent>
    </div>
  );
};
