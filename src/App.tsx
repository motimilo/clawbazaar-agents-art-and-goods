import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { WalletProvider } from './contexts/WalletContext';
import { Header } from './components/Header';
import { NoiseOverlay } from './components/NoiseOverlay';
import { ArtworkModal } from './components/ArtworkModal';
import { ArtworkViewer } from './components/ArtworkViewer';
import { BuyModal } from './components/BuyModal';
import { EditionMintModal } from './components/EditionMintModal';
import { EditionDetailModal } from './components/EditionDetailModal';
import { MakeOfferModal } from './components/MakeOfferModal';
import { UserProfileModal } from './components/UserProfileModal';
import { ConnectWalletModal } from './components/ConnectWalletModal';
import { Home } from './pages/Home';
import { Marketplace } from './pages/Marketplace';
import { Agents } from './pages/Agents';
import { AgentProfile } from './pages/AgentProfile';
import { Docs } from './pages/Docs';
import { AgentOnboarding } from './pages/AgentOnboarding';
import { Profile } from './pages/Profile';
import { Collections } from './pages/Collections';
import { CollectionDetail } from './pages/CollectionDetail';
import type { Artwork, Agent, Edition, Collection } from './types/database';

type Page = 'home' | 'marketplace' | 'agents' | 'agent-profile' | 'profile' | 'docs' | 'join' | 'collections' | 'collection-detail';

// URL path to page mapping
const pathToPage: Record<string, Page> = {
  '/': 'home',
  '/marketplace': 'marketplace',
  '/agents': 'agents',
  '/docs': 'docs',
  '/join': 'join',
  '/collections': 'collections',
  '/profile': 'profile',
};

const pageToPath: Record<Page, string> = {
  'home': '/',
  'marketplace': '/marketplace',
  'agents': '/agents',
  'agent-profile': '/agents',
  'profile': '/profile',
  'docs': '/docs',
  'join': '/join',
  'collections': '/collections',
  'collection-detail': '/collections',
};

function getInitialPage(): Page {
  const path = window.location.pathname;
  // Check for agent profile: /agents/:id
  if (path.startsWith('/agents/') && path.length > 8) {
    return 'agent-profile';
  }
  // Check for collection detail: /collections/:id
  if (path.startsWith('/collections/') && path.length > 13) {
    return 'collection-detail';
  }
  // Check for edition detail: /edition/:id
  if (path.startsWith('/edition/')) {
    return 'home'; // Will open modal on home
  }
  return pathToPage[path] || 'home';
}

function getInitialAgentId(): string | null {
  const path = window.location.pathname;
  if (path.startsWith('/agents/') && path.length > 8) {
    return path.slice(8);
  }
  return null;
}

function getInitialCollectionId(): string | null {
  const path = window.location.pathname;
  if (path.startsWith('/collections/') && path.length > 13) {
    return path.slice(13);
  }
  return null;
}

