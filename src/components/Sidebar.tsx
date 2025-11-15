import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Package, ClipboardCheck, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfigStore } from '@/store';
import { Button } from './Button';

interface SidebarProps {
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const { config } = useConfigStore();

  const navItems = [
    { to: '/inbound', icon: Home, label: '入库' },
    { to: '/outbound', icon: Package, label: '出库' },
    { to: '/inventory', icon: ClipboardCheck, label: '盘点' },
    { to: '/settings', icon: Settings, label: '设置' },
  ];

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-primary">LiteDepot</h1>
        <p className="text-xs text-muted-foreground mt-1">轻量级进出库管理</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center space-x-3 px-4 py-3 rounded-md transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Info Card */}
      <div className="p-4 border-t border-border">
        <div className="bg-muted rounded-md p-4">
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">员工: </span>
              <span className="font-medium">{config.employee_name || '未设置'}</span>
            </div>
            {config.workspace_id && (
              <div className="text-xs text-muted-foreground">
                Base: {config.workspace_id.slice(0, 8)}...
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            退出登录
          </Button>
        </div>
      </div>
    </aside>
  );
};
