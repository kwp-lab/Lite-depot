import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { Layout } from './components/Layout';
import { SetupPage } from './pages/SetupPage';
import { InboundPage } from './pages/InboundPage';
import { OutboundPage } from './pages/OutboundPage';
import { InventoryPage } from './pages/InventoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { useConfigStore, useProductStore, useLanguageStore } from './store';
import { useOutboundStore } from './store/outboundStore';
import { CloudProviderType } from './api';

function App() {
  const { config, isConfigured, loadConfig } = useConfigStore();
  const { loadProductsFromDB, setCloudProvider } = useProductStore();
  const { setCloudProvider: setOutboundCloudProvider } = useOutboundStore();
  const { language, setLanguage } = useLanguageStore();

  useEffect(() => {
    // Load configuration on app start
    loadConfig();
    // Initialize language
    setLanguage(language);
  }, [loadConfig, language, setLanguage]);

  useEffect(() => {
    // Initialize Provider when config is loaded
    if (isConfigured) {
      const providerType = (config.cloud_provider || 'aitable') as CloudProviderType;
      setCloudProvider(providerType);
      setOutboundCloudProvider(providerType);
      loadProductsFromDB();
    }
  }, [isConfigured, config, loadProductsFromDB, setCloudProvider, setOutboundCloudProvider]);

  return (
    <ThemeProvider defaultTheme="system" storageKey="lite-depot-theme">
      <HashRouter>
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
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;