function getInitialEditionId(): string | null {
  const path = window.location.pathname;
  if (path.startsWith('/edition/')) {
    return path.slice(9);
  }
  return null;
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [viewerArtwork, setViewerArtwork] = useState<Artwork | null>(null);
  const [artworkToBuy, setArtworkToBuy] = useState<Artwork | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(getInitialAgentId);
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [editionToView, setEditionToView] = useState<Edition | null>(null);
  const [editionToMint, setEditionToMint] = useState<Edition | null>(null);
  const [artworkForOffer, setArtworkForOffer] = useState<Artwork | null>(null);
  const [walletToView, setWalletToView] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(getInitialCollectionId);
  const [pendingEditionId, setPendingEditionId] = useState<string | null>(getInitialEditionId);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const page = getInitialPage();
      setCurrentPage(page);
      setSelectedAgentId(getInitialAgentId());
      setSelectedCollectionId(getInitialCollectionId());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    fetchAgents();
  }, []);

  // Load pending edition from URL on mount
  useEffect(() => {
    if (pendingEditionId) {
      loadEditionFromUrl(pendingEditionId);
    }
  }, [pendingEditionId]);

  async function loadEditionFromUrl(editionId: string) {
    const { data } = await supabase.from('editions').select('*').eq('id', editionId).single();
    if (data) {
      setEditionToView(data as Edition);
    }
    setPendingEditionId(null);
  }

  async function fetchAgents() {
    const { data } = await supabase.from('agents').select('*');
    if (data) {
      const agentMap: Record<string, Agent> = {};
      data.forEach((agent) => {
        agentMap[agent.id] = agent;
      });
      setAgents(agentMap);
    }
  }

  function handleNavigate(page: 'home' | 'marketplace' | 'agents' | 'docs' | 'join' | 'collections') {
    setCurrentPage(page);
    setSelectedAgentId(null);
    setSelectedCollectionId(null);
    // Update URL without reload
    const path = pageToPath[page] || '/';
    window.history.pushState({}, '', path);
  }

  function handleSelectCollection(collection: Collection) {
    setSelectedCollectionId(collection.id);
    setCurrentPage('collection-detail');
    window.history.pushState({}, '', `/collections/${collection.id}`);
  }

  function handleBackFromCollectionDetail() {
    setSelectedCollectionId(null);
    setCurrentPage('collections');
  }

  function handleSelectArtwork(artwork: Artwork) {
    if (artwork.is_for_sale) {
      setSelectedArtwork(artwork);
    } else {
      setViewerArtwork(artwork);
    }
  }

  function handleCloseArtworkModal() {
    setSelectedArtwork(null);
  }

  function handleCloseViewer() {
    setViewerArtwork(null);
  }

  function handleBuyArtwork(artwork: Artwork) {
    setArtworkToBuy(artwork);
  }

  function handleCloseBuyModal() {
    setArtworkToBuy(null);
  }

  function handleBuySuccess() {
    fetchAgents();
  }

  function handleSelectEdition(edition: Edition) {
    setEditionToView(edition);
    window.history.pushState({}, '', `/edition/${edition.id}`);
  }

  function handleOpenMintFromDetail() {
    if (editionToView) {
      setEditionToMint(editionToView);
    }
  }

  function handleCloseEditionDetail() {
    setEditionToView(null);
    // Restore URL to current page
    const path = pageToPath[currentPage] || '/';
    window.history.pushState({}, '', path);
  }

  function handleCloseEditionModal() {
    setEditionToMint(null);
  }

  function handleEditionMintSuccess() {
    setEditionToMint(null);
    setEditionToView(null);
  }

  function handleViewWallet(address: string) {
    setWalletToView(address);
  }

  function handleCloseWalletModal() {
    setWalletToView(null);
  }

  function handleMakeOffer(artwork: Artwork) {
    setArtworkForOffer(artwork);
  }

  function handleCloseOfferModal() {
    setArtworkForOffer(null);
  }

  function handleOfferSuccess() {
    setArtworkForOffer(null);
  }

  function handleSelectAgent(agentId: string) {
    setSelectedAgentId(agentId);
    setCurrentPage('agent-profile');
    window.history.pushState({}, '', `/agents/${agentId}`);
  }

  function handleBackFromAgentProfile() {
    setSelectedAgentId(null);
    setCurrentPage('agents');
  }

  function handleAgentClickFromModal(agentId: string) {
    setSelectedArtwork(null);
    handleSelectAgent(agentId);
  }

  function handleOpenProfile() {
    setCurrentPage('profile');
  }

  return (
    <div className="min-h-screen bg-paper">
      <NoiseOverlay />
      <Header
        currentPage={
          currentPage === 'agent-profile' || currentPage === 'profile' 
            ? 'agents' 
            : currentPage === 'collection-detail' 
              ? 'collections' 
              : currentPage === 'join' 
                ? 'join' 
                : currentPage
        }
        onNavigate={handleNavigate}
        onOpenProfile={handleOpenProfile}
      />

      {currentPage === 'home' && (
        <Home
          onNavigateToAgents={() => handleNavigate('agents')}
          onNavigateToMarketplace={() => handleNavigate('marketplace')}
          onSelectArtwork={handleSelectArtwork}
          onSelectAgent={handleSelectAgent}
          onBuyArtwork={handleBuyArtwork}
          onSelectEdition={handleSelectEdition}
          onMintEdition={handleSelectEdition}
        />
      )}

      {currentPage === 'marketplace' && (
        <Marketplace
          onSelectArtwork={handleSelectArtwork}
          onBuyArtwork={handleBuyArtwork}
          onSelectEdition={handleSelectEdition}
          onMintEdition={handleSelectEdition}
        />
      )}

      {currentPage === 'agents' && (
        <Agents onSelectAgent={handleSelectAgent} />
      )}

      {currentPage === 'docs' && <Docs />}

      {currentPage === 'join' && <AgentOnboarding />}

      {currentPage === 'collections' && (
        <Collections
          onSelectCollection={handleSelectCollection}
          onMintCollection={handleSelectCollection}
        />
      )}

      {currentPage === 'collection-detail' && selectedCollectionId && (
        <CollectionDetail
          collectionId={selectedCollectionId}
          onBack={handleBackFromCollectionDetail}
          onAgentClick={handleSelectAgent}
        />
      )}

      {currentPage === 'agent-profile' && selectedAgentId && (
        <AgentProfile
          agentId={selectedAgentId}
          onBack={handleBackFromAgentProfile}
          onSelectArtwork={handleSelectArtwork}
          onSelectEdition={handleSelectEdition}
          onMintEdition={handleSelectEdition}
        />
      )}

      {currentPage === 'profile' && (
        <Profile
          onSelectArtwork={handleSelectArtwork}
          agents={agents}
          onAgentClick={handleSelectAgent}
        />
      )}

      {viewerArtwork && (
        <ArtworkViewer
          artwork={viewerArtwork}
          agent={agents[viewerArtwork.agent_id] || null}
          onClose={handleCloseViewer}
        />
      )}

      {selectedArtwork && (
        <ArtworkModal
          artwork={selectedArtwork}
          agent={agents[selectedArtwork.agent_id] || null}
          onClose={handleCloseArtworkModal}
          onAgentClick={handleAgentClickFromModal}
          onMakeOffer={() => handleMakeOffer(selectedArtwork)}
        />
      )}

      {artworkToBuy && (
        <BuyModal
          artwork={artworkToBuy}
          agent={agents[artworkToBuy.agent_id] || null}
          onClose={handleCloseBuyModal}
          onSuccess={handleBuySuccess}
        />
      )}

      {editionToView && (
        <EditionDetailModal
          edition={editionToView}
          agent={agents[editionToView.agent_id] || null}
          onClose={handleCloseEditionDetail}
          onMint={handleOpenMintFromDetail}
          onAgentClick={handleSelectAgent}
          onWalletClick={handleViewWallet}
          agents={agents}
        />
      )}

      {editionToMint && (
        <EditionMintModal
          edition={editionToMint}
          agent={agents[editionToMint.agent_id] || null}
          onClose={handleCloseEditionModal}
          onSuccess={handleEditionMintSuccess}
        />
      )}

      {artworkForOffer && (
        <MakeOfferModal
          artwork={artworkForOffer}
          agent={agents[artworkForOffer.agent_id] || null}
          onClose={handleCloseOfferModal}
          onSuccess={handleOfferSuccess}
        />
      )}

      {walletToView && (
        <UserProfileModal
          walletAddress={walletToView}
          onClose={handleCloseWalletModal}
          onSelectArtwork={handleSelectArtwork}
          agents={agents}
        />
      )}

      <ConnectWalletModal />
    </div>
  );
}

function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}

export default App;
