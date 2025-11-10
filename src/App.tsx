import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SetupPage } from './pages/SetupPage';
import { InboundPage } from './pages/InboundPage';
import { OutboundPage } from './pages/OutboundPage';
import { InventoryPage } from './pages/InventoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { useConfigStore, useDeviceStore } from './store';
import { aiTableService } from './api';

function App() {
  const { config, isConfigured, loadConfig } = useConfigStore();
  const { loadDevicesFromDB } = useDeviceStore();

  useEffect(() => {
    // Load configuration on app start
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    // Initialize AITable service when config is loaded
    if (isConfigured && config.api_key && config.base_id && config.table_id) {
      aiTableService.initialize(config.api_key, config.base_id, config.table_id);
      loadDevicesFromDB();
    }
  }, [isConfigured, config, loadDevicesFromDB]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        
        {isConfigured ? (
          <Route element={<Layout><div /></Layout>}>
            <Route path="/inbound" element={<Layout><InboundPage /></Layout>} />
            <Route path="/outbound" element={<Layout><OutboundPage /></Layout>} />
            <Route path="/inventory" element={<Layout><InventoryPage /></Layout>} />
            <Route path="/settings" element={<Layout><SettingsPage /></Layout>} />
            <Route path="/" element={<Navigate to="/inbound" replace />} />
            <Route path="*" element={<Navigate to="/inbound" replace />} />
          </Route>
        ) : (
          <>
            <Route path="/" element={<Navigate to="/setup" replace />} />
            <Route path="*" element={<Navigate to="/setup" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;

