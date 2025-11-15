import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { Layout } from './components/Layout';
import { SetupPage } from './pages/SetupPage';
import { InboundPage } from './pages/InboundPage';
import { OutboundPage } from './pages/OutboundPage';
import { InventoryPage } from './pages/InventoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { useConfigStore, useDeviceStore } from './store';
import { useOutboundStore } from './store/outboundStore';
import { ProviderFactory, CloudProviderType } from './api';

function App() {
  const { config, isConfigured, loadConfig } = useConfigStore();
  const { loadDevicesFromDB, setCloudProvider } = useDeviceStore();
  const { setCloudProvider: setOutboundCloudProvider } = useOutboundStore();

  useEffect(() => {
    // Load configuration on app start
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    // Initialize Provider when config is loaded
    if (isConfigured && config.api_key && config.base_id && config.table_id) {
      const providerType = (config.cloud_provider || 'aitable') as CloudProviderType;
      const provider = ProviderFactory.getProvider(providerType);
      provider.initialize({
        apiKey: config.api_key,
        baseId: config.base_id,
        tableId: config.table_id,
      });
      setCloudProvider(providerType);
      setOutboundCloudProvider(providerType);
      loadDevicesFromDB();
    }
  }, [isConfigured, config, loadDevicesFromDB, setCloudProvider, setOutboundCloudProvider]);

  return (
    <ThemeProvider defaultTheme="system" storageKey="lite-depot-theme">
      <BrowserRouter>
        <Routes>
          {isConfigured ? (
            <Route element={<Layout />}>
              <Route path="/inbound" element={<InboundPage />} />
              <Route path="/outbound" element={<OutboundPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/" element={<Navigate to="/inbound" replace />} />
              <Route path="/setup" element={<Navigate to="/inbound" replace />} />
              <Route path="*" element={<Navigate to="/inbound" replace />} />
            </Route>
          ) : (
            <>
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/" element={<Navigate to="/setup" replace />} />
              <Route path="*" element={<Navigate to="/setup" replace />} />
            </>
          )}
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

