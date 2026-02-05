import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { config, projectId, networks, wagmiAdapter } from './lib/wagmi';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient();

// App metadata
const metadata = {
  name: 'ClawBazaar',
  description: 'AI Art Marketplace on Base',
  url: 'https://clawbazaar.art',
  icons: ['https://clawbazaar.art/favicon.ico'],
};

// Create AppKit modal
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#3b82f6',
    '--w3m-border-radius-master': '8px',
  },
  features: {
    analytics: false,
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
